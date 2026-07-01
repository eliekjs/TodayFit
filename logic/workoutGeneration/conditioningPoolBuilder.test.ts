import { describe, expect, it } from "vitest";
import { EXERCISES } from "../../data/exercisesMerged";
import { exerciseDefinitionToGeneratorExercise } from "../../lib/dailyGeneratorAdapter";
import { manualPreferencesToGenerateWorkoutInput } from "../../lib/dailyGeneratorAdapter";
import { getDefaultEquipmentForTemplate } from "../../data/gymProfiles";
import {
  filterByHardConstraints,
  filterByConstraintsForPool,
  generateWorkoutSession,
} from "./dailyGenerator";
import { resolveWorkoutConstraints } from "../workoutIntelligence/constraints/resolveWorkoutConstraints";
import { exerciseHasSubFocusSlug } from "../../data/goalSubFocus/conditioningSubFocus";
import {
  buildConditioningIntentPool,
  pickConditioningExerciseWithVariety,
  CONDITIONING_INTENT_MIN_DIRECT_POOL,
} from "./conditioningPoolBuilder";
import { isConditioningEligible } from "./blockSelectionEligibility";

function fullInput() {
  const gym = {
    id: "test",
    name: "test",
    equipment: getDefaultEquipmentForTemplate("your_gym"),
  };
  return manualPreferencesToGenerateWorkoutInput(
    {
      primaryFocus: ["Sport Conditioning"],
      targetBody: "Full",
      targetModifier: [],
      durationMinutes: 45,
      energyLevel: "medium",
      injuries: ["No restrictions"],
      upcoming: [],
      subFocusByGoal: { "Sport Conditioning": ["Intervals / HIIT"] },
      workoutStyle: [],
    },
    gym,
    1
  );
}

function filteredPool() {
  const pool = EXERCISES.map(exerciseDefinitionToGeneratorExercise);
  const input = fullInput();
  const constraints = resolveWorkoutConstraints({
    primary_goal: input.primary_goal,
    secondary_goals: [],
    sports: [],
    available_equipment: input.available_equipment,
    duration_minutes: input.duration_minutes,
    energy_level: input.energy_level,
    injuries_or_limitations: [],
    body_region_focus: input.focus_body_parts?.map((f) => f.toLowerCase().replace(/\s/g, "_")) ?? [],
  });
  return {
    pool,
    input,
    filtered: filterByConstraintsForPool(filterByHardConstraints(pool, input), constraints),
  };
}

