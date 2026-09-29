// Small building blocks shared by the screens.

import { escapeHtml } from '../util.js';
import { onLocation, noLocationMessage } from '../sky/location.js';

// A section not built yet: its name, one line on what will go there, and the step that fills it.
export function placeholder(heading, step, what, extraClass = '') {
  return `
    <section class="card soon ${extraClass}">
      <h2 class="eyebrow">${escapeHtml(heading)}</h2>
      <p>${escapeHtml(what)}</p>
      <p class="step">Coming in ${escapeHtml(step)}</p>
    </section>`;
}

export function backLink(href, label) {
  return `<a class="back-link" href="${href}">‹ ${escapeHtml(label)}</a>`;
}

// Label / value rows. Each item: [label, valueHtml]. Values are trusted HTML built by our own code.
export function rows(items) {
  return `<dl class="rows">${items.map(([label, value]) =>
    `<div class="row"><dt>${escapeHtml(label)}</dt><dd>${value}</dd></div>`).join('')}</dl>`;
}

// Shown while there is no position yet (or location is refused).
export function waiting(status) {
  return `<p class="muted">${escapeHtml(noLocationMessage(status))}</p>`;
}

// Keeps part of the screen up to date: redraws on location change and every minute (or as often as asked).
// Returns a stop function.
export function live(draw, everyMs = 60000) {
  let loc = null, st = 'unknown';
  const redraw = () => draw(loc, st);
  const stop = onLocation((l, s) => { loc = l; st = s; redraw(); });
  const timer = setInterval(redraw, everyMs);
  return () => { stop(); clearInterval(timer); };
}
