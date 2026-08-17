/**
 * Per-day session focus presets for weekly manual generation.
 * Maps UI choices → SportGoalContext (sport vs goal weights) + optional primaryFocus reorder.
 */

import type { AdaptiveSetup } from "../context/appStateModel";
import type {
  ManualPreferences,
  SpecificBodyFocusKey,
  WeeklyBodyFocusMode,
} from "./types";
import type { SportGoalContext } from "./dailyGeneratorAdapter";
import { getCanonicalSportSlug } from "../data/sportSubFocus/canonicalSportSlug";
import { getSportDefinition } from "../data/sportSubFocus";
import {
  canonicalizePrimaryFocusLabels,
  PRIMARY_FOCUS_TO_GOAL_SLUG,
} from "./preferencesConstants";
import { resolveSubFocusSlugFromDisplayName } from "./subFocusBodyRegion";
import {
  matchingSubFocusNamesForBodyPicks,
  recommendedBodyChoiceIdsFromSubFocusPrefs,
} from "./subGoalSplitCoverage";

export type DayFocusPreset = {
  id: string;
  label: string;
  /** Short line shown under the title */
  subtitle: string;
};

/** Region / Pattern / Muscle day-body choice ids used by the week focus planner. */
export type DayBodyFocusChoiceId =
  | "upper"
  | "lower"
  | "full"
  | "core"
  | "push"
  | "pull"
  | "legs"
  | "chest"
  | "back"
  | "shoulders"
  | "arms"
  | "glutes";

export type DayBodyFocusChoice = {
  id: DayBodyFocusChoiceId;
  label: string;
  subtitle: string;
  targetBody: "Upper" | "Lower" | "Full";
  targetModifier: string[];
  specificBodyFocus?: SpecificBodyFocusKey[];
  recommended?: boolean;
};

/**
 * Goals that reinforce Pattern/Muscle days via hypertrophy sub-focus tags
 * when Build Muscle / Body Recomp are among primary goals.
 * The Region | Pattern | Muscle control itself is always available for any goal
 * (and sport weeks).
 */
export const WEEKLY_BODY_FOCUS_MODE_UNLOCK_GOALS = [
  "Build Muscle (Hypertrophy)",
  "Body Recomp (fat loss & muscle gain)",
  "Body Recomposition",
] as const;

/** Always true — Pattern/Muscle are available for sport and goal week planning. */
export function isWeeklyBodyFocusModeUnlocked(
  _primaryFocus?: readonly string[] | null | undefined
): boolean {
  return true;
}

export function resolveWeeklyBodyFocusMode(
  mode: WeeklyBodyFocusMode | null | undefined,
  _primaryFocus?: readonly string[] | null | undefined
): WeeklyBodyFocusMode {
  return mode ?? "region";
}

/** True when day prefs should inject hypertrophy muscle sub-focus for this choice. */
export function shouldApplyHypertrophySubFocusForBodyChoice(
  primaryFocus: readonly string[] | null | undefined
): boolean {
  if (!primaryFocus?.length) return false;
  return primaryFocus.some((g) =>
    (WEEKLY_BODY_FOCUS_MODE_UNLOCK_GOALS as readonly string[]).includes(g)
  );
}

const PATTERN_CHOICE_IDS: DayBodyFocusChoiceId[] = ["push", "pull", "legs", "full", "core"];
const MUSCLE_CHOICE_IDS: DayBodyFocusChoiceId[] = [
  "chest",
  "back",
  "shoulders",
  "arms",
  "legs",
  "glutes",
  "full",
  "core",
];

/** Dedicated split days for auto-recommendation (no core-only day; full is leftover filler). */
const REGION_SPLIT_IDS: DayBodyFocusChoiceId[] = ["upper", "lower"];
const PATTERN_SPLIT_IDS: DayBodyFocusChoiceId[] = ["push", "pull", "legs"];
const MUSCLE_SPLIT_IDS: DayBodyFocusChoiceId[] = [
  "chest",
  "back",
  "shoulders",
  "arms",
  "legs",
  "glutes",
];

