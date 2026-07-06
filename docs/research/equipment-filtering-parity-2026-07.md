# Equipment filtering parity — implementation note

**Date:** 2026-07-06  
**Category:** Exercise DB enrichment + generator adapter — equipment filtering parity  
**Scope:** Close gaps between gym profile equipment buttons, exercise `equipment` data, and hard filtering at generation time.

---

## Problem

- ~450+ catalog rows were tagged `bodyweight` only despite names requiring implements (clubbell, mace, landmine, barbell, dumbbell, cable, etc.).
- Profile selections did not imply related equipment (`adjustable_bench` ≠ `bench`, `barbell` ≠ `plates`, `lat_pulldown` ≠ `cable_machine`).
- Name-based inference existed only on the static adapter path, not the Supabase DB adapter path.
- `EQUIPMENT_SLUGS` ontology vocabulary drifted from `EquipmentKey`.

## Implementation

### Phase 1 — Shared resolution (`lib/equipmentResolution.ts`)

- `inferImplementsFromExerciseName` — slug/name hints with underscore-safe tokenization.
- `resolveExerciseEquipmentRequired` — merges stored equipment with name hints; drops erroneous lone `bodyweight` when implements are inferred.
- `expandProfileEquipmentForFiltering` — profile implications: `adjustable_bench` → `bench`, `barbell` → `plates`, `lat_pulldown` → `cable_machine`.

### Phase 2 — Wiring

- `exerciseDefinitionToGeneratorExercise` and `mapDbExerciseToGeneratorExercise` both call `resolveExerciseEquipmentRequired`.
- `resolveEffectiveEquipment` uses profile expansion before dedicated-machine → `machine` implication.

### Phase 3 — Static catalog backfill

- `scripts/backfillExerciseEquipment.ts` — patches `data/exercises.ts`, `exercisesFunctionalFitness.ts`, `otaMovements.ts`.
- Applied: **847** exercise rows updated.

### Phase 4 — DB migration

- `supabase/migrations/20260706120000_exercise_equipment_backfill.sql` — pattern-based SQL updates for production DB rows.

### Phase 5 — Ontology sync

- `lib/ontology/vocabularies.ts` `EQUIPMENT_SLUGS` aligned with `EquipmentKey`.

## Validation

```bash
npx vitest run lib/equipmentResolution.test.ts
npx tsx scripts/backfillExerciseEquipment.ts --dry-run  # expect 0 changes after backfill
```

## Risks / follow-ups

- Name inference can over-tag pulldown/cable variants; monitor generator pool sizes for niche profiles.
- Re-run `scripts/seedExercisesToDb.ts` after merge to sync Supabase.
- `foam_roller` and `elliptical` remain UI-only (warmup rules / future cardio tagging).

## References

- Prior audit: `docs/research/equipment-audit-2025.md`
- Profile UI: `data/gymProfiles.ts`
- Filtering: `logic/workoutIntelligence/constraints/eligibilityHelpers.ts`
