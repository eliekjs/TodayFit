/**
 * Canonical session body contract for Region / Pattern / Muscle days.
 *
 * Region → hard movement-family gate (upper / lower / full / core).
 * Pattern → hard push / pull / legs / core family (not a single muscle).
 * Muscle → hard primary-muscle gate (chest day must be chest work).
 *
 * Spread may keep conflicting sub-goal slugs for scoring, but it must not
 * rewrite this contract to full_body.
 */

import type { FocusBodyPart } from "../logic/workoutGeneration/types";
import { dayBodyFocusToRegion } from "./subFocusBodyRegion";
import {
  muscleSplitEmphasisFromFocusParts,
  type MuscleSplitEmphasis,
} from "./splitMuscleMatching";
import type {
  DailyWorkoutPreferences,
  ManualPreferences,
  SpecificBodyFocusKey,
  TargetBody,
  WeeklyBodyFocusMode,
} from "./types";
import { mapBodyResolutionToMode } from "./bodyFocusModeOverride";
import {
  bodyChoiceIdForBias,
  dayBodyChoiceIdsForMode,
  dayBodyFocusChoiceToBias,
  resolveWeeklyBodyFocusMode,
  type DayBodyFocusChoiceId,
} from "./weekDaySessionFocus";
import { deriveBodyPartFocus } from "./preferencesConstants";

export type SessionBodyContract = {
  mode: WeeklyBodyFocusMode;
  choiceId: DayBodyFocusChoiceId;
  focusBodyParts: FocusBodyPart[];
  /** Set only in Muscle mode (and glutes in Muscle). Pattern/Region stay null. */
  muscleEmphasis: MuscleSplitEmphasis | null;
};

const CHOICE_TO_FOCUS: Record<DayBodyFocusChoiceId, FocusBodyPart[]> = {
  upper: ["upper_push", "upper_pull"],
  lower: ["lower"],
  full: ["full_body"],
  core: ["core"],
  push: ["upper_push"],
  pull: ["upper_pull"],
  legs: ["lower", "legs"],
  chest: ["upper_push", "chest"],
  back: ["upper_pull", "back"],
  shoulders: ["upper_push", "upper_pull", "shoulders"],
  arms: ["upper_push", "upper_pull", "arms"],
  glutes: ["lower", "posterior", "glutes"],
};

