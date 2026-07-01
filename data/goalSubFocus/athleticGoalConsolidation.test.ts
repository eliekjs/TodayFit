import { describe, expect, it } from "vitest";
import {
  archetypeForAthleticSubFocusSlug,
  migrateLegacyAthleticPreferences,
} from "./athleticSubFocusArchetypes";
import { GOAL_SUB_FOCUS_TAG_MAP } from "./goalSubFocusTagMap";
import { buildMergedGoalSubFocusSlugWeights } from "../../lib/subFocusWeights";
import { manualPreferencesToGenerateWorkoutInput } from "../../lib/dailyGeneratorAdapter";
import { buildBlockIntentProfile } from "../../logic/workoutGeneration/blockIntentProfile";
import {
  normalizeAthleticGoalPreferences,
  PRIMARY_FOCUS_OPTIONS,
} from "../../lib/preferencesConstants";
import type { ManualPreferences } from "../../lib/types";

function basePrefs(overrides: Partial<ManualPreferences> = {}): ManualPreferences {
  return {
    primaryFocus: ["Athletic Performance"],
    targetBody: null,
    targetModifier: [],
    durationMinutes: 45,
    energyLevel: "medium",
    injuries: ["No restrictions"],
    upcoming: [],
    subFocusByGoal: {},
    workoutStyle: [],
    workoutTier: "intermediate",
    ...overrides,
  };
}

describe("athletic goal consolidation", () => {
  it("PRIMARY_FOCUS_OPTIONS excludes legacy Power and Sport Conditioning", () => {
    expect(PRIMARY_FOCUS_OPTIONS).not.toContain("Power & Explosiveness");
    expect(PRIMARY_FOCUS_OPTIONS).not.toContain("Sport Conditioning");
    expect(PRIMARY_FOCUS_OPTIONS).toContain("Athletic Performance");
  });

  it("archetypeForAthleticSubFocusSlug routes power and conditioning subs", () => {
    expect(archetypeForAthleticSubFocusSlug("lower_body_power_plyos")).toBe("power");
    expect(archetypeForAthleticSubFocusSlug("intervals_hiit")).toBe("conditioning");
    expect(archetypeForAthleticSubFocusSlug("agility_cod")).toBe("athletic_performance");
  });

  it("migrateLegacyAthleticPreferences merges legacy primaries and subs", () => {
    const migrated = migrateLegacyAthleticPreferences({
      primaryFocus: ["Power & Explosiveness", "Sport Conditioning"],
      subFocusByGoal: {
        "Power & Explosiveness": ["Upper body power"],
        "Sport Conditioning": ["Intervals / HIIT"],
      },
    });
    expect(migrated.primaryFocus).toEqual(["Athletic Performance"]);
    expect(migrated.subFocusByGoal["Athletic Performance"]?.sort()).toEqual(
      ["Intervals / HIIT", "Upper body power"].sort()
    );
    expect(migrated.subFocusByGoal["Power & Explosiveness"]).toBeUndefined();
  });

  it("buildMergedGoalSubFocusSlugWeights routes athletic subs to internal buckets", () => {
    const { goal_sub_focus } = buildMergedGoalSubFocusSlugWeights({
      labelsForSubFocusMerge: ["Athletic Performance"],
      subFocusByGoal: {
        "Athletic Performance": ["Upper body power", "Intervals / HIIT", "Agility / Change of direction"],
      },
    });
    expect(goal_sub_focus.power).toEqual(["upper_body_power"]);
    expect(goal_sub_focus.conditioning).toEqual(["intervals_hiit"]);
    expect(goal_sub_focus.athletic_performance).toEqual(["agility_cod"]);
  });

  it("legacy Power prefs produce power bucket after adapter normalization", () => {
    const input = manualPreferencesToGenerateWorkoutInput(
      basePrefs({
        primaryFocus: ["Power & Explosiveness"],
        subFocusByGoal: { "Power & Explosiveness": ["Upper body power"] },
      }),
      undefined,
      "legacy-power"
    );
    expect(input.primary_goal).toBe("athletic_performance");
    expect(input.goal_sub_focus?.power).toEqual(["upper_body_power"]);
  });

  it("legacy Sport Conditioning prefs require conditioning block behavior", () => {
    const input = manualPreferencesToGenerateWorkoutInput(
      basePrefs({
        primaryFocus: ["Sport Conditioning"],
        subFocusByGoal: { "Sport Conditioning": ["Intervals / HIIT"] },
      }),
      undefined,
      "legacy-conditioning"
    );
    expect(input.primary_goal).toBe("athletic_performance");
    expect(input.goal_sub_focus?.conditioning).toEqual(["intervals_hiit"]);
    const profile = buildBlockIntentProfile(input);
    expect(profile.allowConditioningBlock).toBe(true);
    expect(profile.conditioningRequired).toBe(true);
  });

  it("mixed athletic selection keeps power and conditioning buckets separate", () => {
    const input = manualPreferencesToGenerateWorkoutInput(
      basePrefs({
        subFocusByGoal: {
          "Athletic Performance": ["Vertical jump", "Intervals / HIIT"],
        },
      }),
      undefined,
      "mixed-athletic"
    );
    expect(input.goal_sub_focus?.athletic_performance).toEqual(["vertical_jump"]);
    expect(input.goal_sub_focus?.conditioning).toEqual(["intervals_hiit"]);
  });

  it("athletic_performance tag map includes expanded sub-focus keys", () => {
    expect(GOAL_SUB_FOCUS_TAG_MAP["athletic_performance:intervals_hiit"]?.length).toBeGreaterThan(0);
    expect(GOAL_SUB_FOCUS_TAG_MAP["athletic_performance:lower_body_power_plyos"]?.length).toBeGreaterThan(0);
  });

  it("legacy Sport Conditioning as secondary goal injects default intervals sub-focus", () => {
    const migrated = migrateLegacyAthleticPreferences({
      primaryFocus: ["Build Strength", "Sport Conditioning"],
      subFocusByGoal: {},
    });
    expect(migrated.primaryFocus).toEqual(["Build Strength", "Athletic Performance"]);
    expect(migrated.subFocusByGoal["Athletic Performance"]).toContain("Intervals / HIIT");
  });

  it("normalizeAthleticGoalPreferences is idempotent", () => {
    const once = normalizeAthleticGoalPreferences(
      basePrefs({
        primaryFocus: ["Power & Explosiveness"],
        subFocusByGoal: { "Power & Explosiveness": ["Sprint"] },
      })
    );
    const twice = normalizeAthleticGoalPreferences(once);
    expect(twice).toEqual(once);
  });
});
