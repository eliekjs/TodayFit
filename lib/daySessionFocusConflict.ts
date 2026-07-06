/**
 * Detects body-focus vs regional sub-goal conflicts for a single training day
 * in weekly session-focus setup, and builds resolution options.
 */

import type { AdaptiveSetup } from "../context/appStateModel";
import { GOAL_SUB_FOCUS_OPTIONS } from "../data/goalSubFocus";
import type { ManualPreferences } from "./types";
import {
  bodyFocusIdForSubFocusRegion,
  dayBodyFocusToRegion,
  dayRegionLabel,
  getSubFocusBodyRegion,
  resolveSubFocusSlugFromDisplayName,
  subFocusRegionConflictsWithDay,
  subFocusRegionLabel,
  type DayBodyRegion,
  type SubFocusBodyRegion,
} from "./subFocusBodyRegion";
import {
  manualPreferencesForSportWeekFocus,
  resolveDayFocusPreset,
  type DayBodyFocusChoiceId,
  type DayFocusPreset,
} from "./weekDaySessionFocus";

export type ResolvedSubFocus = {
  goalLabel: string;
  displayName: string;
  slug: string;
  region: SubFocusBodyRegion;
};

export type DaySessionFocusResolution = {
  id: string;
  label: string;
  bodyFocusId?: DayBodyFocusChoiceId;
  focusPresetId?: string;
  /** Per-day sub-focus override (merged into global subs at generation). */
  subFocusByGoalPatch?: Record<string, string[]>;
};

export type DaySessionFocusConflict = {
  id: string;
  dayRegion: DayBodyRegion;
  message: string;
  conflicting: ResolvedSubFocus[];
  aligned: ResolvedSubFocus[];
  resolutions: DaySessionFocusResolution[];
};

function resolveAllRegionalSubFocuses(prefs: ManualPreferences): ResolvedSubFocus[] {
  const out: ResolvedSubFocus[] = [];
  for (const [goalLabel, displayNames] of Object.entries(prefs.subFocusByGoal ?? {})) {
    for (const name of displayNames) {
      const slug = resolveSubFocusSlugFromDisplayName(goalLabel, name);
      if (!slug) continue;
      const region = getSubFocusBodyRegion(slug);
      if (!region) continue;
      out.push({ goalLabel, displayName: name, slug, region });
    }
  }
  return out;
}

function emphasizedGoalLabel(
  focusPresetId: string,
  manualPreferences: ManualPreferences,
  adaptiveSetup: AdaptiveSetup | null
): string | null {
  const resolved = resolveDayFocusPreset(focusPresetId, manualPreferences, adaptiveSetup);
  const label = resolved.primaryFocus[0];
  return label && label !== "Sport preparation" ? label : null;
}

function findGoalEmphasisPresetId(
  goalLabel: string,
  manualPreferences: ManualPreferences,
  presets: DayFocusPreset[]
): string | null {
  const ranked = manualPreferencesForSportWeekFocus(manualPreferences, null).primaryFocus;
  const idx = ranked.indexOf(goalLabel);
  if (idx < 0) return null;
  const id = `goal_emphasis_${idx}`;
  return presets.some((p) => p.id === id) ? id : null;
}

function formatSubFocusList(items: ResolvedSubFocus[], max = 2): string {
  return items
    .slice(0, max)
    .map((s) => s.displayName)
    .join(", ");
}

function buildResolutions(opts: {
  dayRegion: DayBodyRegion;
  conflicting: ResolvedSubFocus[];
  aligned: ResolvedSubFocus[];
  emphasizedGoal: string | null;
  manualPreferences: ManualPreferences;
  presets: DayFocusPreset[];
}): DaySessionFocusResolution[] {
  const { dayRegion, conflicting, aligned, emphasizedGoal, manualPreferences, presets } = opts;
  const resolutions: DaySessionFocusResolution[] = [];
  const seen = new Set<string>();

  const add = (resolution: DaySessionFocusResolution) => {
    if (seen.has(resolution.id)) return;
    seen.add(resolution.id);
    resolutions.push(resolution);
  };

  const emphasizedAligned = emphasizedGoal
    ? aligned.filter((s) => s.goalLabel === emphasizedGoal)
    : [];
  if (emphasizedAligned.length > 0) {
    const names = emphasizedAligned.map((s) => s.displayName);
    add({
      id: `use_aligned_${emphasizedGoal}_${names.join("_")}`,
      label: `Use ${formatSubFocusList(emphasizedAligned)} for this day`,
      subFocusByGoalPatch: {
        [emphasizedGoal!]: names,
      },
    });
  }

  const alignedByGoal = new Map<string, ResolvedSubFocus[]>();
  for (const sub of aligned) {
    if (emphasizedGoal && sub.goalLabel === emphasizedGoal) continue;
    const list = alignedByGoal.get(sub.goalLabel) ?? [];
    list.push(sub);
    alignedByGoal.set(sub.goalLabel, list);
  }
  for (const [goalLabel, subs] of alignedByGoal) {
    const presetId = findGoalEmphasisPresetId(goalLabel, manualPreferences, presets);
    if (!presetId) continue;
    add({
      id: `emphasize_goal_${goalLabel}`,
      label: `Emphasize ${goalLabel} first`,
      focusPresetId: presetId,
      subFocusByGoalPatch: {
        [goalLabel]: subs.map((s) => s.displayName),
      },
    });
  }

  if (dayRegion !== "full") {
    add({
      id: "switch_full_body",
      label: "Switch to Full body",
      bodyFocusId: "full",
    });
  }

  const lowerConflict = conflicting.some((c) => c.region === "lower");
  const upperConflict = conflicting.some((c) => c.region === "upper");
  if (lowerConflict && dayRegion === "upper") {
    add({
      id: "switch_lower_body",
      label: "Switch to Lower body",
      bodyFocusId: "lower",
    });
  }
  if (upperConflict && dayRegion === "lower") {
    add({
      id: "switch_upper_body",
      label: "Switch to Upper body",
      bodyFocusId: "upper",
    });
  }

  if (conflicting.length === 1) {
    const only = conflicting[0]!;
    const matchBody = bodyFocusIdForSubFocusRegion(only.region);
    if (matchBody !== dayRegion && matchBody !== "core") {
      add({
        id: `match_sub_${only.slug}`,
        label: `Switch to ${dayRegionLabel(matchBody)} (match ${only.displayName})`,
        bodyFocusId: matchBody,
      });
    }
  }

  return resolutions.slice(0, 4);
}

