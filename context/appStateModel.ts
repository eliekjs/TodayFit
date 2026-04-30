import type { BodyEmphasisKey, ManualPreferences } from "../lib/types";

/** Adaptive mode: first-page choices passed to the schedule (second) page. */
export type AdaptiveSetup = {
  rankedGoals: (string | null)[];
  intensityLevel: string;
  injuryStatus: string;
  injuryTypes: string[];
  rankedSportSlugs: (string | null)[];
  subFocusBySport: Record<string, string[]>;
  sportFocusPct: [number, number];
  /** When both sports and goals selected: 0–100 = sport(s) share; additional goals = 100 - sportVsGoalPct. Omit or 50 = default. */
  sportVsGoalPct?: number;
  /** Weekly body emphasis: more volume on this area; week still trains full body. */
  weeklyEmphasis?: BodyEmphasisKey | null;
};

export const defaultManualPreferences: ManualPreferences = {
  primaryFocus: [],
  targetBody: null,
  targetModifier: [],
  durationMinutes: null,
  energyLevel: null,
  injuries: [],
  upcoming: [],
  subFocusByGoal: {},
  workoutStyle: [],
  preferredZone2Cardio: [],
  goalMatchPrimaryPct: 50,
  goalMatchSecondaryPct: 30,
  goalMatchTertiaryPct: 20,
  workoutTier: "intermediate",
  includeCreativeVariations: false,
};