// Pool construction runs full catalog filtering and multi-session generation; the 5s
// default timeout is too tight when the whole suite runs in parallel.
describe("conditioningPoolBuilder", { timeout: 30_000 }, () => {
  it("expands intervals_hiit pool beyond conditioning-only modality", () => {
    const { filtered } = filteredPool();
    const used = new Set<string>();
    const hiitPool = buildConditioningIntentPool(filtered, {
      intentSlugs: ["intervals_hiit"],
      used,
    });
    expect(hiitPool.length).toBeGreaterThan(CONDITIONING_INTENT_MIN_DIRECT_POOL);
    expect(hiitPool.some((e) => e.id === "kb_swing" || e.id === "burpee")).toBe(true);
    expect(hiitPool.some((e) => e.id === "pro_shuttle")).toBe(false);
  });

  it("threshold pool excludes sprint drills mis-tagged with lactate_threshold", () => {
    const { filtered } = filteredPool();
    const thresholdPool = buildConditioningIntentPool(filtered, {
      intentSlugs: ["threshold_tempo"],
      used: new Set(),
    });
    expect(thresholdPool.some((e) => e.id === "bound_to_sprint")).toBe(false);
    expect(thresholdPool.some((e) => e.id === "build_up_sprint")).toBe(false);
    expect(thresholdPool.some((e) => e.id === "treadmill_tempo_run")).toBe(true);
  });

  it("hills pool excludes incline bench/press false positives", () => {
    const { filtered } = filteredPool();
    const hillsPool = buildConditioningIntentPool(filtered, {
      intentSlugs: ["hills"],
      used: new Set(),
    });
    expect(hillsPool.some((e) => /incline.*press|incline.*bench|incline.*fly/i.test(e.name))).toBe(
      false
    );
    expect(hillsPool.some((e) => e.id === "treadmill_incline_walk" || e.id === "stepup")).toBe(true);
  });

  it("vertical jump pool includes core-pool plyometrics beyond box jump", () => {
    const { filtered } = filteredPool();
    const jumpPool = buildConditioningIntentPool(filtered, {
      intentSlugs: ["vertical_jump"],
      used: new Set(),
    });
    expect(jumpPool.length).toBeGreaterThan(8);
    expect(jumpPool.some((e) => e.id === "tuck_jump" || e.id === "jump_squat")).toBe(true);
    expect(jumpPool.some((e) => e.id === "crossover_bounds")).toBe(false);
  });

  it("tags enrichment adds sprint (not intervals_hiit) to pro shuttle", () => {
    const ex = exerciseDefinitionToGeneratorExercise(
      EXERCISES.find((e) => e.id === "pro_shuttle")!
    );
    expect(exerciseHasSubFocusSlug(ex, "sprint")).toBe(true);
    expect(exerciseHasSubFocusSlug(ex, "intervals_hiit")).toBe(false);
  });

  it("expands hills intent pool without walking lunge", () => {
    const { filtered } = filteredPool();
    const hillsPool = buildConditioningIntentPool(filtered, {
      intentSlugs: ["hills"],
      used: new Set(),
    });
    expect(hillsPool.some((e) => e.id === "walking_lunge")).toBe(false);
    expect(hillsPool.some((e) => e.id === "sled_push" || e.id === "stepup")).toBe(true);
  });

  it("sprint intent pool retains catalog entries but pick excludes mechanics-only drills", () => {
    const { filtered } = filteredPool();
    const sprintPool = buildConditioningIntentPool(filtered, {
      intentSlugs: ["sprint"],
      used: new Set(),
    });
    expect(sprintPool.some((e) => e.id === "pro_shuttle" || e.id === "40_start")).toBe(true);
    const eligible = sprintPool.filter((e) => isConditioningEligible(e));
    expect(eligible.some((e) => e.id === "pro_shuttle" || e.id === "40_start")).toBe(false);
    expect(eligible.length).toBeGreaterThan(0);
  });

  it("anti-repeat strongly de-prioritizes regeneration penalty ids", () => {
    const { filtered } = filteredPool();
    const hiitPool = buildConditioningIntentPool(filtered, {
      intentSlugs: ["intervals_hiit"],
      used: new Set(),
    });
    const avoid = new Set([hiitPool[0]!.id]);
    let penalized = 0;
    for (let i = 0; i < 40; i++) {
      const pick = pickConditioningExerciseWithVariety(hiitPool, undefined, () => Math.random(), undefined, {
        avoidIds: avoid,
      });
      if (pick?.id === hiitPool[0]!.id) penalized += 1;
    }
    expect(penalized).toBeLessThan(8);
  });

  it("HIIT session draws from a wider unique set across regenerations", () => {
    const { pool, input } = filteredPool();
    const unique = new Set<string>();
    for (let i = 0; i < 25; i++) {
      const session = generateWorkoutSession({ ...input, seed: 500 + i }, pool);
      for (const block of session.blocks) {
        if (block.title === "HIIT intervals" || block.title === "Conditioning") {
          for (const item of block.items) unique.add(item.exercise_id);
        }
      }
    }
    expect(unique.size).toBeGreaterThan(5);
    expect([...unique].some((id) => !/(shuttle|figure_8|40_start|pro_agility)/i.test(id))).toBe(true);
  });

  it("catalog includes hill treadmill and threshold tempo conditioning exercises", () => {
    const ids = [
      "treadmill_hill_sprints",
      "treadmill_hill_run",
      "treadmill_tempo_run",
      "treadmill_cruise_intervals",
      "rower_threshold_intervals",
    ];
    for (const id of ids) {
      const def = EXERCISES.find((e) => e.id === id);
      expect(def, id).toBeDefined();
      const ex = exerciseDefinitionToGeneratorExercise(def!);
      if (id.includes("hill") || id.includes("incline") || id === "stair_climber_repeats") {
        expect(exerciseHasSubFocusSlug(ex, "hills")).toBe(true);
      } else {
        expect(exerciseHasSubFocusSlug(ex, "threshold_tempo")).toBe(true);
      }
    }
  });
});
