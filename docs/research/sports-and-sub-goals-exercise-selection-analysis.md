# Sports and Sub-Goals in Exercise Selection — Analysis and Implementation Plan

**Date:** 2025-03-17  
**Scope:** Ensure workouts are tailored to the user’s ranked sports and sport sub-goals, and to ranked/weighted goals (primary/secondary/tertiary), with clear end-to-end wiring.

---

## 1. Current State Summary

### 1.1 What Exists and Works

- **Goal and sport quality weights**
  - `logic/workoutIntelligence/goalQualityWeights.ts`: goal slug → training quality weights (strength, hypertrophy, climbing, ski, running, etc.).
  - `logic/workoutIntelligence/sportQualityWeights.ts`: sport slug → training quality weights (60+ sports).
  - `logic/workoutIntelligence/targetVector.ts`: `mergeTargetVector()` blends primary_goal, secondary_goals, sport_slugs with configurable `goal_weights` and `sport_weight`.

- **Sub-focus tag mapping**
  - `data/goalSubFocus/`: goal slug + sub-focus slugs → exercise tag weights for scoring.
  - `data/sportSubFocus/`: sport slug + sub-focus slugs → exercise tag weights (`getExerciseTagsForSubFocuses`).
  - `dailyGenerator` uses `goal_sub_focus` and `sport_sub_focus` in `buildPreferredTagWeightsFromSubFocus()` and applies them in `scoreExercise()` as `sub_focus_tag_match`.

- **Preferred exercise list**
  - `lib/db/starterExerciseRepository.ts`: `getPreferredExerciseNamesForSportAndGoals()` returns a ranked list of exercise names (by goals and/or sports and sub-focuses, with optional sport vs goal %).
  - Manual and adaptive flows call this and pass the result as `preferredNames` into `generateWorkoutAsync`.

- **Constraint and selection types**
  - `WorkoutSelectionInput` (scoreTypes) includes `sports?: string[]`.
  - `qualityResolution.ts` passes `input.sports` into `mergeTargetVector` for session qualities.
  - Pipeline `PipelineInput` has `sport_slugs`, `goal_weights`, `sport_weight` and uses them in `buildPipelineContext`.

### 1.2 Gaps (Why Sports/Sub-Goals Are Underused)

1. **GenerateWorkoutInput does not carry sports or goal weights**
   - Has `primary_goal`, `secondary_goals`, `goal_sub_focus`, `sport_sub_focus`, `style_prefs.preferred_exercise_ids`.
   - Missing: `sport_slugs`, `goal_weights`, `sport_weight`.
   - So the daily generator cannot apply sport-based quality blending or weighted goal blending.

2. **Daily generator does not use the target vector**
   - It uses its own `scoreExercise()` with goal_tags, body part, sub-focus tag match, energy, variety, balance, etc.
   - It never calls `mergeTargetVector` or uses `SessionTargetVector` / training quality alignment.
   - Sport quality weights and goal quality weights therefore do not affect the main session generator.

3. **Selection input for constraints omits sports**
   - `inputToSelectionInput()` in dailyGenerator maps to `WorkoutSelectionInput` but does not set `sports`.
   - So `resolveWorkoutConstraints` never sees sport context (only body, goal, equipment, injuries).

4. **Adapter does not pass goal/sport context or preferred IDs reliably**
   - `manualPreferencesToGenerateWorkoutInput()` does not set `goal_sub_focus` (from `subFocusByGoal` + `primaryFocus`).
   - It sets `style_prefs` only when `avoid_tags` or `preferred_zone2_cardio` is set, so `preferred_exercise_ids` is dropped when those are empty.
   - Manual preferences have no sport slugs; sports are only in adaptive/sport-prep flows.

5. **Daily generator never uses preferred_exercise_ids**
   - `style_prefs.preferred_exercise_ids` is defined on the input type but there is no scoring component in the generator that boosts exercises in this list.

6. **No sport-based scoring component**
   - `scoreExercise()` has no term for “exercise has sport_tags matching user’s selected sport(s).”
   - So even if we passed `sport_slugs`, they would not yet affect scores.

