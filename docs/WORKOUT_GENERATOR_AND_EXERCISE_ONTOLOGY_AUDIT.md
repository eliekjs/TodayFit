# TodayFit Workout Generator & Exercise Data Model Audit

**Goal:** Support a hierarchical exercise ontology and stricter rule-based workout generation (body-part focus, movement focus, injuries, equipment, secondary goals like mobility).

**Scope:** Current generator flow, exercise schema/seed structure, gap analysis, and recommended implementation path. No implementation changes—plan only.

---

## 1. Current Generator Flow

### 1.1 Two Generation Paths in the Repo

| Path | Entry | Exercise source | Used by |
|------|--------|-----------------|--------|
| **lib/generator.ts** | `generateWorkout` / `generateWorkoutAsync` | `EXERCISES` from `data/exercises` or DB via `listExercises()` | **App UI**: manual preferences, workout, week (`app/(tabs)/manual/*`) |
| **logic/workoutGeneration** | `generateWorkoutSession` (dailyGenerator) | `STUB_EXERCISES` or passed pool | `seedTest.ts`, public API; **not yet wired in app** |

The **workoutIntelligence** layer (pipeline, constraints, blockFiller, prescriptionResolver, validateWorkout) is a **parallel design** that composes target-vector scoring, constraint resolution, and block filling; the README says it should “integrate with logic/workoutGeneration/dailyGenerator for full session output,” but today **dailyGenerator is self-contained** and does not call workoutIntelligence.

### 1.2 Phase-to-Module Mapping (Phases 1–6)

The “phases 1–6” refer to the **workoutIntelligence** design (see `ARCHITECTURE.md`, `PHASE1_FOUNDATION.md`, and phase docs):

| Phase | Intent | Modules / artifacts |
|-------|--------|----------------------|
| **1 – Foundation** | Training qualities taxonomy, goal/sport/exercise quality weights, target vector | `trainingQualities.ts`, `dataModels.ts`, `targetVector.ts`, DB: `training_qualities`, `goal_training_demand`, `sport_training_demand`, `exercise_training_quality` |
| **2 – Scoring & session composition** | Full scorer (alignment + balance + fatigue + variety), session templates, block rules | `scoring/scoreExercise.ts`, `scoring/exerciseScoring.ts`, `sessionTemplates.ts` (v1/v2), `scoring/movementBalanceGuardrails.ts` |
| **3 – Session architecture** | Block types/formats, stimulus profiles, block templates | `types.ts` (BlockType, BlockSpec), `blockTemplates.ts`, `sessionTemplatesV2.ts`, `stimulusProfiles.ts` |
| **4 – Selection engine** | Candidate filtering pipeline, block filling, guardrails, fatigue | `selection/candidateFilters.ts`, `selection/blockFiller.ts`, `selection/sessionAssembler.ts`, `scoring/fatigueTracking.ts`, `scoring/pairing.ts` |
| **5 – Prescription layer** | Sets/reps/rest/intent from block type + stimulus + duration | `prescription/prescriptionResolver.ts`, `prescription/setRepResolver.ts`, `prescription/supersetFormatter.ts`, `prescription/intentGuidance.ts`, `prescription/durationScaling.ts` |
| **6 – Weekly planning** | Per-day intents, load balancing | `weekly/weeklyPlanner.ts`, `weekly/weeklyLoadBalancing.ts`, `weekly/weeklyAllocation.ts` |

The **live generator** used by the app is **lib/generator.ts**, which does **not** follow this phase split; it has its own flow (see below). The **logic/workoutGeneration/dailyGenerator.ts** flow is the one that aligns conceptually with “normalize → filter → score → assemble → prescribe → output.”

### 1.3 dailyGenerator.ts Flow (logic/workoutGeneration)

This is the 8-step flow in `generateWorkoutSession()`:

