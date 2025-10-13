/**
 * Configuration for automated bug reporting (Vercel Deployment)
 * 
 * SETUP INSTRUCTIONS FOR VERCEL:
 * 
 * 1. Add your Discord webhook to Vercel Environment Variables:
 *    - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
 *    - Add: DISCORD_WEBHOOK_URL = https://discord.com/api/webhooks/YOUR_WEBHOOK_HERE
 *    - Save
 * 
 * 2. Deploy to Vercel:
 *    - git push origin main
 *    - Vercel auto-deploys with the serverless function
 * 
 * 3. Your webhook stays 100% private (never in browser code!)
 * 4. If serverless function fails, users can copy report to clipboard
 * 
 * Note: This file (js/config.js) is in .gitignore and won't be committed.
 * The serverless function at /api/report-bug reads the webhook from Vercel environment variables.
 */

const BUG_REPORT_CONFIG = {
  // Use serverless proxy (Vercel only - keeps webhook private on server)
  USE_SERVERLESS_PROXY: true,
  
  // Leave these empty - webhook is in Vercel environment variables
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

