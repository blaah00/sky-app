// Space now: crew in space, launches, events.

import { placeholder } from './common.js';

export const title = () => 'Space now';

export function render() {
  return [
    placeholder('Crew in space', 'Step 9', 'Everyone in orbit right now: names, countries, which station, days in orbit.'),
    placeholder('Launches', 'Step 9', 'Upcoming launches worldwide with countdowns, what each rocket carries, and livestream links. ISRO launches highlighted.'),
    placeholder('Events', 'Step 10', 'Eclipses, meteor showers, conjunctions, supermoons: visible from here or not, when and where to look, what you\'ll see, and cloud odds within a week.'),
  ].join('');
}
