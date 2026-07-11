/**
 * Detects body-focus vs regional sub-goal conflicts for a single training day
 * in weekly session-focus setup, and builds resolution options.
 */

import type { AdaptiveSetup } from "../context/appStateModel";
import type { ManualPreferences } from "./types";
import {
  bodyFocusIdForSubFocusRegion,
  catalogSubFocusesMatchingDayRegion,
  dayBodyFocusToRegion,
  dayRegionLabel,
  getSubFocusBodyRegion,
  resolveSubFocusSlugFromDisplayName,
  subFocusRegionConflictsWithDay,
  type DayBodyRegion,
  type SubFocusBodyRegion,
} from "./subFocusBodyRegion";
import {
  manualPreferencesForSportWeekFocus,
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

/** Goal label when preset dedicates the day to one ranked goal (`goal_emphasis_N`). */
export function goalEmphasisLabelForPreset(
  focusPresetId: string,
  manualPreferences: ManualPreferences,
  adaptiveSetup: AdaptiveSetup | null
): string | null {
  if (!focusPresetId.startsWith("goal_emphasis_")) return null;
  const ranked = manualPreferencesForSportWeekFocus(manualPreferences, adaptiveSetup).primaryFocus;
  const idx = parseInt(focusPresetId.replace("goal_emphasis_", ""), 10);
  if (Number.isNaN(idx) || idx < 0 || idx >= ranked.length) return null;
  return ranked[idx] ?? null;
}

function emphasizedGoalLabel(
  focusPresetId: string,
  manualPreferences: ManualPreferences,
  adaptiveSetup: AdaptiveSetup | null
): string | null {
  return goalEmphasisLabelForPreset(focusPresetId, manualPreferences, adaptiveSetup);
}

function regionalSubFocusesForConflict(opts: {
  manualPreferences: ManualPreferences;
  subFocusByGoalOverride?: Record<string, string[]>;
  focusPresetId: string;
  adaptiveSetup: AdaptiveSetup | null;
}): ResolvedSubFocus[] {
  const mergedPrefs: ManualPreferences = {
    ...opts.manualPreferences,
    subFocusByGoal: mergeDaySubFocusOverride(
      opts.manualPreferences.subFocusByGoal ?? {},
      opts.subFocusByGoalOverride
    ),
  };
  const allRegional = resolveAllRegionalSubFocuses(mergedPrefs);
  const emphasizedGoal = opts.focusPresetId
    ? goalEmphasisLabelForPreset(opts.focusPresetId, mergedPrefs, opts.adaptiveSetup)
    : null;
  if (!emphasizedGoal) return allRegional;
  return allRegional.filter((s) => s.goalLabel === emphasizedGoal);
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

function subFocusPatchForDayRegion(opts: {
  goalLabel: string;
  dayRegion: "upper" | "lower";
  conflicting: ResolvedSubFocus[];
  aligned: ResolvedSubFocus[];
}): Record<string, string[]> | null {
  const goalAligned = opts.aligned.filter((s) => s.goalLabel === opts.goalLabel);
  if (goalAligned.length > 0) {
    return { [opts.goalLabel]: goalAligned.map((s) => s.displayName) };
  }
  const catalogMatches = catalogSubFocusesMatchingDayRegion(opts.goalLabel, opts.dayRegion);
  if (catalogMatches.length === 0) return null;
  const conflictingNames = new Set(
    opts.conflicting.filter((c) => c.goalLabel === opts.goalLabel).map((c) => c.displayName)
  );
  const pick =
    catalogMatches.find((m) => !conflictingNames.has(m.displayName)) ?? catalogMatches[0]!;
  return { [opts.goalLabel]: [pick.displayName] };
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
      subFocusByGoalPatch: { [emphasizedGoal!]: names },
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
      label: `Focus on ${goalLabel}`,
      focusPresetId: presetId,
      subFocusByGoalPatch: { [goalLabel]: subs.map((s) => s.displayName) },
    });
  }

  if (dayRegion === "upper" || dayRegion === "lower") {
    const conflictingByGoal = new Map<string, ResolvedSubFocus[]>();
    for (const c of conflicting) {
      const list = conflictingByGoal.get(c.goalLabel) ?? [];
      list.push(c);
      conflictingByGoal.set(c.goalLabel, list);
    }

    if (conflictingByGoal.size === 1) {
      const goalLabel = [...conflictingByGoal.keys()][0]!;
      const alreadyAlignedForEmphasis =
        emphasizedGoal === goalLabel && emphasizedAligned.length > 0;
      if (!alreadyAlignedForEmphasis) {
        const patch = subFocusPatchForDayRegion({
          goalLabel,
          dayRegion,
          conflicting,
          aligned,
        });
        if (patch) {
          const pickName = patch[goalLabel]![0]!;
          add({
            id: `match_day_${dayRegion}_${goalLabel}`,
            label: `Use ${pickName} for this day (match ${dayRegionLabel(dayRegion)})`,
            subFocusByGoalPatch: patch,
          });
        }
      }
    } else if (conflictingByGoal.size > 1) {
      const patch: Record<string, string[]> = {};
      for (const goalLabel of conflictingByGoal.keys()) {
        const goalPatch = subFocusPatchForDayRegion({
          goalLabel,
          dayRegion,
          conflicting,
          aligned,
        });
        if (goalPatch) Object.assign(patch, goalPatch);
      }
      if (Object.keys(patch).length > 0) {
        add({
          id: `match_day_${dayRegion}_multi`,
          label: `Switch sub-goals to match ${dayRegionLabel(dayRegion)}`,
          subFocusByGoalPatch: patch,
        });
      }
    }
  }

  if (dayRegion !== "full") {
    add({ id: "switch_full_body", label: "Switch to Full body", bodyFocusId: "full" });
  }

  const crossGoalConflict = new Set(conflicting.map((c) => c.goalLabel)).size > 1;
  if (crossGoalConflict) {
    const fullIdx = resolutions.findIndex((r) => r.id === "switch_full_body");
    if (fullIdx > 0) {
      const [fullRes] = resolutions.splice(fullIdx, 1);
      resolutions.unshift(fullRes);
    }
  }

  if (conflicting.some((c) => c.region === "lower") && dayRegion === "upper") {
    add({ id: "switch_lower_body", label: "Switch to Lower body", bodyFocusId: "lower" });
  }
  if (conflicting.some((c) => c.region === "upper") && dayRegion === "lower") {
    add({ id: "switch_upper_body", label: "Switch to Upper body", bodyFocusId: "upper" });
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

export function detectDaySessionFocusConflict(opts: {
  bodyFocusId: DayBodyFocusChoiceId;
  focusPresetId: string;
  manualPreferences: ManualPreferences;
  adaptiveSetup: AdaptiveSetup | null;
  presetOptions?: DayFocusPreset[];
  /** Per-day sub-focus patch after conflict resolution (merged before detection). */
  subFocusByGoalOverride?: Record<string, string[]>;
}): DaySessionFocusConflict | null {
  const dayRegion = dayBodyFocusToRegion(opts.bodyFocusId);
  if (dayRegion === "full" || dayRegion === "core") return null;

  const allRegional = regionalSubFocusesForConflict({
    manualPreferences: opts.manualPreferences,
    subFocusByGoalOverride: opts.subFocusByGoalOverride,
    focusPresetId: opts.focusPresetId,
    adaptiveSetup: opts.adaptiveSetup,
  });
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
    emphasizedGoal && conflicting.some((c) => c.goalLabel === emphasizedGoal)
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

export function mergeDaySubFocusOverride(
  base: Record<string, string[]>,
  override: Record<string, string[]> | undefined
): Record<string, string[]> {
  if (!override || Object.keys(override).length === 0) return base;
  return { ...base, ...override };
}

export function dayHasUnresolvedSessionFocusConflict(
  conflict: DaySessionFocusConflict | null,
  resolvedId: string | undefined
): boolean {
  return conflict != null && resolvedId !== conflict.id;
}

/** Drop stale per-day resolution state when conflict is gone or conflict id changed. */
export function reconcileDaySessionFocusConflictState(args: {
  conflict: DaySessionFocusConflict | null;
  resolvedId: string | undefined;
  subFocusOverride: Record<string, string[]> | undefined;
}): {
  resolvedId: string | undefined;
  subFocusOverride: Record<string, string[]> | undefined;
} {
  if (!args.conflict) {
    return { resolvedId: undefined, subFocusOverride: undefined };
  }
  if (args.resolvedId != null && args.resolvedId !== args.conflict.id) {
    return { resolvedId: undefined, subFocusOverride: undefined };
  }
  return {
    resolvedId: args.resolvedId,
    subFocusOverride: args.subFocusOverride,
  };
}

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
  const { resolution, conflict, subFocusByGoal } = args;
  if (resolution.bodyFocusId) {
    args.setBodyFocusId(args.dayIndex, resolution.bodyFocusId);
  }
  if (resolution.focusPresetId) {
    args.setFocusPresetId(args.dayIndex, resolution.focusPresetId);
  }
  if (resolution.subFocusByGoalPatch) {
    args.setSubFocusOverride(args.dayIndex, {
      ...subFocusByGoal,
      ...resolution.subFocusByGoalPatch,
    });
  }
  args.setResolvedConflictId(args.dayIndex, conflict.id);
}
