// Check: Indian sky — nakshatra, tithi, Moon rashi, Malayalam month. Calculated on the phone.

import * as A from '../../lib/astronomy-engine-2.1.19/astronomy.js';
import * as P from '../sky/panchang.js';
import { fmtWhen, fmtTime, fmtDate } from '../util.js';

export const title = 'Indian sky (panchang)';
export const source = 'Own calculation from astronomy-engine positions, sidereal, Lahiri ayanamsa (no internet)';

const both = x => `${x.ml} (${x.sa})`;

export async function run(ctx) {
  const obs = new A.Observer(ctx.lat, ctx.lon, ctx.altitude ?? 0);
  const now = new Date();
  const rows = [];

  const nak = P.nakshatraAt(now);
  const tithi = P.tithiAt(now);
  const rashi = P.moonRashiAt(now);
  rows.push(['Nakshatra now', `${both(nak)} — until ${fmtWhen(P.nakshatraEnds(now))}`]);
  rows.push(['Tithi now', `${both(tithi)}, ${tithi.paksha} — until ${fmtWhen(P.tithiEnds(now))}`]);
  rows.push(['Moon rashi now', `${both(rashi)} — until ${fmtWhen(P.moonRashiEnds(now))}`]);

  const sunrise = P.sunriseOnDate(obs, now);
  if (sunrise) {
    const star = P.nakshatraAt(sunrise);
    const tithiSR = P.tithiAt(sunrise);
    rows.push(["Today's star (at sunrise " + fmtTime(sunrise) + ')', both(star)]);
    rows.push(['Tithi at sunrise', `${both(tithiSR)}, ${tithiSR.paksha}`]);
  } else {
    rows.push(["Today's star", 'No sunrise found for today at this location']);
  }

  const m = P.malayalamMonth(obs, now);
  rows.push(['Malayalam month', `${both(m)}, day ${m.day}`]);
  rows.push(['  month began', `${fmtDate(m.firstDay)} (Sun entered ${m.sa} ${fmtWhen(m.sankranti)}; ` +
    `${m.startsSameDay ? 'before' : 'after'} the 3/5-of-daytime cutoff)`]);

  rows.push(['Moon sidereal longitude', `${P.moonSidereal(now).toFixed(3)}°`]);
  rows.push(['Sun sidereal longitude', `${P.sunSidereal(now).toFixed(3)}°`]);
  rows.push(['Lahiri ayanamsa', `${P.lahiriAyanamsa(A.MakeTime(now)).toFixed(4)}°`]);

  return {
    status: 'green',
    summary: `${nak.ml} nakshatra, ${tithi.ml}, Moon in ${rashi.ml}, ${m.ml} ${m.day}.`,
    rows,
    fetchedAt: now,
    note: 'Calculated, not yet verified. Accuracy check: compare with Drik Panchang (Malayalam calendar) ' +
      'for the same date and town, especially the "until" times and the Malayalam day number.',
  };
}
