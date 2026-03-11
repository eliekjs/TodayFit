# Phase 5: Prescription Layer

Phase 5 converts the Phase 4 output (GeneratedWorkout with exercise slots, no prescriptions) into a **complete workout prescription**: sets, reps, rest, intent, superset grouping, and optional block notes. It does **not** change exercise selection or re-run the scoring engine.

---

## Architecture

```
resolveSessionTemplate / getSessionTemplateV2
        →
assembleSession (Phase 4)  →  GeneratedWorkout (slots with exercise_id only)
        →
applyPrescriptions (Phase 5)  →  GeneratedWorkout (slots with prescription + name + superset_group, blocks with block_notes)
        →
generateWorkoutWithPrescriptions()  =  assembleSession + applyPrescriptions
```

---

## Data flow

1. **Input**: Phase 4 `GeneratedWorkout` + `PrescriptionContext` (duration_minutes, energy_level, exerciseLookup).
2. **Per block**: Resolve prescription style from block type/format (Phase 3 block template).
3. **Per exercise**: Resolve sets, reps, rest, intent from style + fatigue cost + duration tier + energy + block position.
4. **Duration scaling**: Scale sets down for short sessions (20/30 min).
5. **Superset formatting**: Assign A, B, C labels to pairs in superset/alternating blocks.
6. **Block notes**: Attach optional coaching note per block type.
7. **Fatigue check**: If total sets exceed budget, reduce sets on lower-priority blocks (accessory, core, etc.); never remove exercises.

---

## Prescription resolution

- **Style source**: Block type + format → `getBlockTemplate()` → `prescription_style` (e.g. heavy_strength, moderate_hypertrophy).
- **Sets**: `resolveSets(ctx)` — style range, biased by fatigue cost (high → fewer), duration (short → fewer), energy (low → fewer), block position.
- **Reps**: `resolveReps(ctx)` — single number or "min-max" from style; time-based styles (aerobic_steady) return 0.
- **Rest**: `resolveRest(ctx)` — from style range; strength → longer, density → shorter.
- **Intent**: `getIntentForStyle(styleSlug)` — e.g. "Explosive concentric; full reset between reps", "Controlled eccentric; moderate tempo".

---

## Set/rep resolver (heuristics)

- **resolveSets**: High fatigue → toward min; short duration → toward min; low energy → toward min; later blocks in long sessions → slightly fewer.
- **resolveReps**: Mid-range or "min-max" string when range is wide.
- **resolveRest**: High fatigue / strength → toward max; short session / density → toward min.
- **scaleSetsByDuration**: 20 min → 0.6×, 30 → 0.75×, 45 → 0.9×, 60+ → 1×.

---

## Superset formatting

- **assignSupersetGroups**: In superset/alternating_sets blocks, assign "A" to first pair, "B" to second, etc.
- **formatSupersetRestInstruction(restSeconds)**: "Rest X sec/min after each pair" for display.
- **Set count in UI**: Each superset pair shows how many times to perform it: rep-based → "3 sets — do A then B, rest after both"; time-based single round → "1 round (do once) — do A then B". See `formatSupersetPairLabel` in lib/types.ts and WorkoutBlockList / execute screens.

---

## Set-number reasoning (goals, energy, duration, exercise type)

Set counts are chosen so they reflect **goals**, **energy**, **time available**, and **exercise type**, in line with common research and practice:

1. **Energy**  
   Low energy → fewer sets (2) to preserve quality and recovery; high → more (4); medium → 3. Reduces injury and overreaching when the user is tired.

2. **Duration**  
   Short sessions (e.g. ≤25 min) → cap at 2 sets per exercise so the workout fits and each set stays quality-focused. ≤40 min → cap at 3 sets; longer → up to 4. Aligns with time-efficient resistance training (e.g. 2–3 sets per exercise when time is limited).

3. **Goals**  
   Hypertrophy / recomp → moderate set ranges (3–4) consistent with meta-analyses (e.g. Schoenfeld) on effective volume. Strength/power → 3–5 sets; we use the same energy-based band (2–4) and duration cap.

4. **Exercise type**  
   - **Conditioning / time-based**: 1 set (one continuous or time-based block) — displayed as "1 round (do once)" so it’s clear the superset is done once.  
   - **Power**: 3–6 sets with adequate rest; we use the same duration- and energy-capped base.  
   - **Mobility / accessory**: 2–4 sets; often 1–2 sets is enough for mobility, but we use the shared cap for consistency.

