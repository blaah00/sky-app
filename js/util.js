// Shared helpers for the Step 1 data test page.
// Nothing here knows about any one data source.

// ---------- Time: always the phone's own time zone ----------
// We never pass a timeZone option, so the browser uses whatever zone the phone is in
// (wherever the phone is in the world). That is decision 2 in PROGRESS.md.

export function phoneTimeZone() {
  const name = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const offsetMin = -new Date().getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const h = Math.floor(Math.abs(offsetMin) / 60);
  const m = Math.abs(offsetMin) % 60;
  return `${name} (UTC${sign}${h}${m ? ':' + String(m).padStart(2, '0') : ''})`;
}

export function fmtTime(date) {
  if (!date) return '—';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

// "Today 6:12 pm", "Tomorrow 5:58 am", or "Thu 2 Oct · 5:58 am"
export function fmtWhen(date) {
  if (!date) return '—';
  const day = localDayNumber(date) - localDayNumber(new Date());
  const t = fmtTime(date);
  if (day === 0) return `Today ${t}`;
  if (day === 1) return `Tomorrow ${t}`;
  if (day === -1) return `Yesterday ${t}`;
  return `${fmtDay(date)} · ${t}`;
}

// "Today", "Tomorrow", or "Thu 2 Oct"
export function fmtDay(date) {
  const day = localDayNumber(date) - localDayNumber(new Date());
  if (day === 0) return 'Today';
  if (day === 1) return 'Tomorrow';
  return date.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
}

export function fmtDate(date) {
  return date.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

// Whole-day counter in the phone's time zone (for "today"/"tomorrow" comparisons).
export function localDayNumber(date) {
  return Math.floor((date.getTime() - date.getTimezoneOffset() * 60000) / 86400000);
}

// Midnight at the start of the given date, in the phone's time zone.
export function localMidnight(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function fmtAgo(date) {
  const s = Math.round((Date.now() - date.getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} days ago`;
}

export function fmtCountdown(ms) {
  if (ms < 0) return 'now';
  const d = Math.floor(ms / 86400000);
  const h = Math.floor(ms / 3600000) % 24;
  const m = Math.floor(ms / 60000) % 60;
  return d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`;
}

// ---------- Directions in plain words ----------

const DIRS = ['north', 'north-northeast', 'northeast', 'east-northeast', 'east', 'east-southeast',
  'southeast', 'south-southeast', 'south', 'south-southwest', 'southwest', 'west-southwest',
  'west', 'west-northwest', 'northwest', 'north-northwest'];

export function compassWord(azDeg) {
  return DIRS[Math.round(((azDeg % 360) + 360) % 360 / 22.5) % 16];
}

export function heightWords(altDeg) {
  if (altDeg < -0.5) return 'below the horizon';
  if (altDeg < 10) return 'just above the horizon';
  if (altDeg < 30) return 'low in the sky';
  if (altDeg < 50) return 'about halfway up';
  if (altDeg < 75) return 'high in the sky';
  return 'almost overhead';
}

export function whereWords(azDeg, altDeg) {
  if (altDeg < -0.5) return 'below the horizon';
  return `${compassWord(azDeg)}, ${heightWords(altDeg)}`;
}

// ---------- Location privacy ----------
// Outside services only ever get coordinates rounded to 2 decimals (~1.1 km). Decision 1.
export function roundForSharing(x) {
  return Math.round(x * 100) / 100;
}

// ---------- Fetching, with plain-language errors and a small on-phone cache ----------

export class FetchError extends Error {}

// Returns { data, fetchedAt: Date, fromCache: boolean }.
// cacheKey + maxAgeMin: reuse a stored copy if it is fresh enough (protects rate limits).
export async function fetchJSON(url, { cacheKey, maxAgeMin = 0, timeoutMs = 20000, init } = {}) {
  if (cacheKey && maxAgeMin > 0) {
    const cached = readCache(cacheKey);
    if (cached && Date.now() - cached.t < maxAgeMin * 60000) {
      return { data: cached.data, fetchedAt: new Date(cached.t), fromCache: true };
    }
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(url, { ...init, signal: ctrl.signal });
  } catch (e) {
    if (e.name === 'AbortError') throw new FetchError(`No answer within ${timeoutMs / 1000} seconds.`);
    // The browser gives the same vague error for "no internet" and "this service does not allow
    // web pages to read it" (CORS). We say both, honestly.
    throw new FetchError('Could not read the answer. Either there is no internet connection, ' +
      'or the service does not allow web pages to read its data (a browser rule called CORS).');
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    const hint = res.status === 429 ? ' (too many requests — the service is rate-limiting us)'
      : res.status === 403 ? ' (access refused by the service)'
      : res.status >= 500 ? ' (the service itself is having problems)' : '';
    // Some services explain the refusal in a short message (e.g. CelesTrak's 2-hour rule). Show it.
    let said = '';
    try { said = (await res.text()).replace(/\s+/g, ' ').trim(); } catch { /* ignore */ }
    const quote = said && said.length < 300 && !said.startsWith('<') ? ` The service said: "${said}"` : '';
    throw new FetchError(`The service answered with error ${res.status}${hint}.${quote}`);
  }
  let data;
  try {
    data = await res.json();
  } catch {
    throw new FetchError('The service answered, but not with readable data.');
  }
  const fetchedAt = new Date();
  if (cacheKey) writeCache(cacheKey, { t: fetchedAt.getTime(), data });
  return { data, fetchedAt, fromCache: false };
}

// localStorage can be unavailable or full; the cache is only a convenience, so failures are ignored.
function readCache(key) {
  try { return JSON.parse(localStorage.getItem('skytest:' + key)); } catch { return null; }
}
function writeCache(key, value) {
  try { localStorage.setItem('skytest:' + key, JSON.stringify(value)); } catch { /* ignore */ }
}

// Let the screen repaint during long calculations.
export const breathe = () => new Promise(r => setTimeout(r, 0));

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