export function dedicatedSplitIdsForMode(mode: WeeklyBodyFocusMode): DayBodyFocusChoiceId[] {
  if (mode === "pattern") return [...PATTERN_SPLIT_IDS];
  if (mode === "muscle") return [...MUSCLE_SPLIT_IDS];
  return [...REGION_SPLIT_IDS];
}

/**
 * Spread a split across gym days: use as many unique dedicated days as will fit,
 * complete extra full rotations when days divide evenly, and fill leftover days
 * with full body. Never assigns core as its own day. A single gym day is full body.
 */
export function distributeBodySplitAcrossDays(
  split: readonly DayBodyFocusChoiceId[],
  gymDays: number
): DayBodyFocusChoiceId[] {
  const n = Math.max(0, gymDays);
  if (n === 0) return [];
  const pool = [...new Set(split.filter((id) => id !== "core" && id !== "full"))];
  if (pool.length === 0 || n === 1) {
    return Array.from({ length: n }, () => "full" as const);
  }
  if (n <= pool.length) return pool.slice(0, n);
  const rotations = Math.floor(n / pool.length);
  const remainder = n % pool.length;
  const out: DayBodyFocusChoiceId[] = [];
  for (let r = 0; r < rotations; r++) out.push(...pool);
  for (let i = 0; i < remainder; i++) out.push("full");
  return out;
}

/** Ids available in each week/day body-focus vocabulary. */
export function dayBodyChoiceIdsForMode(
  mode: WeeklyBodyFocusMode
): DayBodyFocusChoiceId[] {
  if (mode === "pattern") return [...PATTERN_CHOICE_IDS];
  if (mode === "muscle") return [...MUSCLE_CHOICE_IDS];
  return ["full", "lower", "core", "upper"];
}

/** User-facing copy for region / pattern / muscle day body picks. */
export const BODY_CHOICE_COPY: Record<DayBodyFocusChoiceId, { label: string; subtitle: string }> = {
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
  push: {
    label: "Push",
    subtitle: "Chest, shoulders, and triceps-dominant pressing.",
  },
  pull: {
    label: "Pull",
    subtitle: "Back and biceps-dominant pulling.",
  },
  legs: {
    label: "Legs",
    subtitle: "Quads, glutes, hamstrings, and lower-body volume.",
  },
  chest: {
    label: "Chest",
    subtitle: "Pecs and press emphasis with supporting accessories.",
  },
  back: {
    label: "Back",
    subtitle: "Lats, upper back, and pulling accessories.",
  },
  shoulders: {
    label: "Shoulders",
    subtitle: "Delts and overhead pressing emphasis.",
  },
  arms: {
    label: "Arms",
    subtitle: "Biceps, triceps, and arm accessories.",
  },
  glutes: {
    label: "Glutes",
    subtitle: "Hip extension and glute-dominant lower work.",
  },
};

/** Maps a day body choice to hypertrophy sub-focus slugs for Build Muscle / Body Recomp. */
export function muscleSubFocusSlugsForBodyChoice(
  choiceId: DayBodyFocusChoiceId
): string[] {
  switch (choiceId) {
    case "chest":
      return ["chest"];
    case "back":
    case "pull":
      return ["back"];
    case "shoulders":
      return ["shoulders"];
    case "arms":
      return ["arms"];
    case "glutes":
      return ["glutes"];
    case "legs":
    case "lower":
      return ["legs"];
    case "push":
      return ["chest", "shoulders"];
    case "core":
      return ["core"];
    default:
      return [];
  }
}

