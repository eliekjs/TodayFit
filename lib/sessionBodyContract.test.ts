import { describe, expect, it } from "vitest";
import { resolveWorkoutConstraints } from "../logic/workoutIntelligence/constraints/resolveWorkoutConstraints";
import { matchesBodyPartFocus } from "../logic/workoutIntelligence/constraints/eligibilityHelpers";
import type { ExerciseWithQualities } from "../logic/workoutIntelligence/types";
import { dayBodyFocusChoiceToBias } from "./weekDaySessionFocus";
import {
  clampBodyChoiceToMode,
  dailyOverrideFromBodyChoice,
  inferWeeklyBodyFocusMode,
  resolveDailyBodyFocusMode,
  resolveSessionBodyContract,
  SESSION_BODY_NATIVE_SPECS,
  sessionBiasFromDailyBodyOverride,
} from "./sessionBodyContract";

function makeEx(
  overrides: Partial<ExerciseWithQualities> & { id: string; muscle_groups: string[] }
): ExerciseWithQualities {
  return {
    name: overrides.id,
    movement_pattern: "push",
    equipment_required: ["dumbbells"],
    training_quality_weights: {},
    ...overrides,
  };
}

const bench = makeEx({
  id: "bench_press",
  movement_pattern: "push",
  muscle_groups: ["chest", "triceps"],
  primary_movement_family: "upper_push",
  movement_patterns: ["horizontal_push"],
  pairing_category: "chest",
});
const ohp = makeEx({
  id: "oh_press",
  movement_pattern: "push",
  muscle_groups: ["shoulders"],
  primary_movement_family: "upper_push",
  movement_patterns: ["vertical_push"],
  pairing_category: "shoulders",
  tags: { attribute_tags: ["overhead_press"] },
});
const row = makeEx({
  id: "cable_row",
  movement_pattern: "pull",
  muscle_groups: ["lats", "biceps"],
  primary_movement_family: "upper_pull",
  movement_patterns: ["horizontal_pull"],
  pairing_category: "back",
});
const curl = makeEx({
  id: "db_curl",
  movement_pattern: "pull",
  muscle_groups: ["biceps"],
  primary_movement_family: "upper_pull",
  pairing_category: "biceps",
});
const squat = makeEx({
  id: "back_squat",
  movement_pattern: "squat",
  muscle_groups: ["quads", "glutes"],
  primary_movement_family: "lower_body",
  movement_patterns: ["squat"],
  pairing_category: "quads",
});
const hipThrust = makeEx({
  id: "hip_thrust",
  movement_pattern: "hinge",
  muscle_groups: ["glutes"],
  primary_movement_family: "lower_body",
  movement_patterns: ["hinge"],
  pairing_category: "glutes",
  fatigue_regions: ["glutes"],
});
const plank = makeEx({
  id: "plank",
  movement_pattern: "carry",
  muscle_groups: ["core"],
  primary_movement_family: "core",
});

function constraintsFor(focus: string[]) {
  return resolveWorkoutConstraints({
    primary_goal: "hypertrophy",
    body_region_focus: focus,
    available_equipment: ["barbell", "dumbbells", "bench"],
    duration_minutes: 45,
    energy_level: "medium",
  });
}

