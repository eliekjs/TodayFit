# Evidence review: Triathlon – per-sport exercise selection

**Date:** 2025-03-16  
**Subsystem:** Per-sport logic for exercise selection (triathlon goal and sub-focuses)  
**Agent run:** workout-logic-research-integration-agent

---

## 1. Research question

What dryland/gym exercises best support triathlon (swim-bike-run) across all three disciplines, and how should the app select exercises when the user chooses “Triathlon” as a sport?

---

## 2. Sources

| Source | Type (Tier) | Link / DOI | Key claim(s) |
|--------|-------------|------------|--------------|
| Swim-specific (see swimming-open-water-goal.md) | — | — | Pull strength, scapular/shoulder stability, core support swimming. |
| Bike/run (see cycling-road-goal, road-running-goal) | — | — | Leg strength, posterior chain, core, strength endurance support cycling and running. |
| Triathlon durability / pacing | Consensus | — | Core stability and strength endurance support sustained multi-discipline load and brick workouts. |

---

## 3. Classification of findings

### High-confidence rules (implemented)

- **Swim-specific** support: pull strength, scapular control, shoulder stability, core (sub-focus already present).  
  Implemented: `swim_specific` tag map enriched with pulling_strength; default sub-focus includes swim_specific.

- **Bike-run durability** requires posterior chain, single-leg strength, core, and strength endurance.  
  Implemented: `bike_run_durability` tag map enriched with single_leg_strength, glute_strength, hinge_pattern, squat_pattern; migration appends these and posterior_chain to relevant starter_exercises.

- **Core stability** supports all three disciplines and pacing.  
  Implemented: core_stability sub-focus and tag map (core_anti_extension, core_stability, core_anti_rotation); default sub-focus includes core_stability; migration appends core + triathlon tags.

### Context-dependent heuristics (implemented)

- **Default sub-focus for triathlon** when no sub-focus selected: swim_specific, bike_run_durability, core_stability so tag-based ranking yields a balanced triathlon-support mix.  
  Implemented: `getPreferredExerciseNamesForSportAndGoals` sets `subSlugs = ["swim_specific", "bike_run_durability", "core_stability"]` when `primarySlug === "triathlon"` and no sub-focus provided.

- **Body bias Full** for triathlon sport days so generator does not filter by body part and tag ranking drives a mix of pull, leg, and core work.  
  Implemented: `sessionIntentForSport` sets `bodyRegionBias: { targetBody: "Full", targetModifier: [] }` when `sportSlug === "triathlon"`.

### Speculative / deferred

- Discipline-specific periodization (e.g. more swim focus in early season): current scope is exercise selection only.

---

## 4. Comparison to previous implementation

- **Before:** “Triathlon” had no default sub-focus when none selected; no body bias (so generic full-body could dominate); triathlon was missing from `SPORT_QUALITY_WEIGHTS`; tag map for bike_run_durability was minimal (no single_leg_strength, glute_strength, hinge/squat pattern).

- **Evidence suggests:** Balance swim (pull, scapular, core), bike/run (posterior chain, single-leg, strength endurance, core), and aerobic base; full-body gym sessions.

- **Gap closed:** (1) Added `triathlon` to `SportSlug` and `SPORT_QUALITY_WEIGHTS`. (2) Default sub-focus `["swim_specific", "bike_run_durability", "core_stability"]` when sport is triathlon and no sub-focus selected. (3) Session intent for triathlon includes Full body bias. (4) Enriched `SUB_FOCUS_TAG_MAP` for swim_specific (pulling_strength) and bike_run_durability (single_leg_strength, glute_strength, hinge_pattern, squat_pattern). (5) Migration appends triathlon-relevant tags to starter_exercises (pull, leg, core, conditioning).

---

## 5. Metadata / ontology impact

- **Sport quality weights:** `triathlon` in `sportQualityWeights.ts` (aerobic_base, aerobic_power, pulling_strength, scapular_stability, core_tension, trunk_endurance, posterior_chain_endurance, unilateral_strength, recovery).
- **Tag map:** `SUB_FOCUS_TAG_MAP` for triathlon sub-focuses expanded (swim_specific, bike_run_durability, core_stability).
- **Starter_exercises:** Migration `20250316100007_triathlon_starter_exercises_tags.sql` appends pulling_strength, scapular_control, posterior_chain, single_leg_strength, core_stability, zone2_cardio, aerobic_base, triathlon to relevant rows.
- **Session intent:** Full body bias when `sportSlug === "triathlon"`.
- **Selection flow:** Default sub-focus for triathlon in `getPreferredExerciseNamesForSportAndGoals`; generator +10 bonus for preferred names.

---

## 6. Open questions / follow-ups

- Consider optional rower/bike/treadmill conditioning block when session is triathlon sport day (sport-specific cardio).
- Revisit recovery-weight prescription when multi-sport load is in scope.