| Step | What | Where |
|------|------|--------|
| **1. Goal rules** | Resolve prescription rules for primary goal | `getGoalRules(primary)` from `lib/generation/prescriptionRules.ts` |
| **2. Filter** | Hard constraints: equipment, injuries, avoid tags, energy | `filterByHardConstraints(exercisePool, input)` in dailyGenerator (lines 92–139) |
| **3. Warmup** | Build warmup block | `buildWarmup(filtered, …)` — filters by modality (mobility/recovery/conditioning), warmup equipment |
| **4. Main block** | Goal-specific main work | `buildMainStrength` / `buildMainHypertrophy` / `buildEnduranceMain` / `buildMobilityRecoveryMain` — each filters pool by modality + pattern, then **selectExercises** (score + balance) |
| **5. Accessory** | Handled inside main block builders (e.g. strength superset pairs) | Inside `buildMainStrength` (accessory supersets) |
| **6. Conditioning** | Optional/mandatory conditioning block by goal rules | After main; filters `modality === "conditioning"`, applies `getPrescription(…, "conditioning")` |
| **7. Cooldown** | Build cooldown block | `buildCooldown(filtered, …)` — modality mobility/recovery |
| **8. Output** | Assemble blocks, compute estimated duration | Return `WorkoutSession` |

- **Filtering:** Central hard filter is `filterByHardConstraints` (once at start). Additional **block-level filtering** is inline in each `build*` (e.g. `mainPool` = strength/power + compound patterns; `accessoryPool`; warmup/cooldown by modality and equipment).
- **Scoring:** `scoreExercise()` in dailyGenerator (lines 176–256): goal alignment (tags), body-part focus (muscle_groups), energy fit, variety penalty (recent + pattern count), balance bonus (`balanceBonusForExercise` from `lib/generation/movementBalance`), fatigue penalty (`fatiguePenaltyForExercise` from `lib/generation/fatigueRules`), duration practicality. **Selection:** `selectExercises()` uses scored pool, category-fill for movement balance, then random-from-top with pattern cap.
- **Assembly:** Block assembly is **implicit** in the order of `buildWarmup` → main builders → conditioning → `buildCooldown`; no separate “session template” object—structure is coded per goal.
- **Prescriptions:** Applied **per exercise** when building items: `getPrescription(exercise, blockType, energyLevel, primaryGoal, …)` (dailyGenerator lines 258–345), which uses `getGoalRules(primary)` and `scaleSetsByEnergy` / `getConditioningDurationMinutes` from `lib/generation/prescriptionRules.ts`.
- **Validation:** dailyGenerator has **no** post-assembly validation step. The **workoutIntelligence** path has `constraints/validateWorkout.ts` (`validateWorkoutAgainstConstraints`) for hard_exclude, hard_include, and required_finishers, but that is not called by dailyGenerator.

### 1.4 lib/generator.ts Flow (current app path)

- **Filtering:** Sequential: `filterByGymProfile` (equipment) → `filterByInjuries` (contraindications) → `filterByBodyPartFocus` (muscles/tags) → `filterByUpcoming` (avoid tags from upcoming events) → optional `filterByPreferredZone2Cardio`.
- **Scoring:** None; selection is **random pick** from filtered pool with count by duration (`pickCountByDuration`).
- **Assembly:** Fixed structure (warmup → main supersets → accessory → cooldown) with counts from duration; no movement-pattern balance or quality alignment.
- **Prescriptions:** `prescriptionForExercise()` inline (modality-based sets/reps/cues).
- **Validation:** None.

---

## 2. Current Exercise Schema / Seed Structure

### 2.1 Generator Type (logic/workoutGeneration/types.ts)

- **Exercise:** `id`, `name`, `movement_pattern` (single enum: squat | hinge | push | pull | carry | rotate | locomotion), `muscle_groups[]`, `modality`, `equipment_required[]`, `difficulty`, `time_cost`, `tags: ExerciseTags`, `progressions?`, `regressions?`.
- **ExerciseTags:** `goal_tags[]`, `sport_tags[]`, `energy_fit[]`, `joint_stress[]`, `contraindications[]`, `stimulus[]` (all string arrays with some union typing).