export function applyBodyChoicesSubFocusToPrefs(
  prefs: ManualPreferences,
  choiceIds: readonly DayBodyFocusChoiceId[]
): ManualPreferences {
  const slugs = [
    ...new Set(choiceIds.flatMap((id) => muscleSubFocusSlugsForBodyChoice(id))),
  ];
  if (slugs.length === 0) return prefs;
  const next = { ...prefs.subFocusByGoal };
  let changed = false;
  for (const goalLabel of prefs.primaryFocus) {
    const entry = GOAL_SUB_FOCUS_OPTIONS_LABELS[goalLabel];
    if (!entry) continue;
    const names = slugs
      .map((slug) => entry.find((s) => s.slug === slug)?.name)
      .filter((n): n is string => Boolean(n));
    if (names.length === 0) continue;
    const prev = next[goalLabel] ?? [];
    const merged = [...new Set([...names])];
    if (prev.length === merged.length && prev.every((n, i) => n === merged[i])) continue;
    next[goalLabel] = merged;
    changed = true;
  }
  if (!changed) return prefs;
  return { ...prefs, subFocusByGoal: next };
}

/**
 * When weekly mode is pattern/muscle, reinforce the day's muscle slug(s) onto
 * Build Muscle / Body Recomp entries in subFocusByGoal for that session.
 */
export function applyBodyChoiceSubFocusToPrefs(
  prefs: ManualPreferences,
  choiceId: DayBodyFocusChoiceId
): ManualPreferences {
  return applyBodyChoicesSubFocusToPrefs(prefs, [choiceId]);
}

/** Display names for unlock goals — resolved lazily to avoid circular imports at top. */
const GOAL_SUB_FOCUS_OPTIONS_LABELS: Record<string, { slug: string; name: string }[]> = {
  "Build Muscle (Hypertrophy)": [
    { slug: "glutes", name: "Glutes" },
    { slug: "back", name: "Back" },
    { slug: "chest", name: "Chest" },
    { slug: "arms", name: "Arms" },
    { slug: "shoulders", name: "Shoulders" },
    { slug: "legs", name: "Legs" },
    { slug: "core", name: "Core" },
  ],
  "Body Recomp (fat loss & muscle gain)": [
    { slug: "glutes", name: "Glutes" },
    { slug: "back", name: "Back" },
    { slug: "chest", name: "Chest" },
    { slug: "arms", name: "Arms" },
    { slug: "shoulders", name: "Shoulders" },
    { slug: "legs", name: "Legs" },
    { slug: "core", name: "Core" },
  ],
  "Body Recomposition": [
    { slug: "glutes", name: "Glutes" },
    { slug: "back", name: "Back" },
    { slug: "chest", name: "Chest" },
    { slug: "arms", name: "Arms" },
    { slug: "shoulders", name: "Shoulders" },
    { slug: "legs", name: "Legs" },
    { slug: "core", name: "Core" },
  ],
};

/**
 * Auto day sequence for Pattern mode (PPL-ish).
 * Include as many of Push/Pull/Legs as days allow; complete extra PPL rotations
 * when days divide evenly; leftover days are Full body (never Core).
 */
export function getPatternBodyFocusDistribution(
  gymDaysPerWeek: number
): DayBodyFocusChoiceId[] {
  const n = Math.max(1, Math.min(7, gymDaysPerWeek));
  return distributeBodySplitAcrossDays(PATTERN_SPLIT_IDS, n);
}

/**
 * Auto day sequence for Muscle mode (bro-ish rotation).
 * Include as many of Chest/Back/Shoulders/Arms/Legs/Glutes as days allow;
 * leftover days are Full body (never Core).
 */
export function getMuscleBodyFocusDistribution(
  gymDaysPerWeek: number
): DayBodyFocusChoiceId[] {
  const n = Math.max(1, Math.min(7, gymDaysPerWeek));
  return distributeBodySplitAcrossDays(MUSCLE_SPLIT_IDS, n);
}

/**
 * Default body chip implied by a sub-goal before mode mapping.
 * Strength lifts map to Region (upper/lower), not Pattern push/pull — so selecting
 * Upper stays Upper while Bench still rides on that day.
 */
