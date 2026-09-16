/* Theme toggle: dark by default, remembers a manual choice in localStorage.
   Also highlights the current section in the nav. */
(function () {
  var root = document.documentElement;
  var stored = null;
  try { stored = localStorage.getItem('theme'); } catch (e) {}
  // A page can pin its theme with <html data-theme="..." data-theme-lock>; the toggle is skipped there.
  var locked = root.hasAttribute('data-theme-lock');
  if (!locked && (stored === 'dark' || stored === 'light')) root.setAttribute('data-theme', stored);

  function current() {
    var t = root.getAttribute('data-theme');
    if (t) return t;
    return 'dark'; // site default
  }
  function paint(btn) {
    var dark = current() === 'dark';
    btn.textContent = dark ? '☀' : '☾';
    btn.setAttribute('aria-label', 'Switch to ' + (dark ? 'light' : 'dark') + ' theme');
  }

  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.querySelector('.theme-btn');
    if (btn && locked) btn.remove();
    if (btn && !locked) {
      paint(btn);
      btn.addEventListener('click', function () {
        var next = current() === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', next);
        try { localStorage.setItem('theme', next); } catch (e) {}
        paint(btn);
      });
    }

    // Highlight the nav link for the section we're in (works at any base path).
    var here = location.pathname.replace(/index\.html$/, '');
    var links = Array.prototype.slice.call(document.querySelectorAll('.nav a'));
    var best = null;
    links.forEach(function (a) {
      var target = new URL(a.getAttribute('href'), location.href).pathname.replace(/index\.html$/, '');
      if (here.indexOf(target) === 0 && (!best || target.length > best.target.length)) best = { a: a, target: target };
    });
    if (best) best.a.setAttribute('aria-current', 'page');
  });
})();