Structured fields: single `movement_pattern`, `muscle_groups`, `equipment_required`, and the tag categories above. No `primary_movement_family`, no `movement_patterns[]`, no `exercise_role`, no `pairing_category`, no `stretch_targets`/`mobility_targets`, no `fatigue_regions`.

### 2.2 WorkoutIntelligence Type (logic/workoutIntelligence/types.ts)

- **ExerciseWithQualities:** extends with `training_quality_weights` (QualityWeightMap), `fatigue_cost`, `skill_level`, `joint_stress[]`, `contraindications[]`, `energy_fit[]`, `time_cost`, `modality`, and **optional** `primary_movement_family` (used by constraints/eligibility when set).

### 2.3 DB Schema (from migrations)

- **exercises:** `slug`, `name`, `primary_muscles[]`, `secondary_muscles[]`, `equipment[]`, `modalities[]`, `movement_pattern` (single text), `level`, `is_active`.
- **exercise_tags** / **exercise_tag_map:** many-to-many tags; tag groups include `movement_pattern`, `muscle`, `modality`, `equipment`, `energy`, `joint_stress`, `contraindication`, `sport`, `general`.
- **exercise_contraindications:** `exercise_id`, `contraindication`, `joint`.
- **20250312000000_exercise_structured_columns.sql:** Adds nullable/array columns: `primary_movement_family`, `secondary_movement_families[]`, `movement_patterns[]`, `joint_stress_tags[]`, `contraindication_tags[]`, `stretch_targets[]`, `mobility_targets[]`, `exercise_role`, `pairing_category`, `unilateral`, `fatigue_regions[]`.

Seed (20250302100001): Tag universe (slug, tag_group, weight) and 150+ exercises with `primary_muscles`, `secondary_muscles`, `equipment`, `modalities`, single `movement_pattern`. Joint/contraindication tags use prefixes (e.g. `joint_shoulder_overhead`, `contra_knee`). No backfill yet for the new structured columns.

### 2.4 Stub Exercises (logic/workoutGeneration/exerciseStub.ts)

~42 exercises; each has `movement_pattern`, `muscle_groups`, `equipment_required`, `tags` (goal_tags, energy_fit, joint_stress, contraindications, stimulus). No `primary_movement_family`, no `exercise_role`, no `pairing_category`, no `stretch_targets`/`mobility_targets`, no `fatigue_regions`.

### 2.5 What Is Handled by Generic Tags Only

- **Body-part / movement family:** Derived in code from `movement_pattern` + `muscle_groups` (e.g. `focusBodyPartToMuscles`, `deriveMovementFamily` in eligibilityHelpers). No canonical `primary_movement_family` on generator Exercise type or stub.
- **Finer movement patterns:** Only the single `movement_pattern` (e.g. push). No `horizontal_push` vs `vertical_push`; no `movement_patterns[]`.
- **Block placement / role:** Decided by modality + pattern in build* functions (e.g. “main_strength” = strength/power + squat/hinge/push/pull). No `exercise_role` field.
- **Cooldown mobility selection:** Pool is “mobility or recovery” modality; no `stretch_targets`/`mobility_targets` for targeting hamstrings vs thoracic, etc.
- **Superset pairing:** Heuristics in code: `nonCompeting` pairs like push/pull, hinge/rotate, squat/pull; no `pairing_category` or `fatigue_regions` on exercises.
- **Injury logic:** Uses `tags.joint_stress` and `tags.contraindications` plus hardcoded `INJURY_AVOID_TAGS` / `INJURY_AVOID_EXERCISE_IDS` in `lib/workoutRules.ts`; DB has `joint_stress` in tag universe but naming can differ (e.g. `joint_shoulder_overhead` vs `shoulder_overhead` in generator).

### 2.6 Fields Insufficient for Strict Filtering, Injury Logic, or Superset Logic

