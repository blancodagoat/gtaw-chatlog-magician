(function() {

  const ERROR_CATEGORIES = {
    FONT_AWESOME: ['Font Awesome', 'webfonts', 'Glyph bbox'],
    CLIPBOARD: ['clipboard', 'Clipboard'],
    SOURCE_MAP: ['source map', 'sourcemap', '.map'],
    WXT_STORAGE: ['@wxt-dev/storage', 'Storage migration'],
    CROSS_ORIGIN: ['cross-origin', 'XrayWrapper', 'Cannot access rules', 'SecurityError'],
    DOMTOIMAGE: ['domtoimage', 'dom-to-image', 'cssRules', 'SecurityError: Failed to read'],
    IGNORED: ['ResizeObserver loop', 'ResizeObserver loop limit exceeded']
  };

  const matchesErrorCategory = (errorText, categories) => {
    return categories.some(category => 
      ERROR_CATEGORIES[category].some(pattern => errorText.includes(pattern))
    );
  };

  const errorCache = new Map();
  const shouldIgnoreError = (errorText) => {
    if (errorCache.has(errorText)) {
      return errorCache.get(errorText);
    }

    const result = matchesErrorCategory(errorText, ['FONT_AWESOME', 'CLIPBOARD', 'SOURCE_MAP', 'WXT_STORAGE', 'CROSS_ORIGIN', 'DOMTOIMAGE', 'IGNORED']);
    errorCache.set(errorText, result);
    return result;
  };

  window.addEventListener('error', function(event) {
    if (shouldIgnoreError(event.message)) {
      event.preventDefault();
      return true;
    }

    console.log('Error caught by handler:', {
      message: event.error?.message || event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack
    });
  });

  window.addEventListener('unhandledrejection', function(event) {
    const errorMessage = event.reason?.message || String(event.reason);

    if (shouldIgnoreError(errorMessage)) {
      event.preventDefault();
      return true;
    }

    console.log('Unhandled promise rejection:', {
      reason: event.reason,
      message: errorMessage,
      stack: event.reason?.stack
    });
  });

  const originalConsoleError = console.error;
  console.error = function() {
    const errorText = Array.from(arguments).join(' ');

    if (shouldIgnoreError(errorText)) {
      return;
    }

    return originalConsoleError.apply(console, arguments);
  };

  const originalConsoleWarn = console.warn;
  console.warn = function() {
    const warnText = Array.from(arguments).join(' ');

    if (shouldIgnoreError(warnText)) {
      return;
    }

    return originalConsoleWarn.apply(console, arguments);
  };

  const originalConsoleLog = console.log;
  console.log = function() {
    const logText = Array.from(arguments).join(' ');

    if (shouldIgnoreError(logText) || 
        (matchesErrorCategory(logText, ['CLIPBOARD']) && 
         !logText.includes('Clipboard API failed, trying fallback'))) {
      return;
    }

    return originalConsoleLog.apply(console, arguments);
  };

  if (window.performance && window.performance.mark) {
    window.addEventListener('load', () => {
      performance.mark('error-handler-initialized');
      performance.measure('error-handler-setup', 'error-handler-initialized');
    });
  }
})();