---
title: "Username lowercasing has no user feedback + settings form doesn't sync with server state"
area: settings
priority: P3
status: done
created: 2026-03-25
source: Phase 3 verify-work (user entered "Siraj", saw "siraj", tried updating in settings with no visible result)
---

## Problems

1. **No feedback on case normalization** — Username Zod schema has `.toLowerCase()`, so "Siraj" silently becomes "siraj". User sees lowercase without understanding why. Onboarding and settings should show a hint like "Usernames are lowercase only."

2. **Settings form doesn't re-sync with server** — TanStack React Form `defaultValues` is set once from `user?.username`. If user loads after initial render, form may show stale value. Submitting "Siraj" lowercases to "siraj" (same as stored), so nothing visually changes. Form should reset `defaultValues` when `user` data changes.
