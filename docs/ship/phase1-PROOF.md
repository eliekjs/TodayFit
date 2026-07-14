# Phase 1 proof — Auth & security

**Date:** 2026-07-12  
**Ship exit (SHIP_SPEC):** Real email auth E2E; SecureStore/AsyncStorage session; RLS two-user test pass; account deletion path.

---

## Evidence

| Gap | Result |
|-----|--------|
| **G1.1** Email signup/login | `app/welcome.tsx` + `AuthContext.signInWithPassword` / `signUpWithPassword` |
| **G1.2** Session storage | `lib/db/authStorage.ts` (SecureStore native / AsyncStorage web) wired in `lib/db/client.ts` |
| **G1.3** Sign-out hygiene | `AuthContext.signOut` + AppState reset on `userId` → null |
| **G1.4** Password reset | `resetPasswordForEmail` + `todayfit://auth/reset-password` (allowlist in Supabase dashboard still recommended) |
| **G1.5** Fake OAuth | Removed; **Continue as guest** with honest copy |
| **G1.6** RLS two-user | Live pass via `npx tsx scripts/verifyRlsIsolation.ts` |
| **G1.7** Account deletion | In-app **Delete account** wipes owned rows then signs out. Migration `20260713000000_delete_own_account.sql` hard-deletes `auth.users` when applied (RPC not yet on remote — residual ops) |

### Live RLS output (excerpt)

```text
PASS: email/password sign-in works for two users
PASS: User B cannot read User A's gym_profiles
PASS: User B update affected 0 rows
PASS: User B cannot read User A's user_preferences / workouts
PASS: anon cannot insert gym_profiles
WARN: delete_own_account RPC not available yet (migration pending apply)
RLS isolation checks passed.
```

### Unit

```bash
npx vitest run lib/db/client.test.ts
# 2/2 passed
```

---

## Residual ops (non-blocking for Phase 1 code exit)

1. Apply `supabase/migrations/20260713000000_delete_own_account.sql` in Supabase SQL editor.
2. Re-run `npx tsx scripts/verifyRlsIsolation.ts` until `PASS: delete_own_account RPC`.
3. Add `todayfit://auth/reset-password` to Supabase Auth redirect allowlist.

## Verdict

**Phase 1 COMPLETE** for ship bar (auth + session + RLS + deletion path). Hard `auth.users` delete awaits one dashboard SQL apply.
