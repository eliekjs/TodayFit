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
import {
  isSpeedAgilityPowerStyleSubFocusSlug,
} from "../../data/sportSubFocus/speedAgilitySubFocusShared";
import {
  isExplosivePlyometricSportSubFocusSlug,
  isStabilityPrehabSportSubFocusSlug,
  isEnduranceConditioningSportSubFocusSlug,
  tagSetHasDynamicPowerSignal,
} from "../../data/sportSubFocus/subFocusIntentArchetypes";
import {
  exerciseHasLowerBodyPlyoJumpSignal,
  exerciseIsMedBallPowerThrow,
  isVerticalJumpSubFocusSlug,
} from "../../data/sportSubFocus/verticalJumpSubFocusShared";
import {
  exercisePassesSubFocusTrainingGate,
  normalizeSubFocusSlug,
  sessionSuppressesAccessoryBlocks,
} from "../../data/sportSubFocus/subFocusIntentRegistry";
import { isAssessmentExercise } from "./blockSelectionEligibility";

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
    case "recovery_mobility":
    case "mobility":
      return "recovery_mobility";
    case "joint_health":
      return "joint_health";
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

function exerciseTagSet(ex: Exercise): Set<string> {
  const out = new Set<string>();
  const add = (s: string | undefined) => {
    if (s) out.add(tagToSlug(s));
  };
  for (const t of ex.tags.goal_tags ?? []) add(t);
  for (const t of ex.tags.sport_tags ?? []) add(t);
  for (const t of ex.tags.stimulus ?? []) add(t);
  for (const t of ex.tags.attribute_tags ?? []) add(t);
  for (const t of ex.muscle_groups ?? []) add(t);
  add(ex.movement_pattern);
  add(ex.pairing_category);
  return out;
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
  if (entry.kind !== "sport_sub_focus" && entry.kind !== "goal_sub_focus") return false;
  const slug = normalizeSubFocusSlug(entry.slug);
  return isSpeedAgilityPowerStyleSubFocusSlug(slug) || isExplosivePlyometricSportSubFocusSlug(slug);
}

export function isStabilityPrehabSportIntentEntry(entry: IntentEntry): boolean {
  return entry.kind === "sport_sub_focus" && isStabilityPrehabSportSubFocusSlug(entry.slug);
}

/**
 * True for sport sub-focus entries that should be served by a dedicated conditioning block
 * (tempo, intervals, aerobic base, marathon pace, etc.) rather than a main compound slot.
 */
export function isEnduranceConditioningSportIntentEntry(entry: IntentEntry): boolean {
  return entry.kind === "sport_sub_focus" && isEnduranceConditioningSportSubFocusSlug(entry.slug);
}

/**
 * True for sport sub-focus entries that require their own dedicated block (conditioning or
 * prehab) and should NOT compete for main compound slots.
 */
export function isNonMainWorkSportIntentEntry(entry: IntentEntry): boolean {
  return isStabilityPrehabSportIntentEntry(entry) || isEnduranceConditioningSportIntentEntry(entry);
}

const DYNAMIC_SPORT_MAIN_PATTERNS = new Set([
  "squat",
  "hinge",
  "push",
  "pull",
  "rotate",
  "locomotion",
]);

/**
 * Speed/COD/plyo sport sub-focuses may use conditioning or power drills (not only barbell strength).
 * Requires dynamic-movement tag evidence (Phase 9) so balance-only accessories do not fill slots.
 */
export function isDynamicSportSubFocusMainWorkCandidate(ex: Exercise, entry: IntentEntry): boolean {
  if (entry.kind !== "sport_sub_focus" && entry.kind !== "goal_sub_focus") return false;
  const slug = normalizeSubFocusSlug(entry.slug);
  if (!isPowerStyleSportIntentEntry(entry) && !isExplosivePlyometricSportSubFocusSlug(slug)) {
    return false;
  }
  if (isAssessmentExercise(ex)) return false;
  if (ex.exercise_role && MAIN_WORK_EXCLUDED_ROLES.has(ex.exercise_role.toLowerCase().replace(/\s/g, "_"))) {
    return false;
  }
  if (!(ex.modality === "power" || ex.modality === "strength" || ex.modality === "conditioning")) {
    return false;
  }
  if (!exercisePassesSubFocusTrainingGate(ex, slug)) return false;
  const tags = exerciseTagSet(ex);
  if (isVerticalJumpSubFocusSlug(slug)) {
    if (exerciseIsMedBallPowerThrow(ex)) return false;
    if (!exerciseHasLowerBodyPlyoJumpSignal(ex)) return false;
  } else if (!tagSetHasDynamicPowerSignal(tags)) {
    return false;
  }
  const role = (ex.exercise_role ?? "").toLowerCase().replace(/\s/g, "_");
  const hasJumpOrReactiveSignal =
    tags.has("plyometric") || tags.has("jumping") || tags.has("reactive_power");
  if (role === "main_compound" && ex.modality !== "power" && !hasJumpOrReactiveSignal) {
    return false;
  }
  const pattern = effectiveMainWorkPatternForIntent(ex);
  return DYNAMIC_SPORT_MAIN_PATTERNS.has(pattern);
}

