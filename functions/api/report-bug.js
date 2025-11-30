/**
 * Cloudflare Pages Function - Bug Report Proxy
 * 
 * This keeps your Discord webhook URL completely private!
 * The webhook URL is stored as an environment variable in Cloudflare Pages.
 * 
 * Setup in Cloudflare Pages Dashboard:
 * 1. Go to your project settings
 * 2. Settings → Environment Variables
 * 3. Add: DISCORD_WEBHOOK_URL = your_webhook_url
 * 4. Add: DEVELOPER_EMAIL = your_email (optional)
 */

// Naive in-memory rate limiter (best-effort within a single function instance)
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

export async function onRequestPost(context) {
  const { request, env } = context;

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // Consider restricting to your domain in production
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    // Basic rate limit by session or IP
    const body = await request.json();
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
    const key = body?.sessionId || clientIP;
    
    if (!allowRequest(String(key))) {
      return new Response(
        JSON.stringify({ error: 'Too many reports. Please wait and try again.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
    } = body;

    // Basic validation
    if (typeof sessionId !== 'string' || typeof fullReport !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
    // Discord content field has 2000 char limit, leave room for markdown formatting
    const truncatedReport = fullReport.slice(0, 1800);

    // Get webhook URL from environment variable (kept private!)
    const webhookUrl = env.DISCORD_WEBHOOK_URL;
    const developerEmail = env.DEVELOPER_EMAIL;

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
        // Discord field value limit is 1024 chars
        const truncatedErrorSummary = errorSummary.slice(0, 1000);
        embed.fields.push({
          name: '❌ Recent Errors',
          value: '```\n' + truncatedErrorSummary + '\n```',
          inline: false
        });
      }

      // Build content field respecting Discord's 2000 char limit
      let content = '**New bug report received!**\n\n';
      if (truncatedReport) {
        // Calculate remaining space for report
        const headerLength = content.length;
        const codeBlockFormatting = '```\n...\n```'.length;
        const maxReportLength = 2000 - headerLength - codeBlockFormatting;
        const finalReport = truncatedReport.slice(0, maxReportLength);
        content += '```\n' + finalReport + '\n```';
      }

      const payload = {
        username: 'Bug Reporter',
        avatar_url: 'https://cdn.discordapp.com/embed/avatars/0.png',
        embeds: [embed],
        content: content
      };

      // Validate Discord limits before sending
      if (content.length > 2000) {
        console.error('Content exceeds Discord limit:', content.length);
        // Truncate further if needed
        payload.content = content.slice(0, 1990) + '...```';
      }

      // Send to Discord
      const discordResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (discordResponse.ok) {
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Report sent to Discord',
            method: 'discord'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        const errorText = await discordResponse.text().catch(() => 'Unable to read error');
        console.error('Discord webhook failed:', {
          status: discordResponse.status,
          statusText: discordResponse.statusText,
          error: errorText,
          contentLength: content.length,
          embedFieldsCount: embed.fields.length
        });
        // Continue to email fallback
      }
    }

    // Try email fallback if Discord failed or not configured
    if (developerEmail) {
      // Note: For email, you'd need another function or use client-side FormSubmit
      // For now, return error to trigger client-side email fallback
      return new Response(
        JSON.stringify({ 
          error: 'Discord failed, use client-side email fallback',
          fallback: 'email'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        error: 'No reporting method configured',
        fallback: 'manual'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in bug report handler:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        fallback: 'manual'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Handle OPTIONS for CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

