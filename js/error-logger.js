/**
 * Comprehensive Error Logger for GTAW Chatlog Magician
 * Captures all errors, warnings, and important events for debugging
 */
(function () {
  'use strict';

  // Error log storage
  const errorLog = {
    sessionId: generateSessionId(),
    startTime: new Date().toISOString(),
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    errors: [],
    warnings: [],
    info: [],
    networkIssues: [], // Track failed requests
    resourceIssues: [], // Track failed resources
    userActivity: [], // Track user interactions (breadcrumbs)
    performance: {},
  };

  // Configuration
  const CONFIG = {
    MAX_ENTRIES: 100, // Maximum number of log entries per type
    SHOW_CONSOLE: false, // Suppress console noise in production
    AUTO_SAVE: true, // Auto-save to localStorage
    STORAGE_KEY: 'chatlog_error_log',
  };

  /**
   * Generates a unique session ID
   */
  function generateSessionId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  /**
   * Formats a timestamp
   */
  function timestamp() {
    const now = new Date();
    return now.toISOString().replace('T', ' ').substring(0, 23);
  }

  /**
   * Adds an entry to the log
   */
  function addLogEntry(type, message, details = {}) {
    const entry = {
      timestamp: timestamp(),
      type: type,
      message: String(message),
      details: details,
      url: window.location.href,
      stack: details.stack || new Error().stack,
    };

    // Add to appropriate array
    if (!errorLog[type]) {
      errorLog[type] = [];
    }
    errorLog[type].push(entry);

    // Limit array size
    if (errorLog[type].length > CONFIG.MAX_ENTRIES) {
      errorLog[type].shift();
    }

    // Auto-save to localStorage
    if (CONFIG.AUTO_SAVE) {
      saveToStorage();
    }

    return entry;
  }

  /**
   * Check localStorage available space
   * @returns {Object} - {available: number, total: number, used: number, percentage: number}
   */
  function checkLocalStorageQuota() {
    try {
      let total = 0;
      let used = 0;

      // Calculate current usage
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          used += localStorage[key].length + key.length;
        }
      }

      // Try to estimate total (typical limit is 5-10MB, we'll use 5MB as conservative estimate)
      const ESTIMATED_LIMIT = 5 * 1024 * 1024; // 5MB in bytes
      total = ESTIMATED_LIMIT;

      const percentage = (used / total) * 100;

      return {
        available: total - used,
        total: total,
        used: used,
        percentage: percentage.toFixed(2),
        usedMB: (used / (1024 * 1024)).toFixed(2),
        totalMB: (total / (1024 * 1024)).toFixed(2)
      };
    } catch (e) {
      console.warn('Could not check localStorage quota:', e);
      return null;
    }
  }

  /**
   * Saves log to localStorage with quota checking
   */
  function saveToStorage() {
    try {
      // Check quota before attempting to save
      const quota = checkLocalStorageQuota();
      if (quota && quota.percentage > 90) {
        console.warn(`[ErrorLogger] localStorage usage high (${quota.percentage}%). Some logs may be lost.`);
        addLogEntry('warnings', `localStorage quota critical: ${quota.percentage}% used (${quota.usedMB}MB / ${quota.totalMB}MB)`, {
          quota: quota,
          context: 'localStorage quota check'
        });

        // Try to clear old data if we're over 95%
        if (quota.percentage > 95) {
          console.warn('[ErrorLogger] localStorage nearly full, attempting to trim old data');
          // Keep only recent entries
          errorLog.errors = errorLog.errors.slice(-20);
          errorLog.warnings = errorLog.warnings.slice(-20);
          errorLog.info = errorLog.info.slice(-20);
          errorLog.userActivity = errorLog.userActivity.slice(-20);
        }
      }

      const logData = {
        ...errorLog,
        lastUpdated: timestamp(),
      };

      const serialized = JSON.stringify(logData);
      const sizeKB = (serialized.length / 1024).toFixed(2);

      // Check if this specific save will exceed quota
      if (quota && serialized.length > quota.available) {
        console.error(`[ErrorLogger] Cannot save to localStorage - data size (${sizeKB}KB) exceeds available space (${(quota.available / 1024).toFixed(2)}KB)`);
        addLogEntry('errors', `localStorage save failed: data too large (${sizeKB}KB > ${(quota.available / 1024).toFixed(2)}KB available)`, {
          dataSize: serialized.length,
          available: quota.available,
          context: 'localStorage save'
        });
        return;
      }

      localStorage.setItem(CONFIG.STORAGE_KEY, serialized);
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        console.error('[ErrorLogger] localStorage quota exceeded:', e);
        addLogEntry('errors', 'localStorage quota exceeded during save', {
          error: e.message,
          errorName: e.name,
          context: 'localStorage save',
          quota: checkLocalStorageQuota()
        });
      } else {
        console.warn('[ErrorLogger] Could not save error log to localStorage:', e);
        addLogEntry('warnings', 'Failed to save error log to localStorage', {
          error: e.message,
          errorName: e.name,
          context: 'localStorage save'
        });
      }
    }
  }

  /**
   * Loads log from localStorage
   */
  function loadFromStorage() {
    try {
      const stored = localStorage.getItem(CONFIG.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with current session, keeping old errors
        if (parsed.errors) errorLog.errors = [...parsed.errors, ...errorLog.errors];
        if (parsed.warnings) errorLog.warnings = [...parsed.warnings, ...errorLog.warnings];
        if (parsed.info) errorLog.info = [...parsed.info, ...errorLog.info];
      }
    } catch (e) {
      console.warn('Could not load error log from localStorage:', e);
    }
  }

  /**
   * Check if error should be ignored (browser extensions, ad blockers, third-party scripts)
   */
  function shouldIgnoreError(message, filename, source) {
    // Ignore browser extension errors
    const extensionPatterns = [
      'chrome-extension://',
      'moz-extension://',
      'safari-extension://',
      'edge-extension://',
      'content-scripts.js',
      'injection-tss-mv3.js',
      'TSS:',
      'Content Script Bridge',
    ];

    // Ignore ad blocker and tracking blocker errors
    const adBlockerPatterns = [
      'ERR_BLOCKED_BY_CLIENT',
      'net::ERR_BLOCKED_BY_CLIENT',
      'Failed to load resource: net::ERR_BLOCKED_BY_CLIENT',
    ];

    // Ignore third-party iframe errors (ko-fi, PayPal, etc.)
    const thirdPartyPatterns = [
      'ko-fi.com',
      'paypal.com',
      'googletagmanager.com',
      'google-analytics.com',
      'visualstudio.com',
      'dc.services.visualstudio.com',
      'turnstile',
      'preload',
      '[DOM] Found',
      'non-unique id',
    ];

    const checkString = (message || '') + ' ' + (filename || '') + ' ' + (source || '');

    // Check extension patterns
    if (extensionPatterns.some(pattern => checkString.includes(pattern))) {
      return true;
    }

    // Check ad blocker patterns
    if (adBlockerPatterns.some(pattern => checkString.includes(pattern))) {
      return true;
    }

    // Check third-party patterns
    if (thirdPartyPatterns.some(pattern => checkString.includes(pattern))) {
      return true;
    }

    // Ignore errors from iframes (unless it's our own domain)
    if (filename && !filename.includes(window.location.hostname) && filename.startsWith('http')) {
      return true;
    }

    return false;
  }

  /**
   * Captures uncaught errors
   */
  window.addEventListener('error', function (event) {
    // Filter out noise from extensions and third-party scripts
    if (shouldIgnoreError(event.message, event.filename, event.error?.stack)) {
      return;
    }

    const entry = addLogEntry('errors', event.message, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
      errorType: event.error?.name,
    });

    if (CONFIG.SHOW_CONSOLE) {
      console.error('🔴 [Logged Error]', entry);
    }
  });

  /**
   * Captures unhandled promise rejections
   */
  window.addEventListener('unhandledrejection', function (event) {
    const entry = addLogEntry('errors', 'Unhandled Promise Rejection: ' + event.reason, {
      reason: event.reason,
      stack: event.reason?.stack,
      promise: String(event.promise),
    });

    if (CONFIG.SHOW_CONSOLE) {
      console.error('🔴 [Logged Promise Rejection]', entry);
    }
  });

  /**
   * Wrap console methods to capture them
   */
  const originalConsole = {
    error: console.error,
    warn: console.warn,
    info: console.info,
    log: console.log,
  };

  console.error = function (...args) {
    const message = args.join(' ');
    // Filter out third-party and extension errors
    if (!shouldIgnoreError(message, '', '')) {
      addLogEntry('errors', message, { args: args });
    }
    return originalConsole.error.apply(console, args);
  };

  console.warn = function (...args) {
    const message = args.join(' ');
    // Filter out third-party and extension warnings
    if (!shouldIgnoreError(message, '', '')) {
      addLogEntry('warnings', message, { args: args });
    }
    return originalConsole.warn.apply(console, args);
  };

  console.info = function (...args) {
    addLogEntry('info', args.join(' '), { args: args });
    return originalConsole.info.apply(console, args);
  };

  // Keep console.log separate for cleaner output
  console.log = function (...args) {
    // Don't log everything, just important stuff
    const message = args.join(' ');
    if (message.includes('Error') || message.includes('Failed') || message.includes('Warning')) {
      addLogEntry('info', message, { args: args });
    }
    return originalConsole.log.apply(console, args);
  };

  /**
   * Captures network errors (failed fetch/XHR) with timeout support
   */
  const FETCH_TIMEOUT_MS = 30000; // 30 seconds default timeout

  const originalFetch = window.fetch;
  window.fetch = function (...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
    const options = args[1] || {};

    // Add timeout support using AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    // Merge abort signal with existing options
    const fetchOptions = {
      ...options,
      signal: controller.signal
    };

    return originalFetch
      .apply(this, [args[0], fetchOptions])
      .then((response) => {
        clearTimeout(timeoutId);
        if (!response.ok) {
          // Filter out third-party network errors
          if (!shouldIgnoreError('', url, '')) {
            addLogEntry('networkIssues', `Failed fetch: ${url}`, {
              status: response.status,
              statusText: response.statusText,
              url: url,
              method: options.method || 'GET',
            });
          }
        }
        return response;
      })
      .catch((error) => {
        clearTimeout(timeoutId);

        // Determine if this is a timeout error
        const isTimeout = error.name === 'AbortError';
        const errorMessage = isTimeout ? `Network timeout: ${url}` : `Network error: ${url}`;

        // Filter out third-party network errors
        if (!shouldIgnoreError(errorMessage, url, error.stack)) {
          addLogEntry('networkIssues', errorMessage, {
            error: error.message,
            errorType: error.name,
            url: url,
            stack: error.stack,
            timeout: isTimeout,
            timeoutMs: FETCH_TIMEOUT_MS
          });
        }
        throw error;
      });
  };

  /**
   * Captures resource loading errors (images, scripts, styles)
   */
  window.addEventListener(
    'error',
    function (event) {
      if (event.target !== window && event.target.tagName) {
        const src = event.target.src || event.target.href || '';
        // Filter out third-party resource errors
        if (!shouldIgnoreError('', src, '')) {
          addLogEntry('resourceIssues', `Failed to load ${event.target.tagName}`, {
            tagName: event.target.tagName,
            src: src,
            currentSrc: event.target.currentSrc,
          });
        }
      }
    },
    true
  ); // Use capture phase

  /**
   * Track user actions (breadcrumbs) for debugging context
   */
  function trackUserAction(action, details = {}) {
    addLogEntry('userActivity', action, {
      ...details,
      timestamp: timestamp(),
    });
  }

  // Track button clicks
  document.addEventListener('click', function (event) {
    const target = event.target.closest('button, a, [role="button"]');
    if (target) {
      const label =
        target.textContent?.trim().substring(0, 50) ||
        target.getAttribute('aria-label') ||
        target.id ||
        'Unknown button';
      trackUserAction(`Clicked: ${label}`, {
        element: target.tagName,
        id: target.id,
        className: target.className,
      });
    }
  });

  // Track input changes (sanitized)
  document.addEventListener('change', function (event) {
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'SELECT') {
      const label = event.target.id || event.target.name || 'Unknown input';
      trackUserAction(`Changed: ${label}`, {
        element: event.target.tagName,
        type: event.target.type,
        id: event.target.id,
      });
    }
  });

  /**
   * Captures localStorage quota exceeded errors with enhanced context
   */
  const originalSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function (key, value) {
    try {
      originalSetItem.call(this, key, value);
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        const quota = checkLocalStorageQuota();
        const valueSizeKB = (value.length / 1024).toFixed(2);

        addLogEntry('errors', `LocalStorage quota exceeded for key "${key}"`, {
          key: key,
          valueSize: value.length,
          valueSizeKB: valueSizeKB,
          error: e.message,
          quota: quota,
          suggestion: 'Clear old data or reduce storage usage'
        });

        console.error(`[ErrorLogger] localStorage quota exceeded when setting key "${key}" (${valueSizeKB}KB). Current usage: ${quota?.percentage}%`);
      } else {
        console.error('[ErrorLogger] localStorage setItem failed:', e);
        addLogEntry('errors', `LocalStorage setItem failed for key "${key}"`, {
          key: key,
          valueSize: value.length,
          error: e.message,
          errorName: e.name
        });
      }
      throw e;
    }
  };

  /**
   * Captures performance metrics
   */
  function capturePerformance() {
    if (window.performance) {
      errorLog.performance = {
        timing: {
          loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
          domReady:
            performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
          firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 'N/A',
        },
        memory: performance.memory
          ? {
              usedJSHeapSize: Math.round(performance.memory.usedJSHeapSize / 1048576) + ' MB',
              totalJSHeapSize: Math.round(performance.memory.totalJSHeapSize / 1048576) + ' MB',
              limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576) + ' MB',
            }
          : 'N/A',
      };
    }
  }

  /**
   * Generates a developer-friendly structured error report
   */
  function generateReport() {
    capturePerformance();

    // Collect current app state
    const appState = {
      mode: document.getElementById('toggleMode')?.dataset?.mode || 'unknown',
      fontSize: document.getElementById('font-label')?.value || 'N/A',
      lineLength: document.getElementById('lineLengthInput')?.value || 'N/A',
      chatlogInput: document.getElementById('chatlogInput')?.value || '',
      outputHTML: document.getElementById('output')?.innerHTML || '',
      backgroundEnabled: localStorage.getItem('backgroundEnabled') || 'N/A',
      characterColoring: localStorage.getItem('characterNameColoring') || 'N/A',
      exportWidth: document.getElementById('exportWidth')?.value || 'N/A',
      exportHeight: document.getElementById('exportHeight')?.value || 'N/A',
      exportPPI: document.getElementById('exportPPI')?.value || 'N/A',
      paddingH: document.getElementById('textPaddingHorizontal')?.value || 'N/A',
      paddingV: document.getElementById('textPaddingVertical')?.value || 'N/A',
    };

    const report = [];

    report.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    report.push('🐛 ERROR REPORT - GTAW Chatlog Magician');
    report.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    report.push('');

    // SESSION INFO
    report.push('📋 SESSION');
    report.push('  Session ID:    ' + errorLog.sessionId);
    report.push('  Timestamp:     ' + timestamp());
    report.push('  User Agent:    ' + errorLog.userAgent);
    report.push('  Platform:      ' + errorLog.platform);
    report.push('  Screen:        ' + errorLog.screenResolution);
    report.push('  Viewport:      ' + errorLog.viewport);
    report.push('  Timezone:      ' + errorLog.timezone);
    report.push('');

    // ERROR SUMMARY
    report.push('⚠️  ERROR SUMMARY');
    report.push('  Errors:        ' + errorLog.errors.length);
    report.push('  Warnings:      ' + errorLog.warnings.length);
    report.push('  Network:       ' + (errorLog.networkIssues?.length || 0));
    report.push('  Resources:     ' + (errorLog.resourceIssues?.length || 0));
    report.push('');

    // ERRORS - Full details
    if (errorLog.errors.length > 0) {
      report.push('❌ ERRORS (' + errorLog.errors.length + ')');
      errorLog.errors.forEach((err, i) => {
        report.push('  ' + (i + 1) + '. ' + err.message);
        report.push('     Time:    ' + err.timestamp);
        if (err.details.filename) {
          report.push('     File:    ' + err.details.filename + ':' + err.details.lineno + ':' + err.details.colno);
        }
        if (err.details.errorType) {
          report.push('     Type:    ' + err.details.errorType);
        }
        if (err.stack) {
          const stackLines = err.stack.split('\n').slice(0, 5);
          report.push('     Stack:   ' + stackLines[0]);
          stackLines.slice(1).forEach(line => {
            report.push('              ' + line.trim());
          });
        }
        report.push('');
      });
    } else {
      report.push('✓ No errors logged');
      report.push('');
    }

    // WARNINGS
    if (errorLog.warnings.length > 0) {
      report.push('⚠️  WARNINGS (' + errorLog.warnings.length + ')');
      errorLog.warnings.slice(-10).forEach((warn, i) => {
        report.push('  ' + (i + 1) + '. [' + warn.timestamp + '] ' + warn.message);
      });
      report.push('');
    }

    // NETWORK ISSUES
    if (errorLog.networkIssues && errorLog.networkIssues.length > 0) {
      report.push('🌐 NETWORK ISSUES (' + errorLog.networkIssues.length + ')');
      errorLog.networkIssues.slice(-10).forEach((err, i) => {
        report.push('  ' + (i + 1) + '. ' + err.message);
        if (err.details) {
          report.push('     Status: ' + (err.details.status || 'N/A') + ' | URL: ' + (err.details.url || 'N/A'));
          if (err.details.timeout) {
            report.push('     Timeout: ' + err.details.timeoutMs + 'ms');
          }
        }
      });
      report.push('');
    }

    // RESOURCE ISSUES
    if (errorLog.resourceIssues && errorLog.resourceIssues.length > 0) {
      report.push('📦 RESOURCE LOADING FAILURES (' + errorLog.resourceIssues.length + ')');
      errorLog.resourceIssues.slice(-10).forEach((err, i) => {
        report.push('  ' + (i + 1) + '. ' + err.message);
        if (err.details && err.details.src) {
          report.push('     Source: ' + err.details.src);
        }
      });
      report.push('');
    }

    // USER ACTIVITY
    if (errorLog.userActivity && errorLog.userActivity.length > 0) {
      report.push('👤 USER ACTIVITY (Last 10 actions)');
      errorLog.userActivity.slice(-10).forEach((action, i) => {
        report.push('  ' + (i + 1) + '. [' + action.timestamp + '] ' + action.message);
      });
      report.push('');
    }

    // APP STATE
    report.push('⚙️  APP STATE');
    report.push('  Mode:          ' + appState.mode);
    report.push('  Font Size:     ' + appState.fontSize);
    report.push('  Line Length:   ' + appState.lineLength);
    report.push('  Export:        ' + appState.exportWidth + '×' + appState.exportHeight + 'px @ ' + appState.exportPPI + ' PPI');
    report.push('  Padding:       H:' + appState.paddingH + ' V:' + appState.paddingV);
    report.push('  Background:    ' + (appState.backgroundEnabled === 'true' ? 'ON' : 'OFF'));
    report.push('  Char Coloring: ' + (appState.characterColoring === 'false' ? 'OFF' : 'ON'));
    report.push('');

    // CHATLOG INPUT
    report.push('📝 CHATLOG INPUT (' + appState.chatlogInput.length + ' chars)');
    const inputPreview = appState.chatlogInput.substring(0, 500);
    if (inputPreview) {
      report.push('  ' + inputPreview.replace(/\n/g, '\n  '));
      if (appState.chatlogInput.length > 500) {
        report.push('  ... (truncated, ' + appState.chatlogInput.length + ' chars total)');
      }
    } else {
      report.push('  (empty)');
    }
    report.push('');

    // CHATLOG OUTPUT
    report.push('🖼️  CHATLOG OUTPUT (' + appState.outputHTML.length + ' chars HTML)');
    const outputPreview = appState.outputHTML.substring(0, 500);
    if (outputPreview) {
      report.push('  ' + outputPreview.replace(/\n/g, '\n  '));
      if (appState.outputHTML.length > 500) {
        report.push('  ... (truncated, ' + appState.outputHTML.length + ' chars total)');
      }
    } else {
      report.push('  (empty)');
    }
    report.push('');

    // PERFORMANCE
    report.push('⚡ PERFORMANCE');
    if (errorLog.performance.timing) {
      report.push('  Page Load:     ' + errorLog.performance.timing.loadTime + 'ms');
      report.push('  DOM Ready:     ' + errorLog.performance.timing.domReady + 'ms');
      report.push('  First Paint:   ' + errorLog.performance.timing.firstPaint + 'ms');
      if (errorLog.performance.memory !== 'N/A') {
        report.push('  Memory:        ' + errorLog.performance.memory.usedJSHeapSize + ' / ' + errorLog.performance.memory.totalJSHeapSize + ' (limit: ' + errorLog.performance.memory.limit + ')');
      }
    } else {
      report.push('  Not available');
    }
    report.push('');

    report.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    report.push('Auto-generated at ' + new Date().toLocaleString());
    report.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return report.join('\n');
  }

  /**
   * Shows a non-blocking toast notification
   */
  function showToast(message, type = 'success', duration = 3000) {
    const existing = document.querySelector('.bug-report-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'bug-report-toast';

    const bgColor = type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#f59e0b';
    const icon = type === 'success' ? '✓' : type === 'error' ? '✗' : '⚠';

    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${bgColor};
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 500;
      z-index: 100000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      animation: slideInRight 0.3s ease-out;
      display: flex;
      align-items: center;
      gap: 10px;
      max-width: 400px;
    `;

    toast.innerHTML = `<span style="font-size: 20px;">${icon}</span><span>${message}</span>`;
    document.body.appendChild(toast);

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    if (!document.querySelector('style[data-toast-animations]')) {
      style.setAttribute('data-toast-animations', 'true');
      document.head.appendChild(style);
    }

    // Auto-remove after duration
    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.3s ease-out';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  /**
   * Gets configuration with safe defaults
   */
  function getConfig() {
    // Use default config if window.BUG_REPORT_CONFIG is not loaded
    const defaults = {
      USE_SERVERLESS_PROXY: true, // Default to serverless proxy (Vercel)
      DISCORD_WEBHOOK_URL: '',
      RATE_LIMIT: {
        ENABLED: true,
        MAX_REPORTS_PER_SESSION: 5,
        COOLDOWN_SECONDS: 60,
      },
      FALLBACK_TO_MANUAL_COPY: true,
      SHOW_SUCCESS_MESSAGE: true,
      INCLUDE_CHATLOG_IN_REPORT: false,
    };

    return window.BUG_REPORT_CONFIG || defaults;
  }

  /**
   * Auto-sends bug report via Discord webhook or email
   */
  function autoSendReport() {
    const config = getConfig();

    // Check rate limiting
    if (!checkRateLimit()) {
      showToast(
        'Please wait before sending another report. Limit: ' +
          config.RATE_LIMIT.MAX_REPORTS_PER_SESSION +
          ' per session, ' +
          config.RATE_LIMIT.COOLDOWN_SECONDS +
          's cooldown.',
        'warning',
        4000
      );
      return;
    }

    const report = generateReport();

    // Show loading indicator
    showLoadingIndicator('Sending bug report...');

    // Try serverless function first (keeps webhook private)
    if (config.USE_SERVERLESS_PROXY) {
      sendViaServerless(report)
        .then(() => {
          hideLoadingIndicator();
          if (config.SHOW_SUCCESS_MESSAGE) {
            showToast('Bug report sent successfully! Thank you!', 'success');
          }
          updateRateLimit();
        })
        .catch((err) => {
          console.error('Serverless function failed:', err);
          // Fallback to clipboard copy
          copyReportToClipboard(report);
        });
    }
    // Try Discord webhook directly (if configured and public)
    else if (config.DISCORD_WEBHOOK_URL && config.DISCORD_WEBHOOK_URL.trim() !== '') {
      sendToDiscord(report, config.DISCORD_WEBHOOK_URL)
        .then(() => {
          hideLoadingIndicator();
          if (config.SHOW_SUCCESS_MESSAGE) {
            showToast('Bug report sent successfully! Thank you!', 'success');
          }
          updateRateLimit();
        })
        .catch((err) => {
          console.error('Discord webhook failed:', err);
          // Fallback to clipboard copy
          copyReportToClipboard(report);
        });
    }
    // No auto-send configured, use manual copy
    else {
      hideLoadingIndicator();
      copyReportToClipboard(report);
    }
  }

  /**
   * Sends report via serverless function (keeps webhook private)
   */
  function sendViaServerless(report) {
    const payload = {
      sessionId: errorLog.sessionId,
      userAgent: errorLog.userAgent,
      platform: errorLog.platform,
      errorCount: errorLog.errors.length,
      warningCount: errorLog.warnings.length,
      errors: errorLog.errors,
      warnings: errorLog.warnings,
      networkIssues: errorLog.networkIssues,
      resourceIssues: errorLog.resourceIssues,
      userActivity: errorLog.userActivity,
      performance: errorLog.performance,
      fullReport: report,
    };

    return fetch('/api/report-bug', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }).then((response) => {
      if (!response.ok) {
        throw new Error('Serverless function failed: ' + response.status);
      }
      return response.json();
    });
  }

  /**
   * Sends report to Discord webhook
   */
  function sendToDiscord(report, webhookUrl) {
    const errorCount = errorLog.errors.length;
    const warningCount = errorLog.warnings.length;

    // Create Discord embed (rich formatting)
    const embed = {
      title: '🐛 Bug Report - Chatlog Magician',
      description:
        errorCount > 0 ? `**${errorCount} error(s) detected**` : 'No errors (user feedback)',
      color: errorCount > 0 ? 0xff0000 : 0xffa500, // Red if errors, orange otherwise
      fields: [
        {
          name: '📋 Session Info',
          value: `**ID:** ${errorLog.sessionId}\n**Browser:** ${errorLog.userAgent.split(' ').pop()}\n**Platform:** ${errorLog.platform}`,
          inline: false,
        },
        {
          name: '⚡ Performance',
          value: errorLog.performance.timing
            ? `Load: ${errorLog.performance.timing.loadTime}ms\nMemory: ${errorLog.performance.memory?.usedJSHeapSize || 'N/A'}`
            : 'Not available',
          inline: true,
        },
        {
          name: '📊 Summary',
          value: `Errors: ${errorCount}\nWarnings: ${warningCount}`,
          inline: true,
        },
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'GTAW Chatlog Magician Error Reporter',
      },
    };

    // Add errors if any
    if (errorCount > 0) {
      const errorSummary = errorLog.errors
        .slice(0, 3)
        .map((err, i) => `${i + 1}. ${err.message.substring(0, 100)}`)
        .join('\n');
      embed.fields.push({
        name: '❌ Recent Errors',
        value: '```\n' + errorSummary + '\n```',
        inline: false,
      });
    }

    // Add full report as attachment (Discord has 2000 char limit on fields)
    const payload = {
      username: 'Bug Reporter',
      avatar_url: 'https://cdn.discordapp.com/embed/avatars/0.png',
      embeds: [embed],
      content:
        '**GTAW Chatlog Magician - Error Report**\n\n```\n' +
        report.substring(0, 1800) +
        '\n...\n```',
    };

    return fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }).then((response) => {
      if (!response.ok) {
        throw new Error('Discord webhook failed: ' + response.status);
      }
      return response;
    });
  }

  /**
   * Rate limiting to prevent spam
   */
  const rateLimitKey = 'bug_report_rate_limit';

  function checkRateLimit() {
    const config = getConfig();
    if (!config.RATE_LIMIT || !config.RATE_LIMIT.ENABLED) return true;

    try {
      const data = JSON.parse(localStorage.getItem(rateLimitKey) || '{}');
      const now = Date.now();

      // Check cooldown
      if (data.lastReport && now - data.lastReport < config.RATE_LIMIT.COOLDOWN_SECONDS * 1000) {
        return false;
      }

      // Check session limit
      const sessionStart = data.sessionStart || now;
      const reportCount = data.reportCount || 0;

      // Reset if new session (more than 1 hour)
      if (now - sessionStart > 3600000) {
        return true;
      }

      return reportCount < config.RATE_LIMIT.MAX_REPORTS_PER_SESSION;
    } catch (_e) {
      return true; // Allow if localStorage fails
    }
  }

  function updateRateLimit() {
    const config = getConfig();
    if (!config.RATE_LIMIT || !config.RATE_LIMIT.ENABLED) return;

    try {
      const data = JSON.parse(localStorage.getItem(rateLimitKey) || '{}');
      const now = Date.now();

      const newData = {
        sessionStart: data.sessionStart || now,
        reportCount: (data.reportCount || 0) + 1,
        lastReport: now,
      };

      localStorage.setItem(rateLimitKey, JSON.stringify(newData));
    } catch (e) {
      console.warn('Could not update rate limit:', e);
    }
  }

  /**
   * Shows loading indicator
   */
  function showLoadingIndicator(message) {
    const existing = document.getElementById('bug-report-loading');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'bug-report-loading';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    overlay.innerHTML = `
      <div style="
        background: white;
        padding: 30px 40px;
        border-radius: 8px;
        text-align: center;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      ">
        <div style="
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #3498db;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 15px;
        "></div>
        <div style="color: #333; font-size: 16px;">${message}</div>
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;

    document.body.appendChild(overlay);
  }

  /**
   * Hides loading indicator
   */
  function hideLoadingIndicator() {
    const overlay = document.getElementById('bug-report-loading');
    if (overlay) overlay.remove();
  }

  /**
   * Copies report to clipboard (fallback method)
   */
  function copyReportToClipboard() {
    const report = generateReport();

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(report)
        .then(() => {
          // Don't show another toast if already showing warning toast
          // Just log to console
          console.log('Error report copied to clipboard');
        })
        .catch((err) => {
          console.error('Failed to copy:', err);
          showReportInModal(report);
        });
    } else {
      showReportInModal(report);
    }
  }

  /**
   * Shows report in a modal for manual copying
   */
  function showReportInModal(report) {
    if (typeof HTMLDialogElement !== 'undefined') {
      let dlg = document.getElementById('reportDialog');
      if (!dlg) {
        dlg = document.createElement('dialog');
        dlg.id = 'reportDialog';
        dlg.setAttribute('aria-label', 'Error Report');
        dlg.innerHTML = `
          <form method="dialog" style="margin:0;">
            <h2 style="margin: 0 0 8px 0; font-size: 16px;">Error Report</h2>
            <p style="margin:0 0 8px 0;">Copy this report and send it to the developer:</p>
            <textarea readonly style="width: 80vw; max-width: 800px; height: 50vh; font-family: monospace; font-size: 12px; padding: 10px; border: 1px solid #ccc; border-radius: 4px;">${report}</textarea>
            <div style="margin-top: 10px; text-align: right;">
              <button value="close" style="padding: 10px 16px;">Close</button>
            </div>
          </form>`;
        document.body.appendChild(dlg);
      } else {
        const ta = dlg.querySelector('textarea');
        if (ta) ta.value = report;
      }
      dlg.showModal();
      const main = document.getElementById('main');
      if (main) {
        main.setAttribute('inert', '');
        main.setAttribute('aria-hidden', 'true');
      }
      dlg.addEventListener(
        'close',
        () => {
          if (main) {
            main.removeAttribute('inert');
            main.removeAttribute('aria-hidden');
          }
        },
        { once: true }
      );
      dlg.querySelector('textarea')?.select();
      return;
    }
    // Fallback for browsers without <dialog>
    const modal = document.createElement('div');
    modal.style.cssText = `position: fixed; inset: 0; background: rgba(0,0,0,.8); z-index: 99999; display:flex; align-items:center; justify-content:center; padding:20px;`;
    const content = document.createElement('div');
    content.style.cssText = `background: white; padding: 20px; border-radius: 8px; max-width: 800px; max-height: 80vh; overflow: auto; box-shadow: 0 4px 20px rgba(0,0,0,.3);`;
    content.innerHTML = `
      <h2 style="margin-top:0;">Error Report</h2>
      <p>Copy this report and send it to the developer:</p>
      <textarea readonly style="width:100%; height:400px; font-family: monospace; font-size:12px; padding:10px; border:1px solid #ccc; border-radius:4px;">${report}</textarea>
      <div style="margin-top:10px; text-align:right;"><button id="closeReportModal" style="padding:10px 20px;">Close</button></div>`;
    modal.appendChild(content);
    document.body.appendChild(modal);
    content.querySelector('textarea').select();
    content.querySelector('#closeReportModal').onclick = () => document.body.removeChild(modal);
    modal.onclick = (e) => {
      if (e.target === modal) document.body.removeChild(modal);
    };
  }

  /**
   * Clears the error log
   */
  function clearLog() {
    if (confirm('Are you sure you want to clear the error log?')) {
      errorLog.errors = [];
      errorLog.warnings = [];
      errorLog.info = [];
      localStorage.removeItem(CONFIG.STORAGE_KEY);
      console.info('✓ Error log cleared');
    }
  }

  /**
   * Downloads report as a file
   */
  function downloadReport() {
    const report = generateReport();
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chatlog-error-report-${errorLog.sessionId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Load any previous errors from storage
  loadFromStorage();

  // Capture performance when page loads
  if (document.readyState === 'complete') {
    capturePerformance();
  } else {
    window.addEventListener('load', capturePerformance);
  }

  // Expose API globally
  window.ErrorLogger = {
    getLog: () => errorLog,
    generateReport: generateReport,
    sendReport: autoSendReport, // Primary: Auto-send to Discord/Email
    copyReport: copyReportToClipboard, // Fallback: Manual copy
    downloadReport: downloadReport,
    clearLog: clearLog,
    logError: (msg, details) => addLogEntry('errors', msg, details),
    logWarning: (msg, details) => addLogEntry('warnings', msg, details),
    logInfo: (msg, details) => addLogEntry('info', msg, details),
    checkQuota: checkLocalStorageQuota, // Check localStorage quota
  };

  // Show status in console
  if (CONFIG.SHOW_CONSOLE) {
    console.info(
      '✓ Error Logger initialized. Use ErrorLogger.sendReport() to auto-send bug reports.'
    );
    console.info('  Available commands:');
    console.info('  - ErrorLogger.sendReport() - Auto-send report (Discord/Email)');
    console.info('  - ErrorLogger.copyReport() - Copy report to clipboard');
    console.info('  - ErrorLogger.downloadReport() - Download as .txt file');
    console.info('  - ErrorLogger.getLog() - View full log');
    console.info('  - ErrorLogger.clearLog() - Clear all logs');
  }
})();
