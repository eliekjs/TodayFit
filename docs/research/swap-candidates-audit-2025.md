# Exercise swap_candidates audit: evidence-based standards and enrichment

**Date:** 2025-03-16  
**Category:** Exercise DB enrichment — swap_candidates (substitution in same block/slot)  
**Scope:** Audit swap_candidates purpose and content using NSCA, ACSM, ExRx, NCSF; define substitution principles (same pattern/family, similar equipment); normalize and backfill logical substitutes. Used by substitution/swap logic and UI to suggest alternatives.

---

## 1. Research question

When is one exercise a good substitute for another in the same block or slot? What do evidence and convention say about substitution (same movement pattern, same muscle group, similar equipment, progressions/regressions)?

---

## 2. Sources

| Source | Type (Tier) | Key claim(s) |
|--------|-------------|--------------|
| **ExRx.net** — Exercise directory, exercise alternatives | Tier 2 | Many exercises list "alternatives" or "substitutes" (e.g. bench press ↔ dumbbell press, push-up; squat ↔ leg press, lunge; deadlift ↔ RDL, good morning). Same movement pattern and primary muscles are the basis for substitution. |
| **NSCA** — Program design, exercise selection | Tier 1 | Substitution should preserve movement pattern and loading (e.g. horizontal push → bench, push-up, dip; vertical pull → pull-up, lat pulldown; hinge → deadlift, RDL, good morning). Equipment availability and skill level drive alternatives. |
| **ACSM** — Resistance training guidelines | Tier 1 | Exercise selection and progression; alternatives when equipment or mobility limits primary choice (e.g. leg press for squat, lat pulldown for pull-up). Same movement pattern and muscle focus. |
| **NCSF** — Program design | Tier 2 | Reinforces same-pattern substitution (squat pattern, hinge pattern, push/pull); bilateral ↔ unilateral alternatives (e.g. back squat ↔ split squat, Bulgarian split squat). |
| **Project** | Internal | docs/EXERCISE_ONTOLOGY_DESIGN.md § C.17, lib/generation/exerciseSubstitution.ts (getSubstitutes: pattern, muscles, progressions/regressions), exercise-swap-candidates-audit.md, 20250325000010, 20250331000000. |

---

## 3. Classification of findings

### High-confidence rules (implemented)

- **Purpose:** swap_candidates = array of exercise **slugs** that are good substitutes for this exercise in the **same block/slot** (equipment missing, user wants alternative, or "swap this exercise"). Used by substitution logic and UI to suggest or rank alternatives.
- **Substitution principle:** Same **movement pattern** (push, pull, squat, hinge, etc.) and same **primary muscle focus** (ExRx/NSCA). When pattern matches, substitutes are interchangeable for program intent; when equipment differs (barbell vs dumbbell vs cable), list as swap so user can pick by availability. **Implemented:** Backfill uses same-pattern, same-family pairs (bench ↔ db_bench ↔ push_up ↔ dips; row ↔ cable_row ↔ pullup ↔ lat_pulldown; squat ↔ front_squat ↔ goblet ↔ leg_press; hinge ↔ RDL ↔ hip_thrust ↔ good_morning).
- **No self-reference:** Do not include the exercise's own slug. **Implemented:** Normalize step removes self.
- **Only active slugs:** Every slug in swap_candidates must exist in public.exercises with is_active = true. **Implemented:** Normalize removes invalid slugs.
- **Bidirectional preference:** Where A lists B as swap_candidate, B should typically list A (ExRx/NSCA: substitution is symmetric by pattern). **Implemented:** Curation and migrations add both directions where appropriate.
- **Similar equipment / progression:** Prefer substitutes that are same family (e.g. barbell row ↔ cable row ↔ dumbbell row; barbell squat ↔ goblet ↔ leg press). **Implemented:** Backfill pairs by pattern and common equipment options.

### Context-dependent heuristics (implemented)

- **Compound ↔ isolation:** Less common to list isolation as swap for compound (e.g. leg extension as swap for squat is acceptable for "knee-friendly" slot but not ideal for strength slot). We allow same-pattern swaps including machine/isolation where they fit (leg_extension ↔ leg_curl for "leg" slot; tricep pushdown ↔ skull crusher for triceps).
- **Power/Olympic:** Clean ↔ power clean ↔ hang clean; snatch ↔ power snatch. Can add in enrichment where we have those slugs.
- **Core:** Plank ↔ dead bug ↔ bird dog ↔ side plank ↔ hollow hold (anti-extension); ab wheel, pallof for rotation/anti-rotation. **Implemented:** 20250325000010, 20250331000000.

### Speculative / deferred

- Weighting or ordering within swap_candidates (e.g. "best" substitute first) — currently unordered; getSubstitutes ranks by pattern/muscles/regressions. Defer explicit priority in array.
- Equipment-filtered swap (e.g. "only show bodyweight swaps") — handled by candidate pool filter; swap_candidates can include all valid substitutes.

---

## 4. Comparison to implementation

- **Before:** Normalize (remove self, invalid slugs, dedupe); backfill for incline_db_press, push_up, dips, db_row, trx_row, leg_press_machine, leg_extension, leg_curl, close_grip_bench, overhead_tricep_extension, hammer_curl, preacher_curl, rdl_dumbbell, single_leg_rdl, glute_bridge, side_plank, plank, hollow_hold (20250325000010). Consolidated migration added barbell_back_squat, front_squat, thruster, db_shoulder_press, db_curl, barbell_row, barbell_deadlift, trap_bar_deadlift, db_bench (20250331000000).
- **After (this audit):** (1) Research note ties substitution to ExRx/NSCA/ACSM/NCSF (same pattern, same muscle focus, equipment alternatives). (2) Additional swap pairs for oh_press, incline_bench_barbell, pullup, chinup, lat_pulldown, sumo_deadlift, good_morning, back_extension, ab_wheel, pallof_hold, and other stragglers (20250331000005). (3) No schema change; validation and comments reference evidence doc.

---

## 5. Generator / app use

- **getSubstitutes (exerciseSubstitution.ts):** Ranks candidates by movement_pattern, muscle_groups, progressions/regressions; does not currently filter by swap_candidates. When candidate pool is built from DB, exercises with swap_candidates can be used by UI to **prefer** or **highlight** those slugs when suggesting swaps.
- **Adapter:** Passes swap_candidates to Exercise (generatorExerciseAdapter.ts). Regenerate mode "keep_structure_swap_exercises" uses substitution to pick alternatives; swap_candidates can inform which exercises are in the candidate set when building pool from library.
- **Validation:** No self-reference; only active slugs; deduplicated.

---

## 6. Validation

- No exercise has its own slug in swap_candidates. Every slug in swap_candidates exists in public.exercises with is_active = true. No duplicates.
- Prefer bidirectional pairs for main compounds (A lists B ⇒ B lists A where appropriate).

---

## 7. References

- ExRx.net: Exercise directory (alternatives/substitutes by movement and muscles).
- NSCA: Program design, exercise selection (same pattern, equipment alternatives).
- ACSM: Resistance training (alternatives when equipment or mobility limits choice).
- NCSF: Program design (same-pattern substitution, bilateral/unilateral).
- Project: EXERCISE_ONTOLOGY_DESIGN.md § C.17, exerciseSubstitution.ts, exercise-swap-candidates-audit.md, 20250325000010, 20250331000000, 20250331000005.
