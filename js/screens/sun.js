// Sun: the card on the Tonight screen (the sunset sequence, live) and the Sun screen (#sun: today's photo).
// The sequence is calculated on the phone for the phone's current location. The photo needs the internet.

import { observerFor, sunPosition, evening, nextSunrise, lastDark } from '../sky/sun.js';
import { fmtTime, compassWord, localDayNumber, localMidnight, escapeHtml } from '../util.js';
import { backLink, live, waiting } from './common.js';

// ---------- Plain words ----------

// "under a minute", "23 min", "2 h", "2 h 10 min". Rounded up, so it never says 0 while something is still to come.
function inTime(ms) {
  const min = Math.ceil(ms / 60000);
  if (min <= 1) return ms < 60000 ? 'under a minute' : '1 min';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

// "5:43 – 6:36 pm" when both are am or both pm; otherwise both times in full.
function span(a, b) {
  const ta = fmtTime(a), tb = fmtTime(b);
  const tail = s => s.match(/\s?[ap]\.?m\.?$/i)?.[0];
  const ea = tail(ta);
  return ea && ea === tail(tb) ? `${ta.slice(0, -ea.length)} – ${tb}` : `${ta} – ${tb}`;
}

// The stages of one evening, in order. A stage is either a moment (at) or a stretch of time (start–end).
function stages(e) {
  return [
    { name: 'Golden hour', start: e.golden, end: e.blue, line: 'Warm, low light and long shadows.' },
    { name: 'Sunset', at: e.sunset,
      line: e.sunsetAz == null ? 'The Sun goes down.' : `The Sun goes down in the ${compassWord(e.sunsetAz)}.` },
    { name: 'Blue hour', start: e.blue, end: e.civil,
      line: 'The sky turns deep blue. The brightest planets and stars start to show.' },
    { name: 'Civil twilight ends', at: e.civil, line: 'Too dark to read outside without a light. Bright stars are out.' },
    { name: 'Nautical twilight ends', at: e.nautical, line: 'The horizon fades into the sky. Most of the stars are out.' },
    { name: 'Full dark', at: e.dark, note: 'Astronomical twilight ends',
      line: 'The sky is as dark as it gets. The faintest stars appear.' },
  ].filter(s => s.at || (s.start && s.end));
}

// Only what hasn't finished yet: a moment drops off once it has passed, a stretch once it has ended.
const upcoming = (list, now) => list.filter(s => (s.at ? s.at : s.end) > now);

// The line at the top of the card: where we are in the day, and what comes next.
function status(obs, e, now) {
  const alt = sunPosition(obs, now).alt;
  const sunrise = nextSunrise(obs, now);
  const toSunrise = sunrise ? `Sunrise in ${inTime(sunrise - now)}` : '';
  if (alt < -18) {
    const since = lastDark(obs, now);
    return { head: 'Full dark', sub: [since && `Since ${fmtTime(since)}`, toSunrise].filter(Boolean).join(' · ') };
  }
  const t = x => x && now >= x;
  if (t(e.golden) && !t(e.dark)) {
    if (!t(e.sunset)) return { head: 'Golden hour', sub: e.sunset ? `Sunset in ${inTime(e.sunset - now)}` : '' };
    if (!t(e.blue)) return { head: 'The Sun has set', sub: e.blue ? `Blue hour in ${inTime(e.blue - now)}` : '' };
    if (!t(e.civil)) return { head: 'Blue hour', sub: e.civil ? `Ends in ${inTime(e.civil - now)}` : '' };
    const dark = e.dark ? `Full dark in ${inTime(e.dark - now)}` : '';
    if (!t(e.nautical)) return { head: 'Nautical twilight', sub: dark };
    return { head: 'Astronomical twilight', sub: dark };
  }
  // Daytime: the Sun sets before it next rises.
  if (e.sunset && now < e.sunset && (!sunrise || sunrise > e.sunset)) {
    return { head: `Sunset in ${inTime(e.sunset - now)}`,
      sub: e.golden && now < e.golden ? `Golden hour starts in ${inTime(e.golden - now)}` : '' };
  }
  return { head: 'Dawn', sub: toSunrise };   // before sunrise, sky already brightening
}

function timelineHTML(list, now) {
  return `<ol class="timeline">${list.map(s => {
    const isNow = s.start && s.start <= now;
    const when = s.at ? fmtTime(s.at) : span(s.start, s.end);
    return `<li${isNow ? ' class="now"' : ''}>
      <div class="tl-top"><span class="tl-name">${escapeHtml(s.name)}${isNow ? '<span class="pill">Now</span>' : ''}</span>
        <span class="tl-time num">${escapeHtml(when)}</span></div>
      ${s.note ? `<p class="caption">${escapeHtml(s.note)}</p>` : ''}
      <p class="tl-line">${escapeHtml(s.line)}</p></li>`;
  }).join('')}</ol>`;
}

// ---------- Tonight card ----------

const cardHead = '<div class="card-head"><h2 class="eyebrow">Sun</h2><span class="chev">›</span></div>';

export function cardHTML() {
  return `<a class="card sun-card" href="#sun" id="sun-card">${cardHead}<p class="muted">Finding your location…</p></a>`;
}

export function mountCard(root) {
  const el = root.querySelector('#sun-card');
  // Every 15 seconds, so a stage drops off at most a few seconds after it ends.
  return live((loc, st) => {
    if (!loc) { el.innerHTML = cardHead + waiting(st); return; }
    el.innerHTML = cardHead + cardBody(observerFor(loc), new Date(), st);
  }, 15000);
}

function cardBody(obs, now, st) {
  // This evening, or tomorrow evening once tonight's sky is fully dark.
  const today = localMidnight(now);
  let e = evening(obs, today), label = 'This evening';
  let list = upcoming(stages(e), now);
  if (!list.length) {
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    e = evening(obs, tomorrow); label = 'Tomorrow evening';
    list = upcoming(stages(e), now);
  }
  const s = status(obs, e, now);
  const sunrise = nextSunrise(obs, now);
  const sameDay = sunrise && localDayNumber(sunrise) === localDayNumber(now);

  return `
    <div class="sun-status">
      <p class="headline">${escapeHtml(s.head)}</p>
      ${s.sub ? `<p class="muted num">${escapeHtml(s.sub)}</p>` : ''}
    </div>
    ${list.length ? `<h3 class="eyebrow sub-eyebrow">${label}</h3>${timelineHTML(list, now)}`
      : '<p class="muted">No sunset sequence here in the next two days.</p>'}
    ${sunrise ? `<div class="sun-next"><span>${sameDay ? 'Sunrise this morning' : "Tomorrow's sunrise"}</span>
      <span class="num">${escapeHtml(fmtTime(sunrise))}</span></div>` : ''}
    ${st === 'denied' ? '<p class="caption">Using your last known location</p>' : ''}
    <div class="card-foot"><span>Today's photo of the Sun</span><span>›</span></div>`;
}

// ---------- Sun screen: today's photo ----------
// Main: Helioviewer (NASA/ESA archive of SDO images). Backup: NASA's own "latest" picture, only if the main fails,
// always with a warning that it may be days old (decision 8). Neither lets a web page read the photo's exact time
// (checked 29 Sep: no CORS header on any of their addresses), but both print it on the photo in small type.
// So we show that corner of the photo enlarged underneath, and say how to turn UTC into her time.

const PHOTO_TIMEOUT_MS = 30000;

// Where each source prints the date and time on its 1024×1024 picture (x, y, width, height, in the picture's pixels).
const STAMP = {
  helioviewer: [0, 982, 240, 24],     // "SDO AIA 171   2026-09-29 15:17:45"
  nasa: [0, 980, 504, 32],            // "SDO/AIA 171   2026-09-21 15:26:46 UT"
};

function helioviewerURL(now) {
  // Rounded down to 10 minutes, so reopening the screen reuses the same picture instead of asking for a new one.
  const t = new Date(Math.floor(now.getTime() / 600000) * 600000);
  return `https://api.helioviewer.org/v2/takeScreenshot/?date=${t.toISOString().slice(0, 19)}Z&imageScale=2.4` +
    '&layers=%5BSDO,AIA,171,1,100%5D&x0=0&y0=0&width=1024&height=1024&display=true';
}
const NASA_URL = 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_0171.jpg';

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = setTimeout(() => { img.src = ''; reject(new Error('timeout')); }, PHOTO_TIMEOUT_MS);
    img.onload = () => { clearTimeout(timer); resolve(img); };
    img.onerror = () => { clearTimeout(timer); reject(new Error('failed')); };
    img.src = src;
  });
}

