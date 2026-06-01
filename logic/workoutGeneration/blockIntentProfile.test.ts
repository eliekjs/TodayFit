import { describe, expect, it } from "vitest";
import { buildBlockIntentProfile, blockFormatForCardioHint } from "./blockIntentProfile";
import { manualPreferencesToGenerateWorkoutInput } from "../../lib/dailyGeneratorAdapter";
import type { ManualPreferences } from "../../lib/types";
import type { GenerateWorkoutInput } from "./types";

function baseInput(overrides: Partial<GenerateWorkoutInput> = {}): GenerateWorkoutInput {
  return {
    duration_minutes: 45,
    primary_goal: "strength",
    energy_level: "medium",
    available_equipment: ["bodyweight", "dumbbells", "bench", "treadmill"],
    injuries_or_constraints: [],
    seed: 77,
    ...overrides,
  };
}

const SPORT_ONLY_PREFS: ManualPreferences = {
  primaryFocus: ["Sport preparation"],
  targetBody: null,
  targetModifier: [],
  durationMinutes: 60,
  energyLevel: "medium",
  injuries: ["No restrictions"],
  upcoming: [],
  subFocusByGoal: {},
  workoutStyle: [],
  workoutTier: "intermediate",
};

describe("buildBlockIntentProfile", () => {
  it("recovery primary disables conditioning by default", () => {
    const profile = buildBlockIntentProfile(
      baseInput({
        primary_goal: "recovery",
        secondary_goals: ["mobility"],
        style_prefs: { conditioning_minutes: 15 },
      })
    );
    expect(profile.allowConditioningBlock).toBe(false);
    expect(profile.conditioningRequired).toBe(false);
    expect(profile.cardioDominant).toBe(false);
  });

  it("endurance threshold uses intervals hint", () => {
    const profile = buildBlockIntentProfile(
      baseInput({
        primary_goal: "endurance",
        goal_sub_focus: { endurance: ["threshold_tempo"] },
      })
    );
    expect(profile.cardioDominant).toBe(true);
    expect(profile.conditioningRequired).toBe(true);
    expect(profile.sessionCardioShare).toBeGreaterThanOrEqual(0.7);
    expect(profile.cardioFormatHint).toBe("intervals");
    expect(profile.warmupPreferredTargets.length).toBeGreaterThan(0);
    expect(profile.cooldownPreferredTargets.length).toBeGreaterThan(0);
  });

  it("durability maps to circuit format hint", () => {
    const profile = buildBlockIntentProfile(
      baseInput({
        primary_goal: "conditioning",
        goal_sub_focus: { conditioning: ["durability"] },
      })
    );
    expect(profile.cardioFormatHint).toBe("circuit");
    expect(blockFormatForCardioHint(profile.cardioFormatHint)).toBe("circuit");
  });

  it("strength with cardio secondary requires conditioning", () => {
    const profile = buildBlockIntentProfile(
      baseInput({
        primary_goal: "strength",
        secondary_goals: ["endurance"],
        goal_sub_focus: { endurance: ["zone2_aerobic_base"] },
      })
    );
    expect(profile.allowConditioningBlock).toBe(true);
    expect(profile.conditioningRequired).toBe(true);
    expect(profile.cardioDominant).toBe(true);
    expect(profile.targetCardioExerciseShare).toBeGreaterThanOrEqual(0.3);
  });

  it("weekly and session cardio overrides blend into share", () => {
    const profile = buildBlockIntentProfile(
      baseInput({
        primary_goal: "hypertrophy",
        weekly_cardio_emphasis: 0.8,
        session_cardio_target_share: 0.6,
      })
    );
    expect(profile.sessionCardioShare).toBeGreaterThanOrEqual(0.5);
    expect(profile.targetCardioExerciseShare).toBeGreaterThanOrEqual(0.3);
  });

  it("warmup/cooldown targets use sport and intent specificity", () => {
    const profile = buildBlockIntentProfile(
      baseInput({
        primary_goal: "conditioning",
        sport_slugs: ["road_running"],
        goal_sub_focus: { conditioning: ["hills"] },
      })
    );
    expect(profile.warmupPreferredTargets).toContain("ankles");
    expect(profile.cooldownPreferredTargets).toContain("adductors");
  });

  it("strength-only fixture is unchanged vs pre-session-feel baseline", () => {
    const input = baseInput({
      primary_goal: "strength",
      goal_sub_focus: { strength: ["squat"] },
    });
    const profile = buildBlockIntentProfile(input);

    expect(profile.sessionCardioShare).toBeCloseTo(0.22, 5);
    expect(profile.targetCardioExerciseShare).toBeCloseTo(0.14, 5);
    expect(profile.allowConditioningBlock).toBe(true);
    expect(profile.conditioningRequired).toBe(false);
    expect(profile.preferredBlockFormatsByRole.main[0]).toBe("straight_sets");
  });

  it("sports_training profile increases cardio share vs strength-only", () => {
    const strengthOnly = buildBlockIntentProfile(baseInput({ primary_goal: "strength" }));
    const sportOnlyInput = manualPreferencesToGenerateWorkoutInput(SPORT_ONLY_PREFS, undefined, 1, undefined, {
      sport_slugs: ["soccer"],
      sport_sub_focus: { soccer: ["change_of_direction"] },
    });
    const sportsTraining = buildBlockIntentProfile(sportOnlyInput);

    expect(sportsTraining.sessionCardioShare).toBeGreaterThan(strengthOnly.sessionCardioShare);
    expect(sportsTraining.sessionCardioShare - strengthOnly.sessionCardioShare).toBeGreaterThanOrEqual(0.08);
    expect(sportsTraining.sessionCardioShare - strengthOnly.sessionCardioShare).toBeLessThanOrEqual(0.12);
    expect(sportsTraining.preferredBlockFormatsByRole.main[0]).toBe("circuit");
  });
});
