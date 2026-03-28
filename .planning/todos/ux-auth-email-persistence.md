---
title: "Persist email across auth forms (sign-in → forgot password → sign-up)"
area: auth
priority: P3
status: done
created: 2026-03-25
source: Phase 2 verify-work (user entered email, navigated to forgot password, had to re-enter)
---

## Problem

When user enters email on sign-in form then clicks "Forgot password?", the email field is empty on the password reset form. Same when toggling between sign-in and sign-up.

## Fix

Lift email state up to the parent auth page (or use URL search params) so it persists across form switches. Pass as `defaultEmail` prop to PasswordForm, PasswordResetForm, and OTP form.