- **Strict body-part:** Without `primary_movement_family` (and optional secondary), body-part focus relies on deriving from pattern + muscles; edge cases (e.g. thruster, complex compounds) and consistent “upper_push only” sessions are brittle.
- **Injury:** `joint_stress` is a string array with no single canonical list; mapping from DB tags to `INJURY_AVOID_TAGS` keys is string-normalized and can miss or double-count. No severity (hard vs soft caution) on the exercise side.
- **Superset:** No `pairing_category` or `fatigue_regions`; pairing is pattern-based only (e.g. “push vs pull”), so “chest + triceps” vs “chest + chest” or “grip + grip” is not explicitly modeled.
- **Mobility/secondary goals:** No `stretch_targets`/`mobility_targets` or `exercise_role` for “cooldown must include 2 mobility” or “focus on thoracic mobility.”
- **Movement focus:** Single `movement_pattern` prevents “prefer horizontal push” or “avoid vertical push” without new tags or another field.

---

## 3. Gap Analysis

### 3.1 What Can Be Extended Cleanly

- **dailyGenerator:**  
  - Input already has `focus_body_parts`, `injuries_or_constraints`, `style_prefs.avoid_tags`, `available_equipment`, `energy_level`. Adding a **constraints object** (e.g. `ResolvedWorkoutConstraints`) as an optional input and passing it into a **single** “hard filter” step (or delegating to workoutIntelligence’s filter) is backward-compatible.  
  - Scoring already uses `muscle_groups` and `movement_pattern`; adding weights for `primary_movement_family` when present (from DB/adapter) is a small extension.  
  - Prescription is already goal- and block-type-driven; extending with stimulus or quality hints is optional later.

- **workoutIntelligence:**  
  - `resolveWorkoutConstraints` already produces `excluded_exercise_ids`, `excluded_joint_stress_tags`, `allowed_movement_families`, `min_cooldown_mobility_exercises`, `superset_pairing`.  
  - `eligibilityHelpers.deriveMovementFamily` already prefers `ex.primary_movement_family` when set; once DB/loader fills it, strict body-part works without changing the helper signature.  
  - `validateWorkout` and `filterByConstraints` are built for strict rules; they only need the same exercise shape (e.g. `ExerciseWithQualities` with optional new fields).

- **DB:** New structured columns are nullable/default; backfilling from existing `movement_pattern`, muscles, and tags can be done incrementally. Generator and adapters can “use when present, else derive.”

- **lib/workoutRules:** `INJURY_AVOID_TAGS` and `INJURY_AVOID_EXERCISE_IDS` are extendable with new keys; adding a canonical `joint_stress_tags` list (aligned with DB and generator) keeps one source of truth for “tag slug → avoid.”

### 3.2 New Fields or Modules to Add

- **Exercise (generator + adapter):**  
  - `primary_movement_family` (and optionally `secondary_movement_families`) for strict body-part.  
  - Optional `movement_patterns[]` for finer matching (horizontal_push, etc.).  
  - Optional `exercise_role`, `pairing_category`, `fatigue_regions[]`, `stretch_targets`/`mobility_targets` for block placement, superset rules, and mobility cooldown.  
  - Canonical `joint_stress_tags` / `contraindication_tags` (or map from DB) so injury logic uses one naming scheme.

- **Ontology / rules layer (new or consolidated):**  
  - **Canonical enums:** Movement family, joint stress slugs, contraindication keys, exercise role, pairing category—so filters and validators don’t depend on free-form strings.  
  - **Constraint resolution:** Already in `resolveWorkoutConstraints`; optionally extend with secondary-goal rules (e.g. mobility finishers) and superset rules (forbidden/preferred pairs by pairing_category or fatigue_regions).  
  - **Validation:** Post-assembly check (e.g. call `validateWorkoutAgainstConstraints` when constraints are used) so the generator never returns a workout that violates hard_exclude or hard_include.

- **Adapter (DB → generator):** Map DB columns (`primary_movement_family`, `joint_stress_tags`, `contraindication_tags`, `exercise_role`, `pairing_category`, `stretch_targets`, `mobility_targets`, `fatigue_regions`) into the generator’s Exercise or ExerciseWithQualities so both dailyGenerator and workoutIntelligence see the same shape.

