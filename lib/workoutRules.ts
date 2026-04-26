/**
 * Shared workout generation rules used by both lib/generator and logic/workoutGeneration.
 * No React or DB dependencies.
 */

/** Equipment allowed in warm-ups / activation: easy bodyweight prep and bands only. No weights, cables, machines, rings, or pull-up bar. */
export const WARMUP_ALLOWED_EQUIPMENT = new Set<string>([
  "bodyweight",
  "bands",
  "resistance_band",
  "miniband",
]);

export function isWarmupEligibleEquipment(equipment: string[]): boolean {
  if (!equipment.length) return false;
  const normalized = equipment.map((eq) => eq.toLowerCase().replace(/\s/g, "_"));
  return normalized.every((eq) => WARMUP_ALLOWED_EQUIPMENT.has(eq));
}

/** Equipment allowed in cooldown: stretching/mobility only. No cables, weights, or strength machines. */
export const COOLDOWN_ALLOWED_EQUIPMENT = new Set<string>([
  "bodyweight",
  "bands",
  "resistance_band",
  "rings",
  "pullup_bar",
  "foam_roller",
  "miniband",
]);

export function isCooldownEligibleEquipment(equipment: string[]): boolean {
  if (!equipment.length) return false;
  const normalized = equipment.map((eq) => eq.toLowerCase().replace(/\s/g, "_"));
  return normalized.every((eq) => COOLDOWN_ALLOWED_EQUIPMENT.has(eq));
}

/** Body recomp: high volume rep range. */
export const BODY_RECOMP_REP_RANGE = { min: 10, max: 15 } as const;

/** Body recomp: cardio finisher duration (minutes). */
export const BODY_RECOMP_CARDIO_DURATION_MIN = 20;
export const BODY_RECOMP_CARDIO_DURATION_MAX = 40;

/**
 * Zone 2 heart rate guidance (research-based).
 * Classic: 60–70% max HR; alternative: 70–80% of lactate threshold HR (LTHR) if tested.
 * Also: conversational pace, nose breathing, RPE ~3–4/10.
 */
export const ZONE2_HR_GUIDANCE =
  "Target 60–70% max HR or conversational pace (you can speak in short sentences). If you use LTHR: aim for 70–80% of LTHR. RPE ~3–4/10.";

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

/** Warmup should total 5–10 minutes. Keep item count and per-item time in check. */
export const WARMUP_TARGET_MINUTES = { min: 5, max: 10 } as const;

/** Never cue a single non-cardio move for more than 5 minutes (cardio machines can be longer). */
export const MAX_NON_CARDIO_CUE_SECONDS = 5 * 60;

/** In warmup, cap any single item at 5 min so total warmup stays 5–10 min. */
export const WARMUP_ITEM_MAX_SECONDS = 5 * 60;

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

/**
 * Max consecutive exercises from the same "similar exercise" cluster (e.g. deadlift family).
 * Avoids cueing 3+ deadlift variants in a row (conventional, RDL, trap bar, deficit, snatch grip, etc.).
 */
export const MAX_CONSECUTIVE_SAME_CLUSTER = 2;

/**
 * Exercise IDs that belong to the "deadlift family": conventional, sumo, deficit, snatch grip,
 * trap bar, stiff-leg, RDL (barbell/dumbbell/KB), suitcase, etc. Barbell deadlift is the
 * overall category; these variants are treated as extremely similar for ordering.
 */
const DEADLIFT_FAMILY_IDS = new Set([
  "barbell_deadlift",
  "trap_bar_deadlift",
  "sumo_deadlift",
  "stiff_leg_deadlift",
  "deficit_deadlift",
  "snatch_grip_deadlift",
  "kb_deadlift",
  "kb_sumo_deadlift",
  "suitcase_deadlift",
  "barbell_rdl",
  "rdl_dumbbell",
  "rack_pull",
]);

/** Battle rope variants: same implement, different names; do not suggest as swaps for each other. */
const BATTLE_ROPE_FAMILY_IDS = new Set([
  "battle_ropes",
  "battle_rope_waves",
]);

/**
 * Returns a cluster id for "extremely similar" exercises. Same cluster => avoid 3+ in a row.
 * Deadlift variants (including RDL, trap bar, deficit, snatch grip) share "deadlift_family";
 * battle rope variants share "battle_rope_family"; others use their own id.
 */
export function getSimilarExerciseClusterId(exercise: { id: string }): string {
  const id = exercise.id.toLowerCase().replace(/\s/g, "_");
  if (DEADLIFT_FAMILY_IDS.has(id)) return "deadlift_family";
  if (BATTLE_ROPE_FAMILY_IDS.has(id)) return "battle_rope_family";
  return exercise.id;
}

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
// Joint-stress tag values use canonical slugs from lib/ontology (JOINT_STRESS_TAGS).

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

/** Injury → joint_stress tags to avoid (canonical slugs; see lib/ontology JOINT_STRESS_TAGS). Includes legacy "shoulder_extension" for backward compat. */
export const INJURY_AVOID_TAGS: Record<string, string[]> = {
  shoulder: [
    "shoulder_overhead",
    "shoulder_extension_load",
    "shoulder_extension",
    "shoulder_abduction_load",
    "shoulder_external_rotation_load",
    "grip_hanging",
  ],
  rotator_cuff_irritation: [
    "shoulder_overhead",
    "shoulder_extension_load",
    "shoulder_extension",
    "shoulder_abduction_load",
    "shoulder_external_rotation_load",
    "grip_hanging",
  ],
  shoulder_overhead: ["shoulder_overhead", "grip_hanging"],
  knee: ["knee_flexion", "deep_knee_flexion"],
  knee_pain: ["knee_flexion", "deep_knee_flexion"],
  lower_back: ["lumbar_shear", "spinal_axial_load", "lumbar_flexion_load"],
  low_back_sensitive: ["lumbar_shear", "spinal_axial_load", "lumbar_flexion_load"],
  elbow: ["elbow_stress"],
  wrist: ["wrist_stress", "wrist_extension_load"],
  hip: ["hip_stress"],
  ankle: ["ankle_stress"],
};

/** Exercise IDs/slugs to always exclude from generation (e.g. user-disliked). */
export const BLOCKED_EXERCISE_IDS = new Set<string>(["prone_y_raise"]);

function normalizeExerciseIdentity(value: string | undefined): string {
  return (value ?? "").toLowerCase().replace(/-/g, "_").replace(/\s+/g, "_");
}

/**
 * Global exercise hard-block policy.
 * - Explicit IDs in `BLOCKED_EXERCISE_IDS`
 * - Any "start stop" variation by id/name (user preference)
 * - Opaque legacy abbreviations (e.g. "non cm") should never surface user-facing
 */
export function isBlockedExercise(exercise: { id?: string; name?: string }): boolean {
  const id = normalizeExerciseIdentity(exercise.id);
  if (id && BLOCKED_EXERCISE_IDS.has(id)) return true;
  const identity = `${id} ${normalizeExerciseIdentity(exercise.name)}`;
  if (/(?:^|_)start_stop(?:_|$)|\bstart_stop\b/.test(identity)) return true;
  if (/(?:^|_)non[_\s-]*cm(?:_|$|\b)/.test(identity)) return true;
  return false;
}

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