describe("session body contract — every native chip", () => {
  it.each(SESSION_BODY_NATIVE_SPECS)(
    "$mode $choiceId → $focusBodyParts (muscleEmphasis=$muscleEmphasis)",
    (spec) => {
      const bias = dayBodyFocusChoiceToBias(spec.choiceId);
      const contract = resolveSessionBodyContract({
        weeklyBodyFocusMode: spec.mode,
        targetBody: bias.targetBody,
        targetModifier: bias.targetModifier,
        specificBodyFocus: bias.specificBodyFocus,
      });
      expect(contract.choiceId).toBe(spec.choiceId);
      expect(contract.focusBodyParts).toEqual([...spec.focusBodyParts]);
      expect(contract.muscleEmphasis).toBe(spec.muscleEmphasis);
    }
  );

  it.each(SESSION_BODY_NATIVE_SPECS)(
    "$mode $choiceId regen chip restores specificBodyFocus",
    (spec) => {
      const override = dailyOverrideFromBodyChoice(spec.choiceId, spec.mode);
      expect(override.bodyRegionBias).toBe(spec.choiceId);
      expect(override.weeklyBodyFocusMode).toBe(spec.mode);
      const bias = sessionBiasFromDailyBodyOverride(override);
      expect(bias).toBeDefined();
      const contract = resolveSessionBodyContract({
        weeklyBodyFocusMode: override.weeklyBodyFocusMode,
        targetBody: bias!.targetBody,
        targetModifier: bias!.targetModifier,
        specificBodyFocus: bias!.specificBodyFocus,
      });
      expect(contract.focusBodyParts).toEqual([...spec.focusBodyParts]);
      expect(contract.muscleEmphasis).toBe(spec.muscleEmphasis);
    }
  );
});

describe("session body contract — no invented muscle days", () => {
  it("infers Muscle mode from a Chest pick when weeklyBodyFocusMode is unset", () => {
    expect(
      inferWeeklyBodyFocusMode({
        targetBody: "Upper",
        specificBodyFocus: ["chest"],
      })
    ).toBe("muscle");
  });

  it("infers Muscle from every muscle-specific key", () => {
    for (const key of ["chest", "back", "shoulders", "arms", "glutes", "legs"] as const) {
      expect(inferWeeklyBodyFocusMode({ specificBodyFocus: [key] })).toBe("muscle");
    }
  });

  it("infers Pattern from push/pull and split-leg chips when mode is unset", () => {
    expect(inferWeeklyBodyFocusMode({ specificBodyFocus: ["push"] })).toBe("pattern");
    expect(inferWeeklyBodyFocusMode({ specificBodyFocus: ["pull"] })).toBe("pattern");
    expect(inferWeeklyBodyFocusMode({ specificBodyFocus: ["quad"] })).toBe("pattern");
    expect(inferWeeklyBodyFocusMode({ specificBodyFocus: ["posterior"] })).toBe("pattern");
  });

  it("keeps Pattern Legs when weeklyBodyFocusMode is pattern", () => {
    expect(
      inferWeeklyBodyFocusMode({
        weeklyBodyFocusMode: "pattern",
        specificBodyFocus: ["legs"],
      })
    ).toBe("pattern");
    const contract = resolveSessionBodyContract({
      weeklyBodyFocusMode: "pattern",
      targetBody: "Lower",
      specificBodyFocus: ["legs"],
    });
    expect(contract.choiceId).toBe("legs");
    expect(contract.muscleEmphasis).toBeNull();
    expect(contract.focusBodyParts).toEqual(["lower", "legs"]);
  });

  it("unions glutes + shoulders into a mixed-region contract; constraints OR-match both muscles", () => {
    const contract = resolveSessionBodyContract({
      weeklyBodyFocusMode: "muscle",
      targetBody: "Full",
      specificBodyFocus: ["glutes", "shoulders"],
    });
    expect(contract.choiceId).toBe("full");
    expect(contract.muscleEmphasis).toBeNull();
    expect(contract.focusBodyParts).toEqual(
      expect.arrayContaining(["glutes", "shoulders", "lower", "upper_push"])
    );
    const c = constraintsFor(contract.focusBodyParts);
    expect(c.allowed_muscle_emphasis).toBeNull();
    expect(c.allowed_muscle_emphases).toEqual(["shoulders", "glutes"]);
    expect(matchesBodyPartFocus(hipThrust, c)).toBe(true);
    expect(matchesBodyPartFocus(ohp, c)).toBe(true);
    expect(matchesBodyPartFocus(bench, c)).toBe(false);
    expect(matchesBodyPartFocus(squat, c)).toBe(false);
  });

  it("hard-gates Region Lower + specific quad without a Quad modifier", () => {
    const contract = resolveSessionBodyContract({
      weeklyBodyFocusMode: "region",
      targetBody: "Lower",
      specificBodyFocus: ["quad"],
    });
    expect(contract.choiceId).toBe("lower");
    expect(contract.focusBodyParts).toEqual(["lower", "quad"]);
    const c = constraintsFor(contract.focusBodyParts);
    expect(c.allowed_lower_body_emphasis).toBe("quad");
    expect(matchesBodyPartFocus(squat, c)).toBe(true);
    expect(matchesBodyPartFocus(hipThrust, c)).toBe(false);
  });

  it("does not treat Muscle-mode Upper (no specific) as Chest", () => {
    const contract = resolveSessionBodyContract({
      weeklyBodyFocusMode: "muscle",
      targetBody: "Upper",
      targetModifier: [],
    });
    expect(contract.choiceId).toBe("upper");
    expect(contract.focusBodyParts).toEqual(["upper_push", "upper_pull"]);
    expect(contract.muscleEmphasis).toBeNull();
  });

  it("clamps leftover muscle picks to Region vocabulary in the UI mapper", () => {
    expect(clampBodyChoiceToMode("chest", "region")).toBe("upper");
    expect(clampBodyChoiceToMode("back", "region")).toBe("upper");
    expect(clampBodyChoiceToMode("shoulders", "region")).toBe("upper");
    expect(clampBodyChoiceToMode("arms", "region")).toBe("upper");
    expect(clampBodyChoiceToMode("glutes", "region")).toBe("lower");
    expect(clampBodyChoiceToMode("push", "muscle")).toBe("chest");
  });
});

