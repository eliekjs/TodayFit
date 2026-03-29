# Checklist: sport pattern #2

Use with `README.md` in this folder.

- [ ] **Categories** — New union + `getPatternCategoriesForExercise` + `matchesAnyCategory`.
- [ ] **Rules bundle** — `sportExerciseRequirements`, `sportSelectionRules.slots`, `sportWorkoutConstraints`.
- [ ] **Applies** — When your pattern runs (primary sport slug + focus / duration as needed).
- [ ] **Gating** — `gatePoolForSportSlot` + `getSportPatternSlotRuleForBlockType(slots)`; optional main-work refinement.
- [ ] **Slot score weights** — `SportPatternSlotScoreWeights` + `computeSportPatternSlotScoreAdjustment` in `scoreExercise`.
- [ ] **Within-pool quality** (optional) — Session counts, seed emphasis bucket, redundancy; wire into `ScoreExerciseOptions`-style hook.
- [ ] **Conditioning filter** — If needed, narrow conditioning pool (hiking: `isHikingConditioningExercise`).
- [ ] **Coverage + repair** — `buildSportCoverageContext` + `collectBlocksExerciseIdsByType` + your `evaluateMinimumCoverage` + replacements.
- [ ] **Debug** — Populate `session.debug.sport_pattern_transfer` (or sport-specific key if you add one).
- [ ] **Tests** — Sport module tests + ensure `sportPatternFramework.test.ts` still passes.

Do **not** weaken hiking: add parallel modules and a resolver rather than overloading hiking paths.
