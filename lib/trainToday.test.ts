import { describe, expect, it } from "vitest";
import {
  fallbackDefaultAfterRemoval,
  parseDefaultTrainTodayPresetRef,
  recoverDefaultTrainTodayPreset,
  resolveDefaultTrainTodayPreset,
} from "./defaultTrainTodayPreset";
import type { SportFormSnapshot, SportPreset } from "./sessionDraft";
import type { ManualPreferences, PreferencePreset } from "./types";
import {
  canUseTrainToday,
  resolveTrainTodayFromPreset,
  trainTodaySubtitleFromPreset,
} from "./trainToday";

const basePrefs: ManualPreferences = {
  primaryFocus: ["Build Strength"],
  targetBody: "Full",
  targetModifier: [],
  durationMinutes: 45,
  energyLevel: "medium",
  injuries: ["No restrictions"],
  upcoming: [],
  subFocusByGoal: {},
  subFocusPctByGoal: {},
  workoutStyle: [],
  preferredZone2Cardio: [],
  goalMatchPrimaryPct: 50,
  goalMatchSecondaryPct: 30,
  goalMatchTertiaryPct: 20,
  workoutTier: "intermediate",
  includeCreativeVariations: false,
};

function goalPreset(id: string, name: string, savedAt: string, prefs?: Partial<ManualPreferences>): PreferencePreset {
  return {
    id,
    name,
    savedAt,
    preferences: { ...basePrefs, ...prefs },
  };
}

function sportForm(partial?: Partial<SportFormSnapshot>): SportFormSnapshot {
  return {
    rankedGoals: [null, null, null],
    intensityLevel: "Medium",
    injuryStatus: "None",
    injuryTypes: [],
    rankedSportSlugs: ["basketball", null],
    subFocusBySport: { basketball: ["vertical_jump"] },
    sportFocusPct: [100, 0],
    sportVsGoalPct: 70,
    oneDayDuration: 40,
    oneDayBodyBias: "lower",
    ...partial,
  };
}

function sportPreset(id: string, name: string, savedAt: string, form?: Partial<SportFormSnapshot>): SportPreset {
  return {
    id,
    name,
    savedAt,
    sportForm: sportForm(form),
  };
}

describe("defaultTrainTodayPreset helpers", () => {
  it("parses valid refs and rejects garbage", () => {
    expect(parseDefaultTrainTodayPresetRef({ kind: "goal", id: "abc" })).toEqual({
      kind: "goal",
      id: "abc",
    });
    expect(parseDefaultTrainTodayPresetRef({ kind: "sport", id: "x" })).toEqual({
      kind: "sport",
      id: "x",
    });
    expect(parseDefaultTrainTodayPresetRef(null)).toBeNull();
    expect(parseDefaultTrainTodayPresetRef({ kind: "goal" })).toBeNull();
  });

  it("resolves live presets and returns null for stale ids", () => {
    const goals = [goalPreset("g1", "Strength", "2026-01-02T00:00:00.000Z")];
    const sports = [sportPreset("s1", "Hoops", "2026-01-01T00:00:00.000Z")];
    expect(resolveDefaultTrainTodayPreset({ kind: "goal", id: "g1" }, goals, sports)?.preset.name).toBe(
      "Strength"
    );
    expect(resolveDefaultTrainTodayPreset({ kind: "sport", id: "s1" }, goals, sports)?.kind).toBe(
      "sport"
    );
    expect(resolveDefaultTrainTodayPreset({ kind: "goal", id: "missing" }, goals, sports)).toBeNull();
  });

  it("falls back after removal preferring same kind then most recent", () => {
    const goals = [
      goalPreset("g_old", "Old", "2026-01-01T00:00:00.000Z"),
      goalPreset("g_new", "New", "2026-06-01T00:00:00.000Z"),
    ];
    const sports = [sportPreset("s1", "Hoops", "2026-05-01T00:00:00.000Z")];
    expect(
      fallbackDefaultAfterRemoval({ kind: "goal", id: "g_old" }, goals.filter((g) => g.id !== "g_old"), sports)
    ).toEqual({ kind: "goal", id: "g_new" });
    expect(
      fallbackDefaultAfterRemoval({ kind: "goal", id: "only" }, [], sports)
    ).toEqual({ kind: "sport", id: "s1" });
    expect(fallbackDefaultAfterRemoval({ kind: "sport", id: "s1" }, [], [])).toBeNull();
  });

  it("recovers null or stale pointer to most recent preset", () => {
    const goals = [goalPreset("g1", "Strength", "2026-06-01T00:00:00.000Z")];
    const sports = [sportPreset("s1", "Hoops", "2026-01-01T00:00:00.000Z")];
    expect(recoverDefaultTrainTodayPreset(null, goals, sports)).toEqual({ kind: "goal", id: "g1" });
    expect(recoverDefaultTrainTodayPreset({ kind: "goal", id: "gone" }, goals, sports)).toEqual({
      kind: "goal",
      id: "g1",
    });
    expect(recoverDefaultTrainTodayPreset(null, [], [])).toBeNull();
  });
});

describe("resolveTrainTodayFromPreset", () => {
  it("builds goal_day params from a goal preset", () => {
    const resolved = resolveDefaultTrainTodayPreset(
      { kind: "goal", id: "g1" },
      [goalPreset("g1", "Strength day", "2026-01-01T00:00:00.000Z")],
      []
    )!;
    const params = resolveTrainTodayFromPreset(resolved);
    expect(params.sessionFlow).toBe("goal_day");
    expect(params.usesSportContext).toBe(false);
    expect(params.prefs.primaryFocus).toEqual(["Build Strength"]);
    expect(params.prefs.durationMinutes).toBe(45);
  });

  it("builds sport_day params from a sport-only preset", () => {
    const resolved = resolveDefaultTrainTodayPreset(
      { kind: "sport", id: "s1" },
      [],
      [sportPreset("s1", "Jump day", "2026-01-01T00:00:00.000Z")]
    )!;
    const params = resolveTrainTodayFromPreset(resolved);
    expect(params.sessionFlow).toBe("sport_day");
    expect(params.usesSportContext).toBe(true);
    expect(params.sportGoalContext?.sport_slugs).toContain("basketball");
    expect(params.prefs.durationMinutes).toBe(40);
    expect(params.prefs.targetBody).toBe("Lower");
  });

  it("canUseTrainToday requires gym + resolved default", () => {
    const resolved = resolveDefaultTrainTodayPreset(
      { kind: "goal", id: "g1" },
      [goalPreset("g1", "Strength", "2026-01-01T00:00:00.000Z")],
      []
    );
    expect(canUseTrainToday(true, resolved)).toBe(true);
    expect(canUseTrainToday(false, resolved)).toBe(false);
    expect(canUseTrainToday(true, null)).toBe(false);
  });

  it("subtitle includes preset name, detail, and gym", () => {
    const resolved = resolveDefaultTrainTodayPreset(
      { kind: "goal", id: "g1" },
      [goalPreset("g1", "My strength", "2026-01-01T00:00:00.000Z")],
      []
    );
    expect(trainTodaySubtitleFromPreset(resolved, "Home gym")).toContain("My strength");
    expect(trainTodaySubtitleFromPreset(resolved, "Home gym")).toContain("Home gym");
    expect(trainTodaySubtitleFromPreset(null, "Home gym")).toContain("No default preset");
  });
});