7. **Weekly → daily bridge drops sports and sub-goals**
   - `weeklySessionToDailyInput()` builds `GenerateWorkoutInput` from `WeeklyPlannedSession` and `WeeklyPlanningInput` but does not pass `sport_slugs`, `goal_sub_focus`, `sport_sub_focus`, `goal_weights`, or `preferred_exercise_ids`.
   - `WeeklyPlanningInput` already has `sports` and could be extended for sub-focus and goal weights; the bridge just doesn’t forward them.

8. **WorkoutBuilder does not pass sport/sub-focus into generator input**
   - `buildWorkoutForSessionIntent()` uses sport/goal options only to compute `preferredNames`; it does not pass `sport_slugs`, `goal_sub_focus`, `sport_sub_focus`, or `goal_weights` into the generator.

---

## 2. Best Path Forward

**Principle:** Use the existing goal/sport and sub-focus systems end-to-end: pass sports and weighted goals into the generator, and make exercise selection explicitly depend on sport match, sub-focus tags, and preferred exercise list.

### 2.1 Input Contract (GenerateWorkoutInput)

- Add optional:
  - `sport_slugs?: string[]` (ordered; first = primary sport).
  - `goal_weights?: number[]` (e.g. [50, 30, 20] for primary/secondary/tertiary; used when primary_goal + secondary_goals are set).
  - `sport_weight?: number` (0–1; blend of sport vector vs goal vector when both present; default 0.5).
- Keep and wire: `goal_sub_focus`, `sport_sub_focus`, `style_prefs.preferred_exercise_ids`.

### 2.2 Adapter and Callers

- **Manual flow**
  - Derive `goal_sub_focus` from `primaryFocus` + `subFocusByGoal` (using `resolveGoalSubFocusSlugs` per goal, build `GoalSubFocusInput`).
  - Derive `goal_weights` from `goalMatchPrimaryPct` / `goalMatchSecondaryPct` / `goalMatchTertiaryPct` (normalize to sum 1).
  - Fix `style_prefs`: always set when `preferred_exercise_ids` is non-empty (or any other style pref is set), so preferred IDs are never dropped.
- **Adaptive / Sport Prep**
  - When building input for the daily generator (e.g. from `buildWorkoutForSessionIntent` or from weekly plan), pass:
    - `sport_slugs` from `rankedSportSlugs` (or single sport),
    - `sport_sub_focus` from `sportSubFocusSlugsBySport` (or single sport sub-focus),
    - `goal_weights` when goal slugs are provided,
    - `sport_weight` from `sportVsGoalPct` (e.g. sportVsGoalPct/100).
  - Continue passing `preferred_exercise_ids` from `getPreferredExerciseNamesForSportAndGoals` (and fix adapter so it’s included).
- **Weekly bridge**
  - `weeklySessionToDailyInput()`: take `sport_slugs`, `goal_sub_focus`, `sport_sub_focus`, `goal_weights`, `sport_weight`, and `preferred_exercise_ids` from `WeeklyPlanningInput` (extend that type if needed) and include them in `GenerateWorkoutInput`.

### 2.3 Scoring in the Daily Generator

- **Sport match**
  - If `input.sport_slugs?.length > 0`: add a score term when `exercise.tags.sport_tags` contains any of `input.sport_slugs`. Weight by rank (e.g. first sport counts more than second).
- **Goal weights**
  - When `input.goal_weights` is present, use it to scale the existing goal-tag alignment (primary vs secondary vs tertiary) instead of fixed weights.
- **Preferred exercise IDs**
  - If `input.style_prefs?.preferred_exercise_ids` is set, add a bonus for exercises whose `id` is in that list (e.g. by position or a fixed bonus so preferred exercises are clearly favored).
- **Sub-focus**
  - Already implemented; ensure `goal_sub_focus` and `sport_sub_focus` are always passed when available so this path is used.

### 2.4 Constraints

- **inputToSelectionInput**
  - Set `sports: input.sport_slugs` so that any constraint or validator that uses `WorkoutSelectionInput` can consider sports (e.g. for logging or future rules).

### 2.5 Optional (Later): Target Vector in Daily Generator

