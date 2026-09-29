// Her log: what she has seen. The credits link sits at the very bottom, small and dim (decision 15).

import { placeholder } from './common.js';

export const title = () => 'My log';

export function render() {
  return [
    placeholder('Things I saw', 'Step 12', '"I saw it" on everything records the time, what and the conditions. Add notes and photos.'),
    placeholder('Milestones', 'Step 12', 'Based on real sightings, e.g. first Tiangong, 50 ISS passes, all 5 bright planets.'),
    placeholder('Backup', 'Step 12', 'Save the log to a file, and restore it from one.'),
    '<a class="credits-link" href="#about">About &amp; credits</a>',
  ].join('');
}
