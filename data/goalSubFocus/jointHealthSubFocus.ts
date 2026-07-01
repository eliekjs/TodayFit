/**
 * Joint health sub-focus: PT-inspired strength sessions for joint resilience.
 * Matching uses attribute tags, stimulus, movement patterns, exercise role, and regional signals.
 */

import type { Exercise } from "../../logic/workoutGeneration/types";
import {
  ANKLE_FOOT_HEALTH_TAGGED_EXERCISE_IDS,
  BACK_SPINE_HEALTH_TAGGED_EXERCISE_IDS,
  ELBOW_WRIST_HEALTH_TAGGED_EXERCISE_IDS,
  ELBOW_WRIST_HEALTH_TAGGED_EXERCISE_IDS,
  HIP_HEALTH_TAGGED_EXERCISE_IDS,
  KNEE_HEALTH_TAGGED_EXERCISE_IDS,
  SHOULDER_HEALTH_TAGGED_EXERCISE_IDS,
} from "../jointHealthExerciseEnrichment";

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

const JOINT_HEALTH_TAGGED_CATALOG_IDS: ReadonlySet<string> = new Set([
  ...KNEE_HEALTH_TAGGED_EXERCISE_IDS,
  ...SHOULDER_HEALTH_TAGGED_EXERCISE_IDS,
  ...HIP_HEALTH_TAGGED_EXERCISE_IDS,
  ...ANKLE_FOOT_HEALTH_TAGGED_EXERCISE_IDS,
  ...BACK_SPINE_HEALTH_TAGGED_EXERCISE_IDS,
  ...ELBOW_WRIST_HEALTH_TAGGED_EXERCISE_IDS,
]);

/** Curated joint-health enrichment — catalog metadata (e.g. max_strength) must not veto these. */
export function isJointHealthEnrichedCatalogExercise(exercise: Exercise): boolean {
  const id = toSlug(exercise.id);
  if (JOINT_HEALTH_TAGGED_CATALOG_IDS.has(id)) return true;
  const tags = exerciseTagSet(exercise);
  return JOINT_HEALTH_SUB_FOCUS_SLUGS.some((slug) => tags.has(slug));
}

