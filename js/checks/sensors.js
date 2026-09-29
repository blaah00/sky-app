// Check: camera, compass and tilt on the phone. Needs a tap to start (the camera needs permission).
//
// How "where is the camera pointing" is worked out: the phone reports its orientation as three
// angles (alpha, beta, gamma) relative to north and the ground. From those we turn the direction
// the back camera looks along into a compass bearing (azimuth) and a height above the horizon.

import * as A from '../../lib/astronomy-engine-2.1.19/astronomy.js';
import { compassWord, escapeHtml } from '../util.js';

export const title = 'Camera, compass, tilt';
export const source = "The phone's own camera and motion sensors (browser APIs)";

const D2R = Math.PI / 180, R2D = 180 / Math.PI;

// Direction the back camera points, from W3C device orientation angles (degrees).
// World axes: x = east, y = north, z = up. The back camera looks along the phone's -z axis.
export function cameraDirection(alpha, beta, gamma) {
  const a = alpha * D2R, b = beta * D2R, g = gamma * D2R;
  const cA = Math.cos(a), sA = Math.sin(a), cB = Math.cos(b), sB = Math.sin(b), cG = Math.cos(g), sG = Math.sin(g);
  const x = -(cA * sG + cG * sA * sB);
  const y = -(sA * sG - cA * cG * sB);
  const z = -(cB * cG);
  return { az: (Math.atan2(x, y) * R2D + 360) % 360, alt: Math.asin(Math.max(-1, Math.min(1, z))) * R2D };
}

function unit(az, alt) {
  return [Math.cos(alt * D2R) * Math.sin(az * D2R), Math.cos(alt * D2R) * Math.cos(az * D2R), Math.sin(alt * D2R)];
}
function separation(p, q) {
  const u = unit(p.az, p.alt), v = unit(q.az, q.alt);
  return Math.acos(Math.max(-1, Math.min(1, u[0] * v[0] + u[1] * v[1] + u[2] * v[2]))) * R2D;
}

export async function run(ctx, progress, update) {
  const obs = new A.Observer(ctx.lat, ctx.lon, ctx.altitude ?? 0);
  const where = body => {
    const eq = A.Equator(body, new Date(), obs, true, true);
    const h = A.Horizon(new Date(), obs, eq.ra, eq.dec, 'normal');
    return { az: h.azimuth, alt: h.altitude };
  };

  const panel = document.createElement('div');
  panel.className = 'sensor-panel';
  panel.innerHTML = `
    <button class="big" data-start>Start camera + compass test</button>
    <video playsinline muted hidden></video>
    <div class="live" hidden></div>
    <button data-stop hidden>Stop camera</button>`;
  const video = panel.querySelector('video');
  const live = panel.querySelector('.live');
  const results = { camera: 'not started', orientation: 'not started' };
  let stream = null, lastEvent = null, eventCount = 0, eventKind = null, timer = null;

  const pushUpdate = () => {
    const camOk = results.camera.startsWith('OK'), oriOk = results.orientation.startsWith('OK');
    update({
      status: camOk && oriOk ? 'green' : (results.camera === 'not started' ? 'waiting' : (camOk || oriOk ? 'amber' : 'red')),
      summary: `Camera: ${results.camera}. Compass/tilt: ${results.orientation}.`,
      rows: [['Camera', results.camera], ['Compass + tilt', results.orientation],
        ...(lastEvent ? [['Last reading', `alpha ${lastEvent.alpha?.toFixed(1)}°, beta ${lastEvent.beta?.toFixed(1)}°, ` +
          `gamma ${lastEvent.gamma?.toFixed(1)}° (${eventKind})`]] : [])],
    });
  };

  function onOrientation(e) {
    if (e.alpha === null) return;
    if (e.type === 'deviceorientation' && !e.absolute) return;   // relative-only readings don't know where north is
    lastEvent = e; eventCount++; eventKind = e.type === 'deviceorientationabsolute' ? 'absolute, from compass' : 'absolute';
  }

  function render() {
    if (!lastEvent) {
      live.innerHTML = '<p>Waiting for compass readings… move the phone a little.</p>';
      return;
    }
    const cam = cameraDirection(lastEvent.alpha, lastEvent.beta, lastEvent.gamma);
    const moon = where(A.Body.Moon), sun = where(A.Body.Sun);
    const fmt = p => `${Math.round(p.az) % 360}° ${compassWord(p.az)}, ${Math.abs(Math.round(p.alt))}° ${p.alt >= -0.5 ? 'up' : 'below horizon'}`;
    live.innerHTML = `
      <p class="bigline">Camera points: <b>${escapeHtml(fmt(cam))}</b></p>
      <p>Moon is at: ${escapeHtml(fmt(moon))} — camera is <b>${separation(cam, moon).toFixed(0)}°</b> away from it</p>
      <p>Sun is at: ${escapeHtml(fmt(sun))} — camera is ${separation(cam, sun).toFixed(0)}° away (don't point at the Sun)</p>
      <p class="small">Raw: alpha ${lastEvent.alpha.toFixed(1)}, beta ${lastEvent.beta.toFixed(1)}, gamma ${lastEvent.gamma.toFixed(1)}. Readings so far: ${eventCount}.</p>`;
  }

  panel.querySelector('[data-start]').onclick = async (ev) => {
    ev.target.hidden = true;
    // Camera
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      video.srcObject = stream; video.hidden = false; await video.play();
      const s = stream.getVideoTracks()[0].getSettings();
      results.camera = `OK — back camera ${s.width}×${s.height}` + (s.facingMode ? ` (${s.facingMode})` : '');
    } catch (e) {
      results.camera = `FAILED — ${e.name === 'NotAllowedError' ? 'permission was refused' : e.message}`;
    }
    // Orientation: Chrome on Android gives compass-referenced readings through "deviceorientationabsolute".
    if ('ondeviceorientationabsolute' in window) window.addEventListener('deviceorientationabsolute', onOrientation);
    else window.addEventListener('deviceorientation', onOrientation);
    live.hidden = false;
    panel.querySelector('[data-stop]').hidden = false;
    pushUpdate();
    let checks = 0;
    timer = setInterval(() => {
      render();
      if (++checks === 6) {   // after 3 seconds, judge whether readings are arriving
        results.orientation = eventCount > 0
          ? `OK — ${eventKind}, about ${Math.round(eventCount / 3)} readings per second`
          : 'FAILED — no compass-referenced readings arrived (sensor blocked or not supported)';
        pushUpdate();
      }
    }, 500);
  };

  panel.querySelector('[data-stop]').onclick = () => {
    stream?.getTracks().forEach(t => t.stop());
    video.hidden = true;
    clearInterval(timer);
    window.removeEventListener('deviceorientationabsolute', onOrientation);
    window.removeEventListener('deviceorientation', onOrientation);
    panel.querySelector('[data-stop]').hidden = true;
  };

  return {
    status: 'waiting',
    summary: 'Tap "Start camera + compass test", allow the camera, then point the back of the phone at the Moon.',
    rows: [],
    panel,
    note: 'Test: point the back camera at the Moon (or a planet). The "degrees away" number is the total sensor error. ' +
      'Try it away from cars and metal. The compass reads magnetic north, which differs from true north by a few degrees depending on where you are.',
  };
}
