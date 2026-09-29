// Sky app — navigation and night mode.
//
// Navigation uses the part of the address after "#" (e.g. #tonight, #modes/satellites).
// Each tap adds a step to the browser's history, so the phone's back button goes back one screen.

import * as tonight from './screens/tonight.js';
import * as modes from './screens/modes.js';
import * as space from './screens/space.js';
import * as trivia from './screens/trivia.js';
import * as log from './screens/log.js';
import * as about from './screens/about.js';
import * as moon from './screens/moon.js';
import * as sun from './screens/sun.js';

// address → screen. The tab is which bottom button lights up.
const SCREENS = { tonight, modes, space, trivia, log, about, moon, sun };
const TAB_OF = { about: 'log', moon: 'tonight', sun: 'tonight' };

const $ = sel => document.querySelector(sel);

// A screen may have a mount() that starts live updates; it returns a function that stops them.
let stopScreen = null;

function show() {
  const [name, ...rest] = location.hash.replace(/^#/, '').split('/');
  const screen = SCREENS[name] ? name : 'tonight';
  const mod = SCREENS[screen];
  const sub = rest.join('/');

  if (stopScreen) { stopScreen(); stopScreen = null; }
  $('#screen').innerHTML = mod.render(sub);
  if (mod.mount) stopScreen = mod.mount($('#screen'), sub) || null;
  $('#screen-title').textContent = mod.title(sub);
  $('#screen-subtitle').textContent = mod.subtitle ? mod.subtitle(sub) : '';
  document.title = `Sky — ${mod.title(sub)}`;

  const tab = TAB_OF[screen] || screen;
  for (const a of document.querySelectorAll('.tabbar a')) {
    if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  window.scrollTo(0, 0);
}

// ---------- Night mode ----------
// The choice is remembered on the phone (browser storage) so it stays on after closing the app.

function setMode(mode) {
  document.documentElement.dataset.mode = mode;
  const night = mode === 'night';
  $('#night-toggle').setAttribute('aria-pressed', String(night));
  $('#night-label').textContent = night ? 'Night on' : 'Night';
  document.querySelector('meta[name="theme-color"]').content = night ? '#000000' : '#0b1020';
  try { localStorage.setItem('sky:mode', mode); } catch { /* storage unavailable: mode just won't be remembered */ }
}

function savedMode() {
  try { return localStorage.getItem('sky:mode') === 'night' ? 'night' : 'normal'; } catch { return 'normal'; }
}

setMode(savedMode());
$('#night-toggle').addEventListener('click', () =>
  setMode(document.documentElement.dataset.mode === 'night' ? 'normal' : 'night'));

window.addEventListener('hashchange', show);
if (!location.hash) history.replaceState(null, '', '#tonight');
show();
document.documentElement.dataset.appReady = '1';   // tells early-mode.js the app started
