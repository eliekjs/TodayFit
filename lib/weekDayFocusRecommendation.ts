/**
 * Translate first-page goals / sub-goals into recommended per-day focus
 * (a distinct body split per day + a featured goal, covering the week).
 */

import type { AdaptiveSetup } from "../context/appStateModel";
import { resolveSubFocusSlugFromDisplayName } from "./subFocusBodyRegion";
import {
  dayBodyChoiceCoversSubFocus,
  isSplitSensitiveSubFocusSlug,
  recommendedBodyChoiceIdsFromSubFocusPrefs,
} from "./subGoalSplitCoverage";
import type { ManualPreferences, WeeklyBodyFocusMode } from "./types";
import {
  BODY_CHOICE_COPY,
  bodyChoiceIdsFromSubFocusPrefs,
  buildDayFocusPresetsForDay,
  dedicatedSplitIdsForMode,
  distributeBodySplitAcrossDays,
  featuredPresetIdForWeekDay,
  mapBodyChoiceToModeVocab,
  resolveWeekFocusGoalLabels,
  resolveWeeklyBodyFocusMode,
  remapDayBodyPicksToMode,
  type DayBodyFocusChoiceId,
} from "./weekDaySessionFocus";

const MUSCLE_SUB_SLUGS = new Set([
  "glutes",
  "chest",
  "back",
  "shoulders",
  "arms",
  "legs",
  "core",
]);
/** True Pattern vocabulary only — strength lifts stay Region so Upper/Lower is kept (not collapsed to Push). */
const PATTERN_SUB_SLUGS = new Set(["push", "pull"]);

export type WeekDayFocusRecommendationDay = {
  bodyIds: DayBodyFocusChoiceId[];
  goalPresetId: string;
  goalLabel: string | null;
  subFocusByGoal?: Record<string, string[]>;
  summary: string;
};

export type WeekDayFocusRecommendation = {
  mode: WeeklyBodyFocusMode;
  days: WeekDayFocusRecommendationDay[];
};

/** Stable fingerprint so day picks re-seed when first-page filters change. */
export function weekFocusRecommendationSeed(opts: {
  manualPreferences: ManualPreferences;
  adaptiveSetup: AdaptiveSetup | null;
}): string {
  const prefs = opts.manualPreferences;
  const adaptive = opts.adaptiveSetup;
  return JSON.stringify({
    goals: prefs.primaryFocus ?? [],
    subs: prefs.subFocusByGoal ?? {},
    subPct: prefs.subFocusPctByGoal ?? {},
    mode: prefs.weeklyBodyFocusMode ?? null,
    rankedGoals: adaptive?.rankedGoals ?? null,
    sports: adaptive?.rankedSportSlugs ?? null,
    sportSubs: adaptive?.subFocusBySport ?? null,
  });
}

export function recommendWeeklyBodyFocusMode(
  prefs: ManualPreferences
): WeeklyBodyFocusMode {
  if (prefs.weeklyBodyFocusMode) return resolveWeeklyBodyFocusMode(prefs.weeklyBodyFocusMode);

  let muscle = 0;
  let pattern = 0;
  for (const [goalLabel, names] of Object.entries(prefs.subFocusByGoal ?? {})) {
    for (const name of names ?? []) {
      const slug = resolveSubFocusSlugFromDisplayName(goalLabel, name);
      if (!slug) continue;
      if (MUSCLE_SUB_SLUGS.has(slug)) muscle += 1;
      if (PATTERN_SUB_SLUGS.has(slug)) pattern += 1;
    }
  }
  if (muscle > 0 && muscle >= pattern) return "muscle";
  if (pattern > 0) return "pattern";
  return "region";
}

