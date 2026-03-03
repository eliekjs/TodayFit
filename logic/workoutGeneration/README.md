# Daily "Build My Workout" Generator

First-pass, deterministic workout generation for the Daily flow (not the Sports Prep weekly planner).

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
- Do **not** modify Sports Prep engine files (`services/sportPrepPlanner/`).
- To plug into the app: call `generateWorkoutSession` with a `GenerateWorkoutInput` built from the Build flow (duration, goal, equipment from active gym profile, injuries, etc.). You can map existing `ManualPreferences` or Build screen state into `GenerateWorkoutInput` and optionally adapt `ExerciseDefinition` from `lib/types` to this module’s `Exercise` type (or provide an adapter that maps DB exercises to `Exercise[]`).
