// Modes: Sky camera, Satellites, Flights — each opening its own screen.

import { placeholder, backLink } from './common.js';

const MODES = {
  camera: {
    name: 'Sky camera', step: 'Step 8',
    line: 'Point the phone at the sky',
    what: 'Live camera view with stars, constellation lines (Western and Indian names), planets, the Moon and satellites. Tap a label for its story. Time slider and compass calibration.',
    icon: '<path d="M4 8h3l1.5-2.5h7L17 8h3v11H4z"/><circle cx="12" cy="13.5" r="3.5"/>',
  },
  satellites: {
    name: 'Satellites', step: 'Step 6',
    line: 'Overhead now, and the next passes',
    what: 'Everything overhead right now plus upcoming passes. Filter by space stations, science, weather, navigation, Starlink. Tap one for what it is, owner, launch date, height, speed and crew.',
    icon: '<circle cx="12" cy="12" r="2.2"/><path d="M4.5 12a7.5 7.5 0 0 1 15 0M7.5 12a4.5 4.5 0 0 1 9 0"/><path d="M12 14.2V20M9 20h6"/>',
  },
  flights: {
    name: 'Flights', step: 'the Android app (after Step 13)',
    line: 'Planes above and near you',
    what: 'Flights near you on a radar view. Tap one for airline, route, altitude, speed and aircraft type. Works only in the installed Android app: the free flight data can\'t be read by a web page.',
    icon: '<path d="M21 15.5l-8-4.5V5.5a1 1 0 0 0-2 0V11l-8 4.5V17l8-2.5V19l-2 1.5V22l3-1 3 1v-1.5L13 19v-4.5l8 2.5z"/>',
  },
};

export function title(sub) {
  return MODES[sub]?.name || 'Modes';
}

export function render(sub) {
  const m = MODES[sub];
  if (m) return backLink('#modes', 'Modes') + placeholder(m.name, m.step, m.what);
  return Object.entries(MODES).map(([key, x]) => `
    <a class="list-button" href="#modes/${key}">
      <span class="icon"><svg viewBox="0 0 24 24" aria-hidden="true">${x.icon}</svg></span>
      <span class="text"><strong>${x.name}</strong><span class="caption">${x.line}</span></span>
      <span class="chev">›</span>
    </a>`).join('');
}
