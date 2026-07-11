/**
 * Per-day session focus presets for weekly manual generation.
 * Maps UI choices → SportGoalContext (sport vs goal weights) + optional primaryFocus reorder.
 */

import type { AdaptiveSetup } from "../context/appStateModel";
import type { ManualPreferences, SpecificBodyFocusKey } from "./types";
import type { SportGoalContext } from "./dailyGeneratorAdapter";
import { getCanonicalSportSlug } from "../data/sportSubFocus/canonicalSportSlug";
import { getSportDefinition } from "../data/sportSubFocus";
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

export type DayBodyFocusChoiceId = "upper" | "lower" | "full" | "core";

export type DayBodyFocusChoice = {
  id: DayBodyFocusChoiceId;
  label: string;
  subtitle: string;
  targetBody: "Upper" | "Lower" | "Full";
  targetModifier: string[];
  specificBodyFocus?: SpecificBodyFocusKey[];
  recommended?: boolean;
};

const EMPHASIS_GOAL_WEIGHTS: [number, number, number] = [1, 0, 0];

/** Display percentages for exclusive single-goal day focus (100%). */
export const EMPHASIS_GOAL_WEIGHTS_PCT: [number, number, number] = [100, 0, 0];

const BALANCED_FALLBACK: [number, number, number] = [0.5, 0.3, 0.2];

/** True when a day-focus preset commits the session to a single goal (not a blend). */
export function presetUsesEmphasisGoalWeights(presetId: string): boolean {
  return presetId.startsWith("goal_emphasis_") || presetId === "goal_first";
}

/** True when the day pick fully replaces earlier goals/sports for that session. */
export function presetUsesExclusiveDayFocus(presetId: string): boolean {
  return (
    presetUsesEmphasisGoalWeights(presetId) ||
    presetId.startsWith("sport_emphasis_") ||
    presetId === "sport_first" ||
    presetId === "single_goal"
  );
}

/** Subtitle for single-goal day presets (empty — label is enough). */
export function goalEmphasisPresetSubtitle(): string {
  return "";
}

function isExclusiveGoalWeightTriplet(gw: number[] | undefined): boolean {
  if (!gw || gw.length === 0) return false;
  return (gw[0] ?? 0) >= 0.999 && (gw[1] ?? 0) < 0.001 && (gw[2] ?? 0) < 0.001;
}

function isExclusiveSportWeight(sportWeight: number | undefined, gw: number[] | undefined): boolean {
  return sportWeight != null && sportWeight >= 0.999 && !isExclusiveGoalWeightTriplet(gw);
}

function globalGoalMatchPctLine(prefs: ManualPreferences): string {
  const p1 = prefs.goalMatchPrimaryPct ?? 50;
  const p2 = prefs.goalMatchSecondaryPct ?? 30;
  const p3 = prefs.goalMatchTertiaryPct ?? 20;
  return `${p1}/${p2}/${p3}%`;
}

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

/** User-facing body emphasis for preset subtitles (matches body focus picker labels). */
export function bodyFocusLineFromBias(bias: {
  targetBody: "Upper" | "Lower" | "Full";
  targetModifier?: string[];
  specificBodyFocus?: readonly string[];
}): string {
  const choiceId = bodyChoiceIdForBias(bias.targetBody, bias.specificBodyFocus);
  if (choiceId === "core") return "Core";
  return bodyLine(bias.targetBody, bias.targetModifier ?? []);
}

/** Short body emphasis for day headers (e.g. "Upper", "Core", "Lower (Push)"). */
export function bodyFocusEmphasisLabel(bias: {
  targetBody: "Upper" | "Lower" | "Full";
  targetModifier?: string[];
  specificBodyFocus?: readonly string[];
}): string {
  const choiceId = bodyChoiceIdForBias(bias.targetBody, bias.specificBodyFocus);
  const mod =
    (bias.targetModifier?.length ?? 0) > 0
      ? ` (${bias.targetModifier!.join(" · ")})`
      : "";
  if (choiceId === "core") return "Core";
  return `${bias.targetBody}${mod}`;
}