describe("hard eligibility for every muscle emphasis", () => {
  it("Chest: bench in, OHP and rows out", () => {
    const c = constraintsFor(["upper_push", "chest"]);
    expect(c.allowed_muscle_emphasis).toBe("chest");
    expect(matchesBodyPartFocus(bench, c)).toBe(true);
    expect(matchesBodyPartFocus(ohp, c)).toBe(false);
    expect(matchesBodyPartFocus(row, c)).toBe(false);
  });

  it("Back: rows in, curls and bench out", () => {
    const c = constraintsFor(["upper_pull", "back"]);
    expect(c.allowed_muscle_emphasis).toBe("back");
    expect(matchesBodyPartFocus(row, c)).toBe(true);
    expect(matchesBodyPartFocus(curl, c)).toBe(false);
    expect(matchesBodyPartFocus(bench, c)).toBe(false);
  });

  it("Shoulders: OHP in, bench out", () => {
    const c = constraintsFor(["upper_push", "upper_pull", "shoulders"]);
    expect(c.allowed_muscle_emphasis).toBe("shoulders");
    expect(matchesBodyPartFocus(ohp, c)).toBe(true);
    expect(matchesBodyPartFocus(bench, c)).toBe(false);
  });

  it("Arms: curls in, bench out", () => {
    const c = constraintsFor(["upper_push", "upper_pull", "arms"]);
    expect(c.allowed_muscle_emphasis).toBe("arms");
    expect(matchesBodyPartFocus(curl, c)).toBe(true);
    expect(matchesBodyPartFocus(bench, c)).toBe(false);
  });

  it("Glutes: hip thrust in, squat out", () => {
    const c = constraintsFor(["lower", "posterior", "glutes"]);
    expect(c.allowed_muscle_emphasis).toBe("glutes");
    expect(matchesBodyPartFocus(hipThrust, c)).toBe(true);
    expect(matchesBodyPartFocus(squat, c)).toBe(false);
  });

  it("Legs: squat in, bench out", () => {
    const c = constraintsFor(["lower", "legs"]);
    expect(c.allowed_muscle_emphasis).toBe("legs");
    expect(matchesBodyPartFocus(squat, c)).toBe(true);
    expect(matchesBodyPartFocus(bench, c)).toBe(false);
  });

  it("Pattern Push: bench and OHP both in (not a chest day)", () => {
    const c = constraintsFor(["upper_push"]);
    expect(c.allowed_muscle_emphasis).toBeNull();
    expect(matchesBodyPartFocus(bench, c)).toBe(true);
    expect(matchesBodyPartFocus(ohp, c)).toBe(true);
    expect(matchesBodyPartFocus(row, c)).toBe(false);
  });

  it("Pattern Pull: rows in, bench out", () => {
    const c = constraintsFor(["upper_pull"]);
    expect(c.allowed_muscle_emphasis).toBeNull();
    expect(matchesBodyPartFocus(row, c)).toBe(true);
    expect(matchesBodyPartFocus(bench, c)).toBe(false);
  });

  it("Pattern Quads: squat in, hip thrust out", () => {
    const c = constraintsFor(["lower", "quad"]);
    expect(c.allowed_lower_body_emphasis).toBe("quad");
    expect(matchesBodyPartFocus(squat, c)).toBe(true);
    expect(matchesBodyPartFocus(hipThrust, c)).toBe(false);
  });

  it("Pattern Posterior: hip thrust in, knee-dominant squat out", () => {
    const c = constraintsFor(["lower", "posterior"]);
    expect(c.allowed_lower_body_emphasis).toBe("posterior");
    expect(matchesBodyPartFocus(hipThrust, c)).toBe(true);
    const kneeSquat = makeEx({
      id: "hack_squat",
      movement_pattern: "squat",
      muscle_groups: ["quads"],
      primary_movement_family: "lower_body",
      movement_patterns: ["squat"],
      pairing_category: "quads",
    });
    expect(matchesBodyPartFocus(kneeSquat, c)).toBe(false);
  });

  it("Region Upper: push and pull both in, squat out", () => {
    const c = constraintsFor(["upper_push", "upper_pull"]);
    expect(c.allowed_muscle_emphasis).toBeNull();
    expect(matchesBodyPartFocus(bench, c)).toBe(true);
    expect(matchesBodyPartFocus(row, c)).toBe(true);
    expect(matchesBodyPartFocus(squat, c)).toBe(false);
  });

  it("Core: plank in, bench and untagged default-core work out", () => {
    const c = constraintsFor(["core"]);
    expect(c.allowed_muscle_emphasis).toBe("core");
    expect(matchesBodyPartFocus(plank, c)).toBe(true);
    expect(matchesBodyPartFocus(bench, c)).toBe(false);
    const untagged = makeEx({
      id: "mystery_move",
      movement_pattern: "unknown",
      muscle_groups: [],
    });
    expect(matchesBodyPartFocus(untagged, c)).toBe(false);
  });

  it("Chest + Back combo: bench or row in, squat and curls out", () => {
    const c = constraintsFor(["upper_push", "chest", "upper_pull", "back"]);
    expect(c.allowed_muscle_emphasis).toBeNull();
    expect(c.allowed_muscle_emphases).toEqual(["chest", "back"]);
    expect(matchesBodyPartFocus(bench, c)).toBe(true);
    expect(matchesBodyPartFocus(row, c)).toBe(true);
    expect(matchesBodyPartFocus(squat, c)).toBe(false);
    expect(matchesBodyPartFocus(curl, c)).toBe(false);
  });
});

describe("resolveDailyBodyFocusMode", () => {
  it("prefers per-day regen override over week mode", () => {
    expect(
      resolveDailyBodyFocusMode({
        dailyOverride: { weeklyBodyFocusMode: "pattern", bodyRegionBias: "push" },
        weekMode: "region",
      })
    ).toBe("pattern");
  });

  it("falls back to week mode when override has no mode", () => {
    expect(
      resolveDailyBodyFocusMode({
        dailyOverride: { energyLevel: "high" },
        weekMode: "muscle",
      })
    ).toBe("muscle");
  });

  it("infers pattern from a push chip when mode was not stored", () => {
    expect(
      resolveDailyBodyFocusMode({
        dailyOverride: { bodyRegionBias: "push", specificBodyFocus: ["push"] },
        weekMode: "region",
      })
    ).toBe("pattern");
  });
});
