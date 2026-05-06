/**
 * Per-day session focus presets for weekly manual generation.
 * Maps UI choices → SportGoalContext (sport vs goal weights) + optional primaryFocus reorder.
 */

import type { AdaptiveSetup } from "../context/appStateModel";
import type { ManualPreferences } from "./types";
import type { SportGoalContext } from "./dailyGeneratorAdapter";
import { getCanonicalSportSlug } from "../data/sportSubFocus/canonicalSportSlug";

export type DayFocusPreset = {
  id: string;
  label: string;
  /** Short line shown under the title */
  subtitle: string;
};

const EMPHASIS_GOAL_WEIGHTS: [number, number, number] = [0.62, 0.26, 0.12];
const BALANCED_FALLBACK: [number, number, number] = [0.5, 0.3, 0.2];

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
  const rankedGoals = manualPreferences.primaryFocus.filter(Boolean);
  const sports =
    adaptiveSetup?.rankedSportSlugs?.filter((s): s is string => s != null && s !== "") ?? [];
  const sportSlugs = sports.map((s) => getCanonicalSportSlug(s));
  const primarySport = sportSlugs[0];
  const sportName = primarySport ? sportDisplayName(primarySport) : null;
  const bodyStr = bodyLine(targetBody, targetModifier);

  const out: DayFocusPreset[] = [];

  if (sportSlugs.length > 0 && rankedGoals.length > 0) {
    out.push({
      id: "sport_first",
      label: `${sportName ?? "Sport"} performance first`,
      subtitle: `${bodyStr} — most of this session supports your sport; goals fill the rest.`,
    });
    const g0 = rankedGoals[0] ?? "Primary goal";
    out.push({
      id: "goal_first",
      label: `${g0} first`,
      subtitle: `${bodyStr} — training goals lead; sport work supports transfer.`,
    });
    const pct = adaptiveSetup?.sportVsGoalPct ?? 50;
    out.push({
      id: "balanced_split",
      label: "Balanced sport + goals",
      subtitle: `${bodyStr} — about ${pct}% sport focus and ${100 - pct}% goals (your Sport vs goals setting).`,
    });
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
): { primaryFocus: string[]; sportGoalContext: SportGoalContext | undefined } {
  const ranked = manualPreferences.primaryFocus.filter(Boolean);
  const sports =
    adaptiveSetup?.rankedSportSlugs?.filter((s): s is string => s != null && s !== "") ?? [];
  const sportSlugs = sports.map((s) => getCanonicalSportSlug(s));
  const subFocusBySport = adaptiveSetup?.subFocusBySport ?? {};

  const baseGlobal = globalGoalWeights(manualPreferences);

  if (sportSlugs.length > 0 && ranked.length > 0) {
    const sub: Record<string, string[]> = {};
    for (const s of sportSlugs) {
      const raw = subFocusBySport[s] ?? subFocusBySport[sports.find((x) => getCanonicalSportSlug(x) === s) ?? ""] ?? [];
      if (raw.length) sub[s] = raw;
    }
    const sportVs = (adaptiveSetup?.sportVsGoalPct ?? 50) / 100;

    if (presetId === "sport_first") {
      return {
        primaryFocus: ranked,
        sportGoalContext: {
          sport_slugs: sportSlugs,
          ...(Object.keys(sub).length ? { sport_sub_focus: sub } : {}),
          sport_weight: 0.72,
          goal_weights: [...baseGlobal],
        },
      };
    }
    if (presetId === "goal_first") {
      return {
        primaryFocus: ranked,
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
