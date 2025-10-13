# Automated Error Detection & Analysis System

## Overview

The chatlog magician now includes an **automated error detection and analysis system** that monitors your application for technical issues without requiring user intervention. The manual "Report Bug" button has been removed and replaced with intelligent, threshold-based automatic error reporting.

## How It Works

### 1. **Continuous Monitoring**
The system continuously monitors:
- JavaScript errors (runtime errors, type errors, reference errors)
- Unhandled promise rejections
- Network failures (failed API calls, resource loading)
- Performance degradation (memory leaks, slow operations)
- Console errors and warnings
- DOM size issues

### 2. **Severity Classification**
Every error is automatically classified into one of these severity levels:

- **CRITICAL** - App-breaking errors (immediate reporting)
  - Syntax errors, type errors, reference errors
  - Out of memory errors
  - Maximum call stack exceeded
  
- **HIGH** - Feature-breaking errors (reports after threshold)
  - Network failures (404, 500 errors)
  - Failed fetch requests
  - LocalStorage quota exceeded
  - Timeout errors

- **MEDIUM** - UX-degrading issues (reports if recurring)
  - Warnings and deprecation notices
  - CORS issues
  - Invalid data formats

- **LOW** - Minor issues (tracked but not reported)
  - General warnings
  - Non-critical failures

- **IGNORE** - Known cosmetic issues (filtered out)
  - Font Awesome errors
  - Source map warnings
  - Clipboard API fallbacks
  - ResizeObserver notifications

### 3. **Automatic Reporting Triggers**

Reports are sent automatically when:

| Trigger | Threshold | Action |
|---------|-----------|--------|
| Critical error | 1 error | Immediate report |
| High-severity errors | 2+ errors | Auto-report |
| Medium-severity errors | 5+ errors | Auto-report |
| Error rate | 3+ errors/minute | Auto-report |
| Recurring pattern | Same error 3+ times | Auto-report |
| Memory leak | 50+ MB growth in 5 min | Auto-report |
| DOM bloat | 5000+ nodes | Performance report |

### 4. **Rate Limiting**
To prevent spam, the system includes:
- **10-minute cooldown** between auto-reports
- **Maximum 3 auto-reports** per session
- Integration with existing ErrorLogger rate limits

## Configuration

### Default Settings

The system is pre-configured with sensible defaults, but you can customize it:

```javascript
// Access the analyzer configuration
window.ErrorAnalyzer.configure({
  // Enable/disable features
  ENABLE_AUTO_REPORTING: true,
  ENABLE_PERFORMANCE_MONITORING: true,
  ENABLE_PATTERN_DETECTION: true,
  ENABLE_CONSOLE_MONITORING: true,
  
  // Reporting preferences
  REPORT_ONLY_CRITICAL: false,  // Set to true for critical errors only
  SILENT_MODE: false,            // Set to true to hide notifications
  
  // Thresholds (customize as needed)
  CRITICAL_ERROR_THRESHOLD: 1,
  HIGH_ERROR_THRESHOLD: 2,
  MEDIUM_ERROR_THRESHOLD: 5,
  ERROR_RATE_THRESHOLD: 3,
  
  // Performance thresholds
  MEMORY_LEAK_THRESHOLD: 50,      // MB
  SLOW_OPERATION_THRESHOLD: 3000, // ms
  DOM_SIZE_THRESHOLD: 5000,       // nodes
  
  // Rate limiting
  AUTO_REPORT_COOLDOWN: 600000,       // 10 minutes
  MAX_AUTO_REPORTS_PER_SESSION: 3
});
```

### Configuration Presets

#### Production Mode (Conservative)
```javascript
window.ErrorAnalyzer.configure({
  REPORT_ONLY_CRITICAL: true,
  SILENT_MODE: true,
  MAX_AUTO_REPORTS_PER_SESSION: 2
});
```

