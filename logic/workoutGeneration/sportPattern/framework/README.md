# Sport-pattern framework

Generic building blocks for **sport-specific movement-pattern transfer** (separate from abstract training-quality vectors).

Hiking/backpacking is the reference implementation under `sportPatternTransfer/` (`hikingExerciseCategories.ts`, `hikingBackpackingRules.ts`, `hikingSession.ts`, `hikingQualityScoring.ts`).

## What lives here (generic)

| Piece | Role |
|--------|------|
| `types.ts` | `SportPatternSlotRule`, `SportPatternGateResult`, pool modes |
| `gatePool.ts` | Slot gating contract: gated pool only when matches exist; full-pool fallback only when zero matches |
| `slotScoreAdjustment.ts` | Gate/prefer/deprioritize score delta (inject weights + category getter) |
| `slotRules.ts` | Resolve slot rule by `block_type` from a sport’s `slots` array |
| `sessionContext.ts` | `collectBlocksExerciseIdsByType`, `buildSportCoverageContext` for post-build validation |

## What stays sport-local

- Category string unions and tagging (`getHikingPatternCategoriesForExercise`, …)
- The rules bundle: `sportSelectionRules`, `sportWorkoutConstraints`, `sportExerciseRequirements`
- Main-work exclusions, conditioning allowlists, within-pool quality scoring
- `applies(input)` (e.g. hiking focus + primary sport)
- Debug row shape under `session.debug.sport_pattern_transfer`

## Generator integration (hiking today)

`dailyGenerator.ts` wires: gate → `hikingPatternScoreMode` → `scoreExercise` → optional within-pool hook → post-build coverage/repair → debug.

The next sport should add a parallel `xxxSession.ts` + rules module and the same hook points, ideally behind a small resolver keyed by `sport_slugs[0]` without copying gate math.

## Checklist: adding sport #2

1. **Categories** — Define a string union (or const object) for pattern categories; implement `getXxxPatternCategoriesForExercise(ex)` and `exerciseMatchesAnyXxxCategory(ex, categories)`.
2. **Bundle** — Add `sportExerciseRequirements`, `sportSelectionRules` (with `slots: SportPatternSlotRule[]`), `sportWorkoutConstraints` (minimum coverage rules).
3. **Slot rules** — For each block type you care about (`main_strength`, `accessory`, `conditioning`, …), define `gateMatchAnyOf`, `preferMatchAnyOf`, `deprioritizeMatchAnyOf`.
4. **Gating** — Call `gatePoolForSportSlot` with your match function and optional `refineGatedPoolForMainWork`.
5. **Slot scoring** — Constants for `SportPatternSlotScoreWeights`; in `scoreExercise`, call `computeSportPatternSlotScoreAdjustment` with your category getter.
6. **Within-pool quality** — Optional: session `Map` counts + emphasis bucket + `computeXxxWithinPoolQualityScore` (pattern after `hikingQualityScoring.ts`).
7. **Validation / repair** — Implement coverage checks and replacement pickers using your categories and pool filters.
8. **Debug** — Build per-item rows (tier, categories, enforcement, optional within-pool breakdown).
9. **Tests** — Framework tests in `sportPatternFramework.test.ts`; sport-specific tests for gating and generation; keep tests independent where possible.

See **`ADD_NEXT_SPORT.md`** in this folder for the same checklist in copy-paste form.