const SUB_FOCUS_SLUG_TO_BODY: Record<string, DayBodyFocusChoiceId> = {
  glutes: "glutes",
  chest: "chest",
  back: "back",
  shoulders: "shoulders",
  arms: "arms",
  legs: "legs",
  core: "core",
  push: "push",
  pull: "pull",
  squat: "lower",
  deadlift_hinge: "lower",
  bench_press: "upper",
  overhead_press: "upper",
  pull_ups: "upper",
  push_ups: "upper",
  dips: "upper",
  handstand: "upper",
  front_lever_advanced: "upper",
  legs_pistol: "lower",
  upper: "upper",
  lower: "lower",
  hips: "lower",
  knees: "lower",
  ankles: "lower",
  t_spine: "upper",
  lower_back: "core",
  elbows: "upper",
  wrists: "upper",
  shoulder_health: "upper",
  elbow_wrist_health: "upper",
  knee_health: "lower",
  hip_health: "lower",
  ankle_foot_health: "lower",
  back_spine_health: "core",
  upper_body_power: "upper",
  lower_body_power_plyos: "lower",
  speed_sprint: "lower",
  vertical_jump: "lower",
  olympic_triple_extension: "full",
  full_body: "full",
  full_body_calisthenics: "full",
};

export function bodyChoiceIdFromSubFocusSlug(
  slug: string | null | undefined
): DayBodyFocusChoiceId | null {
  if (!slug) return null;
  const key = slug.toLowerCase().replace(/\s/g, "_").replace(/-/g, "_");
  return SUB_FOCUS_SLUG_TO_BODY[key] ?? null;
}

/** Body-choice ids implied by the user's selected sub-goals (not yet mapped to a week mode). */
export function bodyChoiceIdsFromSubFocusPrefs(
  prefs: ManualPreferences
): DayBodyFocusChoiceId[] {
  const out: DayBodyFocusChoiceId[] = [];
  for (const [goalLabel, names] of Object.entries(prefs.subFocusByGoal ?? {})) {
    for (const name of names ?? []) {
      const slug = resolveSubFocusSlugFromDisplayName(goalLabel, name);
      const id = bodyChoiceIdFromSubFocusSlug(slug);
      if (id && !out.includes(id)) out.push(id);
    }
  }
  return out;
}

export function getBodyFocusDistributionForMode(
  mode: WeeklyBodyFocusMode,
  gymDaysPerWeek: number,
  _regionFallback?: Array<{
    targetBody: "Upper" | "Lower" | "Full";
    targetModifier: string[];
    specificBodyFocus?: SpecificBodyFocusKey[];
  }>
): DayBodyFocusChoiceId[] {
  if (mode === "pattern") return getPatternBodyFocusDistribution(gymDaysPerWeek);
  if (mode === "muscle") return getMuscleBodyFocusDistribution(gymDaysPerWeek);
  const n = Math.max(1, Math.min(7, gymDaysPerWeek));
  return distributeBodySplitAcrossDays(REGION_SPLIT_IDS, n);
}

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
  const choiceId = bodyChoiceIdForBias(bias.targetBody, bias.specificBodyFocus, bias.targetModifier);
  if (choiceId === "upper" || choiceId === "lower" || choiceId === "full") {
    return bodyLine(bias.targetBody, bias.targetModifier ?? []);
  }
  return BODY_CHOICE_COPY[choiceId]?.label ?? choiceId;
}

/** Short body emphasis for day headers (e.g. "Upper", "Core", "Chest", "Push"). */
export function bodyFocusEmphasisLabel(bias: {
  targetBody: "Upper" | "Lower" | "Full";
  targetModifier?: string[];
  specificBodyFocus?: readonly string[];
}): string {
  const choiceId = bodyChoiceIdForBias(bias.targetBody, bias.specificBodyFocus, bias.targetModifier);
  if (
    choiceId === "core" ||
    choiceId === "push" ||
    choiceId === "pull" ||
    choiceId === "legs" ||
    choiceId === "chest" ||
    choiceId === "back" ||
    choiceId === "shoulders" ||
    choiceId === "arms" ||
    choiceId === "glutes"
  ) {
    return BODY_CHOICE_COPY[choiceId]?.label ?? choiceId;
  }
  const mod =
    (bias.targetModifier?.length ?? 0) > 0
      ? ` (${bias.targetModifier!.join(" · ")})`
      : "";
  return `${bias.targetBody}${mod}`;
}

