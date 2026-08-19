/**
 * Canonical session body contract for Region / Pattern / Muscle days.
 *
 * Region → hard movement-family gate (upper / lower / full / core).
 * Pattern → hard push / pull / legs (or optional quad / posterior) / full / core family (not a single muscle).
 * Muscle → hard primary-muscle gate (Chest day must be chest work, Back day back, …).
 *
 * Spread may keep conflicting sub-goal slugs for scoring, but it must not
 * rewrite this contract to full_body. Generation never invents a muscle day
 * from a region pick (Upper in Muscle mode is still Upper, not Chest).
 */

import type { FocusBodyPart } from "../logic/workoutGeneration/types";
import { dayBodyFocusToRegion } from "./subFocusBodyRegion";
import {
  muscleSplitEmphasisFromFocusParts,
  muscleSplitEmphasesFromFocusParts,
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
  /** Set in Muscle mode, on Core days, and for a single combo emphasis. Combo OR-gates use focus parts. */
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
  quad: ["lower", "quad"],
  posterior: ["lower", "posterior"],
  chest: ["upper_push", "chest"],
  back: ["upper_pull", "back"],
  shoulders: ["upper_push", "upper_pull", "shoulders"],
  arms: ["upper_push", "upper_pull", "arms"],
  glutes: ["lower", "posterior", "glutes"],
};

export type SessionBodyChoiceSpec = {
  mode: WeeklyBodyFocusMode;
  choiceId: DayBodyFocusChoiceId;
  focusBodyParts: FocusBodyPart[];
  muscleEmphasis: MuscleSplitEmphasis | null;
};

/** Golden contract for every native Region / Pattern / Muscle chip. */
export const SESSION_BODY_NATIVE_SPECS: SessionBodyChoiceSpec[] = [
  { mode: "region", choiceId: "upper", focusBodyParts: ["upper_push", "upper_pull"], muscleEmphasis: null },
  { mode: "region", choiceId: "lower", focusBodyParts: ["lower"], muscleEmphasis: null },
  { mode: "region", choiceId: "full", focusBodyParts: ["full_body"], muscleEmphasis: null },
  { mode: "region", choiceId: "core", focusBodyParts: ["core"], muscleEmphasis: "core" },
  { mode: "pattern", choiceId: "push", focusBodyParts: ["upper_push"], muscleEmphasis: null },
  { mode: "pattern", choiceId: "pull", focusBodyParts: ["upper_pull"], muscleEmphasis: null },
  { mode: "pattern", choiceId: "legs", focusBodyParts: ["lower", "legs"], muscleEmphasis: null },
  { mode: "pattern", choiceId: "quad", focusBodyParts: ["lower", "quad"], muscleEmphasis: null },
  { mode: "pattern", choiceId: "posterior", focusBodyParts: ["lower", "posterior"], muscleEmphasis: null },
  { mode: "pattern", choiceId: "full", focusBodyParts: ["full_body"], muscleEmphasis: null },
  { mode: "pattern", choiceId: "core", focusBodyParts: ["core"], muscleEmphasis: "core" },
  { mode: "muscle", choiceId: "chest", focusBodyParts: ["upper_push", "chest"], muscleEmphasis: "chest" },
  { mode: "muscle", choiceId: "back", focusBodyParts: ["upper_pull", "back"], muscleEmphasis: "back" },
  { mode: "muscle", choiceId: "shoulders", focusBodyParts: ["upper_push", "upper_pull", "shoulders"], muscleEmphasis: "shoulders" },
  { mode: "muscle", choiceId: "arms", focusBodyParts: ["upper_push", "upper_pull", "arms"], muscleEmphasis: "arms" },
  { mode: "muscle", choiceId: "legs", focusBodyParts: ["lower", "legs"], muscleEmphasis: "legs" },
  { mode: "muscle", choiceId: "glutes", focusBodyParts: ["lower", "posterior", "glutes"], muscleEmphasis: "glutes" },
  { mode: "muscle", choiceId: "full", focusBodyParts: ["full_body"], muscleEmphasis: null },
  { mode: "muscle", choiceId: "core", focusBodyParts: ["core"], muscleEmphasis: "core" },
];

