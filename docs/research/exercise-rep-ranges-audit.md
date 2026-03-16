# Exercise rep ranges audit — ontology and prescription alignment

**Date:** 2025-03-25  
**Scope:** Ensure exercise-specific `rep_range_min` and `rep_range_max` are set only where evidence or convention warrants; normalize invalid values and backfill by role/slug.  
**Run type:** Exercise DB enrichment (one category: rep ranges).

---

## 1. Purpose

- **rep_range_min** / **rep_range_max** = optional integer bounds for prescription. When **both** are set, the generator blends this range with the goal rep range (intersection: `max(goal.min, ex.min)` to `min(goal.max, ex.max)`). When either is null, the goal range alone is used.
- Use for exercises that respond better to higher (or narrower) rep bands than the default 8–12: calves 15–25, isolation/small-muscle 10–20, etc. Leave null for main compounds so goal (strength 3–6, hypertrophy 8–15, endurance 15–25) drives prescription.
- **Generator:** `logic/workoutGeneration/dailyGenerator.ts` `getEffectiveRepRange(exercise, goalRange)`; `lib/generation/prescriptionRules.ts` documents goal ranges. See `docs/REP_RANGE_AND_SUPERSET_DURATION.md`.

---

## 2. Constraints and allowed values

- **Type:** Integer. **Range:** 0–100 (0 used for time-based blocks at style level; exercise-level we use 1–50 for rep-based).
- **Rule:** Either both `rep_range_min` and `rep_range_max` are set, or both are null. If only one is set, treat as invalid and clear. Require `rep_range_min <= rep_range_max`; if not, normalize (swap or set both null).
- **No canonical list of “allowed” pairs** — values are exercise-specific. Common bands:
  - **Calves / small muscles:** 15–25 (Schoenfeld, RP Strength, calf volume).
  - **Isolation / small-muscle (raises, curls, extensions, face pulls):** 10–20.
  - **Main compounds:** leave null (goal dictates).
  - **Mobility / conditioning:** leave null (time-based or 1 rep / hold).

---

## 3. Derivation rules

- **Calves:** slug or name indicates calf raise → 15–25.
- **Isolation (exercise_role = isolation):** 10–20 (lateral raise, curl, leg curl, leg extension, fly, pushdown, etc.).
- **High-rep by slug:** lateral_raise, face_pull, reverse_fly, concentration_curl, tricep_pushdown, leg_curl, leg_extension, and similar → 10–20 or 12–20.
- **Main compound, mobility, conditioning:** do not set; leave null so goal and block type drive reps.
- **Accessory (non-isolation):** optional 8–20; prefer leaving null unless there is a clear reason (e.g. specific exercise responds better to higher reps).

---

## 4. Implementation

- **Normalize:** Where rep_range_min > rep_range_max, set both to null (or swap). Where only one of min/max is set, set both to null. Where value < 0 or > 100, set that value (or both) to null.
- **Backfill:** Set 15–25 for calf exercises; 10–20 for exercise_role = isolation; 12–20 (or 10–20) for known high-rep slugs not yet covered. Do not set for main_compound, mobility, conditioning.

---

## 5. Validation

- For every active exercise, either (rep_range_min IS NULL AND rep_range_max IS NULL) or (rep_range_min IS NOT NULL AND rep_range_max IS NOT NULL AND rep_range_min <= rep_range_max AND rep_range_min >= 0 AND rep_range_max <= 100).
- getEffectiveRepRange uses exercise override only when both are set; otherwise goal range is used.

---

## 6. References

- Project: docs/REP_RANGE_AND_SUPERSET_DURATION.md, lib/generation/prescriptionRules.ts, logic/workoutGeneration/dailyGenerator.ts (getEffectiveRepRange), logic/workoutIntelligence/prescriptionStyles.ts, supabase/migrations/20250316100001_exercise_rep_ranges.sql, docs/research/evidence-review-prescription-rep-rest.md.
