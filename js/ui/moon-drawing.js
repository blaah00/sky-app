// Draws the Moon's phase as a small SVG picture, using NASA's image of the full Moon (decision 16).
//
// How it looks real:
// - The lit part is the photo; the night side is made see-through, so it melts into the sky behind it.
// - The line between day and night (the terminator) is softened, as on the real Moon.
// - On crescents a faint "earthshine" shows the rest of the disc, as you really see it.
//
// brightLimb: which way the lit edge points, in degrees clockwise from "up".
// northUp:    how far the Moon's north is turned (same convention), so the craters sit where she sees them.

const PHOTO = 'img/moon-full.jpg';   // 730 px frame with a 701 px Moon, which matches the circle below
const R = 48;                         // Moon radius inside the 100 × 100 picture

let uid = 0;

// Night side, drawn with the lit side on the right, for an illuminated fraction k (0..1).
// The dark side reaches a little beyond the disc, so softening only affects the terminator, not the rim.
function shadowPath(k) {
  const out = R + 8;
  if (k <= 0.005) return `M0 ${-out}A${out} ${out} 0 1 0 0 ${out}A${out} ${out} 0 1 0 0 ${-out}Z`;
  const rx = (R * Math.abs(1 - 2 * k)).toFixed(2);   // how far the terminator bulges
  const sweep = k < 0.5 ? 0 : 1;                      // crescent: into the right half; gibbous: into the left
  return `M0 ${-out}A${out} ${out} 0 0 0 0 ${out}L0 ${R}A${rx} ${R} 0 0 ${sweep} 0 ${-R}Z`;
}

function earthshine(k, icon) {
  if (icon) return 0.14;              // small icons: keep the whole disc faintly visible so the shape reads
  if (k < 0.35) return 0.12;
  if (k < 0.5) return 0.05;
  return 0;                            // near full, the dark edge is lost in the glare
}

export function moonSVG({ fraction, brightLimb = 90, northUp = 0, size = 120, icon = false, label = '' }) {
  const id = ++uid;
  const lit = fraction >= 0.995;
  const photo = extra => `<g transform="rotate(${northUp.toFixed(1)})"><image href="${PHOTO}" x="-50" y="-50" width="100" height="100"${extra}/></g>`;
  const glow = earthshine(fraction, icon);
  return `
    <svg class="moon-pic${icon ? ' icon' : ''}" width="${size}" height="${size}" viewBox="-50 -50 100 100" role="img" aria-label="${label}">
      <defs>
        <clipPath id="c${id}"><circle r="${R}"/></clipPath>
        <filter id="f${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${icon ? 0.9 : 1.7}"/></filter>
        <mask id="m${id}" maskUnits="userSpaceOnUse" x="-60" y="-60" width="120" height="120">
          <rect x="-60" y="-60" width="120" height="120" fill="#fff"/>
          ${lit ? '' : `<path d="${shadowPath(fraction)}" transform="rotate(${(brightLimb - 90).toFixed(1)})" fill="#000" filter="url(#f${id})"/>`}
        </mask>
      </defs>
      <g clip-path="url(#c${id})">
        ${glow ? photo(` opacity="${glow}"`) : ''}
        <g mask="url(#m${id})">${photo('')}</g>
      </g>
    </svg>`;
}
