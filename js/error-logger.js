/**
 * Comprehensive Error Logger for GTAW Chatlog Magician
 * Captures all errors, warnings, and important events for debugging
 */
(function() {
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
    networkIssues: [],      // Track failed requests
    resourceIssues: [],     // Track failed resources
    userActivity: [],       // Track user interactions (breadcrumbs)
    performance: {}
  };

  // Configuration
  const CONFIG = {
    MAX_ENTRIES: 100,           // Maximum number of log entries per type
    SHOW_CONSOLE: true,         // Also show in regular console
    AUTO_SAVE: true,            // Auto-save to localStorage
    STORAGE_KEY: 'chatlog_error_log'
  };

  /**
   * Generates a unique session ID
   */
  function generateSessionId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Formats a timestamp
   */
  function timestamp() {
    const now = new Date();
    return now.toISOString().replace('T', ' ').substr(0, 23);
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
      stack: details.stack || new Error().stack
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
   * Saves log to localStorage
   */
  function saveToStorage() {
    try {
      const logData = {
        ...errorLog,
        lastUpdated: timestamp()
      };
      localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(logData));
    } catch (e) {
      console.warn('Could not save error log to localStorage:', e);
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
   * Captures uncaught errors
   */
  window.addEventListener('error', function(event) {
    const entry = addLogEntry('errors', event.message, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
      errorType: event.error?.name
    });

    if (CONFIG.SHOW_CONSOLE) {
      console.error('🔴 [Logged Error]', entry);
    }
  });

  /**
   * Captures unhandled promise rejections
   */
  window.addEventListener('unhandledrejection', function(event) {
    const entry = addLogEntry('errors', 'Unhandled Promise Rejection: ' + event.reason, {
      reason: event.reason,
      stack: event.reason?.stack,
      promise: String(event.promise)
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
    log: console.log
  };

  console.error = function(...args) {
    addLogEntry('errors', args.join(' '), { args: args });
    return originalConsole.error.apply(console, args);
  };

  console.warn = function(...args) {
    addLogEntry('warnings', args.join(' '), { args: args });
    return originalConsole.warn.apply(console, args);
  };

  console.info = function(...args) {
    addLogEntry('info', args.join(' '), { args: args });
    return originalConsole.info.apply(console, args);
  };

  // Keep console.log separate for cleaner output
  console.log = function(...args) {
    // Don't log everything, just important stuff
    const message = args.join(' ');
    if (message.includes('Error') || message.includes('Failed') || message.includes('Warning')) {
      addLogEntry('info', message, { args: args });
    }
    return originalConsole.log.apply(console, args);
  };

  /**
   * Captures network errors (failed fetch/XHR)
   */
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
    return originalFetch.apply(this, args)
      .then(response => {
        if (!response.ok) {
          addLogEntry('networkIssues', `Failed fetch: ${url}`, {
            status: response.status,
            statusText: response.statusText,
            url: url,
            method: args[1]?.method || 'GET'
          });
        }
        return response;
      })
      .catch(error => {
        addLogEntry('networkIssues', `Network error: ${url}`, {
          error: error.message,
          url: url,
          stack: error.stack
        });
        throw error;
      });
  };

  /**
   * Captures resource loading errors (images, scripts, styles)
   */
  window.addEventListener('error', function(event) {
    if (event.target !== window && event.target.tagName) {
      // Resource loading error
      addLogEntry('resourceIssues', `Failed to load ${event.target.tagName}`, {
        tagName: event.target.tagName,
        src: event.target.src || event.target.href,
        currentSrc: event.target.currentSrc
      });
    }
  }, true); // Use capture phase

  /**
   * Track user actions (breadcrumbs) for debugging context
   */
  function trackUserAction(action, details = {}) {
    addLogEntry('userActivity', action, {
      ...details,
      timestamp: timestamp()
    });
  }

  // Track button clicks
  document.addEventListener('click', function(event) {
    const target = event.target.closest('button, a, [role="button"]');
    if (target) {
      const label = target.textContent?.trim().substr(0, 50) || 
                    target.getAttribute('aria-label') || 
                    target.id || 
                    'Unknown button';
      trackUserAction(`Clicked: ${label}`, {
        element: target.tagName,
        id: target.id,
        className: target.className
      });
    }
  });

  // Track input changes (sanitized)
  document.addEventListener('change', function(event) {
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'SELECT') {
      const label = event.target.id || event.target.name || 'Unknown input';
      trackUserAction(`Changed: ${label}`, {
        element: event.target.tagName,
        type: event.target.type,
        id: event.target.id
      });
    }
  });

  /**
   * Captures localStorage quota exceeded errors
   */
  const originalSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function(key, value) {
    try {
      originalSetItem.call(this, key, value);
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        addLogEntry('errors', 'LocalStorage quota exceeded', {
          key: key,
          valueSize: value.length,
          error: e.message
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
          domReady: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
          firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 'N/A'
        },
        memory: performance.memory ? {
          usedJSHeapSize: Math.round(performance.memory.usedJSHeapSize / 1048576) + ' MB',
          totalJSHeapSize: Math.round(performance.memory.totalJSHeapSize / 1048576) + ' MB',
          limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576) + ' MB'
        } : 'N/A'
      };
    }
  }

  /**
   * Generates a formatted error report
   */
  function generateReport() {
    capturePerformance();

    const report = [];
    report.push('═══════════════════════════════════════════════════════');
    report.push('     GTAW CHATLOG MAGICIAN - ERROR REPORT');
    report.push('═══════════════════════════════════════════════════════');
    report.push('');
    report.push('SESSION INFO:');
    report.push('  Session ID: ' + errorLog.sessionId);
    report.push('  Start Time: ' + errorLog.startTime);
    report.push('  Report Time: ' + timestamp());
    report.push('  User Agent: ' + errorLog.userAgent);
    report.push('  Platform: ' + errorLog.platform);
    report.push('  Screen: ' + errorLog.screenResolution);
    report.push('  Viewport: ' + errorLog.viewport);
    report.push('  Timezone: ' + errorLog.timezone);
    report.push('');

    // Performance
    if (errorLog.performance.timing) {
      report.push('PERFORMANCE:');
      report.push('  Page Load: ' + errorLog.performance.timing.loadTime + 'ms');
      report.push('  DOM Ready: ' + errorLog.performance.timing.domReady + 'ms');
      if (errorLog.performance.memory !== 'N/A') {
        report.push('  Memory Used: ' + errorLog.performance.memory.usedJSHeapSize);
        report.push('  Memory Total: ' + errorLog.performance.memory.totalJSHeapSize);
      }
      report.push('');
    }

    // Errors
    if (errorLog.errors.length > 0) {
      report.push('ERRORS (' + errorLog.errors.length + '):');
      errorLog.errors.forEach((err, i) => {
        report.push('  ' + (i + 1) + '. [' + err.timestamp + '] ' + err.message);
        if (err.details.filename) {
          report.push('     File: ' + err.details.filename + ':' + err.details.lineno + ':' + err.details.colno);
        }
        if (err.stack) {
          report.push('     Stack: ' + err.stack.split('\n')[0]);
        }
      });
      report.push('');
    } else {
      report.push('ERRORS: None ✓');
      report.push('');
    }

    // Warnings
    if (errorLog.warnings.length > 0) {
      report.push('WARNINGS (' + errorLog.warnings.length + '):');
      errorLog.warnings.slice(-10).forEach((warn, i) => {
        report.push('  ' + (i + 1) + '. [' + warn.timestamp + '] ' + warn.message);
      });
      report.push('');
    } else {
      report.push('WARNINGS: None ✓');
      report.push('');
    }

    // Recent Info
    if (errorLog.info.length > 0) {
      report.push('INFO (Last 5):');
      errorLog.info.slice(-5).forEach((info, i) => {
        report.push('  ' + (i + 1) + '. [' + info.timestamp + '] ' + info.message);
      });
      report.push('');
    }

    // Network Issues
    if (errorLog.networkIssues && errorLog.networkIssues.length > 0) {
      report.push('NETWORK ISSUES (' + errorLog.networkIssues.length + '):');
      errorLog.networkIssues.slice(-10).forEach((err, i) => {
        report.push('  ' + (i + 1) + '. [' + err.timestamp + '] ' + err.message);
        if (err.details) {
          report.push('     Status: ' + (err.details.status || 'N/A'));
          report.push('     URL: ' + (err.details.url || 'N/A'));
        }
      });
      report.push('');
    } else {
      report.push('NETWORK ISSUES: None ✓');
      report.push('');
    }

    // Resource Issues
    if (errorLog.resourceIssues && errorLog.resourceIssues.length > 0) {
      report.push('RESOURCE ISSUES (' + errorLog.resourceIssues.length + '):');
      errorLog.resourceIssues.slice(-10).forEach((err, i) => {
        report.push('  ' + (i + 1) + '. [' + err.timestamp + '] ' + err.message);
        if (err.details && err.details.src) {
          report.push('     Source: ' + err.details.src);
        }
      });
      report.push('');
    } else {
      report.push('RESOURCE ISSUES: None ✓');
      report.push('');
    }

    // User Activity (Breadcrumbs - Last 10)
    if (errorLog.userActivity && errorLog.userActivity.length > 0) {
      report.push('USER ACTIVITY (Last 10):');
      errorLog.userActivity.slice(-10).forEach((action, i) => {
        report.push('  ' + (i + 1) + '. [' + action.timestamp + '] ' + action.message);
      });
      report.push('');
    } else {
      report.push('USER ACTIVITY: None ✓');
      report.push('');
    }

    report.push('═══════════════════════════════════════════════════════');
    report.push('End of Report - Please send this to the developer');
    report.push('═══════════════════════════════════════════════════════');

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
      USE_SERVERLESS_PROXY: true,  // Default to serverless proxy (Vercel)
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
        config.RATE_LIMIT.COOLDOWN_SECONDS + 's cooldown.',
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
        .catch(err => {
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
        .catch(err => {
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
      fullReport: report
    };

    return fetch('/api/report-bug', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    }).then(response => {
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
      description: errorCount > 0 ? `**${errorCount} error(s) detected**` : 'No errors (user feedback)',
      color: errorCount > 0 ? 0xff0000 : 0xffa500, // Red if errors, orange otherwise
      fields: [
        {
          name: '📋 Session Info',
          value: `**ID:** ${errorLog.sessionId}\n**Browser:** ${errorLog.userAgent.split(' ').pop()}\n**Platform:** ${errorLog.platform}`,
          inline: false
        },
        {
          name: '⚡ Performance',
          value: errorLog.performance.timing ? 
            `Load: ${errorLog.performance.timing.loadTime}ms\nMemory: ${errorLog.performance.memory?.usedJSHeapSize || 'N/A'}` :
            'Not available',
          inline: true
        },
        {
          name: '📊 Summary',
          value: `Errors: ${errorCount}\nWarnings: ${warningCount}`,
          inline: true
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'GTAW Chatlog Magician Error Reporter'
      }
    };

    // Add errors if any
    if (errorCount > 0) {
      const errorSummary = errorLog.errors.slice(0, 3).map((err, i) => 
        `${i + 1}. ${err.message.substr(0, 100)}`
      ).join('\n');
      embed.fields.push({
        name: '❌ Recent Errors',
        value: '```\n' + errorSummary + '\n```',
        inline: false
      });
    }

    // Add full report as attachment (Discord has 2000 char limit on fields)
    const payload = {
      username: 'Bug Reporter',
      avatar_url: 'https://cdn.discordapp.com/embed/avatars/0.png',
      embeds: [embed],
      content: '**GTAW Chatlog Magician - Error Report**\n\n```\n' + report.substr(0, 1800) + '\n...\n```'
    };

    return fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    }).then(response => {
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
      if (data.lastReport && (now - data.lastReport) < config.RATE_LIMIT.COOLDOWN_SECONDS * 1000) {
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
    } catch (e) {
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
        lastReport: now
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
      navigator.clipboard.writeText(report)
        .then(() => {
          // Don't show another toast if already showing warning toast
          // Just log to console
          console.log('Error report copied to clipboard');
        })
        .catch(err => {
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
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      padding: 20px;
      border-radius: 8px;
      max-width: 800px;
      max-height: 80vh;
      overflow: auto;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    `;

    content.innerHTML = `
      <h2 style="margin-top: 0;">Error Report</h2>
      <p>Copy this report and send it to the developer:</p>
      <textarea readonly style="
        width: 100%;
        height: 400px;
        font-family: monospace;
        font-size: 12px;
        padding: 10px;
        border: 1px solid #ccc;
        border-radius: 4px;
      ">${report}</textarea>
      <div style="margin-top: 10px; text-align: right;">
        <button id="closeReportModal" style="
          padding: 10px 20px;
          background: #3498db;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        ">Close</button>
      </div>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    // Select text automatically
    content.querySelector('textarea').select();

    // Close on button click
    content.querySelector('#closeReportModal').onclick = () => {
      document.body.removeChild(modal);
    };

    // Close on background click
    modal.onclick = (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
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

  /**
   * Enhanced sendReport for automated error analyzer integration
   * Returns a promise for better async handling
   */
  function sendReportAsync(options = {}) {
    return new Promise((resolve, reject) => {
      const config = getConfig();
      
      // Check rate limiting
      if (!checkRateLimit()) {
        const message = 'Rate limit exceeded';
        if (!options.silent) {
          showToast(
            'Please wait before sending another report. Limit: ' + 
            config.RATE_LIMIT.MAX_REPORTS_PER_SESSION + 
            ' per session, ' + 
            config.RATE_LIMIT.COOLDOWN_SECONDS + 's cooldown.',
            'warning',
            4000
          );
        }
        reject(new Error(message));
        return;
      }

      const report = generateReport();

      // Show loading indicator only if not silent
      if (!options.silent) {
        showLoadingIndicator('Sending automated error report...');
      }

      // Try serverless function first (keeps webhook private)
      if (config.USE_SERVERLESS_PROXY) {
        sendViaServerless(report)
          .then(() => {
            hideLoadingIndicator();
            if (config.SHOW_SUCCESS_MESSAGE && !options.silent) {
              showToast('Error report sent successfully', 'success');
            }
            updateRateLimit();
            resolve({ success: true, method: 'serverless' });
          })
          .catch(err => {
            console.error('Serverless function failed:', err);
            hideLoadingIndicator();
            // Don't fallback to clipboard for automated reports
            reject(err);
          });
      }
      // Try Discord webhook directly (if configured and public)
      else if (config.DISCORD_WEBHOOK_URL && config.DISCORD_WEBHOOK_URL.trim() !== '') {
        sendToDiscord(report, config.DISCORD_WEBHOOK_URL)
          .then(() => {
            hideLoadingIndicator();
            if (config.SHOW_SUCCESS_MESSAGE && !options.silent) {
              showToast('Error report sent successfully', 'success');
            }
            updateRateLimit();
            resolve({ success: true, method: 'discord' });
          })
          .catch(err => {
            console.error('Discord webhook failed:', err);
            hideLoadingIndicator();
            reject(err);
          });
      }
      // No auto-send configured
      else {
        hideLoadingIndicator();
        const error = new Error('No reporting method configured');
        reject(error);
      }
    });
  }

  // Expose API globally
  window.ErrorLogger = {
    getLog: () => errorLog,
    generateReport: generateReport,
    sendReport: autoSendReport,           // Legacy: Auto-send to Discord/Email (with UI feedback)
    sendReportAsync: sendReportAsync,     // New: Promise-based for automation (optional silent mode)
    copyReport: copyReportToClipboard,    // Fallback: Manual copy
    downloadReport: downloadReport,
    clearLog: clearLog,
    logError: (msg, details) => addLogEntry('errors', msg, details),
    logWarning: (msg, details) => addLogEntry('warnings', msg, details),
    logInfo: (msg, details) => addLogEntry('info', msg, details),
    
    // New: Check if rate limiting would allow a report
    canSendReport: () => checkRateLimit(),
    
    // New: Get rate limit status
    getRateLimitStatus: () => {
      const config = getConfig();
      if (!config.RATE_LIMIT || !config.RATE_LIMIT.ENABLED) {
        return { limited: false };
      }
      
      try {
        const data = JSON.parse(localStorage.getItem(rateLimitKey) || '{}');
        const now = Date.now();
        
        return {
          limited: !checkRateLimit(),
          lastReport: data.lastReport ? new Date(data.lastReport).toISOString() : null,
          reportCount: data.reportCount || 0,
          maxReports: config.RATE_LIMIT.MAX_REPORTS_PER_SESSION,
          cooldownSeconds: config.RATE_LIMIT.COOLDOWN_SECONDS,
          cooldownRemaining: data.lastReport ? 
            Math.max(0, Math.ceil((config.RATE_LIMIT.COOLDOWN_SECONDS * 1000 - (now - data.lastReport)) / 1000)) : 
            0
        };
      } catch (e) {
        return { limited: false };
      }
    }
  };

  // Show status in console
  console.info('✓ Error Logger initialized with automated error detection support');
  console.info('  Available commands:');
  console.info('  - ErrorLogger.sendReportAsync({ silent: true }) - Send automated report');
  console.info('  - ErrorLogger.sendReport() - Manual report with UI feedback');
  console.info('  - ErrorLogger.canSendReport() - Check rate limit');
  console.info('  - ErrorLogger.downloadReport() - Download as .txt file');
  console.info('  - ErrorLogger.getLog() - View full log');
  console.info('  - ErrorLogger.clearLog() - Clear all logs');
  console.info('  Note: Automated error detection is active via ErrorAnalyzer');

})();

