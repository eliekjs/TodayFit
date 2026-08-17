/**
 * Which Region / Pattern / Muscle day chips can actually host a body-like
 * sub-goal (e.g. Overhead Press on Upper / Push / Shoulders, not Pull or Legs).
 *
 * Used to keep those subs on matching days, and to warn before generate when
 * no selected day covers them.
 */

import type { FocusBodyPart } from "../logic/workoutGeneration/types";
import { formatItemList } from "./formatItemList";
import { muscleSplitEmphasisFromFocusParts } from "./splitMuscleMatching";
import { resolveSubFocusSlugFromDisplayName } from "./subFocusBodyRegion";
import type { ManualPreferences, WeeklyBodyFocusMode } from "./types";
import type { DayBodyFocusChoiceId } from "./weekDaySessionFocus";

export type SplitCoverageSpec = {
  coveredBy: readonly DayBodyFocusChoiceId[];
  recommend: Record<WeeklyBodyFocusMode, DayBodyFocusChoiceId>;
};

const CHOICE_LABEL: Record<DayBodyFocusChoiceId, string> = {
  upper: "Upper body",
  lower: "Lower body",
  full: "Full body",
  core: "Core",
  push: "Push",
  pull: "Pull",
  legs: "Legs",
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  arms: "Arms",
  glutes: "Glutes",
};

const UPPER_PUSH = {
  coveredBy: ["upper", "full", "push", "shoulders"] as const,
  recommend: { region: "upper", pattern: "push", muscle: "shoulders" },
} satisfies SplitCoverageSpec;

const UPPER_BENCH = {
  coveredBy: ["upper", "full", "push", "chest"] as const,
  recommend: { region: "upper", pattern: "push", muscle: "chest" },
} satisfies SplitCoverageSpec;

const UPPER_BROAD = {
  coveredBy: [
    "upper",
    "full",
    "push",
    "pull",
    "chest",
    "back",
    "shoulders",
    "arms",
  ] as const,
  recommend: { region: "upper", pattern: "push", muscle: "chest" },
} satisfies SplitCoverageSpec;

const LOWER_SQUAT = {
  coveredBy: ["lower", "full", "legs"] as const,
  recommend: { region: "lower", pattern: "legs", muscle: "legs" },
} satisfies SplitCoverageSpec;

const LOWER_HINGE = {
  coveredBy: ["lower", "full", "legs", "glutes"] as const,
  recommend: { region: "lower", pattern: "legs", muscle: "glutes" },
} satisfies SplitCoverageSpec;

const LOWER_BROAD = {
  coveredBy: ["lower", "full", "legs", "glutes"] as const,
  recommend: { region: "lower", pattern: "legs", muscle: "legs" },
} satisfies SplitCoverageSpec;

const PULL_SPEC: SplitCoverageSpec = {
  coveredBy: ["upper", "full", "pull", "back"],
  recommend: { region: "upper", pattern: "pull", muscle: "back" },
};

const CORE_SPEC: SplitCoverageSpec = {
  coveredBy: ["core", "full"],
  recommend: { region: "core", pattern: "core", muscle: "core" },
};

const FULL_SPEC: SplitCoverageSpec = {
  coveredBy: [
    "full",
    "upper",
    "lower",
    "push",
    "pull",
    "legs",
    "chest",
    "back",
    "shoulders",
    "arms",
    "glutes",
    "core",
  ] as const,
  recommend: { region: "full", pattern: "full", muscle: "full" },
};

/**
 * Sub-goals that the day body contract can drop. Unknown slugs are not gated here.
 * Strength lifts + parallel muscle / calisthenics / joint / recovery intents.
 */
