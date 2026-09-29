// Panchang calculations: nakshatra, tithi, Moon rashi, Malayalam month.
// Everything is calculated on the phone from real Sun and Moon positions (astronomy-engine),
// using the sidereal zodiac with the Lahiri ayanamsa. No internet needed.
//
// Plain-words background:
// - The "tropical" longitude is measured from the spring equinox point, which slowly drifts
//   against the stars (precession). Indian astronomy measures from a fixed point among the stars
//   instead ("sidereal"). The gap between the two is the ayanamsa: about 24.2° in 2026.
// - Nakshatra = which of 27 equal 13°20' slices the Moon is in (sidereal).
// - Rashi     = which of 12 equal 30° slices (sidereal).
// - Tithi     = how far the Moon is ahead of the Sun, in 12° steps (30 per lunar month).
//               This one doesn't depend on the ayanamsa at all.
// - Malayalam month = the rashi the Sun is in, starting on a day set by the Kerala rule (below).

import * as A from '../../lib/astronomy-engine-2.1.19/astronomy.js';
import { NAKSHATRAS, RASHIS, tithiName } from './names.js';
import { localDayNumber } from '../util.js';

const NAK_SPAN = 360 / 27;
const norm = x => ((x % 360) + 360) % 360;
const wrap180 = x => { const y = norm(x); return y > 180 ? y - 360 : y; };

// Lahiri ayanamsa (degrees) for an AstroTime.
// Definition used by Swiss Ephemeris "SIDM_LAHIRI": 23.245524743° on JD 2435553.5 (21 Mar 1956),
// carried forward by the IAU 2006 general precession in longitude.
export function lahiriAyanamsa(time) {
  const pA = T => 5028.796195 * T + 1.1054348 * T * T + 0.00007964 * T ** 3; // arcseconds
  const T = time.tt / 36525;                       // centuries since J2000
  const T0 = (2435553.5 - 2451545.0) / 36525;
  return 23.245524743 + (pA(T) - pA(T0)) / 3600;
}

// astronomy-engine gives "true" longitudes (including nutation, a small ±17" wobble).
// The ayanamsa above is a mean value, so we remove nutation first, the same way Swiss Ephemeris does.
function siderealFromTrue(trueLon, time) {
  return norm(trueLon - A.e_tilt(time).dpsi / 3600 - lahiriAyanamsa(time));
}

export function moonSidereal(date) {
  const t = A.MakeTime(date);
  return siderealFromTrue(A.EclipticGeoMoon(t).lon, t);
}

export function sunSidereal(date) {
  const t = A.MakeTime(date);
  return siderealFromTrue(A.SunPosition(t).elon, t);
}

// Moon minus Sun, 0–360°. Tithi = floor(this / 12).
export function moonSunElongation(date) {
  const t = A.MakeTime(date);
  return norm(A.EclipticGeoMoon(t).lon - A.SunPosition(t).elon);
}

// Find the next moment an angle (in degrees, always increasing) crosses the next multiple of `span`.
// Returns a JS Date, accurate to about a second.
function nextBoundary(angleFn, span, from, windowDays) {
  const a0 = angleFn(from);
  const target = norm((Math.floor(a0 / span) + 1) * span);
  const f = t => wrap180(angleFn(t.date) - target);
  const hit = A.Search(f, A.MakeTime(from), A.MakeTime(from).AddDays(windowDays), { dt_tolerance_seconds: 1 });
  return hit ? hit.date : null;
}

// Find the moment an angle last crossed a given boundary value, searching back up to `backDays`.
function lastCrossing(angleFn, boundary, before, backDays) {
  const f = t => wrap180(angleFn(t.date) - boundary);
  const hit = A.Search(f, A.MakeTime(before).AddDays(-backDays), A.MakeTime(before), { dt_tolerance_seconds: 1 });
  return hit ? hit.date : null;
}

export function nakshatraAt(date) {
  const i = Math.floor(moonSidereal(date) / NAK_SPAN);
  return { index: i, ...NAKSHATRAS[i] };
}

export function tithiAt(date) {
  const i = Math.floor(moonSunElongation(date) / 12);
  return { index: i, ...tithiName(i) };
}

export function moonRashiAt(date) {
  const i = Math.floor(moonSidereal(date) / 30);
  return { index: i, ...RASHIS[i] };
}

// Moon moves 11.8–15.4° a day, so the next 13°20' boundary is always within 1.6 days;
// Moon-minus-Sun moves 10–14.5° a day, so the next 12° boundary is also within 1.6 days.
export const nakshatraEnds = from => nextBoundary(moonSidereal, NAK_SPAN, from, 1.6);
export const tithiEnds = from => nextBoundary(moonSunElongation, 12, from, 1.6);
export const moonRashiEnds = from => nextBoundary(moonSidereal, 30, from, 3);

// ---------- Sunrise helpers (for "Today's star" and the Malayalam month rule) ----------

function sunriseAfter(observer, date) {
  const r = A.SearchRiseSet(A.Body.Sun, observer, +1, date, 2);
  return r ? r.date : null;
}
function sunsetAfter(observer, date) {
  const r = A.SearchRiseSet(A.Body.Sun, observer, -1, date, 2);
  return r ? r.date : null;
}

// Sunrise on the phone's current calendar date (even if it's 3 am and sunrise hasn't happened yet).
export function sunriseOnDate(observer, date) {
  const midnight = new Date(date); midnight.setHours(0, 0, 0, 0);
  return sunriseAfter(observer, midnight);
}

// ---------- Malayalam month ----------
// Kerala rule: split daytime (sunrise → sunset) into five equal parts. If the Sun enters the new
// rashi (the sankranti) during the first three parts, the month starts that day. Otherwise
// (later in the afternoon, or at night) it starts the next day.

function monthStartDay(observer, sankranti) {
  // The sunrise-to-sunrise "day" that contains the sankranti starts at the last sunrise before it.
  let rise = sunriseAfter(observer, new Date(sankranti.getTime() - 2 * 86400000));
  for (;;) {
    const next = sunriseAfter(observer, new Date(rise.getTime() + 60000));
    if (next > sankranti) break;
    rise = next;
  }
  const set = sunsetAfter(observer, rise);
  const cutoff = new Date(rise.getTime() + 0.6 * (set - rise));
  const startsSameDay = sankranti < cutoff;
  const firstSunrise = startsSameDay ? rise : sunriseAfter(observer, new Date(rise.getTime() + 60000));
  return { firstDay: firstSunrise, cutoff, startsSameDay };
}

export function malayalamMonth(observer, now = new Date()) {
  // Which rashi the Sun is in now, and when it entered.
  let r = Math.floor(sunSidereal(now) / 30);
  let sankranti = lastCrossing(sunSidereal, r * 30, now, 33);
  let start = monthStartDay(observer, sankranti);
  // If the Sun changed rashi today but after the cutoff, the old month is still running today.
  if (localDayNumber(now) < localDayNumber(start.firstDay)) {
    r = (r + 11) % 12;
    sankranti = lastCrossing(sunSidereal, r * 30, sankranti, 33);
    start = monthStartDay(observer, sankranti);
  }
  const day = localDayNumber(now) - localDayNumber(start.firstDay) + 1;
  return { index: r, ...RASHIS[r], day, sankranti, firstDay: start.firstDay, startsSameDay: start.startsSameDay };
}