function shortGoalLabel(label: string): string {
  if (label.includes("Hypertrophy") || label.toLowerCase().includes("muscle")) return "Hypertrophy";
  if (label.toLowerCase().includes("recovery") || label.toLowerCase().includes("mobility")) {
    return "Recovery";
  }
  if (label.toLowerCase().includes("strength") && label.toLowerCase().includes("joint")) {
    return "Joint health";
  }
  if (label.toLowerCase().includes("strength")) return "Strength";
  if (label.toLowerCase().includes("endurance")) return "Endurance";
  if (label.toLowerCase().includes("recomp")) return "Recomp";
  if (label.toLowerCase().includes("athletic")) return "Athletic";
  if (label.toLowerCase().includes("calisthenics")) return "Calisthenics";
  return label;
}

function bodyUnitsForMode(
  prefs: ManualPreferences,
  mode: WeeklyBodyFocusMode
): DayBodyFocusChoiceId[] {
  const allowed = new Set(dedicatedSplitIdsForMode(mode));
  const out: DayBodyFocusChoiceId[] = [];
  for (const id of recommendedBodyChoiceIdsFromSubFocusPrefs(prefs, mode)) {
    if (id === "full" || id === "core") continue;
    if (!allowed.has(id)) continue;
    if (!out.includes(id)) out.push(id);
  }
  if (out.length > 0) return out;
  const raw = bodyChoiceIdsFromSubFocusPrefs(prefs);
  for (const id of raw) {
    const mapped = mapBodyChoiceToModeVocab(id, mode);
    if (mapped === "full" || mapped === "core") continue;
    if (!allowed.has(mapped)) continue;
    if (!out.includes(mapped)) out.push(mapped);
  }
  return out;
}

/**
 * Preselect a different split on each day. Prefer the user's body units first
 * (within upper and lower), then fill with the rest of the mode's split.
 * Muscle weeks interleave upper/lower. Leftover days are Full body — never Core.
 */
export function assignBodyPicksAcrossDays(
  units: readonly DayBodyFocusChoiceId[],
  gymDays: number,
  canonicalSplit: readonly DayBodyFocusChoiceId[]
): DayBodyFocusChoiceId[][] {
  const preferred = [...new Set(units.filter((id) => id !== "core" && id !== "full"))];
  const rest = canonicalSplit.filter(
    (id) => id !== "core" && id !== "full" && !preferred.includes(id)
  );
  return distributeBodySplitAcrossDays([...preferred, ...rest], gymDays).map((id) => [id]);
}

function goalIndicesForDays(
  goalCount: number,
  gymDays: number,
  weights: [number, number, number],
  dedicateDays: boolean
): number[] {
  const n = gymDays;
  if (goalCount <= 0) return Array.from({ length: n }, () => 0);
  if (!dedicateDays) {
    return Array.from({ length: n }, (_, i) => i % goalCount);
  }
  const total = weights[0] + weights[1] + weights[2] || 1;
  const n1 = Math.round(n * (weights[0] / total));
  const n2 = Math.min(n - n1, Math.round(n * (weights[1] / total)));
  const indices: number[] = [];
  for (let i = 0; i < n1; i++) indices.push(0);
  for (let i = 0; i < n2; i++) indices.push(Math.min(1, goalCount - 1));
  for (let i = n1 + n2; i < n; i++) indices.push(Math.min(2, goalCount - 1));
  // Guarantee every selected goal appears at least once when days allow it.
  for (let g = 0; g < Math.min(goalCount, n); g++) {
    if (!indices.includes(g)) indices[g % indices.length] = g;
  }
  return indices.slice(0, n);
}