- The pipeline’s `mergeTargetVector` + quality alignment is currently used in the intelligence layer (e.g. block scoring with `ExerciseWithQualities`). The daily generator uses a different exercise type and tag-based scoring.
- A possible next step is to add a “training quality alignment” component to the daily generator by either:
  - Mapping generator exercises to a simple quality map (e.g. from tags), and blending with `mergeTargetVector(primary_goal, secondary_goals, sport_slugs, goal_weights, sport_weight)` for one extra score term, or
  - Keeping sport/goal influence via sport match + sub-focus + preferred list only, and leaving full quality-vector alignment to the pipeline path when that path is used.
- This analysis recommends implementing the wiring and scoring above first (sport match, goal weights, preferred IDs, sub-focus and adapter fixes), then evaluating whether adding target-vector alignment in the generator is needed.

---

## 3. Implementation Checklist

- [x] Add `sport_slugs`, `goal_weights`, `sport_weight` to `GenerateWorkoutInput`.
- [x] In `manualPreferencesToGenerateWorkoutInput`: build `goal_sub_focus` from `subFocusByGoal` + `primaryFocus`; set `goal_weights` from goal match %; fix `style_prefs` so `preferred_exercise_ids` is included when provided.
- [x] In `scoreExercise()` (dailyGenerator): add sport-match component; scale goal alignment by `goal_weights` when present; add preferred_exercise_ids bonus.
- [x] In `inputToSelectionInput()`: set `sports: input.sport_slugs`.
- [x] Extend `WeeklyPlanningInput` (if needed) and `weeklySessionToDailyInput()` to pass sports, goal_sub_focus, sport_sub_focus, goal_weights, sport_weight, preferred_exercise_ids.
- [x] In `buildWorkoutForSessionIntent` (or the path that builds `GenerateWorkoutInput` for adaptive): pass sport_slugs, sport_sub_focus, goal_weights, sport_weight into the generator input (e.g. via an extended adapter or an options object that the adapter merges in).
- [ ] Tests: add or update tests for scoring with sport_slugs, goal_weights, and preferred_exercise_ids; regression test for sub-focus and existing goal/body scoring.

---

## 4. Files to Touch

| File | Change |
|-----|--------|
| `logic/workoutGeneration/types.ts` | Add sport_slugs, goal_weights, sport_weight to GenerateWorkoutInput. |
| `lib/dailyGeneratorAdapter.ts` | goal_sub_focus from subFocusByGoal; goal_weights from goal match %; fix style_prefs so preferred_exercise_ids is passed. |
| `logic/workoutGeneration/dailyGenerator.ts` | inputToSelectionInput set sports; scoreExercise: sport match, goal_weights scaling, preferred_exercise_ids bonus. |
| `logic/workoutIntelligence/weekly/weeklyDailyGeneratorBridge.ts` | Pass sports, goal_sub_focus, sport_sub_focus, goal_weights, sport_weight, preferred_exercise_ids from baseInput. |
| `logic/workoutIntelligence/weekly/weeklyTypes.ts` | Add goal_sub_focus, sport_sub_focus, goal_weights, sport_weight, preferred_exercise_ids to WeeklyPlanningInput.style_prefs or new field. |
| `lib/generator.ts` | Ensure generateWorkoutAsync can receive sport/goal context (e.g. optional param or via preferences) and forward to adapter. |
| `services/workoutBuilder/index.ts` | When calling generateWorkoutAsync, pass sport/goal context so adapter can set sport_slugs, sport_sub_focus, goal_weights, sport_weight. |

---

## 5. References

- Goal quality weights: `logic/workoutIntelligence/goalQualityWeights.ts`
- Sport quality weights: `logic/workoutIntelligence/sportQualityWeights.ts`
- Target vector merge: `logic/workoutIntelligence/targetVector.ts`
- Sub-focus tag maps: `data/goalSubFocus/`, `data/sportSubFocus/`
- Workout Logic Agent skill: `.cursor/skills/workout-logic-agent/SKILL.md`
- Architecture: `logic/workoutIntelligence/ARCHITECTURE.md`
