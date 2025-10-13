/**
 * Auto Error Detector Configuration
 * 
 * Copy this file to auto-detector-config.js and customize the settings
 * to control how the automatic error detection and reporting works.
 * 
 * The auto-detector will automatically:
 * - Monitor for JavaScript errors, performance issues, and memory leaks
 * - Classify errors by severity
 * - Send reports when thresholds are exceeded
 * - Show a status indicator in the bottom-right corner
 */

window.AUTO_DETECTOR_CONFIG = {
  // ===================================
  // MAIN SWITCHES
  // ===================================
  
  // Enable automatic error detection (set to false to disable completely)
  AUTO_DETECT_ENABLED: true,
  
  // Automatically send reports when thresholds are met
  AUTO_REPORT_ENABLED: true,
  
  // Silent mode - no pop-ups or alerts for technical errors
  // Errors are still logged and reported, just silently
  SILENT_MODE: true,
  
  // ===================================
  // ERROR THRESHOLDS
  // When these are exceeded, an automatic report is sent
  // ===================================
  
  THRESHOLDS: {
    // Number of critical errors before auto-reporting
    CRITICAL_ERROR_COUNT: 3,
    
    // Number of high-priority errors before auto-reporting
    ERROR_COUNT: 10,
    
    // Number of warnings before auto-reporting
    WARNING_COUNT: 20,
    
    // Memory usage threshold in MB
    MEMORY_USAGE_MB: 200,
    
    // Memory growth in MB over 5 minutes (potential leak)
    MEMORY_GROWTH_RATE: 50,
    
    // Page load time threshold in milliseconds
    PAGE_LOAD_TIME_MS: 5000,
    
    // API error rate (0.5 = 50% of requests failing)
    API_ERROR_RATE: 0.5,
    
    // DOM update time threshold in milliseconds
    DOM_UPDATE_TIME_MS: 100,
    
    // FPS drop threshold (reports if FPS goes below this)
    FPS_DROP_THRESHOLD: 30,
    
    // Number of network timeouts before reporting
    NETWORK_TIMEOUT_COUNT: 5,
    
    // Number of resource loading failures before reporting
    RESOURCE_FAILURE_COUNT: 10
  },
  
  // ===================================
  // MONITORING INTERVALS
  // How often to check various metrics (in milliseconds)
  // ===================================
  
  INTERVALS: {
    // Check memory usage every X milliseconds
    MEMORY_CHECK: 30000,  // 30 seconds
    
    // Check overall performance every X milliseconds
    PERFORMANCE_CHECK: 60000,  // 1 minute
    
    // Analyze collected errors every X milliseconds
    ERROR_ANALYSIS: 15000,  // 15 seconds
    
    // Overall health check every X milliseconds
    HEALTH_CHECK: 120000  // 2 minutes
  },
  
  // ===================================
  // REPORT SETTINGS
  // ===================================
  
  // Minimum time between automatic reports (prevents spam)
  REPORT_COOLDOWN_MS: 300000,  // 5 minutes
  
  // ===================================
  // ERROR CLASSIFICATION
  // Customize how errors are classified by severity
  // ===================================
  
  // Keywords that indicate critical errors
  CRITICAL_ERROR_KEYWORDS: [
    'cannot read prop',
    'cannot access',
    'undefined is not',
    'null is not',
    'at render',
    'at mount'
  ],
  
  // Keywords that indicate high-priority errors
  HIGH_ERROR_KEYWORDS: [
    'failed to fetch',
    'network error',
    'timeout',
    'cors',
    'unauthorized',
    'forbidden'
  ],
  
  // Keywords that indicate medium-priority errors
  MEDIUM_ERROR_KEYWORDS: [
    'failed to load',
    'resource',
    'image',
    'style',
    'script',
    'quota',
    'storage'
  ],
  
  // Keywords that indicate low-priority errors
  LOW_ERROR_KEYWORDS: [
    'warning',
    'deprecated',
    'experimental'
  ],
  
  // ===================================
  // UI SETTINGS
  // ===================================
  
  // Show the floating status indicator
  SHOW_STATUS_INDICATOR: true,
  
  // Status indicator position
  INDICATOR_POSITION: {
    bottom: '20px',
    right: '20px'
  },
  
  // Colors for different health states
  INDICATOR_COLORS: {
    healthy: '#22c55e',   // Green
    degraded: '#f59e0b',  // Orange
    critical: '#ef4444'   // Red
  },
  
  // ===================================
  // ADVANCED SETTINGS
  // ===================================
  
  // Maximum number of issues to keep in memory
  MAX_ISSUES_STORED: 100,
  
  // Maximum number of performance samples to keep
  MAX_PERFORMANCE_SAMPLES: 20,
  
  // Enable console logging for debugging
  DEBUG_MODE: false
};

// Apply the configuration when the auto-detector loads
if (window.AutoErrorDetector) {
  window.AutoErrorDetector.updateConfig(window.AUTO_DETECTOR_CONFIG);
}