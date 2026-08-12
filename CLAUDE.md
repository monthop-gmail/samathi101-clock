# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Thai Buddhist meditation timer PWA (เดินจงกรม / นั่งสมาธิ) served as a **static site with no build step** — no `package.json`, no bundler, no framework. The entire live app is one file, `index.html`, containing its own CSS, HTML and JS. The only script dependency is `js/NoSleep.min.js`.

## Commands

```bash
python3 -m http.server 8000      # serve locally; open http://localhost:8000
```

There is no test runner, linter, or build. `test-script.md` is a **manual QA checklist in Thai that must be walked through before every deploy** — it covers the timer flow, sleep alert, guided audio, wake lock, the PWA update toast, and offline mode.

For logic that can be reasoned about in isolation (countdown math, sequence state), extract it into a throwaway Node script rather than trying to run the page headlessly.

## Deploying

Push to `main` → GitHub Actions (`.github/workflows/deploy.yml`) runs `wrangler pages deploy .` to Cloudflare Pages. The README says `master`; that is stale — the branch is `main`.

**Every deploy must bump `CACHE_NAME` in `sw.js`.** The service worker is cache-first, so without a new cache name users keep being served the old files forever and never see the update toast. Keep the visible version label in `index.html` (top-right of the timer card) in sync with it. If you add or remove a file that `index.html` depends on, update `STATIC_ASSETS` in `sw.js` too.

## Frozen files — do not modify

`index.html` is the app. These are kept deliberately as a **stable known-good fallback** and must not be edited, refactored, or "cleaned up", even though they lack the current features:

- `index_old.html` — the legacy W3.CSS app, linked from the live app as the "แอพเดิม" button
- `index_th.html`, `index_en.html`, `index_dev.html` — copies of the legacy app
- `phra/` — a separate legacy copy with its own presets

They are useful as a reference: the legacy app's countdown (`index_old.html:440`) already used a wall-clock deadline, which is the pattern the current app was later fixed to use.

## Architecture

All state is plain globals near the top of the script in `index.html` — `remainingSeconds`, `deadline`, `isRunning`, `activePresetId`, and the guide/alert toggles. **Nothing is persisted**: there is no localStorage, so dark mode and every toggle reset on reload.

**Presets drive the guide audio.** `setTimer()` is the hub: choosing `preset2` (เดินจงกรม) or `preset3` (นั่งสมาธิ) auto-enables the matching guide; every other preset disables both. Turning a guide off is what reveals the manual "เปิดเสียงนำ…" buttons for that preset.

**A session is an audio sequence, not just a countdown.** Start is `chime → opening guide → countdown`, and the countdown deliberately does not begin until the guide finishes, so the meditation gets its full 30 minutes. End is `chime → closing guide`, with a 30-second silent gap first in walking mode so the practitioner can walk back to their starting point. Clip lengths matter when reasoning about the flow:

| clip | length | clip | length |
|---|---|---|---|
| `bell-v2.mp3` | 2.4s | `bounce-v2.mp3` | 1.5s |
| `walk-start.mp3` | 15.2s | `walk-end.mp3` | 17.8s |
| `sit-start.mp3` | 50.3s | `sit-end.mp3` | 74.6s |

So a "30 minute" sitting session actually runs ~32 minutes wall-clock, and the clock sits frozen at 30:00 for ~53 seconds at the start. The status line under the dial exists to explain that hold to the user.

Supporting pieces, all in `index.html`:

- `playToEnd()` — plays one clip and resolves when it truly ends. Attaches its `ended` listener *before* `play()`, and carries a watchdog so a swallowed event or a blocked `play()` can never hang the sequence.
- `sequenceToken` — a generation counter. Pause, reset, preset change, and starting a new session all bump it; every step of an in-flight sequence re-checks it and bails, so a stale sequence can never resume over a newer one.
- `scheduleResilient()` — a `setTimeout` that also records its wall-clock due time, so it still fires on return if the OS froze the page through it (used for the 30-second walk-back gap).

## iOS is the constraint that shapes this code

Most of the non-obvious code exists because of Safari on iPhone. Before changing anything in the timer or audio path, know these:

- **Audio permission is per `<audio>` element and only granted inside a user gesture.** Any element that will later be started from a timer or an `ended` handler must have `play()` called on it during a click first — this is what `unlockAudioForMobile()` is for, and why it must not skip any element. Getting this wrong silently drops the guide audio on iPhone while working fine on Android.
- **Timers stop when the page is hidden or the screen is off.** Never count seconds by decrementing on each tick; always recompute against a wall-clock `deadline`. The same applies to `setTimeout` — hence `scheduleResilient()`.
- **The wake lock is dropped whenever the page is hidden and is never restored automatically.** The `visibilitychange` handler re-acquires it and resyncs the clock. It is held through the closing guide, not released when the countdown hits zero.
- **Wake Lock API and service workers need a secure context.** Over plain HTTP on a LAN or public IP, `navigator.wakeLock` is absent (NoSleep.js takes over) and the SW will not register, so those two features cannot be tested that way — use HTTPS.
- **The ring/silent switch still mutes `<audio>` entirely**, regardless of code. This is unhandled; the app only shows a hint telling the user to turn silent mode off.

## Conventions

`.cursorrules` requires communicating with the user in **Thai**, and prefixes all shell commands with `wsl` — that prefix applies only on the maintainer's Windows/WSL machine, not on a native Linux checkout. User-facing strings in the app are Thai; keep them Thai.

`.agent/workflows/` holds the maintainer's deploy and git procedures and is the source of the cache-bump rule above.
