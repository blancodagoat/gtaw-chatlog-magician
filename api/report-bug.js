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

module.exports = async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS headers for your domain
  res.setHeader('Access-Control-Allow-Origin', '*'); // Change to your domain in production
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
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
    if (!sessionId || !fullReport) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get webhook URL from environment variable (kept private!)
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    const developerEmail = process.env.DEVELOPER_EMAIL;

    // Try Discord first
    if (webhookUrl) {
      const embed = {
        title: '🐛 Bug Report - Chatlog Magician',
        description: errorCount > 0 ? `**${errorCount} error(s) detected**` : 'No errors (user feedback)',
        color: errorCount > 0 ? 0xff0000 : 0xffa500,
        fields: [
          {
            name: '📋 Session Info',
            value: `**ID:** ${sessionId}\n**Browser:** ${(userAgent || '').split(' ').pop()}\n**Platform:** ${platform || 'Unknown'}`,
            inline: false
          },
          {
            name: '⚡ Performance',
            value: performance?.timing ? 
              `Load: ${performance.timing.loadTime}ms\nMemory: ${performance.memory?.usedJSHeapSize || 'N/A'}` :
              'Not available',
            inline: true
          },
          {
            name: '📊 Summary',
            value: `Errors: ${errorCount || 0}\nWarnings: ${warningCount || 0}`,
            inline: true
          }
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: 'GTAW Chatlog Magician Error Reporter'
        }
      };

      // Add errors if any
      if (errors && errors.length > 0) {
        const errorSummary = errors.slice(0, 3).map((err, i) => 
          `${i + 1}. ${err.message.substr(0, 100)}`
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
        content: '**New bug report received!**\n\n```\n' + (fullReport || '').substr(0, 1800) + '\n...\n```'
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

