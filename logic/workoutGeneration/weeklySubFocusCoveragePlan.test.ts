/**
 * Run: npx tsx logic/workoutGeneration/weeklySubFocusCoveragePlan.test.ts
 */

import assert from "node:assert";
import { computeWeeklySubFocusSessionMinimums } from "./weeklySubFocusCoveragePlan";

const keys = [{ goalSlug: "strength" as const, subSlug: "handstand" as const }];

assert.deepStrictEqual(
  computeWeeklySubFocusSessionMinimums({
    matchCountsSoFar: {},
    trainingDayIndex: 0,
    trainingDaysTotal: 3,
    targetPerSubFocus: 3,
    keys,
  }),
  { "strength:handstand": 1 }
);

assert.deepStrictEqual(
  computeWeeklySubFocusSessionMinimums({
    matchCountsSoFar: { "strength:handstand": 2 },
    trainingDayIndex: 2,
    trainingDaysTotal: 3,
    targetPerSubFocus: 3,
    keys,
  }),
  { "strength:handstand": 1 }
);

assert.deepStrictEqual(
  computeWeeklySubFocusSessionMinimums({
    matchCountsSoFar: { "strength:handstand": 3 },
    trainingDayIndex: 2,
    trainingDaysTotal: 3,
    targetPerSubFocus: 3,
    keys,
  }),
  {}
);

console.log("weeklySubFocusCoveragePlan.test.ts: ok");
