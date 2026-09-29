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
