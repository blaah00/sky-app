// About & credits. Required by the licences of the star data (CC BY-SA) and good manners for the rest.

import { backLink } from './common.js';

export const title = () => 'About & credits';

export function render() {
  return backLink('#log', 'My log') + `
    <section class="card credits">
      <h2>Made with love, from free data</h2>
      <p class="small">This app is built on the work of these people and projects. Thank you.</p>

      <h3>Star map</h3>
      <ul>
        <li>Stars: HYG Database v4.1 by David Nash (astronexus) — CC BY-SA 4.0</li>
        <li>Constellation lines, Western and Indian (Vedic): Stellarium sky cultures; Indian set by Tanmoy Saha,
          Vishvas Vasuki and the sanskrit-coders community, re-worked by Susanne M Hoffmann — CC BY-SA</li>
      </ul>

      <h3>Moon picture</h3>
      <ul>
        <li>NASA's Scientific Visualization Studio (Ernie Wright, USRA), from Lunar Reconnaissance Orbiter data</li>
      </ul>

      <h3>Calculations</h3>
      <ul>
        <li>Sun, Moon and planets: astronomy-engine by Don Cross — MIT licence</li>
        <li>Satellite orbits: satellite.js by Shashwat Kandadai and contributors — MIT licence</li>
      </ul>

      <h3>Live data</h3>
      <ul>
        <li>Satellite orbits: CelesTrak</li>
        <li>Sun images: NASA Solar Dynamics Observatory, via Helioviewer (NASA/ESA)</li>
        <li>Weather and cloud cover: Open-Meteo</li>
        <li>Launches and crew: The Space Devs (Launch Library 2) and corquaid</li>
        <li>Flights: adsb.lol, adsb.fi, adsbdb</li>
      </ul>
      <p class="small">The star data files are shared under the same CC BY-SA licence.</p>
    </section>`;
}