function subFocusForDay(opts: {
  prefs: ManualPreferences;
  bodyIds: DayBodyFocusChoiceId[];
  featuredGoal: string | null;
  dedicateDays: boolean;
}): Record<string, string[]> | undefined {
  const all = opts.prefs.subFocusByGoal ?? {};
  const goals = opts.dedicateDays && opts.featuredGoal ? [opts.featuredGoal] : Object.keys(all);

  const next: Record<string, string[]> = {};
  let anyPatch = false;
  for (const goal of goals) {
    const names = all[goal] ?? [];
    if (names.length === 0) continue;
    let droppedSplitSensitive = false;
    const matched = names.filter((name) => {
      const slug = resolveSubFocusSlugFromDisplayName(goal, name);
      if (!slug) return true;
      if (isSplitSensitiveSubFocusSlug(slug)) {
        const covered = opts.bodyIds.some((id) => dayBodyChoiceCoversSubFocus(id, slug));
        if (!covered) droppedSplitSensitive = true;
        return covered;
      }
      // Non-body sub-goals (Zone 2, speed) stay on the featured goal's days
      // unless the day's split is a dedicated upper pattern (push/pull).
      const isBodyLike = MUSCLE_SUB_SLUGS.has(slug) || PATTERN_SUB_SLUGS.has(slug);
      if (isBodyLike) return false;
      if (goal !== opts.featuredGoal) return false;
      if (slug.includes("zone2") || slug.includes("aerobic")) {
        return opts.bodyIds.some(
          (id) => id === "full" || id === "lower" || id === "legs" || id === "glutes" || id === "core"
        );
      }
      return true;
    });
    const picked = matched.slice(0, 2);
    if (picked.length > 0) {
      next[goal] = picked;
      anyPatch = true;
    } else if (droppedSplitSensitive) {
      next[goal] = [];
      anyPatch = true;
    }
  }
  return anyPatch ? next : undefined;
}

function daySummary(opts: {
  goalLabel: string | null;
  bodyIds: DayBodyFocusChoiceId[];
  subFocusByGoal?: Record<string, string[]>;
}): string {
  const body = opts.bodyIds.map((id) => BODY_CHOICE_COPY[id]?.label ?? id).join(" + ");
  const subs = Object.values(opts.subFocusByGoal ?? {})
    .flat()
    .filter((n, i, arr) => arr.indexOf(n) === i)
    .slice(0, 3);
  const subLine = subs.length > 0 ? subs.join(" + ") : "";
  const goal = opts.goalLabel ? shortGoalLabel(opts.goalLabel) : null;
  // Keep body split (e.g. Upper) distinct from featured sub-goals (e.g. Bench).
  const parts = [goal, body, subLine].filter(
    (part, idx, arr) => Boolean(part) && arr.indexOf(part) === idx
  );
  return parts.join(" · ") || "Recommended session";
}

export function recommendWeekDayFocus(opts: {
  gymDays: number;
  manualPreferences: ManualPreferences;
  adaptiveSetup: AdaptiveSetup | null;
  /**
   * Spread ranked goals across days as featured (exclusive) presets.
   * Defaults true — blend is opt-in per day via the day focus chip.
   */
  dedicateDays?: boolean;
}): WeekDayFocusRecommendation {
  const mode = recommendWeeklyBodyFocusMode(opts.manualPreferences);
  const prefs = opts.manualPreferences;
  const goals = resolveWeekFocusGoalLabels(prefs, opts.adaptiveSetup);
  const n = Math.max(0, opts.gymDays);
  const weights: [number, number, number] = [
    prefs.goalMatchPrimaryPct ?? 50,
    prefs.goalMatchSecondaryPct ?? 30,
    prefs.goalMatchTertiaryPct ?? 20,
  ];
  // Always feature one goal per day by default; users can switch a day to blend.
  const dedicateDays = opts.dedicateDays !== false && goals.length > 0;
  const goalIdx = goalIndicesForDays(goals.length, n, weights, dedicateDays);
  const units = bodyUnitsForMode(prefs, mode);
  const split = dedicatedSplitIdsForMode(mode);
  const bodies = assignBodyPicksAcrossDays(units, n, split);

  const sampleBias = { targetBody: "Full" as const, targetModifier: [] as string[] };
  const presets = buildDayFocusPresetsForDay({
    manualPreferences: prefs,
    adaptiveSetup: opts.adaptiveSetup,
    targetBody: sampleBias.targetBody,
    targetModifier: sampleBias.targetModifier,
  });
  const sports =
    opts.adaptiveSetup?.rankedSportSlugs?.filter((s): s is string => s != null && s !== "") ?? [];

  const usedSportIndices = new Set<number>();
  const usedGoalIndices = new Set<number>();
  const days: WeekDayFocusRecommendationDay[] = [];
  for (let i = 0; i < n; i++) {
    const weekGoalSlotIndex = goalIdx[i] ?? 0;
    const bodyIds = bodies[i]?.length ? bodies[i]! : ["full"];
    const goalPresetId = featuredPresetIdForWeekDay(presets, {
      bodyIds,
      sportSlugs: sports,
      usedSportIndices,
      rankedGoals: goals,
      usedGoalIndices,
      weekGoalSlotIndex,
      dedicateDays,
    });
    if (goalPresetId.startsWith("sport_emphasis_")) {
      const sportIdx = parseInt(goalPresetId.replace("sport_emphasis_", ""), 10);
      if (!Number.isNaN(sportIdx)) usedSportIndices.add(sportIdx);
    }
    if (goalPresetId.startsWith("goal_emphasis_")) {
      const gIdx = parseInt(goalPresetId.replace("goal_emphasis_", ""), 10);
      if (!Number.isNaN(gIdx)) usedGoalIndices.add(gIdx);
    }
    const presetMeta = presets.find((p) => p.id === goalPresetId);
    const goalLabel =
      presetMeta?.label ??
      (goalPresetId.startsWith("sport_emphasis_")
        ? null
        : (goals[weekGoalSlotIndex] ?? goals[0] ?? null));
    const subFocusByGoal = subFocusForDay({
      prefs,
      bodyIds,
      featuredGoal: goalLabel,
      dedicateDays,
    });
    days.push({
      bodyIds,
      goalPresetId,
      goalLabel,
      subFocusByGoal,
      summary: daySummary({ goalLabel, bodyIds, subFocusByGoal }),
    });
  }

  return { mode, days };
}

