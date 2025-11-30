# Cloudflare Pages Migration Guide

This project has been migrated from Vercel to Cloudflare Pages.

## Deployment Steps

### 1. Connect Repository to Cloudflare Pages

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Pages** → **Create a project**
3. Connect your Git repository
4. **IMPORTANT - Configure build settings:**
   - **Framework preset**: `None` or `Other`
   - **Build command**: ⚠️ **LEAVE COMPLETELY EMPTY** - do NOT enter `/`, do NOT enter `npx wrangler deploy`, do NOT enter anything. The field should be blank.
   - **Build output directory**: `/` (just type a forward slash `/`)
   - **Root directory**: `/` (just type a forward slash `/`)
   - **Node.js version**: `22` (or latest)

**⚠️ CRITICAL:** 
- Build command = **EMPTY/BLANK** (not `/`, not any text, just empty)
- Build output directory = `/` (this is the directory path, not the command)
- If you see "Permission denied" or "Executing user deploy command: /", you set the build command to `/` by mistake - clear it completely!

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

## Troubleshooting

### Error: "Missing entry-point to Worker script" or "Executing user deploy command: npx wrangler deploy"

**Problem:** Cloudflare Pages is trying to use `npx wrangler deploy` which is for Workers, not Pages. This happens when a build command is set in the dashboard.

**Solution - STEP BY STEP:**
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Pages** → **Your Project Name**
3. Click **Settings** (left sidebar)
4. Click **Builds & deployments** (under Settings)
5. Find the **Build configuration** section
6. Click **Edit configuration** or the pencil icon
7. **DELETE/CLEAR the "Build command" field** - make it completely empty (not `/`, not any text, just blank)
8. Set **Build output directory** to `/` (this is a directory path, not a command)
9. Set **Root directory** to `/` (this is a directory path, not a command)
10. **Framework preset**: Select `None` or `Other`
11. Click **Save**
12. Go to **Deployments** tab and click **Retry deployment** or push a new commit

**⚠️ IMPORTANT DISTINCTION:**
- **Build command** = EMPTY/BLANK (this is what gets executed - leave it empty!)
- **Build output directory** = `/` (this is where files are served from - this is correct!)
- If you see "Permission denied" or "Executing user deploy command: /", you accidentally put `/` in the build command field - clear it!

### Functions Not Working

- Make sure `functions/api/report-bug.js` exists in your repository
- Cloudflare Pages automatically detects Functions in the `functions/` directory
- No additional configuration needed

### Environment Variables Not Working

- Make sure variables are set in **Settings** → **Environment Variables**
- Variables are available in Functions via `env.DISCORD_WEBHOOK_URL`
- Redeploy after adding/changing variables

## Support

If you encounter issues:
1. Check Cloudflare Pages build logs
2. Check browser console for errors
3. Verify environment variables are set correctly
4. Test the `/api/report-bug` endpoint manually
5. Make sure build command is **empty** (not `npx wrangler deploy`)

