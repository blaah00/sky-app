// Moon: the card on the Tonight screen, the Moon screen (#moon) and Moon facts (#moon/facts).
// Everything is calculated on the phone for the phone's current location.

import { observerFor, moonNow, nextRiseSet, nextPhases, nearbySpecialMoon, phaseAt } from '../sky/moon.js';
import { loadFacts, currentTags, splitFacts } from '../sky/moon-facts.js';
import { moonSVG } from '../ui/moon-drawing.js';
import { fmtWhen, fmtDay, whereWords, localMidnight, escapeHtml } from '../util.js';
import { backLink, rows, live, waiting } from './common.js';

const km = n => `${Math.round(n).toLocaleString()} km`;
const pct = f => `${Math.round(f * 100)}%`;
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const SIZE_PILL = { supermoon: '<span class="pill">Supermoon</span>', micromoon: '<span class="pill">Micromoon</span>' };

// ---------- Shared: the Moon right now, as a picture + headline + rows ----------

function moonState(loc) {
  const now = new Date();
  const obs = observerFor(loc);
  const m = moonNow(obs, now);
  const { rise, set } = nextRiseSet(obs, now);
  const nextFull = nextPhases(now, 1).find(p => p.quarter === 2);
  const special = nearbySpecialMoon(now);
  return { m, rise, set, nextFull, special: special && special.quarter === 2 ? special : null };
}

function heroHTML(s, size, big = false) {
  return `
    <div class="moon-hero${big ? ' big' : ''}">
      ${moonSVG({ fraction: s.m.fraction, brightLimb: s.m.brightLimb, northUp: s.m.northUp, size,
        label: `${s.m.name}, ${pct(s.m.fraction)} lit` })}
      <div>
        <p class="headline">${s.m.name}</p>
        <p class="muted">${pct(s.m.fraction)} illuminated</p>
      </div>
    </div>`;
}

function rowsHTML(s, status) {
  const items = [['Now', escapeHtml(s.m.alt > -0.5 ? cap(whereWords(s.m.az, s.m.alt)) : 'Below the horizon')]];
  // Moonrise and moonset in the order they happen next.
  [['Moonrise', s.rise], ['Moonset', s.set]].filter(e => e[1]).sort((a, b) => a[1] - b[1])
    .forEach(([what, when]) => items.push([what, fmtWhen(when)]));
  const full = s.special || s.nextFull;
  items.push(['Full moon', `${s.special ? fmtWhen(full.date) : fmtDay(full.date)}${SIZE_PILL[full.size] || ''}`]);
  items.push(['Distance', km(s.m.distanceKm) +
    (status === 'denied' ? '<span class="caption">Using your last known location</span>' : '')]);
  return rows(items);
}

// ---------- Tonight card ----------

const cardHead = '<div class="card-head"><h2 class="eyebrow">Moon</h2><span class="chev">›</span></div>';

export function cardHTML() {
  return `<a class="card moon-card" href="#moon" id="moon-card">${cardHead}<p class="muted">Finding your location…</p></a>`;
}

export function mountCard(root) {
  const el = root.querySelector('#moon-card');
  return live((loc, st) => {
    if (!loc) { el.innerHTML = cardHead + waiting(st); return; }
    const s = moonState(loc);
    el.innerHTML = cardHead + heroHTML(s, 84) + rowsHTML(s, st) +
      '<div class="card-foot"><span>Phases, calendar and Moon facts</span><span>›</span></div>';
  });
}

// ---------- Moon screen ----------

export function title(sub) { return sub === 'facts' ? 'Moon facts' : 'Moon'; }

export function render(sub) {
  if (sub === 'facts') return backLink('#moon', 'Moon') + '<div id="moon-facts"><p class="muted">Loading…</p></div>';
  return backLink('#tonight', 'Tonight') + '<div id="moon-page"><p class="muted">Finding your location…</p></div>';
}

