import { getCanonicalSportSlug } from "../data/sportSubFocus/canonicalSportSlug";
import type { SportGoalContext } from "./dailyGeneratorAdapter";
import type {
  DefaultTrainTodayPresetRef,
  ResolvedDefaultTrainTodayPreset,
} from "./defaultTrainTodayPreset";
import { resolveDefaultTrainTodayPreset } from "./defaultTrainTodayPreset";
import { GOAL_SLUG_TO_PRIMARY_FOCUS } from "./preferencesConstants";
import type { SportFormSnapshot, SportPreset } from "./sessionDraft";
import type { ManualPreferences, PreferencePreset } from "./types";
import { energyFromSportIntensity } from "./energyLevelMapping";

const EMPTY_MANUAL_PREFERENCES: ManualPreferences = {
  primaryFocus: [],
  targetBody: null,
  targetModifier: [],
  durationMinutes: null,
  energyLevel: null,
  injuries: [],
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

export function sportSlugsFromForm(form: SportFormSnapshot | null | undefined): string[] {
  return (form?.rankedSportSlugs ?? []).filter((s): s is string => s != null && s !== "");
}

/** Home Train today CTA — requires an active gym and a resolvable default preset. */
export function canUseTrainToday(
  hasActiveGym: boolean,
  resolvedDefault: ResolvedDefaultTrainTodayPreset | null
): boolean {
  return hasActiveGym && resolvedDefault != null;
}

function bodyTargetFromBias(bias: "upper" | "lower" | "full"): ManualPreferences["targetBody"] {
  if (bias === "upper") return "Upper";
  if (bias === "full") return "Full";
  return "Lower";
}

function globalGoalWeights(prefs: ManualPreferences): number[] {
  const p = prefs.goalMatchPrimaryPct ?? 50;
  const s = prefs.goalMatchSecondaryPct ?? 30;
  const t = prefs.goalMatchTertiaryPct ?? 20;
  const sum = p + s + t || 100;
  return [p / sum, s / sum, t / sum];
}

export type TrainTodayGenerationParams = {
  prefs: ManualPreferences;
  sportGoalContext?: SportGoalContext;
  /** True when generation should include sportGoalContext (sport-only or blended). */
  usesSportContext: boolean;
  sessionFlow: "goal_day" | "sport_day";
};

export function buildTrainTodayGenerationParams(
  manualPreferences: ManualPreferences,
  sportForm: SportFormSnapshot | null | undefined
): TrainTodayGenerationParams {
  const sportSlugs = sportSlugsFromForm(sportForm).map(getCanonicalSportSlug);
  const hasGoals = manualPreferences.primaryFocus.length >= 1;
  const hasSport = sportSlugs.length >= 1;

  if (hasGoals && !hasSport) {
    return {
      prefs: {
        ...manualPreferences,
        durationMinutes: manualPreferences.durationMinutes ?? 45,
      },
      usesSportContext: false,
      sessionFlow: "goal_day",
    };
  }

  if (hasSport && sportForm) {
    const rankedGoalSlugs = sportForm.rankedGoals.filter((g): g is string => g != null && g !== "");
    const goalLabelsFromSport = rankedGoalSlugs.map((g) => GOAL_SLUG_TO_PRIMARY_FOCUS[g] ?? g);
    const primaryFocus = hasGoals
      ? manualPreferences.primaryFocus
      : goalLabelsFromSport.length > 0
        ? goalLabelsFromSport
        : manualPreferences.primaryFocus;

    const prefs: ManualPreferences = {
      ...manualPreferences,
      primaryFocus,
      durationMinutes: sportForm.oneDayDuration ?? manualPreferences.durationMinutes ?? 45,
      energyLevel: energyFromSportIntensity(sportForm.intensityLevel),
      targetBody: bodyTargetFromBias(sportForm.oneDayBodyBias) ?? manualPreferences.targetBody,
      injuries:
        sportForm.injuryTypes.length > 0
          ? sportForm.injuryTypes
          : manualPreferences.injuries,
    };

    const sportGoalContext: SportGoalContext = {
      sport_slugs: sportSlugs,
      ...(Object.keys(sportForm.subFocusBySport).length
        ? { sport_sub_focus: sportForm.subFocusBySport }
        : {}),
      sport_weight: (sportForm.sportVsGoalPct ?? 55) / 100,
      ...(sportSlugs.length === 2 ? { sport_focus_pct: sportForm.sportFocusPct } : {}),
      ...(hasGoals || rankedGoalSlugs.length > 0 ? { goal_weights: globalGoalWeights(prefs) } : {}),
      include_intent_survival_report: true,
    };

    return {
      prefs,
      sportGoalContext,
      usesSportContext: true,
      sessionFlow: hasGoals ? "goal_day" : "sport_day",
    };
  }

  return {
    prefs: {
      ...manualPreferences,
      durationMinutes: manualPreferences.durationMinutes ?? 45,
    },
    usesSportContext: false,
    sessionFlow: "goal_day",
  };
}

/** Build generation params from the Home default preset (goal or sport). */
export function resolveTrainTodayFromPreset(
  resolved: ResolvedDefaultTrainTodayPreset
): TrainTodayGenerationParams {
  if (resolved.kind === "goal") {
    return buildTrainTodayGenerationParams(resolved.preset.preferences, null);
  }
  return buildTrainTodayGenerationParams(EMPTY_MANUAL_PREFERENCES, resolved.preset.sportForm);
}

function goalPresetDetail(preset: PreferencePreset): string {
  const goals = preset.preferences.primaryFocus;
  if (goals.length === 0) return "No goals set";
  if (goals.length === 1) return goals[0]!;
  return `${goals[0]} +${goals.length - 1} more`;
}

function sportPresetDetail(preset: SportPreset): string {
  const sports = sportSlugsFromForm(preset.sportForm);
  if (sports.length === 0) return "No sports set";
  return sports
    .slice(0, 2)
    .map((s) => s.replace(/_/g, " "))
    .join(" · ");
}

export function trainTodaySubtitleFromPreset(
  resolved: ResolvedDefaultTrainTodayPreset | null,
  gymName: string | null
): string {
  if (!resolved) return gymName ? `No default preset · ${gymName}` : "No default preset";
  const detail =
    resolved.kind === "goal"
      ? goalPresetDetail(resolved.preset)
      : sportPresetDetail(resolved.preset);
  const parts = [resolved.preset.name, detail];
  if (gymName) parts.push(gymName);
  return parts.join(" · ");
}

/** @deprecated Prefer resolve + canUseTrainToday(hasGym, resolved). Kept for call-site migration. */
export function trainTodaySubtitle(
  manualPreferences: ManualPreferences,
  sportForm: SportFormSnapshot | null | undefined,
  gymName: string | null
): string {
  const parts: string[] = [];
  if (manualPreferences.primaryFocus.length > 0) {
    parts.push(manualPreferences.primaryFocus[0]!);
    if (manualPreferences.primaryFocus[1]) parts.push(manualPreferences.primaryFocus[1]!);
  } else {
    const sports = sportSlugsFromForm(sportForm);
    if (sports.length > 0) {
      parts.push(
        sports
          .slice(0, 2)
          .map((s) => s.replace(/_/g, " "))
          .join(" · ")
      );
    }
  }
  if (gymName) parts.push(gymName);
  return parts.join(" · ") || "Saved preferences";
}

export function resolveTrainTodayDefault(
  ref: DefaultTrainTodayPresetRef | null,
  goalPresets: PreferencePreset[],
  sportPresets: SportPreset[]
): ResolvedDefaultTrainTodayPreset | null {
  return resolveDefaultTrainTodayPreset(ref, goalPresets, sportPresets);
}