#### Development Mode (Aggressive)
```javascript
window.ErrorAnalyzer.configure({
  HIGH_ERROR_THRESHOLD: 1,
  MEDIUM_ERROR_THRESHOLD: 2,
  SILENT_MODE: false,
  MAX_AUTO_REPORTS_PER_SESSION: 10
});
```

#### Silent Monitoring (No Notifications)
```javascript
window.ErrorAnalyzer.configure({
  SILENT_MODE: true,
  ENABLE_AUTO_REPORTING: true
});
```

## API Reference

### ErrorAnalyzer API

```javascript
// Get current state
const state = window.ErrorAnalyzer.getState();
console.log(state);
// {
//   errorCount: 5,
//   autoReportCount: 1,
//   criticalErrorDetected: false,
//   lastAutoReport: 1234567890
// }

// Analyze current errors without reporting
const analysis = window.ErrorAnalyzer.analyzeNow();
console.log(analysis);

// Force an immediate report (bypasses cooldown)
await window.ErrorAnalyzer.forceReport();

// Reset the analyzer state
window.ErrorAnalyzer.reset();

// Update configuration
window.ErrorAnalyzer.configure({ 
  SILENT_MODE: true 
});
```

### ErrorLogger API (Enhanced)

```javascript
// Check if a report can be sent (respects rate limits)
const canSend = window.ErrorLogger.canSendReport();

// Get detailed rate limit status
const rateLimitStatus = window.ErrorLogger.getRateLimitStatus();
console.log(rateLimitStatus);
// {
//   limited: false,
//   lastReport: "2025-10-13T12:34:56.789Z",
//   reportCount: 2,
//   maxReports: 5,
//   cooldownSeconds: 60,
//   cooldownRemaining: 0
// }

// Send report with options (new async method)
await window.ErrorLogger.sendReportAsync({ 
  silent: true  // Don't show UI notifications
});

// Legacy method (with UI feedback)
window.ErrorLogger.sendReport();
```

## Technical Details

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   User Application                      │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│              error-analyzer.js (NEW)                    │
│  • Severity classification                              │
│  • Pattern detection                                    │
│  • Performance monitoring                               │
│  • Threshold evaluation                                 │
│  • Auto-report triggering                               │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│              error-logger.js (Enhanced)                 │
│  • Error collection                                     │
│  • Report generation                                    │
│  • Discord/Email integration                            │
│  • Rate limiting                                        │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│              error-handler.js                           │
│  • Known error filtering                                │
│  • Console interception                                 │
└─────────────────────────────────────────────────────────┘
```

### Error Flow

1. **Error occurs** in application
2. **error-handler.js** intercepts and filters known issues
3. **error-logger.js** logs the error with context
4. **error-analyzer.js** receives the error and:
   - Classifies severity
   - Records with timestamp
   - Updates patterns
   - Checks thresholds
   - Triggers auto-report if needed
5. **Report sent** via Discord webhook or email (if configured)

### Performance Impact

The automated system is designed to be lightweight:
- **Minimal overhead**: <5ms per error
- **Memory efficient**: Keeps only last hour of errors
- **Async operations**: Non-blocking report sending
- **Smart filtering**: Ignores cosmetic issues

## Monitoring & Debugging

### Console Commands

```javascript
// View all errors captured in current session
window.ErrorLogger.getLog()

// View error analyzer state
window.ErrorAnalyzer.getState()

// Analyze current error patterns
window.ErrorAnalyzer.analyzeNow()

// Check rate limit status
window.ErrorLogger.getRateLimitStatus()

