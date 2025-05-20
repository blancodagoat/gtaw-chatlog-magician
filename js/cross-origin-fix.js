(function() {

  const errorCache = new Map();

  const isCrossOriginError = (error) => {
    if (!error || !error.message) return false;

    const message = error.message;
    if (errorCache.has(message)) {
      return errorCache.get(message);
    }

    const isCrossOrigin = message.includes('cross-origin') || 
                         message.includes('XrayWrapper') ||
                         message.includes('Permission denied');

    errorCache.set(message, isCrossOrigin);
    return isCrossOrigin;
  };

  const originalDefineProperty = Object.defineProperty;
  Object.defineProperty = function(obj, prop, descriptor) {
    try {
      return originalDefineProperty.call(this, obj, prop, descriptor);
    } catch (e) {
      if (isCrossOriginError(e)) {

        return obj;
      }
      throw e;
    }
  };

  const originalDefineProperties = Object.defineProperties;
  Object.defineProperties = function(obj, props) {
    try {
      return originalDefineProperties.call(this, obj, props);
    } catch (e) {
      if (isCrossOriginError(e)) {
        return obj;
      }
      throw e;
    }
  };

  const originalGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
  Object.getOwnPropertyDescriptor = function(obj, prop) {
    try {
      return originalGetOwnPropertyDescriptor.call(this, obj, prop);
    } catch (e) {
      if (isCrossOriginError(e)) {
        return undefined;
      }
      throw e;
    }
  };

  const safeArrayMethods = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'];

  safeArrayMethods.forEach(method => {
    const original = Array.prototype[method];

    Array.prototype[method] = function() {
      try {
        return original.apply(this, arguments);
      } catch (e) {
        if (isCrossOriginError(e)) {
          console.log(`Prevented cross-origin error in Array.${method}`);
          return this;
        }
        throw e;
      }
    };
  });

  if (window.performance && window.performance.mark) {
    window.addEventListener('load', () => {
      performance.mark('cross-origin-fix-initialized');
      performance.measure('cross-origin-fix-setup', 'cross-origin-fix-initialized');
    });
  }
})();