/**
 * Auto-fill only empty / unlocked days. User taps always win and are remapped
 * across Region/Pattern/Muscle instead of being replaced by a new template.
 */
export function overlayUserDayFocusPicks(opts: {
  gymDays: number;
  recommendation: WeekDayFocusRecommendation;
  existingBodyPicks: readonly DayBodyFocusChoiceId[][];
  existingFocusIds: readonly string[];
  lockedDays: readonly boolean[];
  existingSubFocusOverrides?: Record<number, Record<string, string[]>>;
}): {
  bodyPicks: DayBodyFocusChoiceId[][];
  focusIds: string[];
  lockedDays: boolean[];
  subFocusOverrides: Record<number, Record<string, string[]>>;
} {
  const n = Math.max(0, opts.gymDays);
  const mode = opts.recommendation.mode;
  const bodyPicks: DayBodyFocusChoiceId[][] = [];
  const focusIds: string[] = [];
  const lockedDays: boolean[] = [];
  const subFocusOverrides: Record<number, Record<string, string[]>> = {};

  for (let i = 0; i < n; i++) {
    const rec = opts.recommendation.days[i];
    const locked = opts.lockedDays[i] === true;
    const existingBody = opts.existingBodyPicks[i] ?? [];
    const remapped = remapDayBodyPicksToMode(existingBody, mode);
    if (locked) {
      bodyPicks.push(
        remapped.length
          ? remapped
          : rec?.bodyIds?.length
            ? rec.bodyIds
            : ["full"]
      );
      focusIds.push(opts.existingFocusIds[i] || rec?.goalPresetId || "default");
      lockedDays.push(true);
      const keep = opts.existingSubFocusOverrides?.[i];
      if (keep) subFocusOverrides[i] = keep;
      continue;
    }
    bodyPicks.push(rec?.bodyIds?.length ? rec.bodyIds : remapped.length ? remapped : ["full"]);
    focusIds.push(rec?.goalPresetId || opts.existingFocusIds[i] || "default");
    lockedDays.push(false);
    if (rec?.subFocusByGoal) subFocusOverrides[i] = rec.subFocusByGoal;
  }
  return { bodyPicks, focusIds, lockedDays, subFocusOverrides };
}
