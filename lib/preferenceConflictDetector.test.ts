import { describe, it, expect } from "vitest";
import { detectPreferenceConflicts } from "./preferenceConflictDetector";
import type { ManualPreferences } from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function basePrefs(overrides: Partial<ManualPreferences> = {}): ManualPreferences {
  return {
    primaryFocus: [],
    targetBody: null,
    targetModifier: [],
    durationMinutes: 45,
    energyLevel: null,
    injuries: [],
    upcoming: [],
    subFocusByGoal: {},
    workoutStyle: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Conflict 1: body region vs sub-goal mismatch
// ---------------------------------------------------------------------------

describe("body region vs sub-goal mismatch", () => {
  it("detects conflict: upper sub-goal + Full body → no conflict", () => {
    const prefs = basePrefs({
      targetBody: "Full",
      primaryFocus: ["Build Muscle (Hypertrophy)"],
      subFocusByGoal: { "Build Muscle (Hypertrophy)": ["Back"] },
    });
    const conflicts = detectPreferenceConflicts(prefs);
    expect(conflicts.map((c) => c.id)).not.toContain("body_vs_subgoal_upper_lower");
    expect(conflicts.map((c) => c.id)).not.toContain("body_vs_subgoal_lower_upper");
  });

  it("detects conflict: upper sub-goal + Upper body → no conflict", () => {
    const prefs = basePrefs({
      targetBody: "Upper",
      primaryFocus: ["Build Muscle (Hypertrophy)"],
      subFocusByGoal: { "Build Muscle (Hypertrophy)": ["Back", "Chest"] },
    });
    const conflicts = detectPreferenceConflicts(prefs);
    expect(conflicts.map((c) => c.id)).not.toContain("body_vs_subgoal_upper_lower");
    expect(conflicts.map((c) => c.id)).not.toContain("body_vs_subgoal_lower_upper");
  });

  it("detects conflict: upper sub-goal + Lower body → high conflict", () => {
    const prefs = basePrefs({
      targetBody: "Lower",
      primaryFocus: ["Build Muscle (Hypertrophy)"],
      subFocusByGoal: { "Build Muscle (Hypertrophy)": ["Back", "Chest"] },
    });
    const conflicts = detectPreferenceConflicts(prefs);
    const ids = conflicts.map((c) => c.id);
    expect(ids).toContain("body_vs_subgoal_lower_upper");
    const conflict = conflicts.find((c) => c.id === "body_vs_subgoal_lower_upper")!;
    expect(conflict.severity).toBe("high");
    expect(conflict.resolutions).toHaveLength(2);
  });

  it("detects conflict: lower sub-goal (Glutes) + Upper body → high conflict", () => {
    const prefs = basePrefs({
      targetBody: "Upper",
      primaryFocus: ["Build Muscle (Hypertrophy)"],
      subFocusByGoal: { "Build Muscle (Hypertrophy)": ["Glutes"] },
    });
    const conflicts = detectPreferenceConflicts(prefs);
    const ids = conflicts.map((c) => c.id);
    expect(ids).toContain("body_vs_subgoal_upper_lower");
    const conflict = conflicts.find((c) => c.id === "body_vs_subgoal_upper_lower")!;
    expect(conflict.severity).toBe("high");
  });

  it("detects conflict: lower sub-goal (Squat) under Build Strength + Upper body → high conflict", () => {
    const prefs = basePrefs({
      targetBody: "Upper",
      primaryFocus: ["Build Strength"],
      subFocusByGoal: { "Build Strength": ["Squat"] },
    });
    const conflicts = detectPreferenceConflicts(prefs);
    expect(conflicts.map((c) => c.id)).toContain("body_vs_subgoal_upper_lower");
  });

  it("detects conflict: knee health (joint health) + Upper body → high conflict", () => {
    const prefs = basePrefs({
      targetBody: "Upper",
      primaryFocus: ["Strength Training for Joint Health"],
      subFocusByGoal: { "Strength Training for Joint Health": ["Knee Health"] },
    });
    const conflicts = detectPreferenceConflicts(prefs);
    expect(conflicts.map((c) => c.id)).toContain("body_vs_subgoal_upper_lower");
  });

  it("detects conflict: recovery ankles + Upper body → high conflict", () => {
    const prefs = basePrefs({
      targetBody: "Upper",
      primaryFocus: ["Recovery & Mobility"],
      subFocusByGoal: { "Recovery & Mobility": ["Ankles"] },
    });
    const conflicts = detectPreferenceConflicts(prefs);
    expect(conflicts.map((c) => c.id)).toContain("body_vs_subgoal_upper_lower");
  });

  it("no conflict when no sub-goals selected", () => {
    const prefs = basePrefs({
      targetBody: "Upper",
      primaryFocus: ["Build Muscle (Hypertrophy)"],
      subFocusByGoal: {},
    });
    const conflicts = detectPreferenceConflicts(prefs);
    expect(conflicts.map((c) => c.id)).not.toContain("body_vs_subgoal_upper_lower");
    expect(conflicts.map((c) => c.id)).not.toContain("body_vs_subgoal_lower_upper");
  });

  it("resolution 'Switch to Full body' applies correct patch", () => {
    const prefs = basePrefs({
      targetBody: "Upper",
      primaryFocus: ["Build Muscle (Hypertrophy)"],
      subFocusByGoal: { "Build Muscle (Hypertrophy)": ["Glutes"] },
    });
    const conflicts = detectPreferenceConflicts(prefs);
    const conflict = conflicts.find((c) => c.id === "body_vs_subgoal_upper_lower")!;
    const switchRes = conflict.resolutions.find((r) => r.label === "Switch to Full body")!;
    const patch = switchRes.apply(prefs);
    expect(patch.targetBody).toBe("Full");
  });

  it("resolution 'Clear lower-body sub-goals' removes conflicting subs", () => {
    const prefs = basePrefs({
      targetBody: "Upper",
      primaryFocus: ["Build Muscle (Hypertrophy)"],
      subFocusByGoal: { "Build Muscle (Hypertrophy)": ["Glutes", "Back"] },
    });
    const conflicts = detectPreferenceConflicts(prefs);
    const conflict = conflicts.find((c) => c.id === "body_vs_subgoal_upper_lower")!;
    const clearRes = conflict.resolutions.find((r) => r.label.startsWith("Clear"))!;
    const patch = clearRes.apply(prefs);
    // "Glutes" is lower; "Back" is upper → only Glutes removed
    expect(patch.subFocusByGoal?.["Build Muscle (Hypertrophy)"]).toEqual(["Back"]);
  });

  it("cross-goal upper + lower subs on upper session offers Switch to Full body", () => {
    const prefs = basePrefs({
      targetBody: "Upper",
      primaryFocus: [
        "Body Recomp (fat loss & muscle gain)",
        "Build Muscle (Hypertrophy)",
      ],
      subFocusByGoal: {
        "Body Recomp (fat loss & muscle gain)": ["Glutes"],
        "Build Muscle (Hypertrophy)": ["Back"],
      },
    });
    const conflicts = detectPreferenceConflicts(prefs);
    const conflict = conflicts.find((c) => c.id === "body_vs_subgoal_upper_lower")!;
    expect(conflict).toBeDefined();
    expect(conflict.message).toContain("different body regions");
    expect(conflict.resolutions[0]!.label).toBe("Switch to Full body");
    const patch = conflict.resolutions[0]!.apply(prefs);
    expect(patch.targetBody).toBe("Full");
  });
});

// ---------------------------------------------------------------------------
// Conflict 2: sport vs body region mismatch
// ---------------------------------------------------------------------------

describe("sport vs body region mismatch", () => {
  it("detects conflict: running sport + Upper body → high conflict", () => {
    const prefs = basePrefs({ targetBody: "Upper" });
    const conflicts = detectPreferenceConflicts(prefs, {
      sportSlugs: ["road_running"],
      targetBodyOverride: "Upper",
    });
    const ids = conflicts.map((c) => c.id);
    expect(ids).toContain("sport_body_mismatch_road_running");
    const c = conflicts.find((c) => c.id === "sport_body_mismatch_road_running")!;
    expect(c.severity).toBe("high");
  });

  it("no conflict: running sport + Lower body", () => {
    const prefs = basePrefs({ targetBody: "Lower" });
    const conflicts = detectPreferenceConflicts(prefs, {
      sportSlugs: ["road_running"],
      targetBodyOverride: "Lower",
    });
    expect(conflicts.map((c) => c.id)).not.toContain("sport_body_mismatch_road_running");
  });

  it("no conflict: running sport + Full body", () => {
    const prefs = basePrefs({ targetBody: "Full" });
    const conflicts = detectPreferenceConflicts(prefs, {
      sportSlugs: ["road_running"],
      targetBodyOverride: "Full",
    });
    expect(conflicts.map((c) => c.id)).not.toContain("sport_body_mismatch_road_running");
  });

  it("detects conflict: climbing sport + Lower body → high conflict", () => {
    const prefs = basePrefs({ targetBody: "Lower" });
    const conflicts = detectPreferenceConflicts(prefs, {
      sportSlugs: ["rock_climbing"],
      targetBodyOverride: "Lower",
    });
    expect(conflicts.map((c) => c.id)).toContain("sport_body_mismatch_rock_climbing");
  });

  it("no conflict for full-body sport (hyrox) + any body region", () => {
    const prefs = basePrefs({ targetBody: "Upper" });
    const conflicts = detectPreferenceConflicts(prefs, {
      sportSlugs: ["hyrox"],
      targetBodyOverride: "Upper",
    });
    expect(conflicts.map((c) => c.id)).not.toContain("sport_body_mismatch_hyrox");
  });

  it("no conflict when no sports selected", () => {
    const prefs = basePrefs({ targetBody: "Upper" });
    const conflicts = detectPreferenceConflicts(prefs, { sportSlugs: [] });
    const sportConflicts = conflicts.filter((c) => c.id.startsWith("sport_body_mismatch"));
    expect(sportConflicts).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Conflict 3: Recovery / Mobility + high energy
// ---------------------------------------------------------------------------

describe("recovery/mobility + high energy", () => {
  it("detects conflict: Recovery & Mobility + high energy → medium conflict", () => {
    const prefs = basePrefs({
      primaryFocus: ["Recovery & Mobility"],
      energyLevel: "high",
    });
    const conflicts = detectPreferenceConflicts(prefs);
    expect(conflicts.map((c) => c.id)).toContain("recovery_high_energy");
    const c = conflicts.find((c) => c.id === "recovery_high_energy")!;
    expect(c.severity).toBe("medium");
  });

  it("detects conflict: Recovery + high energy → medium conflict", () => {
    const prefs = basePrefs({
      primaryFocus: ["Recovery"],
      energyLevel: "high",
    });
    const conflicts = detectPreferenceConflicts(prefs);
    expect(conflicts.map((c) => c.id)).toContain("recovery_high_energy");
  });

  it("no conflict: Recovery + medium energy", () => {
    const prefs = basePrefs({
      primaryFocus: ["Recovery"],
      energyLevel: "medium",
    });
    const conflicts = detectPreferenceConflicts(prefs);
    expect(conflicts.map((c) => c.id)).not.toContain("recovery_high_energy");
  });

  it("no conflict: Recovery + null energy (default)", () => {
    const prefs = basePrefs({
      primaryFocus: ["Recovery"],
      energyLevel: null,
    });
    const conflicts = detectPreferenceConflicts(prefs);
    expect(conflicts.map((c) => c.id)).not.toContain("recovery_high_energy");
  });

  it("no conflict: Build Strength + high energy", () => {
    const prefs = basePrefs({
      primaryFocus: ["Build Strength"],
      energyLevel: "high",
    });
    const conflicts = detectPreferenceConflicts(prefs);
    expect(conflicts.map((c) => c.id)).not.toContain("recovery_high_energy");
  });

  it("resolution 'Set to Medium' applies correct patch", () => {
    const prefs = basePrefs({ primaryFocus: ["Recovery"], energyLevel: "high" });
    const conflicts = detectPreferenceConflicts(prefs);
    const c = conflicts.find((c) => c.id === "recovery_high_energy")!;
    const res = c.resolutions.find((r) => r.label === "Set to Medium")!;
    const patch = res.apply(prefs);
    expect(patch.energyLevel).toBe("medium");
  });
});

// ---------------------------------------------------------------------------
// Neutral / no-conflict baseline
// ---------------------------------------------------------------------------

describe("neutral prefs → no conflicts", () => {
  it("empty prefs produce no conflicts", () => {
    const prefs = basePrefs();
    expect(detectPreferenceConflicts(prefs)).toHaveLength(0);
  });

  it("Build Strength + Upper body + Bench Press sub-goal → no conflict", () => {
    const prefs = basePrefs({
      targetBody: "Upper",
      primaryFocus: ["Build Strength"],
      subFocusByGoal: { "Build Strength": ["Bench / Press"] },
    });
    const conflicts = detectPreferenceConflicts(prefs);
    const bodyConflicts = conflicts.filter(
      (c) => c.id === "body_vs_subgoal_upper_lower" || c.id === "body_vs_subgoal_lower_upper"
    );
    expect(bodyConflicts).toHaveLength(0);
  });

  it("sorting: high severity conflicts come before medium", () => {
    const prefs = basePrefs({
      targetBody: "Upper",
      primaryFocus: ["Build Muscle (Hypertrophy)", "Recovery"],
      energyLevel: "high",
      subFocusByGoal: { "Build Muscle (Hypertrophy)": ["Glutes"] },
    });
    const conflicts = detectPreferenceConflicts(prefs);
    if (conflicts.length >= 2) {
      expect(conflicts[0]!.severity).toBe("high");
    }
  });

  it("flags multi_region_subgoals when Full body spans upper and lower subs", () => {
    const prefs = basePrefs({
      targetBody: "Full",
      primaryFocus: ["Build Muscle (Hypertrophy)"],
      subFocusByGoal: { "Build Muscle (Hypertrophy)": ["Back", "Glutes"] },
    });
    const conflicts = detectPreferenceConflicts(prefs);
    expect(conflicts.map((c) => c.id)).toContain("multi_region_subgoals");
  });
});

// ---------------------------------------------------------------------------
// Daily / weekly focus distribution gates
// ---------------------------------------------------------------------------

describe("session focus distribution gates", () => {
  it("requires daily spread-vs-resolve when body conflicts exist", async () => {
    const {
      canProceedWithDailyFocusDistribution,
      shouldShowDailyFocusDistributionNote,
    } = await import("./sessionFocusDistribution");
    const prefs = basePrefs({
      targetBody: "Upper",
      primaryFocus: ["Build Muscle (Hypertrophy)"],
      subFocusByGoal: { "Build Muscle (Hypertrophy)": ["Glutes"] },
    });
    expect(shouldShowDailyFocusDistributionNote(prefs)).toBe(true);
    expect(canProceedWithDailyFocusDistribution(prefs).ok).toBe(false);
    expect(
      canProceedWithDailyFocusDistribution({
        ...prefs,
        sessionFocusDistribution: "spread",
      }).ok
    ).toBe(true);
  });

  it("requires weekly blend-vs-dedicate when goals exist", async () => {
    const {
      canProceedWithWeeklyGoalDistribution,
      shouldShowWeeklyGoalDistributionNote,
    } = await import("./sessionFocusDistribution");
    expect(shouldShowWeeklyGoalDistributionNote()).toBe(true);
    expect(canProceedWithWeeklyGoalDistribution(undefined).ok).toBe(false);
    expect(canProceedWithWeeklyGoalDistribution("blend").ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Conflict 4: opposing goals
// ---------------------------------------------------------------------------

describe("opposing goals", () => {
  it("flags Build Muscle + Recovery in top-2 goals", () => {
    const prefs = basePrefs({
      primaryFocus: ["Build Muscle (Hypertrophy)", "Recovery"],
    });
    const conflicts = detectPreferenceConflicts(prefs);
    const opposingConflicts = conflicts.filter((c) => c.id.startsWith("opposing_goals"));
    expect(opposingConflicts).toHaveLength(1);
    expect(opposingConflicts[0]!.severity).toBe("medium");
  });

  it("does not flag Build Strength without a paired opposing goal", () => {
    const prefs = basePrefs({
      primaryFocus: ["Build Strength", "Improve Endurance"],
    });
    const conflicts = detectPreferenceConflicts(prefs);
    const opposingConflicts = conflicts.filter((c) => c.id.startsWith("opposing_goals"));
    expect(opposingConflicts).toHaveLength(0);
  });
});
