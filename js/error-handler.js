(function () {
  const ERROR_CATEGORIES = {
    FONT_AWESOME: ['Font Awesome', 'webfonts', 'Glyph bbox'],
    CLIPBOARD: ['clipboard', 'Clipboard'],
    SOURCE_MAP: ['source map', 'sourcemap', '.map'],
    WXT_STORAGE: ['@wxt-dev/storage', 'Storage migration'],
    CROSS_ORIGIN: ['cross-origin', 'XrayWrapper', 'Cannot access rules', 'SecurityError'],
    DOMTOIMAGE: [
      'domtoimage',
      'dom-to-image',
      'cssRules',
      'SecurityError: Failed to read',
      'readAsDataURL',
      "parameter 1 is not of type 'Blob'",
    ],
    IGNORED: ['ResizeObserver loop', 'ResizeObserver loop limit exceeded'],
    BROWSER_EXTENSION: [
      'listener indicated an asynchronous response',
      'message channel closed',
      'Content Script Bridge',
      'ERR_BLOCKED_BY_CLIENT',
    ],
    GOOGLE_ANALYTICS: [
      'googletagmanager.com',
      'google-analytics.com',
      'gtag',
      'ERR_BLOCKED_BY_CLIENT',
    ],
    // Image mode specific error categories - DO NOT IGNORE, LOG FOR DEBUGGING
    IMAGE_LOAD: [
      'Failed to load image',
      'Image load timeout',
      'image may be too large',
      'image may be corrupted',
    ],
    CANVAS_MEMORY: [
      'Canvas memory',
      'out of memory',
      'Canvas too large',
      'Canvas dimensions exceed',
    ],
    FILE_UPLOAD: ['File too large', 'Invalid file type', 'Failed to read file', 'FileReader'],
    IMAGE_RENDER: [
      'Failed to render',
      'Could not get canvas context',
      'blob creation failed',
      'PNG metadata',
    ],
  };

  const matchesErrorCategory = (errorText, categories) => {
    return categories.some((category) =>
      ERROR_CATEGORIES[category].some((pattern) => errorText.includes(pattern))
    );
  };

  const errorCache = new Map();
  const shouldIgnoreError = (errorText) => {
    if (errorCache.has(errorText)) {
      return errorCache.get(errorText);
    }

    const result = matchesErrorCategory(errorText, [
      'FONT_AWESOME',
      'CLIPBOARD',
      'SOURCE_MAP',
      'WXT_STORAGE',
      'CROSS_ORIGIN',
      'DOMTOIMAGE',
      'IGNORED',
      'BROWSER_EXTENSION',
      'GOOGLE_ANALYTICS',
    ]);
    errorCache.set(errorText, result);
    return result;
  };

  /**
   * Enhanced logging for image mode errors with additional context
   */
  const logImageError = (errorInfo) => {
    if (!window.ErrorLogger) return;

    // Determine error category
    let category = 'UNKNOWN';
    const errorText = errorInfo.message || '';

    if (matchesErrorCategory(errorText, ['IMAGE_LOAD'])) {
      category = 'IMAGE_LOAD';
    } else if (matchesErrorCategory(errorText, ['CANVAS_MEMORY'])) {
      category = 'CANVAS_MEMORY';
    } else if (matchesErrorCategory(errorText, ['FILE_UPLOAD'])) {
      category = 'FILE_UPLOAD';
    } else if (matchesErrorCategory(errorText, ['IMAGE_RENDER'])) {
      category = 'IMAGE_RENDER';
    }

    // Enhance error info with category and context
    const enhancedInfo = {
      ...errorInfo,
      category,
      context: 'Image Mode',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
    };

    window.ErrorLogger.logError(`[${category}] ${errorInfo.message}`, enhancedInfo);
  };

  window.addEventListener('error', function (event) {
    const errorInfo = {
      message: event.error?.message || event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
    };

    // Check if this is an image-related error and log with enhanced context
    const errorText = errorInfo.message || '';
    const isImageError = matchesErrorCategory(errorText, [
      'IMAGE_LOAD',
      'CANVAS_MEMORY',
      'FILE_UPLOAD',
      'IMAGE_RENDER',
    ]);

    if (isImageError) {
      logImageError(errorInfo);
    } else if (window.ErrorLogger) {
      // Log to ErrorLogger even if we suppress it from console
      window.ErrorLogger.logInfo('Error captured: ' + errorInfo.message, errorInfo);
    }

    if (shouldIgnoreError(event.message)) {
      event.preventDefault();
      return true;
    }

    console.log('Error caught by handler:', errorInfo);
  });

  window.addEventListener('unhandledrejection', function (event) {
    const errorMessage = event.reason?.message || String(event.reason);
    const errorInfo = {
      reason: event.reason,
      message: errorMessage,
      stack: event.reason?.stack,
    };

    // Check if this is an image-related error and log with enhanced context
    const isImageError = matchesErrorCategory(errorMessage, [
      'IMAGE_LOAD',
      'CANVAS_MEMORY',
      'FILE_UPLOAD',
      'IMAGE_RENDER',
    ]);

    if (isImageError) {
      logImageError(errorInfo);
    } else if (window.ErrorLogger) {
      // Log to ErrorLogger even if we suppress it from console
      window.ErrorLogger.logInfo('Promise rejection: ' + errorMessage, errorInfo);
    }

    if (shouldIgnoreError(errorMessage)) {
      event.preventDefault();
      return true;
    }

    console.log('Unhandled promise rejection:', errorInfo);
  });

  const originalConsoleError = console.error;
  console.error = function () {
    const errorText = Array.from(arguments).join(' ');

    if (shouldIgnoreError(errorText)) {
      return;
    }

    return originalConsoleError.apply(console, arguments);
  };

  const originalConsoleWarn = console.warn;
  console.warn = function () {
    const warnText = Array.from(arguments).join(' ');

    if (shouldIgnoreError(warnText)) {
      return;
    }

    return originalConsoleWarn.apply(console, arguments);
  };

  const originalConsoleLog = console.log;
  console.log = function () {
    const logText = Array.from(arguments).join(' ');

    if (
      shouldIgnoreError(logText) ||
      (matchesErrorCategory(logText, ['CLIPBOARD']) &&
        !logText.includes('Clipboard API failed, trying fallback'))
    ) {
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

  // Expose enhanced image error logging globally
  window.ImageErrorHandler = {
    logImageError,
    ERROR_CATEGORIES,
  };
})();
