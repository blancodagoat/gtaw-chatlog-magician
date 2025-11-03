// Initialize Vercel Web Analytics queue without inline scripts (CSP-friendly)
window.va =
  window.va ||
  function () {
    (window.vaq = window.vaq || []).push(arguments);
  };

// Conditionally load Vercel Web Analytics only in prod (avoid 404 on localhost)
(function loadVercelAnalytics() {
  try {
    const host = location.hostname;
    const isLocal = host === 'localhost' || host === '127.0.0.1';
    if (isLocal) return; // skip in local/dev

    const s = document.createElement('script');
    s.defer = true;
    s.src = '/_vercel/insights/script.js';
    s.onerror = function () {
      // Silently ignore if not available (non-Vercel environments)
    };
    document.head.appendChild(s);
  } catch (_e) {
    // no-op
  }
})();
