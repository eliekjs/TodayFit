import { describe, expect, it } from "vitest";
import {
  exerciseIsLowerBodyDominantPowerMovement,
  filterSubFocusSlugsForBodyFocus,
  isCoreOnlyFocusBodyParts,
  isLowerOnlyFocusBodyParts,
} from "./bodyFocusSubFocusFilter";
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

  it("leaves slugs unchanged for full body", () => {
    const slugs = ["lower_body_power_plyos", "upper_body_power"];
    expect(filterSubFocusSlugsForBodyFocus(slugs, ["full_body"])).toEqual(slugs);
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
});
