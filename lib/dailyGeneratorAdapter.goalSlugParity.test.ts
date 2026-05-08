import { describe, expect, it } from "vitest";
import { manualPreferencesToGenerateWorkoutInput } from "./dailyGeneratorAdapter";
import { PRIMARY_FOCUS_OPTIONS, PRIMARY_FOCUS_TO_GOAL_SLUG } from "./preferencesConstants";
import type { ManualPreferences } from "./types";
import type { PrimaryGoal } from "../logic/workoutGeneration/types";

/** Manual primary label (options list) → generator primary_goal — must stay aligned with adapters. */
const EXPECTED_PRIMARY_GOAL: Record<(typeof PRIMARY_FOCUS_OPTIONS)[number], PrimaryGoal> = {
  "Build Strength": "strength",
  "Build Muscle (Hypertrophy)": "hypertrophy",
  "Body Recomp (fat loss & muscle gain)": "body_recomp",
  "Sport Conditioning": "conditioning",
  "Improve Endurance": "endurance",
  "Mobility & Joint Health": "mobility",
  "Athletic Performance": "athletic_performance",
  Calisthenics: "calisthenics",
  "Power & Explosiveness": "power",
  Recovery: "recovery",
};

function basePrefs(primaryFocus: string[]): ManualPreferences {
  return {
    primaryFocus,
    targetBody: null,
    targetModifier: [],
    durationMinutes: 45,
    energyLevel: "medium",
    injuries: ["No restrictions"],
    upcoming: [],
    subFocusByGoal: {},
    workoutStyle: [],
    workoutTier: "intermediate",
  };
}

describe("goal slug parity (manual primary ↔ generator)", () => {
  it("PRIMARY_FOCUS_OPTIONS: each option label maps to a distinct PRIMARY_FOCUS_TO_GOAL_SLUG value", () => {
    const bySlug = new Map<string, string[]>();
    for (const label of PRIMARY_FOCUS_OPTIONS) {
      const slug = PRIMARY_FOCUS_TO_GOAL_SLUG[label];
      expect(slug, label).toBeTruthy();
      const prev = bySlug.get(slug!) ?? [];
      prev.push(label);
      bySlug.set(slug!, prev);
    }
    for (const [slug, labels] of bySlug.entries()) {
      expect(labels.length, `${slug}: ${labels.join(", ")}`).toBe(1);
    }
  });

  it("legacy labels outside PRIMARY_FOCUS_OPTIONS may alias to another option's slug (ranking only)", () => {
    expect(PRIMARY_FOCUS_TO_GOAL_SLUG.Hypertrophy).toBe(PRIMARY_FOCUS_TO_GOAL_SLUG["Build Muscle (Hypertrophy)"]);
    expect(PRIMARY_FOCUS_TO_GOAL_SLUG["Body Recomposition"]).toBe(
      PRIMARY_FOCUS_TO_GOAL_SLUG["Body Recomp (fat loss & muscle gain)"]
    );
  });

  it.each([...PRIMARY_FOCUS_OPTIONS])(
    "manualPreferencesToGenerateWorkoutInput primary_goal for only %s",
    (label) => {
      const expected = EXPECTED_PRIMARY_GOAL[label];
      const input = manualPreferencesToGenerateWorkoutInput(basePrefs([label]), undefined, `parity-${label}`);
      expect(input.primary_goal).toBe(expected);
      expect(input.session_intent?.selected_goals?.[0]).toBe(expected);
    }
  );
});
