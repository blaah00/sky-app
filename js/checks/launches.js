// Check: upcoming rocket launches worldwide. Source: Launch Library 2 (The Space Devs).

import { fetchJSON, fmtWhen, fmtAgo, fmtCountdown } from '../util.js';

export const title = 'Upcoming launches';
export const source = 'Launch Library 2 (thespacedevs.com), free tier, no key';

const shorten = s => !s ? '' : s.length > 140 ? s.slice(0, 140).trimEnd() + '…' : (/[.!?]$/.test(s) ? s : s + '.');

export async function run() {
  // "detailed" is the only format that includes livestream links. Free tier allows 15 requests/hour,
  // so we keep a copy for 30 minutes.
  const r = await fetchJSON('https://ll.thespacedevs.com/2.3.0/launches/upcoming/?limit=12&mode=detailed&hide_recent_previous=true',
    { cacheKey: 'll-launches', maxAgeMin: 30, timeoutMs: 30000 });
  const now = Date.now();
  // The "upcoming" list can still include launches that just happened. Never show a past launch as upcoming.
  const done = new Set(['Launch Successful', 'Launch Failure', 'Partial Failure']);
  const upcoming = r.data.results.filter(l => Date.parse(l.net) > now - 3600000 && !done.has(l.status?.name));
  const dropped = r.data.results.length - upcoming.length;

  const rows = [];
  for (const l of upcoming.slice(0, 10)) {
    const isro = /Indian Space Research/i.test(l.launch_service_provider?.name || '');
    const streams = (l.vid_urls || []).length;
    const exact = l.net_precision?.name && !/second|minute/i.test(l.net_precision.name)
      ? ` (date precision: ${l.net_precision.name})` : '';
    rows.push([`${isro ? '★ ISRO — ' : ''}${l.name}`,
      `${fmtWhen(new Date(l.net))}${exact}, in ${fmtCountdown(Date.parse(l.net) - now)}. ` +
      `${l.launch_service_provider?.name}, ${l.pad?.location?.name}. Status: ${l.status?.name}. ` +
      `Carrying: ${shorten(l.mission?.description) || 'no description'} ` +
      `Livestream links: ${streams}`]);
  }
  const isroCount = upcoming.filter(l => /Indian Space Research/i.test(l.launch_service_provider?.name || '')).length;
  return {
    status: upcoming.length ? 'green' : 'amber',
    summary: `${upcoming.length} upcoming launches listed, ${isroCount} by ISRO` +
      (dropped ? `; ${dropped} already-flown launch(es) filtered out` : '') + '.',
    rows,
    fetchedAt: r.fetchedAt,
    note: `Data ${r.fromCache ? 'from stored copy, ' : ''}fetched ${fmtAgo(r.fetchedAt)}. Livestream links often appear only a day or two before launch.`,
  };
}
