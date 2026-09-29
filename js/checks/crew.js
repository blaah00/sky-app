// Check: people in space right now.
// Main: Launch Library 2 (The Space Devs). Cross-check: corquaid "people in space" JSON on GitHub.

import { fetchJSON, fmtAgo } from '../util.js';

export const title = 'Crew in space';
export const source = 'Launch Library 2 (thespacedevs.com) + corquaid people-in-space (GitHub)';

const surname = n => n.trim().split(/\s+/).pop().toLowerCase();
const daysSince = iso => Math.floor((Date.now() - Date.parse(iso)) / 86400000);

export async function run() {
  const rows = [];
  let ll = null, cq = null;

  try {
    // Launch Library free tier: 15 requests/hour, so we keep a copy for 30 minutes.
    const r = await fetchJSON('https://ll.thespacedevs.com/2.3.0/astronauts/?in_space=true&limit=50&mode=normal',
      { cacheKey: 'll-astronauts', maxAgeMin: 30 });
    // Launch Library counts "Starman" (SpaceX's mannequin in a Tesla, launched 2018) as in space. Remove non-humans.
    const all = r.data.results;
    const humans = all.filter(a => a.type?.name !== 'Non-Human');
    ll = { people: humans, dropped: all.length - humans.length, at: r.fetchedAt };
    rows.push(['Launch Library 2', `${ll.people.length} people (fetched ${fmtAgo(r.fetchedAt)}` +
      `${ll.dropped ? `; ignored ${ll.dropped} non-human entry, e.g. Starman` : ''})`]);
  } catch (e) {
    rows.push(['Launch Library 2', `FAILED: ${e.message}`]);
  }

  try {
    const r = await fetchJSON('https://corquaid.github.io/international-space-station-APIs/JSON/people-in-space.json',
      { cacheKey: 'corquaid-people', maxAgeMin: 30 });
    cq = { people: r.data.people, at: r.fetchedAt };
    rows.push(['corquaid (cross-check)', `${cq.people.length} people (fetched ${fmtAgo(r.fetchedAt)})`]);
  } catch (e) {
    rows.push(['corquaid (cross-check)', `FAILED: ${e.message}`]);
  }

  if (!ll && !cq) {
    return { status: 'red', summary: 'Neither crew source could be read.', rows };
  }

  // One line per person. Spacecraft/station comes from corquaid; Launch Library doesn't list it.
  const byName = new Map();
  for (const p of cq?.people ?? []) {
    byName.set(surname(p.name), { name: p.name, country: p.country, craft: p.spacecraft,
      where: p.iss ? 'ISS' : (p.spacecraft?.startsWith('Shenzhou') ? 'Tiangong' : '?'),
      launched: new Date(p.launched * 1000).toISOString(), inCq: true });
  }
  for (const a of ll?.people ?? []) {
    const k = surname(a.name);
    const e = byName.get(k) || { name: a.name, where: '?' };
    e.inLl = true;
    e.country ??= a.nationality?.map(n => n.name).join(', ');
    e.launched ??= a.last_flight;
    byName.set(k, e);
  }
  for (const p of byName.values()) {
    const agree = p.inLl && p.inCq ? '' : (p.inLl ? ' [only in Launch Library]' : ' [only in corquaid]');
    rows.push([p.name, `${p.country || '?'} — ${p.where}${p.craft ? ` (arrived on ${p.craft})` : ''} — ` +
      `${p.launched ? daysSince(p.launched) + ' days in orbit' : 'launch date unknown'}${agree}`]);
  }

  const agree = ll && cq && ll.people.length === cq.people.length &&
    [...byName.values()].every(p => p.inLl && p.inCq);
  return {
    status: agree ? 'green' : 'amber',
    summary: agree ? `${ll.people.length} people in space; both sources agree.`
      : `Sources disagree or one failed — see rows. (${ll?.people.length ?? '?'} vs ${cq?.people.length ?? '?'})`,
    rows,
    fetchedAt: ll?.at || cq?.at,
    note: 'Names are matched by surname, because the two sources spell some first names differently (Andrei / Andrey).',
  };
}
