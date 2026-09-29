// Where the phone is. Used by every part of the app that depends on location.
//
// - Always the phone's live GPS (decision 1: she travels; never a fixed home).
// - The last known position is remembered ON THE PHONE ONLY (browser storage), so the app opens instantly
//   and works offline. It is never sent anywhere by this file.
// - Anything sent to an outside service must use roundForSharing() from util.js (~1 km).

const KEY = 'sky:lastpos';
const listeners = new Set();
let current = readSaved();       // { lat, lon, altitude, accuracy, time } or null
let status = current ? 'saved' : 'unknown';   // 'saved' | 'live' | 'denied' | 'unavailable' | 'unknown'
let started = false;

function readSaved() {
  try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; }
}
function save(pos) {
  try { localStorage.setItem(KEY, JSON.stringify(pos)); } catch { /* storage unavailable: fine */ }
}

// Current best position (may be the saved one from earlier), or null if none yet.
export function getLocation() { return current; }
export function getLocationStatus() { return status; }

// Call fn now (if we have a position) and every time the position or status changes. Returns an unsubscribe function.
export function onLocation(fn) {
  listeners.add(fn);
  if (current || status !== 'unknown') fn(current, status);
  start();
  return () => listeners.delete(fn);
}

function notify() { for (const fn of listeners) fn(current, status); }

// Ask the phone for GPS once per app start, and again when the app comes back to the front.
function start() {
  if (started) return;
  started = true;
  request();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) request(); });
}

function request() {
  if (!('geolocation' in navigator)) { status = current ? 'saved' : 'unavailable'; notify(); return; }
  navigator.geolocation.getCurrentPosition(p => {
    const c = p.coords;
    current = { lat: c.latitude, lon: c.longitude, altitude: c.altitude ?? 0, accuracy: c.accuracy, time: Date.now() };
    status = 'live';
    save(current);
    notify();
  }, err => {
    // Keep using the saved position if we have one; just record why live GPS failed.
    status = err.code === 1 ? 'denied' : (current ? 'saved' : 'unavailable');
    notify();
  }, { enableHighAccuracy: false, timeout: 30000, maximumAge: 10 * 60000 });
}

// Plain-language message for when there is no position at all.
export function noLocationMessage(st) {
  if (st === 'denied') return 'The app needs your location to know which sky you are under. ' +
    'Please allow location for this app in the phone\'s settings, then reopen it.';
  if (st === 'unavailable') return 'The phone could not find your location right now. Make sure Location is switched on.';
  return 'Finding your location…';
}
