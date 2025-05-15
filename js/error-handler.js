/**
 * Chatlog Magician - Error Handler
 * Catches and logs JavaScript errors
 */

(function() {
  // Global error handler
  window.addEventListener('error', function(event) {
    // Check if the error is related to Font Awesome
    if (event.message && (
        event.message.includes('Font Awesome') || 
        event.message.includes('Glyph bbox') ||
        event.message.includes('webfonts')
      )) {
      // Prevent the error from showing in console
      event.preventDefault();
      return true;
    }
    
    // Check if the error is related to clipboard operations
    if (event.message && (
        event.message.includes('clipboard') ||
        event.message.includes('Clipboard')
      )) {
      // Prevent the error from showing in console
      event.preventDefault();
      return true;
    }
    
    // Let other errors pass through
    console.log('Error caught by handler:', event.error);
  });

  // Promise rejection handler
  window.addEventListener('unhandledrejection', function(event) {
    // Check if the rejection is related to Font Awesome
    if (event.reason && typeof event.reason.message === 'string' && (
        event.reason.message.includes('Font Awesome') || 
        event.reason.message.includes('Glyph bbox') ||
        event.reason.message.includes('webfonts')
      )) {
      // Prevent the error from showing in console
      event.preventDefault();
      return true;
    }
    
    // Check if the rejection is related to clipboard operations
    if (event.reason && typeof event.reason.message === 'string' && (
        event.reason.message.includes('clipboard') ||
        event.reason.message.includes('Clipboard')
      )) {
      // Prevent the error from showing in console
      event.preventDefault();
      return true;
    }
    
    console.log('Unhandled promise rejection:', event.reason);
  });

  // Console error override
  const originalConsoleError = console.error;
  console.error = function() {
    // Convert arguments to string for easier filtering
    const errorText = Array.from(arguments).join(' ');
    
    // Filter out specific errors we want to ignore
    if (
      // Font Awesome related errors
      errorText.includes('Font Awesome') || 
      errorText.includes('webfonts') || 
      errorText.includes('Glyph bbox') ||
      
      // Source map errors
      errorText.includes('source map') || 
      errorText.includes('sourcemap') || 
      errorText.includes('.map') ||
      
      // WXT storage migration messages
      errorText.includes('@wxt-dev/storage') ||
      errorText.includes('Storage migration') ||
      
      // Cross-origin errors
      errorText.includes('cross-origin') ||
      errorText.includes('XrayWrapper') ||
      
      // Clipboard errors
      errorText.includes('clipboard') ||
      errorText.includes('Clipboard')
    ) {
      return;
    }
    
    // Pass through other errors to the original console.error
    return originalConsoleError.apply(console, arguments);
  };
  
  // Override console.warn as well
  const originalConsoleWarn = console.warn;
  console.warn = function() {
    // Convert arguments to string for easier filtering
    const warnText = Array.from(arguments).join(' ');
    
    // Filter out specific warnings we want to ignore
    if (
      // Font Awesome related warnings
      warnText.includes('Font Awesome') || 
      warnText.includes('webfonts') || 
      warnText.includes('Glyph bbox') ||
      
      // Source map warnings
      warnText.includes('source map') || 
      warnText.includes('sourcemap') || 
      warnText.includes('.map') ||
      
      // WXT storage migration messages
      warnText.includes('@wxt-dev/storage') ||
      warnText.includes('Storage migration') ||
      
      // Clipboard warnings
      warnText.includes('clipboard') ||
      warnText.includes('Clipboard')
    ) {
      return;
    }
    
    // Pass through other warnings to the original console.warn
    return originalConsoleWarn.apply(console, arguments);
  };
  
  // Override console.log for WXT storage messages
  const originalConsoleLog = console.log;
  console.log = function() {
    // Convert arguments to string for easier filtering
    const logText = Array.from(arguments).join(' ');
    
    // Filter out specific logs we want to ignore
    if (
      // WXT storage migration messages
      logText.includes('@wxt-dev/storage') ||
      logText.includes('Storage migration') ||
      
      // Clipboard logs (except our own debug logs)
      (logText.includes('clipboard') || logText.includes('Clipboard')) &&
      !logText.includes('Clipboard API failed, trying fallback')
    ) {
      return;
    }
    
    // Pass through other logs to the original console.log
    return originalConsoleLog.apply(console, arguments);
  };
})();
