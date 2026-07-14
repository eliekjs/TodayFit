/**
 * Stratified sport-family fidelity gate (Phase 3 G3.3).
 *
 * Run: npx vitest run logic/workoutGeneration/sportSubGoalGenerationFidelity.test.ts
 * Full CLI: npx tsx scripts/auditSportSubGoalGenerationFidelity.ts
 */

import { describe, expect, it } from "vitest";
import { EXERCISES } from "../../data/exercisesMerged";
import { getDefaultEquipmentForTemplate } from "../../data/gymProfiles";
import {
  assertEnduranceFamilySamplesUseEnduranceSubs,
  buildSportStratifiedAuditCells,
  familiesCoveredByContracts,
  SPORT_FAMILY_INTENT_CONTRACTS,
  sportFamilyContractById,
} from "../../data/sportSubFocus/sportFamilyIntentContracts";
import {
  exerciseDefinitionToGeneratorExercise,
  manualPreferencesToGenerateWorkoutInput,
  type SportGoalContext,
} from "../../lib/dailyGeneratorAdapter";
import type { ManualPreferences } from "../../lib/types";
import { generateWorkoutSession } from "./dailyGenerator";
import { evaluateSportFamilySessionFidelity } from "./sportSubGoalGenerationFidelity";

const BASE: ManualPreferences = {
  primaryFocus: [],
  subFocusByGoal: {},
  targetModifier: [],
  upcoming: [],
  workoutStyle: [],
  workoutTier: "intermediate",
  durationMinutes: 45,
  energyLevel: "medium",
  injuries: ["No restrictions"],
  targetBody: "Full",
};

describe("sport-family generation fidelity (stratified)", () => {
  const catalog = EXERCISES.map(exerciseDefinitionToGeneratorExercise);

  it("exposes family contracts (not per-sport one-offs)", () => {
    expect(SPORT_FAMILY_INTENT_CONTRACTS.length).toBeGreaterThanOrEqual(5);
    expect(familiesCoveredByContracts()).toEqual(
      expect.arrayContaining([
        "jump_power",
        "change_of_direction",
        "pull_grip",
        "endurance_prep",
        "speed_sprint",
        "stability_prehab",
      ])
    );
    expect(assertEnduranceFamilySamplesUseEnduranceSubs()).toBe(true);
    const cells = buildSportStratifiedAuditCells([1]);
    // samples × 2 gyms × 1 seed — should be far below 164 one-offs
    expect(cells.length).toBeLessThan(80);
    expect(cells.length).toBeGreaterThan(10);
  });

  it("stratified sample sessions satisfy family intent contracts", () => {
    const cells = buildSportStratifiedAuditCells([88042, 99002]);
    const failures: string[] = [];
    for (const cell of cells) {
      const contract = sportFamilyContractById(cell.familyId);
      if (!contract) {
        failures.push(`missing contract ${cell.familyId}`);
        continue;
      }
      const gym = {
        id: cell.gymTemplate,
        name: cell.gymTemplate,
        equipment: getDefaultEquipmentForTemplate(cell.gymTemplate),
      };
      const prefs: ManualPreferences = { ...BASE, targetBody: cell.targetBody };
      const sportCtx: SportGoalContext = {
        sport_slugs: [cell.sportSlug],
        sport_sub_focus: { [cell.sportSlug]: [cell.subFocusSlug] },
        sport_weight: 0.55,
      };
      const input = manualPreferencesToGenerateWorkoutInput(
        prefs,
        gym,
        `sf-${cell.familyId}-${cell.sportSlug}-${cell.seed}`,
        undefined,
        sportCtx
      );
      input.seed = cell.seed;
      const session = generateWorkoutSession(input, catalog);
      const result = evaluateSportFamilySessionFidelity(contract, cell, session, catalog);
      if (!result.pass) {
        failures.push(`${result.key}: ${result.reason} (matches=${result.matchingIds.join(",") || "none"})`);
      }
    }
    expect(failures, failures.join("\n")).toEqual([]);
  }, 300_000);
});
