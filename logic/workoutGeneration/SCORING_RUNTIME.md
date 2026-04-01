# Scoring: production runtime vs experimental paths

**Runtime truth (single source for “what actually runs in the app”):**

1. **App workouts** — `lib/generator.ts` → **`generateWorkoutAsync`** → **`generateWorkoutSession`** (`logic/workoutGeneration/dailyGenerator.ts`) → **`scoreExercise` exported from `dailyGenerator.ts`** (and helpers below). Sports Prep / manual workout UIs use this path.
2. **Weekly rolling days** — `logic/workoutIntelligence/weekly/weeklyPlanner.ts` (and `weeklyDailyGeneratorBridge.ts`) also call **`generateWorkoutSession`** → same production scorer.
3. **Legacy sync generator** — `lib/generator.ts` → **`generateWorkout`** (sync) does **not** call `dailyGenerator` or `dailyGenerator.scoreExercise`. It uses **tag-overlap scoring** (`scoreExerciseByTagMatch`) for picking from `ExerciseDefinition` pools. Prefer `generateWorkoutAsync` for app parity; sync remains for scripts/tests.

---

## Production path (Build My Workout & Sports Prep)

| Stage | Module / symbol |
|-------|-----------------|
| Entry | `generateWorkoutAsync` → `generateWorkoutSession` |
| **Primary scorer** | **`scoreExercise`** in **`logic/workoutGeneration/dailyGenerator.ts`** |
| Session target vector | `mergeTargetVector` / `buildSessionTargetVectorFromInput` (`dailyGenerator.ts`), `logic/workoutIntelligence/targetVector.ts` |
| Ontology | `logic/workoutGeneration/ontologyScoring.ts` (`computeOntologyScoreComponents`) |
| History | `logic/workoutGeneration/historyScoring.ts` |
| Sport pattern (hiking / trail / alpine) | `sportPatternTransfer/*QualityScoring.ts`, `computeSportPatternSlotScoreAdjustment` (invoked inside `dailyGenerator.scoreExercise`) |
| Alpine sport-owned composite | `mainSelectors/alpineOwnedSelection.ts` calls **`dailyGenerator.scoreExercise`** (generic terms only; alpine quality layered separately) |
| Selection | `selectExercises`, `selectExercisesSportPatternIterative`, `mainSelectors/*`, warmup/cooldown builders — **`dailyGenerator.ts` and its imports** |
| Pairing (production) | **`logic/workoutIntelligence/supersetPairing.ts`** (`pickBestSupersetPairs`, `supersetCompatibility`) — shared with generator; **not** Phase 4 `scoring/pairing.ts` for main app output |
| Post-rank prescription | `getPrescription`, `recommendationLayer` — not part of candidate ranking |

---

## Phase 4–5 stack (not app daily generation)

Used by **`assembleSession`** → **`fillBlock`** → **`scoreExerciseForSelection`** / **`scoreAndRankCandidatesForSelection`** (`workoutIntelligence/scoring/exerciseScoring.ts`), and by **`generateWorkoutWithPrescriptions`**. **Not** invoked from `generateWorkoutSession` or `generateWorkoutAsync`.

| Piece | Role |
|-------|------|
| `workoutIntelligence/scoring/scoreExercise.ts` | **`pipelineScoreExercise`** (alias: `scoreExercise` here only) — target vector + simplified factors; used by `pipeline.ts` |
| `workoutIntelligence/scoring/exerciseScoring.ts` | Block filler / selection-engine scoring |
| `workoutIntelligence/pipeline.ts` | `buildPipelineContext`, `scoreAndRankCandidates` |
| `workoutIntelligence/selection/sessionAssembler.ts`, `blockFiller.ts` | Orchestrate Phase 4 assembly |
| `workoutIntelligence/scoring/qualityResolution.ts` | Session/block quality context for Phase 4 |
| `workoutIntelligence/scoring/pairing.ts` | `assembleSupersetPairs` for Phase 4 experiments (distinct from production `supersetPairing.ts` usage in `dailyGenerator`) |

Shared **primitives** (safe to call from both paths): `mergeTargetVector`, `alignmentScore`, `balanceBonusForExercise`, `fatiguePenaltyForExercise`, `toExerciseWithQualities` adapter.

---

## Naming collision (intentional documentation)

| Name | Where | Used for |
|------|--------|----------|
| **`scoreExercise`** | **`logic/workoutGeneration/dailyGenerator.ts`** (export) | **Production** session generation |
| **`pipelineScoreExercise`** | `logic/workoutIntelligence/scoring/scoreExercise.ts` (export) | Phase 4 / pipeline / experiments |
| `scoreExercise` | Same WI file (deprecated re-export on barrel) | Same as `pipelineScoreExercise` — avoid in new code |

Imports must be path-specific. For user-facing workout behavior, extend **`dailyGenerator.scoreExercise`** (and ontology/history modules it calls).

---

## Cleanup policy

- Do **not** delete the Phase 4–5 stack without an explicit migration plan; tests and `assembleSession` / `generateWorkoutWithPrescriptions` may still depend on it.
- When adding ranking factors for **app** workouts, extend **`dailyGenerator.scoreExercise`** (or shared helpers it already calls), not `exerciseScoring.ts`, unless you are explicitly working inside the Phase 4 assembly path.
