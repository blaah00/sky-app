// Moon: the card on the Tonight screen, the Moon screen (#moon) and Moon facts (#moon/facts).
// Everything is calculated on the phone for the phone's current location.

import { observerFor, moonNow, nextRiseSet, nextPhases, nearbySpecialMoon, phaseAt } from '../sky/moon.js';
import { loadFacts, currentTags, splitFacts } from '../sky/moon-facts.js';
import { onLocation, noLocationMessage } from '../sky/location.js';
import { moonSVG } from '../ui/moon-drawing.js';
import { fmtWhen, whereWords, localMidnight, escapeHtml } from '../util.js';
import { backLink } from './common.js';

const km = n => `${Math.round(n).toLocaleString()} km`;
const pct = f => `${Math.round(f * 100)}%`;
const SIZE_WORD = { supermoon: 'a supermoon', micromoon: 'a micromoon' };

// ---------- The summary shared by the Tonight card and the top of the Moon screen ----------

function summaryHTML(loc, status, { big = false } = {}) {
  const now = new Date();
  const obs = observerFor(loc);
  const m = moonNow(obs, now);
  const { rise, set } = nextRiseSet(obs, now);
  const nextFull = nextPhases(now, 1).find(p => p.quarter === 2);
  const special = nearbySpecialMoon(now);

  const where = m.alt > -0.5 ? whereWords(m.az, m.alt) : 'Below the horizon';
  const events = [['Moonrise', rise], ['Moonset', set]].filter(e => e[1]).sort((a, b) => a[1] - b[1]);
  const specialLine = special && special.quarter === 2
    ? `<p class="badge">${special.size === 'supermoon' ? 'Supermoon' : 'Micromoon'} — full moon ${fmtWhen(special.date)}, ${km(special.km)}</p>`
    : `<p>Next full moon: ${fmtWhen(nextFull.date)}${SIZE_WORD[nextFull.size] ? ` — <strong>${SIZE_WORD[nextFull.size]}</strong> (${km(nextFull.km)})` : ''}</p>`;

  return `
    <div class="moon-row">
      ${moonSVG({ fraction: m.fraction, brightLimb: m.brightLimb, northUp: m.northUp, size: big ? 190 : 116,
        label: `${m.name}, ${pct(m.fraction)} lit` })}
      <div>
        ${big ? '' : '<h2>Moon</h2>'}
        <p class="moon-phase">${m.name}</p>
        <p class="moon-lit">${pct(m.fraction)} lit</p>
      </div>
    </div>
    <p><strong>Now:</strong> ${escapeHtml(where)}</p>
    ${events.map(([what, when]) => `<p>${what}: <strong>${fmtWhen(when)}</strong></p>`).join('')}
    ${specialLine}
    <p class="small">Distance now: ${km(m.distanceKm)}${status === 'denied' ? ' · using your last known location' : ''}</p>`;
}

function waiting(status) {
  return `<p class="small">${escapeHtml(noLocationMessage(status))}</p>`;
}

// Keeps a piece of the screen up to date: redraws on location change and every minute.
function live(draw) {
  let loc = null, st = 'unknown';
  const redraw = () => draw(loc, st);
  const stop = onLocation((l, s) => { loc = l; st = s; redraw(); });
  const timer = setInterval(redraw, 60000);
  return () => { stop(); clearInterval(timer); };
}

// ---------- Tonight card ----------

export function cardHTML() {
  return `<a class="card moon-card" href="#moon" id="moon-card"><h2>Moon</h2><p class="small">Finding your location…</p></a>`;
}

export function mountCard(root) {
  const el = root.querySelector('#moon-card');
  return live((loc, st) => {
    el.innerHTML = loc
      ? summaryHTML(loc, st) + '<p class="tap-hint">Week, month and Moon facts ›</p>'
      : '<h2>Moon</h2>' + waiting(st);
  });
}

// ---------- Moon screen ----------

export function title(sub) { return sub === 'facts' ? 'Moon facts' : 'Moon'; }

export function render(sub) {
  if (sub === 'facts') return backLink('#moon', 'Moon') + '<div id="moon-facts"><p class="small">Loading…</p></div>';
  return backLink('#tonight', 'Tonight') + '<div id="moon-page"><p class="small">Finding your location…</p></div>';
}

