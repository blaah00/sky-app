// Tonight (home screen). Empty sections for now; each is filled in by the step named on it.
// Order: Tonight's highlight first (decision 15), then the rest in SPEC.md order.

import { placeholder } from './common.js';

export const title = () => 'Tonight';

export const subtitle = () =>
  new Date().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });

export function render() {
  return [
    placeholder("Tonight's highlight", 'Step 5', 'The single thing most worth stepping outside for tonight, picked automatically.', 'highlight'),
    placeholder('Moon', 'Step 3', 'Phase, % lit, where it is right now, moonrise and moonset, supermoon or micromoon. Tap for the week and month view, and Moon facts.'),
    placeholder('Sun', 'Step 4', 'The sunset sequence as a live timeline, from golden hour to full dark, and tomorrow\'s sunrise. Tap for today\'s image of the Sun.'),
    placeholder('Planets tonight', 'Step 5', 'Which planets are up tonight, when, and in which direction.'),
    placeholder('Next satellite passes', 'Step 6', 'Bright satellites passing over: start and end direction, time and brightness.'),
    placeholder('Indian sky', 'Step 5', "Tonight's nakshatra, Moon rashi, tithi and the Malayalam month."),
    placeholder('Sky conditions', 'Step 5', 'Cloud cover by hour for tonight, as one small line.', 'slim'),
  ].join('');
}
