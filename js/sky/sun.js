// Sun calculations, all on the phone with astronomy-engine (checked against timeanddate.com in Step 1).
//
// The evening sequence uses the usual definitions (the same ones timeanddate.com uses):
//   golden hour      Sun from 6° above the horizon down to 4° below
//   sunset           the top edge of the Sun touches the horizon
//   blue hour        Sun from 4° below to 6° below
//   civil twilight   ends when the Sun is 6° below
//   nautical         ends when the Sun is 12° below
//   astronomical     ends when the Sun is 18° below: after that the sky is fully dark

import * as A from '../../lib/astronomy-engine-2.1.19/astronomy.js';

export function observerFor(loc) {
  return new A.Observer(loc.lat, loc.lon, loc.altitude ?? 0);
}

// Next time after `from` that the Sun crosses `alt` degrees going down (-1) or up (+1). null if it doesn't within a day.
const crossing = (obs, from, dir, alt) => A.SearchAltitude(A.Body.Sun, obs, dir, from, 1, alt)?.date ?? null;
const riseSet = (obs, from, dir) => A.SearchRiseSet(A.Body.Sun, obs, dir, from, 1)?.date ?? null;

// Geometric position (no bending by the air), so it can be compared with the twilight limits (-6°, -12°, -18°),
// which are defined without it. With bending added, the Sun would look ~0.5° higher even far below the horizon.
export function sunPosition(obs, date) {
  const eq = A.Equator(A.Body.Sun, date, obs, true, true);
  const h = A.Horizon(date, obs, eq.ra, eq.dec);
  return { az: h.azimuth, alt: h.altitude };
}

// The evening sequence of the day that starts at `dayStart` (local midnight).
// Searching from midnight finds that evening's crossings, because every downward crossing
// happens in the afternoon or evening. Any moment that doesn't happen (far north in summer) is null.
export function evening(obs, dayStart) {
  const e = {
    golden: crossing(obs, dayStart, -1, 6),
    sunset: riseSet(obs, dayStart, -1),
    blue: crossing(obs, dayStart, -1, -4),
    civil: crossing(obs, dayStart, -1, -6),
    nautical: crossing(obs, dayStart, -1, -12),
    dark: crossing(obs, dayStart, -1, -18),
  };
  e.sunsetAz = e.sunset ? sunPosition(obs, e.sunset).az : null;
  return e;
}

export function nextSunrise(obs, from) {
  return riseSet(obs, from, +1);
}

// The most recent moment the sky became fully dark, before `date` (for "full dark since 7:30 pm").
export function lastDark(obs, date) {
  const from = new Date(date.getTime() - 86400000);
  const d = crossing(obs, from, -1, -18);
  return d && d <= date ? d : null;
}
