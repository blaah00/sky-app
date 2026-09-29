// Small building blocks shared by the screens.

import { escapeHtml } from '../util.js';

// An empty section, labelled with the build step that will fill it.
// `what` is the one-line description from SPEC.md, so it's clear what will go here.
export function placeholder(heading, step, what, extraClass = '') {
  return `
    <section class="card ${extraClass}">
      <h2>${escapeHtml(heading)}</h2>
      <span class="soon">Coming in ${escapeHtml(step)}</span>
      <p class="small">${escapeHtml(what)}</p>
    </section>`;
}

export function backLink(href, label) {
  return `<a class="back-link" href="${href}">‹ ${escapeHtml(label)}</a>`;
}
