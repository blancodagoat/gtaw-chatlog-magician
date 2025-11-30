#!/bin/bash
# Cloudflare Pages build script - no-op for static site
# This script does nothing since we're deploying a static site
# Cloudflare Pages will automatically serve files from root and detect Functions
echo "Static site - no build needed"
exit 0

