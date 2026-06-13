/**
 * Per-day session focus presets for weekly manual generation.
 * Maps UI choices → SportGoalContext (sport vs goal weights) + optional primaryFocus reorder.
 */

import type { AdaptiveSetup } from "../context/appStateModel";
import type { ManualPreferences } from "./types";
import type { SportGoalContext } from "./dailyGeneratorAdapter";
import { getCanonicalSportSlug } from "../data/sportSubFocus/canonicalSportSlug";
import {
  GOAL_SLUG_TO_PRIMARY_FOCUS,
  PRIMARY_FOCUS_TO_GOAL_SLUG,
} from "./preferencesConstants";

export type DayFocusPreset = {
  id: string;
  label: string;
  /** Short line shown under the title */
  subtitle: string;
};

const EMPHASIS_GOAL_WEIGHTS: [number, number, number] = [0.62, 0.26, 0.12];
const BALANCED_FALLBACK: [number, number, number] = [0.5, 0.3, 0.2];

type ResolvedDayFocusPreset = {
  primaryFocus: string[];
  sportGoalContext: SportGoalContext | undefined;
};

function norm3(a: number, b: number, c: number): [number, number, number] {
  const s = a + b + c;
  if (s <= 0) return [1 / 3, 1 / 3, 1 / 3];
  return [a / s, b / s, c / s];
}

function globalGoalWeights(prefs: ManualPreferences): [number, number, number] {
  const p1 = prefs.goalMatchPrimaryPct ?? 50;
  const p2 = prefs.goalMatchSecondaryPct ?? 30;
  const p3 = prefs.goalMatchTertiaryPct ?? 20;
  return norm3(p1, p2, p3);
}

/** Put the emphasized goal label first; keep other ranked goals in stable order. */
export function reorderPrimaryFocusForEmphasis(
  rankedLabels: string[],
  emphasizeIndex: number
): string[] {
  if (rankedLabels.length === 0) return rankedLabels;
  const k = Math.min(Math.max(0, emphasizeIndex), rankedLabels.length - 1);
  const em = rankedLabels[k]!;
  const rest = rankedLabels.filter((_, i) => i !== k);
  return [em, ...rest].slice(0, 3);
}