export const SUB_GOAL_SPLIT_COVERAGE: Record<string, SplitCoverageSpec> = {
  overhead_press: UPPER_PUSH,
  handstand: UPPER_PUSH,
  bench_press: UPPER_BENCH,
  push: UPPER_BENCH,
  push_ups: UPPER_BENCH,
  dips: UPPER_BENCH,
  pull: PULL_SPEC,
  pull_ups: PULL_SPEC,
  front_lever_advanced: PULL_SPEC,
  squat: LOWER_SQUAT,
  legs_pistol: LOWER_SQUAT,
  deadlift_hinge: LOWER_HINGE,
  chest: {
    coveredBy: ["upper", "full", "push", "chest"],
    recommend: { region: "upper", pattern: "push", muscle: "chest" },
  },
  shoulders: {
    coveredBy: ["upper", "full", "push", "shoulders"],
    recommend: { region: "upper", pattern: "push", muscle: "shoulders" },
  },
  back: PULL_SPEC,
  arms: {
    coveredBy: ["upper", "full", "push", "pull", "arms"],
    recommend: { region: "upper", pattern: "push", muscle: "arms" },
  },
  glutes: LOWER_HINGE,
  legs: LOWER_SQUAT,
  upper: UPPER_BROAD,
  lower: LOWER_BROAD,
  upper_body_power: {
    coveredBy: ["upper", "full", "push", "pull", "chest", "back", "shoulders", "arms"],
    recommend: { region: "upper", pattern: "push", muscle: "shoulders" },
  },
  lower_body_power_plyos: LOWER_BROAD,
  vertical_jump: LOWER_BROAD,
  speed_sprint: LOWER_BROAD,
  sprint: LOWER_BROAD,
  olympic_triple_extension: FULL_SPEC,
  power_explosive: FULL_SPEC,
  core: CORE_SPEC,
  full_body: FULL_SPEC,
  full_body_calisthenics: FULL_SPEC,
  balanced: FULL_SPEC,
  // Joint health
  shoulder_health: UPPER_BROAD,
  elbow_wrist_health: UPPER_BROAD,
  knee_health: LOWER_BROAD,
  hip_health: LOWER_BROAD,
  ankle_foot_health: LOWER_BROAD,
  back_spine_health: CORE_SPEC,
  // Recovery & mobility regional
  hips: LOWER_BROAD,
  knees: LOWER_BROAD,
  ankles: LOWER_BROAD,
  elbows: UPPER_BROAD,
  wrists: UPPER_BROAD,
  t_spine: UPPER_BROAD,
  lower_back: CORE_SPEC,
};

function normSlug(slug: string): string {
  return slug.toLowerCase().replace(/\s/g, "_").replace(/-/g, "_");
}

export function splitCoverageSpecForSlug(slug: string | null | undefined): SplitCoverageSpec | null {
  if (!slug) return null;
  return SUB_GOAL_SPLIT_COVERAGE[normSlug(slug)] ?? null;
}

export function isSplitSensitiveSubFocusSlug(slug: string | null | undefined): boolean {
  return splitCoverageSpecForSlug(slug) != null;
}

export function dayBodyChoiceCoversSubFocus(
  choiceId: DayBodyFocusChoiceId,
  slug: string
): boolean {
  const spec = splitCoverageSpecForSlug(slug);
  if (!spec) return true;
  return spec.coveredBy.includes(choiceId);
}

export function dayBodyPicksCoverSubFocus(
  picks: readonly DayBodyFocusChoiceId[],
  slug: string
): boolean {
  if (picks.length === 0) return false;
  return picks.some((id) => dayBodyChoiceCoversSubFocus(id, slug));
}

export function recommendedBodyChoiceForSubFocus(
  slug: string,
  mode: WeeklyBodyFocusMode
): DayBodyFocusChoiceId | null {
  const spec = splitCoverageSpecForSlug(slug);
  if (!spec) return null;
  return spec.recommend[mode];
}

export function bodyChoiceLabelForSplit(id: DayBodyFocusChoiceId): string {
  return CHOICE_LABEL[id] ?? id;
}

/** Mode-aware day chips implied by selected sub-goals (Overhead Press → Shoulders in Muscle). */
export function recommendedBodyChoiceIdsFromSubFocusPrefs(
  prefs: ManualPreferences,
  mode: WeeklyBodyFocusMode
): DayBodyFocusChoiceId[] {
  const out: DayBodyFocusChoiceId[] = [];
  for (const [goalLabel, names] of Object.entries(prefs.subFocusByGoal ?? {})) {
    for (const name of names ?? []) {
      const slug = resolveSubFocusSlugFromDisplayName(goalLabel, name);
      const id = recommendedBodyChoiceForSubFocus(slug ?? "", mode);
      if (id && !out.includes(id)) out.push(id);
    }
  }
  return out;
}

/**
 * Display names for selected sub-goals that a day's body chips can host.
 * Non-split-sensitive subs (Zone 2, speed, etc.) always match when listed under `goalLabel`.
 */
