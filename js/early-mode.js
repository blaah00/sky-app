// Runs before the page is drawn, so night mode is red from the very first frame.
// Without this, the app flashes blue for a moment when opened at night.
try {
  if (localStorage.getItem('sky:mode') === 'night') {
    document.documentElement.dataset.mode = 'night';
    // The phone's browser bar colour, too.
    var bar = document.querySelector('meta[name="theme-color"]');
    if (bar) bar.content = '#000000';
  }
} catch (e) { /* storage unavailable: start in normal mode */ }

// Never a blank screen: if the app hasn't started after a few seconds (for example the phone kept an
// old copy of one file right after an update), say what to do in plain words. app.js sets appReady.
setTimeout(function () {
  if (document.documentElement.dataset.appReady) return;
  var main = document.getElementById('screen');
  if (main) main.innerHTML = '<section class="card"><p class="headline">The app didn\'t start</p>' +
    '<p class="muted" style="margin-top:.5rem">Please close it and open it again. If it was just updated, ' +
    'it can take a few minutes before the new version loads everywhere.</p></section>';
}, 6000);
