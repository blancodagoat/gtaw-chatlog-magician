// Attach UI behaviors previously defined inline in index.html

document.addEventListener('DOMContentLoaded', function () {
  // Initialize ColorPalette after scripts have loaded
  const initPalette = () => {
    if (typeof window.ColorPalette !== 'undefined' && typeof window.ColorPalette.init === 'function') {
      window.ColorPalette.init();
    }
  };
  if (typeof window.ColorPalette === 'undefined') {
    setTimeout(initPalette, 100);
  } else {
    initPalette();
  }

  // Wire up Clear History button (CSP-safe)
  const clearBtn = document.getElementById('clearHistoryBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof window.clearHistory === 'function') {
        window.clearHistory();
      }
    });
  }

  // Wire up history tab to global toggle if present
  const historyTab = document.querySelector('.history-tab');
  if (historyTab) {
    const handler = () => {
      if (typeof window.toggleHistoryPanel === 'function') {
        window.toggleHistoryPanel();
      }
    };
    historyTab.addEventListener('click', handler);
  }
});