export function isMainWorkCandidateForIntentEntry(
  ex: Exercise,
  entry: IntentEntry,
  primary: PrimaryGoal
): boolean {
  if (isStabilityPrehabSportIntentEntry(entry)) return false;
  if (isEnduranceConditioningSportIntentEntry(entry)) return false;
  if (
    (entry.kind === "sport_sub_focus" || entry.kind === "goal_sub_focus") &&
    isPowerStyleSportIntentEntry(entry)
  ) {
    return isDynamicSportSubFocusMainWorkCandidate(ex, entry);
  }
  return isIntentMainWorkCandidate(ex, primary);
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

/**
 * When multiple sport power/COD sub-focuses are selected, guarantee each at least one slot
 * so both appear as separate intent blocks (e.g. repeat sprint + deceleration).
 */
export function rebalanceAllocMinOneSlotPerPowerLeaf(
  leaves: IntentEntry[],
  alloc: Map<string, number>
): Map<string, number> {
  const powerLeafIndices = leaves
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => entry.kind === "sport_sub_focus" && isPowerStyleSportIntentEntry(entry));
  if (powerLeafIndices.length < 2) return alloc;

  const out = new Map(alloc);
  for (const { index } of powerLeafIndices) {
    const key = String(index);
    if ((out.get(key) ?? 0) >= 1) continue;

    let donorKey: string | null = null;
    let donorSlots = 0;
    for (let j = 0; j < leaves.length; j++) {
      const donorEntry = leaves[j]!;
      if (donorEntry.kind === "sport_sub_focus" && isPowerStyleSportIntentEntry(donorEntry)) {
        continue;
      }
      const dk = String(j);
      const slots = out.get(dk) ?? 0;
      if (slots > 1 && slots > donorSlots) {
        donorSlots = slots;
        donorKey = dk;
      }
    }
    if (donorKey == null) continue;
    out.set(donorKey, (out.get(donorKey) ?? 0) - 1);
    out.set(key, 1);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Unified slot plan — covers ALL leaf archetypes proportionally
// ---------------------------------------------------------------------------

/**
 * How a particular intent leaf should be served in the workout.
 * - "main_compound"  → strength/hypertrophy block (straight sets or superset)
 * - "conditioning"   → conditioning block (circuit for high-intensity, straight sets for base)
 * - "prehab"         → accessory/stability block
 * - "power"          → power block (circuit or straight sets with explosive focus)
 */
export type IntentLeafArchetype = "main_compound" | "conditioning" | "prehab" | "power";

export function classifyLeafArchetype(entry: IntentEntry): IntentLeafArchetype {
  if (isStabilityPrehabSportIntentEntry(entry)) return "prehab";
  if (isPowerStyleSportIntentEntry(entry)) return "power";
  if (isEnduranceConditioningSportIntentEntry(entry)) return "conditioning";
  return "main_compound";
}

export type IntentSlotPlanEntry = {
  entry: IntentEntry;
  archetype: IntentLeafArchetype;
  /** Exercise slots allocated to this leaf (proportional to weight, sums to totalSlots). */
  slots: number;
};

/**
 * Compute a unified slot plan: allocate all working-exercise slots across ALL intent
 * leaves proportionally, classifying each leaf by its training archetype.
 *
 * This is the single source of truth for slot counts in multi-intent sessions — both
 * main-compound blocks and specialty blocks (conditioning, prehab, power) draw from
 * this budget so the total is always exactly `totalSlots`.
 */
export function buildUnifiedIntentSlotPlan(
  leaves: IntentEntry[],
  totalSlots: number
): IntentSlotPlanEntry[] {
  if (leaves.length === 0 || totalSlots <= 0) return [];
  const alloc = allocateSlotsAcrossLeaves(leaves, totalSlots);
  return alloc.map(({ entry, slots }) => ({
    entry,
    archetype: classifyLeafArchetype(entry),
    slots,
  }));
}

/** Prehab/accessory intent slots are omitted when session archetype suppresses accessory blocks. */
export function shouldAllocatePrehabAccessorySlots(
  input: { session_intent?: { ranked_intent_entries?: IntentEntry[] }; sport_sub_focus?: Record<string, string[] | undefined>; goal_sub_focus?: Record<string, string[] | undefined>; primary_goal?: string; secondary_goals?: string[] }
): boolean {
  return !sessionSuppressesAccessoryBlocks(input);
}
