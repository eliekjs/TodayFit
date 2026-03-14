/**
 * Focus-aware test runner. Generates workouts from user-input scenarios,
 * builds decision reports (why the algorithm produced that workout), and
 * runs focus-specific assertions. Adjust tests by choosing focus area(s).
 *
 * Run: npx tsx logic/workoutGeneration/testingAgent/runFocusTests.ts [focusId] [--describe] [--list]
 */

import { generateWorkoutSession } from "../dailyGenerator";
import { resolveWorkoutConstraints } from "../../workoutIntelligence/constraints/resolveWorkoutConstraints";
import type { WorkoutSelectionInput } from "../../workoutIntelligence/scoring/scoreTypes";
import { validateWorkoutAgainstConstraints } from "../../workoutIntelligence/validation/workoutValidator";
import { STUB_EXERCISES } from "../exerciseStub";
import type { GenerateWorkoutInput } from "../types";
import {
  buildDecisionReport,
  formatDecisionReport,
  type DecisionReport,
} from "./decisionReport";
import {
  FOCUS_AREAS,
  getFocusArea,
  getScenarioInputsForFocus,
  type FocusAreaId,
  type Scenario,
  type ExpectedDecision,
} from "./focusAreas";

/** Map generator input to selection input for resolveWorkoutConstraints. */
function inputToSelectionInput(input: GenerateWorkoutInput): WorkoutSelectionInput {
  return {
    primary_goal: input.primary_goal,
    secondary_goals: input.secondary_goals?.map((g) => g.toLowerCase().replace(/\s/g, "_")) ?? [],
    available_equipment: input.available_equipment,
    duration_minutes: input.duration_minutes,
    energy_level: input.energy_level,
    injuries_or_limitations: input.injuries_or_constraints ?? [],
    body_region_focus: input.focus_body_parts?.map((f) => f.toLowerCase().replace(/\s/g, "_")) ?? [],
  };
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

/**
 * Run assertions based on expectedDecision and the decision report.
 */
function runAssertions(
  scenarioName: string,
  report: DecisionReport,
  expected: ExpectedDecision | undefined
): void {
  if (!expected) return;

  if (expected.valid !== undefined) {
    assert(report.validation.valid === expected.valid, `${scenarioName}: expected valid=${expected.valid}, got ${report.validation.valid}`);
  }

  if (expected.allowed_movement_families !== undefined) {
    const actual = report.constraintsSummary.allowed_movement_families;
    if (expected.allowed_movement_families === null) {
      assert(actual === null, `${scenarioName}: expected allowed_movement_families=null, got ${JSON.stringify(actual)}`);
    } else {
      assert(actual != null, `${scenarioName}: expected allowed_movement_families=${expected.allowed_movement_families.join(",")}, got null`);
      const expectedSet = new Set(expected.allowed_movement_families);
      const actualSet = new Set(actual);
      assert(
        expected.allowed_movement_families.length === actual.length && expected.allowed_movement_families.every((f) => actualSet.has(f)),
        `${scenarioName}: allowed_movement_families expected ${[...expectedSet].sort().join(",")}, got ${[...actualSet].sort().join(",")}`
      );
    }
  }

  if (expected.min_cooldown_mobility_exercises !== undefined) {
    assert(
      report.constraintsSummary.min_cooldown_mobility_exercises >= expected.min_cooldown_mobility_exercises,
      `${scenarioName}: min_cooldown_mobility_exercises expected >= ${expected.min_cooldown_mobility_exercises}, got ${report.constraintsSummary.min_cooldown_mobility_exercises}`
    );
  }

  if (expected.requiredBlockTypes?.length) {
    const blockTypes = new Set(report.sessionSummary.blocks.map((b) => b.block_type));
    for (const required of expected.requiredBlockTypes) {
      assert(blockTypes.has(required), `${scenarioName}: required block type "${required}" missing; have ${[...blockTypes].join(", ")}`);
    }
  }

  if (expected.mainRepRange) {
    const main = report.sessionSummary.mainWorkPrescription;
    assert(main != null, `${scenarioName}: expected main work prescription (rep range) but none in report`);
    if (expected.mainRepRange.min != null && main?.repsMin != null) {
      assert(main.repsMin >= expected.mainRepRange.min, `${scenarioName}: main reps min expected >= ${expected.mainRepRange.min}, got ${main.repsMin}`);
    }
    if (expected.mainRepRange.max != null && main?.repsMax != null) {
      assert(main.repsMax <= expected.mainRepRange.max, `${scenarioName}: main reps max expected <= ${expected.mainRepRange.max}, got ${main.repsMax}`);
    }
  }

  if (expected.mainRestSecondsMin != null) {
    const main = report.sessionSummary.mainWorkPrescription;
    assert(main?.restSeconds != null, `${scenarioName}: expected main work rest in report`);
    assert(main!.restSeconds >= expected.mainRestSecondsMin, `${scenarioName}: main rest expected >= ${expected.mainRestSecondsMin}s, got ${main!.restSeconds}`);
  }
}

export type RunOptions = {
  /** If true, only print decision reports (no assertions). */
  describeOnly?: boolean;
  /** Include scoring breakdown in session (slower). */
  includeDebug?: boolean;
  /** Exercise pool; default STUB_EXERCISES. */
  exercisePool?: import("../types").Exercise[];
};

/**
 * Run all scenarios for a focus area; returns reports and assertion results.
 */
export function runFocusArea(
  focusId: FocusAreaId,
  options: RunOptions = {}
): { focus: FocusAreaId; reports: { scenario: Scenario; report: DecisionReport; passed: boolean }[] } {
  const scenarios = getScenarioInputsForFocus(focusId);
  const exercisePool = options.exercisePool ?? STUB_EXERCISES;
  const reports: { scenario: Scenario; report: DecisionReport; passed: boolean }[] = [];

  for (const scenario of scenarios) {
    const input: GenerateWorkoutInput = { ...scenario.input, seed: scenario.input.seed ?? 100 };
    const constraints = resolveWorkoutConstraints(inputToSelectionInput(input));
    const session = generateWorkoutSession(input, exercisePool, options.includeDebug ?? false);
    const validation = validateWorkoutAgainstConstraints(session, constraints, exercisePool);
    const report = buildDecisionReport(input, constraints, session, validation);

    let passed = true;
    if (!options.describeOnly && scenario.expectedDecision) {
      try {
        runAssertions(scenario.name, report, scenario.expectedDecision);
      } catch (e) {
        passed = false;
        if (options.describeOnly === false) throw e;
      }
    }
    reports.push({ scenario, report, passed });
  }

  return { focus: focusId, reports };
}

/**
 * Run all focus areas or a single one; optional describe-only mode.
 */
export function runAll(
  focusIds?: FocusAreaId[],
  options: RunOptions = {}
): Map<FocusAreaId, { scenario: Scenario; report: DecisionReport; passed: boolean }[]> {
  const ids = focusIds ?? (FOCUS_AREAS.map((a) => a.id) as FocusAreaId[]);
  const results = new Map<FocusAreaId, { scenario: Scenario; report: DecisionReport; passed: boolean }[]>();

  for (const id of ids) {
    const { reports } = runFocusArea(id, options);
    results.set(id, reports);
  }
  return results;
}

function main() {
  const args = process.argv.slice(2);
  const listOnly = args.includes("--list");
  const describeOnly = args.includes("--describe");
  const focusArgs = args.filter((a) => !a.startsWith("--"));

  if (listOnly) {
    console.log("Focus areas:");
    for (const a of FOCUS_AREAS) {
      console.log(`  ${a.id}: ${a.label} (${a.scenarios.length} scenarios)`);
    }
    return;
  }

  const focusIds: FocusAreaId[] = focusArgs.length
    ? (focusArgs as FocusAreaId[])
    : (FOCUS_AREAS.map((a) => a.id) as FocusAreaId[]);

  for (const focusId of focusIds) {
    const area = getFocusArea(focusId);
    if (!area) {
      console.warn(`Unknown focus area: ${focusId}`);
      continue;
    }
    console.log("\n" + "=".repeat(60));
    console.log(`Focus: ${area.label} — ${area.description}`);
    console.log("=".repeat(60));

    const { reports } = runFocusArea(focusId, { describeOnly, includeDebug: false });

    for (const { scenario, report, passed } of reports) {
      if (describeOnly) {
        console.log(formatDecisionReport(report, scenario.name));
      } else {
        const status = scenario.expectedDecision ? (passed ? "PASS" : "FAIL") : "skip";
        console.log(`  [${status}] ${scenario.name}`);
      }
    }
  }
  console.log("\nDone.");
}

main();
