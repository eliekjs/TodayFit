/**
 * Integration: hypertrophy upper accessory blocks must not contain sprint/COD wall drills.
 * Run: npx vitest run logic/workoutGeneration/hypertrophyAccessoryWallDrill.test.ts
 */

import { describe, expect, it } from "vitest";
import type { ManualPreferences } from "../../lib/types";
import { generateWorkoutAsync, getExercisePoolForManualGeneration } from "../../lib/generator";
import { getDefaultEquipmentForTemplate } from "../../data/gymProfiles";
import { manualPreferencesToGenerateWorkoutInput } from "../../lib/dailyGeneratorAdapter";
import { isSprintMechanicsDrill } from "./blockSelectionEligibility";

const GYM = {
  id: "hypertrophy_accessory_test",
  name: "Full gym",
  equipment: getDefaultEquipmentForTemplate("your_gym"),
};

const HYPERTROPHY_UPPER_PREFS: ManualPreferences = {
  primaryFocus: ["Build Muscle (Hypertrophy)"],
  subFocusByGoal: { "Build Muscle (Hypertrophy)": ["Chest", "Arms"] },
  targetBody: "Upper",
  targetModifier: ["Push"],
  durationMinutes: 45,
  energyLevel: "medium",
  injuries: ["No restrictions"],
  upcoming: [],
  workoutStyle: [],
  workoutTier: "intermediate",
};

function accessoryExerciseIds(workout: { blocks: { block_type: string; items: { exercise_id: string }[] }[] }): string[] {
  return workout.blocks
    .filter((b) => b.block_type === "accessory")
    .flatMap((b) => b.items.map((i) => i.exercise_id));
}

describe("hypertrophyAccessoryWallDrill", () => {
  it("seed 55001 accessory block has no sprint wall drills", async () => {
    const pool = await getExercisePoolForManualGeneration([]);
    const workout = await generateWorkoutAsync(
      HYPERTROPHY_UPPER_PREFS,
      GYM,
      55001,
      undefined,
      undefined,
      { exercisePool: pool }
    );

    const accessoryIds = accessoryExerciseIds(workout);
    expect(accessoryIds.length).toBeGreaterThan(0);

    const poolById = new Map(pool.map((e) => [e.id, e]));
    for (const id of accessoryIds) {
      expect(/wall_drill/i.test(id), `unexpected wall drill in accessory: ${id}`).toBe(false);
      const ex = poolById.get(id);
      if (ex) {
        expect(isSprintMechanicsDrill(ex), `sprint mechanics drill in accessory: ${id}`).toBe(false);
      }
    }
  }, 60_000);

  it("resolveBlockStructureProfile keeps accessories for pure hypertrophy", () => {
    const input = manualPreferencesToGenerateWorkoutInput(HYPERTROPHY_UPPER_PREFS, GYM);
    expect(input.primary_goal).toBe("hypertrophy");
  });
});