/** Opposites that should not share a day. Upper + Lower is Full body, not a combo. */
const INCOMPATIBLE_BODY_PAIRS: ReadonlyArray<readonly [DayBodyFocusChoiceId, DayBodyFocusChoiceId]> = [
  ["push", "pull"],
  ["upper", "lower"],
];

export function canCombineDayBodyFocus(
  a: DayBodyFocusChoiceId,
  b: DayBodyFocusChoiceId
): boolean {
  if (a === b) return false;
  if (a === "full" || b === "full") return false;
  return !INCOMPATIBLE_BODY_PAIRS.some(
    ([x, y]) => (a === x && b === y) || (a === y && b === x)
  );
}

export function toggleDayBodyFocusPick(
  current: readonly DayBodyFocusChoiceId[],
  id: DayBodyFocusChoiceId
): DayBodyFocusChoiceId[] {
  if (current.includes(id)) {
    const next = current.filter((x) => x !== id);
    return next.length > 0 ? next : [...current];
  }
  if (current.length >= 2) return [id];
  if (current.length === 1 && !canCombineDayBodyFocus(current[0]!, id)) return [id];
  return [...current, id];
}

export function conflictBodyIdForPicks(
  picks: readonly DayBodyFocusChoiceId[]
): DayBodyFocusChoiceId {
  if (picks.length === 0) return "full";
  if (picks.length === 1) return picks[0]!;
  const regions = new Set(
    picks.map((id) => {
      if (id === "lower" || id === "legs" || id === "glutes") return "lower";
      if (id === "core") return "core";
      if (id === "full") return "full";
      return "upper";
    })
  );
  if (regions.size > 1) return "full";
  return picks[0]!;
}

export function encodeDayBodyFocusPicks(ids: readonly DayBodyFocusChoiceId[]): string {
  return ids.filter(Boolean).join(",");
}

const ALL_DAY_BODY_IDS: ReadonlySet<string> = new Set<DayBodyFocusChoiceId>([
  "upper",
  "lower",
  "full",
  "core",
  "push",
  "pull",
  "legs",
  "chest",
  "back",
  "shoulders",
  "arms",
  "glutes",
]);

export function isDayBodyFocusChoiceId(value: string | null | undefined): value is DayBodyFocusChoiceId {
  return Boolean(value && ALL_DAY_BODY_IDS.has(value));
}

