// Modes: three big buttons (Sky camera, Satellites, Flights), each opening its own screen.

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
    line: 'What\'s overhead now, and next passes',
    what: 'Everything overhead right now plus upcoming passes. Filter by space stations, science, weather, navigation, Starlink. Tap one for what it is, owner, launch date, height, speed and crew.',
    icon: '<rect x="9" y="9" width="6" height="6" rx="1"/><path d="M3 5l4 4M17 15l4 4M9 9L5 5M15 15l4 4"/><rect x="2" y="3" width="5" height="3" rx=".5" transform="rotate(45 4.5 4.5)"/><rect x="17" y="18" width="5" height="3" rx=".5" transform="rotate(45 19.5 19.5)"/>',
  },
  flights: {
    name: 'Flights', step: 'the Android app (after Step 13)',
    line: 'Planes above and near you',
    what: 'Flights near you on a radar view. Tap one for airline, route, altitude, speed and aircraft type. Works only in the installed Android app (the free flight data can\'t be read by a web page).',
    icon: '<path d="M21 15.5l-8-4.5V5.5a1 1 0 0 0-2 0V11l-8 4.5V17l8-2.5V19l-2 1.5V22l3-1 3 1v-1.5L13 19v-4.5l8 2.5z"/>',
  },
};

export function title(sub) {
  return MODES[sub]?.name || 'Modes';
}

export function render(sub) {
  const m = MODES[sub];
  if (m) {
    return backLink('#modes', 'All modes') + placeholder(m.name, m.step, m.what);
  }
  return `<div class="big-buttons">${Object.entries(MODES).map(([key, x]) => `
    <a class="big-button" href="#modes/${key}">
      <svg viewBox="0 0 24 24" aria-hidden="true">${x.icon}</svg>
      <div><strong>${x.name}</strong><span>${x.line}</span></div>
    </a>`).join('')}</div>`;
}
