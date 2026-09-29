// Check: hourly cloud cover. Source: Open-Meteo (free, no key, allows web pages to read it).

import { fetchJSON, fmtWhen } from '../util.js';

export const title = 'Cloud cover by hour';
export const source = 'Open-Meteo (open-meteo.com), weather-model forecast';

export async function run(ctx) {
  // timezone=auto makes the hourly steps fall on the local hour (6:00, 7:00… rather than 6:30 in India).
  // Times still come back as plain UTC seconds, and we show them in the phone's own time zone.
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${ctx.latShared}&longitude=${ctx.lonShared}` +
    '&hourly=cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high&forecast_days=2&timeformat=unixtime&timezone=auto';
  const r = await fetchJSON(url, { cacheKey: 'clouds', maxAgeMin: 30 });
  const h = r.data.hourly;
  const now = Date.now();
  const rows = [];
  for (let i = 0; i < h.time.length; i++) {
    const t = h.time[i] * 1000;
    if (t < now - 3600000 || rows.length >= 14) continue;
    rows.push([fmtWhen(new Date(t)), `${h.cloud_cover[i]}% cloud (low ${h.cloud_cover_low[i]}%, ` +
      `mid ${h.cloud_cover_mid[i]}%, high ${h.cloud_cover_high[i]}%)`]);
  }
  return {
    status: rows.length ? 'green' : 'amber',
    summary: rows.length ? `Next hour: ${rows[0][1]}` : 'No forecast hours returned.',
    rows,
    fetchedAt: r.fetchedAt,
    note: 'This is a forecast from weather models, not a live observation.',
  };
}
