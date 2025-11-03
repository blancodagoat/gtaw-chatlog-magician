/**
 * Vercel Serverless Function - Bug Report Proxy
 * 
 * This keeps your Discord webhook URL completely private!
 * The webhook URL is stored as an environment variable in Vercel.
 * 
 * Setup in Vercel Dashboard:
 * 1. Go to your project settings
 * 2. Environment Variables
 * 3. Add: DISCORD_WEBHOOK_URL = your_webhook_url
 * 4. Add: DEVELOPER_EMAIL = your_email (optional)
 */

// naive in-memory rate limiter (best-effort within a single function instance)
const RATE_WINDOW_MS = 60_000; // 1 minute
const RATE_MAX = 5;
const requestLog = new Map(); // key -> [timestamps]

function allowRequest(key) {
  const now = Date.now();
  const windowStart = now - RATE_WINDOW_MS;
  const arr = (requestLog.get(key) || []).filter((t) => t > windowStart);
  if (arr.length >= RATE_MAX) return false;
  arr.push(now);
  requestLog.set(key, arr);
  return true;
}

module.exports = async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS headers for your domain
  res.setHeader('Access-Control-Allow-Origin', '*'); // Consider restricting to your domain in production
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // basic rate limit by session or IP
    const key = (req.body && req.body.sessionId) || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    if (!allowRequest(String(key))) {
      return res.status(429).json({ error: 'Too many reports. Please wait and try again.' });
    }

    const {
      sessionId,
      userAgent,
      platform,
      errorCount,
      warningCount,
      errors,
      performance,
      fullReport
    } = req.body;

    // Basic validation
    if (typeof sessionId !== 'string' || typeof fullReport !== 'string') {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Sanitize/limit payload sizes
    const safeErrorCount = Number.isFinite(errorCount) ? Math.min(errorCount, 1000) : 0;
    const safeWarningCount = Number.isFinite(warningCount) ? Math.min(warningCount, 1000) : 0;
    const safeUA = (typeof userAgent === 'string' ? userAgent : '').slice(0, 256);
    const safePlatform = (typeof platform === 'string' ? platform : '').slice(0, 64);
    const safeErrors = Array.isArray(errors) ? errors.slice(0, 10).map(e => ({
      message: (e && typeof e.message === 'string' ? e.message.slice(0, 300) : ''),
      stack: (e && typeof e.stack === 'string' ? e.stack.slice(0, 500) : undefined)
    })) : [];
    const safePerf = performance && typeof performance === 'object' ? performance : undefined;
    const truncatedReport = fullReport.slice(0, 4000);

    // Get webhook URL from environment variable (kept private!)
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    const developerEmail = process.env.DEVELOPER_EMAIL;

    // Try Discord first
    if (webhookUrl) {
      const embed = {
        title: '🐛 Bug Report - Chatlog Magician',
        description: safeErrorCount > 0 ? `**${safeErrorCount} error(s) detected**` : 'No errors (user feedback)',
        color: safeErrorCount > 0 ? 0xff0000 : 0xffa500,
        fields: [
          {
            name: '📋 Session Info',
            value: `**ID:** ${sessionId}\n**Browser:** ${(safeUA || '').split(' ').pop()}\n**Platform:** ${safePlatform || 'Unknown'}`,
            inline: false
          },
          {
            name: '⚡ Performance',
            value: safePerf?.timing ? 
              `Load: ${safePerf.timing.loadTime}ms\nMemory: ${safePerf.memory?.usedJSHeapSize || 'N/A'}` :
              'Not available',
            inline: true
          },
          {
            name: '📊 Summary',
            value: `Errors: ${safeErrorCount || 0}\nWarnings: ${safeWarningCount || 0}`,
            inline: true
          }
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: 'GTAW Chatlog Magician Error Reporter'
        }
      };

      // Add errors if any
      if (safeErrors && safeErrors.length > 0) {
        const errorSummary = safeErrors.slice(0, 3).map((err, i) => 
          `${i + 1}. ${err.message}`
        ).join('\n');
        embed.fields.push({
          name: '❌ Recent Errors',
          value: '```\n' + errorSummary + '\n```',
          inline: false
        });
      }

      const payload = {
        username: 'Bug Reporter',
        avatar_url: 'https://cdn.discordapp.com/embed/avatars/0.png',
        embeds: [embed],
        content: '**New bug report received!**\n\n```\n' + (truncatedReport || '') + '\n...\n```'
      };

      // Send to Discord
      const discordResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (discordResponse.ok) {
        return res.status(200).json({ 
          success: true, 
          message: 'Report sent to Discord',
          method: 'discord'
        });
      } else {
        console.error('Discord webhook failed:', discordResponse.status);
        // Continue to email fallback
      }
    }

    // Try email fallback if Discord failed or not configured
    if (developerEmail) {
      // Note: For email, you'd need another serverless function or use client-side FormSubmit
      // For now, return error to trigger client-side email fallback
      return res.status(500).json({ 
        error: 'Discord failed, use client-side email fallback',
        fallback: 'email'
      });
    }

    return res.status(500).json({ 
      error: 'No reporting method configured',
      fallback: 'manual'
    });

  } catch (error) {
    console.error('Error in bug report handler:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      fallback: 'manual'
    });
  }
};

