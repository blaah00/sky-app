// Check: satellites. Orbit data from CelesTrak, positions and passes calculated on the phone
// with satellite.js. Sun position for "is it dark / is the satellite lit" from astronomy-engine.

import * as sat from '../../lib/satellite.js-7.1.0/index.js';
import * as A from '../../lib/astronomy-engine-2.1.19/astronomy.js';
import { fetchJSON, fmtWhen, fmtTime, fmtAgo, compassWord, breathe } from '../util.js';

export const title = 'Satellites and visible passes';
export const source = 'Orbits: CelesTrak (celestrak.org). Pass maths: satellite.js 7.1.0 on this phone';

const GP = g => `https://celestrak.org/NORAD/elements/gp.php?GROUP=${g}&FORMAT=json`;
// CelesTrak asks users not to re-download the same data more often than every 2 hours.
const CACHE_MIN = 120;

const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const HOURS = 48;          // how far ahead to look for passes
const MIN_ALT = 10;        // a pass counts from 10° above the horizon (Heavens-Above uses the same)
const DARK_SUN_ALT = -6;   // sky must be at least this dark (Sun 6° below horizon)

// Where a satellite is, seen from the observer. Returns null if the orbit data is bad or decayed.
function lookAt(satrec, observerGd, date) {
  const pv = sat.propagate(satrec, date);
  if (!pv || !pv.position) return null;
  const gmst = sat.gstime(date);
  const la = sat.ecfToLookAngles(observerGd, sat.eciToEcf(pv.position, gmst));
  return { az: la.azimuth * R2D, alt: la.elevation * R2D, range: la.rangeSat, eci: pv.position, gmst };
}

// Rough brightness (magnitude; smaller = brighter). CelesTrak doesn't publish satellite brightness,
// so this estimates a "standard magnitude" from radar size (RCS, from CelesTrak's catalogue),
// then adjusts for distance and how much of the satellite's lit side faces us.
// It's an estimate to be checked against Heavens-Above, not a measured value.
function estimateMag(rcs, look, observerGd, date) {
  if (!(rcs > 0)) return null;
  const std = -1.3 - 2.5 * Math.log10(rcs / 399);   // scaled so the ISS (RCS ~399 m²) is -1.3
  const sunAU = sat.sunPos(sat.jday(date)).rsun;
  const sun = [sunAU.x * 149597870.7, sunAU.y * 149597870.7, sunAU.z * 149597870.7];
  const obs = sat.ecfToEci(sat.geodeticToEcf(observerGd), look.gmst);
  const s = look.eci;
  const toSun = [sun[0] - s.x, sun[1] - s.y, sun[2] - s.z];
  const toObs = [obs.x - s.x, obs.y - s.y, obs.z - s.z];
  const dot = toSun[0] * toObs[0] + toSun[1] * toObs[1] + toSun[2] * toObs[2];
  const phase = Math.acos(dot / (Math.hypot(...toSun) * Math.hypot(...toObs)));  // 0 = fully lit face
  const lit = Math.sin(phase) + (Math.PI - phase) * Math.cos(phase);
  if (lit <= 0.001) return null;
  return std + 5 * Math.log10(look.range / 1000) - 2.5 * Math.log10(lit);
}

function isSunlit(look, date) {
  return sat.shadowFraction(sat.sunPos(sat.jday(date)).rsun, look.eci) < 0.5;
}

