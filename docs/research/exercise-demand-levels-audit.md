# Exercise demand levels audit — warmup, cooldown, stability, grip, impact

**Date:** 2025-03-25  
**Scope:** Normalize and backfill the five demand/relevance columns on `public.exercises`: `warmup_relevance`, `cooldown_relevance`, `stability_demand`, `grip_demand`, `impact_level`. All use the same canonical levels; invalid values are normalized or cleared and missing values are backfilled by role/slug/modality.  
**Run type:** Exercise DB enrichment (one category: demand levels).

---

## 1. Purpose

- **warmup_relevance** — How suitable the exercise is as a warm-up (activation, light mobility). Generator prefers high/medium when scoring warmup block candidates.
- **cooldown_relevance** — How suitable as cooldown/stretch. Cooldown selection sorts by this (with role); prefer high/medium for cooldown block.
- **stability_demand** — Balance/single-leg/anti-rotation demand. Optional: down-rank high when user is beginner.
- **grip_demand** — Forearm/grip fatigue. high/medium → `hasGripFatigueDemand` true; adds "grip" to fatigue regions for superset logic (no double grip).
- **impact_level** — Joint impact (plyometric, running). Down-rank or exclude high when user has knee/lower_back/ankle limitations.

**Ontology:** docs/EXERCISE_ONTOLOGY_DESIGN.md § C.16. **Storage:** DB columns (text). Optional on Exercise.

---

## 2. Canonical values (all five columns)

**Allowed:** `none` | `low` | `medium` | `high` (lib/ontology/vocabularies.ts DEMAND_LEVELS).

- **Normalize:** Trim and lowercase; if not in this set, set to NULL. Adapter only passes through exact `none`/`low`/`medium`/`high`.

---

## 3. Derivation rules

- **warmup_relevance:** high = classic prep/mobility slugs (cat_camel, band_pullapart, dead_bug, etc.); medium = exercise_role mobility or modalities mobility/recovery; low = cooldown role or main_compound/accessory/isolation/finisher/conditioning (so they are not preferred as warmup).
- **cooldown_relevance:** high = dedicated stretch/mobility slugs; medium = mobility/cooldown role; low = main_compound/accessory/isolation/finisher/conditioning.
- **stability_demand:** high = single-leg/pistol/unstable (pistol_squat, bulgarian_split_squat, etc.); medium = unilateral or single-arm; low = machine/supported (leg_extension, leg_press, etc.).
- **grip_demand:** high = pull-up, deadlift, carry, row, hang; medium = barbell push/pull/hinge; else leave null or none.
- **impact_level:** high = plyometric/jump/run (jump_squat, burpee, running); medium = conditioning or step/lunge; low = strength/hypertrophy/power movement_pattern (squat, hinge, push, pull, carry, rotate).

---

## 4. Implementation

- **Normalize:** For each of the five columns, set value = lower(trim(value)) when in ('none','low','medium','high'); else set to NULL.
- **Backfill:** Apply same logic as 20250320000001 (slug lists, exercise_role, modalities, movement_pattern, equipment, unilateral). Then set warmup_relevance = low and cooldown_relevance = low for main_compound/accessory/isolation/finisher/conditioning where still null.

---

## 5. Validation

- Every non-null value in these columns is one of: none, low, medium, high (lowercase). Generator/adapter use them for warmup/cooldown scoring, grip fatigue, and impact-aware filtering.

---

## 6. References

- **Evidence-based audit (same sources):** docs/research/demand-levels-audit-2025.md (NSCA, ACSM, ExRx, NCSF; warmup/cooldown/stability/grip/impact; block selection, superset grip, injury-aware).
- Project: docs/EXERCISE_ONTOLOGY_DESIGN.md § C.16, lib/ontology/vocabularies.ts (DEMAND_LEVELS), supabase/migrations/20250325000011_exercise_demand_levels_audit.sql, 20250331000000 (consolidated), 20250331000006_demand_levels_evidence_enrichment.sql, logic/workoutGeneration/cooldownSelection.ts, ontologyScoring.ts, dailyGenerator.ts (impact_level), logic/workoutIntelligence/supersetPairing.ts (grip_demand), lib/db/generatorExerciseAdapter.ts (demandSlug).
