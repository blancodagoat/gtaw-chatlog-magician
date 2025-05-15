/**
 * Cross-Origin Fix for Chatlog Magician
 * Prevents cross-origin errors when running locally
 */

(function() {
  // Override the Object.defineProperty to catch cross-origin errors
  const originalDefineProperty = Object.defineProperty;
  
  Object.defineProperty = function(obj, prop, descriptor) {
    try {
      return originalDefineProperty.call(this, obj, prop, descriptor);
    } catch (e) {
      if (e.message && e.message.includes('cross-origin')) {
        // Silently fail for cross-origin errors
        return obj;
      }
      throw e;
    }
  };
  
  // Override the Array.prototype methods that might cause cross-origin issues
  const safeArrayMethods = ['push', 'pop', 'shift', 'unshift', 'splice'];
  
  safeArrayMethods.forEach(method => {
    const original = Array.prototype[method];
    
    Array.prototype[method] = function() {
      try {
        return original.apply(this, arguments);
      } catch (e) {
        if (e.message && e.message.includes('cross-origin')) {
          console.log(`Prevented cross-origin error in Array.${method}`);
          return this;
        }
        throw e;
      }
    };
  });
})();
