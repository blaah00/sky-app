// Moon calculations, all on the phone with astronomy-engine (checked against timeanddate.com in Step 1).

import * as A from '../../lib/astronomy-engine-2.1.19/astronomy.js';

const D2R = Math.PI / 180, R2D = 180 / Math.PI;

// Supermoon / micromoon: timeanddate.com's rule (decision 16), applied at the moment of full or new moon.
export const SUPERMOON_KM = 360000;
export const MICROMOON_KM = 405000;

export function observerFor(loc) {
  return new A.Observer(loc.lat, loc.lon, loc.altitude ?? 0);
}

function horizon(body, date, obs) {
  const eq = A.Equator(body, date, obs, true, true);
  const h = A.Horizon(date, obs, eq.ra, eq.dec, 'normal');
  return { az: h.azimuth, alt: h.altitude };
}

export function distanceKm(date) {
  return A.EclipticGeoMoon(date).dist * A.KM_PER_AU;
}

// Phase angle 0 = new, 90 = first quarter, 180 = full, 270 = last quarter.
export function phaseName(angle) {
  const names = ['New moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous',
    'Full moon', 'Waning gibbous', 'Last quarter', 'Waning crescent'];
  return names[Math.round(angle / 45) % 8];
}

// A simple grouping used to pick relevant Moon facts.
export function phaseGroup(angle, fraction) {
  if (fraction < 0.03) return 'new';
  if (fraction > 0.97) return 'full';
  const a = angle % 180;                      // same shape waxing or waning
  if (Math.abs(a - 90) <= 12) return 'quarter';
  return fraction < 0.5 ? 'crescent' : 'gibbous';
}

// Unit vector in local east / north / up coordinates for an azimuth and altitude (degrees).
function enu(az, alt) {
  const a = az * D2R, h = alt * D2R;
  return [Math.cos(h) * Math.sin(a), Math.cos(h) * Math.cos(a), Math.sin(h)];
}

// Angle (degrees, clockwise from "straight up") of a direction on the sky, as seen by someone looking at the
// Moon with their head upright. Used to tilt the Moon picture exactly as it looks from where she stands.
function angleOnSky(moonAz, moonAlt, targetVec) {
  const a = moonAz * D2R, h = moonAlt * D2R;
  const right = [Math.cos(a), -Math.sin(a), 0];                                   // direction of increasing azimuth
  const up = [-Math.sin(h) * Math.sin(a), -Math.sin(h) * Math.cos(a), Math.cos(h)]; // towards the zenith
  const x = targetVec[0] * right[0] + targetVec[1] * right[1] + targetVec[2] * right[2];
  const y = targetVec[0] * up[0] + targetVec[1] * up[1] + targetVec[2] * up[2];
  return Math.atan2(x, y) * R2D;
}

// Everything about the Moon at one moment, for one place.
export function moonNow(obs, date = new Date()) {
  const illum = A.Illumination(A.Body.Moon, date);
  const angle = A.MoonPhase(date);
  const moon = horizon(A.Body.Moon, date, obs);
  const sun = horizon(A.Body.Sun, date, obs);
  // The lit edge points towards the Sun; north on the Moon points (almost) towards the celestial pole.
  const brightLimb = angleOnSky(moon.az, moon.alt, enu(sun.az, sun.alt));
  const northUp = angleOnSky(moon.az, moon.alt, enu(0, obs.latitude));
  return {
    date,
    fraction: illum.phase_fraction,
    angle,
    waxing: angle < 180,
    name: phaseName(angle),
    group: phaseGroup(angle, illum.phase_fraction),
    az: moon.az, alt: moon.alt,
    sunAlt: sun.alt,
    distanceKm: distanceKm(date),
    brightLimb,          // degrees clockwise from up
    northUp,             // degrees clockwise from up, for turning the photo
  };
}

// Next moonrise and moonset after `from`.
export function nextRiseSet(obs, from = new Date()) {
  const rise = A.SearchRiseSet(A.Body.Moon, obs, +1, from, 2)?.date ?? null;
  const set = A.SearchRiseSet(A.Body.Moon, obs, -1, from, 2)?.date ?? null;
  return { rise, set };
}

// Moonrise and moonset during a calendar day (phone's time zone). Either can be null: some days have none.
export function riseSetOnDay(obs, dayStart) {
  const end = new Date(dayStart.getTime() + 86400000);
  const r = A.SearchRiseSet(A.Body.Moon, obs, +1, dayStart, 1)?.date ?? null;
  const s = A.SearchRiseSet(A.Body.Moon, obs, -1, dayStart, 1)?.date ?? null;
  return { rise: r && r < end ? r : null, set: s && s < end ? s : null };
}

function classify(km) {
  return km < SUPERMOON_KM ? 'supermoon' : km > MICROMOON_KM ? 'micromoon' : 'normal';
}

// Next full and new moons (and quarters), each with distance and supermoon/micromoon status.
export function nextPhases(from = new Date(), count = 4) {
  const out = [];
  let q = A.SearchMoonQuarter(from);
  for (let i = 0; i < count * 4 && out.length < count * 4; i++) {
    const km = distanceKm(q.time.date);
    out.push({ quarter: q.quarter, date: q.time.date, km,
      kind: ['New moon', 'First quarter', 'Full moon', 'Last quarter'][q.quarter],
      size: q.quarter === 0 || q.quarter === 2 ? classify(km) : null });
    q = A.NextMoonQuarter(q);
  }
  return out;
}

// Is there a supermoon or micromoon within `days` of now? (full or new moon only)
export function nearbySpecialMoon(from = new Date(), days = 1.5) {
  const start = new Date(from.getTime() - days * 86400000);
  for (const p of nextPhases(start, 1)) {
    if (p.size && p.size !== 'normal' && Math.abs(p.date - from) <= days * 86400000) return p;
  }
  return null;
}

// Phase at a given time, for the week and month views.
export function phaseAt(date) {
  const angle = A.MoonPhase(date);
  return { angle, fraction: A.Illumination(A.Body.Moon, date).phase_fraction, waxing: angle < 180, name: phaseName(angle) };
}