export function mount(root, sub) {
  if (sub === 'facts') return mountFacts(root.querySelector('#moon-facts'));
  const el = root.querySelector('#moon-page');
  return live((loc, st) => {
    if (!loc) { el.innerHTML = waiting(st); return; }
    const s = moonState(loc);
    el.innerHTML = `
      <section class="card">${heroHTML(s, 176, true)}${rowsHTML(s, st)}</section>
      <a class="list-button" href="#moon/facts">
        <span class="icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.2 5.3 5.3 2.2-5.3 2.2L12 18.5l-2.2-5.3L4.5 11l5.3-2.2z"/></svg></span>
        <span class="text"><strong>Moon facts</strong><span class="caption">What's special about tonight's Moon</span></span>
        <span class="chev">›</span>
      </a>
      <section class="card"><div class="card-head"><h2 class="eyebrow">This week</h2><span class="caption">at 9 pm</span></div>${weekHTML()}</section>
      <section class="card"><div class="card-head"><h2 class="eyebrow">Coming up</h2></div>${nextHTML()}</section>
      <section class="card"><div class="card-head"><h2 class="eyebrow">${new Date().toLocaleDateString([], { month: 'long', year: 'numeric' })}</h2></div>${monthHTML()}</section>`;
  });
}

// Small icons for the week and month views, drawn the conventional way (lit on the right while growing).
function icon(date, size) {
  const p = phaseAt(date);
  return moonSVG({ fraction: p.fraction, brightLimb: p.waxing ? 90 : 270, size, icon: true, label: `${p.name}, ${pct(p.fraction)} lit` });
}

function at9pm(day) { const d = new Date(day); d.setHours(21, 0, 0, 0); return d; }

function weekHTML() {
  const today = localMidnight();
  let cells = '';
  for (let i = 0; i < 7; i++) {
    const day = new Date(today); day.setDate(today.getDate() + i);
    const t = at9pm(day);
    cells += `<div class="week-day${i === 0 ? ' today' : ''}">
      <span class="caption">${i === 0 ? 'Today' : day.toLocaleDateString([], { weekday: 'short' })}</span>
      ${icon(t, 34)}<span class="caption num">${pct(phaseAt(t).fraction)}</span></div>`;
  }
  return `<div class="week">${cells}</div>`;
}

// The next new moon and the next full moon, in date order (SPEC: "next full and new moon").
function nextHTML() {
  const all = nextPhases(new Date(), 2);
  const list = [all.find(p => p.quarter === 0), all.find(p => p.quarter === 2)].sort((a, b) => a.date - b.date);
  return rows(list.map(p => [p.kind,
    `${fmtWhen(p.date)}${SIZE_PILL[p.size] || ''}<span class="caption">${km(p.km)}${p.quarter === 0 ? ' · not visible' : ''}</span>`]));
}

function monthHTML() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  // Days that contain a full or new moon get a small label.
  const marks = {};
  for (const p of nextPhases(new Date(first.getTime() - 86400000), 2)) {
    if ((p.quarter === 0 || p.quarter === 2) && p.date.getMonth() === now.getMonth()) {
      marks[p.date.getDate()] = p.quarter === 2 ? 'Full' : 'New';
    }
  }
  let cells = '';
  for (let i = 0; i < 7; i++) {   // 1 Feb 2026 was a Sunday: gives the weekday initials in the phone's language
    cells += `<div class="cal-head">${new Date(2026, 1, 1 + i).toLocaleDateString([], { weekday: 'narrow' })}</div>`;
  }
  cells += '<div></div>'.repeat(first.getDay());
  for (let d = 1; d <= daysInMonth; d++) {
    const t = at9pm(new Date(now.getFullYear(), now.getMonth(), d));
    cells += `<div class="cal-day${d === now.getDate() ? ' today' : ''}"><span>${d}</span>${icon(t, 24)}` +
      `${marks[d] ? `<em>${marks[d]}</em>` : ''}</div>`;
  }
  return `<div class="calendar">${cells}</div>`;
}

// ---------- Facts ----------

function factHTML(f) {
  return `<section class="card fact"><h3>${escapeHtml(f.title)}</h3><p>${escapeHtml(f.text)}</p>
    <p class="caption">Source: <a href="${escapeHtml(f.source.url)}" target="_blank" rel="noopener">${escapeHtml(f.source.name)}</a></p></section>`;
}

function mountFacts(el) {
  let facts = null;
  return live(async (loc, st) => {
    if (!loc) { el.innerHTML = waiting(st); return; }
    try { facts ??= await loadFacts(); } catch { el.innerHTML = '<p class="muted">Moon facts could not be loaded.</p>'; return; }
    const m = moonNow(observerFor(loc));
    const { rightNow, anyTime } = splitFacts(facts, currentTags(m));
    el.innerHTML =
      `<h2 class="eyebrow section-title">Right now · ${escapeHtml(m.name.toLowerCase())}, ${pct(m.fraction)} lit</h2>` +
      rightNow.map(factHTML).join('') +
      `<h2 class="eyebrow section-title">Any time</h2>` + anyTime.map(factHTML).join('');
  });
}
