// About & credits. Required by the licences of the star data (CC BY-SA) and good manners for the rest.

import { backLink } from './common.js';

export const title = () => 'About & credits';

export function render() {
  return backLink('#log', 'My log') + `
    <section class="card credits">
      <p class="headline">Made from the work of many people</p>
      <p>Thank you to everyone whose free data and code this app is built on.</p>

      <h3 class="eyebrow">Star map</h3>
      <ul>
        <li>Stars: HYG Database v4.1 by David Nash (astronexus) — CC BY-SA 4.0</li>
        <li>Constellation lines, Western and Indian (Vedic): Stellarium sky cultures; Indian set by Tanmoy Saha,
          Vishvas Vasuki and the sanskrit-coders community, re-worked by Susanne M Hoffmann — CC BY-SA</li>
      </ul>

      <h3 class="eyebrow">Moon picture</h3>
      <ul>
        <li>NASA's Scientific Visualization Studio (Ernie Wright, USRA), from Lunar Reconnaissance Orbiter data</li>
      </ul>

      <h3 class="eyebrow">Calculations</h3>
      <ul>
        <li>Sun, Moon and planets: astronomy-engine by Don Cross — MIT licence</li>
        <li>Satellite orbits: satellite.js by Shashwat Kandadai and contributors — MIT licence</li>
      </ul>

      <h3 class="eyebrow">Live data</h3>
      <ul>
        <li>Satellite orbits: CelesTrak</li>
        <li>Sun images: NASA Solar Dynamics Observatory, via Helioviewer (NASA/ESA)</li>
        <li>Weather and cloud cover: Open-Meteo</li>
        <li>Launches and crew: The Space Devs (Launch Library 2) and corquaid</li>
        <li>Flights: adsb.lol, adsb.fi, adsbdb</li>
      </ul>
      <p>The star data files are shared under the same CC BY-SA licence.</p>
    </section>`;
}