// "Add 5 h 30 min" for India, "Add 4 h" for Dubai: how to turn the UTC time on the photo into phone time.
function utcHint(now) {
  const off = -now.getTimezoneOffset();
  if (off === 0) return 'UTC is the same as your time.';
  const h = Math.floor(Math.abs(off) / 60), m = Math.abs(off) % 60;
  const amount = `${h ? `${h} h` : ''}${h && m ? ' ' : ''}${m ? `${m} min` : ''}`;
  return `${off > 0 ? 'Add' : 'Subtract'} ${amount} for your time.`;
}

// The photo's printed date and time, cut from its corner and drawn larger (a picture of the text, not read by us).
function stampCanvas(img, [x, y, w, h]) {
  const cssWidth = Math.min(w * 1.15, 300), cssHeight = cssWidth * h / w;
  const dpr = window.devicePixelRatio || 1;
  const c = document.createElement('canvas');
  c.className = 'sun-stamp';
  c.width = Math.round(cssWidth * dpr); c.height = Math.round(cssHeight * dpr);
  c.style.width = `${cssWidth}px`; c.style.height = `${cssHeight}px`;
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, x, y, w, h, 0, 0, c.width, c.height);
  c.setAttribute('role', 'img');
  c.setAttribute('aria-label', 'Date and time printed on the photo, in UTC');
  return c;
}

