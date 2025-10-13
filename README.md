<section class="bg-gray-900 text-white p-6 rounded-xl shadow-2xl max-w-3xl mx-auto mt-10">
  <h1 id="chatlog-magician-for-gta-world" class="text-4xl font-extrabold text-center text-blue-400 drop-shadow-md mb-4">
    Chatlog Magician for GTA World
  </h1>
  <p class="text-lg text-gray-300 text-center mb-6">
    This is a <strong class="text-white font-semibold">remake</strong> of the 
    <a href="https://github.com/ulasbayraktar/chatlog-magician" class="text-blue-500 hover:text-blue-300 underline transition-all duration-300">
      original Chatlog Magician
    </a> project, which converts SA-MP logs into images—making screenshot editing easier.
  </p>
  <div class="border-t border-purple-500 mb-4"></div>
  <h4 id="credits" class="text-2xl font-semibold text-purple-300 border-b border-purple-500 pb-2 mb-4">
    Credits
  </h4>
  <ul class="list-disc list-inside space-y-2 text-gray-200">
    <li>
      <a href="https://github.com/ulasbayraktar" class="text-blue-400 hover:text-blue-200 font-medium">
        @Ulaş Eren Bayraktar
      </a> — Creator of the original magician for LS-RP
    </li>
    <li>
      <a href="https://forum.gta.world/en/topic/130134-guide-dude-man-template-photoshop-template-with-various-rp-lines-and-colors/" class="text-blue-400 hover:text-blue-200 font-medium">
        @Jax
      </a> — Created the template that inspired the coloring & formatting logic
    </li>
    <li>
      <a href="https://github.com/blancodagoat" class="text-blue-400 hover:text-blue-200 font-medium">
        @blanco
      </a> — Contributed enhancements and performance optimizations
    </li>
  </ul>
  
  <div class="border-t border-purple-500 mt-6 mb-4"></div>
  
  <h2 id="automatic-error-detection" class="text-2xl font-semibold text-purple-300 border-b border-purple-500 pb-2 mb-4">
    🤖 Automatic Error Detection System
  </h2>
  
  <p class="text-gray-300 mb-4">
    The application now features an intelligent automatic error detection and analysis system that monitors for technical issues without requiring user interaction.
  </p>
  
  <h3 class="text-xl font-semibold text-blue-300 mb-3">Key Features:</h3>
  <ul class="list-disc list-inside space-y-2 text-gray-200 mb-4">
    <li><strong>Automatic Detection:</strong> Continuously monitors for JavaScript errors, performance issues, and memory leaks</li>
    <li><strong>Smart Classification:</strong> Categorizes errors by severity (Critical, High, Medium, Low)</li>
    <li><strong>Performance Monitoring:</strong> Tracks FPS, memory usage, API latency, and DOM performance</li>
    <li><strong>Automatic Reporting:</strong> Sends reports when error thresholds are exceeded</li>
    <li><strong>Visual Indicators:</strong> Shows a floating status indicator (bottom-right corner):
      <ul class="list-none ml-6 mt-2">
        <li>🟢 Green = Healthy</li>
        <li>🟡 Orange = Degraded Performance</li>
        <li>🔴 Red = Critical Issues</li>
      </ul>
    </li>
    <li><strong>Silent Operation:</strong> Works in the background without interrupting users</li>
  </ul>
  
  <h3 class="text-xl font-semibold text-blue-300 mb-3">What It Monitors:</h3>
  <ul class="list-disc list-inside space-y-2 text-gray-200 mb-4">
    <li>JavaScript errors and unhandled promise rejections</li>
    <li>Memory usage and potential memory leaks</li>
    <li>Network errors and API failures</li>
    <li>Performance degradation (FPS drops, slow DOM updates)</li>
    <li>Resource loading failures</li>
    <li>Console errors and warnings</li>
  </ul>
  
  <h3 class="text-xl font-semibold text-blue-300 mb-3">Configuration:</h3>
  <p class="text-gray-300 mb-2">
    To customize the auto-detection behavior:
  </p>
  <ol class="list-decimal list-inside space-y-2 text-gray-200 mb-4">
    <li>Copy <code class="bg-gray-800 px-2 py-1 rounded">js/auto-detector-config.example.js</code> to <code class="bg-gray-800 px-2 py-1 rounded">js/auto-detector-config.js</code></li>
    <li>Modify the thresholds and settings as needed</li>
    <li>The detector will automatically load your custom configuration</li>
  </ol>
  
  <h3 class="text-xl font-semibold text-blue-300 mb-3">Manual Controls:</h3>
  <p class="text-gray-300 mb-2">
    While the system works automatically, you can also control it via the browser console:
  </p>
  <pre class="bg-gray-800 p-3 rounded-lg overflow-x-auto text-sm mb-4">
<code class="text-green-400">// Check current status
AutoErrorDetector.getStatus()

// Show health details modal
AutoErrorDetector.showHealthDetails()

// Force send a report
AutoErrorDetector.forceReport()

// Stop/start detection
AutoErrorDetector.stop()
AutoErrorDetector.start()</code>
  </pre>
  
  <div class="bg-blue-900 bg-opacity-50 border-l-4 border-blue-500 p-4 rounded">
    <p class="text-blue-200">
      <strong>Note:</strong> The old "Report Bug" button has been replaced with this automatic system. 
      A manual report button will only appear when the system detects issues, giving users the option to add additional context.
    </p>
  </div>
</section>
