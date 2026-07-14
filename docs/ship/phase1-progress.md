# Phase 1 progress (updated)

## Proven live against project `zwbrgxhehaufkypeiewh`

```text
PASS: email/password sign-in works for two users
PASS: authenticated insert into gym_profiles
PASS: User B cannot read User A's gym_profiles
PASS: User B update affected 0 rows
PASS: User B cannot read User A's user_preferences
PASS: User B cannot read User A's workouts
PASS: anon cannot insert gym_profiles
WARN: delete_own_account RPC not in schema yet
```

Command: `npx tsx scripts/verifyRlsIsolation.ts`

## Code complete

| Gap | Status |
|-----|--------|
| G1.1 Email auth UI + API | done |
| G1.2 Session storage SecureStore/AsyncStorage | done |
| G1.3 Sign-out + AppState reset | done |
| G1.4 Password reset API + deep link scheme | done (dashboard allowlist still needed for email link) |
| G1.5 Fake OAuth removed | done |
| G1.6 RLS two-user | done (script green) |
| G1.7 Account deletion | **partial** — migration file ready; client wipes owned rows then signs out if RPC missing; auth.users hard-delete needs applying `20260713000000_delete_own_account.sql` in Supabase SQL editor |

## Ops blocker for full G1.7

Apply in Supabase SQL editor (no local supabase CLI link):

`supabase/migrations/20260713000000_delete_own_account.sql`

Then re-run `npx tsx scripts/verifyRlsIsolation.ts` and confirm `PASS: delete_own_account RPC`.

## Phase 1 PROOF gate

Do **not** mark Phase 1 fully proven until that migration is applied (or product accepts data-wipe-only deletion for v1).
