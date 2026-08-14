import { describe, expect, it } from "vitest";
import {
  DEFAULT_ENGINE_CARDIO_STAPLE_IDS,
  DEFAULT_ZONE2_CARDIO_ALTERNATE_IDS,
  canonicalDefaultEngineCardioId,
  resolveDefaultEngineCardioFamily,
} from "../../data/defaultEngineCardioPool";
import { EXERCISES } from "../../data/exercisesMerged";
import { getDefaultEquipmentForTemplate } from "../../data/gymProfiles";
import { exerciseDefinitionToGeneratorExercise, manualPreferencesToGenerateWorkoutInput } from "../../lib/dailyGeneratorAdapter";
import {
  narrowToDefaultEngineCardioStaples,
  shouldRestrictToDefaultEngineCardioStaples,
} from "./defaultEngineCardioFilter";
import { generateWorkoutSession } from "./dailyGenerator";
import type { GenerateWorkoutInput } from "./types";

const WEIRD_CARDIO_ID =
  /crossover|walking_lunge|figure_8|carioca|butt_kick|pro_shuttle|dead_leg|karaoke|quarter_arc|piston_run/i;

function gymInput(
  overrides: {
    subFocusByGoal?: Record<string, string[]>;
    includeCreativeVariations?: boolean;
    primaryFocus?: string[];
    seed?: number;
  } = {}
): GenerateWorkoutInput {
  const gym = {
    id: "test",
    name: "test",
    equipment: getDefaultEquipmentForTemplate("your_gym"),
  };
  return manualPreferencesToGenerateWorkoutInput(
    {
      primaryFocus: overrides.primaryFocus ?? ["Sport Conditioning"],
      targetBody: "Full",
      targetModifier: [],
      durationMinutes: 45,
      energyLevel: "medium",
      injuries: ["No restrictions"],
      upcoming: [],
      subFocusByGoal: overrides.subFocusByGoal ?? {
        "Sport Conditioning": ["Intervals / HIIT"],
      },
      workoutStyle: [],
      includeCreativeVariations: overrides.includeCreativeVariations === true,
    },
    gym,
    overrides.seed ?? 1
  );
}

