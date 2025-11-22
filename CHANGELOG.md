# Changelog

All notable changes to GTAW Chatlog Magician will be documented in this file.

## [Unreleased] - 2025-11-22

### Fixed

#### Download Issues
- **Fixed chatlog download errors** - Resolved "Failed to execute 'readAsDataURL' on 'FileReader'" error that occurred when downloading chatlogs. The issue was caused by the image generation library trying to embed external fonts (Google Fonts, FontAwesome). Changed font handling to use `skipFonts: true` option to prevent font embedding errors entirely.

#### Error Reporting System
- **Fixed recursive error logging** - The error reporter itself was generating errors when trying to send bug reports. This happened because:
  - The error logger uses a wrapped `fetch` function that logs all network failures
  - When the error logger tried to send reports to `/api/report-bug` (which doesn't exist), the fetch failed
  - This failure was logged by the error logger, creating a recursive loop
  - **Solution**: Changed error reporter to use native `originalFetch` instead of the wrapped version, preventing it from logging its own network errors

### Changed

#### Performance & Caching
- **Disabled aggressive caching for immediate updates** - Changed cache headers from 1-year immutable cache to `max-age=0, must-revalidate` for all static assets (JS, CSS, color palettes, webfonts). This means:
  - You no longer need to hard refresh (Ctrl+Shift+R) to see updates
  - Normal refresh now fetches the latest version
  - Browser still caches files but checks for updates before using cached version
  - Removed invalid image cache header configuration that was causing deployment errors

### Added

#### Analytics
- **Vercel Speed Insights integration** - Added performance monitoring to track page load times and user experience metrics. This helps identify performance bottlenecks and improve site speed over time.

### Previous Updates

#### Call Format Support
- **Incoming call syntax highlighting** - Added support for both simple and full incoming call formats:
  - Full format: `(Phone) Incoming call from Name. Use /pickup to answer or /hangup to decline.`
  - Simple format: `(Phone) Incoming call from Name.`
  - Phone identifier (e.g., "iFruit 15") highlights in yellow
  - Caller name highlights in yellow
  - Variable phone names inside parentheses are properly captured

---

## How to Read This Changelog

- **Fixed** - Bug fixes and error corrections
- **Changed** - Changes to existing functionality
- **Added** - New features and capabilities
- **Removed** - Removed features or files
- **Security** - Security-related updates
