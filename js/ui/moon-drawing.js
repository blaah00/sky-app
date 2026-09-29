// Draws the Moon's phase as a small SVG picture.
//
// photo: true  → NASA image of the full Moon, with the night side shaded on top (decision 16).
// photo: false → plain grey disc (small icons in the week and month views).
//
// brightLimb: which way the lit edge points, in degrees clockwise from "up" (0 = lit at the top).
// northUp:    how far the Moon's north is turned, same convention; turns the photo so the craters
//             sit where she actually sees them.

// The NASA frame is 730 px with a 701 px Moon, which already matches our circle (radius 48 of 50),
// so no zoom is needed. Measured from the image itself (see data/LICENSES.md).
const PHOTO_ZOOM = 1.0;
const PHOTO = 'img/moon-full.jpg';

let uid = 0;

// Night side outline, drawn with the lit side on the right, for an illuminated fraction k (0..1).
function shadowPath(k, r) {
  if (k >= 0.995) return '';
  if (k <= 0.005) return `M0 ${-r}A${r} ${r} 0 1 0 0 ${r}A${r} ${r} 0 1 0 0 ${-r}Z`;
  const rx = r * Math.abs(1 - 2 * k);           // how far the terminator bulges
  const sweep = k < 0.5 ? 0 : 1;                // crescent: bulges into the right half; gibbous: into the left
  return `M0 ${-r}A${r} ${r} 0 0 0 0 ${r}A${rx.toFixed(2)} ${r} 0 0 ${sweep} 0 ${-r}Z`;
}

export function moonSVG({ fraction, brightLimb = 90, northUp = 0, size = 120, photo = true, label = '' }) {
  const id = `moonclip${++uid}`;
  const r = 48;
  const w = 100 * PHOTO_ZOOM;
  const disc = photo
    ? `<g transform="rotate(${northUp.toFixed(1)})"><image href="${PHOTO}" x="${-w / 2}" y="${-w / 2}" width="${w}" height="${w}" clip-path="url(#${id})"/></g>`
    : `<circle r="${r}" fill="#d8d8d8"/>`;
  const shade = shadowPath(fraction, r);
  return `
    <svg class="moon-pic" width="${size}" height="${size}" viewBox="-50 -50 100 100" role="img" aria-label="${label}">
      <defs><clipPath id="${id}"><circle r="${r}"/></clipPath></defs>
      ${disc}
      ${shade ? `<path d="${shade}" transform="rotate(${(brightLimb - 90).toFixed(1)})" fill="#050505" fill-opacity="${photo ? 0.9 : 1}"/>` : ''}
      <circle r="${r}" fill="none" stroke="#777" stroke-opacity="0.35" stroke-width="0.8"/>
    </svg>`;
}
