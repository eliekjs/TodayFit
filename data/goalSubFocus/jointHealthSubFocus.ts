/**
 * Joint health sub-focus: PT-inspired strength sessions for joint resilience.
 * Matching uses attribute tags, stimulus, movement patterns, exercise role, and regional signals.
 */

import type { Exercise } from "../../logic/workoutGeneration/types";

export const JOINT_HEALTH_SUB_FOCUS_SLUGS = [
  "knee_health",
  "shoulder_health",
  "hip_health",
  "ankle_foot_health",
  "back_spine_health",
  "elbow_wrist_health",
] as const;

export type JointHealthSubFocusSlug = (typeof JOINT_HEALTH_SUB_FOCUS_SLUGS)[number];

export type JointHealthSlotRole =
  | "activation"
  | "controlled_strength"
  | "stability"
  | "mobility_finisher";

const JOINT_HEALTH_AVOID_STIMULUS = new Set([
  "plyometric",
  "anaerobic",
  "grip", // only avoid when not elbow/wrist focus
]);

const JOINT_HEALTH_AVOID_ATTRIBUTE = new Set([
  "max_strength",
  "power",
  "plyometric",
  "hiit",
  "explosive",
  "olympic",
  "high_impact",
  "high_volume_failure",
]);

const JOINT_HEALTH_AVOID_GOAL_TAGS = new Set([
  "power",
  "conditioning",
]);

const HIGH_STRESS_COMPOUND_IDS = new Set([
  "back_squat",
  "barbell_squat",
  "deadlift",
  "barbell_deadlift",
  "bench_press",
  "barbell_bench_press",
  "overhead_press",
  "barbell_overhead_press",
  "box_jump",
  "burpee",
  "power_clean",
  "snatch",
]);

function toSlug(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
}

function exerciseTagSet(exercise: Exercise): Set<string> {
  const out = new Set<string>();
  const add = (s: string) => out.add(toSlug(s));
  for (const t of exercise.tags?.goal_tags ?? []) add(t);
  for (const t of exercise.tags?.stimulus ?? []) add(t);
  for (const t of exercise.tags?.attribute_tags ?? []) add(t);
  for (const m of exercise.muscle_groups ?? []) add(m);
  if (exercise.movement_pattern) add(exercise.movement_pattern);
  for (const p of exercise.movement_patterns ?? []) add(p);
  if (exercise.pairing_category) add(exercise.pairing_category);
  if (exercise.exercise_role) add(exercise.exercise_role);
  if (exercise.primary_movement_family) add(exercise.primary_movement_family);
  for (const t of exercise.joint_stress_tags ?? []) add(t);
  for (const t of exercise.mobility_targets ?? []) add(t);
  for (const t of exercise.stretch_targets ?? []) add(t);
  return out;
}

/** Hard exclude: max strength, plyos, HIIT, heavy compounds. */
export function isJointHealthExcludedExercise(exercise: Exercise): boolean {
  if (exercise.modality === "power" || exercise.modality === "conditioning") return true;
  if (exercise.difficulty >= 4 && exercise.modality === "strength") return true;
  if (HIGH_STRESS_COMPOUND_IDS.has(toSlug(exercise.id))) return true;

  const tags = exerciseTagSet(exercise);
  if (tags.has("plyometric") || tags.has("olympic") || tags.has("explosive")) return true;
  for (const a of JOINT_HEALTH_AVOID_ATTRIBUTE) {
    if (tags.has(a)) return true;
  }
  for (const g of JOINT_HEALTH_AVOID_GOAL_TAGS) {
    if (tags.has(g)) return true;
  }
  const stim = (exercise.tags?.stimulus ?? []).map(toSlug);
  if (stim.includes("plyometric")) return true;

  const name = exercise.name.toLowerCase();
  if (
    /\b(box jump|burpee|power clean|snatch|sprint|plyo|jump squat|max effort|kettlebell swing|kb swing|swing)\b/.test(name)
  ) {
    return true;
  }
  return false;
}

