---
description: How to deploy updates to Samathi Clock PWA (Cloudflare Pages)
---

# Deploy Workflow

// turbo-all

## Pre-deploy Checklist

> **CRITICAL: Every deploy MUST bump the Service Worker cache version!**
> If you skip this, users will NOT receive the update because the browser
> will not detect a change in `sw.js` and will keep serving old cached files.

1. Open `sw.js` and bump `CACHE_NAME` version number (e.g. `samathi-clock-v1.3` → `samathi-clock-v1.4`)
2. If any NEW files were added to the project that are used by `index.html`, add them to the `STATIC_ASSETS` array in `sw.js`
3. If any files were REMOVED, also remove them from `STATIC_ASSETS`

## Deploy Steps

1. Stage all changed files: `wsl git add -A`
2. Commit with descriptive message: `wsl git commit -m "feat: <description>"`
3. Push to main: `wsl git push origin main`
4. Cloudflare Pages will auto-deploy from the `main` branch

## How the Update System Works

- `sw.js` uses `skipWaiting()` + `clients.claim()` so the new SW activates immediately
- On activation, SW sends `postMessage({ type: 'SW_UPDATED' })` to all open tabs
- `index.html` listens for this message and shows an update toast at the bottom
- User taps "รีเฟรชเลย" to reload and get the new version

## Important Notes

- **Git commands**: Always use `wsl` prefix (e.g. `wsl git status`). Never use PowerShell directly — it corrupts Thai UTF-8 text.
- **Cache strategy**: Cache-First — files are served from cache first, network is only used on cache miss. This means the user always gets the cached version until SW updates.
- **Offline**: All files in `STATIC_ASSETS` are cached during SW install, enabling full offline use.
- **Wake Lock**: `index.html` uses Wake Lock API (with NoSleep.js fallback) to keep the screen on during timer. This was added to fix the bug where `setInterval` gets throttled when the screen sleeps — causing the countdown to appear to "bounce back".