export function dayBodyFocusChoiceToBias(
  choiceId: DayBodyFocusChoiceId
): {
  targetBody: "Upper" | "Lower" | "Full";
  targetModifier: string[];
  specificBodyFocus?: SpecificBodyFocusKey[];
} {
  switch (choiceId) {
    case "upper":
      return { targetBody: "Upper", targetModifier: [] };
    case "lower":
      return { targetBody: "Lower", targetModifier: [] };
    case "core":
      return { targetBody: "Full", targetModifier: [], specificBodyFocus: ["core"] };
    case "full":
    default:
      return { targetBody: "Full", targetModifier: [] };
  }
}

function bodyChoiceIdForBias(
  targetBody: "Upper" | "Lower" | "Full",
  specificBodyFocus?: readonly string[]
): DayBodyFocusChoiceId {
  if (specificBodyFocus?.includes("core")) return "core";
  if (targetBody === "Upper") return "upper";
  if (targetBody === "Lower") return "lower";
  return "full";
}

function goalLabelSuggestsLowerOrCore(goalLabel: string): boolean {
  const s = goalLabel.toLowerCase();
  return (
    s.includes("endurance") ||
    s.includes("conditioning") ||
    s.includes("athletic") ||
    s.includes("power") ||
    s.includes("joint health") ||
    s.includes("recovery") ||
    s.includes("mobility")
  );
}

function goalLabelSuggestsUpper(goalLabel: string): boolean {
  const s = goalLabel.toLowerCase();
  return s.includes("calisthenics") || s.includes("muscle") || s.includes("strength");
}

function recommendedBodyChoiceIds(opts: {
  manualPreferences: ManualPreferences;
  adaptiveSetup: AdaptiveSetup | null;
  slotIndex: number;
  fallbackTargetBody: "Upper" | "Lower" | "Full";
}): DayBodyFocusChoiceId[] {
  const ids = new Set<DayBodyFocusChoiceId>();
  const sports =
    opts.adaptiveSetup?.rankedSportSlugs?.filter((s): s is string => s != null && s !== "") ?? [];
  for (const rawSlug of sports) {
    const def = getSportDefinition(rawSlug);
    const bias = def?.engine?.structureBias;
    const labels = [
      ...(def?.movementPatternsRanked ?? []).map((p) => p.label),
      ...(def?.mustInclude ?? []),
      ...(def?.engine?.topPatterns ?? []),
      ...(def?.engine?.secondaryPatterns ?? []),
    ].join(" ").toLowerCase();
    const inferredUpper =
      labels.includes("pull") ||
      labels.includes("grip") ||
      labels.includes("scapular") ||
      labels.includes("shoulder") ||
      labels.includes("upper");
    const inferredLower =
      labels.includes("run") ||
      labels.includes("stride") ||
      labels.includes("squat") ||
      labels.includes("single-leg") ||
      labels.includes("ankle") ||
      labels.includes("knee") ||
      labels.includes("lower");
    const upper = bias?.upperBodyBias ?? (inferredUpper ? 0.62 : 0);
    const lower = bias?.lowerBodyBias ?? (inferredLower ? 0.62 : 0);
    const full = bias?.fullBodyBias ?? 0;
    if (lower >= 0.45 || lower >= upper + 0.2) ids.add("lower");
    if (upper >= 0.45 || upper >= lower + 0.2) ids.add("upper");
    if (full >= 0.45 || (upper > 0.25 && lower > 0.25)) ids.add("full");
    if (lower >= 0.45 || full >= 0.45 || upper >= 0.45) ids.add("core");
  }

  if (ids.size === 0) {
    const focusPrefs = manualPreferencesForSportWeekFocus(
      opts.manualPreferences,
      opts.adaptiveSetup
    ).primaryFocus;
    if (focusPrefs.some(goalLabelSuggestsLowerOrCore)) {
      ids.add("lower");
      ids.add("core");
      ids.add("full");
    }
    if (focusPrefs.some(goalLabelSuggestsUpper)) {
      ids.add("upper");
      ids.add("full");
    }
  }

  if (ids.size === 0) {
    ids.add(bodyChoiceIdForBias(opts.fallbackTargetBody));
  }

  if (ids.has("upper") && ids.has("lower")) ids.add("full");
  return Array.from(ids);
}