const DAILY_BODY_CHOICE_IDS: ReadonlySet<string> = new Set([
  "upper",
  "lower",
  "full",
  "core",
  "push",
  "pull",
  "legs",
  "quad",
  "posterior",
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
  const out: FocusBodyPart[] = [];
  for (const key of keys) {
    let parts: FocusBodyPart[] = [];
    if (key === "quad") parts = ["lower", "quad"];
    else if (key === "posterior") parts = ["lower", "posterior"];
    else if ((DAILY_BODY_CHOICE_IDS as ReadonlySet<string>).has(key)) {
      parts = focusBodyPartsForChoiceId(key as DayBodyFocusChoiceId);
    }
    for (const p of parts) {
      if (!out.includes(p)) out.push(p);
    }
  }
  return out;
}

export type SessionBodyPrefs = {
  weeklyBodyFocusMode?: WeeklyBodyFocusMode | null;
  targetBody?: TargetBody | null;
  targetModifier?: readonly string[] | null;
  specificBodyFocus?: readonly SpecificBodyFocusKey[] | null;
};

const MUSCLE_SPECIFIC_KEYS = new Set(["chest", "back", "shoulders", "arms", "glutes", "legs"]);
const PATTERN_SPECIFIC_KEYS = new Set(["push", "pull", "quad", "posterior"]);

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
  const comboIds = (prefs.specificBodyFocus ?? []).filter((k) =>
    (DAILY_BODY_CHOICE_IDS as ReadonlySet<string>).has(k)
  ) as DayBodyFocusChoiceId[];
  if (comboIds.length >= 2) {
    const focusBodyParts = [
      ...new Set(comboIds.flatMap((id) => focusBodyPartsForChoiceId(id))),
    ];
    const regions = new Set(comboIds.map((id) => dayBodyFocusToRegion(id)));
    const choiceId = regions.size > 1 ? "full" : comboIds[0]!;
    const muscleEmphases = muscleSplitEmphasesFromFocusParts(focusBodyParts);
    return {
      mode,
      choiceId,
      focusBodyParts,
      muscleEmphasis: muscleEmphases.length === 1 ? muscleEmphases[0]! : null,
    };
  }

  const rawChoice = bodyChoiceIdForBias(
    prefs.targetBody ?? "Full",
    prefs.specificBodyFocus ?? undefined,
    prefs.targetModifier ?? undefined
  );
  const allowed = dayBodyChoiceIdsForMode(mode);
  const nativeToMode = allowed.includes(rawChoice);
  const choiceId = nativeToMode ? rawChoice : degradeChoiceToRegion(rawChoice);

  let focusBodyParts = focusBodyPartsForChoiceId(choiceId);
  // Region Upper/Lower (and region-degraded leftovers) still honor Push/Pull and Quad/Posterior.
  if (!nativeToMode || (mode === "region" && (choiceId === "upper" || choiceId === "lower"))) {
    const fromModifiers = bodyPartFocusKeysToGeneratorFocus(
      deriveBodyPartFocus(prefs.targetBody ?? null, [...(prefs.targetModifier ?? [])])
    );
    if (fromModifiers.length > 0) focusBodyParts = fromModifiers;
    const fromSpecific = specificBodyFocusToGeneratorFocus(prefs.specificBodyFocus);
    // Quad/Posterior stored only as specificBodyFocus must still tighten the hard gate.
    for (const part of fromSpecific) {
      if ((part === "quad" || part === "posterior") && !focusBodyParts.includes(part)) {
        if (!focusBodyParts.includes("lower")) focusBodyParts = ["lower", ...focusBodyParts];
        focusBodyParts = [...focusBodyParts, part];
      }
    }
  }

  // Muscle-native days + any Core day: hard muscle/core matcher.
  // Never invent Chest from Upper in Muscle mode.
  const fromParts = muscleSplitEmphasisFromFocusParts(focusBodyParts);
  const muscleEmphasis =
    choiceId === "core" || (mode === "muscle" && nativeToMode) ? fromParts : null;

  return { mode, choiceId, focusBodyParts, muscleEmphasis };
}

function degradeChoiceToRegion(choiceId: DayBodyFocusChoiceId): DayBodyFocusChoiceId {
  const region = dayBodyFocusToRegion(choiceId);
  if (region === "core") return "core";
  if (region === "upper") return "upper";
  if (region === "lower") return "lower";
  return "full";
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

/** Apply a Region/Pattern/Muscle chip onto daily regen prefs (keeps specificBodyFocus + mode). */
export function dailyOverrideFromBodyChoice(
  choiceId: DayBodyFocusChoiceId,
  mode: WeeklyBodyFocusMode
): Pick<DailyWorkoutPreferences, "bodyRegionBias" | "specificBodyFocus" | "weeklyBodyFocusMode"> {
  const bias = dayBodyFocusChoiceToBias(choiceId);
  return {
    bodyRegionBias: choiceId,
    specificBodyFocus: bias.specificBodyFocus,
    weeklyBodyFocusMode: mode,
  };
}

/**
 * Effective body-focus vocabulary for regen: per-day override wins over week mode.
 * Infers from a body chip when mode was never stored on the override.
 */
export function resolveDailyBodyFocusMode(opts: {
  dailyOverride?: DailyWorkoutPreferences | null;
  weekMode?: WeeklyBodyFocusMode | null;
}): WeeklyBodyFocusMode {
  const fromOverride = opts.dailyOverride?.weeklyBodyFocusMode;
  if (fromOverride) return resolveWeeklyBodyFocusMode(fromOverride);
  if (opts.dailyOverride?.bodyRegionBias && isDailyBodyChoiceId(opts.dailyOverride.bodyRegionBias)) {
    return inferWeeklyBodyFocusMode({
      specificBodyFocus: opts.dailyOverride.specificBodyFocus,
    });
  }
  return resolveWeeklyBodyFocusMode(opts.weekMode);
}

/**
 * Map a daily regen override (chip + leftover specific) to session targetBody/modifiers/specific.
 * Every Region/Pattern/Muscle chip restores specificBodyFocus so the day's identity survives regen.
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
