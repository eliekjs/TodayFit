# Implementation follow-through (post ship proofs)

**Date:** 2026-07-12

## Done this pass

- TypeScript clean (`tsc --noEmit` no errors)
- Password reset deep link: `app/auth/reset-password.tsx`, Linking consume + PKCE, auto-redirect on `PASSWORD_RECOVERY`
- Account deletion wipe hardened; `npm run ship:apply-delete-account` to apply/probe RPC
- `npm run ship:gates` green (Manual 65 fidelity + sport stratified + units)

## Still needs human / dashboard

1. **Apply** `supabase/migrations/20260713000000_delete_own_account.sql` in Supabase SQL editor (or set `DATABASE_URL`)
2. **Allowlist** Expo Linking reset URL in Supabase Auth redirect URLs
3. Host privacy policy; store forms
4. Native device QA checklist A–H
5. Optional Sentry

## Verify

```bash
npx tsc --noEmit
npm run ship:gates
npm run ship:apply-delete-account
npx tsx scripts/verifyRlsIsolation.ts
```