export function buildDayBodyFocusChoicesForDay(opts: {
  manualPreferences: ManualPreferences;
  adaptiveSetup: AdaptiveSetup | null;
  slotIndex: number;
  fallbackTargetBody: "Upper" | "Lower" | "Full";
  fallbackTargetModifier?: string[];
}): DayBodyFocusChoice[] {
  const recommendedIds = recommendedBodyChoiceIds(opts);
  const recommended = new Set(recommendedIds);
  const fallbackId = bodyChoiceIdForBias(opts.fallbackTargetBody);
  const all: DayBodyFocusChoiceId[] = ["full", "lower", "core", "upper"];
  const orderedIds = [
    ...recommendedIds,
    fallbackId,
    ...all,
  ].filter((id, idx, arr): id is DayBodyFocusChoiceId => arr.indexOf(id) === idx);
  const copy: Record<DayBodyFocusChoiceId, { label: string; subtitle: string }> = {
    lower: {
      label: "Lower body",
      subtitle: "Leg strength, hips, ankles, and lower-body durability.",
    },
    core: {
      label: "Core",
      subtitle: "Trunk control, bracing, rotation control, and sport transfer.",
    },
    full: {
      label: "Full body",
      subtitle: "Balanced support without overcommitting to one region.",
    },
    upper: {
      label: "Upper body",
      subtitle: "Push, pull, shoulders, back, and upper-body strength.",
    },
  };
  return orderedIds.map((id) => ({
    id,
    ...copy[id],
    ...dayBodyFocusChoiceToBias(id),
    recommended: recommended.has(id),
  }));
}

export function defaultBodyFocusChoiceIdForDay(
  choices: DayBodyFocusChoice[],
  opts?: {
    slotIndex?: number;
  }
): DayBodyFocusChoiceId {
  const recommended = choices.filter((c) => c.recommended);
  if (recommended.length > 0) {
    return recommended[(opts?.slotIndex ?? 0) % recommended.length]!.id;
  }
  return choices[0]?.id ?? "full";
}

