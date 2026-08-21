import { describe, expect, it } from "vitest";
import {
  ensureRegionalStrengthOverlay,
  exerciseIsLowerBodyDominantPowerMovement,
  filterSubFocusSlugsForBodyFocus,
  isCoreOnlyFocusBodyParts,
  isLowerOnlyFocusBodyParts,
  regionalStrengthOverlayForFocus,
} from "./bodyFocusSubFocusFilter";
import { filterByConstraintsForPool } from "./dailyGenerator";
import { resolveWorkoutConstraints } from "../workoutIntelligence/constraints/resolveWorkoutConstraints";
import { GOAL_INTENT_ENRICHMENT } from "../../data/goalIntentEnrichment";
import type { Exercise } from "./types";

describe("filterSubFocusSlugsForBodyFocus", () => {
  it("prefers upper_body_power and drops lower plyo subs on upper-only focus", () => {
    const slugs = ["lower_body_power_plyos", "upper_body_power", "olympic_triple_extension"];
    const filtered = filterSubFocusSlugsForBodyFocus(slugs, ["upper_push", "upper_pull"]);
    expect(filtered).toEqual(["upper_body_power"]);
  });

  it("drops upper_body_power on lower-only focus", () => {
    const slugs = ["lower_body_power_plyos", "upper_body_power"];
    const filtered = filterSubFocusSlugsForBodyFocus(slugs, ["lower"]);
    expect(filtered).toEqual(["lower_body_power_plyos"]);
  });

  it("keeps general explosive power but drops agility/COD on upper-only focus", () => {
    expect(
      filterSubFocusSlugsForBodyFocus(
        ["power_explosive", "agility_cod"],
        ["upper_push", "upper_pull"]
      )
    ).toEqual(["power_explosive"]);
  });

  it("leaves slugs unchanged for full body", () => {
    const slugs = ["lower_body_power_plyos", "upper_body_power"];
    expect(filterSubFocusSlugsForBodyFocus(slugs, ["full_body"])).toEqual(slugs);
  });

  it("drops opposing hypertrophy slugs on every muscle day", () => {
    expect(filterSubFocusSlugsForBodyFocus(["chest", "legs", "back"], ["upper_push", "chest"])).toEqual([
      "chest",
    ]);
    expect(filterSubFocusSlugsForBodyFocus(["back", "chest", "legs"], ["upper_pull", "back"])).toEqual([
      "back",
    ]);
    expect(
      filterSubFocusSlugsForBodyFocus(["shoulders", "chest", "legs"], ["upper_push", "upper_pull", "shoulders"])
    ).toEqual(["shoulders"]);
    expect(
      filterSubFocusSlugsForBodyFocus(["arms", "chest", "back"], ["upper_push", "upper_pull", "arms"])
    ).toEqual(["arms"]);
    expect(filterSubFocusSlugsForBodyFocus(["glutes", "legs", "chest"], ["lower", "posterior", "glutes"])).toEqual(
      ["glutes"]
    );
    expect(filterSubFocusSlugsForBodyFocus(["legs", "glutes", "chest"], ["lower", "legs"])).toEqual([
      "legs",
      "glutes",
    ]);
  });

  it("drops back on Pattern Push and chest on Pattern Pull", () => {
    expect(filterSubFocusSlugsForBodyFocus(["chest", "shoulders", "back", "legs"], ["upper_push"])).toEqual([
      "chest",
      "shoulders",
    ]);
    expect(filterSubFocusSlugsForBodyFocus(["back", "chest", "shoulders", "legs"], ["upper_pull"])).toEqual([
      "back",
    ]);
  });

  it("keeps both muscles on a combined glutes + shoulders day", () => {
    expect(
      filterSubFocusSlugsForBodyFocus(
        ["glutes", "shoulders", "chest", "back"],
        ["lower", "posterior", "glutes", "upper_push", "upper_pull", "shoulders"]
      )
    ).toEqual(["glutes", "shoulders"]);
  });

  it("drops lower hypertrophy slugs on Region Upper", () => {
    expect(filterSubFocusSlugsForBodyFocus(["chest", "back", "legs", "glutes"], ["upper_push", "upper_pull"])).toEqual(
      ["chest", "back"]
    );
  });

  it("drops overhead press on a lower strength day and keeps squat", () => {
    expect(filterSubFocusSlugsForBodyFocus(["overhead_press", "squat"], ["lower"])).toEqual(["squat"]);
    expect(filterSubFocusSlugsForBodyFocus(["overhead_press"], ["lower"])).toEqual([]);
  });

  it("keeps overhead press on Region Upper, Pattern Push, and Muscle Shoulders", () => {
    expect(filterSubFocusSlugsForBodyFocus(["overhead_press"], ["upper_push", "upper_pull"])).toEqual([
      "overhead_press",
    ]);
    expect(filterSubFocusSlugsForBodyFocus(["overhead_press"], ["upper_push"])).toEqual(["overhead_press"]);
    expect(
      filterSubFocusSlugsForBodyFocus(["overhead_press"], ["upper_push", "upper_pull", "shoulders"])
    ).toEqual(["overhead_press"]);
  });

  it("drops overhead press on Pull, Chest, and Arms days", () => {
    expect(filterSubFocusSlugsForBodyFocus(["overhead_press"], ["upper_pull"])).toEqual([]);
    expect(filterSubFocusSlugsForBodyFocus(["overhead_press"], ["upper_push", "chest"])).toEqual([]);
    expect(
      filterSubFocusSlugsForBodyFocus(["overhead_press"], ["upper_push", "upper_pull", "arms"])
    ).toEqual([]);
  });

  it("keeps bench on Chest/Push and pull on Pull/Back", () => {
    expect(filterSubFocusSlugsForBodyFocus(["bench_press"], ["upper_push", "chest"])).toEqual([
      "bench_press",
    ]);
    expect(filterSubFocusSlugsForBodyFocus(["bench_press"], ["upper_pull"])).toEqual([]);
    expect(filterSubFocusSlugsForBodyFocus(["pull"], ["upper_pull", "back"])).toEqual(["pull"]);
    expect(filterSubFocusSlugsForBodyFocus(["pull"], ["upper_push"])).toEqual([]);
  });
});