export function decodeDayBodyFocusPicks(raw: string | null | undefined): DayBodyFocusChoiceId[] {
  if (!raw?.trim()) return [];
  const seen = new Set<DayBodyFocusChoiceId>();
  const out: DayBodyFocusChoiceId[] = [];
  for (const part of raw.split(/[+,]/)) {
    const id = part.trim();
    if (!isDayBodyFocusChoiceId(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out.slice(0, 2);
}

export function dayBodyFocusChoicesToBias(
  ids: readonly DayBodyFocusChoiceId[]
): {
  targetBody: "Upper" | "Lower" | "Full";
  targetModifier: string[];
  specificBodyFocus?: SpecificBodyFocusKey[];
} {
  const unique = decodeDayBodyFocusPicks(encodeDayBodyFocusPicks(ids));
  if (unique.length === 0) return { targetBody: "Full", targetModifier: [] };
  if (unique.length === 1) return dayBodyFocusChoiceToBias(unique[0]!);

  const biases = unique.map((id) => dayBodyFocusChoiceToBias(id));
  const bodies = new Set(biases.map((b) => b.targetBody));
  const specificBodyFocus = [
    ...new Set(biases.flatMap((b) => b.specificBodyFocus ?? [])),
  ] as SpecificBodyFocusKey[];
  const modifiers = [...new Set(biases.flatMap((b) => b.targetModifier))];
  const targetBody = bodies.size > 1 ? "Full" : [...bodies][0]!;
  const targetModifier =
    targetBody === "Full"
      ? modifiers.filter((m) => m !== "Push" && m !== "Pull")
      : modifiers;
  return {
    targetBody,
    targetModifier,
    specificBodyFocus: specificBodyFocus.length > 0 ? specificBodyFocus : undefined,
  };
}

export function bodyFocusEmphasisLabelForPicks(
  ids: readonly DayBodyFocusChoiceId[]
): string {
  const unique = decodeDayBodyFocusPicks(encodeDayBodyFocusPicks(ids));
  if (unique.length === 0) return "Full";
  return unique.map((id) => BODY_CHOICE_COPY[id]?.label ?? id).join(" + ");
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
    case "push":
      return { targetBody: "Upper", targetModifier: ["Push"], specificBodyFocus: ["push"] };
    case "pull":
      return { targetBody: "Upper", targetModifier: ["Pull"], specificBodyFocus: ["pull"] };
    case "legs":
      return { targetBody: "Lower", targetModifier: [], specificBodyFocus: ["legs"] };
    case "chest":
      return { targetBody: "Upper", targetModifier: ["Push"], specificBodyFocus: ["chest"] };
    case "back":
      return { targetBody: "Upper", targetModifier: ["Pull"], specificBodyFocus: ["back"] };
    case "shoulders":
      return { targetBody: "Upper", targetModifier: ["Push"], specificBodyFocus: ["shoulders"] };
    case "arms":
      return { targetBody: "Upper", targetModifier: [], specificBodyFocus: ["arms"] };
    case "glutes":
      return { targetBody: "Lower", targetModifier: ["Posterior"], specificBodyFocus: ["glutes"] };
    case "full":
    default:
      return { targetBody: "Full", targetModifier: [] };
  }
}

/**
 * Prefer specific muscle/pattern keys when present; else region from targetBody.
 * Modifiers alone (Upper + Push) stay as region "upper" so Region-mode titles
 * keep "Upper (Push)" rather than collapsing to a Pattern "Push" day.
 */
export function bodyChoiceIdForBias(
  targetBody: "Upper" | "Lower" | "Full",
  specificBodyFocus?: readonly string[],
  _targetModifier?: readonly string[]
): DayBodyFocusChoiceId {
  const specific = specificBodyFocus ?? [];
  const priority: DayBodyFocusChoiceId[] = [
    "chest",
    "arms",
    "shoulders",
    "back",
    "glutes",
    "legs",
    "push",
    "pull",
    "core",
  ];
  for (const id of priority) {
    if (specific.includes(id)) return id;
  }
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
  for (const id of bodyChoiceIdsFromSubFocusPrefs(opts.manualPreferences)) {
    const region = id === "glutes" || id === "legs" ? "lower"
      : id === "core" ? "core"
      : id === "full" ? "full"
      : "upper";
    if (region === "lower") ids.add("lower");
    else if (region === "core") ids.add("core");
    else if (region === "full") ids.add("full");
    else ids.add("upper");
  }
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

export function mapBodyChoiceToModeVocab(
  id: DayBodyFocusChoiceId,
  mode: WeeklyBodyFocusMode
): DayBodyFocusChoiceId {
  const allowed = dayBodyChoiceIdsForMode(mode);
  if (allowed.includes(id)) return id;

  if (mode === "region") {
    if (
      id === "push" ||
      id === "pull" ||
      id === "chest" ||
      id === "back" ||
      id === "shoulders" ||
      id === "arms"
    ) {
      return "upper";
    }
    if (id === "legs" || id === "glutes") return "lower";
    return id;
  }
  if (mode === "pattern") {
    // Muscle → containing pattern. Do not invent Push from Upper (Upper also contains Pull).
    if (id === "chest" || id === "shoulders" || id === "arms") return "push";
    if (id === "back") return "pull";
    if (id === "glutes" || id === "lower") return "legs";
    return id;
  }
  // Muscle: never invent Chest from Upper/Push or Back from Pull. Callers drop ids
  // that are not in the muscle vocabulary.
  return id;
}

export function buildDayBodyFocusChoicesForDay(opts: {
  manualPreferences: ManualPreferences;
  adaptiveSetup: AdaptiveSetup | null;
  slotIndex: number;
  fallbackTargetBody: "Upper" | "Lower" | "Full";
  fallbackTargetModifier?: string[];
  /** Weekly body-focus vocabulary; defaults to region. */
  mode?: WeeklyBodyFocusMode;
  /** When set, mark this id recommended (from mode template). */
  templateChoiceId?: DayBodyFocusChoiceId;
  /** Extra ids to mark recommended (from the user's first-page sub-goals). */
  userRecommendedIds?: DayBodyFocusChoiceId[];
}): DayBodyFocusChoice[] {
  const mode = resolveWeeklyBodyFocusMode(opts.mode);
  const allowed = dayBodyChoiceIdsForMode(mode);
  const fromUser = (
    opts.userRecommendedIds ??
    recommendedBodyChoiceIdsFromSubFocusPrefs(opts.manualPreferences, mode)
  ).filter((id) => allowed.includes(id));

  const annotate = (id: DayBodyFocusChoiceId, base: DayBodyFocusChoice): DayBodyFocusChoice => {
    const covered = matchingSubFocusNamesForBodyPicks(opts.manualPreferences, [id], {
      includeNonSplitSensitive: false,
      max: 3,
    });
    if (covered.length === 0) return base;
    const coverLine = covered.join(" · ");
    return {
      ...base,
      subtitle: `${coverLine}. ${base.subtitle}`,
    };
  };

  if (mode === "pattern" || mode === "muscle") {
    const ids = mode === "pattern" ? PATTERN_CHOICE_IDS : MUSCLE_CHOICE_IDS;
    const fallbackId = mode === "pattern" ? "push" : "chest";
    return ids.map((id) =>
      annotate(id, {
        id,
        ...BODY_CHOICE_COPY[id],
        ...dayBodyFocusChoiceToBias(id),
        recommended:
          opts.templateChoiceId === id ||
          fromUser.includes(id) ||
          (!opts.templateChoiceId && fromUser.length === 0 && id === fallbackId),
      })
    );
  }

  const recommendedIds = recommendedBodyChoiceIds(opts);
  const recommended = new Set([
    ...recommendedIds,
    ...fromUser.filter(
      (id) => id === "upper" || id === "lower" || id === "full" || id === "core"
    ),
  ]);
  const fallbackId = bodyChoiceIdForBias(opts.fallbackTargetBody);
  const all: DayBodyFocusChoiceId[] = ["full", "lower", "core", "upper"];
  const orderedIds = [...recommendedIds, fallbackId, ...all].filter(
    (id, idx, arr): id is DayBodyFocusChoiceId => arr.indexOf(id) === idx
  );
  return orderedIds.map((id) =>
    annotate(id, {
      id,
      ...BODY_CHOICE_COPY[id],
      ...dayBodyFocusChoiceToBias(id),
      recommended: recommended.has(id),
    })
  );
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
  /** Day body chips — used to surface matching sub-goals on goal presets. */
  bodyChoiceIds?: readonly DayBodyFocusChoiceId[];
}): DayFocusPreset[] {
  const {
    manualPreferences,
    adaptiveSetup,
    targetBody,
    targetModifier,
    specificBodyFocus,
    bodyChoiceIds,
  } = opts;
  const bodyIds =
    bodyChoiceIds?.length
      ? bodyChoiceIds
      : [
          bodyChoiceIdForBias(
            targetBody,
            specificBodyFocus,
            targetModifier
          ),
        ];
  const rankedGoals = manualPreferencesForSportWeekFocus(
    manualPreferences,
    adaptiveSetup
  ).primaryFocus.filter(Boolean);
  const sports =
    adaptiveSetup?.rankedSportSlugs?.filter((s): s is string => s != null && s !== "") ?? [];
  const sportSlugs = sports.map((s) => getCanonicalSportSlug(s));
  const out: DayFocusPreset[] = [];

  const subLineForGoal = (goalLabel: string): string => {
    const names = matchingSubFocusNamesForBodyPicks(manualPreferences, bodyIds, {
      goalLabel,
      max: 3,
    });
    return names.join(" · ");
  };

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
          subtitle: subLineForGoal(label),
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
        subtitle: subLineForGoal(label),
      });
    });
    const allSubs = matchingSubFocusNamesForBodyPicks(manualPreferences, bodyIds, { max: 4 });
    out.push({
      id: "balanced_goals",
      label: "Blend all ranked goals",
      subtitle:
        allSubs.length > 0
          ? allSubs.join(" · ")
          : `Use your global goal percentages (${globalGoalMatchPctLine(manualPreferences)}).`,
    });
    return out;
  }

  if (rankedGoals.length === 1) {
    const only = rankedGoals[0]!;
    const subs = subLineForGoal(only);
    out.push({
      id: "single_goal",
      label: `${only} session`,
      subtitle: subs || "Full session aligned to your focus.",
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
  return canonicalizePrimaryFocusLabels(goalSlugs);
}

/**
 * Goals for week day presets: Manual primaryFocus, adaptive ranked goals, and
 * any goal keys that still have sub-focus picks. Empty strings / informal labels
 * are canonicalized so hypertrophy + recovery always surface as day options.
 */
export function resolveWeekFocusGoalLabels(
  manualPreferences: ManualPreferences,
  adaptiveSetup: AdaptiveSetup | null
): string[] {
  const fromPrefs = canonicalizePrimaryFocusLabels(manualPreferences.primaryFocus);
  const rankedSlugs =
    adaptiveSetup?.rankedGoals?.filter((g): g is string => g != null && g !== "") ?? [];
  const fromAdaptive = primaryFocusLabelsFromGoalSlugs(rankedSlugs);
  const fromSubFocus = canonicalizePrimaryFocusLabels(
    Object.entries(manualPreferences.subFocusByGoal ?? {})
      .filter(([, names]) => (names?.length ?? 0) > 0)
      .map(([label]) => label)
  );
  const out: string[] = [];
  for (const label of [...fromPrefs, ...fromAdaptive, ...fromSubFocus]) {
    if (!out.includes(label)) out.push(label);
  }
  return out;
}

/** Build ManualPreferences with primaryFocus from adaptive goals when labels are absent. */
export function manualPreferencesForSportWeekFocus(
  manualPreferences: ManualPreferences,
  adaptiveSetup: AdaptiveSetup | null
): ManualPreferences {
  const primaryFocus = resolveWeekFocusGoalLabels(manualPreferences, adaptiveSetup);
  return {
    ...manualPreferences,
    primaryFocus: primaryFocus.length > 0 ? primaryFocus : manualPreferences.primaryFocus.filter(Boolean),
  };
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
  fallback: {
    displayTitle?: string;
    workoutFocus?: string[];
    /** Day-matched sub-goals (e.g. Bench / Press) shown under the goal label. */
    subFocusNames?: string[];
  }
): WeekDayFocusSummaryDisplay | null {
  const subLine = (fallback.subFocusNames ?? [])
    .map((n) => n.trim())
    .filter(Boolean)
    .filter((n, i, arr) => arr.indexOf(n) === i)
    .slice(0, 3)
    .join(" · ");

  if (preset?.label) {
    const fromPreset = preset.subtitle ? summarizePresetSubtitle(preset.subtitle) : null;
    return {
      label: preset.label,
      subtitle: fromPreset || subLine || null,
    };
  }
  const fromTitle = fallback.displayTitle?.split(" - ")[0]?.trim();
  const fromFocus = fallback.workoutFocus?.filter(Boolean).join(" + ");
  const label = fromTitle || fromFocus;
  if (!label) return null;
  return { label, subtitle: subLine || undefined };
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
    fallback.specificBodyFocus,
    fallback.targetModifier
  );
  if (choiceId !== "upper" && choiceId !== "lower" && choiceId !== "full") {
    return {
      label: BODY_CHOICE_COPY[choiceId]?.label ?? choiceId,
      subtitle: null,
    };
  }
  return {
    label: `${fallback.targetBody} body`,
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
