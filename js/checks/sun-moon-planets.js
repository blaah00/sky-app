// Check: Sun, Moon and planets, calculated on the phone with astronomy-engine. Works offline.

import * as A from '../../lib/astronomy-engine-2.1.19/astronomy.js';
import { fmtWhen, fmtTime, whereWords, localMidnight } from '../util.js';

const rise = (body, obs, from, dir) => A.SearchRiseSet(body, obs, dir, from, 2)?.date ?? null;
const altCross = (obs, from, dir, alt) => A.SearchAltitude(A.Body.Sun, obs, dir, from, 2, alt)?.date ?? null;

function whereNow(body, obs, now) {
  const eq = A.Equator(body, now, obs, true, true);
  const hor = A.Horizon(now, obs, eq.ra, eq.dec, 'normal');
  return { az: hor.azimuth, alt: hor.altitude };
}

function phaseName(angle) {
  // angle: 0 new, 90 first quarter, 180 full, 270 last quarter
  const names = ['New moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous',
    'Full moon', 'Waning gibbous', 'Last quarter', 'Waning crescent'];
  return names[Math.round(angle / 45) % 8];
}

export const title = 'Sun, Moon, planets';
export const source = 'astronomy-engine 2.1.19, calculated on this phone (no internet)';

export async function run(ctx) {
  const obs = new A.Observer(ctx.lat, ctx.lon, ctx.altitude ?? 0);
  const now = new Date();
  const today = localMidnight(now);
  const rows = [];

  // --- Sun: today's sequence, from the start of today ---
  const sunrise = rise(A.Body.Sun, obs, today, +1);
  const sunset = rise(A.Body.Sun, obs, today, -1);
  const golden = altCross(obs, today, -1, 6);        // golden hour begins: Sun 6° up, going down
  const blueStart = altCross(obs, today, -1, -4);    // blue hour: Sun between -4° and -6°
  const civil = altCross(obs, today, -1, -6);
  const nautical = altCross(obs, today, -1, -12);
  const astro = altCross(obs, today, -1, -18);        // after this: full dark
  const tomorrowSunrise = sunset ? rise(A.Body.Sun, obs, sunset, +1) : null;
  const sunNow = whereNow(A.Body.Sun, obs, now);

  rows.push(['Sun now', `${whereWords(sunNow.az, sunNow.alt)} (az ${sunNow.az.toFixed(1)}°, alt ${sunNow.alt.toFixed(1)}°)`]);
  rows.push(['Sunrise today', fmtTime(sunrise)]);
  rows.push(['Golden hour starts', fmtTime(golden)]);
  rows.push(['Sunset', fmtTime(sunset)]);
  rows.push(['Blue hour', `${fmtTime(blueStart)} – ${fmtTime(civil)}`]);
  rows.push(['Civil twilight ends', fmtTime(civil)]);
  rows.push(['Nautical twilight ends', fmtTime(nautical)]);
  rows.push(['Astronomical twilight ends (full dark)', fmtTime(astro)]);
  rows.push(["Tomorrow's sunrise", fmtWhen(tomorrowSunrise)]);

  // --- Moon ---
  const illum = A.Illumination(A.Body.Moon, now);
  const phaseAngle = A.MoonPhase(now);
  const moonNow = whereNow(A.Body.Moon, obs, now);
  const distKm = A.EclipticGeoMoon(now).dist * A.KM_PER_AU;
  rows.push(['Moon phase', `${phaseName(phaseAngle)}, ${(illum.phase_fraction * 100).toFixed(0)}% lit`]);
  rows.push(['Moon now', `${whereWords(moonNow.az, moonNow.alt)} (az ${moonNow.az.toFixed(1)}°, alt ${moonNow.alt.toFixed(1)}°)`]);
  rows.push(['Next moonrise', fmtWhen(rise(A.Body.Moon, obs, now, +1))]);
  rows.push(['Next moonset', fmtWhen(rise(A.Body.Moon, obs, now, -1))]);
  rows.push(['Moon distance', `${Math.round(distKm).toLocaleString()} km (centre to centre)`]);
  rows.push(['Next full moon', fmtWhen(A.SearchMoonPhase(180, now, 40)?.date)]);
  rows.push(['Next new moon', fmtWhen(A.SearchMoonPhase(0, now, 40)?.date)]);

  // --- The five naked-eye planets ---
  for (const p of ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']) {
    const body = A.Body[p];
    const w = whereNow(body, obs, now);
    const mag = A.Illumination(body, now).mag;
    rows.push([p, `now ${whereWords(w.az, w.alt)}; rises ${fmtWhen(rise(body, obs, now, +1))}, ` +
      `sets ${fmtWhen(rise(body, obs, now, -1))}; brightness mag ${mag.toFixed(1)}`]);
  }

  const missing = [sunrise, sunset, civil, astro, tomorrowSunrise].some(x => !x);
  return {
    status: missing ? 'amber' : 'green',
    summary: missing
      ? 'Calculated, but some Sun times were not found for today (check the rows).'
      : `Sunset ${fmtTime(sunset)}, full dark ${fmtTime(astro)}. Moon ${(illum.phase_fraction * 100).toFixed(0)}% lit.`,
    rows,
    fetchedAt: now,
    note: 'Accuracy check: compare sunrise, sunset, twilight, moonrise and moonset with timeanddate.com for the same town and date.',
  };
}