export function mount(root, sub) {
  if (sub === 'facts') return mountFacts(root.querySelector('#moon-facts'));
  const el = root.querySelector('#moon-page');
  return live((loc, st) => {
    if (!loc) { el.innerHTML = waiting(st); return; }
    el.innerHTML = `
      <section class="card">${summaryHTML(loc, st, { big: true })}</section>
      <a class="big-button facts-button" href="#moon/facts"><div><strong>Moon facts</strong><span>What's special about tonight's Moon</span></div></a>
      <section class="card"><h2>This week</h2><p class="small">As the Moon looks at 9 pm each night</p>${weekHTML()}</section>
      <section class="card"><h2>Next full and new moons</h2>${nextHTML()}</section>
      <section class="card"><h2>${new Date().toLocaleDateString([], { month: 'long', year: 'numeric' })}</h2>${monthHTML()}</section>`;
  });
}

// Small conventional icons for the week and month views (lit on the right when growing, left when shrinking).
function icon(date, size) {
  const p = phaseAt(date);
  return moonSVG({ fraction: p.fraction, brightLimb: p.waxing ? 90 : 270, size, photo: false, label: `${p.name}, ${pct(p.fraction)} lit` });
}

function at9pm(day) { const d = new Date(day); d.setHours(21, 0, 0, 0); return d; }

function weekHTML() {
  const today = localMidnight();
  let cells = '';
  for (let i = 0; i < 7; i++) {
    const day = new Date(today); day.setDate(today.getDate() + i);
    const t = at9pm(day);
    cells += `<div class="week-day${i === 0 ? ' today' : ''}">
      <span>${i === 0 ? 'Today' : day.toLocaleDateString([], { weekday: 'short' })}</span>
      ${icon(t, 40)}<span class="small">${pct(phaseAt(t).fraction)}</span></div>`;
  }
  return `<div class="week">${cells}</div>`;
}

function nextHTML() {
  const list = nextPhases(new Date(), 3).filter(p => p.quarter === 0 || p.quarter === 2).slice(0, 4);
  return `<ul class="phase-list">${list.map(p => `
    <li><strong>${p.kind}</strong> — ${fmtWhen(p.date)}<br>
      <span class="small">${km(p.km)}${SIZE_WORD[p.size] ? ` · <strong>${SIZE_WORD[p.size]}</strong>` : ''}${p.quarter === 0 ? ' · not visible' : ''}</span></li>`).join('')}</ul>`;
}

function monthHTML() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  // Days that contain a full or new moon, for a small label.
  const marks = {};
  for (const p of nextPhases(new Date(first.getTime() - 86400000), 2)) {
    if ((p.quarter === 0 || p.quarter === 2) && p.date.getMonth() === now.getMonth()) {
      marks[p.date.getDate()] = p.quarter === 2 ? 'Full' : 'New';
    }
  }
  const heads = [];
  for (let i = 0; i < 7; i++) heads.push(new Date(2026, 1, 1 + i).toLocaleDateString([], { weekday: 'narrow' })); // 1 Feb 2026 is a Sunday
  let cells = heads.map(h => `<div class="cal-head">${h}</div>`).join('');
  cells += '<div></div>'.repeat(first.getDay());
  for (let d = 1; d <= daysInMonth; d++) {
    const t = at9pm(new Date(now.getFullYear(), now.getMonth(), d));
    cells += `<div class="cal-day${d === now.getDate() ? ' today' : ''}"><span>${d}</span>${icon(t, 26)}` +
      `${marks[d] ? `<em>${marks[d]}</em>` : ''}</div>`;
  }
  return `<div class="calendar">${cells}</div>`;
}

// ---------- Facts ----------

function factHTML(f) {
  return `<section class="card fact"><h2>${escapeHtml(f.title)}</h2><p>${escapeHtml(f.text)}</p>
    <p class="small">Source: <a href="${escapeHtml(f.source.url)}" target="_blank" rel="noopener">${escapeHtml(f.source.name)}</a></p></section>`;
}

function mountFacts(el) {
  let facts = null;
  const stop = live(async (loc, st) => {
    if (!loc) { el.innerHTML = waiting(st); return; }
    try { facts ??= await loadFacts(); } catch { el.innerHTML = '<p>Moon facts could not be loaded.</p>'; return; }
    const m = moonNow(observerFor(loc));
    const { rightNow, anyTime } = splitFacts(facts, currentTags(m));
    el.innerHTML =
      `<h2 class="section-title">Right now</h2><p class="small">For tonight's ${m.name.toLowerCase()}, ${pct(m.fraction)} lit</p>` +
      rightNow.map(factHTML).join('') +
      `<h2 class="section-title">Any time</h2>` + anyTime.map(factHTML).join('');
  });
  return stop;
}
