---
title: "Surface auth errors in UI (duplicate account, deleted account, generic failures)"
area: auth
priority: P2
status: done
created: 2026-03-25
source: Phase 2+3 verify-work (multiple auth errors show nothing in UI)
---

## Problem

PasswordForm's `signIn` call has no error handling — errors are swallowed. Multiple scenarios produce silent failures:

1. **Signup with existing email** → `Account already exists` (raw Convex error, nothing in UI)
2. **Signin after account deletion** → `InvalidAccountId` (raw Convex error, nothing in UI)
3. **Any other auth error** → silently fails, user sees nothing

## Expected Behavior

- Catch errors from `signIn` call in PasswordForm
- Parse known error messages and show friendly text:
  - "already exists" → "An account with this email already exists. Try signing in."
  - "InvalidAccountId" → "No account found with this email. Try signing up."
  - Generic → "Something went wrong. Please try again."
- Display error message below the form fields

## File

`src/features/auth/components/PasswordForm.tsx` — add `catch` block with error state, render error message.