// Clear all logs (reset)
window.ErrorLogger.clearLog()
window.ErrorAnalyzer.reset()
```

### Console Output

The system provides detailed console logging:

```
[Error Analyzer] Automated error detection initialized
[Error Analyzer] Configuration: { autoReporting: true, ... }
[Error Analyzer] Recorded high error: Failed to fetch API
[Error Analyzer] 2 high-severity errors detected - triggering auto-report
[Error Analyzer] Automated technical report sent successfully via serverless
```

### Notification Behavior

By default (SILENT_MODE: false):
- User sees a **subtle toast notification** when auto-report is sent
- Notification appears in bottom-right corner
- Auto-dismisses after 4 seconds
- Doesn't interrupt user workflow

In silent mode (SILENT_MODE: true):
- No UI notifications shown
- All activity logged to console only
- Ideal for production environments

## Migration from Manual Reporting

### What Changed

**Before:**
- Users clicked "Report Bug" button manually
- Button was pressed randomly/for fun
- No automatic detection
- Reports included non-issues

**After:**
- System automatically detects technical errors
- Intelligent severity classification
- Threshold-based reporting
- Only real technical issues reported
- No user action required

### Removed Components

- `#copyErrorReport` button in UI
- Button click handler in `app.js`

### Added Components

- `js/error-analyzer.js` - New automated detection module
- Enhanced `ErrorLogger.sendReportAsync()` method
- New configuration API

## Best Practices

### For Production

1. **Enable silent mode** to avoid user-facing notifications
2. **Set conservative thresholds** to reduce noise
3. **Monitor Discord/email** for automated reports
4. **Review patterns** regularly to identify systemic issues

```javascript
// Recommended production config
window.ErrorAnalyzer.configure({
  SILENT_MODE: true,
  REPORT_ONLY_CRITICAL: false,
  HIGH_ERROR_THRESHOLD: 3,
  MAX_AUTO_REPORTS_PER_SESSION: 2
});
```

### For Development

1. **Disable silent mode** to see what's being detected
2. **Lower thresholds** to catch issues early
3. **Use console commands** to inspect state
4. **Test error scenarios** intentionally

```javascript
// Development config
window.ErrorAnalyzer.configure({
  SILENT_MODE: false,
  HIGH_ERROR_THRESHOLD: 1,
  MEDIUM_ERROR_THRESHOLD: 2,
  MAX_AUTO_REPORTS_PER_SESSION: 10
});

// Trigger a test error
throw new Error('Test critical error');

// Check if it was detected
window.ErrorAnalyzer.getState();
```

## Troubleshooting

### Issue: No reports being sent

**Check:**
1. Rate limiting: `window.ErrorLogger.getRateLimitStatus()`
2. Configuration: `window.ErrorAnalyzer.getState()`
3. Error severity: Low/Ignore errors aren't reported
4. Webhook configured: Check `api/report-bug.js` environment variables

### Issue: Too many reports

**Solution:**
```javascript
// Increase thresholds
window.ErrorAnalyzer.configure({
  HIGH_ERROR_THRESHOLD: 5,
  MEDIUM_ERROR_THRESHOLD: 10,
  ERROR_RATE_THRESHOLD: 5
});

// Or enable critical-only mode
window.ErrorAnalyzer.configure({
  REPORT_ONLY_CRITICAL: true
});
```

### Issue: False positives

**Solution:**
Add patterns to ignore list in `error-analyzer.js`:

```javascript
// In classifyError function, add to IGNORE section:
if (
  errorText.includes('your-specific-error-pattern') ||
  errorText.includes('another-known-issue')
) {
  return SEVERITY.IGNORE;
}
```

## Security & Privacy

- Error reports **do NOT include** user input or sensitive data
- Reports sent via **secure webhook** (kept private on server)
- **Rate limiting** prevents abuse
- **localStorage** used only for rate limit tracking
- No external analytics or tracking

## Future Enhancements

Planned improvements:
- [ ] Machine learning for error pattern recognition
- [ ] Error grouping and deduplication
- [ ] Source map integration for better stack traces
- [ ] Custom error handlers per module
- [ ] Exportable error analytics dashboard

## Support

For issues or questions:
1. Check console for `[Error Analyzer]` logs
2. Review this documentation
3. Open GitHub issue with error details
4. Include `ErrorAnalyzer.getState()` output

---

**Last updated:** 2025-10-13  
**Version:** 1.0.0  
**Module:** error-analyzer.js
