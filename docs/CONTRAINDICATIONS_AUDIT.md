# Exercise contraindications audit

This document summarizes how contraindications are used and lists the current state of the exercise data (static `data/exercises.ts` and Supabase `exercise_contraindications` / `contraindication_tags`).

## How contraindications work

- **Canonical keys:** `shoulder`, `knee`, `lower_back`, `elbow`, `wrist`, `hip`, `ankle` (body regions to avoid when injured).
- **Filtering:** When the user selects an injury (e.g. "Shoulder"), the generator and `listExercises` / `listExercisesForGenerator` exclude any exercise that has that key in its contraindications.
- **Sources of truth:**
  - **Manual/Build path (DB configured):** `lib/db/exerciseRepository.ts` `listExercises()` → reads `exercise_contraindications` and filters by `filters.injuries`.
  - **Manual path (static):** `lib/generator.ts` uses `filterByInjuries()` against each exercise’s `contraindications` from `data/exercises.ts`.
  - **Adaptive path:** Uses `listExercisesForGenerator()` which joins `exercise_contraindications` and uses `contraindication_tags` when present; same injury keys apply.

If an exercise that clearly stresses a joint (e.g. battle rope waves → shoulder) has no contraindication for that joint, it will **not** be excluded when the user selects that injury.

## Cooldown and equipment

- **Rule:** Cooldown blocks must not use dumbbells, kettlebells, barbells, cables, or machines. Only bodyweight, bands, foam roller, miniband (see `COOLDOWN_ALLOWED_EQUIPMENT` in `lib/workoutRules.ts`).
- **Implementation:** `lib/generator.ts` now restricts the cooldown pool with `isCooldownEligibleEquipment(e.equipment)`. So mobility exercises that require dumbbells (e.g. YTW raise) are no longer eligible for cooldown.

## Audit: fixes applied (March 2025)

### 1. Cooldown equipment (code)

- **Issue:** YTW raise (dumbbells) was eligible for cooldown because only modality (mobility) was checked.
- **Fix:** Cooldown pool in `lib/generator.ts` now also requires `isCooldownEligibleEquipment(e.equipment)`. YTW and any other mobility exercise that uses weights/cables/machines are excluded from cooldown.

### 2. Battle rope waves and other DB exercises (data)

- **Issue:** With "Shoulder" injury selected, battle rope waves could still be programmed; they heavily stress the shoulder (and wrist).
- **Fix:** Migration `20250323000000_contraindications_shoulder_conditioning.sql` adds missing rows to `exercise_contraindications` for:
  - **battle_rope_waves:** shoulder, wrist
  - **devils_press:** shoulder, lower_back
  - **ski_erg_intervals / ski_erg_steady:** shoulder, lower_back
  - **rower_steady / rower_intervals_30_30 / row_calorie_burn:** lower_back
  - **cable_lateral_raise / leaning_lateral_raise / reverse_pec_deck:** shoulder
  - **medicine_ball_chest_pass:** shoulder
  - **double_unders:** knee, wrist
  - **prone_extension:** lower_back

### 3. Static exercise list (`data/exercises.ts`)

- All entries that have `contraindications` are used by the manual generator when the DB is not configured or when falling back.
- No battle rope or YTW in this file; battle rope is DB-only; YTW is DB-only (and now excluded from cooldown by equipment).

## Checklist for new or updated exercises

When adding or editing exercises (DB or static):

1. **Shoulder:** Any overhead press, lateral raise, battle ropes, rowing/ski erg, chest pass, dips, pull-ups, push-ups, planks, face pull, band pull-apart, sleeper stretch → consider `shoulder`.
2. **Wrist:** Push-ups, planks, bench, battle ropes, double unders, gripping loads → consider `wrist`.
3. **Knee:** Squats, lunges, step-ups, leg extension/curl, jumping/plyo, treadmill/stairs → consider `knee`.
4. **Lower back:** Deadlifts, RDLs, good mornings, rower, hip thrust, prone extension, cleans/snatches → consider `lower_back`.
5. **Elbow:** Pull-ups, dips, heavy pulling → consider `elbow`.

## DB backfill note

- `contraindication_tags` on `public.exercises` is backfilled from `exercise_contraindications` (see `20250312000002_exercise_structured_backfill.sql`). New rows in `exercise_contraindications` are reflected when that backfill is re-run or when the app reads from `exercise_contraindications` directly (`listExercises` / `listExercisesForGenerator` both use the table), so injury filtering works as soon as the new migration is applied.
