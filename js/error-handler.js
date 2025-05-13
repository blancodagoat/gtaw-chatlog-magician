(function () {

  window.addEventListener('error', function (event) {

      if (event.message && (
              event.message.includes('Font Awesome') ||
              event.message.includes('Glyph bbox') ||
              event.message.includes('webfonts')
          )) {

          event.preventDefault();
          return true;
      }

      if (event.message && (
              event.message.includes('clipboard') ||
              event.message.includes('Clipboard')
          )) {

          event.preventDefault();
          return true;
      }

  });

  window.addEventListener('unhandledrejection', function (event) {

      if (event.reason && typeof event.reason.message === 'string' && (
              event.reason.message.includes('Font Awesome') ||
              event.reason.message.includes('Glyph bbox') ||
              event.reason.message.includes('webfonts')
          )) {

          event.preventDefault();
          return true;
      }

      if (event.reason && typeof event.reason.message === 'string' && (
              event.reason.message.includes('clipboard') ||
              event.reason.message.includes('Clipboard')
          )) {

          event.preventDefault();
          return true;
      }

  });

  function logDetailedError(err, context = 'Global Error') {
      try {
          const time = new Date().toISOString();
          const ua = navigator.userAgent;
          const url = window.location.href;
          let stack = (err && err.stack) ? err.stack : (err && err.error && err.error.stack) ? err.error.stack : undefined;
          let message = (err && err.message) ? err.message : (typeof err === 'string' ? err : undefined);
          let type = (err && err.name) ? err.name : (err && err.constructor && err.constructor.name) ? err.constructor.name : typeof err;
          const details = {
              Timestamp: time,
              Context: context,
              URL: url,
              UserAgent: ua,
              Type: type,
              Message: message,
              Stack: stack,
              Raw: err
          };
          window.lastErrorLog = details;
          if (console && console.groupCollapsed) {
              console.groupCollapsed(`%c[${context}] %c${message || 'Unknown error'} %c@${time}`, 'color:#fff;background:#c0392b;padding:2px 4px;border-radius:3px;', 'color:#e67e22;', 'color:#888;font-size:0.95em;');
              console.log('%cType:', 'color:#3498db;', type);
              console.log('%cURL:', 'color:#27ae60;', url);
              console.log('%cUser Agent:', 'color:#8e44ad;', ua);
              if (stack) console.log('%cStack:', 'color:#e67e22;', stack);
              console.log('%cRaw:', 'color:#888;', err);
              console.groupEnd();
          } else {
              console.log(`[${context}] ${message || 'Unknown error'} @${time}`);
              console.log(details);
          }
      } catch (logerr) {

          console.log('Error in error logger:', logerr, err);
      }
  }

  window.addEventListener('error', function (event) {
      if (event.message && (
              event.message.includes('Font Awesome') ||
              event.message.includes('Glyph bbox') ||
              event.message.includes('webfonts')
          )) {
          event.preventDefault();
          return true;
      }
      if (event.message && (
              event.message.includes('clipboard') ||
              event.message.includes('Clipboard')
          )) {
          event.preventDefault();
          return true;
      }
      logDetailedError(event.error || event, 'Global Error');
  });

  window.addEventListener('unhandledrejection', function (event) {
      if (event.reason && typeof event.reason.message === 'string' && (
              event.reason.message.includes('Font Awesome') ||
              event.reason.message.includes('Glyph bbox') ||
              event.reason.message.includes('webfonts')
          )) {
          event.preventDefault();
          return true;
      }
      if (event.reason && typeof event.reason.message === 'string' && (
              event.reason.message.includes('clipboard') ||
              event.reason.message.includes('Clipboard')
          )) {
          event.preventDefault();
          return true;
      }
      logDetailedError(event.reason || event, 'Unhandled Promise Rejection');
  });

  const originalConsoleError = console.error;
  console.error = function () {

      const errorText = Array.from(arguments).join(' ');

      if (

          errorText.includes('Font Awesome') ||
          errorText.includes('webfonts') ||
          errorText.includes('Glyph bbox') ||

          errorText.includes('source map') ||
          errorText.includes('sourcemap') ||
          errorText.includes('.map') ||

          errorText.includes('@wxt-dev/storage') ||
          errorText.includes('Storage migration') ||

          errorText.includes('cross-origin') ||
          errorText.includes('XrayWrapper') ||

          errorText.includes('clipboard') ||
          errorText.includes('Clipboard')
      ) {
          return;
      }

      return originalConsoleError.apply(console, arguments);
  };

  const originalConsoleWarn = console.warn;
  console.warn = function () {

      const warnText = Array.from(arguments).join(' ');

      if (

          warnText.includes('Font Awesome') ||
          warnText.includes('webfonts') ||
          warnText.includes('Glyph bbox') ||

          warnText.includes('source map') ||
          warnText.includes('sourcemap') ||
          warnText.includes('.map') ||

          warnText.includes('@wxt-dev/storage') ||
          warnText.includes('Storage migration') ||

          warnText.includes('clipboard') ||
          warnText.includes('Clipboard')
      ) {
          return;
      }

      return originalConsoleWarn.apply(console, arguments);
  };

  const originalConsoleLog = console.log;
  let suppressLogs = !(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  if (suppressLogs) {
      console.log = function () {};
  }
  console.log = function () {

      const logText = Array.from(arguments).join(' ');

      if (

          logText.includes('@wxt-dev/storage') ||
          logText.includes('Storage migration') ||

          (logText.includes('clipboard') || logText.includes('Clipboard')) &&
          !logText.includes('Clipboard API failed, trying fallback')
      ) {
          return;
      }

      return originalConsoleLog.apply(console, arguments);
  };
})();