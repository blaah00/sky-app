// Step 1 data test page: runs one independent check per data source and shows green / amber / red.
// Each check lives in js/checks/. A failure in one check never stops the others.

import { phoneTimeZone, roundForSharing, fmtWhen, fmtAgo, escapeHtml } from './util.js';
import * as sunMoon from './checks/sun-moon-planets.js';
import * as panchang from './checks/panchang.js';
import * as satellites from './checks/satellites.js';
import * as flights from './checks/flights.js';
import * as crew from './checks/crew.js';
import * as launches from './checks/launches.js';
import * as sunImage from './checks/sun-image.js';
import * as clouds from './checks/clouds.js';
import * as stars from './checks/stars.js';
import * as sensors from './checks/sensors.js';

const VERSION = 'Step 1 data test, v2 (29 Sep 2026)';

// Order on screen. Quick internet checks start together; heavy calculations run after, one at a time.
const NETWORK = [clouds, crew, launches, flights, sunImage];
const ON_PHONE = [sunMoon, panchang, stars, sensors, satellites];
const ALL = [sunMoon, panchang, satellites, flights, crew, launches, sunImage, clouds, stars, sensors];

const results = new Map();   // check module → latest result
const $ = sel => document.querySelector(sel);

document.addEventListener('DOMContentLoaded', () => {
  $('#version').textContent = VERSION;
  $('#tz').textContent = phoneTimeZone();
  $('#start').onclick = start;
  $('#copy').onclick = copyReport;
});

function start() {
  $('#start').hidden = true;
  $('#loc').textContent = 'Asking the phone for its location…';
  if (!('geolocation' in navigator)) return locationFailed('This browser has no location support.');
  navigator.geolocation.getCurrentPosition(pos => {
    const c = pos.coords;
    const ctx = {
      lat: c.latitude, lon: c.longitude, altitude: c.altitude ?? 0,
      latShared: roundForSharing(c.latitude), lonShared: roundForSharing(c.longitude),
    };
    $('#loc').textContent = `Location from GPS: ${ctx.latShared}, ${ctx.lonShared} (±${Math.round(c.accuracy)} m). ` +
      'Only this rounded (~1 km) position is sent to outside services.';
    results.set('location', { ok: true, text: `${ctx.latShared}, ${ctx.lonShared} (±${Math.round(c.accuracy)} m)` });
    runAll(ctx);
  }, err => locationFailed(err.code === 1 ? 'Location permission was refused. Allow location for this page and reload.'
    : `The phone could not get a location (${err.message}).`),
  { enableHighAccuracy: true, timeout: 30000, maximumAge: 60000 });
}

function locationFailed(msg) {
  $('#loc').textContent = msg;
  $('#loc').className = 'bad';
  results.set('location', { ok: false, text: msg });
  $('#start').hidden = false;
}

async function runAll(ctx) {
  $('#checks').innerHTML = '';
  for (const m of ALL) $('#checks').append(makeRow(m));
  $('#copy').hidden = false;
  const runOne = async m => {
    const update = r => { results.set(m, { ...results.get(m), ...r }); render(m); };
    update({ status: 'running', summary: 'Working…', rows: [] });
    try {
      update(await m.run(ctx, msg => update({ summary: msg }), update));
    } catch (e) {
      update({ status: 'red', summary: `Failed: ${e.message}`, rows: [], fetchedAt: null });
      console.error(m.title, e);
    }
  };
  NETWORK.forEach(runOne);                 // all internet checks at once
  for (const m of ON_PHONE) await runOne(m);   // calculations one after another, so the screen stays responsive
}

function makeRow(m) {
  const el = document.createElement('section');
  el.className = 'check waiting';
  el.id = 'check-' + ALL.indexOf(m);
  el.innerHTML = `
    <h2><span class="dot"></span>${escapeHtml(m.title)}</h2>
    <p class="summary">Waiting…</p>
    <div class="extra"></div>
    <details><summary>Details</summary><table></table>
      <p class="small src"></p><p class="small note"></p></details>`;
  return el;
}

function render(m) {
  const r = results.get(m);
  const el = document.getElementById('check-' + ALL.indexOf(m));
  el.className = 'check ' + r.status;
  el.querySelector('.summary').textContent = r.summary || '';
  el.querySelector('table').innerHTML = (r.rows || [])
    .map(([k, v]) => `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`).join('');
  el.querySelector('.src').textContent = 'Source: ' + m.source +
    (r.fetchedAt ? ` — updated ${fmtWhen(r.fetchedAt)} (${fmtAgo(r.fetchedAt)})` : '');
  el.querySelector('.note').textContent = r.note || '';

  const extra = el.querySelector('.extra');
  if (r.panel && !extra.contains(r.panel)) extra.append(r.panel);
  if (r.images && !extra.querySelector('img')) {
    for (const im of r.images) {
      const fig = document.createElement('figure');
      fig.innerHTML = `<img alt="${escapeHtml(im.name)}"><figcaption>${escapeHtml(im.name)}</figcaption>`;
      fig.querySelector('img').src = im.src;
      extra.append(fig);
    }
  }
  if (r.actions && !extra.querySelector('button.action')) {
    for (const a of r.actions) {
      const b = document.createElement('button');
      b.className = 'action';
      b.textContent = a.label;
      b.onclick = async () => {
        b.disabled = true; b.textContent = 'Working…';
        try {
          const extraRows = await a.run();
          results.set(m, { ...results.get(m), rows: [...results.get(m).rows, ...extraRows] });
          b.textContent = 'Done — see Details';
        } catch (e) {
          results.set(m, { ...results.get(m), rows: [...results.get(m).rows, [a.label, `FAILED: ${e.message}`]] });
          b.textContent = 'Failed — see Details';
        }
        render(m);
        el.querySelector('details').open = true;
      };
      extra.append(b);
    }
  }
}

// Plain-text report to paste back into the chat. Uses only the rounded location.
async function copyReport() {
  const lines = [VERSION, `Time: ${new Date().toString()}`, `Time zone: ${phoneTimeZone()}`,
    `Location: ${results.get('location')?.text}`, `Browser: ${navigator.userAgent}`, ''];
  for (const m of ALL) {
    const r = results.get(m);
    if (!r) continue;
    lines.push(`== ${m.title}: ${r.status.toUpperCase()} — ${r.summary}`);
    for (const [k, v] of r.rows || []) lines.push(`   ${k}: ${v}`);
    if (r.fetchedAt) lines.push(`   (updated ${r.fetchedAt.toString()})`);
    lines.push('');
  }
  const text = lines.join('\n');
  try {
    await navigator.clipboard.writeText(text);
    $('#copy').textContent = 'Copied ✓ — paste it into the chat';
  } catch {
    // Fallback: show the text so it can be selected by hand.
    const ta = $('#report');
    ta.hidden = false; ta.value = text; ta.select();
    $('#copy').textContent = 'Select the text below and copy it';
  }
}
