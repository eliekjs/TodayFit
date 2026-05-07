/**
 * Intent-based proportional slot allocation for the main workout.
 * Leaf entries (bare goals/sports or their sub-focus rows) drive pool matching and slot counts.
 */

import type { Exercise, PrimaryGoal } from "./types";
import type { IntentEntry } from "./sessionIntentContract";
import { getCanonicalSportSlug } from "../../data/sportSubFocus/canonicalSportSlug";
import { getLegacyMovementPattern } from "../../lib/ontology/legacyMapping";
import { MAIN_WORK_EXCLUDED_ROLES } from "./cooldownSelection";
import {
  exerciseMatchesGoalSubFocusSlugUnified,
  exerciseMatchesSportSubFocusSlug,
} from "./subFocusSlugMatch";
import { exerciseMatchesDeclaredGoal } from "./sessionIntentCoverage";
import { allocateSlotsBySubFocusWeights } from "./slotAllocationHelpers";
import { isSpeedAgilityPowerStyleSubFocusSlug } from "../../data/sportSubFocus/speedAgilitySubFocusShared";

function tagToSlug(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
}

/** Maps PrimaryGoal to goal_sub_focus map key (matches adapter / GOAL_SUB_FOCUS_OPTIONS). */
export function primaryGoalToSubFocusKey(goal: PrimaryGoal): string {
  switch (goal) {
    case "hypertrophy":
      return "muscle";
    case "body_recomp":
      return "physique";
    case "recovery":
      return "resilience";
    default:
      return goal as string;
  }
}

/**
 * Rough count of working-set exercises (main + accessory) for intent proportionality.
 * Aligned with common session lengths (60 min ≈ 10).
 */
export function estimateIntentWorkingExerciseSlots(durationMinutes: number | undefined): number {
  const d = durationMinutes ?? 60;
  if (d <= 25) return 4;
  if (d <= 37) return 6;
  if (d <= 52) return 8;
  if (d <= 67) return 10;
  return 12;
}

/**
 * When a parent goal or sport has sub-focus rows, only those rows are leaves (parent row is excluded).
 * Weights are renormalized to sum to 1 across returned leaves.
 */
export function deriveLeafEntries(rankedIntentEntries: IntentEntry[]): IntentEntry[] {
  if (!rankedIntentEntries.length) return [];

  const goalsWithSubFocus = new Set<string>();
  const sportsWithSubFocus = new Set<string>();
  for (const e of rankedIntentEntries) {
    if (e.kind === "goal_sub_focus" && e.parent_slug) goalsWithSubFocus.add(e.parent_slug);
    if (e.kind === "sport_sub_focus" && e.parent_slug) sportsWithSubFocus.add(e.parent_slug);
  }

  const out: IntentEntry[] = [];
  for (const e of rankedIntentEntries) {
    if (e.kind === "goal_sub_focus") out.push(e);
    else if (e.kind === "sport_sub_focus") out.push(e);
    else if (e.kind === "goal") {
      if (!goalsWithSubFocus.has(e.slug)) out.push(e);
    } else if (e.kind === "sport") {
      if (!sportsWithSubFocus.has(e.slug)) out.push(e);
    }
  }

  const sum = out.reduce((s, x) => s + x.weight, 0);
  if (sum <= 0) return out;
  return out.map((e) => ({ ...e, weight: e.weight / sum }));
}

export function matchesIntentEntry(ex: Exercise, entry: IntentEntry): boolean {
  switch (entry.kind) {
    case "sport_sub_focus":
      return exerciseMatchesSportSubFocusSlug(ex, entry.parent_slug ?? entry.slug, entry.slug);
    case "goal_sub_focus": {
      const key = primaryGoalToSubFocusKey((entry.parent_slug ?? "strength") as PrimaryGoal);
      return exerciseMatchesGoalSubFocusSlugUnified(ex, key, entry.slug);
    }
    case "sport": {
      const want = tagToSlug(getCanonicalSportSlug(entry.slug));
      const tags = (ex.tags.sport_tags ?? []).map((t) => tagToSlug(getCanonicalSportSlug(String(t))));
      return tags.includes(want);
    }
    case "goal":
      return exerciseMatchesDeclaredGoal(ex, entry.slug as PrimaryGoal);
    default:
      return false;
  }
}

function effectiveMainWorkPatternForIntent(ex: Exercise): string {
  return getLegacyMovementPattern({
    movement_patterns: ex.movement_patterns,
    movement_pattern: ex.movement_pattern,
  })
    .toLowerCase()
    .replace(/\s/g, "_");
}

/**
 * True when the exercise is suitable as a main compound for the given primary (strength-style gate
 * or hypertrophy main-work pattern set).
 */
export function isIntentMainWorkCandidate(ex: Exercise, primary: PrimaryGoal): boolean {
  if (ex.exercise_role && MAIN_WORK_EXCLUDED_ROLES.has(ex.exercise_role.toLowerCase().replace(/\s/g, "_"))) {
    return false;
  }
  const pattern = effectiveMainWorkPatternForIntent(ex);
  if (primary === "hypertrophy" || primary === "body_recomp") {
    if (!(ex.modality === "hypertrophy" || ex.modality === "strength")) return false;
    const set = new Set(["push", "pull", "squat", "hinge", "rotate"]);
    return set.has(pattern);
  }
  if (!(ex.modality === "strength" || ex.modality === "power")) return false;
  const set = new Set(["squat", "hinge", "push", "pull"]);
  return set.has(pattern);
}

export function isPowerStyleSportIntentEntry(entry: IntentEntry): boolean {
  return entry.kind === "sport_sub_focus" && isSpeedAgilityPowerStyleSubFocusSlug(entry.slug);
}

export function mainWorkPrimaryForIntentEntry(entry: IntentEntry, sessionPrimary: PrimaryGoal): PrimaryGoal {
  if (isPowerStyleSportIntentEntry(entry)) return "power";
  if (sessionPrimary === "athletic_performance") return "strength";
  if (sessionPrimary === "body_recomp") return "body_recomp";
  return sessionPrimary;
}

export type LeafSlotAllocation = { leafIndex: number; entry: IntentEntry; slots: number }[];

/**
 * Proportional integer slots per leaf for `totalSlots` using leaf weights.
 */
export function allocateSlotsAcrossLeaves(leaves: IntentEntry[], totalSlots: number): LeafSlotAllocation {
  if (totalSlots <= 0 || leaves.length === 0) return [];
  const keys = leaves.map((_, i) => String(i));
  const weights = leaves.map((l) => l.weight);
  const alloc = allocateSlotsBySubFocusWeights(keys, weights, totalSlots);
  const out: LeafSlotAllocation = [];
  for (let i = 0; i < leaves.length; i++) {
    const slots = alloc.get(String(i)) ?? 0;
    if (slots > 0) out.push({ leafIndex: i, entry: leaves[i]!, slots });
  }
  return out;
}
