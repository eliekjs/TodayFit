# Goals audit: evidence-based design, prescription, and exercise alignment

**Date:** 2025-03-16  
**Category:** Goals catalog (primary goal, DB goals, goal sub-focus)  
**Scope:** Audit goal definitions, prescription rules (rep/set/rest, conditioning), and goal–exercise alignment using NSCA, ACSM, ExRx, NCSF; document PrimaryGoal vs DB goals, goal_demand_profile, goal_tag_profile, and goal sub-focus. Generator uses getGoalRules and GOAL_TRAINING_RULES for prescription; goal tags and sub-focus for exercise ranking.

---

## 1. Research question

What primary goals should the system support, what prescription (reps, sets, rest, conditioning) does evidence support per goal, and how should goals map to exercise tags and sub-focus options for ranking?

---

## 2. Sources

| Source | Type (Tier) | Key claim(s) |
|--------|-------------|--------------|
| **NSCA** — Essentials of Strength & Conditioning, program design | Tier 1 | Strength: 1–6 RM, 3–5 min rest; hypertrophy: moderate reps, 60–90 s rest; power: low reps, high intent, long rest; endurance: 15–25+ reps; periodization and goal-specific programming. |
| **ACSM** — Position stand, resistance training | Tier 1 | Strength: heavy loading 1–6 RM, 3–5 min rest; hypertrophy: 6–12 RM zone, 1–2 min rest; muscular endurance: 15–25+ at 50–65% 1RM. |
| **Schoenfeld et al.** — Hypertrophy meta-analyses | Tier 1 | Hypertrophy similar across 6–20 reps near failure; 8–15 favors efficiency; rest ≥60 s (60–90 s supported). |
| **ExRx.net** — Exercise directory, prescription | Tier 2 | Movement patterns and muscle focus; supports goal–tag mapping (compound, isolation, push, pull, etc.). |
| **NCSF** — Program design | Tier 2 | Goal-specific set/rep/rest; body recomp (moderate volume + conditioning); mobility/recovery (light load, ROM). |
| **Project** | Internal | prescriptionRules.ts (GOAL_TRAINING_RULES), evidence-review-prescription-rep-rest.md, 20250301000004/00005 (goals, goal_demand_profile), 20250305100001 (goal_tag_profile), 20250318000000 (goal_sub_focus), data/goalSubFocus/, logic/workoutGeneration/types.ts (PrimaryGoal). |

---

## 3. Classification of findings

### High-confidence rules (implemented)

- **PrimaryGoal (generator):** strength, hypertrophy, body_recomp, endurance, conditioning, mobility, recovery, athletic_performance, power, calisthenics. Drives **GOAL_TRAINING_RULES** (repRange, setRange, restRange, conditioningStrategy, preferredFormats, etc.). **Implemented:** logic/workoutGeneration/types.ts; lib/generation/prescriptionRules.ts.
- **Prescription by goal (evidence):**  
  - **Strength:** 3–6 reps, 3–5 sets, 2.5–5 min rest (ACSM/NSCA). **Implemented:** repRange 3–6, restRange 150–300 s.  
  - **Hypertrophy:** 8–15 reps, 3–4 sets, 60–90 s rest (Schoenfeld, ACSM). **Implemented:** repRange 8–15, restRange 60–90.  
  - **Body recomp:** 10–15 reps, moderate rest; conditioning mandatory. **Implemented:** repRange 10–15, conditioningStrategy mandatory.  
  - **Endurance:** 15–25 reps, 2–3 sets, 45–90 s rest; conditioning primary (ACSM/NSCA). **Implemented:** repRange 15–25, conditioningStrategy primary.  
  - **Power / athletic_performance:** Low reps (2–5), long rest (2–3 min), power block before strength. **Implemented:** powerRepRange 3–5, powerRestRange 90–120, powerBeforeStrength.  
  - **Mobility / recovery:** 1 rep (hold), 1 set, short rest; mobility circuit block order. **Implemented:** repRange 1–1, mobilityTimePerMovement 30, blockOrder.  
  - **Conditioning:** Circuit/AMRAP/EMOM; conditioning primary; work duration by energy. **Implemented:** conditioningStrategy primary, conditioningWorkDuration.
