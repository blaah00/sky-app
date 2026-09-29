// Check: today's image of the Sun from NASA's Solar Dynamics Observatory (SDO).
// Decision (29 Sep): Helioviewer is the main source; NASA's own "latest" image is the backup.
// Images are shown with a plain <img>, which browsers allow from any site (no CORS needed).

export const title = 'Live Sun image (NASA SDO)';
export const source = 'Main: Helioviewer (NASA/ESA archive of SDO images). Backup: NASA SDO "latest" page';

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image did not load'));
    img.src = src;
  });
}

export async function run() {
  const now = new Date();
  // Helioviewer picks the SDO image closest to the time asked for, and prints its date/time (UTC) on it.
  const iso = now.toISOString().slice(0, 19) + 'Z';
  const sources = [
    ['Main: Helioviewer (SDO AIA 171)', `https://api.helioviewer.org/v2/takeScreenshot/?date=${iso}&imageScale=2.4` +
      '&layers=%5BSDO,AIA,171,1,100%5D&x0=0&y0=0&width=1024&height=1024&display=true'],
    ['Backup: NASA SDO "latest"', 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_0171.jpg'],
  ];
  const rows = [], images = [];
  // Both are loaded here so the test shows whether the backup works too. The app will only load the backup if the main fails.
  for (const [name, url] of sources) {
    try {
      const img = await loadImage(url);
      images.push({ name, src: img.src });
      rows.push([name, 'loaded — check the date/time printed at the bottom of the image (UTC)']);
    } catch {
      rows.push([name, 'FAILED to load']);
    }
  }
  const mainOk = rows[0][1].startsWith('loaded'), backupOk = rows[1][1].startsWith('loaded');
  return {
    status: mainOk ? 'green' : backupOk ? 'amber' : 'red',
    summary: mainOk ? 'Main image (Helioviewer) loaded.' + (backupOk ? ' Backup (NASA) also loads.' : ' Backup (NASA) failed.')
      : backupOk ? 'Main image failed; only the NASA backup loaded (it may be days old — check its date).'
      : 'No Sun image could be loaded.',
    rows,
    images,
    fetchedAt: now,
    note: 'These are photos, not live video: SDO takes a new one every few minutes and it reaches Helioviewer ' +
      'with some delay (it was about 20 minutes old when checked on 29 Sep). NASA\'s "latest" page was 8 days old that day.',
  };
}