export async function run(ctx, report) {
  const rows = [];
  const observerGd = { latitude: ctx.lat * D2R, longitude: ctx.lon * D2R, height: (ctx.altitude ?? 0) / 1000 };
  const obsA = new A.Observer(ctx.lat, ctx.lon, ctx.altitude ?? 0);
  const now = new Date();

  // 1. Download the bright-satellite list and its catalogue details (owner, launch date, size).
  const vis = await fetchJSON(GP('visual'), { cacheKey: 'gp-visual', maxAgeMin: CACHE_MIN });
  const newestEpoch = new Date(Math.max(...vis.data.map(o => Date.parse(o.EPOCH + 'Z'))));
  rows.push(['Bright satellites downloaded', `${vis.data.length} (CelesTrak "visual" group), ` +
    `fetched ${fmtAgo(vis.fetchedAt)}${vis.fromCache ? ' (stored copy)' : ''}; newest orbit data ${fmtAgo(newestEpoch)}`]);

  let catalog = {};
  try {
    const cat = await fetchJSON('https://celestrak.org/satcat/records.php?GROUP=visual&FORMAT=json',
      { cacheKey: 'satcat-visual', maxAgeMin: 24 * 60 });
    for (const c of cat.data) catalog[c.NORAD_CAT_ID] = c;
    rows.push(['Catalogue details (owner, launch date, size)', `${cat.data.length} records`]);
  } catch (e) {
    rows.push(['Catalogue details', `FAILED: ${e.message} Brightness estimates need this, so they will be missing.`]);
  }

  // 2. Work out passes for the next 48 hours.
  report('Calculating passes for the next 48 hours…');
  const t0 = performance.now();
  const start = now.getTime();

  // Sun altitude every minute (for "is it dark enough").
  const sunAlt = [];
  for (let m = 0; m <= HOURS * 60 + 2; m++) {
    const d = new Date(start + m * 60000);
    const eq = A.Equator(A.Body.Sun, d, obsA, true, true);
    sunAlt.push(A.Horizon(d, obsA, eq.ra, eq.dec).altitude);
  }
  const sunAltAt = d => sunAlt[Math.min(sunAlt.length - 1, Math.max(0, Math.round((d - start) / 60000)))];

  const passes = [];
  let bad = 0;
  for (let i = 0; i < vis.data.length; i++) {
    const omm = vis.data[i];
    let satrec;
    try { satrec = sat.json2satrec(omm); } catch { bad++; continue; }
    // Coarse scan: once a minute, find stretches when it's above the horizon.
    let upFrom = null;
    for (let m = 0; m <= HOURS * 60; m++) {
      const d = new Date(start + m * 60000);
      const l = lookAt(satrec, observerGd, d);
      if (!l) { if (m === 0) bad++; break; }
      if (l.alt > 0 && upFrom === null) upFrom = m;
      if ((l.alt <= 0 || m === HOURS * 60) && upFrom !== null) {
        findVisible(satrec, omm, upFrom - 1, m, start, observerGd, sunAltAt, passes, catalog);
        upFrom = null;
      }
    }
    if (i % 10 === 9) { report(`Calculating passes… ${i + 1}/${vis.data.length} satellites`); await breathe(); }
  }
  const ms = Math.round(performance.now() - t0);
  passes.sort((a, b) => a.start.t - b.start.t);

  const bright = passes.filter(p => p.mag !== null && p.mag <= 4);
  rows.push(['Calculation time on this phone', `${(ms / 1000).toFixed(1)} s for ${vis.data.length} satellites × ${HOURS} h` +
    (bad ? `; ${bad} satellites skipped (bad or decayed orbit data)` : '')]);
  rows.push(['Visible passes found (next 48 h)', `${passes.length} in total; ${bright.length} estimated brighter than magnitude 4`]);

  for (const p of bright.slice(0, 12)) {
    const c = catalog[p.norad] || {};
    rows.push([`${p.name}`,
      `${fmtWhen(p.start.t)}: appears ${compassWord(p.start.az)} (${p.start.alt.toFixed(0)}°), ` +
      `highest ${p.max.alt.toFixed(0)}° ${compassWord(p.max.az)} at ${fmtTime(p.max.t)}, ` +
      `disappears ${compassWord(p.end.az)} (${p.end.alt.toFixed(0)}°) at ${fmtTime(p.end.t)}. ` +
      `Brightness ≈ mag ${p.mag.toFixed(1)} (estimate). Owner ${c.OWNER || '?'}, launched ${c.LAUNCH_DATE || '?'}`]);
  }
  const iss = passes.filter(p => p.norad === 25544);
  rows.push(['ISS passes in next 48 h', iss.length
    ? iss.map(p => `${fmtWhen(p.start.t)} (max ${p.max.alt.toFixed(0)}°)`).join('; ')
    : 'none visible in the next 48 hours from here (this is normal for some weeks)']);

  // 3. The other groups Satellites mode will need: check they download, and count what's overhead now.
  for (const [g, label] of [['stations', 'Space stations'], ['science', 'Science'], ['weather', 'Weather'], ['gnss', 'Navigation (GPS etc.)']]) {
    try {
      const r = await fetchJSON(GP(g), { cacheKey: 'gp-' + g, maxAgeMin: CACHE_MIN });
      const up = r.data.filter(o => {
        try { const l = lookAt(sat.json2satrec(o), observerGd, now); return l && l.alt > 0; } catch { return false; }
      });
      rows.push([`${label} group`, `${r.data.length} satellites, ${up.length} above the horizon right now` +
        (up.length ? ` (e.g. ${up.slice(0, 3).map(o => o.OBJECT_NAME).join(', ')})` : '')]);
    } catch (e) {
      rows.push([`${label} group`, `FAILED: ${e.message}`]);
    }
  }

  return {
    status: passes.length || iss.length ? 'green' : 'amber',
    summary: `${vis.data.length} bright satellites; ${bright.length} bright passes in the next 48 h; calculated in ${(ms / 1000).toFixed(1)} s.`,
    rows,
    fetchedAt: vis.fetchedAt,
    note: 'Brightness is a rough estimate from radar size. Accuracy check: compare ISS pass times, directions ' +
      'and brightness with Heavens-Above for the same place.',
    actions: [{ label: 'Also test Starlink (downloads about 5 MB)', run: () => testStarlink(observerGd) }],
  };
}