### 3.3 Brittleness If We Keep Relying on Flat Tags Only

- **Body-part:** Derivation from pattern + muscles will keep failing for multi-family exercises (e.g. thruster, clean) and for subtle focus (e.g. “upper push only” when some “push” exercises are leg-dominant). Adding more ad-hoc tags (e.g. “upper_push”) duplicates ontology in tags and is harder to keep consistent.
- **Injury:** Every new injury or joint-stress type requires updating both tag universe and `INJURY_AVOID_*` maps; string normalization and multiple tag names for the same concept (e.g. `joint_shoulder_overhead` vs `shoulder_overhead`) cause bugs. A single canonical list (e.g. `JointStressTag` in constraintTypes) used in DB, generator, and rules would reduce this.
- **Superset:** Pattern-only pairing (push/pull) cannot express “no double grip,” “no two hinge compounds,” or “prefer chest + triceps.” Without `pairing_category` or `fatigue_regions`, we’d need more and more special-case tags and code paths.
- **Mobility/secondary goals:** “Add 2 mobility to cooldown” is enforceable only by modality today; we can’t “target hamstrings and thoracic” without stretch/mobility_targets or similar.
- **Scoring vs filtering:** If we keep overloading tags for both “can this go in this block?” and “how good is it?”, we mix hard rules (ontology) with soft preferences and make tuning and debugging harder.

---

## 4. Recommended Implementation Path

### 4.1 Principles

- **No big-bang swap:** Keep current generator (and app path) working; add ontology and constraints alongside, then switch or blend.
- **Single ontology source:** Define canonical enums/lists (movement family, joint stress, contraindication, role, pairing category) in one place (e.g. `constraintTypes` + workoutRules); DB and generator align to those slugs.
- **Optional structured fields:** Generator and workoutIntelligence accept exercises with or without `primary_movement_family`, `exercise_role`, etc.; when absent, fall back to current derivation/tags.
- **Insert constraints once:** Resolve constraints from input (injuries, equipment, body-part, goals) in one layer; feed the same resolved object into both filtering and (optionally) validation.

### 4.2 Low-Risk Sequence

1. **Canonical ontology (code-only)**  
   - Add/centralize enums or const arrays: movement family, joint stress tags (aligned with `INJURY_AVOID_TAGS`), contraindication keys, exercise role, pairing category.  
   - Use these in `lib/workoutRules`, `constraintTypes`, and (where applicable) generator types. No DB or API change yet.

2. **Generator type and adapter**  
   - Extend `Exercise` (or the type used by dailyGenerator) with optional `primary_movement_family`, `joint_stress_tags`/`contraindication_tags` (or keep mapping from `tags` with canonical names), and optionally `exercise_role`, `pairing_category`, `stretch_targets`/`mobility_targets`, `fatigue_regions`.  
   - Add or extend an adapter (DB → generator) that maps `exercises` + structured columns + tag_map into this shape. Stub data can stay as-is (derivation still works).

3. **Constraint resolution as the single entry point**  
   - Treat `resolveWorkoutConstraints(input)` as the place where injuries, equipment, body-part, and secondary goals (e.g. mobility finishers) turn into `ResolvedWorkoutConstraints`.  
   - dailyGenerator: add optional `constraints?: ResolvedWorkoutConstraints` to input; when present, run a **single** hard-filter step that excludes by `excluded_exercise_ids`, `excluded_joint_stress_tags`, and (for working blocks) `allowed_movement_families` using `deriveMovementFamily(ex)` (and `ex.primary_movement_family` when set). Leave the rest of the flow (scoring, assembly, prescription) unchanged.

4. **Backfill DB and loader**  
   - Backfill `primary_movement_family`, `joint_stress_tags`, `contraindication_tags` (and optionally role, pairing_category, stretch_targets, mobility_targets, fatigue_regions) from existing columns/tags.  
   - Loader (e.g. exerciseRepository or a dedicated “for generator” loader) returns exercises with these fields set so that when the app eventually uses DB exercises for generation, constraints and eligibility use ontology.

