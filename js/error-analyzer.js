/**
 * Automated Error Analyzer and Detection System
 * Automatically detects and reports technical errors without user intervention
 * 
 * Features:
 * - Severity-based error classification
 * - Pattern detection for recurring issues
 * - Performance degradation monitoring
 * - Automatic threshold-based reporting
 * - Rate limiting to prevent spam
 */
(function() {
  'use strict';

  // Severity levels for error classification
  const SEVERITY = {
    CRITICAL: 'critical',     // Immediate report (app crash, data loss)
    HIGH: 'high',            // Report after threshold (broken features)
    MEDIUM: 'medium',        // Report if recurring (degraded UX)
    LOW: 'low',              // Track only (cosmetic issues)
    IGNORE: 'ignore'         // Don't track or report
  };

  // Configuration for automated detection
  const CONFIG = {
    // Automatic reporting thresholds
    CRITICAL_ERROR_THRESHOLD: 1,          // Report immediately on first critical error
    HIGH_ERROR_THRESHOLD: 2,              // Report after 2 high-severity errors
    MEDIUM_ERROR_THRESHOLD: 5,            // Report after 5 medium-severity errors
    ERROR_RATE_THRESHOLD: 3,              // Errors per minute to trigger report
    
    // Time windows for pattern detection (milliseconds)
    ERROR_RATE_WINDOW: 60000,             // 1 minute
    PATTERN_DETECTION_WINDOW: 300000,     // 5 minutes
    
    // Performance monitoring thresholds
    MEMORY_LEAK_THRESHOLD: 50,            // MB increase in 5 minutes
    SLOW_OPERATION_THRESHOLD: 3000,       // 3 seconds
    DOM_SIZE_THRESHOLD: 5000,             // Number of DOM nodes
    
    // Rate limiting for auto-reports
    AUTO_REPORT_COOLDOWN: 600000,         // 10 minutes between auto-reports
    MAX_AUTO_REPORTS_PER_SESSION: 3,      // Maximum auto-reports per session
    
    // Detection features toggles
    ENABLE_AUTO_REPORTING: true,
    ENABLE_PERFORMANCE_MONITORING: true,
    ENABLE_PATTERN_DETECTION: true,
    ENABLE_CONSOLE_MONITORING: true,
    
    // Reporting preferences
    REPORT_ONLY_CRITICAL: false,          // If true, only auto-report critical errors
    SILENT_MODE: false                    // If true, don't show notifications to user
  };

  // State tracking
  const state = {
    errors: [],
    patterns: new Map(),
    lastMemoryCheck: null,
    lastAutoReport: null,
    autoReportCount: 0,
    performanceBaseline: null,
    criticalErrorDetected: false
  };

  /**
   * Error severity classifier
   * Analyzes error to determine its severity level
   */
  function classifyError(error) {
    const errorText = (error.message || error.toString()).toLowerCase();
    const stack = error.stack || '';
    
    // CRITICAL: App-breaking errors
    if (
      errorText.includes('script error') ||
      errorText.includes('undefined is not a function') ||
      errorText.includes('cannot read property') ||
      errorText.includes('typeerror') ||
      errorText.includes('referenceerror') ||
      errorText.includes('syntax error') ||
      errorText.includes('out of memory') ||
      errorText.includes('maximum call stack')
    ) {
      return SEVERITY.CRITICAL;
    }
    
    // HIGH: Feature-breaking errors
    if (
      errorText.includes('failed to fetch') ||
      errorText.includes('network error') ||
      errorText.includes('404') ||
      errorText.includes('500') ||
      errorText.includes('timeout') ||
      errorText.includes('quotaexceedederror') ||
      errorText.includes('localstorage') ||
      errorText.includes('failed to execute')
    ) {
      return SEVERITY.HIGH;
    }
    
    // MEDIUM: UX-degrading issues
    if (
      errorText.includes('warning') ||
      errorText.includes('deprecated') ||
      errorText.includes('failed to load') ||
      errorText.includes('cors') ||
      errorText.includes('invalid') ||
      errorText.includes('unexpected')
    ) {
      return SEVERITY.MEDIUM;
    }
    
    // IGNORE: Known cosmetic/ignorable errors
    if (
      errorText.includes('font awesome') ||
      errorText.includes('webfonts') ||
      errorText.includes('source map') ||
      errorText.includes('clipboard api') ||
      errorText.includes('resizeobserver') ||
      errorText.includes('cross-origin') && errorText.includes('cssrules')
    ) {
      return SEVERITY.IGNORE;
    }
    
    // Default: LOW severity
    return SEVERITY.LOW;
  }

  /**
   * Records an error with metadata for analysis
   */
  function recordError(error, context = {}) {
    const severity = classifyError(error);
    
    // Don't track ignored errors
    if (severity === SEVERITY.IGNORE) {
      return null;
    }
    
    const errorRecord = {
      timestamp: Date.now(),
      severity: severity,
      message: error.message || error.toString(),
      stack: error.stack,
      type: error.name || 'Error',
      context: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        memory: getMemoryInfo(),
        ...context
      }
    };
    
    state.errors.push(errorRecord);
    
    // Keep only recent errors (last hour)
    const oneHourAgo = Date.now() - 3600000;
    state.errors = state.errors.filter(e => e.timestamp > oneHourAgo);
    
    return errorRecord;
  }

  /**
   * Detects error patterns and recurring issues
   */
  function detectPatterns() {
    if (!CONFIG.ENABLE_PATTERN_DETECTION) return null;
    
    const recentErrors = state.errors.filter(e => 
      e.timestamp > Date.now() - CONFIG.PATTERN_DETECTION_WINDOW
    );
    
    // Group errors by message
    const errorGroups = new Map();
    recentErrors.forEach(error => {
      const key = error.message.substring(0, 100); // First 100 chars
      if (!errorGroups.has(key)) {
        errorGroups.set(key, []);
      }
      errorGroups.get(key).push(error);
    });
    
    // Find patterns (3+ occurrences of same error)
    const patterns = [];
    errorGroups.forEach((errors, message) => {
      if (errors.length >= 3) {
        patterns.push({
          message: message,
          count: errors.length,
          severity: errors[0].severity,
          firstSeen: errors[0].timestamp,
          lastSeen: errors[errors.length - 1].timestamp
        });
      }
    });
    
    return patterns.length > 0 ? patterns : null;
  }

  /**
   * Calculates current error rate (errors per minute)
   */
  function calculateErrorRate() {
    const recentErrors = state.errors.filter(e => 
      e.timestamp > Date.now() - CONFIG.ERROR_RATE_WINDOW
    );
    
    // Exclude LOW and IGNORE severity
    const significantErrors = recentErrors.filter(e => 
      e.severity !== SEVERITY.LOW && e.severity !== SEVERITY.IGNORE
    );
    
    return significantErrors.length;
  }

  /**
   * Gets memory information if available
   */
  function getMemoryInfo() {
    if (window.performance && window.performance.memory) {
      return {
        usedJSHeapSize: Math.round(window.performance.memory.usedJSHeapSize / 1048576), // MB
        totalJSHeapSize: Math.round(window.performance.memory.totalJSHeapSize / 1048576),
        limit: Math.round(window.performance.memory.jsHeapSizeLimit / 1048576)
      };
    }
    return null;
  }

  /**
   * Detects memory leaks by tracking heap growth
   */
  function detectMemoryLeak() {
    if (!CONFIG.ENABLE_PERFORMANCE_MONITORING) return null;
    
    const currentMemory = getMemoryInfo();
    if (!currentMemory) return null;
    
    if (!state.lastMemoryCheck) {
      state.lastMemoryCheck = {
        timestamp: Date.now(),
        memory: currentMemory
      };
      return null;
    }
    
    // Check if 5 minutes have passed
    const timeDiff = Date.now() - state.lastMemoryCheck.timestamp;
    if (timeDiff < CONFIG.PATTERN_DETECTION_WINDOW) {
      return null;
    }
    
    const memoryGrowth = currentMemory.usedJSHeapSize - state.lastMemoryCheck.memory.usedJSHeapSize;
    
    // Update last check
    state.lastMemoryCheck = {
      timestamp: Date.now(),
      memory: currentMemory
    };
    
    // Detect leak if memory grew significantly
    if (memoryGrowth > CONFIG.MEMORY_LEAK_THRESHOLD) {
      return {
        type: 'memory_leak',
        growth: memoryGrowth,
        current: currentMemory.usedJSHeapSize,
        previous: state.lastMemoryCheck.memory.usedJSHeapSize
      };
    }
    
    return null;
  }

  /**
   * Detects performance degradation
   */
  function detectPerformanceDegradation() {
    if (!CONFIG.ENABLE_PERFORMANCE_MONITORING) return null;
    
    const issues = [];
    
    // Check DOM size
    const domNodeCount = document.getElementsByTagName('*').length;
    if (domNodeCount > CONFIG.DOM_SIZE_THRESHOLD) {
      issues.push({
        type: 'large_dom',
        nodeCount: domNodeCount,
        threshold: CONFIG.DOM_SIZE_THRESHOLD
      });
    }
    
    // Check for slow operations (using Performance Observer if available)
    if (window.performance && window.performance.getEntriesByType) {
      const measures = window.performance.getEntriesByType('measure');
      const slowMeasures = measures.filter(m => m.duration > CONFIG.SLOW_OPERATION_THRESHOLD);
      
      if (slowMeasures.length > 0) {
        issues.push({
          type: 'slow_operations',
          count: slowMeasures.length,
          slowest: slowMeasures.sort((a, b) => b.duration - a.duration)[0]
        });
      }
    }
    
    return issues.length > 0 ? issues : null;
  }

  /**
   * Determines if an automatic report should be sent
   */
  function shouldAutoReport(errorRecord) {
    if (!CONFIG.ENABLE_AUTO_REPORTING) return false;
    
    // Check rate limiting
    if (state.autoReportCount >= CONFIG.MAX_AUTO_REPORTS_PER_SESSION) {
      console.log('[Error Analyzer] Max auto-reports reached for this session');
      return false;
    }
    
    if (state.lastAutoReport && 
        Date.now() - state.lastAutoReport < CONFIG.AUTO_REPORT_COOLDOWN) {
      console.log('[Error Analyzer] Auto-report cooldown active');
      return false;
    }
    
    // CRITICAL errors: always report immediately
    if (errorRecord && errorRecord.severity === SEVERITY.CRITICAL) {
      console.log('[Error Analyzer] Critical error detected - triggering auto-report');
      state.criticalErrorDetected = true;
      return true;
    }
    
    // If REPORT_ONLY_CRITICAL is enabled, skip other checks
    if (CONFIG.REPORT_ONLY_CRITICAL) {
      return false;
    }
    
    // HIGH severity: check threshold
    const highErrors = state.errors.filter(e => e.severity === SEVERITY.HIGH);
    if (highErrors.length >= CONFIG.HIGH_ERROR_THRESHOLD) {
      console.log(`[Error Analyzer] ${highErrors.length} high-severity errors detected - triggering auto-report`);
      return true;
    }
    
    // MEDIUM severity: check threshold
    const mediumErrors = state.errors.filter(e => e.severity === SEVERITY.MEDIUM);
    if (mediumErrors.length >= CONFIG.MEDIUM_ERROR_THRESHOLD) {
      console.log(`[Error Analyzer] ${mediumErrors.length} medium-severity errors detected - triggering auto-report`);
      return true;
    }
    
    // Check error rate
    const errorRate = calculateErrorRate();
    if (errorRate >= CONFIG.ERROR_RATE_THRESHOLD) {
      console.log(`[Error Analyzer] High error rate detected (${errorRate}/min) - triggering auto-report`);
      return true;
    }
    
    // Check for patterns
    const patterns = detectPatterns();
    if (patterns && patterns.length > 0) {
      console.log(`[Error Analyzer] Error pattern detected - triggering auto-report`);
      return true;
    }
    
    return false;
  }

  /**
   * Generates an automated technical report
   */
  function generateTechnicalReport() {
    const report = {
      type: 'automated_technical_report',
      timestamp: new Date().toISOString(),
      sessionId: state.sessionId || 'unknown',
      trigger: state.criticalErrorDetected ? 'critical_error' : 'threshold_exceeded',
      
      summary: {
        totalErrors: state.errors.length,
        criticalErrors: state.errors.filter(e => e.severity === SEVERITY.CRITICAL).length,
        highErrors: state.errors.filter(e => e.severity === SEVERITY.HIGH).length,
        mediumErrors: state.errors.filter(e => e.severity === SEVERITY.MEDIUM).length,
        errorRate: calculateErrorRate()
      },
      
      recentErrors: state.errors.slice(-10).map(e => ({
        timestamp: new Date(e.timestamp).toISOString(),
        severity: e.severity,
        message: e.message,
        type: e.type,
        stack: e.stack ? e.stack.split('\n').slice(0, 3).join('\n') : null
      })),
      
      patterns: detectPatterns(),
      
      performance: {
        memory: getMemoryInfo(),
        memoryLeak: detectMemoryLeak(),
        degradation: detectPerformanceDegradation(),
        domNodeCount: document.getElementsByTagName('*').length
      },
      
      environment: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        screen: `${window.screen.width}x${window.screen.height}`,
        online: navigator.onLine,
        cookiesEnabled: navigator.cookieEnabled
      }
    };
    
    return report;
  }

  /**
   * Sends automated report
   */
  async function sendAutomatedReport() {
    try {
      const report = generateTechnicalReport();
      
      // Use ErrorLogger if available
      if (window.ErrorLogger) {
        // Attach our technical analysis to the ErrorLogger
        if (window.ErrorLogger.logInfo) {
          window.ErrorLogger.logInfo('Automated Error Analysis', report);
        }
        
        // Check if we can send (rate limiting)
        if (window.ErrorLogger.canSendReport && !window.ErrorLogger.canSendReport()) {
          console.warn('[Error Analyzer] Rate limit prevents sending automated report');
          
          // Log rate limit status
          if (window.ErrorLogger.getRateLimitStatus) {
            const rateLimitStatus = window.ErrorLogger.getRateLimitStatus();
            console.log('[Error Analyzer] Rate limit status:', rateLimitStatus);
          }
          
          return false;
        }
        
        // Send the report using new async method (silent mode)
        if (typeof window.ErrorLogger.sendReportAsync === 'function') {
          const result = await window.ErrorLogger.sendReportAsync({ 
            silent: CONFIG.SILENT_MODE 
          });
          
          // Update state
          state.lastAutoReport = Date.now();
          state.autoReportCount++;
          
          // Show subtle notification if not in silent mode
          if (!CONFIG.SILENT_MODE) {
            console.log('[Error Analyzer] Automated technical report sent successfully via', result.method);
            showNotification('Technical issue detected and reported automatically', 'info');
          } else {
            console.log('[Error Analyzer] Automated report sent silently');
          }
          
          return true;
        } 
        // Fallback to old method if new one not available
        else if (typeof window.ErrorLogger.sendReport === 'function') {
          await window.ErrorLogger.sendReport();
          
          state.lastAutoReport = Date.now();
          state.autoReportCount++;
          
          if (!CONFIG.SILENT_MODE) {
            showNotification('Technical issue detected and reported automatically', 'info');
          }
          
          return true;
        } else {
          console.warn('[Error Analyzer] No sendReport method available');
          return false;
        }
      } else {
        console.warn('[Error Analyzer] ErrorLogger not available, cannot send report');
        return false;
      }
    } catch (error) {
      console.error('[Error Analyzer] Failed to send automated report:', error);
      
      // If it's a rate limit error, don't show as failure
      if (error.message && error.message.includes('Rate limit')) {
        console.log('[Error Analyzer] Skipping report due to rate limiting');
        return false;
      }
      
      return false;
    }
  }

  /**
   * Shows a subtle notification to user
   */
  function showNotification(message, type = 'info') {
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = 'error-analyzer-toast';
    
    const bgColor = type === 'info' ? '#3498db' : type === 'warning' ? '#f39c12' : '#e74c3c';
    const icon = type === 'info' ? 'ℹ' : type === 'warning' ? '⚠' : '✗';
    
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: ${bgColor};
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      z-index: 100000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      animation: slideInUp 0.3s ease-out;
      display: flex;
      align-items: center;
      gap: 8px;
      max-width: 350px;
      opacity: 0.95;
    `;
    
    toast.innerHTML = `<span style="font-size: 18px;">${icon}</span><span>${message}</span>`;
    document.body.appendChild(toast);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
      toast.style.animation = 'slideOutDown 0.3s ease-out';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  /**
   * Main error handler that integrates with global error handlers
   */
  function handleError(error, context = {}) {
    // Record the error
    const errorRecord = recordError(error, context);
    
    if (!errorRecord) {
      return; // Error was ignored
    }
    
    console.log(`[Error Analyzer] Recorded ${errorRecord.severity} error:`, errorRecord.message);
    
    // Check if we should auto-report
    if (shouldAutoReport(errorRecord)) {
      sendAutomatedReport();
    }
  }

  /**
   * Monitors performance periodically
   */
  function startPerformanceMonitoring() {
    if (!CONFIG.ENABLE_PERFORMANCE_MONITORING) return;
    
    // Check every 5 minutes
    setInterval(() => {
      const memoryLeak = detectMemoryLeak();
      if (memoryLeak) {
        console.warn('[Error Analyzer] Memory leak detected:', memoryLeak);
        handleError(new Error('Memory leak detected: ' + memoryLeak.growth + 'MB increase'), {
          type: 'performance',
          details: memoryLeak
        });
      }
      
      const degradation = detectPerformanceDegradation();
      if (degradation) {
        console.warn('[Error Analyzer] Performance degradation detected:', degradation);
        handleError(new Error('Performance degradation detected'), {
          type: 'performance',
          details: degradation
        });
      }
    }, CONFIG.PATTERN_DETECTION_WINDOW);
  }

  /**
   * Initialize the error analyzer
   */
  function initialize() {
    // Generate session ID
    state.sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    
    // Hook into global error handlers
    const originalErrorHandler = window.onerror;
    window.onerror = function(message, source, lineno, colno, error) {
      if (error) {
        handleError(error, { source, lineno, colno });
      }
      
      // Call original handler
      if (originalErrorHandler) {
        return originalErrorHandler.apply(this, arguments);
      }
      return false;
    };
    
    // Hook into unhandled promise rejections
    const originalRejectionHandler = window.onunhandledrejection;
    window.onunhandledrejection = function(event) {
      handleError(event.reason || new Error('Unhandled promise rejection'), {
        type: 'promise_rejection'
      });
      
      // Call original handler
      if (originalRejectionHandler) {
        return originalRejectionHandler.apply(this, arguments);
      }
      return false;
    };
    
    // Monitor console.error if enabled
    if (CONFIG.ENABLE_CONSOLE_MONITORING) {
      const originalConsoleError = console.error;
      console.error = function(...args) {
        const errorMessage = args.join(' ');
        handleError(new Error(errorMessage), {
          type: 'console_error',
          source: 'console.error'
        });
        return originalConsoleError.apply(console, args);
      };
    }
    
    // Start performance monitoring
    startPerformanceMonitoring();
    
    console.log('[Error Analyzer] Automated error detection initialized');
    console.log('[Error Analyzer] Configuration:', {
      autoReporting: CONFIG.ENABLE_AUTO_REPORTING,
      performanceMonitoring: CONFIG.ENABLE_PERFORMANCE_MONITORING,
      patternDetection: CONFIG.ENABLE_PATTERN_DETECTION,
      reportOnlyCritical: CONFIG.REPORT_ONLY_CRITICAL,
      silentMode: CONFIG.SILENT_MODE
    });
  }

  // Expose API
  window.ErrorAnalyzer = {
    // Read-only state access
    getState: () => ({
      errorCount: state.errors.length,
      autoReportCount: state.autoReportCount,
      criticalErrorDetected: state.criticalErrorDetected,
      lastAutoReport: state.lastAutoReport
    }),
    
    // Configuration
    configure: (newConfig) => {
      Object.assign(CONFIG, newConfig);
      console.log('[Error Analyzer] Configuration updated:', CONFIG);
    },
    
    // Manual analysis
    analyzeNow: () => {
      const report = generateTechnicalReport();
      console.log('[Error Analyzer] Current analysis:', report);
      return report;
    },
    
    // Manual reporting
    forceReport: () => {
      console.log('[Error Analyzer] Forcing manual report...');
      return sendAutomatedReport();
    },
    
    // Clear state
    reset: () => {
      state.errors = [];
      state.patterns.clear();
      state.criticalErrorDetected = false;
      console.log('[Error Analyzer] State reset');
    }
  };

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

  // Add CSS animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideInUp {
      from { transform: translateY(100%); opacity: 0; }
      to { transform: translateY(0); opacity: 0.95; }
    }
    @keyframes slideOutDown {
      from { transform: translateY(0); opacity: 0.95; }
      to { transform: translateY(100%); opacity: 0; }
    }
  `;
  document.head.appendChild(style);

})();