describe("ensureRegionalStrengthOverlay", () => {
  it("uses lower overlay for a lower-only region day", () => {
    expect(regionalStrengthOverlayForFocus(["lower"])).toBe("lower");
    expect(regionalStrengthOverlayForFocus(["upper_push", "upper_pull"])).toBe("upper");
    expect(regionalStrengthOverlayForFocus(["upper_push", "chest"])).toBeNull();
    expect(regionalStrengthOverlayForFocus(["full_body"])).toBeNull();
  });

  it("attaches lower overlay when strength has no lift sub-goal", () => {
    const next = ensureRegionalStrengthOverlay({}, {}, ["lower"], "strength");
    expect(next.goal_sub_focus.strength).toEqual(["lower"]);
    expect(next.goal_sub_focus_weights.strength).toEqual([1]);
  });

  it("does not replace a selected squat sub-goal", () => {
    const next = ensureRegionalStrengthOverlay(
      { strength: ["squat"] },
      { strength: [1] },
      ["lower"],
      "strength"
    );
    expect(next.goal_sub_focus.strength).toEqual(["squat"]);
  });
});

describe("isLowerOnlyFocusBodyParts", () => {
  it("detects lower-only sessions", () => {
    expect(isLowerOnlyFocusBodyParts(["lower"])).toBe(true);
    expect(isLowerOnlyFocusBodyParts(["upper_push"])).toBe(false);
  });
});

describe("isCoreOnlyFocusBodyParts", () => {
  it("detects core-only sessions", () => {
    expect(isCoreOnlyFocusBodyParts(["core"])).toBe(true);
  });

  it("is false for full_body, other single regions, and mixed focus", () => {
    expect(isCoreOnlyFocusBodyParts(["full_body"])).toBe(false);
    expect(isCoreOnlyFocusBodyParts(["lower"])).toBe(false);
    expect(isCoreOnlyFocusBodyParts(["core", "lower"])).toBe(false);
    expect(isCoreOnlyFocusBodyParts(undefined)).toBe(false);
    expect(isCoreOnlyFocusBodyParts([])).toBe(false);
  });
});

