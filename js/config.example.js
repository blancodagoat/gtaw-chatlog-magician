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
  
  
  // Rate limiting to prevent spam
  RATE_LIMIT: {
    ENABLED: true,
    MAX_REPORTS_PER_SESSION: 5,      // Max reports per session
    COOLDOWN_SECONDS: 60,             // Seconds between reports
  },
  
  // What to do if auto-send fails
  FALLBACK_TO_MANUAL_COPY: true,      // Copy to clipboard if auto-send fails
  
  // Show success message after sending
  SHOW_SUCCESS_MESSAGE: true,
};

// Make config globally available
window.BUG_REPORT_CONFIG = BUG_REPORT_CONFIG;