/** Soft pool: PT-appropriate exercises for joint health sessions. */
export function isJointHealthAppropriateExercise(exercise: Exercise): boolean {
  if (isJointHealthExcludedExercise(exercise)) return false;
  if (exercise.time_cost === "high") return false;

  const modality = exercise.modality;
  if (modality === "mobility" || modality === "recovery") return true;

  const tags = exerciseTagSet(exercise);
  const role = toSlug(exercise.exercise_role ?? "");
  const stim = (exercise.tags?.stimulus ?? []).map(toSlug);

  const prehabRoles = new Set(["prehab", "activation", "accessory", "isolation", "mobility", "stability"]);
  if (prehabRoles.has(role)) return true;

  const supportiveStim = new Set([
    "isometric",
    "scapular_control",
    "trunk_anti_rotation",
    "anti_flexion",
    "eccentric",
    "single_leg",
  ]);
  if (stim.some((s) => supportiveStim.has(s))) return true;

  const supportiveAttrs = new Set([
    "prehab",
    "rehab",
    "joint_health",
    "durability",
    "ankle_stability",
    "hip_stability",
    "core_stability",
    "low_impact",
    "rotator_cuff",
    "scapular_control",
  ]);
  if ([...tags].some((t) => supportiveAttrs.has(t))) return true;

  if (tags.has("recovery") || tags.has("mobility")) return true;
  if (modality === "strength" && exercise.difficulty <= 3) return true;
  if (modality === "hypertrophy" && exercise.difficulty <= 2) return true;

  return false;
}

type RegionalMatchConfig = {
  attributeTags: string[];
  stimulus: string[];
  muscles: string[];
  mobilityTargets: string[];
  nameHints: RegExp[];
};

const JOINT_HEALTH_REGIONAL: Record<JointHealthSubFocusSlug, RegionalMatchConfig> = {
  knee_health: {
    attributeTags: ["knee", "quad_strength", "patellar", "vmo", "terminal_knee_extension"],
    stimulus: ["isometric", "single_leg", "eccentric"],
    muscles: ["quads", "hamstrings", "glutes", "calves"],
    mobilityTargets: ["quads", "hamstrings", "knee", "patellar"],
    nameHints: [/wall sit|spanish squat|step.?down|split squat|copenhagen|terminal knee|tke/i],
  },
  shoulder_health: {
    attributeTags: ["rotator_cuff", "scapular_control", "shoulder_stability", "serratus", "lower_trap"],
    stimulus: ["scapular_control", "isometric"],
    muscles: ["shoulders", "upper_back"],
    mobilityTargets: ["shoulders", "thoracic"],
    nameHints: [/external rotation|face pull|wall slide|serratus|scap|y.?t.?w|landmine/i],
  },
  hip_health: {
    attributeTags: ["hip_stability", "hip_mobility", "glute_med", "adductor", "hip_rotation"],
    stimulus: ["single_leg", "isometric"],
    muscles: ["glutes", "hips", "adductors", "hip_flexors"],
    mobilityTargets: ["hip", "glutes", "hip_flexors"],
    nameHints: [/glute bridge|hip airplane|copenhagen|clam|cossack|90.?90|hip car|lateral walk/i],
  },
  ankle_foot_health: {
    attributeTags: ["ankle_stability", "tibialis", "calf", "foot_intrinsic", "balance"],
    stimulus: ["isometric", "eccentric", "single_leg"],
    muscles: ["calves", "tibialis", "feet"],
    mobilityTargets: ["calves", "ankle", "feet"],
    nameHints: [/calf raise|tibialis|short.?foot|toe yoga|balance|step.?down|inversion|eversion/i],
  },
  back_spine_health: {
    attributeTags: ["core_stability", "anti_rotation", "hip_hinge", "posterior_chain", "thoracic_mobility"],
    stimulus: ["trunk_anti_rotation", "anti_flexion", "isometric", "scapular_control"],
    muscles: ["core", "lower_back", "glutes", "hamstrings"],
    mobilityTargets: ["thoracic", "low_back", "lumbar", "hip"],
    nameHints: [/dead bug|bird dog|pallof|side plank|suitcase|mcgill|open book|hip hinge/i],
  },
  elbow_wrist_health: {
    attributeTags: ["forearm", "grip", "wrist", "tendon_loading", "pronator", "supinator"],
    stimulus: ["grip", "isometric", "eccentric", "scapular_control"],
    muscles: ["forearms", "wrists", "biceps", "triceps"],
    mobilityTargets: ["forearm", "wrist"],
    nameHints: [/wrist curl|farmer|dead hang|pronat|supinat|rice bucket|scapular row/i],
  },
};