/** Hard exclude: max strength, plyos, HIIT, heavy compounds. */
export function isJointHealthExcludedExercise(exercise: Exercise): boolean {
  const enriched = isJointHealthEnrichedCatalogExercise(exercise);

  if (exercise.modality === "power" || exercise.modality === "conditioning") return true;
  if (!enriched && exercise.difficulty >= 4 && exercise.modality === "strength") return true;
  if (HIGH_STRESS_COMPOUND_IDS.has(toSlug(exercise.id))) return true;

  const tags = exerciseTagSet(exercise);
  if (tags.has("plyometric") || tags.has("olympic") || tags.has("explosive")) return true;
  for (const a of JOINT_HEALTH_AVOID_ATTRIBUTE) {
    if (enriched && (a === "max_strength" || a === "power" || a === "hiit" || a === "explosive")) {
      continue;
    }
    if (tags.has(a)) return true;
  }
  if (!enriched) {
    for (const g of JOINT_HEALTH_AVOID_GOAL_TAGS) {
      if (tags.has(g)) return true;
    }
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

const KNEE_HEALTH_STRONG_ATTRIBUTE_TAGS = new Set([
  "knee_health",
  "knee_activation",
  "knee_strength",
  "knee_stability",
  "knee_mobility",
  "terminal_knee_extension",
  "quad_strength",
  "patellar_tolerance",
  "vmo",
  "step_down",
  "wall_sit",
]);

/** Exercises that must never satisfy knee_health even with shared muscle groups. */
const KNEE_HEALTH_REGIONAL_EXCLUDE_ID_PATTERNS = [
  /^cat_camel|^cat_cow|^cat_camel/,
  /t_spine|tspine|thoracic/,
  /^push_up|^pushup|^dip/,
  /^bench|^db_bench|overhead_press|pullup|pull_up/,
  /worlds?_greatest/,
  /pigeon|thread_needle|open_book/,
];

function isKneeHealthRegionallyExcluded(exercise: Exercise): boolean {
  const id = toSlug(exercise.id);
  if (KNEE_HEALTH_TAGGED_EXERCISE_IDS.has(id)) return false;
  const name = exercise.name.toLowerCase();
  if (KNEE_HEALTH_REGIONAL_EXCLUDE_ID_PATTERNS.some((rx) => rx.test(id) || rx.test(name))) {
    return true;
  }
  const targets = [
    ...(exercise.mobility_targets ?? []),
    ...(exercise.stretch_targets ?? []),
  ].map(toSlug);
  if (
    targets.some((t) => t.includes("thoracic") || t.includes("t_spine")) &&
    !targets.some((t) => t.includes("quad") || t.includes("hamstring") || t.includes("knee"))
  ) {
    return true;
  }
  if (exercise.movement_pattern === "push" && !exercise.unilateral) return true;
  return false;
}

function exerciseMatchesKneeHealthSubFocus(exercise: Exercise): boolean {
  if (!isJointHealthAppropriateExercise(exercise)) return false;
  if (isKneeHealthRegionallyExcluded(exercise)) return false;

  const tags = exerciseTagSet(exercise);
  if (KNEE_HEALTH_TAGGED_EXERCISE_IDS.has(toSlug(exercise.id))) return true;
  for (const t of KNEE_HEALTH_STRONG_ATTRIBUTE_TAGS) {
    if (tags.has(t)) return true;
  }
  const cfg = JOINT_HEALTH_REGIONAL.knee_health;
  if (cfg.nameHints.some((rx) => rx.test(exercise.name))) return true;

  return false;
}

const SHOULDER_HEALTH_STRONG_ATTRIBUTE_TAGS = new Set([
  "shoulder_health",
  "shoulder_activation",
  "shoulder_strength",
  "shoulder_stability",
  "shoulder_mobility",
  "rotator_cuff",
  "scapular_control",
  "shoulder_stability",
  "serratus",
  "lower_trap",
]);

const SHOULDER_HEALTH_REGIONAL_EXCLUDE_ID_PATTERNS = [
  /^bench|^db_bench|barbell_bench|incline_db_press|incline_press/,
  /^dip|^push_up|^pushup/,
  /overhead_press|oh_press|military_press|jerk|snatch|clean/,
  /^pullup|^pull_up|chin_up|muscle_up/,
  /^squat|^lunge|^deadlift|^hip_thrust|^rdl/,
  /^cat_camel|^cat_cow|t_spine|tspine|thoracic/,
  /worlds?_greatest|burpee|box_jump|kb_swing|kettlebell_swing/,
  /dowel|lat_stretch_rocker/,
];

function isShoulderHealthRegionallyExcluded(exercise: Exercise): boolean {
  const id = toSlug(exercise.id);
  if (SHOULDER_HEALTH_TAGGED_EXERCISE_IDS.has(id)) return false;
  if (id === "push_up_plus" || id === "scapular_push_up") return false;
  const name = exercise.name.toLowerCase();
  if (SHOULDER_HEALTH_REGIONAL_EXCLUDE_ID_PATTERNS.some((rx) => rx.test(id) || rx.test(name))) {
    return true;
  }
  const muscle = (exercise.muscle_groups ?? []).map(toSlug);
  if (
    muscle.some((m) => m.includes("quad") || m.includes("hamstring") || m === "legs") &&
    !muscle.some((m) => m.includes("shoulder") || m.includes("upper_back") || m === "push" || m === "pull")
  ) {
    return true;
  }
  return false;
}

function exerciseMatchesShoulderHealthSubFocus(exercise: Exercise): boolean {
  if (!isJointHealthAppropriateExercise(exercise)) return false;
  if (isShoulderHealthRegionallyExcluded(exercise)) return false;

  const tags = exerciseTagSet(exercise);
  if (SHOULDER_HEALTH_TAGGED_EXERCISE_IDS.has(toSlug(exercise.id))) return true;
  for (const t of SHOULDER_HEALTH_STRONG_ATTRIBUTE_TAGS) {
    if (tags.has(t)) return true;
  }
  const cfg = JOINT_HEALTH_REGIONAL.shoulder_health;
  if (cfg.nameHints.some((rx) => rx.test(exercise.name))) return true;

  return false;
}

const HIP_HEALTH_STRONG_ATTRIBUTE_TAGS = new Set([
  "hip_health",
  "hip_activation",
  "hip_strength",
  "hip_mobility",
  "glute_med",
  "adductor",
  "hip_rotation",
]);

const HIP_HEALTH_REGIONAL_EXCLUDE_ID_PATTERNS = [
  /^bench|^db_bench|barbell_bench|incline_db_press|incline_press/,
  /^dip|^push_up|^pushup/,
  /overhead_press|oh_press|military_press|jerk|snatch|clean/,
  /^pullup|^pull_up|chin_up|muscle_up/,
  /^cat_camel|^cat_cow|t_spine|tspine|thoracic/,
  /worlds?_greatest.*battle|battle_rope.*cossack|landmine.*cossack|sandbag.*cossack|clubbell.*cossack|bulgarian_bag.*cossack|macebell.*cossack|plate_overhead.*cossack/,
  /^back_squat|^barbell_squat|^deadlift|^barbell_deadlift|^rdl|barbell_rdl/,
  /burpee|box_jump|kb_swing|kettlebell_swing|plyo/,
  /^bench_press|^leg_extension|^leg_curl/,
  /wall_slide|wall_angel|face_pull|external_rotation|rotator/,
];

function isHipHealthRegionallyExcluded(exercise: Exercise): boolean {
  const id = toSlug(exercise.id);
  if (HIP_HEALTH_TAGGED_EXERCISE_IDS.has(id)) return false;
  const name = exercise.name.toLowerCase();
  if (HIP_HEALTH_REGIONAL_EXCLUDE_ID_PATTERNS.some((rx) => rx.test(id) || rx.test(name))) {
    return true;
  }
  const targets = [
    ...(exercise.mobility_targets ?? []),
    ...(exercise.stretch_targets ?? []),
  ].map(toSlug);
  if (
    targets.some((t) => t.includes("thoracic") || t.includes("shoulder")) &&
    !targets.some((t) => t.includes("hip") || t.includes("glute") || t.includes("adductor"))
  ) {
    return true;
  }
  if (exercise.movement_pattern === "push" && !exercise.unilateral) return true;
  return false;
}

function exerciseMatchesHipHealthSubFocus(exercise: Exercise): boolean {
  if (!isJointHealthAppropriateExercise(exercise)) return false;
  if (isHipHealthRegionallyExcluded(exercise)) return false;

  const tags = exerciseTagSet(exercise);
  if (HIP_HEALTH_TAGGED_EXERCISE_IDS.has(toSlug(exercise.id))) return true;
  for (const t of HIP_HEALTH_STRONG_ATTRIBUTE_TAGS) {
    if (tags.has(t)) return true;
  }
  if (tags.has("hip_stability") && tags.has("hip_health")) return true;
  const cfg = JOINT_HEALTH_REGIONAL.hip_health;
  if (cfg.nameHints.some((rx) => rx.test(exercise.name))) return true;

  return false;
}

const ANKLE_FOOT_HEALTH_STRONG_ATTRIBUTE_TAGS = new Set([
  "ankle_foot_health",
  "ankle_foot_activation",
  "ankle_foot_strength",
  "ankle_foot_mobility",
  "tibialis",
  "foot_intrinsic",
  "calf",
]);

const ANKLE_FOOT_HEALTH_REGIONAL_EXCLUDE_ID_PATTERNS = [
  /^bench|^db_bench|barbell_bench|incline_db_press|incline_press/,
  /^dip|^push_up|^pushup/,
  /overhead_press|oh_press|military_press|jerk|snatch|clean/,
  /^pullup|^pull_up|chin_up|muscle_up/,
  /^cat_camel|^cat_cow|t_spine|tspine|thoracic/,
  /burpee|box_jump|kb_swing|kettlebell_swing|plyo|squat_jump|jump/,
  /cossack|hip_90|90_90|clamshell|fire_hydrant|glute_bridge|hip_airplane|copenhagen/,
  /wall_slide|face_pull|external_rotation|rotator|bench_press/,
  /clubbell|landmine|battle_rope|sandbag|macebell|bulgarian_bag/,
  /split_squat.*calf|isometric_split_squat/,
  /miniband_ankle_lateral_walk|miniband_ankle_monster_walk|miniband_ankle_side_lying/,
];

function isAnkleFootHealthRegionallyExcluded(exercise: Exercise): boolean {
  const id = toSlug(exercise.id);
  if (ANKLE_FOOT_HEALTH_TAGGED_EXERCISE_IDS.has(id)) return false;
  const name = exercise.name.toLowerCase();
  if (ANKLE_FOOT_HEALTH_REGIONAL_EXCLUDE_ID_PATTERNS.some((rx) => rx.test(id) || rx.test(name))) {
    return true;
  }
  const targets = [
    ...(exercise.mobility_targets ?? []),
    ...(exercise.stretch_targets ?? []),
  ].map(toSlug);
  if (
    targets.some((t) => t.includes("thoracic") || t.includes("shoulder") || t.includes("hip")) &&
    !targets.some((t) => t.includes("ankle") || t.includes("calf") || t.includes("foot") || t.includes("achilles"))
  ) {
    return true;
  }
  if (exercise.movement_pattern === "push" && !exercise.unilateral) return true;
  return false;
}

function exerciseMatchesAnkleFootHealthSubFocus(exercise: Exercise): boolean {
  if (!isJointHealthAppropriateExercise(exercise)) return false;
  if (isAnkleFootHealthRegionallyExcluded(exercise)) return false;

  const tags = exerciseTagSet(exercise);
  if (ANKLE_FOOT_HEALTH_TAGGED_EXERCISE_IDS.has(toSlug(exercise.id))) return true;
  for (const t of ANKLE_FOOT_HEALTH_STRONG_ATTRIBUTE_TAGS) {
    if (tags.has(t)) return true;
  }
  if (tags.has("ankle_foot_stability") && tags.has("ankle_foot_health")) return true;

  return false;
}

const BACK_SPINE_HEALTH_STRONG_ATTRIBUTE_TAGS = new Set([
  "back_spine_health",
  "back_spine_activation",
  "back_spine_strength",
  "back_spine_mobility",
]);

const BACK_SPINE_HEALTH_REGIONAL_EXCLUDE_ID_PATTERNS = [
  /^bench|^db_bench|barbell_bench|incline_db_press|incline_press/,
  /^dip|^push_up|^pushup/,
  /overhead_press|oh_press|military_press|jerk|snatch|clean/,
  /^pullup|^pull_up|chin_up|muscle_up/,
  /^back_squat|^barbell_squat|^deadlift|^barbell_deadlift|^rdl|barbell_rdl/,
  /burpee|box_jump|kb_swing|kettlebell_swing|plyo|sit_up|crunch|ghd/,
  /good_morning|ff_.*good_morning/,
  /cossack|clamshell|fire_hydrant|hip_90|90_90|wall_slide|face_pull|leg_extension/,
  /external_rotation|internal_rotation|rotator|prone_ity|shoulder_dislocat/,
  /monster_walk|lateral_walk|band_walk/,
  /pigeon|frog_stretch|figure.?4/,
  /dorsiflexion|iso_step|step_down|calf_raise|tibialis/,
  /split_squat.*pallof|isometric_split_squat/,
  /superman|supermans/,
];

function isBackSpineHealthRegionallyExcluded(exercise: Exercise): boolean {
  const id = toSlug(exercise.id);
  if (BACK_SPINE_HEALTH_TAGGED_EXERCISE_IDS.has(id)) return false;
  const name = exercise.name.toLowerCase();
  if (BACK_SPINE_HEALTH_REGIONAL_EXCLUDE_ID_PATTERNS.some((rx) => rx.test(id) || rx.test(name))) {
    return true;
  }
  if (exercise.movement_pattern === "push" && !exercise.unilateral) return true;
  return false;
}

function exerciseMatchesBackSpineHealthSubFocus(exercise: Exercise): boolean {
  if (!isJointHealthAppropriateExercise(exercise)) return false;
  if (isBackSpineHealthRegionallyExcluded(exercise)) return false;

  const tags = exerciseTagSet(exercise);
  if (BACK_SPINE_HEALTH_TAGGED_EXERCISE_IDS.has(toSlug(exercise.id))) return true;

  const otherRegionalHealth = ["knee_health", "shoulder_health", "hip_health", "ankle_foot_health"];
  if (otherRegionalHealth.some((t) => tags.has(t)) && !tags.has("back_spine_health")) return false;

  for (const t of BACK_SPINE_HEALTH_STRONG_ATTRIBUTE_TAGS) {
    if (tags.has(t)) return true;
  }
  if (tags.has("back_spine_stability") && tags.has("back_spine_health")) return true;

  return false;
}

const ELBOW_WRIST_HEALTH_STRONG_ATTRIBUTE_TAGS = new Set([
  "elbow_wrist_health",
  "elbow_wrist_activation",
  "elbow_wrist_strength",
  "elbow_wrist_stability",
  "elbow_wrist_mobility",
]);

const ELBOW_WRIST_HEALTH_REGIONAL_EXCLUDE_ID_PATTERNS = [
  /^bench|^db_bench|barbell_bench|incline_db_press|incline_press/,
  /^dip|^push_up|^pushup/,
  /close_grip|skull_crush|tricep_extension|preacher_curl|jm_press/,
  /overhead_press|oh_press|military_press|jerk|snatch|clean/,
  /^pullup|^pull_up|chin_up|muscle_up|planche|finger.*push/,
  /^back_squat|^barbell_squat|^deadlift|^barbell_deadlift|^rdl|barbell_rdl/,
  /burpee|box_jump|kb_swing|kettlebell_swing|plyo/,
  /^cat_camel|^cat_cow|t_spine|tspine|thoracic/,
  /cossack|clamshell|fire_hydrant|hip_90|90_90|wall_slide|face_pull/,
  /monster_walk|pigeon|dorsiflexion|split_squat.*calf/,
];

function isElbowWristHealthRegionallyExcluded(exercise: Exercise): boolean {
  const id = toSlug(exercise.id);
  if (ELBOW_WRIST_HEALTH_TAGGED_EXERCISE_IDS.has(id)) return false;
  if (id === "push_up_plus" || id === "scapular_push_up") return false;
  const name = exercise.name.toLowerCase();
  if (ELBOW_WRIST_HEALTH_REGIONAL_EXCLUDE_ID_PATTERNS.some((rx) => rx.test(id) || rx.test(name))) {
    return true;
  }
  if (exercise.movement_pattern === "push" && !exercise.unilateral && id !== "push_up_plus") return true;
  return false;
}

function exerciseMatchesElbowWristHealthSubFocus(exercise: Exercise): boolean {
  if (!isJointHealthAppropriateExercise(exercise)) return false;
  if (isElbowWristHealthRegionallyExcluded(exercise)) return false;

  const tags = exerciseTagSet(exercise);
  if (ELBOW_WRIST_HEALTH_TAGGED_EXERCISE_IDS.has(toSlug(exercise.id))) return true;

  const otherRegionalHealth = [
    "knee_health",
    "shoulder_health",
    "hip_health",
    "ankle_foot_health",
    "back_spine_health",
  ];
  if (otherRegionalHealth.some((t) => tags.has(t)) && !tags.has("elbow_wrist_health")) return false;

  for (const t of ELBOW_WRIST_HEALTH_STRONG_ATTRIBUTE_TAGS) {
    if (tags.has(t)) return true;
  }

  return false;
}

const JOINT_HEALTH_REGIONAL: Record<JointHealthSubFocusSlug, RegionalMatchConfig> = {
  knee_health: {
    attributeTags: ["knee_health", "knee_activation", "knee_strength", "knee_stability", "terminal_knee_extension", "vmo"],
    stimulus: ["isometric", "single_leg", "eccentric"],
    muscles: [],
    mobilityTargets: ["quads", "hamstrings", "knee", "patellar", "calves"],
    nameHints: [/wall sit|spanish squat|step.?down|split squat|copenhagen|terminal knee|tke|tibialis|calf raise|clamshell|90.?90|hip switch|cossack|bodyweight squat|quad stretch|leg raise/i],
  },
  shoulder_health: {
    attributeTags: [
      "shoulder_health",
      "shoulder_activation",
      "shoulder_strength",
      "shoulder_stability",
      "rotator_cuff",
      "scapular_control",
      "shoulder_stability",
      "serratus",
      "lower_trap",
    ],
    stimulus: ["scapular_control", "isometric"],
    muscles: [],
    mobilityTargets: ["shoulders", "pecs", "lats"],
    nameHints: [
      /external rotation|internal rotation|face pull|wall slide|wall angel|serratus|scap|pull.?apart|dislocat|cuban|push.?up plus|rotator|prone ity/i,
    ],
  },
  hip_health: {
    attributeTags: [
      "hip_health",
      "hip_activation",
      "hip_strength",
      "hip_stability",
      "hip_mobility",
      "hip_stability",
      "glute_med",
      "adductor",
      "hip_rotation",
    ],
    stimulus: ["single_leg", "isometric"],
    muscles: [],
    mobilityTargets: ["hip", "glutes", "hip_flexors", "adductors"],
    nameHints: [
      /glute bridge|hip airplane|copenhagen|clam|fire hydrant|cossack|90.?90|hip car|hip circle|hip rotation|monster walk|lateral walk|worlds.?greatest|pigeon|frog|figure.?4|hip flexor/i,
    ],
  },
  ankle_foot_health: {
    attributeTags: [
      "ankle_foot_health",
      "ankle_foot_activation",
      "ankle_foot_strength",
      "ankle_foot_stability",
      "ankle_foot_mobility",
      "ankle_stability",
      "tibialis",
      "foot_intrinsic",
      "calf",
      "balance",
    ],
    stimulus: ["isometric", "eccentric", "single_leg"],
    muscles: [],
    mobilityTargets: ["calves", "ankle", "feet", "achilles"],
    nameHints: [
      /ankle car|ankle circle|achilles|heel walk|toe walk|tibialis|calf raise|calf stretch|dorsiflexion|step.?down|toe balance|banded ankle/i,
    ],
  },
  back_spine_health: {
    attributeTags: [
      "back_spine_health",
      "back_spine_activation",
      "back_spine_strength",
      "back_spine_stability",
      "back_spine_mobility",
      "core_stability",
      "thoracic_mobility",
    ],
    stimulus: ["trunk_anti_rotation", "anti_flexion", "isometric", "scapular_control"],
    muscles: [],
    mobilityTargets: ["thoracic", "low_back", "lumbar"],
    nameHints: [
      /dead bug|bird dog|pallof|side plank|cat.?cow|cat.?camel|open book|thread.?needle|quadruped|rockback|breathing|diaphragm|child/i,
    ],
  },
  elbow_wrist_health: {
    attributeTags: [
      "elbow_wrist_health",
      "elbow_wrist_activation",
      "elbow_wrist_strength",
      "elbow_wrist_stability",
      "elbow_wrist_mobility",
      "forearm",
      "grip",
      "wrist",
      "tendon_loading",
      "pronator",
      "supinator",
    ],
    stimulus: ["grip", "isometric", "eccentric", "scapular_control"],
    muscles: ["forearms", "wrists", "biceps", "triceps"],
    mobilityTargets: ["forearm", "wrist"],
    nameHints: [/wrist curl|reverse wrist|farmer|dead hang|pronat|supinat|finger extension|scapular push|pull.?apart/i],
  },
};

export function exerciseMatchesJointHealthSubFocus(
  exercise: Exercise,
  subSlug: string
): boolean {
  const norm = toSlug(subSlug) as JointHealthSubFocusSlug;
  if (!JOINT_HEALTH_SUB_FOCUS_SLUGS.includes(norm)) return false;

  if (norm === "knee_health") {
    return exerciseMatchesKneeHealthSubFocus(exercise);
  }
  if (norm === "shoulder_health") {
    return exerciseMatchesShoulderHealthSubFocus(exercise);
  }
  if (norm === "hip_health") {
    return exerciseMatchesHipHealthSubFocus(exercise);
  }
  if (norm === "ankle_foot_health") {
    return exerciseMatchesAnkleFootHealthSubFocus(exercise);
  }
  if (norm === "back_spine_health") {
    return exerciseMatchesBackSpineHealthSubFocus(exercise);
  }
  if (norm === "elbow_wrist_health") {
    return exerciseMatchesElbowWristHealthSubFocus(exercise);
  }

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

  if (tags.has("knee_activation")) return "activation";
  if (tags.has("shoulder_activation")) return "activation";
  if (tags.has("hip_activation")) return "activation";
  if (tags.has("ankle_foot_activation")) return "activation";
  if (tags.has("back_spine_activation")) return "activation";
  if (tags.has("elbow_wrist_activation")) return "activation";
  if (tags.has("knee_strength")) return "controlled_strength";
  if (tags.has("shoulder_strength")) return "controlled_strength";
  if (tags.has("hip_strength")) return "controlled_strength";
  if (tags.has("ankle_foot_strength")) return "controlled_strength";
  if (tags.has("back_spine_strength")) return "controlled_strength";
  if (tags.has("elbow_wrist_strength")) return "controlled_strength";
  if (tags.has("knee_stability")) return "stability";
  if (tags.has("shoulder_stability")) return "stability";
  if (tags.has("hip_stability")) return "stability";
  if (tags.has("ankle_foot_stability")) return "stability";
  if (tags.has("back_spine_stability")) return "stability";
  if (tags.has("elbow_wrist_stability")) return "stability";
  if (tags.has("knee_mobility")) return "mobility_finisher";
  if (tags.has("shoulder_mobility")) return "mobility_finisher";
  if (tags.has("hip_mobility")) return "mobility_finisher";
  if (tags.has("ankle_foot_mobility")) return "mobility_finisher";
  if (tags.has("back_spine_mobility")) return "mobility_finisher";
  if (tags.has("elbow_wrist_mobility")) return "mobility_finisher";

  if (modality === "mobility" || modality === "recovery" || role === "activation") {
    if (
      tags.has("knee_health") ||
      tags.has("shoulder_health") ||
      tags.has("hip_health") ||
      tags.has("ankle_foot_health") ||
      tags.has("back_spine_health") ||
      tags.has("elbow_wrist_health")
    ) {
      return "mobility_finisher";
    }
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