- **DB goals table:** slug, name, goal_type (sport | performance | physique | mobility | rehab), description, tags. **Implemented:** 20250301000004, 20250301000005 seed (strength, muscle, endurance, conditioning, mobility, climbing, trail_running, ski, physique, resilience).
- **Goal demand profile:** Relative weights (0–3) for strength, power, aerobic, anaerobic, mobility, prehab, recovery. Used for target vector and quality alignment. **Implemented:** goal_demand_profile; seed in 20250301000005.
- **Goal–tag profile:** Each goal_slug maps to tag_slugs for exercise scoring (get_exercises_by_goals_ranked). **Implemented:** goal_tag_profile (20250305100001); strength→compound/squat/hinge/push/pull; muscle→hypertrophy/compound/isolation/body-part tags; endurance→conditioning/zone2; etc.
- **Mapping DB goal ↔ PrimaryGoal:** muscle → hypertrophy; physique → body_recomp; resilience → recovery; sport goals (climbing, trail_running, ski) → blend or conditioning/endurance. Generator input uses PrimaryGoal; DB goals used for Adaptive/Sport Prep UI and ranked exercise queries.

### Context-dependent heuristics (implemented)

- **Goal sub-focus (Manual mode):** Per-goal sub-options (e.g. strength: squat, deadlift_hinge, bench_press, pull; muscle: glutes, back, chest, arms, …) with tag mapping for exercise biasing. **Implemented:** goal_sub_focus, goal_sub_focus_tag_map (20250318000000); data/goalSubFocus (GOAL_SUB_FOCUS_OPTIONS, GOAL_SUB_FOCUS_TAG_MAP); getExerciseTagsForGoalSubFocuses. **Evidence for sub-goals and tag mapping:** See docs/research/goal-sub-goals-audit-2025.md.
- **Calisthenics:** Bodyweight preference; rep range 6–12; preferredMovementPatterns push, pull, core. **Implemented:** GOAL_TRAINING_RULES.calisthenics.

### Speculative / deferred

- Secondary goals (array) — generator uses primary_goal; secondary_goals can blend in target vector or session mix (implementation-specific).
- Goal-specific block templates (e.g. “power day” vs “hypertrophy day”) — partially in blockOrder and preferredFormats; full templates deferred.

---

## 4. Comparison to implementation

- **Before:** PrimaryGoal and GOAL_TRAINING_RULES with inline evidence comments; goals table and goal_demand_profile seed; goal_tag_profile; goal_sub_focus schema and sample seed; evidence-review-prescription-rep-rest.md.
- **After (this audit):** (1) Single research note tying all goal types and prescription to NSCA, ACSM, ExRx, NCSF, Schoenfeld. (2) Documented DB goals vs PrimaryGoal mapping and use (prescription vs UI/ranking). (3) Goal sub-focus and tag map referenced. (4) Table comments reference evidence doc. No data or logic change.

---

## 5. Generator / app use

- **getGoalRules(goal):** Returns GoalTrainingRule for primary_goal; used by getPrescription in dailyGenerator (rep range, sets, rest, conditioning strategy, block order).
- **getPrescription(exercise, blockType, energyLevel, primaryGoal, …):** Applies goal rules and getEffectiveRepRange; returns sets, reps, rest_seconds, coaching_cues.
- **Target vector:** When user has goals (and optional sport), target vector blends goal weights with sport weights (targetVector.ts); goal_demand_profile and goal_tag_profile inform exercise ranking in get_exercises_by_goals_ranked and Manual/Adaptive flows.
- **Goal sub-focus:** getExerciseTagsForGoalSubFocuses(goalSlug, subFocusSlugs) returns tag weights; used to bias exercise selection when user selects sub-goals in Manual mode.

---

## 6. Validation

- Every PrimaryGoal in types.ts has an entry in GOAL_TRAINING_RULES (getGoalRules fallback to hypertrophy for unknown).
- DB goals seed aligns with goal_type enum; goal_demand_profile and goal_tag_profile rows exist for each goal slug.
- Goal sub-focus options and tag map keys align with goal slugs used in UI.

---

## 7. References

- NSCA: Essentials of S&C (strength, hypertrophy, power, endurance prescription).
- ACSM: Position stand (1–6 RM strength, 6–12 hypertrophy, 15–25+ endurance; rest intervals).
- Schoenfeld et al.: Hypertrophy rep range and rest (6–20 reps, ≥60 s).
- ExRx.net: Movement patterns (goal–tag mapping).
- NCSF: Program design (goal-specific programming).
- Project: prescriptionRules.ts, evidence-review-prescription-rep-rest.md, rep-ranges-audit-2025.md, 20250301000004/00005, 20250305100001, 20250318000000, data/goalSubFocus/, logic/workoutGeneration/types.ts.