export function exerciseMatchesJointHealthSubFocus(
  exercise: Exercise,
  subSlug: string
): boolean {
  const norm = toSlug(subSlug) as JointHealthSubFocusSlug;
  if (!JOINT_HEALTH_SUB_FOCUS_SLUGS.includes(norm)) return false;
  if (!isJointHealthAppropriateExercise(exercise)) return false;

  const cfg = JOINT_HEALTH_REGIONAL[norm];
  const tags = exerciseTagSet(exercise);
  const name = exercise.name;

  for (const a of cfg.attributeTags) {
    if (tags.has(toSlug(a))) return true;
  }
  for (const s of cfg.stimulus) {
    if ((exercise.tags?.stimulus ?? []).map(toSlug).includes(toSlug(s))) return true;
  }
  for (const m of cfg.muscles) {
    if ((exercise.muscle_groups ?? []).map(toSlug).includes(toSlug(m))) return true;
  }
  for (const t of cfg.mobilityTargets) {
    const targets = [...(exercise.mobility_targets ?? []), ...(exercise.stretch_targets ?? [])].map(toSlug);
    if (targets.some((x) => x.includes(toSlug(t)))) return true;
  }
  if (cfg.nameHints.some((rx) => rx.test(name))) return true;

  return false;
}

export function classifyJointHealthSlotRole(exercise: Exercise): JointHealthSlotRole {
  const tags = exerciseTagSet(exercise);
  const role = toSlug(exercise.exercise_role ?? "");
  const stim = (exercise.tags?.stimulus ?? []).map(toSlug);
  const modality = exercise.modality;

  if (modality === "mobility" || modality === "recovery" || role === "activation") {
    return "activation";
  }
  if (stim.includes("isometric") || tags.has("isometric")) {
    return stim.includes("trunk_anti_rotation") || stim.includes("single_leg") ? "stability" : "controlled_strength";
  }
  if (
    stim.includes("trunk_anti_rotation") ||
    stim.includes("single_leg") ||
    exercise.unilateral ||
    tags.has("balance") ||
    tags.has("ankle_stability")
  ) {
    return "stability";
  }
  if (tags.has("mobility") || (exercise.mobility_targets?.length ?? 0) > 0) {
    return "mobility_finisher";
  }
  if (role === "prehab" || tags.has("prehab") || tags.has("activation")) {
    return "activation";
  }
  return "controlled_strength";
}

/** Per-region stress budget: cap high-stress moves per irritated area. */
export function jointHealthStressScore(exercise: Exercise): number {
  let score = 0;
  if (exercise.difficulty >= 3) score += 1;
  if (exercise.modality === "strength" && !exercise.unilateral) score += 1;
  const stim = (exercise.tags?.stimulus ?? []).map(toSlug);
  if (stim.includes("eccentric") && exercise.difficulty >= 2) score += 1;
  return score;
}

export function getJointHealthRegionalConfig(slug: string): RegionalMatchConfig | undefined {
  const norm = toSlug(slug) as JointHealthSubFocusSlug;
  return JOINT_HEALTH_REGIONAL[norm];
}
