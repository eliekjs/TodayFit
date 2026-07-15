import type { ConditioningPolicy } from "./cardioIntentPolicyConfig";
import type { BlockFormat, StylePrefs } from "./types";

/** Manual UI labels from `WORKOUT_STYLE_OPTIONS` / `WorkoutStyleKey`. */
export const WORKOUT_STYLE_LABELS = [
  "Compound Strength",
  "Functional / Athletic",
  "Calisthenics Focus",
  "CrossFit-style / HIIT",
  "Cardio Emphasis",
  "Mixed Strength + Conditioning",
] as const;

export type WorkoutStyleLabel = (typeof WORKOUT_STYLE_LABELS)[number];

export type WorkoutStylePolicy = {
  cardioShareBoost: number;
  targetCardioExerciseShareBoost: number;
  preferCircuitSuperset: boolean;
  preferStraightSetsMain: boolean;
  /** When true, require conditioning block if base policy allows it. */
  conditioningForward: boolean;
  /** Passed through to generator superset assembly when defined. */
  wantsSupersets?: boolean;
};

const NEUTRAL: WorkoutStylePolicy = {
  cardioShareBoost: 0,
  targetCardioExerciseShareBoost: 0,
  preferCircuitSuperset: false,
  preferStraightSetsMain: false,
  conditioningForward: false,
};

const STYLE_POLICIES: Record<WorkoutStyleLabel, WorkoutStylePolicy> = {
  "Compound Strength": {
    ...NEUTRAL,
    preferStraightSetsMain: true,
    wantsSupersets: false,
  },
  "Functional / Athletic": {
    cardioShareBoost: 0.06,
    targetCardioExerciseShareBoost: 0.04,
    preferCircuitSuperset: true,
    preferStraightSetsMain: false,
    conditioningForward: false,
    wantsSupersets: true,
  },
  "Calisthenics Focus": {
    cardioShareBoost: 0.03,
    targetCardioExerciseShareBoost: 0.02,
    preferCircuitSuperset: true,
    preferStraightSetsMain: false,
    conditioningForward: false,
    wantsSupersets: true,
  },
  "CrossFit-style / HIIT": {
    cardioShareBoost: 0.12,
    targetCardioExerciseShareBoost: 0.08,
    preferCircuitSuperset: true,
    preferStraightSetsMain: false,
    conditioningForward: true,
    wantsSupersets: true,
  },
  "Cardio Emphasis": {
    cardioShareBoost: 0.15,
    targetCardioExerciseShareBoost: 0.1,
    preferCircuitSuperset: true,
    preferStraightSetsMain: false,
    conditioningForward: true,
    wantsSupersets: true,
  },
  "Mixed Strength + Conditioning": {
    cardioShareBoost: 0.08,
    targetCardioExerciseShareBoost: 0.05,
    preferCircuitSuperset: true,
    preferStraightSetsMain: false,
    conditioningForward: true,
    wantsSupersets: true,
  },
};

function isWorkoutStyleLabel(value: string): value is WorkoutStyleLabel {
  return (WORKOUT_STYLE_LABELS as readonly string[]).includes(value);
}

/**
 * Normalize style labels. UI is single-select; if legacy prefs have multiple,
 * keep the first valid label only.
 */
export function normalizeWorkoutStyleLabels(styles: string[] | undefined): WorkoutStyleLabel[] {
  if (!styles?.length) return [];
  for (const raw of styles) {
    const trimmed = raw.trim();
    if (!trimmed || !isWorkoutStyleLabel(trimmed)) continue;
    return [trimmed];
  }
  return [];
}

/**
 * Resolve policy for the selected style (at most one).
 * Empty selection → neutral (no change to generator defaults).
 */
export function resolveWorkoutStylePolicy(styles: string[] | undefined): WorkoutStylePolicy {
  const labels = normalizeWorkoutStyleLabels(styles);
  if (labels.length === 0) return { ...NEUTRAL };
  return { ...STYLE_POLICIES[labels[0]!] };
}

function clamp01(value: number): number {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

type ConditioningBlockFormat = ConditioningPolicy["preferredMainFormats"][number];

function preferCircuitSupersetFormats(formats: ConditioningBlockFormat[]): ConditioningBlockFormat[] {
  const rest = formats.filter((format) => format !== "circuit" && format !== "superset");
  return ["circuit", "superset", ...rest];
}

function preferStraightSetsFormats(formats: ConditioningBlockFormat[]): ConditioningBlockFormat[] {
  const rest = formats.filter((format) => format !== "straight_sets");
  return ["straight_sets", ...rest];
}

export function applyWorkoutStyleToPolicy(
  policy: ConditioningPolicy,
  stylePolicy: WorkoutStylePolicy
): ConditioningPolicy {
  const hasBoost =
    stylePolicy.cardioShareBoost > 0 ||
    stylePolicy.targetCardioExerciseShareBoost > 0 ||
    stylePolicy.preferCircuitSuperset ||
    stylePolicy.preferStraightSetsMain ||
    stylePolicy.conditioningForward;

  if (!hasBoost) return policy;

  let preferredMainFormats = policy.preferredMainFormats;
  let preferredConditioningFormats = policy.preferredConditioningFormats;
  if (stylePolicy.preferCircuitSuperset) {
    preferredMainFormats = preferCircuitSupersetFormats(preferredMainFormats);
    preferredConditioningFormats = preferCircuitSupersetFormats(preferredConditioningFormats);
  } else if (stylePolicy.preferStraightSetsMain) {
    preferredMainFormats = preferStraightSetsFormats(preferredMainFormats);
  }

  return {
    ...policy,
    sessionCardioShare: clamp01(policy.sessionCardioShare + stylePolicy.cardioShareBoost),
    targetCardioExerciseShare: clamp01(
      policy.targetCardioExerciseShare + stylePolicy.targetCardioExerciseShareBoost
    ),
    preferredMainFormats,
    preferredConditioningFormats,
    conditioningRequired:
      policy.conditioningRequired ||
      (stylePolicy.conditioningForward && policy.allowConditioningBlock),
    allowConditioningBlock:
      policy.allowConditioningBlock || stylePolicy.conditioningForward,
  };
}

/** Style labels that nudge session feel toward sports training (Slice A companion). */
export function workoutStyleFeelScoreBoost(styles: string[] | undefined): number {
  const label = normalizeWorkoutStyleLabels(styles)[0];
  if (!label) return 0;
  if (label === "Functional / Athletic") return 0.12;
  if (label === "CrossFit-style / HIIT" || label === "Mixed Strength + Conditioning") return 0.1;
  if (label === "Cardio Emphasis") return 0.08;
  return 0;
}

export function buildStylePrefsWorkoutFields(
  workoutStyle: string[] | undefined
): Pick<StylePrefs, "workout_styles" | "wants_supersets"> {
  const workout_styles = normalizeWorkoutStyleLabels(workoutStyle);
  if (workout_styles.length === 0) return {};
  const policy = resolveWorkoutStylePolicy(workout_styles);
  return {
    workout_styles,
    ...(policy.wantsSupersets !== undefined ? { wants_supersets: policy.wantsSupersets } : {}),
  };
}
