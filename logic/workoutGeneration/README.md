# Session Generator (shared by Build My Workout and Sports Prep)

Deterministic workout generation for a **single session**. Used by both **Build My Workout** and **Adaptive / Sports Prep**; the difference between modes is the **filters** that feed the input (duration/goal/equipment vs sports/goals/gym days, etc.), not daily vs weekly. Both modes can request one session or a week; when generating a week, this generator runs once per day (with optional per-day intent from a weekly distribution step).

## Location

- **Generator:** `dailyGenerator.ts`
- **Types:** `types.ts`
- **Stub exercises:** `exerciseStub.ts` (~42 exercises)
- **Public API:** `index.ts`

## Usage

```ts
import {
  generateWorkoutSession,
  regenerateWorkoutSession,
  STUB_EXERCISES,
} from "./logic/workoutGeneration";

const session = generateWorkoutSession({
  duration_minutes: 60,
  primary_goal: "hypertrophy",
  energy_level: "medium",
  available_equipment: ["dumbbells", "bench", "cable_machine", "bodyweight"],
  injuries_or_constraints: [],
  seed: 42,
});

// Optional: pass custom exercise pool (e.g. from DB)
const session2 = generateWorkoutSession(input, myExercises, true); // true = include debug scoring
```

## Regenerate

```ts
const again = regenerateWorkoutSession(
  input,
  previousSession,
  "keep_structure_swap_exercises", // or "new_structure"
  undefined,
  false
);
```

## Running the seed test harness

From project root:

```bash
npm run test:generator
```

Requires `tsx` (installed on the fly via `npx tsx`). Alternatively:

```bash
npx tsx logic/workoutGeneration/seedTest.ts
```

## Integration

- This module is **logic only**; no UI.
- **Build My Workout**: Build `GenerateWorkoutInput` from the Build flow (duration, goal, equipment from active gym profile, injuries, energy, etc.).
- **Sports Prep**: Build `GenerateWorkoutInput` from the Adaptive flow (sports, ranked goals, gym profile, recent load, injuries, etc.); when generating a week, the planner may first assign per-day intent, then call this generator once per day with the appropriate input for that day.
- Map existing `ManualPreferences` or Adaptive setup into `GenerateWorkoutInput`; optionally adapt `ExerciseDefinition` from `lib/types` to this module’s `Exercise` type (or provide an adapter that maps DB exercises to `Exercise[]`).