export function matchingSubFocusNamesForBodyPicks(
  prefs: ManualPreferences,
  bodyIds: readonly DayBodyFocusChoiceId[],
  opts?: {
    goalLabel?: string | null;
    /** Include non-body subs even when bodyIds is empty. Default true. */
    includeNonSplitSensitive?: boolean;
    max?: number;
  }
): string[] {
  const goalFilter = opts?.goalLabel ?? null;
  const includeNonSplit = opts?.includeNonSplitSensitive !== false;
  const max = opts?.max ?? 4;
  const out: string[] = [];
  for (const [goalLabel, names] of Object.entries(prefs.subFocusByGoal ?? {})) {
    if (goalFilter && goalLabel !== goalFilter) continue;
    for (const name of names ?? []) {
      const slug = resolveSubFocusSlugFromDisplayName(goalLabel, name);
      if (!slug) {
        if (!out.includes(name)) out.push(name);
        continue;
      }
      if (isSplitSensitiveSubFocusSlug(slug)) {
        if (bodyIds.length === 0) continue;
        if (!dayBodyPicksCoverSubFocus(bodyIds, slug)) continue;
      } else if (!includeNonSplit) {
        continue;
      } else if (goalFilter && goalLabel !== goalFilter) {
        continue;
      }
      if (!out.includes(name)) out.push(name);
      if (out.length >= max) return out;
    }
  }
  return out;
}

export type UncoveredSubGoal = {
  goalLabel: string;
  displayName: string;
  slug: string;
  recommendedChoiceId: DayBodyFocusChoiceId;
};

export type UncoveredSubGoalResolution = {
  id: string;
  label: string;
  bodyFocusId?: DayBodyFocusChoiceId;
  acknowledge?: boolean;
};

export type UncoveredSubGoalPrompt = {
  id: string;
  message: string;
  uncovered: UncoveredSubGoal[];
  recommendedChoiceIds: DayBodyFocusChoiceId[];
  resolutions: UncoveredSubGoalResolution[];
};

