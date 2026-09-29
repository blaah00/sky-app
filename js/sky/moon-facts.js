// Picks the Moon facts that fit the Moon right now (decision 16).
// A fact's "when" list holds alternatives; inside one alternative, "+" means all parts must be true.

import { nearbySpecialMoon } from './moon.js';

let cache = null;
export async function loadFacts() {
  if (!cache) cache = fetch('data/moon-facts.json').then(r => r.json()).then(d => d.facts);
  return cache;
}

// The situation tags that are true right now, from moonNow().
export function currentTags(m) {
  const tags = new Set([m.group, m.waxing ? 'waxing' : 'waning']);
  if (m.alt > 0) tags.add('up');
  if (m.alt > 0 && m.alt < 15) tags.add('low');
  if (m.sunAlt < 0) tags.add('night');
  if (m.alt > 0 && m.sunAlt > 0) tags.add('daytime');
  // Supermoon / micromoon facts only for a full moon, the one you can actually see.
  const special = nearbySpecialMoon(m.date);
  if (special && special.quarter === 2) tags.add(special.size);
  return tags;
}

export function splitFacts(facts, tags) {
  const fits = f => f.when.some(alt => alt.split('+').every(t => tags.has(t)));
  return {
    rightNow: facts.filter(f => !f.when.includes('any') && fits(f)),
    anyTime: facts.filter(f => f.when.includes('any')),
  };
}