export const title = () => 'Sun';

export function render() {
  return backLink('#tonight', 'Tonight') + `
    <section class="card">
      <div class="sun-photo" id="sun-photo"><p class="muted">Loading the latest photo…</p></div>
      <div class="caption sun-photo-note" id="sun-photo-note"></div>
    </section>
    <section class="card about-photo">
      <h2 class="eyebrow">What you're seeing</h2>
      <p>This photo is taken in extreme ultraviolet light, which our eyes can't see. It shows the Sun's outer
        atmosphere, the corona, at around 600,000 °C.</p>
      <p>The glowing loops are hot gas following the Sun's magnetic field. The brightest patches are active regions,
        where sunspots and solar flares come from.</p>
      <p>The gold colour is added by NASA. To the eye, through a safe solar filter, the Sun is a plain bright disc.</p>
      <p class="caption">Taken by NASA's Solar Dynamics Observatory, a satellite that has photographed the Sun
        every few seconds since 2010.</p>
    </section>`;
}

export function mount(root) {
  const box = root.querySelector('#sun-photo'), note = root.querySelector('#sun-photo-note');
  let stopped = false;

  async function load() {
    box.innerHTML = '<p class="muted">Loading the latest photo…</p>';
    note.replaceChildren();
    const now = new Date();
    const show = (img, stamp, text) => {
      if (stopped) return;
      img.alt = "The Sun in ultraviolet light, photographed by NASA's Solar Dynamics Observatory";
      box.replaceChildren(img);
      note.innerHTML = `<span class="sun-stamp-label">Taken at (UTC, as printed on the photo)</span>
        <span id="sun-stamp"></span>
        <span>${escapeHtml(utcHint(now))} ${escapeHtml(text)} Loaded at ${escapeHtml(fmtTime(new Date()))}.</span>`;
      note.querySelector('#sun-stamp').replaceWith(stampCanvas(img, stamp));
    };
    try {
      show(await loadImage(helioviewerURL(now)), STAMP.helioviewer, 'This is the latest photo, usually less than an hour old.');
      return;
    } catch { /* fall through to the backup */ }
    try {
      show(await loadImage(NASA_URL), STAMP.nasa,
        "Backup picture from NASA's own site: it can be several days old, so check the date.");
      return;
    } catch { /* both failed */ }
    if (stopped) return;
    box.innerHTML = `<div class="sun-photo-error"><p>The Sun photo is unavailable right now.</p>
      <p class="caption">Check the internet connection. The sunset times on Tonight still work without it.</p>
      <button type="button" class="button" id="sun-retry">Try again</button></div>`;
    box.querySelector('#sun-retry').addEventListener('click', load);
  }

  load();
  return () => { stopped = true; };
}