describe("exerciseIsLowerBodyDominantPowerMovement", () => {
  it("flags hinge-dominant power exercises", () => {
    const ex: Exercise = {
      id: "cable_pull_throughs",
      name: "Cable Pull Throughs",
      movement_pattern: "hinge",
      muscle_groups: ["glutes", "hamstrings"],
      modality: "power",
      equipment_required: ["cable"],
      difficulty: 2,
      time_cost: "medium",
      tags: { goal_tags: ["power"] },
    };
    expect(exerciseIsLowerBodyDominantPowerMovement(ex)).toBe(true);
  });

  it("does not flag med-ball push pattern as lower-dominant", () => {
    const ex: Exercise = {
      id: "med_ball_slam",
      name: "Med Ball Slam",
      movement_pattern: "push",
      muscle_groups: ["shoulders", "core"],
      modality: "power",
      equipment_required: ["medicine_ball"],
      difficulty: 2,
      time_cost: "medium",
      tags: { goal_tags: ["power"], stimulus: ["plyometric"] },
    };
    expect(exerciseIsLowerBodyDominantPowerMovement(ex)).toBe(false);
  });

  it("flags legacy COD drills even when bad source metadata labels them pull", () => {
    const crossoverBounds: Exercise = {
      id: "crossover_bounds",
      name: "Crossover Bounds",
      movement_pattern: "pull",
      muscle_groups: ["pull"],
      modality: "conditioning",
      equipment_required: [],
      difficulty: 2,
      time_cost: "low",
      tags: { goal_tags: ["power"], attribute_tags: ["agility", "change_of_direction"] },
      primary_movement_family: "upper_pull",
    };
    expect(exerciseIsLowerBodyDominantPowerMovement(crossoverBounds)).toBe(true);
  });
});

describe("body-priority pool filtering", () => {
  const upperPower: Exercise = {
    id: "dumbbell_push_press",
    name: "Dumbbell Push Press",
    movement_pattern: "push",
    muscle_groups: ["shoulders", "triceps"],
    modality: "power",
    equipment_required: ["dumbbells"],
    difficulty: 2,
    time_cost: "medium",
    tags: { goal_tags: ["power"], attribute_tags: ["explosive_power"] },
    primary_movement_family: "upper_push",
  };
  const mislabeledCod: Exercise = {
    id: "jump_cut_drill",
    name: "Jump Cut Drill",
    movement_pattern: "pull",
    muscle_groups: ["pull"],
    modality: "conditioning",
    equipment_required: [],
    difficulty: 2,
    time_cost: "low",
    tags: { goal_tags: ["power"], attribute_tags: ["agility", "change_of_direction"] },
    primary_movement_family: "upper_pull",
  };

  it("keeps upper explosive work and rejects lower COD drills on an upper day", () => {
    const constraints = resolveWorkoutConstraints({
      primary_goal: "athletic_performance",
      body_region_focus: ["upper_push", "upper_pull"],
      available_equipment: ["dumbbells"],
      duration_minutes: 45,
      energy_level: "medium",
    });
    expect(filterByConstraintsForPool([mislabeledCod, upperPower], constraints).map((e) => e.id)).toEqual([
      "dumbbell_push_press",
    ]);
  });

  it("keeps the COD drill on a lower day", () => {
    const constraints = resolveWorkoutConstraints({
      primary_goal: "athletic_performance",
      body_region_focus: ["lower"],
      available_equipment: ["dumbbells"],
      duration_minutes: 45,
      energy_level: "medium",
    });
    expect(filterByConstraintsForPool([mislabeledCod, upperPower], constraints).map((e) => e.id)).toEqual([
      "jump_cut_drill",
    ]);
  });

  it("does not enrich lower-body COD drills as upper-body power", () => {
    expect(GOAL_INTENT_ENRICHMENT.crossover_bounds?.attribute_tags_append ?? []).not.toContain(
      "upper_body_power"
    );
    expect(GOAL_INTENT_ENRICHMENT.jump_cut_drill?.attribute_tags_append ?? []).not.toContain(
      "upper_body_power"
    );
  });
});
