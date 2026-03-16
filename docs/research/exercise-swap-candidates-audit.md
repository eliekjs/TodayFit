# Exercise swap_candidates audit — substitution in same slot

**Date:** 2025-03-25  
**Scope:** Define purpose and standards for the `swap_candidates` column on `public.exercises`; normalize (remove self, invalid slugs, dedupe) and backfill logical substitutes for more exercises.  
**Run type:** Exercise DB enrichment (one category: swap_candidates).

---

## 1. Purpose

- **swap_candidates** = array of exercise **slugs** that are good substitutes for this exercise in the same block/slot (e.g. when equipment is missing, user wants an alternative, or substitution is suggested). Used by substitution/swap logic to suggest or rank alternatives.
- **Ontology:** docs/EXERCISE_ONTOLOGY_DESIGN.md § C.17 — "Exercise slugs that are good substitutes in the same block/slot." Cardinality: multi (slugs). Storage: DB `swap_candidates` (text[]).
- **Generator / app:** `lib/generation/exerciseSubstitution.ts` (getSubstitutes), `lib/exerciseProgressions.ts`; adapter passes swap_candidates to Exercise. When present, substitution can prefer or include these in the candidate pool.

---

## 2. Standards

- **Format:** Array of exercise slugs (text). Only slugs that exist in `public.exercises` and are `is_active = true` are valid.
- **Rules:**
  - Do **not** include the exercise's own slug (no self-reference).
  - Prefer same movement family / pattern and similar equipment where possible (curation).
  - Trim/dedupe; no empty strings. Normalize: remove self, remove slugs that don't exist or are inactive, deduplicate.
- **No canonical list** — each exercise has a curated set of substitutes (see 20250320000001 for examples: bench ↔ db_bench, pullup ↔ chinup ↔ lat_pulldown, back squat ↔ front squat ↔ goblet, etc.).

---

## 3. Derivation rules (for backfill)

- **By role and pattern:** Main compounds: other main compounds in same pattern (push, pull, squat, hinge). Accessory/isolation: same muscle group or pattern (e.g. tricep pushdown ↔ overhead tricep extension, barbell curl ↔ hammer curl).
- **Bidirectional:** Where A lists B as swap_candidate, B should typically list A (enforced in curation; migration can extend backfill so common pairs are bidirectional).
- **Backfill:** Extend 20250320000001 with more exercises that have obvious substitutes (e.g. leg_extension, leg_curl, dips, incline presses, rows, core exercises). Only set where swap_candidates is null or empty to avoid overwriting existing curation.

---

## 4. Implementation

- **Normalize:** For every exercise with non-empty swap_candidates: remove the exercise's own slug, remove any slug not in (SELECT slug FROM exercises WHERE is_active = true), deduplicate, set to '{}' if result is empty.
- **Backfill:** Add swap_candidates for exercises that currently have none, using logical substitutes (same pattern/family, similar equipment). Prefer bidirectional pairs where appropriate.

---

## 5. Validation

- No exercise has its own slug in its swap_candidates. Every slug in swap_candidates exists in public.exercises with is_active = true. No duplicates.

---

## 6. References

- **Evidence-based audit (same sources):** docs/research/swap-candidates-audit-2025.md (NSCA, ACSM, ExRx, NCSF; same pattern/family, equipment alternatives; substitution in same block/slot).
- Project: docs/EXERCISE_ONTOLOGY_DESIGN.md § C.17, supabase/migrations/20250325000010_exercise_swap_candidates_audit.sql, 20250331000000 (consolidated), 20250331000005_swap_candidates_evidence_enrichment.sql, lib/generation/exerciseSubstitution.ts, lib/exerciseProgressions.ts, lib/db/generatorExerciseAdapter.ts.