function sportDisplayName(slug: string): string {
  const n = getCanonicalSportSlug(slug);
  const map: Record<string, string> = {
    rock_climbing: "Climbing",
    surfing: "Surfing",
    snowboarding: "Snowboarding",
    alpine_skiing: "Skiing",
    trail_running: "Trail running",
    road_running: "Running",
    soccer: "Soccer",
    swimming_open_water: "Open-water swimming",
  };
  return map[n] ?? n.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function sportPerformanceLabel(slug: string): string {
  return `${sportDisplayName(slug)} performance`;
}

function subFocusForSports(
  sportSlugs: string[],
  originalSportSlugs: string[],
  subFocusBySport: Record<string, string[]>
): Record<string, string[]> {
  const sub: Record<string, string[]> = {};
  for (const s of sportSlugs) {
    const rawMatch = originalSportSlugs.find((x) => getCanonicalSportSlug(x) === s) ?? "";
    const raw = subFocusBySport[s] ?? subFocusBySport[rawMatch] ?? [];
    if (raw.length) sub[s] = raw;
  }
  return sub;
}

function parseIndexedPresetId(
  presetId: string,
  prefix: string,
  legacyId?: string
): number | null {
  if (legacyId && presetId === legacyId) return 0;
  if (!presetId.startsWith(prefix)) return null;
  const idx = parseInt(presetId.replace(prefix, ""), 10);
  return Number.isNaN(idx) ? null : idx;
}

function bodyLine(targetBody: string, targetModifier: string[]): string {
  const mod =
    targetModifier.length > 0
      ? ` (${targetModifier.map((m) => m.toLowerCase()).join(", ")})`
      : "";
  return `${targetBody} body${mod}`;
}

export function buildDayFocusPresetsForDay(opts: {
  manualPreferences: ManualPreferences;
  adaptiveSetup: AdaptiveSetup | null;
  /** From getBodyEmphasisDistribution — scheduled split for this session */
  targetBody: "Upper" | "Lower" | "Full";
  targetModifier: string[];
}): DayFocusPreset[] {
  const { manualPreferences, adaptiveSetup, targetBody, targetModifier } = opts;
  const rankedGoals = manualPreferencesForSportWeekFocus(
    manualPreferences,
    adaptiveSetup
  ).primaryFocus.filter(Boolean);
  const sports =
    adaptiveSetup?.rankedSportSlugs?.filter((s): s is string => s != null && s !== "") ?? [];
  const sportSlugs = sports.map((s) => getCanonicalSportSlug(s));
  const bodyStr = bodyLine(targetBody, targetModifier);

  const out: DayFocusPreset[] = [];

  if (sportSlugs.length > 0) {
    sportSlugs.forEach((slug, idx) => {
      const name = sportDisplayName(slug);
      out.push({
        id: `sport_emphasis_${idx}`,
        label: `${name} first`,
        subtitle: rankedGoals.length > 0
          ? `${bodyStr} — this day mainly supports ${name}; goals fill the rest.`
          : `${bodyStr} — this day mainly supports ${name}.`,
      });
    });

    if (rankedGoals.length > 0) {
      rankedGoals.slice(0, 3).forEach((label, idx) => {
        out.push({
          id: `goal_emphasis_${idx}`,
          label: `${label} first`,
          subtitle: `${bodyStr} — this goal leads the session; sport work supports transfer.`,
        });
      });
      const pct = adaptiveSetup?.sportVsGoalPct ?? 50;
      out.push({
        id: "balanced_split",
        label: "Balanced sport + goals",
        subtitle: `${bodyStr} — about ${pct}% sport focus and ${100 - pct}% goals (your Sport vs goals setting).`,
      });
      return out;
    }

    if (sportSlugs.length > 1) {
      out.push({
        id: "balanced_sports",
        label: "Blend selected sports",
        subtitle: `${bodyStr} — split support across your selected sports.`,
      });
    }
    return out;
  }

  if (rankedGoals.length >= 2) {
    rankedGoals.slice(0, 3).forEach((label, idx) => {
      out.push({
        id: `goal_emphasis_${idx}`,
        label: `${label} first`,
        subtitle: `${bodyStr} — most volume aligns with this goal; others stay in the mix.`,
      });
    });
    out.push({
      id: "balanced_goals",
      label: "Blend all ranked goals",
      subtitle: `${bodyStr} — use your global goal percentages (${manualPreferences.goalMatchPrimaryPct ?? 50}/${manualPreferences.goalMatchSecondaryPct ?? 30}/${manualPreferences.goalMatchTertiaryPct ?? 20}).`,
    });
    return out;
  }

  if (rankedGoals.length === 1) {
    out.push({
      id: "single_goal",
      label: `${rankedGoals[0]} session`,
      subtitle: `${bodyStr} — full session aligned to your focus.`,
    });
    return out;
  }

  out.push({
    id: "default",
    label: "Standard session",
    subtitle: bodyStr,
  });
  return out;
}

/**
 * Build sport/goal context + adjusted primary focus for one day from a preset id.
 */
export function resolveDayFocusPreset(
  presetId: string,
  manualPreferences: ManualPreferences,
  adaptiveSetup: AdaptiveSetup | null
): ResolvedDayFocusPreset {
  const ranked = manualPreferences.primaryFocus.filter(Boolean);
  const sports =
    adaptiveSetup?.rankedSportSlugs?.filter((s): s is string => s != null && s !== "") ?? [];
  const sportSlugs = sports.map((s) => getCanonicalSportSlug(s));
  const subFocusBySport = adaptiveSetup?.subFocusBySport ?? {};

  const baseGlobal = globalGoalWeights(manualPreferences);

  if (sportSlugs.length > 0) {
    const sub = subFocusForSports(sportSlugs, sports, subFocusBySport);
    const sportVs = (adaptiveSetup?.sportVsGoalPct ?? 50) / 100;
    const sportIdx = parseIndexedPresetId(presetId, "sport_emphasis_", "sport_first");

    if (sportIdx != null && sportIdx >= 0 && sportIdx < sportSlugs.length) {
      const selectedSport = sportSlugs[sportIdx]!;
      const selectedSub = subFocusForSports([selectedSport], sports, subFocusBySport);
      return {
        primaryFocus: [sportPerformanceLabel(selectedSport)],
        sportGoalContext: {
          sport_slugs: [selectedSport],
          ...(Object.keys(selectedSub).length ? { sport_sub_focus: selectedSub } : {}),
          sport_weight: ranked.length > 0 ? 0.72 : 1,
          ...(ranked.length > 0 ? { goal_weights: [...baseGlobal] } : {}),
        },
      };
    }

    const goalIdx = parseIndexedPresetId(presetId, "goal_emphasis_", "goal_first");
    if (ranked.length > 0 && goalIdx != null && goalIdx >= 0 && goalIdx < ranked.length) {
      return {
        primaryFocus: [ranked[goalIdx]!],
        sportGoalContext: {
          sport_slugs: sportSlugs,
          ...(Object.keys(sub).length ? { sport_sub_focus: sub } : {}),
          sport_weight: 0.14,
          goal_weights: EMPHASIS_GOAL_WEIGHTS,
        },
      };
    }

    if (presetId === "balanced_split") {
      return {
        primaryFocus: ranked,
        sportGoalContext: {
          sport_slugs: sportSlugs,
          ...(Object.keys(sub).length ? { sport_sub_focus: sub } : {}),
          sport_weight: Math.max(0.08, Math.min(0.92, sportVs)),
          goal_weights: [...baseGlobal],
        },
      };
    }

    if (presetId === "balanced_sports") {
      return {
        primaryFocus: ["Sport preparation"],
        sportGoalContext: {
          sport_slugs: sportSlugs,
          ...(Object.keys(sub).length ? { sport_sub_focus: sub } : {}),
          sport_weight: 1,
        },
      };
    }
  }

  if (ranked.length >= 2) {
    if (presetId.startsWith("goal_emphasis_")) {
      const idx = parseInt(presetId.replace("goal_emphasis_", ""), 10);
      if (!Number.isNaN(idx) && idx >= 0 && idx < ranked.length) {
        return {
          primaryFocus: reorderPrimaryFocusForEmphasis(ranked, idx),
          sportGoalContext: { goal_weights: EMPHASIS_GOAL_WEIGHTS },
        };
      }
    }
    if (presetId === "balanced_goals") {
      return {
        primaryFocus: ranked,
        sportGoalContext: { goal_weights: [...baseGlobal] },
      };
    }
  }

  if (presetId === "single_goal" && ranked.length === 1) {
    return { primaryFocus: ranked, sportGoalContext: { goal_weights: [1, 0, 0] } };
  }

  return {
    primaryFocus: ranked.length ? ranked : manualPreferences.primaryFocus,
    sportGoalContext:
      sportSlugs.length > 0
        ? {
            sport_slugs: sportSlugs,
            sport_weight: (adaptiveSetup?.sportVsGoalPct ?? 50) / 100,
            goal_weights: [...baseGlobal],
          }
        : { goal_weights: [...baseGlobal] },
  };
}

/** Pick default preset id for a day (first option). */
export function defaultPresetIdForDay(presets: DayFocusPreset[]): string {
  return presets[0]?.id ?? "balanced_goals";
}

/**
 * Default when opening the planner: honor dedicate-days (that day’s goal) when presets include goal_emphasis_k.
 */
export function defaultPresetIdForWeekDay(
  presets: DayFocusPreset[],
  opts: {
    dedicateDays: boolean;
    /** Which ranked goal (0..2) this training day is assigned to */
    weekGoalSlotIndex: number;
  }
): string {
  if (opts.dedicateDays && opts.weekGoalSlotIndex >= 0) {
    const id = `goal_emphasis_${opts.weekGoalSlotIndex}`;
    if (presets.some((p) => p.id === id)) return id;
  }
  return defaultPresetIdForDay(presets);
}

/** Map adaptive ranked goal slugs to Manual primary-focus labels (for preset resolution). */
export function primaryFocusLabelsFromGoalSlugs(goalSlugs: string[]): string[] {
  return goalSlugs
    .map((slug) => GOAL_SLUG_TO_PRIMARY_FOCUS[slug] ?? slug)
    .filter(Boolean);
}

/** Build ManualPreferences with primaryFocus from adaptive goals when labels are absent. */
export function manualPreferencesForSportWeekFocus(
  manualPreferences: ManualPreferences,
  adaptiveSetup: AdaptiveSetup | null
): ManualPreferences {
  const rankedSlugs =
    adaptiveSetup?.rankedGoals?.filter((g): g is string => g != null && g !== "") ?? [];
  const fromAdaptive = primaryFocusLabelsFromGoalSlugs(rankedSlugs);
  const primaryFocus =
    manualPreferences.primaryFocus.length > 0
      ? manualPreferences.primaryFocus
      : fromAdaptive;
  return { ...manualPreferences, primaryFocus };
}

export type ResolvedDayFocusWorkoutParams = {
  focusLabels: string[];
  orderedGoalSlugs: string[];
  goalWeightsPct: [number, number, number];
  sportWeightOverride?: number;
  goalWeightsOverride?: number[];
  sportSlugsOverride?: string[];
  sportSubFocusBySportOverride?: Record<string, string[]>;
};

/**
 * Turn a resolved day-focus preset into planner / workout-builder inputs.
 */
/** Legacy adaptive slugs that alias to a canonical goal slug in ranked plans. */
const RANKED_GOAL_SLUG_ALIASES: Record<string, string[]> = {
  recovery_mobility: ["recovery_mobility", "mobility", "resilience"],
  joint_health: ["joint_health"],
};

function rankedGoalSlugMatches(canonicalSlug: string, rankedSlugs: string[]): string | undefined {
  const variants = RANKED_GOAL_SLUG_ALIASES[canonicalSlug] ?? [canonicalSlug];
  return rankedSlugs.find((s) => variants.includes(s));
}

export function resolvedDayFocusToWorkoutParams(
  resolved: { primaryFocus: string[]; sportGoalContext: SportGoalContext | undefined },
  rankedGoalSlugs: string[],
  fallbackGoalWeightsPct: [number, number, number]
): ResolvedDayFocusWorkoutParams {
  const focusLabels =
    resolved.primaryFocus.length > 0 ? resolved.primaryFocus : [];
  const slugOrder: string[] = [];
  for (const label of focusLabels) {
    const slug = PRIMARY_FOCUS_TO_GOAL_SLUG[label];
    const rankedMatch = slug ? rankedGoalSlugMatches(slug, rankedGoalSlugs) : undefined;
    if (rankedMatch && !slugOrder.includes(rankedMatch)) {
      slugOrder.push(rankedMatch);
    }
  }
  for (const slug of rankedGoalSlugs) {
    if (!slugOrder.includes(slug)) slugOrder.push(slug);
  }
  const orderedGoalSlugs = slugOrder.length > 0 ? slugOrder : rankedGoalSlugs;

  let goalWeightsPct: [number, number, number] = [...fallbackGoalWeightsPct];
  const gw = resolved.sportGoalContext?.goal_weights;
  if (gw && gw.length > 0) {
    const pcts = gw.map((w) => Math.round(w * 100));
    goalWeightsPct = [
      pcts[0] ?? fallbackGoalWeightsPct[0],
      pcts[1] ?? fallbackGoalWeightsPct[1],
      pcts[2] ?? fallbackGoalWeightsPct[2],
    ];
  }

  return {
    focusLabels,
    orderedGoalSlugs,
    goalWeightsPct,
    sportWeightOverride: resolved.sportGoalContext?.sport_weight,
    goalWeightsOverride: gw,
    sportSlugsOverride: resolved.sportGoalContext?.sport_slugs?.length
      ? [...resolved.sportGoalContext.sport_slugs]
      : undefined,
    sportSubFocusBySportOverride: resolved.sportGoalContext?.sport_sub_focus &&
      Object.keys(resolved.sportGoalContext.sport_sub_focus).length > 0
        ? { ...resolved.sportGoalContext.sport_sub_focus }
        : undefined,
  };
}

const DEFAULT_WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Card title for per-day focus picker — weekday + body emphasis, no calendar date. */
export function buildGymDayFocusCardLabel(
  dow: number,
  slotIndex: number,
  targetBody: string,
  targetModifier: string[] = [],
  weekdayLabels: readonly string[] = DEFAULT_WEEKDAY_LABELS
): string {
  const dayLabel = weekdayLabels[dow] ?? `Gym day ${slotIndex + 1}`;
  const mod =
    targetModifier.length > 0 ? ` (${targetModifier.join(" · ")})` : "";
  return `${dayLabel} · ${targetBody}${mod}`;
}

/** Minimal AdaptiveSetup from sport week plan / regenerate inputs. */
export function adaptiveSetupFromPlanContext(opts: {
  goalSlugs?: string[];
  rankedSportSlugs?: string[];
  sportVsGoalPct?: number;
  sportFocusPct?: [number, number];
  sportSubFocusSlugsBySport?: Record<string, string[]>;
}): AdaptiveSetup | null {
  const goals = opts.goalSlugs ?? [];
  const sports = opts.rankedSportSlugs ?? [];
  if (goals.length === 0 && sports.length === 0) return null;
  return {
    rankedGoals: [
      goals[0] ?? null,
      goals[1] ?? null,
      goals[2] ?? null,
    ],
    rankedSportSlugs: [
      sports[0] ?? null,
      sports[1] ?? null,
    ],
    subFocusBySport: opts.sportSubFocusSlugsBySport ?? {},
    sportFocusPct: opts.sportFocusPct ?? [60, 40],
    sportVsGoalPct: opts.sportVsGoalPct ?? 50,
    intensityLevel: "medium",
    injuryStatus: "ok",
    injuryTypes: [],
  };
}
