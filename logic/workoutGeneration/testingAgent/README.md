# Workout Testing Agent

This agent **creates tests from user inputs** (the same inputs the app would pass to the generator), **runs the generator**, and **documents why the algorithm produced the workout it did** (decisioning). Tests are **organized by focus area** so you can run or extend tests for the subsystem you care about.

## What it does

1. **User-input scenarios** — Each scenario is a `GenerateWorkoutInput` (duration, goal, body focus, equipment, injuries, style prefs, etc.) as would come from the app.
2. **Decision report** — For each scenario the agent:
   - Resolves constraints from the input (`resolveWorkoutConstraints`)
   - Generates a workout (`generateWorkoutSession`)
   - Validates the session against constraints
   - Builds a **decision report**: input summary, constraint summary (why certain rules applied), session summary (blocks, prescription), and validation result.
3. **Focus-based tests** — Scenarios are grouped by **focus area** (e.g. body-part focus, injuries, cooldown/mobility, power prescription). You run one or all focus areas and optionally assert on expected decisioning.

## Running the agent

From repo root:

```bash
# List all focus areas and scenario counts
npx tsx logic/workoutGeneration/testingAgent/runFocusTests.ts --list

# Run all focus areas with assertions (fails on first failure)
npx tsx logic/workoutGeneration/testingAgent/runFocusTests.ts

# Run only specific focus area(s)
npx tsx logic/workoutGeneration/testingAgent/runFocusTests.ts body_part_focus injuries

# Describe only: print decision reports (why the algorithm produced each workout), no assertions
npx tsx logic/workoutGeneration/testingAgent/runFocusTests.ts body_part_focus --describe
```

## Focus areas (adjustable)

| Id | Description |
|----|-------------|
| `body_part_focus` | Strict filtering by upper push/pull, lower, full body. Decisioning: `allowed_movement_families` and hard_include. |
| `injuries` | Hard exclude by joint_stress and contraindication; no contraindicated exercises. |
| `cooldown_mobility` | Secondary goal mobility → required cooldown block with min mobility/stretch exercises. |
| `power_prescription` | Power goal → low reps, longer rest in main block. |
| `duration_scaling` | 20–75 min sessions; block count and title reflect duration. |
| `equipment_limits` | Limited equipment → only exercises using that equipment. |
| `supersets` | `wants_supersets` and pairing rules; session may use superset format. |
| `goals_and_conditioning` | Primary/secondary goals and optional conditioning; title reflects goal. |

## Decisioning (why the app produced this workout)

The **decision report** explains:

- **Input** — Duration, goal, focus, equipment, injuries (summary of user input).
- **Constraints** — Rules in precedence order: hard_exclude (injuries), equipment, hard_include (body-part), required_finishers (cooldown mobility), superset_pairing, etc. Plus `allowed_movement_families`, `min_cooldown_mobility_exercises`.
- **Output** — Session title, block sequence (type + item count), and sample prescription for main work.
- **Validation** — Whether the session passed post-assembly validation (and any violations).

Use `--describe` to print these reports without running assertions.

## Adjusting tests by focus area

1. **Add or change scenarios** — Edit `focusAreas.ts`. Each focus area has `scenarios: Scenario[]`. A scenario is `{ name, input: GenerateWorkoutInput, expectedDecision?: ExpectedDecision }`.
2. **Expected decision** — Optional `expectedDecision` drives assertions:
   - `allowed_movement_families` — Must match resolved constraints when body focus is set.
   - `min_cooldown_mobility_exercises` — Min mobility/stretch in cooldown.
   - `requiredBlockTypes` — Session must include these block types (e.g. `cooldown`).
   - `mainRepRange`, `mainRestSecondsMin` — Main block prescription (e.g. power: low reps, long rest).
   - `valid` — Validation must pass (or fail) as specified.
3. **Add a new focus area** — In `focusAreas.ts`: add a new `FocusAreaId`, add an entry to `FOCUS_AREAS` with `id`, `label`, `description`, and `scenarios`. Run with that focus id.

## Programmatic use

```ts
import { runFocusArea, runAll } from "./runFocusTests";

// One focus area
const { reports } = runFocusArea("body_part_focus", { describeOnly: true });
reports.forEach(({ scenario, report }) => {
  console.log(formatDecisionReport(report, scenario.name));
});

// All focus areas with assertions
const results = runAll(["injuries", "cooldown_mobility"], { includeDebug: false });
```

## Files

- **`decisionReport.ts`** — Builds the structured decision report (input summary, constraints, session summary, validation) and formats it for CLI.
- **`focusAreas.ts`** — Defines focus area ids, labels, descriptions, and scenario inputs (+ optional expected decision).
- **`runFocusTests.ts`** — Runner: maps input → constraints, runs generator, validates, builds report, runs assertions; CLI entrypoint.
