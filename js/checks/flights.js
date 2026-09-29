// Check: flights overhead + route lookup.
// Positions: adsb.lol, backup adsb.fi (free volunteer receiver networks, no key).
// Routes (from → to): adsbdb.com, looked up by the flight's callsign.

import { fetchJSON, FetchError } from '../util.js';

export const title = 'Flights overhead';
export const source = 'Positions: adsb.lol / adsb.fi. Routes: adsbdb.com';

const RADIUS_NM = 100;   // ~185 km

export async function run(ctx) {
  const rows = [];
  const lat = ctx.latShared, lon = ctx.lonShared;   // rounded to ~1 km
  let aircraft = null, fetchedAt = null, used = null;

  for (const [name, url, key] of [
    ['adsb.lol', `https://api.adsb.lol/v2/point/${lat}/${lon}/${RADIUS_NM}`, 'ac'],
    ['adsb.fi', `https://opendata.adsb.fi/api/v2/lat/${lat}/lon/${lon}/dist/${RADIUS_NM}`, 'aircraft'],
  ]) {
    try {
      const r = await fetchJSON(url, { timeoutMs: 15000 });
      aircraft = r.data[key] || [];
      fetchedAt = r.fetchedAt;
      used = name;
      rows.push([name, `OK — ${aircraft.length} aircraft within ${Math.round(RADIUS_NM * 1.852)} km`]);
      break;
    } catch (e) {
      rows.push([name, `FAILED: ${e.message}`]);
    }
  }

  // Route service: test it with live callsigns if we have them, otherwise with one known flight.
  const callsigns = aircraft ? aircraft.map(a => (a.flight || '').trim()).filter(Boolean).slice(0, 8) : [];
  const testSet = callsigns.length ? callsigns : ['AIC501'];
  let found = 0, missing = 0, routeErr = null;
  for (const cs of testSet) {
    try {
      const r = await fetchJSON(`https://api.adsbdb.com/v0/callsign/${encodeURIComponent(cs)}`,
        { cacheKey: 'route-' + cs, maxAgeMin: 12 * 60 });
      const fr = r.data.response?.flightroute;
      if (fr) {
        found++;
        rows.push([`Route ${cs}`, `${fr.airline?.name || '?'}: ${fr.origin.municipality} (${fr.origin.iata_code}) → ` +
          `${fr.destination.municipality} (${fr.destination.iata_code})`]);
      } else { missing++; rows.push([`Route ${cs}`, 'not known to adsbdb']); }
    } catch (e) {
      // adsbdb answers "unknown callsign" with error 404, which is a valid "not known" result.
      if (e instanceof FetchError && e.message.includes('404')) { missing++; rows.push([`Route ${cs}`, 'not known to adsbdb']); }
      else { routeErr = e.message; rows.push([`Route ${cs}`, `FAILED: ${e.message}`]); break; }
    }
  }
  rows.push(['Route service (adsbdb) reachable from this phone', routeErr ? 'NO' : 'YES']);
  if (!callsigns.length) rows.push(['Note', 'Route lookup was tested with a sample flight (AIC501), because no live flight list was available.']);

  const status = aircraft ? (routeErr ? 'amber' : 'green') : 'red';
  return {
    status,
    summary: aircraft
      ? `${aircraft.length} aircraft within ${Math.round(RADIUS_NM * 1.852)} km (${used}); routes found for ${found} of ${found + missing}.`
      : 'Flight positions could not be read on this phone. Route lookup ' + (routeErr ? 'also failed.' : 'works.'),
    rows,
    fetchedAt,
    note: 'Checked from the Mac on 29 Sep: adsb.lol and adsb.fi answer, but do not send the permission header ' +
      'that lets a web page read their data (CORS), so a red result here is expected on GitHub Pages. ' +
      'Coverage and route quality are being measured separately; see PROGRESS.md.',
  };
}