describe("default engine cardio pool", () => {
  it("keeps the canonical staple list at or under 20 and omits walking lunge / elliptical", () => {
    expect(DEFAULT_ENGINE_CARDIO_STAPLE_IDS.length).toBeGreaterThan(8);
    expect(DEFAULT_ENGINE_CARDIO_STAPLE_IDS.length).toBeLessThanOrEqual(20);
    expect(DEFAULT_ENGINE_CARDIO_STAPLE_IDS).not.toContain("walking_lunge");
    expect(DEFAULT_ENGINE_CARDIO_STAPLE_IDS).not.toContain("elliptical");
    expect(DEFAULT_ZONE2_CARDIO_ALTERNATE_IDS).toContain("elliptical");
    expect(DEFAULT_ENGINE_CARDIO_STAPLE_IDS).toContain("treadmill_sprint_intervals");
    expect(DEFAULT_ENGINE_CARDIO_STAPLE_IDS).toContain("burpee");
    expect(DEFAULT_ENGINE_CARDIO_STAPLE_IDS).toContain("box_jump");
  });

  it("maps catalog aliases onto canonical staples", () => {
    expect(canonicalDefaultEngineCardioId("zone2_rower")).toBe("rower");
    expect(canonicalDefaultEngineCardioId("assault_bike_steady")).toBe("zone2_bike");
    expect(canonicalDefaultEngineCardioId("mountain_climber")).toBe("mountain_climbers");
    expect(canonicalDefaultEngineCardioId("elliptical_steady")).toBe("elliptical");
    expect(canonicalDefaultEngineCardioId("crossover_run")).toBeUndefined();
    expect(canonicalDefaultEngineCardioId("walking_lunge")).toBeUndefined();
  });

  it("resolves intent families and bypasses speed / power slugs", () => {
    expect(resolveDefaultEngineCardioFamily(["zone2_aerobic_base"])).toBe("zone2");
    expect(resolveDefaultEngineCardioFamily(["intervals_hiit"])).toBe("intervals");
    expect(resolveDefaultEngineCardioFamily(["hills"])).toBe("hills");
    expect(resolveDefaultEngineCardioFamily(["threshold_tempo"])).toBe("threshold");
    expect(resolveDefaultEngineCardioFamily(undefined)).toBe("generic");
    expect(resolveDefaultEngineCardioFamily(["sprint"])).toBeNull();
    expect(resolveDefaultEngineCardioFamily(["vertical_jump"])).toBeNull();
  });

  it("restricts non-creative Zone 2 / interval picks and skips Creative", () => {
    const base = gymInput();
    expect(shouldRestrictToDefaultEngineCardioStaples(base, ["intervals_hiit"])).toBe(true);
    expect(shouldRestrictToDefaultEngineCardioStaples(base, ["zone2_aerobic_base"])).toBe(true);
    expect(
      shouldRestrictToDefaultEngineCardioStaples(
        gymInput({ includeCreativeVariations: true }),
        ["intervals_hiit"]
      )
    ).toBe(false);
    expect(shouldRestrictToDefaultEngineCardioStaples(base, ["sprint"])).toBe(false);
  });

  it("drops walking lunges and COD drills from the default interval pool", () => {
    const pool = [
      { id: "burpee" },
      { id: "walking_lunge" },
      { id: "crossover_run" },
      { id: "box_jump" },
      { id: "figure_8" },
    ];
    const narrowed = narrowToDefaultEngineCardioStaples(pool, gymInput(), ["intervals_hiit"]);
    expect(narrowed.map((e) => e.id).sort()).toEqual(["box_jump", "burpee"]);
  });

  it("uses elliptical only as a Zone 2 alternate when default machines are missing", () => {
    const withDefaults = narrowToDefaultEngineCardioStaples(
      [{ id: "zone2_bike" }, { id: "elliptical" }, { id: "crossover_run" }],
      gymInput({ subFocusByGoal: { "Sport Conditioning": ["Zone 2 / Aerobic base"] } }),
      ["zone2_aerobic_base"]
    );
    expect(withDefaults.map((e) => e.id)).toEqual(["zone2_bike"]);

    const alternateOnly = narrowToDefaultEngineCardioStaples(
      [{ id: "elliptical_steady" }, { id: "crossover_run" }, { id: "walking_lunge" }],
      gymInput({ subFocusByGoal: { "Sport Conditioning": ["Zone 2 / Aerobic base"] } }),
      ["zone2_aerobic_base"]
    );
    expect(alternateOnly.map((e) => e.id)).toEqual(["elliptical_steady"]);
  });

  it("keeps the wider pool when Creative is on", () => {
    const pool = [{ id: "burpee" }, { id: "crossover_run" }, { id: "walking_lunge" }];
    const creative = gymInput({ includeCreativeVariations: true });
    const narrowed = narrowToDefaultEngineCardioStaples(pool, creative, ["intervals_hiit"]);
    expect(narrowed.map((e) => e.id)).toEqual(["burpee", "crossover_run", "walking_lunge"]);
  });
});

describe("default engine cardio generation", { timeout: 30_000 }, () => {
  const pool = EXERCISES.map(exerciseDefinitionToGeneratorExercise);

  it("HIIT sessions without Creative stay on simple interval staples", () => {
    const weird: string[] = [];
    for (let i = 0; i < 12; i++) {
      const session = generateWorkoutSession(
        gymInput({
          subFocusByGoal: { "Sport Conditioning": ["Intervals / HIIT"] },
          seed: 4200 + i,
        }),
        pool
      );
      for (const block of session.blocks) {
        if (block.block_type !== "conditioning") continue;
        for (const item of block.items) {
          if (WEIRD_CARDIO_ID.test(item.exercise_id) || WEIRD_CARDIO_ID.test(item.exercise_name)) {
            weird.push(item.exercise_id);
          }
        }
      }
    }
    expect(weird).toEqual([]);
  });

  it("Zone 2 sessions without Creative stay on simple aerobic machines", () => {
    const picked = new Set<string>();
    const weird: string[] = [];
    for (let i = 0; i < 12; i++) {
      const session = generateWorkoutSession(
        gymInput({
          subFocusByGoal: { "Sport Conditioning": ["Zone 2 / Aerobic base"] },
          seed: 4300 + i,
        }),
        pool
      );
      for (const block of session.blocks) {
        if (block.block_type !== "conditioning") continue;
        for (const item of block.items) {
          picked.add(item.exercise_id);
          if (WEIRD_CARDIO_ID.test(item.exercise_id) || WEIRD_CARDIO_ID.test(item.exercise_name)) {
            weird.push(item.exercise_id);
          }
          expect(item.exercise_id).not.toBe("elliptical");
          expect(item.exercise_id).not.toBe("elliptical_steady");
        }
      }
    }
    expect(weird).toEqual([]);
    expect(picked.size).toBeGreaterThan(0);
  });
});
