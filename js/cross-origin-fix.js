(function () {

  const originalDefineProperty = Object.defineProperty;

  Object.defineProperty = function (obj, prop, descriptor) {
      try {
          return originalDefineProperty.call(this, obj, prop, descriptor);
      } catch (e) {
          if (e.message && e.message.includes('cross-origin')) {

              return obj;
          }
          throw e;
      }
  };

  const safeArrayMethods = ['push', 'pop', 'shift', 'unshift', 'splice'];

  safeArrayMethods.forEach(method => {
      const original = Array.prototype[method];

      Array.prototype[method] = function () {
          try {
              return original.apply(this, arguments);
          } catch (e) {
              if (e.message && e.message.includes('cross-origin')) {

                  return this;
              }
              throw e;
          }
      };
  });
})();