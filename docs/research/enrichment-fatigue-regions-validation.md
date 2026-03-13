# Enrichment: fatigue_regions — validation notes

**Category:** fatigue_regions (single category per run)  
**Migration:** `supabase/migrations/20250319000000_exercise_fatigue_regions_enrichment.sql`  
**Agent run:** exercise-db-enrichment-agent

---

## What was done

1. **Normalize** existing `fatigue_regions` that contained non-canonical slugs (`legs`, `chest`, `back`) to canonical only:
   - `legs` → `quads`, `glutes` (squat/lunge/locomotion) or `glutes`, `hamstrings` (hinge)
   - `chest` → `pecs`
   - `back` → `lats`

2. **Backfill** rows with NULL or empty `fatigue_regions` using:
   - `pairing_category` when set (chest→pecs+triceps, back→lats+biceps, quads→quads+core, posterior_chain→hamstrings+glutes+core, grip→forearms+grip+core, etc.)
   - `primary_movement_family` when `pairing_category` is null (upper_push, upper_pull, lower_body, core, mobility, conditioning)

3. **Grip** exercises (`pairing_category = 'grip'`): ensure `forearms` and `grip` are present in `fatigue_regions` for superset “no double grip” logic.

---

## Canonical slug set

All values match `lib/ontology/vocabularies.ts` `FATIGUE_REGIONS` and `docs/EXERCISE_ONTOLOGY_DESIGN.md` C.12:

`quads`, `glutes`, `hamstrings`, `pecs`, `triceps`, `shoulders`, `lats`, `biceps`, `forearms`, `grip`, `core`, `calves`.

No new slugs added; no schema change.

---

## Validation checklist

- [x] Only existing column `fatigue_regions` (text[]) used; no new columns.
- [x] All written values are from the canonical list above.
- [x] Migration is idempotent-friendly (UPDATE only; no INSERT of new exercises).
- [x] Generator and adapter: `fatigue_regions` is already read by `lib/db/generatorExerciseAdapter.ts` and `logic/workoutGeneration/ontologyNormalization.ts` (`getEffectiveFatigueRegions`); no code changes required.
- [ ] After applying migration: run `npm run test:generator` and `npm run test:phase5` to confirm no breakage.

---

## Rollback

Revert the migration or re-run the previous backfill (20250312000002 step 8) if fatigue_regions need to be reset from primary_muscles. No application code rollback needed.
