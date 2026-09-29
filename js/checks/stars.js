// Check: bundled star catalogue and constellation lines (files inside the app, no internet).

import * as A from '../../lib/astronomy-engine-2.1.19/astronomy.js';
import { fetchJSON, whereWords } from '../util.js';

export const title = 'Stars and constellation lines';
export const source = 'Bundled files in data/: HYG v4.1 stars, Stellarium Western + Indian (Vedic) lines — all CC BY-SA 4.0';

export async function run(ctx) {
  const rows = [];
  const [stars, west, ind] = await Promise.all([
    fetchJSON('data/stars.json'), fetchJSON('data/constellations-western.json'), fetchJSON('data/constellations-indian.json'),
  ]).then(rs => rs.map(r => r.data.data));

  const byHip = new Map(stars.map(s => [s[0], s]));
  const missing = c => c.lines.flat().filter(h => !byHip.has(h));
  const brokenW = west.filter(c => missing(c).length);
  const brokenI = ind.filter(c => missing(c).length);

  rows.push(['Stars in catalogue', `${stars.length} (down to magnitude 6.5, plus any fainter star used in a line)`]);
  rows.push(['Western constellations', `${west.length} with lines${brokenW.length ? `; ${brokenW.length} with missing stars` : ', all stars present'}`]);
  rows.push(['Indian nakshatra figures', `${ind.length} with lines${brokenI.length ? `; ${brokenI.length} with missing stars` : ', all stars present'}` +
    '. This set has 28 (includes Abhijit, kept on purpose); the panchang itself uses 27.']);

  // How many are above the horizon right now (positions are J2000; good enough for a count).
  const obs = new A.Observer(ctx.lat, ctx.lon, ctx.altitude ?? 0);
  const now = new Date();
  let up = 0, brightestUp = null;
  for (const s of stars) {
    const hor = A.Horizon(now, obs, s[1] / 15, s[2], 'normal');
    if (hor.altitude > 0) {
      up++;
      if (!brightestUp || s[3] < brightestUp.s[3]) brightestUp = { s, hor };
    }
  }
  rows.push(['Stars above the horizon now', `${up}`]);
  if (brightestUp) {
    const [, , , mag, name, desig] = brightestUp.s;
    rows.push(['Brightest star above the horizon now', `${name || desig} (mag ${mag}), ` +
      `${whereWords(brightestUp.hor.azimuth, brightestUp.hor.altitude)}`]);
  }

  const ok = !brokenW.length && !brokenI.length;
  return {
    status: ok ? 'green' : 'red',
    summary: `${stars.length} stars, ${west.length} Western + ${ind.length} Indian figures, loaded from the app itself.`,
    rows,
    fetchedAt: now,
    note: 'Licence: CC BY-SA 4.0 (credit the sources and keep these data files under the same licence). ' +
      'Details in data/LICENSES.md.',
  };
}