function collectSplitSensitiveSubs(prefs: ManualPreferences): UncoveredSubGoal[] {
  const out: UncoveredSubGoal[] = [];
  const seen = new Set<string>();
  for (const [goalLabel, names] of Object.entries(prefs.subFocusByGoal ?? {})) {
    for (const name of names ?? []) {
      const slug = resolveSubFocusSlugFromDisplayName(goalLabel, name);
      if (!slug || !isSplitSensitiveSubFocusSlug(slug)) continue;
      const key = `${goalLabel}::${slug}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        goalLabel,
        displayName: name,
        slug,
        recommendedChoiceId: "upper",
      });
    }
  }
  return out;
}

function withMode(
  items: UncoveredSubGoal[],
  mode: WeeklyBodyFocusMode
): UncoveredSubGoal[] {
  return items.map((item) => ({
    ...item,
    recommendedChoiceId: recommendedBodyChoiceForSubFocus(item.slug, mode) ?? item.recommendedChoiceId,
  }));
}

function buildPrompt(
  uncovered: UncoveredSubGoal[],
  mode: WeeklyBodyFocusMode,
  scope: "week" | "day",
  dayLabel?: string
): UncoveredSubGoalPrompt | null {
  if (uncovered.length === 0) return null;
  const names = [...new Set(uncovered.map((u) => u.displayName))];
  const nameList = formatItemList(names, " and ");
  const recommendedChoiceIds = [
    ...new Set(uncovered.map((u) => u.recommendedChoiceId)),
  ];
  const recLabels = recommendedChoiceIds.map(bodyChoiceLabelForSplit);
  const recList = formatItemList(recLabels, " or ");
  const where =
    scope === "week"
      ? " — none of your days cover " + (names.length === 1 ? "it" : "them")
      : dayLabel
        ? ` on this ${dayLabel} day`
        : " on this day's split";
  const stay = names.length === 1 ? "it stays" : "they stay";
  const place = scope === "week" ? "week" : "session";
  const message = `${nameList} will get lost${where}. Select ${recList} so ${stay} in the ${place}.`;

  const resolutions: UncoveredSubGoalResolution[] = recommendedChoiceIds.map((id) => ({
    id: `use_${id}`,
    label: `Use ${bodyChoiceLabelForSplit(id)}`,
    bodyFocusId: id,
  }));
  resolutions.push({
    id: "continue_anyway",
    label: names.length === 1 ? "Continue without this sub-goal" : "Continue without these sub-goals",
    acknowledge: true,
  });

  return {
    id: `uncovered_subgoals_${mode}_${uncovered.map((u) => u.slug).join("_")}`,
    message,
    uncovered,
    recommendedChoiceIds,
    resolutions,
  };
}

/**
 * Sub-goals that no selected week day can host under the active split vocabulary.
 */
export function detectUncoveredSubGoalsForWeek(opts: {
  manualPreferences: ManualPreferences;
  dayBodyPicks: readonly (readonly DayBodyFocusChoiceId[])[];
  mode: WeeklyBodyFocusMode;
}): UncoveredSubGoalPrompt | null {
  const candidates = withMode(collectSplitSensitiveSubs(opts.manualPreferences), opts.mode);
  const uncovered = candidates.filter(
    (item) => !opts.dayBodyPicks.some((picks) => dayBodyPicksCoverSubFocus(picks, item.slug))
  );
  return buildPrompt(uncovered, opts.mode, "week");
}

/**
 * Sub-goals the current single-session body chip cannot host.
 */
export function detectUncoveredSubGoalsForDay(opts: {
  manualPreferences: ManualPreferences;
  bodyChoiceId: DayBodyFocusChoiceId;
  mode: WeeklyBodyFocusMode;
}): UncoveredSubGoalPrompt | null {
  const candidates = withMode(collectSplitSensitiveSubs(opts.manualPreferences), opts.mode);
  const uncovered = candidates.filter(
    (item) => !dayBodyChoiceCoversSubFocus(opts.bodyChoiceId, item.slug)
  );
  return buildPrompt(
    uncovered,
    opts.mode,
    "day",
    bodyChoiceLabelForSplit(opts.bodyChoiceId)
  );
}

/**
 * Whether a generator `focus_body_parts` contract can host this sub-goal slug.
 * Unknown slugs pass through (not dropped here).
 */
export function subFocusSlugCoveredByFocusParts(
  slug: string,
  focus: readonly FocusBodyPart[] | undefined
): boolean {
  const spec = splitCoverageSpecForSlug(slug);
  if (!spec || !focus?.length) return true;
  const parts = focus.map((p) => String(p).toLowerCase().replace(/\s/g, "_").replace(/-/g, "_"));
  if (parts.includes("full_body")) return true;

  const emphasis = muscleSplitEmphasisFromFocusParts(focus);
  if (emphasis) return spec.coveredBy.includes(emphasis);

  const hasPush = parts.includes("upper_push");
  const hasPull = parts.includes("upper_pull");
  const hasLower =
    parts.includes("lower") || parts.includes("legs") || parts.includes("quad") || parts.includes("posterior");
  const coreOnly = parts.includes("core") && !hasPush && !hasPull && !hasLower;
  if (coreOnly) return spec.coveredBy.includes("core");

  if (hasLower && !hasPush && !hasPull) {
    return spec.coveredBy.includes("lower") || spec.coveredBy.includes("legs");
  }
  // Pattern Push/Pull are family gates, not the Region Upper chip.
  if (hasPush && !hasPull) return spec.coveredBy.includes("push");
  if (hasPull && !hasPush) return spec.coveredBy.includes("pull");
  if (hasPush && hasPull) return spec.coveredBy.includes("upper") || spec.coveredBy.includes("full");
  return true;
}

export function filterSplitSensitiveSlugsForFocusParts(
  slugs: readonly string[],
  focus: readonly FocusBodyPart[] | undefined
): string[] {
  if (!slugs.length || !focus?.length) return [...slugs];
  return slugs.filter((slug) => {
    if (!isSplitSensitiveSubFocusSlug(slug)) return true;
    return subFocusSlugCoveredByFocusParts(slug, focus);
  });
}

/** Index of a day to apply a recommended chip (prefer a day that does not already cover it). */
export function dayIndexForUncoveredRecommendation(
  dayBodyPicks: readonly (readonly DayBodyFocusChoiceId[])[],
  recommendedChoiceId: DayBodyFocusChoiceId,
  slugForCoverage?: string
): number {
  if (dayBodyPicks.length === 0) return 0;
  const uncoveredIdx = dayBodyPicks.findIndex((picks) =>
    slugForCoverage
      ? !dayBodyPicksCoverSubFocus(picks, slugForCoverage)
      : !picks.includes(recommendedChoiceId)
  );
  return uncoveredIdx >= 0 ? uncoveredIdx : 0;
}
