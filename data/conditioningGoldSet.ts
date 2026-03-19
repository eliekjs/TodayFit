/**
 * Conditioning gold-set: high-confidence exercises for Sport Conditioning sub-focuses.
 * Used for enrichment passes and coverage audits. Sub-focus slugs are first-class (attribute_tags).
 *
 * DESIGN: Sub-focus slugs (zone2_aerobic_base, intervals_hiit, threshold_tempo, hills) are
 * assigned directly on exercises; no hidden ontology. Overlay fidelity uses muscle_groups
 * and primary_movement_family (upper / lower / core / full_body).
 *
 * Reversible: changes are confined to this gold-set and exercise stubs; audit script reports coverage.
 */

/** Conditioning intent sub-focus slugs (Sport Conditioning). */
export const CONDITIONING_INTENT_GOLD = [
  "zone2_aerobic_base",
  "intervals_hiit",
  "threshold_tempo",
  "hills",
] as const;

/** Overlay slugs for body-region filtering. */
export const CONDITIONING_OVERLAY_GOLD = ["upper", "lower", "core", "full_body"] as const;

/**
 * Gold-set exercise IDs: conditioning-relevant exercises that appear in Sport Conditioning workouts.
 * Source: logic/workoutGeneration/exerciseStub.ts (modality === "conditioning") plus any DB conditioning exercises.
 */
export const CONDITIONING_GOLD_SET_IDS: string[] = [
  // Cardio / steady-state
  "zone2_bike",
  "zone2_treadmill",
  "rower",
  "ski_erg",
  // Hills / incline / stairs
  "treadmill_incline_walk",
  "stair_climber_repeats",
  "sled_push",
  "walking_lunge",
  // HIIT / intervals
  "kb_swing",
  "jump_rope",
  "box_jump",
  "burpee",
  "mountain_climbers",
];

/**
 * Recommended direct sub-focus (attribute_tags) per gold-set exercise.
 * Only assign where the exercise is a genuine fit; do not over-tag.
 * Used as reference for enrichment; actual tags live on exercise records.
 */
export const CONDITIONING_GOLD_SET_DIRECT_TAGS: Record<
  string,
  (typeof CONDITIONING_INTENT_GOLD)[number][]
> = {
  zone2_bike: ["zone2_aerobic_base"],
  zone2_treadmill: ["zone2_aerobic_base"],
  rower: ["zone2_aerobic_base", "threshold_tempo", "intervals_hiit"],
  ski_erg: ["zone2_aerobic_base", "threshold_tempo", "intervals_hiit"],
  treadmill_incline_walk: ["zone2_aerobic_base", "hills"],
  stair_climber_repeats: ["hills", "intervals_hiit"],
  sled_push: ["hills", "intervals_hiit"],
  walking_lunge: ["hills", "intervals_hiit"],
  kb_swing: ["intervals_hiit"],
  jump_rope: ["intervals_hiit"],
  box_jump: ["intervals_hiit"],
  burpee: ["intervals_hiit"],
  mountain_climbers: ["intervals_hiit"],
};

/**
 * Recommended overlay support: primary_movement_family for filterPoolByOverlay.
 * lower = lower_body | squat | hinge | legs; upper = upper_push | upper_pull | push | pull; core = core.
 */
export const CONDITIONING_GOLD_SET_OVERLAY_FAMILY: Record<string, string> = {
  zone2_bike: "lower_body",
  zone2_treadmill: "lower_body",
  rower: "full_body", // legs + pull + core
  ski_erg: "full_body",
  treadmill_incline_walk: "lower_body",
  stair_climber_repeats: "lower_body",
  sled_push: "lower_body",
  walking_lunge: "lower_body",
  kb_swing: "full_body", // hinge + core
  jump_rope: "lower_body",
  box_jump: "lower_body",
  burpee: "full_body",
  mountain_climbers: "core",
};
