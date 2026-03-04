/**
 * Shared workout generation rules used by both lib/generator and logic/workoutGeneration.
 * No React or DB dependencies.
 */

/** Equipment allowed in warm-ups: bodyweight and bands only (activation/mobility, no weights). */
export const WARMUP_ALLOWED_EQUIPMENT = new Set<string>([
  "bodyweight",
  "bands",
  "resistance_band",
]);

export function isWarmupEligibleEquipment(equipment: string[]): boolean {
  if (!equipment.length) return false;
  const normalized = equipment.map((eq) => eq.toLowerCase().replace(/\s/g, "_"));
  return normalized.every((eq) => WARMUP_ALLOWED_EQUIPMENT.has(eq));
}

/** Body recomp: high volume rep range. */
export const BODY_RECOMP_REP_RANGE = { min: 10, max: 15 } as const;

/** Body recomp: cardio finisher duration (minutes). */
export const BODY_RECOMP_CARDIO_DURATION_MIN = 20;
export const BODY_RECOMP_CARDIO_DURATION_MAX = 40;

/** Lower-intensity coaching cue for body recomp. */
export const BODY_RECOMP_CUES = {
  strength:
    "Lower intensity. Focus on time under tension and full range of motion.",
  cardio: "Steady, lower-intensity effort. Keep heart rate in target zone.",
} as const;

/**
 * Warmup short cardio: must be first or last in the warmup block, never split.
 * Use 'last' so activation/mobility come first, then optional light cardio.
 */
export const WARMUP_CARDIO_POSITION = "last" as const;

// --- Movement patterns & balance (exercise selection) ---

/** All movement patterns used for diversity and block balance. */
export const MOVEMENT_PATTERNS = [
  "squat",
  "hinge",
  "push",
  "pull",
  "carry",
  "rotate",
  "locomotion",
] as const;

export type MovementPatternKey = (typeof MOVEMENT_PATTERNS)[number];

/** Max times the same movement pattern can appear in a session (avoid push-push-push). */
export const MAX_SAME_PATTERN_PER_SESSION = 2;

/** Minimum movement categories to aim for in a workout (e.g. push + pull + hinge). */
export const MIN_MOVEMENT_CATEGORIES = 3;

/** Patterns that count as "categories" for balance (compound-focused). */
export const BALANCE_CATEGORY_PATTERNS: MovementPatternKey[] = [
  "squat",
  "hinge",
  "push",
  "pull",
];

// --- Injury safety: avoid patterns / tags when user reports injury ---

export type InjuryConstraintKey =
  | "shoulder"
  | "rotator_cuff_irritation"
  | "shoulder_overhead"
  | "knee"
  | "knee_pain"
  | "lower_back"
  | "low_back_sensitive"
  | "elbow"
  | "wrist"
  | "hip"
  | "ankle";

/** Injury → joint_stress / contraindication tags to avoid. */
export const INJURY_AVOID_TAGS: Record<string, string[]> = {
  shoulder: ["shoulder_overhead", "shoulder_extension", "grip_hanging"],
  rotator_cuff_irritation: ["shoulder_overhead", "shoulder_extension", "grip_hanging"],
  shoulder_overhead: ["shoulder_overhead", "grip_hanging"],
  knee: ["knee_flexion"],
  knee_pain: ["knee_flexion"],
  lower_back: ["lumbar_shear"],
  low_back_sensitive: ["lumbar_shear"],
  elbow: ["elbow_stress"],
  wrist: ["wrist_stress"],
  hip: ["hip_stress"],
  ankle: ["ankle_stress"],
};

/** Injury → exercise IDs to exclude (e.g. overhead press for shoulder). */
export const INJURY_AVOID_EXERCISE_IDS: Record<string, string[]> = {
  shoulder: ["oh_press", "db_shoulder_press", "pullup", "dips"],
  rotator_cuff_irritation: ["oh_press", "db_shoulder_press", "pullup", "dips"],
  shoulder_overhead: ["oh_press", "db_shoulder_press"],
  knee: ["barbell_back_squat", "split_squat", "step_up", "jump_squat"],
  knee_pain: ["barbell_back_squat", "split_squat", "step_up", "jump_squat", "leg_press"],
  lower_back: ["barbell_deadlift", "barbell_back_squat", "rdl_dumbbell", "kb_swing"],
  low_back_sensitive: ["barbell_deadlift", "barbell_back_squat", "rdl_dumbbell", "kb_swing", "hip_thrust"],
};

/** Normalize user-reported injury string to key used in INJURY_AVOID_*. */
export function normalizeInjuryKey(input: string): string {
  const s = input.toLowerCase().replace(/\s/g, "_");
  if (s.includes("shoulder")) return "shoulder";
  if (s.includes("knee")) return "knee";
  if (s.includes("back") || s.includes("lumbar")) return "lower_back";
  if (s.includes("elbow")) return "elbow";
  if (s.includes("wrist")) return "wrist";
  if (s.includes("hip")) return "hip";
  if (s.includes("ankle")) return "ankle";
  return s;
}

/** Get all avoid tags for a list of user injuries. */
export function getInjuryAvoidTags(injuries: string[]): Set<string> {
  const out = new Set<string>();
  for (const i of injuries) {
    const key = normalizeInjuryKey(i);
    const tags = INJURY_AVOID_TAGS[key];
    if (tags) tags.forEach((t) => out.add(t));
  }
  return out;
}

/** Get all exercise IDs to exclude for a list of user injuries. */
export function getInjuryAvoidExerciseIds(injuries: string[]): Set<string> {
  const out = new Set<string>();
  for (const i of injuries) {
    const key = normalizeInjuryKey(i);
    const ids = INJURY_AVOID_EXERCISE_IDS[key];
    if (ids) ids.forEach((id) => out.add(id));
  }
  return out;
}

// --- Energy level scaling (shared constants) ---

/** Low energy: reduce sets by this factor. */
export const ENERGY_LOW_SET_FACTOR = 0.75;

/** High energy: increase sets by this factor. */
export const ENERGY_HIGH_SET_FACTOR = 1.25;
