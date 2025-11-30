# Cloudflare Pages Migration Guide

This project has been migrated from Vercel to Cloudflare Pages.

## Deployment Steps

### 1. Connect Repository to Cloudflare Pages

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Pages** → **Create a project**
3. Connect your Git repository
4. Configure build settings:
   - **Build command**: (leave empty - static site)
   - **Build output directory**: `/` (root)
   - **Root directory**: `/` (root)

### 2. Set Environment Variables

In Cloudflare Pages dashboard:
1. Go to **Settings** → **Environment Variables**
2. Add the following:
   - `DISCORD_WEBHOOK_URL` = your Discord webhook URL
   - `DEVELOPER_EMAIL` = your email (optional)

### 3. Configure Custom Domain (Optional)

1. Go to **Custom domains** in your Pages project
2. Add your domain
3. Follow DNS setup instructions

## Key Changes from Vercel

### Files Changed:
- ✅ Created `_headers` - Cloudflare Pages headers configuration
- ✅ Created `_redirects` - Cloudflare Pages redirects configuration
- ✅ Created `functions/api/report-bug.js` - Cloudflare Pages Function (replaces Vercel serverless)
- ✅ Removed Vercel Speed Insights
- ✅ Removed Vercel Web Analytics
- ✅ Updated CSP headers (removed Vercel-specific domains)

### API Endpoint:
- **Old (Vercel)**: `/api/report-bug`
- **New (Cloudflare)**: `/api/report-bug` (same path, different implementation)

The bug report API endpoint works the same way, but now uses Cloudflare Pages Functions instead of Vercel serverless functions.

## Cache Busting

The site uses version query strings (`?v=1.1.0`) for cache busting. When deploying updates:
1. Update version in `index.html` (find & replace `?v=X.X.X`)
2. Deploy to Cloudflare Pages

## Testing

After deployment, test:
- ✅ Site loads correctly
- ✅ Bug report submission works (check Discord webhook)
- ✅ All assets load (CSS, JS, fonts)
- ✅ Image overlay functionality works
- ✅ Download functionality works

## Support

If you encounter issues:
1. Check Cloudflare Pages build logs
2. Check browser console for errors
3. Verify environment variables are set correctly
4. Test the `/api/report-bug` endpoint manually

