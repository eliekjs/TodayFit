/**
 * Generation fidelity for every Manual-mode goal sub-focus (research-backed contracts).
 *
 * Run: npx vitest run logic/workoutGeneration/subGoalGenerationFidelity.test.ts
 * Full CLI: npx tsx scripts/auditSubGoalGenerationFidelity.ts
 */

import { describe, expect, it } from "vitest";
import { EXERCISES } from "../../data/exercisesMerged";
import { getDefaultEquipmentForTemplate } from "../../data/gymProfiles";
import { buildAllSubGoalIntentContracts } from "../../data/goalSubFocus/subGoalIntentContracts";
import {
  exerciseDefinitionToGeneratorExercise,
  manualPreferencesToGenerateWorkoutInput,
} from "../../lib/dailyGeneratorAdapter";
import type { ManualPreferences } from "../../lib/types";
import { generateWorkoutSession } from "./dailyGenerator";
import { evaluateSubGoalSessionFidelity } from "./subGoalGenerationFidelity";

const gym = {
  id: "your_gym",
  name: "Your Gym",
  equipment: getDefaultEquipmentForTemplate("your_gym"),
};

function prefs(primaryLabel: string, subDisplayName: string): ManualPreferences {
  return {
    primaryFocus: [primaryLabel],
    targetBody: "Full",
    targetModifier: [],
    durationMinutes: 45,
    energyLevel: "medium",
    injuries: ["No restrictions"],
    upcoming: [],
    subFocusByGoal: { [primaryLabel]: [subDisplayName] },
    workoutStyle: [],
    workoutTier: "intermediate",
  };
}

describe("sub-goal generation fidelity (all Manual intents)", () => {
  const catalog = EXERCISES.map(exerciseDefinitionToGeneratorExercise);
  const contracts = buildAllSubGoalIntentContracts();

  it("exposes a contract for every active primary sub-focus", () => {
    expect(contracts.length).toBeGreaterThanOrEqual(50);
    expect(contracts.some((c) => c.slug === "olympic_triple_extension")).toBe(true);
    expect(contracts.some((c) => c.primaryLabel === "Recovery & Mobility" && c.slug === "hips")).toBe(
      true
    );
  });

  it("generated sessions satisfy research-backed intent contracts", () => {
    const failures: string[] = [];
    for (let i = 0; i < contracts.length; i++) {
      const c = contracts[i]!;
      const seed = `fidelity-${c.primaryLabel}-${c.slug}-${i}`;
      const input = manualPreferencesToGenerateWorkoutInput(
        prefs(c.primaryLabel, c.displayName),
        gym,
        seed
      );
      const session = generateWorkoutSession(input, catalog);
      const result = evaluateSubGoalSessionFidelity(c, session, catalog);
      if (!result.pass) {
        failures.push(
          `${result.key}: ${result.reason} (matches=${result.matchingIds.join(",") || "none"})`
        );
      }
    }
    expect(failures, failures.join("\n")).toEqual([]);
  }, 180_000);
});