5. **Supersets**  
   Both exercises in a pair get the same set count (e.g. 3 sets of A1 and 3 sets of A2). The UI shows this at the pair level ("3 sets") and per exercise ("3 x 8 reps") so users see how many sets of each and how many rounds of the pair.

---

## Duration and fatigue

- **Duration**: Sets are scaled by tier before fatigue check.
- **Fatigue check**: After all prescriptions are set, if total sets > fatigue_budget × 2, reduce sets starting from lowest-priority blocks (warmup, prep, cooldown, mobility, accessory, core, then main). Minimum 1 set per exercise.

---

## Types

- **GeneratedExercisePrescription**: exercise_id, name, sets, reps (number | string), rest_seconds?, intent?, superset_group?, notes?.
- **GeneratedExerciseSlot**: exercise_id + prescription? (GeneratedExercisePrescription).
- **GeneratedBlock**: block_notes? added.
- **WorkoutWithPrescriptions**: Alias for GeneratedWorkout once prescriptions are applied.

---

## File organization

```
logic/workoutIntelligence/
  prescription/
    prescriptionResolver.ts   # applyPrescriptions, getStyleForBlock, block notes
    setRepResolver.ts         # resolveSets, resolveReps, resolveRest
    supersetFormatter.ts      # assignSupersetGroups, formatSupersetRestInstruction
    durationScaling.ts        # scaleSetsByDuration, reduceSetsToFitFatigue
    intentGuidance.ts         # getIntentForStyle
    generateWorkout.ts        # generateWorkoutWithPrescriptions, buildExerciseLookup
```

---

## Pipeline integration

```ts
import { generateWorkoutWithPrescriptions } from "./prescription/generateWorkout";
import { resolveSessionTemplateV2 } from "./sessionTemplatesV2";

const template = resolveSessionTemplateV2(sessionType, stimulusProfile, durationMinutes);
const workout = generateWorkoutWithPrescriptions({
  input: workoutSelectionInput,
  template,
  exercisePool: exerciseWithQualitiesPool,
  title: "Full Body Strength",
});
// workout.blocks[].exercises[].prescription has sets, reps, rest, intent, superset_group
// workout.blocks[].block_notes has optional coaching note
```

---

## Example output (structure)

```json
{
  "id": "workout_123",
  "session_type": "full_body_strength",
  "stimulus_profile": "max_strength",
  "title": "Full Body Strength",
  "duration_minutes": 60,
  "blocks": [
    {
      "block_type": "warmup",
      "format": "circuit",
      "title": "Warm-up",
      "block_notes": "Elevate heart rate and prepare joints for the main work.",
      "exercises": [
        {
          "exercise_id": "cat_cow",
          "prescription": {
            "exercise_id": "cat_cow",
            "name": "Cat-Cow",
            "sets": 1,
            "reps": "8-10",
            "intent": "Smooth range of motion; breath-led"
          }
        }
      ]
    },
    {
      "block_type": "main_strength",
      "format": "straight_sets",
      "title": "Main strength",
      "block_notes": "Primary compound lifts to drive maximal force production.",
      "exercises": [
        {
          "exercise_id": "barbell_back_squat",
          "prescription": {
            "exercise_id": "barbell_back_squat",
            "name": "Back Squat",
            "sets": 4,
            "reps": "3-6",
            "rest_seconds": 180,
            "intent": "High force intent; quality over speed"
          }
        }
      ]
    },
    {
      "block_type": "main_hypertrophy",
      "format": "superset",
      "title": "Main hypertrophy",
      "exercises": [
        {
          "exercise_id": "incline_db_press",
          "prescription": {
            "name": "Incline Dumbbell Press",
            "sets": 3,
            "reps": "8-12",
            "rest_seconds": 60,
            "superset_group": "A",
            "intent": "Controlled eccentric; moderate tempo"
          }
        },
        {
          "exercise_id": "chest_supported_row",
          "prescription": {
            "name": "Chest Supported Row",
            "sets": 3,
            "reps": "8-12",
            "rest_seconds": 60,
            "superset_group": "A",
            "intent": "Controlled eccentric; moderate tempo"
          }
        }
      ]
    }
  ]
}
```

Display: "Superset A — A1. Incline Dumbbell Press 3×8–12, A2. Chest Supported Row 3×8–12. Rest 60 sec after each pair."