5. **Validation hook (optional but recommended)**  
   - When dailyGenerator runs with `constraints` and produces a session, optionally call `validateWorkoutAgainstConstraints(session, pool, constraints)` (adapting workout type if needed). On violations, either log, retry selection, or surface to caller—no change to public API shape.

6. **Superset and mobility (next)**  
   - Use `pairing_category` / `fatigue_regions` in superset logic (e.g. in dailyGenerator’s `buildMainStrength` or in workoutIntelligence’s pairing) to forbid/prefer pairs.  
   - Use `stretch_targets`/`mobility_targets` and `exercise_role` for cooldown mobility selection and for “required_finishers” when secondary goal is mobility.

### 4.3 Best Insertion Point for an Ontology-Driven Constraints/Rules Layer

- **Before filtering, after input normalization.**  
  - **Where:** In the session generator entry (e.g. first lines of `generateWorkoutSession` or in a thin wrapper that the app will call).  
  - **What:** From the same user input (goal, duration, equipment, injuries, body focus, secondary goals, preferences), call `resolveWorkoutConstraints(normalizedInput)` to get `ResolvedWorkoutConstraints`. Pass that object into the generator as optional `constraints`.  
  - **Inside the generator:** One dedicated step after “goal rules” and before “filter”: “if constraints provided, filter pool by constraints (excluded IDs, excluded joint_stress, allowed_movement_families for working blocks); else keep current filterByHardConstraints.” All downstream steps (scoring, block building, prescription) stay the same; they just see a smaller, constraint-compliant pool.  
  - **Why here:** (1) Single place to apply all hard rules. (2) No duplication between “injury filter in dailyGenerator” and “injury rules in resolveWorkoutConstraints.” (3) Validation can reuse the same constraints object. (4) When you later switch the app to use workoutIntelligence’s blockFiller + scoring, the same constraints object can drive `filterCandidates(…, constraints)` and `validateWorkout`.

- **Concrete insertion in dailyGenerator:**  
  - Add `constraints?: ResolvedWorkoutConstraints` to `GenerateWorkoutInput` (or a separate options bag).  
  - Right after `const filtered = filterByHardConstraints(exercisePool, input)`, if `constraints` is set, apply a second filter: `filtered.filter(ex => constraintEligible(ex, constraints))` where `constraintEligible` checks excluded IDs, excluded joint_stress, and (for blocks that will be “working” blocks) allowed_movement_families via `deriveMovementFamily(ex)`. Use the same `deriveMovementFamily` as eligibilityHelpers (and prefer `ex.primary_movement_family` when present).  
  - This keeps the existing `filterByHardConstraints` for callers that don’t pass constraints (e.g. seedTest, current API) and adds a strict layer when the caller does pass constraints (e.g. future app path that normalizes from Build/Adaptive and resolves constraints first).

### 4.4 Summary

- **Current flow:** Two paths—lib/generator (app, filter-only, random pick) and dailyGenerator (filter → score → build blocks → prescribe, no validation). workoutIntelligence has phases 1–6 (qualities, scoring, templates, selection, prescription, weekly) and a constraints/validation layer but is not wired to the live app or to dailyGenerator.  
- **Schema:** Generator uses single `movement_pattern` + tags; DB has new structured columns (movement family, joint_stress_tags, role, pairing, etc.) not yet backfilled or exposed in generator type.  
- **Gaps:** Strict body-part, consistent injury logic, superset rules, and mobility targeting need structured fields and a single ontology; flat tags alone will stay brittle.  
- **Path:** Centralize ontology in code; extend generator type and adapter with optional structured fields; resolve constraints once and inject them before filtering; keep current behavior when constraints are omitted; add optional validation; then backfill DB and enrich superset/mobility logic using the new fields.

---

*Document generated from codebase audit. No code changes were made.*