export function buildDayFocusPresetsForDay(opts: {
  manualPreferences: ManualPreferences;
  adaptiveSetup: AdaptiveSetup | null;
  /** From getBodyEmphasisDistribution — scheduled split for this session */
  targetBody: "Upper" | "Lower" | "Full";
  targetModifier: string[];
  specificBodyFocus?: SpecificBodyFocusKey[];
}): DayFocusPreset[] {
  const { manualPreferences, adaptiveSetup, targetBody, targetModifier, specificBodyFocus } = opts;
  const rankedGoals = manualPreferencesForSportWeekFocus(
    manualPreferences,
    adaptiveSetup
  ).primaryFocus.filter(Boolean);
  const sports =
    adaptiveSetup?.rankedSportSlugs?.filter((s): s is string => s != null && s !== "") ?? [];
  const sportSlugs = sports.map((s) => getCanonicalSportSlug(s));
  const out: DayFocusPreset[] = [];

  if (sportSlugs.length > 0) {
    sportSlugs.forEach((slug, idx) => {
      const name = sportDisplayName(slug);
      out.push({
        id: `sport_emphasis_${idx}`,
        label: name,
        subtitle: "",
      });
    });

    if (rankedGoals.length > 0) {
      rankedGoals.slice(0, 3).forEach((label, idx) => {
        out.push({
          id: `goal_emphasis_${idx}`,
          label,
          subtitle: "",
        });
      });
      const pct = adaptiveSetup?.sportVsGoalPct ?? 50;
      const goalPctLine = globalGoalMatchPctLine(manualPreferences);
      out.push({
        id: "balanced_split",
        label: "Balanced sport + goals",
        subtitle: `About ${pct}% sport / ${100 - pct}% goals; goal share uses your ${goalPctLine} settings.`,
      });
      return out;
    }

    if (sportSlugs.length > 1) {
      out.push({
        id: "balanced_sports",
        label: "Blend selected sports",
        subtitle: "Split support across your selected sports.",
      });
    }
    return out;
  }

  if (rankedGoals.length >= 2) {
    rankedGoals.slice(0, 3).forEach((label, idx) => {
      out.push({
        id: `goal_emphasis_${idx}`,
        label,
        subtitle: "",
      });
    });
    out.push({
      id: "balanced_goals",
      label: "Blend all ranked goals",
      subtitle: `Use your global goal percentages (${globalGoalMatchPctLine(manualPreferences)}).`,
    });
    return out;
  }

  if (rankedGoals.length === 1) {
    out.push({
      id: "single_goal",
      label: `${rankedGoals[0]} session`,
      subtitle: "Full session aligned to your focus.",
    });
    return out;
  }

  out.push({
    id: "default",
    label: "Standard session",
    subtitle: bodyFocusLineFromBias({ targetBody, targetModifier, specificBodyFocus }),
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
          // Dedicated sport day: sport only (no goal blend).
          sport_weight: 1,
        },
      };
    }

    const goalIdx = parseIndexedPresetId(presetId, "goal_emphasis_", "goal_first");
    if (ranked.length > 0 && goalIdx != null && goalIdx >= 0 && goalIdx < ranked.length) {
      return {
        primaryFocus: [ranked[goalIdx]!],
        sportGoalContext: {
          // Dedicated goal day: that goal only (no sport blend).
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
          primaryFocus: [ranked[idx]!],
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
 * Default when opening the planner:
 * - dedicate_days → that day’s assigned goal (exclusive)
 * - blend → balanced mix when available
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
  const balanced =
    presets.find((p) => p.id === "balanced_goals") ??
    presets.find((p) => p.id === "balanced_split") ??
    presets.find((p) => p.id === "balanced_sports");
  if (balanced) return balanced.id;
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
  /**
   * When true, the day pick replaces earlier page goals for this session —
   * callers must not fall back to the full ranked goal list.
   */
  exclusive: boolean;
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

  const gw = resolved.sportGoalContext?.goal_weights;
  const sportWeight = resolved.sportGoalContext?.sport_weight;
  const exclusiveGoal = isExclusiveGoalWeightTriplet(gw);
  const exclusiveSport = isExclusiveSportWeight(sportWeight, gw);
  const exclusive = exclusiveGoal || exclusiveSport;

  let orderedGoalSlugs: string[];
  if (exclusiveSport) {
    orderedGoalSlugs = [];
  } else if (exclusiveGoal) {
    orderedGoalSlugs = slugOrder;
  } else {
    for (const slug of rankedGoalSlugs) {
      if (!slugOrder.includes(slug)) slugOrder.push(slug);
    }
    orderedGoalSlugs = slugOrder.length > 0 ? slugOrder : rankedGoalSlugs;
  }

  let goalWeightsPct: [number, number, number] = [...fallbackGoalWeightsPct];
  if (gw && gw.length > 0) {
    const pcts = gw.map((w) => Math.round(w * 100));
    goalWeightsPct = [
      pcts[0] ?? fallbackGoalWeightsPct[0],
      pcts[1] ?? fallbackGoalWeightsPct[1],
      pcts[2] ?? fallbackGoalWeightsPct[2],
    ];
  } else if (exclusiveSport) {
    goalWeightsPct = [0, 0, 0];
  }

  return {
    focusLabels,
    orderedGoalSlugs,
    goalWeightsPct,
    exclusive,
    sportWeightOverride: sportWeight,
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

export type WeekDayFocusSummaryDisplay = {
  label: string;
  subtitle?: string | null;
};

/** Normalize preset subtitles for summary cards (omit empty; strip legacy body prefix). */
export function summarizePresetSubtitle(subtitle: string): string | null {
  const trimmed = subtitle.trim();
  if (!trimmed) return null;
  const dash = trimmed.indexOf(" — ");
  const text = (dash >= 0 ? trimmed.slice(dash + 3) : trimmed).trim();
  return text || null;
}

/**
 * Shared sport/goal priority explanation shown once above the preset list.
 */
export function sportGoalPrioritySectionNote(
  manualPreferences: ManualPreferences,
  adaptiveSetup: AdaptiveSetup | null
): string | null {
  const rankedGoals = manualPreferencesForSportWeekFocus(
    manualPreferences,
    adaptiveSetup
  ).primaryFocus.filter(Boolean);
  const sports =
    adaptiveSetup?.rankedSportSlugs?.filter((s): s is string => s != null && s !== "") ?? [];

  if (sports.length > 0 && rankedGoals.length > 0) {
    return "What you pick for a day is exclusive for that day — it replaces the goals from earlier pages. Balanced options mix sport and goals using your global settings.";
  }
  if (rankedGoals.length >= 2) {
    return "What you pick for a day is exclusive for that day — it replaces the goals from earlier pages. Balanced options use your global goal match %.";
  }
  if (sports.length > 1) {
    return "What you pick for a day is exclusive for that day. Or choose blend to mix your selected sports.";
  }
  return null;
}

/** True when presets include per-goal emphasis choices (shared section note applies). */
export function presetsIncludeGoalEmphasis(presets: DayFocusPreset[]): boolean {
  return presets.some((p) => p.id.startsWith("goal_emphasis_"));
}

/** Build sport/goal priority line for week overview cards (goals only — body is a separate row). */
export function buildPriorityFocusSummary(
  preset: WeekDayFocusSummaryDisplay | null | undefined,
  fallback: { displayTitle?: string; workoutFocus?: string[] }
): WeekDayFocusSummaryDisplay | null {
  if (preset?.label) {
    return {
      label: preset.label,
      subtitle: preset.subtitle ? summarizePresetSubtitle(preset.subtitle) : null,
    };
  }
  const fromTitle = fallback.displayTitle?.split(" - ")[0]?.trim();
  const fromFocus = fallback.workoutFocus?.filter(Boolean).join(" + ");
  const label = fromTitle || fromFocus;
  if (!label) return null;
  return { label };
}

/** Build body focus line for week overview cards. */
export function buildBodyFocusSummary(
  choice: WeekDayFocusSummaryDisplay | null | undefined,
  fallback?: {
    targetBody?: string;
    targetModifier?: string[];
    specificBodyFocus?: readonly string[];
  }
): WeekDayFocusSummaryDisplay | null {
  if (choice?.label) {
    return {
      label: choice.label,
      subtitle: choice.subtitle?.trim() || null,
    };
  }
  if (!fallback?.targetBody) return null;
  const mod = fallback.targetModifier?.filter(Boolean) ?? [];
  const choiceId = bodyChoiceIdForBias(
    fallback.targetBody as "Upper" | "Lower" | "Full",
    fallback.specificBodyFocus
  );
  const label = choiceId === "core" ? "Core" : `${fallback.targetBody} body`;
  return {
    label,
    subtitle: mod.length > 0 ? mod.join(" · ") : null,
  };
}

const DEFAULT_WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Card title for per-day focus picker — weekday + body emphasis, no calendar date. */
export function buildGymDayFocusCardLabel(
  dow: number,
  slotIndex: number,
  targetBody: string,
  targetModifier: string[] = [],
  specificBodyFocus?: readonly string[],
  weekdayLabels: readonly string[] = DEFAULT_WEEKDAY_LABELS
): string {
  const dayLabel = weekdayLabels[dow] ?? `Gym day ${slotIndex + 1}`;
  const emphasis = bodyFocusEmphasisLabel({
    targetBody: targetBody as "Upper" | "Lower" | "Full",
    targetModifier,
    specificBodyFocus,
  });
  return `${dayLabel} · ${emphasis}`;
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
