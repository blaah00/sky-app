// Small building blocks shared by the screens.

import { escapeHtml } from '../util.js';

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
