/**
 * Automatic Error Detection and Analysis System
 * 
 * This module automatically detects, analyzes, and reports technical errors
 * without requiring user interaction. It monitors for:
 * - JavaScript errors and exceptions
 * - Performance degradation
 * - Memory leaks
 * - Network issues
 * - DOM errors
 * - Console errors
 * 
 * Errors are classified by severity and automatically reported when thresholds are met.
 */

(function() {
  'use strict';

  // Error detection configuration
  const CONFIG = {
    // Auto-detection settings
    AUTO_DETECT_ENABLED: true,
    AUTO_REPORT_ENABLED: true,
    SILENT_MODE: true, // Don't show alerts/modals for technical errors
    
    // Error thresholds for automatic reporting
    THRESHOLDS: {
      CRITICAL_ERROR_COUNT: 3,        // Report after 3 critical errors
      ERROR_COUNT: 10,                 // Report after 10 regular errors
      WARNING_COUNT: 20,               // Report after 20 warnings
      MEMORY_USAGE_MB: 200,            // Report if memory exceeds 200MB
      MEMORY_GROWTH_RATE: 50,          // Report if memory grows by 50MB in 5 minutes
      PAGE_LOAD_TIME_MS: 5000,         // Report if page load > 5 seconds
      API_ERROR_RATE: 0.5,             // Report if > 50% API calls fail
      DOM_UPDATE_TIME_MS: 100,         // Report if DOM updates take > 100ms
      FPS_DROP_THRESHOLD: 30,          // Report if FPS drops below 30
      NETWORK_TIMEOUT_COUNT: 5,        // Report after 5 timeouts
      RESOURCE_FAILURE_COUNT: 10       // Report after 10 resource failures
    },
    
    // Monitoring intervals
    INTERVALS: {
      MEMORY_CHECK: 30000,             // Check memory every 30 seconds
      PERFORMANCE_CHECK: 60000,         // Check performance every minute
      ERROR_ANALYSIS: 15000,            // Analyze errors every 15 seconds
      HEALTH_CHECK: 120000             // Overall health check every 2 minutes
    },
    
    // Auto-report cooldown to prevent spam
    REPORT_COOLDOWN_MS: 300000,       // 5 minutes between auto-reports
    
    // Error classification
    ERROR_SEVERITY: {
      CRITICAL: 'critical',
      HIGH: 'high',
      MEDIUM: 'medium',
      LOW: 'low',
      INFO: 'info'
    }
  };

  // Error detection state
  const detectorState = {
    sessionId: generateSessionId(),
    startTime: Date.now(),
    isMonitoring: false,
    lastReportTime: 0,
    lastMemorySnapshot: null,
    errorCounts: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      total: 0
    },
    performanceMetrics: {
      fps: [],
      memoryUsage: [],
      apiLatency: [],
      domUpdateTime: []
    },
    detectedIssues: [],
    networkStats: {
      totalRequests: 0,
      failedRequests: 0,
      timeouts: 0,
      avgLatency: 0
    },
    resourceStats: {
      totalResources: 0,
      failedResources: 0,
      slowResources: 0
    },
    intervals: {},
    observers: {
      performance: null,
      mutation: null
    }
  };

  /**
   * Generates a unique session ID
   */
  function generateSessionId() {
    return 'auto-' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Classifies error severity based on type and context
   */
  function classifyErrorSeverity(error) {
    const message = (error.message || '').toLowerCase();
    const stack = (error.stack || '').toLowerCase();
    
    // Critical errors - App breaking
    if (
      message.includes('cannot read prop') ||
      message.includes('cannot access') ||
      message.includes('undefined is not') ||
      message.includes('null is not') ||
      stack.includes('at render') ||
      stack.includes('at mount') ||
      error.name === 'ReferenceError' ||
      error.name === 'TypeError' && message.includes('function')
    ) {
      return CONFIG.ERROR_SEVERITY.CRITICAL;
    }
    
    // High severity - Functionality impaired
    if (
      message.includes('failed to fetch') ||
      message.includes('network error') ||
      message.includes('timeout') ||
      message.includes('cors') ||
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      error.name === 'NetworkError' ||
      error.name === 'SecurityError'
    ) {
      return CONFIG.ERROR_SEVERITY.HIGH;
    }
    
    // Medium severity - User experience affected
    if (
      message.includes('failed to load') ||
      message.includes('resource') ||
      message.includes('image') ||
      message.includes('style') ||
      message.includes('script') ||
      message.includes('quota') ||
      message.includes('storage') ||
      error.name === 'QuotaExceededError'
    ) {
      return CONFIG.ERROR_SEVERITY.MEDIUM;
    }
    
    // Low severity - Minor issues
    if (
      message.includes('warning') ||
      message.includes('deprecated') ||
      message.includes('experimental') ||
      stack.includes('polyfill')
    ) {
      return CONFIG.ERROR_SEVERITY.LOW;
    }
    
    return CONFIG.ERROR_SEVERITY.INFO;
  }

  /**
   * Analyzes error patterns for root cause
   */
  function analyzeErrorPattern(error, context = {}) {
    const analysis = {
      severity: classifyErrorSeverity(error),
      timestamp: Date.now(),
      category: 'unknown',
      impact: 'unknown',
      suggestion: null,
      fingerprint: null,
      context: context
    };
    
    const message = (error.message || '').toLowerCase();
    const stack = (error.stack || '').toLowerCase();
    
    // Categorize the error
    if (message.includes('network') || message.includes('fetch') || message.includes('xhr')) {
      analysis.category = 'network';
      analysis.impact = 'API communication affected';
      analysis.suggestion = 'Check network connectivity and API endpoints';
    } else if (message.includes('memory') || message.includes('heap') || message.includes('quota')) {
      analysis.category = 'memory';
      analysis.impact = 'Application performance degraded';
      analysis.suggestion = 'Memory leak detected - check for unreleased resources';
    } else if (stack.includes('react') || stack.includes('vue') || stack.includes('angular')) {
      analysis.category = 'framework';
      analysis.impact = 'UI rendering affected';
      analysis.suggestion = 'Check component lifecycle and state management';
    } else if (message.includes('permission') || message.includes('security') || message.includes('cors')) {
      analysis.category = 'security';
      analysis.impact = 'Feature access restricted';
      analysis.suggestion = 'Review security policies and permissions';
    } else if (message.includes('undefined') || message.includes('null') || message.includes('cannot read')) {
      analysis.category = 'null-reference';
      analysis.impact = 'Code execution halted';
      analysis.suggestion = 'Add null checks and error boundaries';
    } else if (message.includes('dom') || message.includes('element') || message.includes('node')) {
      analysis.category = 'dom';
      analysis.impact = 'UI interaction affected';
      analysis.suggestion = 'Verify DOM element exists before manipulation';
    } else if (message.includes('syntax') || message.includes('parse')) {
      analysis.category = 'syntax';
      analysis.impact = 'Code parsing failed';
      analysis.suggestion = 'Check for syntax errors in recent changes';
    }
    
    // Generate fingerprint for deduplication
    analysis.fingerprint = generateErrorFingerprint(error, analysis.category);
    
    return analysis;
  }

  /**
   * Generates a fingerprint for error deduplication
   */
  function generateErrorFingerprint(error, category) {
    const key = [
      category,
      error.name || 'Error',
      (error.message || '').replace(/[0-9]/g, 'N').substring(0, 50),
      error.filename || 'unknown',
      error.lineno || 0
    ].join('|');
    
    return btoa(key).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
  }

  /**
   * Monitors performance metrics
   */
  function monitorPerformance() {
    if (!window.performance) return;
    
    try {
      // Monitor FPS
      let lastTime = performance.now();
      let frames = 0;
      
      function measureFPS() {
        frames++;
        const currentTime = performance.now();
        if (currentTime >= lastTime + 1000) {
          const fps = Math.round(frames * 1000 / (currentTime - lastTime));
          detectorState.performanceMetrics.fps.push(fps);
          
          // Keep only last 10 measurements
          if (detectorState.performanceMetrics.fps.length > 10) {
            detectorState.performanceMetrics.fps.shift();
          }
          
          // Check for FPS drops
          if (fps < CONFIG.THRESHOLDS.FPS_DROP_THRESHOLD) {
            recordIssue({
              type: 'performance',
              severity: CONFIG.ERROR_SEVERITY.MEDIUM,
              message: `Low FPS detected: ${fps} FPS`,
              details: { fps, threshold: CONFIG.THRESHOLDS.FPS_DROP_THRESHOLD }
            });
          }
          
          frames = 0;
          lastTime = currentTime;
        }
        
        if (detectorState.isMonitoring) {
          requestAnimationFrame(measureFPS);
        }
      }
      
      requestAnimationFrame(measureFPS);
      
      // Monitor long tasks
      if ('PerformanceObserver' in window) {
        try {
          const perfObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.duration > 50) { // Long task threshold
                recordIssue({
                  type: 'performance',
                  severity: CONFIG.ERROR_SEVERITY.LOW,
                  message: `Long task detected: ${Math.round(entry.duration)}ms`,
                  details: {
                    duration: entry.duration,
                    name: entry.name,
                    startTime: entry.startTime
                  }
                });
              }
            }
          });
          
          perfObserver.observe({ entryTypes: ['longtask'] });
          detectorState.observers.performance = perfObserver;
        } catch (e) {
          console.warn('PerformanceObserver not supported:', e);
        }
      }
    } catch (error) {
      console.error('Performance monitoring error:', error);
    }
  }

  /**
   * Monitors memory usage
   */
  function monitorMemory() {
    if (!performance.memory) return;
    
    const currentMemory = {
      used: performance.memory.usedJSHeapSize,
      total: performance.memory.totalJSHeapSize,
      limit: performance.memory.jsHeapSizeLimit,
      timestamp: Date.now()
    };
    
    const usedMB = Math.round(currentMemory.used / 1048576);
    detectorState.performanceMetrics.memoryUsage.push(usedMB);
    
    // Keep only last 10 measurements
    if (detectorState.performanceMetrics.memoryUsage.length > 10) {
      detectorState.performanceMetrics.memoryUsage.shift();
    }
    
    // Check for high memory usage
    if (usedMB > CONFIG.THRESHOLDS.MEMORY_USAGE_MB) {
      recordIssue({
        type: 'memory',
        severity: CONFIG.ERROR_SEVERITY.HIGH,
        message: `High memory usage: ${usedMB} MB`,
        details: {
          usedMB,
          threshold: CONFIG.THRESHOLDS.MEMORY_USAGE_MB,
          percentage: Math.round(currentMemory.used / currentMemory.limit * 100)
        }
      });
    }
    
    // Check for memory growth (potential leak)
    if (detectorState.lastMemorySnapshot) {
      const growthMB = Math.round((currentMemory.used - detectorState.lastMemorySnapshot.used) / 1048576);
      const timeDiffMinutes = (currentMemory.timestamp - detectorState.lastMemorySnapshot.timestamp) / 60000;
      
      if (timeDiffMinutes >= 5 && growthMB > CONFIG.THRESHOLDS.MEMORY_GROWTH_RATE) {
        recordIssue({
          type: 'memory',
          severity: CONFIG.ERROR_SEVERITY.CRITICAL,
          message: `Memory leak detected: ${growthMB} MB growth in ${Math.round(timeDiffMinutes)} minutes`,
          details: {
            growthMB,
            timeDiffMinutes,
            currentUsage: usedMB
          }
        });
      }
    }
    
    // Update snapshot every 5 minutes
    if (!detectorState.lastMemorySnapshot || 
        currentMemory.timestamp - detectorState.lastMemorySnapshot.timestamp > 300000) {
      detectorState.lastMemorySnapshot = currentMemory;
    }
  }

  /**
   * Monitors DOM mutations for performance issues
   */
  function monitorDOMMutations() {
    if (!window.MutationObserver) return;
    
    let mutationCount = 0;
    let lastResetTime = Date.now();
    
    const observer = new MutationObserver((mutations) => {
      mutationCount += mutations.length;
      
      // Check mutation rate every second
      const now = Date.now();
      if (now - lastResetTime >= 1000) {
        if (mutationCount > 100) {
          recordIssue({
            type: 'dom',
            severity: CONFIG.ERROR_SEVERITY.MEDIUM,
            message: `High DOM mutation rate: ${mutationCount} mutations/second`,
            details: {
              mutationCount,
              timeWindow: now - lastResetTime
            }
          });
        }
        
        mutationCount = 0;
        lastResetTime = now;
      }
      
      // Check for specific problematic patterns
      mutations.forEach(mutation => {
        // Detect potential infinite loops
        if (mutation.type === 'childList' && mutation.addedNodes.length > 50) {
          recordIssue({
            type: 'dom',
            severity: CONFIG.ERROR_SEVERITY.HIGH,
            message: 'Large DOM insertion detected',
            details: {
              nodeCount: mutation.addedNodes.length,
              target: mutation.target.tagName
            }
          });
        }
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeOldValue: false,
      characterData: false
    });
    
    detectorState.observers.mutation = observer;
  }

  /**
   * Intercepts and monitors network requests
   */
  function monitorNetwork() {
    // Monitor fetch requests
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      const startTime = performance.now();
      const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || 'unknown';
      
      detectorState.networkStats.totalRequests++;
      
      return originalFetch.apply(this, args)
        .then(response => {
          const duration = performance.now() - startTime;
          detectorState.performanceMetrics.apiLatency.push(duration);
          
          // Keep only last 20 measurements
          if (detectorState.performanceMetrics.apiLatency.length > 20) {
            detectorState.performanceMetrics.apiLatency.shift();
          }
          
          if (!response.ok) {
            detectorState.networkStats.failedRequests++;
            recordIssue({
              type: 'network',
              severity: response.status >= 500 ? CONFIG.ERROR_SEVERITY.HIGH : CONFIG.ERROR_SEVERITY.MEDIUM,
              message: `API error: ${response.status} ${response.statusText}`,
              details: {
                url,
                status: response.status,
                duration,
                method: args[1]?.method || 'GET'
              }
            });
          }
          
          // Check for slow requests
          if (duration > 3000) {
            recordIssue({
              type: 'performance',
              severity: CONFIG.ERROR_SEVERITY.LOW,
              message: `Slow API request: ${Math.round(duration)}ms`,
              details: {
                url,
                duration,
                threshold: 3000
              }
            });
          }
          
          return response;
        })
        .catch(error => {
          detectorState.networkStats.failedRequests++;
          if (error.name === 'AbortError') {
            detectorState.networkStats.timeouts++;
          }
          
          recordIssue({
            type: 'network',
            severity: CONFIG.ERROR_SEVERITY.HIGH,
            message: `Network request failed: ${error.message}`,
            details: {
              url,
              error: error.message,
              duration: performance.now() - startTime
            }
          });
          
          throw error;
        });
    };
    
    // Monitor XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;
    
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
      this._startTime = performance.now();
      this._url = url;
      this._method = method;
      return originalXHROpen.apply(this, [method, url, ...args]);
    };
    
    XMLHttpRequest.prototype.send = function(...args) {
      const xhr = this;
      detectorState.networkStats.totalRequests++;
      
      this.addEventListener('load', function() {
        const duration = performance.now() - xhr._startTime;
        if (this.status >= 400) {
          detectorState.networkStats.failedRequests++;
        }
      });
      
      this.addEventListener('error', function() {
        detectorState.networkStats.failedRequests++;
      });
      
      this.addEventListener('timeout', function() {
        detectorState.networkStats.timeouts++;
      });
      
      return originalXHRSend.apply(this, args);
    };
  }

  /**
   * Records detected issues
   */
  function recordIssue(issue) {
    issue.timestamp = Date.now();
    issue.sessionId = detectorState.sessionId;
    issue.fingerprint = generateIssueFingerprint(issue);
    
    // Check for duplicates (within last 100 issues)
    const recentIssues = detectorState.detectedIssues.slice(-100);
    const isDuplicate = recentIssues.some(i => 
      i.fingerprint === issue.fingerprint && 
      (issue.timestamp - i.timestamp) < 60000 // Within 1 minute
    );
    
    if (!isDuplicate) {
      detectorState.detectedIssues.push(issue);
      
      // Update error counts
      if (issue.severity === CONFIG.ERROR_SEVERITY.CRITICAL) {
        detectorState.errorCounts.critical++;
      } else if (issue.severity === CONFIG.ERROR_SEVERITY.HIGH) {
        detectorState.errorCounts.high++;
      } else if (issue.severity === CONFIG.ERROR_SEVERITY.MEDIUM) {
        detectorState.errorCounts.medium++;
      } else if (issue.severity === CONFIG.ERROR_SEVERITY.LOW) {
        detectorState.errorCounts.low++;
      }
      detectorState.errorCounts.total++;
      
      // Log to existing error logger if available
      if (window.ErrorLogger) {
        const logMethod = issue.severity === CONFIG.ERROR_SEVERITY.CRITICAL ? 'logError' :
                         issue.severity === CONFIG.ERROR_SEVERITY.HIGH ? 'logError' :
                         issue.severity === CONFIG.ERROR_SEVERITY.MEDIUM ? 'logWarning' : 'logInfo';
        window.ErrorLogger[logMethod](issue.message, issue.details);
      }
    }
  }

  /**
   * Generates fingerprint for issue deduplication
   */
  function generateIssueFingerprint(issue) {
    return btoa([
      issue.type,
      issue.severity,
      issue.message.replace(/[0-9]/g, 'N').substring(0, 30)
    ].join('|')).replace(/[^a-zA-Z0-9]/g, '').substring(0, 12);
  }

  /**
   * Checks if automatic reporting should trigger
   */
  function checkAutoReportThresholds() {
    const now = Date.now();
    
    // Check cooldown
    if (now - detectorState.lastReportTime < CONFIG.REPORT_COOLDOWN_MS) {
      return false;
    }
    
    // Check error thresholds
    if (detectorState.errorCounts.critical >= CONFIG.THRESHOLDS.CRITICAL_ERROR_COUNT) {
      return true;
    }
    
    if (detectorState.errorCounts.high >= CONFIG.THRESHOLDS.ERROR_COUNT) {
      return true;
    }
    
    if (detectorState.errorCounts.total >= CONFIG.THRESHOLDS.WARNING_COUNT) {
      return true;
    }
    
    // Check network health
    if (detectorState.networkStats.totalRequests > 10) {
      const errorRate = detectorState.networkStats.failedRequests / detectorState.networkStats.totalRequests;
      if (errorRate > CONFIG.THRESHOLDS.API_ERROR_RATE) {
        return true;
      }
    }
    
    // Check for critical issues
    const recentCritical = detectorState.detectedIssues.filter(i => 
      i.severity === CONFIG.ERROR_SEVERITY.CRITICAL &&
      (now - i.timestamp) < 300000 // Last 5 minutes
    );
    
    if (recentCritical.length >= 2) {
      return true;
    }
    
    return false;
  }

  /**
   * Generates automatic error report
   */
  function generateAutoReport() {
    const report = {
      type: 'automatic',
      sessionId: detectorState.sessionId,
      timestamp: Date.now(),
      errorCounts: detectorState.errorCounts,
      recentIssues: detectorState.detectedIssues.slice(-20),
      performanceMetrics: {
        avgFPS: calculateAverage(detectorState.performanceMetrics.fps),
        avgMemoryMB: calculateAverage(detectorState.performanceMetrics.memoryUsage),
        avgApiLatency: calculateAverage(detectorState.performanceMetrics.apiLatency)
      },
      networkStats: detectorState.networkStats,
      resourceStats: detectorState.resourceStats,
      analysis: analyzeOverallHealth()
    };
    
    return report;
  }

  /**
   * Analyzes overall application health
   */
  function analyzeOverallHealth() {
    const analysis = {
      status: 'healthy',
      issues: [],
      recommendations: []
    };
    
    // Check error rate
    if (detectorState.errorCounts.critical > 0) {
      analysis.status = 'critical';
      analysis.issues.push('Critical errors detected');
      analysis.recommendations.push('Immediate investigation required');
    } else if (detectorState.errorCounts.high > 5) {
      analysis.status = 'degraded';
      analysis.issues.push('Multiple high-severity errors');
      analysis.recommendations.push('Review error logs and fix issues');
    }
    
    // Check performance
    const avgFPS = calculateAverage(detectorState.performanceMetrics.fps);
    if (avgFPS < 30 && avgFPS > 0) {
      analysis.status = analysis.status === 'healthy' ? 'degraded' : analysis.status;
      analysis.issues.push('Poor rendering performance');
      analysis.recommendations.push('Optimize animations and DOM updates');
    }
    
    // Check memory
    const avgMemory = calculateAverage(detectorState.performanceMetrics.memoryUsage);
    if (avgMemory > CONFIG.THRESHOLDS.MEMORY_USAGE_MB) {
      analysis.status = analysis.status === 'healthy' ? 'degraded' : analysis.status;
      analysis.issues.push('High memory usage');
      analysis.recommendations.push('Check for memory leaks and optimize resource usage');
    }
    
    // Check network
    if (detectorState.networkStats.totalRequests > 0) {
      const errorRate = detectorState.networkStats.failedRequests / detectorState.networkStats.totalRequests;
      if (errorRate > 0.3) {
        analysis.status = analysis.status === 'healthy' ? 'degraded' : analysis.status;
        analysis.issues.push('High network error rate');
        analysis.recommendations.push('Check API availability and network connectivity');
      }
    }
    
    return analysis;
  }

  /**
   * Calculates average of array
   */
  function calculateAverage(arr) {
    if (!arr || arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  /**
   * Automatically sends error report
   */
  function autoSendReport() {
    if (!CONFIG.AUTO_REPORT_ENABLED) return;
    
    const report = generateAutoReport();
    detectorState.lastReportTime = Date.now();
    
    // Reset counters after reporting
    detectorState.errorCounts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      total: 0
    };
    
    // Send via existing error logger if available
    if (window.ErrorLogger && window.ErrorLogger.sendReport) {
      // Add auto-report data to existing error log
      if (window.ErrorLogger.getLog) {
        const errorLog = window.ErrorLogger.getLog();
        errorLog.autoDetection = report;
      }
      
      // Send the report silently
      if (CONFIG.SILENT_MODE) {
        // Override toast notifications temporarily
        const originalShowToast = window.showToast;
        window.showToast = () => {};
        
        window.ErrorLogger.sendReport();
        
        // Restore toast notifications
        setTimeout(() => {
          window.showToast = originalShowToast;
        }, 100);
      } else {
        window.ErrorLogger.sendReport();
      }
    } else {
      // Fallback: Log to console
      console.error('🤖 [Auto-Detector] Critical issues detected:', report);
    }
    
    // Update UI indicator if present
    updateUIIndicator(report.analysis.status);
  }

  /**
   * Updates UI status indicator
   */
  function updateUIIndicator(status) {
    let indicator = document.getElementById('error-status-indicator');
    
    if (!indicator) {
      // Create status indicator if it doesn't exist
      indicator = document.createElement('div');
      indicator.id = 'error-status-indicator';
      indicator.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 10000;
        transition: all 0.3s ease;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      `;
      
      indicator.title = 'Application Health Status';
      indicator.onclick = showHealthDetails;
      
      document.body.appendChild(indicator);
    }
    
    // Update indicator based on status
    const colors = {
      healthy: '#22c55e',
      degraded: '#f59e0b',
      critical: '#ef4444'
    };
    
    const icons = {
      healthy: '✓',
      degraded: '⚠',
      critical: '✗'
    };
    
    indicator.style.backgroundColor = colors[status] || colors.healthy;
    indicator.innerHTML = `<span style="color: white; font-size: 20px; font-weight: bold;">${icons[status] || '?'}</span>`;
    
    // Add pulse animation for critical status
    if (status === 'critical') {
      indicator.style.animation = 'pulse 2s infinite';
      
      if (!document.getElementById('pulse-animation')) {
        const style = document.createElement('style');
        style.id = 'pulse-animation';
        style.textContent = `
          @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
            70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
            100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
          }
        `;
        document.head.appendChild(style);
      }
    } else {
      indicator.style.animation = '';
    }
  }

  /**
   * Shows health details modal
   */
  function showHealthDetails() {
    const analysis = analyzeOverallHealth();
    const report = generateAutoReport();
    
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
    
    const statusColors = {
      healthy: '#22c55e',
      degraded: '#f59e0b',
      critical: '#ef4444'
    };
    
    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      border-radius: 12px;
      max-width: 600px;
      max-height: 80vh;
      overflow: auto;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    `;
    
    content.innerHTML = `
      <div style="padding: 20px; border-bottom: 1px solid #e5e7eb;">
        <h2 style="margin: 0; color: #1f2937; display: flex; align-items: center; gap: 10px;">
          <span style="width: 12px; height: 12px; border-radius: 50%; background: ${statusColors[analysis.status]}"></span>
          Application Health: ${analysis.status.toUpperCase()}
        </h2>
      </div>
      <div style="padding: 20px;">
        <div style="margin-bottom: 20px;">
          <h3 style="color: #374151; margin-bottom: 10px;">Error Summary</h3>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
            <div style="padding: 10px; background: #fef2f2; border-radius: 8px; ${report.errorCounts.critical > 0 ? 'border: 2px solid #ef4444;' : ''}">
              <div style="color: #ef4444; font-size: 24px; font-weight: bold;">${report.errorCounts.critical}</div>
              <div style="color: #7f1d1d; font-size: 12px;">Critical Errors</div>
            </div>
            <div style="padding: 10px; background: #fef3c7; border-radius: 8px;">
              <div style="color: #f59e0b; font-size: 24px; font-weight: bold;">${report.errorCounts.high}</div>
              <div style="color: #78350f; font-size: 12px;">High Priority</div>
            </div>
            <div style="padding: 10px; background: #dbeafe; border-radius: 8px;">
              <div style="color: #3b82f6; font-size: 24px; font-weight: bold;">${report.errorCounts.medium}</div>
              <div style="color: #1e3a8a; font-size: 12px;">Medium Priority</div>
            </div>
            <div style="padding: 10px; background: #f3f4f6; border-radius: 8px;">
              <div style="color: #6b7280; font-size: 24px; font-weight: bold;">${report.errorCounts.low}</div>
              <div style="color: #374151; font-size: 12px;">Low Priority</div>
            </div>
          </div>
        </div>
        
        ${analysis.issues.length > 0 ? `
          <div style="margin-bottom: 20px;">
            <h3 style="color: #374151; margin-bottom: 10px;">Detected Issues</h3>
            <ul style="margin: 0; padding-left: 20px;">
              ${analysis.issues.map(issue => `<li style="color: #6b7280; margin-bottom: 5px;">${issue}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        ${analysis.recommendations.length > 0 ? `
          <div style="margin-bottom: 20px;">
            <h3 style="color: #374151; margin-bottom: 10px;">Recommendations</h3>
            <ul style="margin: 0; padding-left: 20px;">
              ${analysis.recommendations.map(rec => `<li style="color: #6b7280; margin-bottom: 5px;">${rec}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: #374151; margin-bottom: 10px;">Performance Metrics</h3>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; font-size: 14px;">
            <div>
              <div style="color: #6b7280;">Avg FPS</div>
              <div style="color: #1f2937; font-weight: bold;">${Math.round(report.performanceMetrics.avgFPS) || 'N/A'}</div>
            </div>
            <div>
              <div style="color: #6b7280;">Memory Usage</div>
              <div style="color: #1f2937; font-weight: bold;">${Math.round(report.performanceMetrics.avgMemoryMB) || 'N/A'} MB</div>
            </div>
            <div>
              <div style="color: #6b7280;">API Latency</div>
              <div style="color: #1f2937; font-weight: bold;">${Math.round(report.performanceMetrics.avgApiLatency) || 'N/A'} ms</div>
            </div>
          </div>
        </div>
        
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          <button onclick="this.closest('[style*=\\"position: fixed\\"]').remove()" style="
            padding: 10px 20px;
            background: #6b7280;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
          ">Close</button>
          <button onclick="window.ErrorLogger && window.ErrorLogger.sendReport()" style="
            padding: 10px 20px;
            background: #ef4444;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
          ">Send Report</button>
        </div>
      </div>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Close on background click
    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    };
  }

  /**
   * Starts the automatic error detection system
   */
  function startDetection() {
    if (detectorState.isMonitoring) return;
    
    console.info('🤖 [Auto-Detector] Starting automatic error detection...');
    detectorState.isMonitoring = true;
    
    // Start monitoring components
    monitorPerformance();
    monitorNetwork();
    monitorDOMMutations();
    
    // Set up interval checks
    detectorState.intervals.memory = setInterval(monitorMemory, CONFIG.INTERVALS.MEMORY_CHECK);
    detectorState.intervals.analysis = setInterval(() => {
      if (checkAutoReportThresholds()) {
        autoSendReport();
      }
    }, CONFIG.INTERVALS.ERROR_ANALYSIS);
    
    detectorState.intervals.health = setInterval(() => {
      const analysis = analyzeOverallHealth();
      updateUIIndicator(analysis.status);
    }, CONFIG.INTERVALS.HEALTH_CHECK);
    
    // Initial UI indicator
    updateUIIndicator('healthy');
    
    // Hook into global error handlers
    window.addEventListener('error', handleGlobalError, true);
    window.addEventListener('unhandledrejection', handleUnhandledRejection, true);
    
    console.info('✓ [Auto-Detector] Error detection active. Monitoring for issues...');
  }

  /**
   * Handles global errors
   */
  function handleGlobalError(event) {
    const error = {
      name: event.error?.name || 'Error',
      message: event.message,
      stack: event.error?.stack,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    };
    
    const analysis = analyzeErrorPattern(error);
    
    recordIssue({
      type: 'error',
      severity: analysis.severity,
      message: error.message,
      details: {
        ...error,
        analysis
      }
    });
  }

  /**
   * Handles unhandled promise rejections
   */
  function handleUnhandledRejection(event) {
    const error = {
      name: 'UnhandledRejection',
      message: event.reason?.message || String(event.reason),
      stack: event.reason?.stack
    };
    
    const analysis = analyzeErrorPattern(error);
    
    recordIssue({
      type: 'promise',
      severity: analysis.severity,
      message: `Unhandled Promise: ${error.message}`,
      details: {
        ...error,
        analysis
      }
    });
  }

  /**
   * Stops the automatic error detection system
   */
  function stopDetection() {
    if (!detectorState.isMonitoring) return;
    
    console.info('🤖 [Auto-Detector] Stopping error detection...');
    detectorState.isMonitoring = false;
    
    // Clear intervals
    Object.values(detectorState.intervals).forEach(clearInterval);
    detectorState.intervals = {};
    
    // Disconnect observers
    if (detectorState.observers.performance) {
      detectorState.observers.performance.disconnect();
      detectorState.observers.performance = null;
    }
    
    if (detectorState.observers.mutation) {
      detectorState.observers.mutation.disconnect();
      detectorState.observers.mutation = null;
    }
    
    // Remove event listeners
    window.removeEventListener('error', handleGlobalError, true);
    window.removeEventListener('unhandledrejection', handleUnhandledRejection, true);
    
    console.info('✓ [Auto-Detector] Error detection stopped');
  }

  /**
   * Gets current detection status
   */
  function getStatus() {
    return {
      isMonitoring: detectorState.isMonitoring,
      sessionId: detectorState.sessionId,
      errorCounts: detectorState.errorCounts,
      health: analyzeOverallHealth(),
      recentIssues: detectorState.detectedIssues.slice(-10)
    };
  }

  // Load custom configuration if available
  function loadCustomConfig() {
    if (window.AUTO_DETECTOR_CONFIG) {
      console.info('🤖 [Auto-Detector] Loading custom configuration...');
      Object.assign(CONFIG, window.AUTO_DETECTOR_CONFIG);
      
      // Apply sub-configs
      if (window.AUTO_DETECTOR_CONFIG.THRESHOLDS) {
        Object.assign(CONFIG.THRESHOLDS, window.AUTO_DETECTOR_CONFIG.THRESHOLDS);
      }
      if (window.AUTO_DETECTOR_CONFIG.INTERVALS) {
        Object.assign(CONFIG.INTERVALS, window.AUTO_DETECTOR_CONFIG.INTERVALS);
      }
    }
  }

  // Expose API first
  window.AutoErrorDetector = {
    start: startDetection,
    stop: stopDetection,
    getStatus: getStatus,
    getConfig: () => CONFIG,
    updateConfig: (updates) => {
      Object.assign(CONFIG, updates);
      if (updates.THRESHOLDS) Object.assign(CONFIG.THRESHOLDS, updates.THRESHOLDS);
      if (updates.INTERVALS) Object.assign(CONFIG.INTERVALS, updates.INTERVALS);
    },
    forceReport: autoSendReport,
    analyzeHealth: analyzeOverallHealth,
    showHealthDetails: showHealthDetails
  };

  // Start detection automatically if enabled
  if (document.readyState === 'complete') {
    loadCustomConfig();
    if (CONFIG.AUTO_DETECT_ENABLED) {
      startDetection();
    }
  } else {
    window.addEventListener('load', () => {
      loadCustomConfig();
      if (CONFIG.AUTO_DETECT_ENABLED) {
        startDetection();
      }
    });
  }

})();