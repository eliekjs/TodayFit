# Privacy & account deletion (v1 launch ops)

**Product:** TodayFit  
**Related:** [SHIP_SPEC.md](./SHIP_SPEC.md), in-app Delete account on Profile

## Data we collect / sync (signed-in)

When Supabase is configured and the user signs in:

- Account: email (Supabase Auth)
- Gym profiles & equipment
- Preferences & presets (goal + sport)
- Workout history, saved workouts, week plans

## Guest

Guest use is ephemeral. Welcome copy states guest sessions are not saved to the cloud. No guest durability in v1.

## Account deletion

1. Profile → **Delete account**
2. App attempts `delete_own_account` RPC (hard-deletes `auth.users` when migration applied)
3. Fallback: deletes owned app rows via RLS, then signs out

**Ops residual:** Apply `supabase/migrations/20260713000000_delete_own_account.sql` so Auth user rows are removed, not only app data.

## Store listing checklist

- [ ] Privacy policy URL hosted and linked in App Store / Play Console
- [ ] Data safety / App Privacy answers match tables above
- [ ] Account deletion discoverable in-app (Profile) without support email only
- [ ] Confirm redirect allowlist includes `todayfit://auth/reset-password`

## Crash reporting (G5.2)

Not wired in v1 yet. Recommended follow-up: Sentry (or Expo compatible) on release builds only. Tracked as ship residual if launching without it — prefer wire before public store.
