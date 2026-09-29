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
  let stream = null, lastEvent = null, eventKind = null, timer = null;

  // Diagnostics: count every kind of reading separately, so a failure says *which* sensor is missing.
  const counts = { absolute: 0, absoluteEmpty: 0, relative: 0, relativeEmpty: 0, motion: 0 };
  const diag = [];   // extra rows: what Chrome says about each sensor

  const pushUpdate = () => {
    const camOk = results.camera.startsWith('OK'), oriOk = results.orientation.startsWith('OK');
    update({
      status: camOk && oriOk ? 'green' : (results.camera === 'not started' ? 'waiting' : (camOk || oriOk ? 'amber' : 'red')),
      summary: `Camera: ${results.camera}. Compass/tilt: ${results.orientation}.`,
      rows: [['Camera', results.camera], ['Compass + tilt', results.orientation],
        ['Readings in 3 s', `compass-referenced ${counts.absolute} (empty ${counts.absoluteEmpty}), ` +
          `tilt-only ${counts.relative} (empty ${counts.relativeEmpty}), motion ${counts.motion}`],
        ...diag,
        ...(lastEvent ? [['Last reading', `alpha ${lastEvent.alpha?.toFixed(1)}°, beta ${lastEvent.beta?.toFixed(1)}°, ` +
          `gamma ${lastEvent.gamma?.toFixed(1)}° (${eventKind})`]] : [])],
    });
  };

  function onAbsolute(e) {
    if (e.alpha === null) { counts.absoluteEmpty++; return; }
    counts.absolute++; lastEvent = e; eventKind = 'absolute, from compass';
  }
  function onRelative(e) {
    if (e.alpha === null && e.beta === null) { counts.relativeEmpty++; return; }
    if (e.absolute) { counts.absolute++; lastEvent = e; eventKind = 'absolute'; return; }
    counts.relative++;
  }
  const onMotion = () => { counts.motion++; };

  // Ask Chrome directly whether each sensor is allowed, and whether a compass-based orientation sensor exists.
  async function probeSensors() {
    for (const name of ['accelerometer', 'gyroscope', 'magnetometer']) {
      try {
        const st = await navigator.permissions.query({ name });
        diag.push([`Chrome permission: ${name}`, st.state]);
      } catch { diag.push([`Chrome permission: ${name}`, 'cannot be checked on this browser']); }
    }
    if (!('AbsoluteOrientationSensor' in window)) {
      diag.push(['Compass sensor (direct test)', 'not available in this browser']);
      return;
    }
    await new Promise(resolve => {
      let s;
      const done = msg => { diag.push(['Compass sensor (direct test)', msg]); try { s.stop(); } catch { /* ignore */ } resolve(); };
      try {
        s = new AbsoluteOrientationSensor({ frequency: 10 });
        s.onreading = () => done('OK — the phone has a working compass');
        s.onerror = e => done(e.error?.name === 'NotReadableError' ? 'MISSING — this phone reports no compass (magnetometer)'
          : e.error?.name === 'NotAllowedError' ? 'BLOCKED — motion sensors are not allowed for this site'
          : `error: ${e.error?.name} ${e.error?.message || ''}`);
        s.start();
        setTimeout(() => done('no answer within 3 seconds'), 3000);
      } catch (e) { done(`could not start: ${e.name} ${e.message}`); }
    });
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
      <p class="small">Raw: alpha ${lastEvent.alpha.toFixed(1)}, beta ${lastEvent.beta.toFixed(1)}, gamma ${lastEvent.gamma.toFixed(1)}. Readings so far: ${counts.absolute}.</p>`;
  }

  panel.querySelector('[data-start]').onclick = async (ev) => {
    ev.target.hidden = true;
    // Camera: ask for up to Full HD, to learn the best the back camera offers in a browser.
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
      video.srcObject = stream; video.hidden = false; await video.play();
      const s = stream.getVideoTracks()[0].getSettings();
      results.camera = `OK — back camera ${s.width}×${s.height}` + (s.facingMode ? ` (${s.facingMode})` : '');
    } catch (e) {
      results.camera = `FAILED — ${e.name === 'NotAllowedError' ? 'permission was refused' : e.message}`;
    }
    // Orientation: listen to every kind, so we can tell "no compass" from "no sensors at all".
    window.addEventListener('deviceorientationabsolute', onAbsolute);
    window.addEventListener('deviceorientation', onRelative);
    window.addEventListener('devicemotion', onMotion);
    live.hidden = false;
    panel.querySelector('[data-stop]').hidden = false;
    pushUpdate();
    let checks = 0;
    timer = setInterval(async () => {
      render();
      if (++checks === 6) {   // after 3 seconds, judge what arrived
        await probeSensors();
        results.orientation = counts.absolute > 0
          ? `OK — ${eventKind}, about ${Math.round(counts.absolute / 3)} readings per second`
          : counts.relative > 0
            ? 'COMPASS MISSING — tilt works, but no readings that know where north is'
            : counts.motion > 0
              ? 'FAILED — only raw motion arrives; no orientation (tilt or compass) readings'
              : 'FAILED — no motion sensor readings at all (blocked in Chrome settings, or no sensors)';
        pushUpdate();
      }
    }, 500);
  };

  panel.querySelector('[data-stop]').onclick = () => {
    stream?.getTracks().forEach(t => t.stop());
    video.hidden = true;
    clearInterval(timer);
    window.removeEventListener('deviceorientationabsolute', onAbsolute);
    window.removeEventListener('deviceorientation', onRelative);
    window.removeEventListener('devicemotion', onMotion);
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
