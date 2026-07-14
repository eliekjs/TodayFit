# Phase 2 proof — 2026-07-12

## Exit criteria (SHIP_SPEC)

> Signed-in sync matrix pass (preset apply persists, history IDs, history updates); guest copy honest; **no** guest durability work

## Evidence

| Gap | Status | Proof |
|-----|--------|-------|
| G2.1 applyPreferencePreset upsert | done | `AppStateContext` enqueue `PreferencesRepo.upsertPreferences` on apply |
| G2.2 history server UUID | done | `addCompletedWorkout` remaps `hist_*` → `saveCompletedWorkout` id |
| G2.3 history rename persist | done | `updateCompletedWorkoutName` in `workoutRepository.ts` + AppState persist |
| G2.4 train-today device-local | done | Comment on `DefaultTrainTodayPresetRef` in `defaultTrainTodayPreset.ts` |
| G2.5 guest durability | wont_fix_v1 | User + SHIP_SPEC |
| G2.6 guest→sign-in | done | Cloud wins; documented in phase2-progress.md |
| G2.7 offline | done | Existing Alert path; documented |

## Guest copy

Welcome: “Guest sessions are not saved to the cloud…”

## Verdict

**Phase 2 COMPLETE** (no guest durability by design).
