# Version Management Guide

## Cache-Busting System

This project uses a query parameter versioning system to manage browser caching of JavaScript and CSS files.

### How It Works

1. **HTML files** are set to revalidate on every request (`Cache-Control: public, max-age=0, must-revalidate`)
2. **JS/CSS files** are cached for 1 year with immutable flag (`Cache-Control: public, max-age=31536000, immutable`)
3. **Version parameters** in HTML force browsers to fetch new JS/CSS when changed

### Current Version

**Version: `20251103-001`** (Format: `YYYYMMDD-XXX`)

### When to Increment Version

Increment the version number whenever you make changes to:
- JavaScript files in `/js/` directory
- CSS files in `/css/` directory
- Color palette files in `/color-palette/` directory

### How to Increment Version

1. **Choose new version number:**
   - Use format: `YYYYMMDD-XXX` (e.g., `20251103-002`, `20251104-001`)
   - Date should be deployment date
   - XXX is incremental counter (001, 002, 003, etc.)

2. **Update all version parameters in `index.html`:**
   ```bash
   # Find all occurrences
   grep -n "?v=" index.html

   # Replace old version with new version
   sed -i 's/?v=20251103-001/?v=20251103-002/g' index.html
   ```

3. **Verify changes:**
   ```bash
   grep "?v=" index.html | head -5
   ```

4. **Commit and deploy:**
   ```bash
   git add index.html
   git commit -m "Bump version to 20251103-002"
   git push
   ```

### Files That Need Version Parameters

All script and style tags in `index.html`:
- CSS files: `foundation.fixed.css`, `modern.css`, `app.css`, `overlay.css`, `fontawesome.min.css`, `color-palette.min.css`
- JS files: `va-init.js`, `error-logger.js`, `error-handler.js`, `cross-origin-fix.js`, `cors-handler.js`, `image-dropzone.js`, `image-overlay.js`, `image-renderer.js`, `chat.js`, `color-palette.js`, `chatlog-parser.js`, `app.js`

### Why This System?

**Problem:**
- Vercel caches JS/CSS for 1 year
- Bug fixes weren't reaching users
- Users had to do hard refresh (Ctrl+F5) to get updates

**Solution:**
- Version query parameters create "new" URLs
- Browsers fetch new files when URL changes
- HTML is always fresh, so version updates are immediate
- Old files can be cached forever without issues

### Testing Cache-Busting

After incrementing version:

1. **Check HTML cache headers:**
   ```bash
   curl -I https://gtaw-chatlog-magician.vercel.app/
   # Should see: Cache-Control: public, max-age=0, must-revalidate
   ```

2. **Check JS cache headers:**
   ```bash
   curl -I https://gtaw-chatlog-magician.vercel.app/js/app.js
   # Should see: Cache-Control: public, max-age=31536000, immutable
   ```

3. **Verify version in browser:**
   - Open browser DevTools (F12)
   - Go to Network tab
   - Refresh page
   - Check that JS/CSS files load with new version parameter

### Troubleshooting

**Users still seeing old code:**
- Check that HTML file has `max-age=0, must-revalidate`
- Verify all script/style tags have the new version number
- Users may need to do hard refresh once (Ctrl+F5)
- Check Vercel deployment logs to confirm new version is deployed

**Version mismatch errors:**
- Ensure ALL script/style tags have the SAME version number
- Don't mix old and new version numbers in the same HTML file

### Automation (Future Enhancement)

Consider adding a build script to automate version bumping:

```javascript
// scripts/bump-version.js
const fs = require('fs');
const path = require('path');

const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
const indexPath = path.join(__dirname, '../index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// Extract current version
const currentVersion = html.match(/\?v=(\d{8}-\d{3})/)?.[1];
if (!currentVersion) {
  console.error('No version found in HTML');
  process.exit(1);
}

// Generate new version
const [currentDate, currentNum] = currentVersion.split('-');
const newNum = date === currentDate
  ? String(parseInt(currentNum) + 1).padStart(3, '0')
  : '001';
const newVersion = `${date}-${newNum}`;

// Replace all occurrences
html = html.replace(
  new RegExp(`\\?v=${currentVersion}`, 'g'),
  `?v=${newVersion}`
);

fs.writeFileSync(indexPath, html);
console.log(`Version bumped: ${currentVersion} → ${newVersion}`);
```

Run with: `node scripts/bump-version.js`

### Related Files

- `/index.html` - Contains all version parameters
- `/vercel.json` - Defines cache headers
- `/VERSION_MANAGEMENT.md` - This file
