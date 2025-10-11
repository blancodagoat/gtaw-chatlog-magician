/**
 * Configuration Template for Automated Bug Reporting
 * 
 * SETUP INSTRUCTIONS (Vercel Deployment):
 * ============================================================
 * 1. Copy this file to js/config.js:
 *    cp js/config.example.js js/config.js
 * 
 * 2. Add your Discord webhook to Vercel Environment Variables:
 *    - Vercel Dashboard → Settings → Environment Variables
 *    - Add: DISCORD_WEBHOOK_URL = your_webhook_url
 *    - Add: DEVELOPER_EMAIL = your_email (optional fallback)
 * 
 * 3. Deploy to Vercel:
 *    git push origin main
 * 
 * 4. Your webhook URL stays 100% private on the server!
 * 
 * Note: js/config.js is in .gitignore (never committed to git)
 */

const BUG_REPORT_CONFIG = {
  // Use serverless proxy (keeps webhook private on Vercel)
  USE_SERVERLESS_PROXY: true,
  
  // Leave empty - webhook is in Vercel environment variables (secure!)
  DISCORD_WEBHOOK_URL: '',
  
  // Your email for bug reports (uses FormSubmit.co - free service)
  // Used as fallback if Discord fails
  DEVELOPER_EMAIL: '', // e.g. 'youremail@gmail.com'
  
  // FormSubmit.co endpoint (free service for static sites)
  FORMSUBMIT_ENDPOINT: 'https://formsubmit.co/',
  
  // Rate limiting to prevent spam
  RATE_LIMIT: {
    ENABLED: true,
    MAX_REPORTS_PER_SESSION: 5,      // Max reports per session
    COOLDOWN_SECONDS: 60,             // Seconds between reports
  },
  
  // What to do if auto-send fails
  FALLBACK_TO_MANUAL_COPY: true,      // Show copy dialog if auto-send fails
  
  // Show success message after sending
  SHOW_SUCCESS_MESSAGE: true,
  
  // Include chat log content in report (might be long)
  INCLUDE_CHATLOG_IN_REPORT: false,   // Set to true to include user's chat log text
};

// Make config globally available
window.BUG_REPORT_CONFIG = BUG_REPORT_CONFIG;

