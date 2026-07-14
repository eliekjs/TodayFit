# Phase 5 proof — Launch ops

**Date:** 2026-07-12  
**Ship exit:** Privacy/deletion docs; crash reporting assessed; CI ship gates; perf noted.

---

## Evidence

| Gap | Result |
|-----|--------|
| **G5.1** Privacy / deletion | [docs/PRIVACY_AND_DELETION.md](../PRIVACY_AND_DELETION.md); in-app Delete account (Phase 1) |
| **G5.2** Crash reporting | **Not wired** — documented as recommended residual before public store (Sentry/Expo). Accept as known follow-up for soft launch |
| **G5.3** CI ship gates | `scripts/shipGates.sh` + `npm run ship:gates`; wired in `.github/workflows/ci.yml` |
| **G5.4** Perf | Generation uses `GenerationLoadingScreen`; no new mid-device timing run this pass — accept loading UX as existing; measure on device before store |

### Commands

```bash
npm run ship:gates   # fidelity + auth unit gates (CI step)
# Quick subset verified this tick:
npx vitest run lib/db/client.test.ts logic/workoutGeneration/personaFixtures.test.ts  # 6/6
```

## Residual ops (store)

1. Host privacy policy URL; fill App Privacy / Data safety forms from PRIVACY_AND_DELETION.md  
2. Apply `delete_own_account` SQL: `npm run ship:apply-delete-account` (prints SQL if `DATABASE_URL` unset)  
3. Add password-reset redirect URL from `Linking.createURL("auth/reset-password")` to Supabase Auth allowlist  
4. Wire Sentry (or equiv) on release builds  
5. Device generate latency spot-check + iOS/Android full QA checklist  

## Verdict

**Phase 5 COMPLETE** for ship-ops scaffolding. Store submission still needs privacy URL hosting + optional Sentry before public launch.
