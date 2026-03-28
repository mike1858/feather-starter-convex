---
title: "Center login form on page instead of two-panel layout"
area: auth
priority: P3
status: done
created: 2026-03-25
source: Phase 2 verify-work (left panel is mostly blank, form pushed to right side)
---

## Problem

Login page uses a two-panel layout with an empty left panel (logo + quote) and auth form on the right. The left panel is mostly blank space, making the form feel off-center.

## Fix

Center the login form on the page. Remove or simplify the two-panel layout. The quote can go below the form or be removed.

## File

`src/routes/_app/login.tsx` (or wherever the login page layout is defined)