// Fine scan (every 5 s) of one above-horizon stretch; records the parts that are actually visible:
// satellite 10°+ up, sky dark enough, satellite in sunlight.
function findVisible(satrec, omm, fromMin, toMin, start, observerGd, sunAltAt, passes, catalog) {
  let cur = null;
  const close = () => { if (cur && cur.samples > 1) passes.push(cur); cur = null; };
  for (let s = Math.max(0, fromMin * 60); s <= toMin * 60 + 60; s += 5) {
    const d = new Date(start + s * 1000);
    const l = lookAt(satrec, observerGd, d);
    const visible = l && l.alt >= MIN_ALT && sunAltAt(d) <= DARK_SUN_ALT && isSunlit(l, d);
    if (!visible) { close(); continue; }
    const pt = { t: d, az: l.az, alt: l.alt };
    const mag = estimateMag(Number(catalog[omm.NORAD_CAT_ID]?.RCS), l, observerGd, d);
    if (!cur) cur = { name: omm.OBJECT_NAME, norad: omm.NORAD_CAT_ID, start: pt, max: pt, end: pt, mag, samples: 0 };
    cur.end = pt;
    cur.samples++;
    if (l.alt > cur.max.alt) cur.max = pt;
    if (mag !== null && (cur.mag === null || mag < cur.mag)) cur.mag = mag;
  }
  close();
}

async function testStarlink(observerGd) {
  const t0 = performance.now();
  // Not cached: ~5 MB is too big for the browser's small storage. The real app will store it properly.
  const r = await fetchJSON(GP('starlink'), { timeoutMs: 90000 });
  const t1 = performance.now();
  const now = new Date();
  let up = 0, ok = 0;
  for (const o of r.data) {
    try {
      const l = lookAt(sat.json2satrec(o), observerGd, now);
      if (l) { ok++; if (l.alt > 0) up++; }
    } catch { /* skip bad record */ }
  }
  const t2 = performance.now();
  return [
    ['Starlink satellites downloaded', `${r.data.length} in ${((t1 - t0) / 1000).toFixed(1)} s`],
    ['Positions of all of them, calculated once', `${((t2 - t1) / 1000).toFixed(2)} s on this phone (${ok} valid)`],
    ['Starlink above the horizon right now', `${up}`],
  ];
}
