# Exercise role audit — ontology alignment

**Date:** 2025-03-25  
**Scope:** Ensure every active exercise has correct `exercise_role` (block placement: warmup, main, accessory, cooldown, etc.) per ontology and generator block logic.  
**Run type:** Exercise DB enrichment (one category: exercise_role).

---

## 1. Purpose

- **exercise_role** = primary session placement for the exercise (which block types it is suitable for).
- Drives: main-work pool exclusion (cooldown/stretch/mobility/breathing excluded), cooldown selection (stretch vs mobility), warmup selection (prep/warmup/mobility), and role-based scoring (main_compound vs accessory vs isolation).

---

## 2. Canonical values (ontology § C.5 + lib/ontology/vocabularies.ts)

| Slug | Definition | When to use |
|------|------------|-------------|
| `warmup` | Warm-up only (activation, light cardio) | Band work, light bike, jump rope |
| `prep` | Prep / activation (pre-main) | Hip circles, glute bridge, shoulder CARs |
| `main_compound` | Primary compound lift | Squat, deadlift, bench, OH press, pull-up |
| `accessory` | Accessory / secondary lift | Rows, RDL, split squat, isolation work |
| `isolation` | Single-joint / isolation | Leg curl, leg ext, fly, curl |
| `finisher` | Finisher (burnout, core) | Plank, core finisher, light pump |
| `cooldown` | Cooldown (stretch/mobility) | Static stretch, breathing (legacy) |
| `stretch` | Stretch-only (cooldown pool) | Exercises with stretch_targets; stretch-only block |
| `mobility` | Mobility block | T-spine, hip mobility, flows |
| `breathing` | Breathing / recovery | Diaphragmatic breathing, recovery emphasis |
| `conditioning` | Conditioning block | Run, row, bike, circuit |

**Cardinality:** Single. Use the **most common** placement when an exercise fits multiple (e.g. glute bridge → prep).

**Generator:** `MAIN_WORK_EXCLUDED_ROLES` = cooldown, stretch, mobility, breathing. So those roles are excluded from main-strength/main-hypertrophy blocks.

---

## 3. Derivation rules

- **mobility** / **prep**: modalities include mobility or recovery; or slug in known mobility/prep list (cat_camel, t_spine_rotation, band pull-apart, glute bridge hold, hip circles, etc.).
- **stretch** / **cooldown**: stretch_targets set or slug like %stretch%; static stretches → stretch; legacy cooldown list → cooldown or stretch.
- **conditioning**: primary_movement_family = conditioning or modalities include conditioning + locomotion.
- **main_compound**: big compound lifts by slug (back squat, deadlift, bench, OH press, pull-up, barbell row, hip thrust, goblet squat, etc.) and multi-joint.
- **isolation**: single-joint by slug (leg extension, leg curl, fly, curl, lateral raise, tricep pushdown, etc.).
- **accessory**: rows, RDL, split squat, raises, curls, calf raise, etc. (multi-joint but not main anchor).
- **finisher**: plank, core finisher, burnout-style.
- **warmup**: jump rope, light cardio that is warmup-only.
- **breathing**: breathing_diaphragmatic, breathing_cooldown.

---

## 4. Implementation

- Backfill `exercise_role` for every active exercise where it is NULL, using primary_movement_family, modalities, slug, stretch_targets/mobility_targets.
- Preserve existing stretch/mobility/cooldown/prep assignments from later migrations (20250324000000, 20250317000000).
- Normalize any invalid role to an allowed slug (from EXERCISE_ROLES).

---

## 5. Validation

- Every active exercise has exercise_role in (warmup, prep, main_compound, accessory, isolation, finisher, cooldown, stretch, mobility, breathing, conditioning).
- Main-work pool excludes cooldown, stretch, mobility, breathing.
- Cooldown block selection uses stretch_targets and role (stretch, cooldown, breathing).

---

## 6. References

- Project: docs/EXERCISE_ONTOLOGY_DESIGN.md § C.5, lib/ontology/vocabularies.ts (EXERCISE_ROLES), logic/workoutGeneration/cooldownSelection.ts (MAIN_WORK_EXCLUDED_ROLES, isStretchOnlyEligible), supabase/migrations/20250312000002_exercise_structured_backfill.sql, 20250324000000_stretches_and_mobility_expansion.sql.
