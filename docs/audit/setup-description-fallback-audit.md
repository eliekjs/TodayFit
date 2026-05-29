# SETUP modal description fallback audit

**Date:** 2026-05-28  
**Trigger:** "Ankle Dorsiflexion Stretch" SETUP modal shows generic "Controlled, full range of motion. Breathe steadily."

## Summary

The SETUP modal displays exercise setup copy resolved by `formatExerciseDisplayCue()`. When no curated or valid catalog description exists, it falls back to session `coaching_cues` — generic mobility prescription text from `getPrescription()`. DB-only mobility exercises without curated entries caused the reported bug.

## UI path

1. `WorkoutBlockList` / `manual/execute` — "setup" button
2. `formatExerciseDisplayCue(item)` — `lib/exerciseDisplayCue.ts`
3. `ExerciseSetupModal` — renders `setupText` under "Setup" eyebrow

## Data path

1. `generateWorkoutSession` → `attachExerciseDescriptionsToSession` → `resolveExerciseDescription(slug, dbDesc)`
2. Source priority: `data/exerciseDescriptions.curated.json` > DB `description` (unless generated stub)
3. No separate `setup_instructions` field — `description` is setup/display copy

## Fallback strings

| String | File |
|--------|------|
| Controlled, full range of motion. Breathe steadily. | `logic/workoutGeneration/dailyGenerator.ts`, `lib/generator.ts` |
| Controlled, full range of motion. | `logic/workoutIntelligence/validation/workoutValidator.ts` |
| Focus on form and control. Quality over weight. | `dailyGenerator.ts` (beginner override) |
| Controlled tempo. Own the joint position… | `dailyGenerator.ts` (stability sub-focus) |

Generic curated patterns: `scripts/auditExerciseDescriptions.ts` → `GENERIC_PATTERNS`.

## Scale

- **15** mobility/prehab slugs from DB expansion lacked curated copy — **fixed in P0+P1 (2026-05-28)**
- **4,014+** static catalog slugs had curated entries
- **823** curated entries flagged `generic_template` in 2026-05-25 audit artifact — largely cleaned since; P2 chunk work ongoing

## Missing curated slugs (pre-P0 fix)

ankle_circles, ankle_dorsiflexion_stretch, banded_ankle_mob, seated_hip_internal_rotation, lying_hip_rotation, quadruped_hip_circle, prone_extension, sphinx_stretch, band_ir_er, wrist_circles, finger_extensions, foam_roll_quad, foam_roll_glute, foam_roll_t_spine, breathing_box

## Related docs

- Fix plan: `docs/audit/exercise-description-quality-fix-plan.md`
- Curated sync: `scripts/syncExerciseDescriptionsToSupabase.ts`
- Audit script: `scripts/auditExerciseDescriptions.ts`