const DAILY_BODY_CHOICE_IDS: ReadonlySet<string> = new Set([
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

/** Collapse a leftover Pattern/Muscle id into the active vocabulary. */
export function clampBodyChoiceToMode(
  choiceId: DayBodyFocusChoiceId,
  mode: WeeklyBodyFocusMode
): DayBodyFocusChoiceId {
  const allowed = dayBodyChoiceIdsForMode(mode);
  if (allowed.includes(choiceId)) return choiceId;
  if (mode === "region") {
    const region = dayBodyFocusToRegion(choiceId);
    if (region === "core") return "core";
    if (region === "upper") return "upper";
    if (region === "lower") return "lower";
    return "full";
  }
  return mapBodyResolutionToMode(choiceId, mode);
}

function bodyPartFocusKeysToGeneratorFocus(keys: string[]): FocusBodyPart[] {
  if (keys.includes("Full body")) return ["full_body"];
  if (keys.includes("Upper body")) {
    if (keys.includes("Push") && !keys.includes("Pull")) return ["upper_push"];
    if (keys.includes("Pull") && !keys.includes("Push")) return ["upper_pull"];
    return ["upper_push", "upper_pull"];
  }
  if (keys.includes("Lower body")) {
    const base: FocusBodyPart[] = ["lower"];
    if (keys.includes("Quad") && !keys.includes("Posterior")) base.push("quad");
    if (keys.includes("Posterior") && !keys.includes("Quad")) base.push("posterior");
    return base;
  }
  if (keys.includes("Core") && !keys.includes("Upper body") && !keys.includes("Lower body")) {
    return ["core"];
  }
  return [];
}

/** Hard generator focus for a day choice in its native vocabulary. */
export function focusBodyPartsForChoiceId(choiceId: DayBodyFocusChoiceId): FocusBodyPart[] {
  return [...CHOICE_TO_FOCUS[choiceId]];
}

/**
 * Map Pattern/Muscle specific keys to generator focus_body_parts.
 * Muscle tags (chest, back, …) are hard eligibility, not scoring-only.
 */
export function specificBodyFocusToGeneratorFocus(
  keys: readonly SpecificBodyFocusKey[] | null | undefined
): FocusBodyPart[] {
  if (!keys?.length) return [];
  const key = keys[0]!;
  if (key === "quad") return ["lower", "quad"];
  if (key === "posterior") return ["lower", "posterior"];
  if ((DAILY_BODY_CHOICE_IDS as ReadonlySet<string>).has(key)) {
    return focusBodyPartsForChoiceId(key as DayBodyFocusChoiceId);
  }
  return [];
}

export type SessionBodyPrefs = {
  weeklyBodyFocusMode?: WeeklyBodyFocusMode | null;
  targetBody?: TargetBody | null;
  targetModifier?: readonly string[] | null;
  specificBodyFocus?: readonly SpecificBodyFocusKey[] | null;
};

const MUSCLE_SPECIFIC_KEYS = new Set(["chest", "back", "shoulders", "arms", "glutes"]);
const PATTERN_SPECIFIC_KEYS = new Set(["push", "pull", "legs"]);

/**
 * Prefer the stored week mode. If it was never set, infer from specificBodyFocus so
 * a Chest pick still hard-filters even when `weeklyBodyFocusMode` is missing.
 */
export function inferWeeklyBodyFocusMode(prefs: SessionBodyPrefs): WeeklyBodyFocusMode {
  if (prefs.weeklyBodyFocusMode) return resolveWeeklyBodyFocusMode(prefs.weeklyBodyFocusMode);
  const specific = prefs.specificBodyFocus?.[0];
  if (specific && MUSCLE_SPECIFIC_KEYS.has(specific)) return "muscle";
  if (specific && PATTERN_SPECIFIC_KEYS.has(specific)) return "pattern";
  return "region";
}

export function resolveSessionBodyContract(prefs: SessionBodyPrefs): SessionBodyContract {
  const mode = inferWeeklyBodyFocusMode(prefs);
  const rawChoice = bodyChoiceIdForBias(
    prefs.targetBody ?? "Full",
    prefs.specificBodyFocus ?? undefined,
    prefs.targetModifier ?? undefined
  );
  const choiceId = clampBodyChoiceToMode(rawChoice, mode);

  let focusBodyParts = focusBodyPartsForChoiceId(choiceId);
  // Region Upper/Lower still honor Push/Pull and Quad/Posterior modifiers.
  if (mode === "region" && (choiceId === "upper" || choiceId === "lower")) {
    const fromModifiers = bodyPartFocusKeysToGeneratorFocus(
      deriveBodyPartFocus(prefs.targetBody ?? null, [...(prefs.targetModifier ?? [])])
    );
    if (fromModifiers.length > 0) focusBodyParts = fromModifiers;
  }

  const muscleEmphasis =
    mode === "muscle" ? muscleSplitEmphasisFromFocusParts(focusBodyParts) : null;

  return { mode, choiceId, focusBodyParts, muscleEmphasis };
}

export function resolveSessionBodyContractFromManual(
  preferences: ManualPreferences
): SessionBodyContract {
  return resolveSessionBodyContract(preferences);
}

/** Regen chip vocabulary for the active week body-focus mode. */
export function dailyBodyChoiceIdsForMode(mode: WeeklyBodyFocusMode): DayBodyFocusChoiceId[] {
  return dayBodyChoiceIdsForMode(mode);
}

export function isDailyBodyChoiceId(value: string | null | undefined): value is DayBodyFocusChoiceId {
  return Boolean(value && DAILY_BODY_CHOICE_IDS.has(value));
}

/** Apply a Region/Pattern/Muscle chip onto daily regen prefs (keeps specificBodyFocus). */
export function dailyOverrideFromBodyChoice(
  choiceId: DayBodyFocusChoiceId
): Pick<DailyWorkoutPreferences, "bodyRegionBias" | "specificBodyFocus"> {
  const bias = dayBodyFocusChoiceToBias(choiceId);
  return {
    bodyRegionBias: choiceId,
    specificBodyFocus: bias.specificBodyFocus,
  };
}

/**
 * Map a daily regen override (chip + leftover specific) to session targetBody/modifiers/specific.
 * Chest/core chips restore specificBodyFocus so muscle/core days survive regeneration.
 */
export function sessionBiasFromDailyBodyOverride(prefs: DailyWorkoutPreferences | null | undefined): {
  targetBody: TargetBody;
  targetModifier: string[];
  specificBodyFocus?: SpecificBodyFocusKey[];
} | undefined {
  if (!prefs) return undefined;
  if (prefs.bodyRegionBias && isDailyBodyChoiceId(prefs.bodyRegionBias)) {
    const bias = dayBodyFocusChoiceToBias(prefs.bodyRegionBias);
    return {
      targetBody: bias.targetBody,
      targetModifier: [...bias.targetModifier],
      specificBodyFocus: bias.specificBodyFocus,
    };
  }
  if (prefs.specificBodyFocus?.length) {
    const fromSpecific = specificBodyFocusToGeneratorFocus(prefs.specificBodyFocus);
    if (fromSpecific.includes("core")) {
      return { targetBody: "Full", targetModifier: [], specificBodyFocus: ["core"] };
    }
    const choice = bodyChoiceIdForBias("Full", prefs.specificBodyFocus);
    const bias = dayBodyFocusChoiceToBias(choice);
    return {
      targetBody: bias.targetBody,
      targetModifier: [...bias.targetModifier],
      specificBodyFocus: bias.specificBodyFocus,
    };
  }
  return undefined;
}
