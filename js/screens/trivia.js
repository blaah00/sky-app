// Trivia: one new fact a day.

import { placeholder } from './common.js';

export const title = () => 'Trivia';

export function render() {
  return [
    placeholder("Today's fact", 'Step 11', 'One new fact every day; tap for the full explanation. Unlocks daily, no skipping ahead.'),
    placeholder('Past facts', 'Step 11', 'Archive of the facts from earlier days.'),
  ].join('');
}
