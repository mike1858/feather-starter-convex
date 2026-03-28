---
title: "Hide or disable auth provider buttons when credentials not configured"
area: auth
priority: P2
status: done
created: 2026-03-25
source: Phase 2 verify-work (GitHub button sends client_id=undefined → 404 on GitHub)
---

## Problem

GitHub OAuth button is always visible even when `AUTH_GITHUB_ID` is not set. Clicking it redirects to GitHub with `client_id=undefined` → 404. Same issue could apply to OTP button when `AUTH_RESEND_KEY` is not set.

## Fix

Either:
1. **Hide buttons** when their env vars aren't configured (requires a query/config endpoint that reports which providers are available)
2. **Catch the error** and show a message like "GitHub sign-in is not configured. Contact your administrator."

Option 1 is the chosen approach. Requires a backend query that reports which providers have credentials configured. Login page conditionally renders buttons based on that.