/**
 * Returns a conflict when regional sub-goals clash with the day's body focus.
 */
export function detectDaySessionFocusConflict(opts: {
  bodyFocusId: DayBodyFocusChoiceId;
  focusPresetId: string;
  manualPreferences: ManualPreferences;
  adaptiveSetup: AdaptiveSetup | null;
  presetOptions?: DayFocusPreset[];
}): DaySessionFocusConflict | null {
  const dayRegion = dayBodyFocusToRegion(opts.bodyFocusId);
  if (dayRegion === "full" || dayRegion === "core") return null;

  const allRegional = resolveAllRegionalSubFocuses(opts.manualPreferences);
  if (allRegional.length === 0) return null;

  const conflicting = allRegional.filter((s) =>
    subFocusRegionConflictsWithDay(s.region, dayRegion)
  );
  if (conflicting.length === 0) return null;

  const aligned = allRegional.filter(
    (s) => !subFocusRegionConflictsWithDay(s.region, dayRegion)
  );

  const emphasizedGoal = opts.focusPresetId
    ? emphasizedGoalLabel(opts.focusPresetId, opts.manualPreferences, opts.adaptiveSetup)
    : null;

  const conflictNames = formatSubFocusList(conflicting);
  const dayLabel = dayRegionLabel(dayRegion);
  const emphasizedNote =
    emphasizedGoal &&
    conflicting.some((c) => c.goalLabel === emphasizedGoal)
      ? ` (${emphasizedGoal} is prioritized this day)`
      : "";

  const opposingRegion = dayRegion === "upper" ? "lower body" : "upper body";
  const message = `Your sub-goals (${conflictNames}) focus on ${opposingRegion}, but this day is set to ${dayLabel}${emphasizedNote}. Pick how to align them before generating.`;

  const resolutions = buildResolutions({
    dayRegion,
    conflicting,
    aligned,
    emphasizedGoal,
    manualPreferences: opts.manualPreferences,
    presets: opts.presetOptions ?? [],
  });

  if (resolutions.length === 0) return null;

  return {
    id: `day_body_subgoal_${dayRegion}_${conflicting.map((c) => c.slug).join("_")}`,
    dayRegion,
    message,
    conflicting,
    aligned,
    resolutions,
  };
}

/** Merge per-day sub-focus override into base prefs for one session. */
export function mergeDaySubFocusOverride(
  base: Record<string, string[]>,
  override: Record<string, string[]> | undefined
): Record<string, string[]> {
  if (!override || Object.keys(override).length === 0) return base;
  return { ...base, ...override };
}

export function detectAllDaySessionFocusConflicts(
  dayCount: number,
  getDayInput: (index: number) => Parameters<typeof detectDaySessionFocusConflict>[0]
): (DaySessionFocusConflict | null)[] {
  return Array.from({ length: dayCount }, (_, i) => detectDaySessionFocusConflict(getDayInput(i)));
}

export function dayHasUnresolvedSessionFocusConflict(
  conflict: DaySessionFocusConflict | null,
  resolvedId: string | undefined
): boolean {
  return conflict != null && resolvedId !== conflict.id;
}

/** Apply a user-selected resolution to day-level week setup state. */
export function applyDaySessionFocusResolution(args: {
  dayIndex: number;
  resolution: DaySessionFocusResolution;
  conflict: DaySessionFocusConflict;
  subFocusByGoal: Record<string, string[]>;
  setBodyFocusId: (dayIndex: number, id: DayBodyFocusChoiceId) => void;
  setFocusPresetId: (dayIndex: number, presetId: string) => void;
  setSubFocusOverride: (
    dayIndex: number,
    patch: Record<string, string[]> | undefined
  ) => void;
  setResolvedConflictId: (dayIndex: number, conflictId: string) => void;
}): void {
  const { dayIndex, resolution, conflict, subFocusByGoal } = args;
  if (resolution.bodyFocusId) {
    args.setBodyFocusId(dayIndex, resolution.bodyFocusId);
  }
  if (resolution.focusPresetId) {
    args.setFocusPresetId(dayIndex, resolution.focusPresetId);
  }
  if (resolution.subFocusByGoalPatch) {
    args.setSubFocusOverride(dayIndex, {
      ...subFocusByGoal,
      ...resolution.subFocusByGoalPatch,
    });
  }
  args.setResolvedConflictId(dayIndex, conflict.id);
}
