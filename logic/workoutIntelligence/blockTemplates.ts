/**
 * Phase 3: Workout block templates.
 * Defines block_type, format, title, purpose, target qualities, exercise count range, fatigue share, prescription style.
 * Used to build session templates from stimulus profile block sequences.
 */

import type { TrainingQualitySlug } from "./trainingQualities";
import type {
  BlockType,
  BlockFormat,
  WorkoutBlockTemplate,
  BlockSpec,
} from "./types";
import type { StimulusProfileSlug } from "./types";
import { getStimulusProfile } from "./stimulusProfiles";

/** Default templates per block type (generic). Override per stimulus when building session. */
const BLOCK_TEMPLATE_DEFAULTS: Partial<Record<BlockType, Omit<WorkoutBlockTemplate, "block_type">>> = {
  warmup: {
    format: "circuit",
    title: "Activation",
    purpose: "Movement prep, mobilize joints, prepare for main work",
    exercise_count_min: 2,
    exercise_count_max: 5,
    fatigue_budget_share: 0,
    prescription_style: "mobility_flow",
  },
  prep: {
    format: "straight_sets",
    title: "Preparation",
    purpose: "Movement prep and activation",
    exercise_count_min: 1,
    exercise_count_max: 3,
    fatigue_budget_share: 0,
    prescription_style: "controlled_resilience",
  },
  skill: {
    format: "straight_sets",
    title: "Skill",
    purpose: "Technique and skill work",
    exercise_count_min: 1,
    exercise_count_max: 2,
    fatigue_budget_share: 1,
    prescription_style: "explosive_power",
  },
  power: {
    format: "straight_sets",
    title: "Power",
    purpose: "Explosive intent; rate of force development",
    target_qualities: ["power", "rate_of_force_development", "plyometric_ability"] as TrainingQualitySlug[],
    exercise_count_min: 2,
    exercise_count_max: 4,
    fatigue_budget_share: 3,
    prescription_style: "explosive_power",
  },
  main_strength: {
    format: "straight_sets",
    title: "Main strength",
    purpose: "Primary compound lifts; heavy load, low reps",
    target_qualities: ["max_strength", "pulling_strength", "pushing_strength"] as TrainingQualitySlug[],
    target_movement_patterns: ["squat", "hinge", "push", "pull"],
    exercise_count_min: 2,
    exercise_count_max: 4,
    fatigue_budget_share: 6,
    prescription_style: "heavy_strength",
  },
  main_hypertrophy: {
    format: "superset",
    title: "Main hypertrophy",
    purpose: "Primary hypertrophy work; moderate load, moderate-high volume",
    target_qualities: ["hypertrophy", "muscular_endurance"] as TrainingQualitySlug[],
    exercise_count_min: 4,
    exercise_count_max: 8,
    fatigue_budget_share: 6,
    prescription_style: "moderate_hypertrophy",
  },
  accessory: {
    format: "superset",
    title: "Accessory",
    purpose: "Supporting work; isolation and balance",
    target_qualities: ["hypertrophy", "joint_stability"] as TrainingQualitySlug[],
    exercise_count_min: 2,
    exercise_count_max: 6,
    fatigue_budget_share: 3,
    prescription_style: "density_accessory",
  },
  conditioning: {
    format: "interval",
    title: "Conditioning",
    purpose: "Energy system work",
    target_qualities: ["aerobic_base", "anaerobic_capacity", "work_capacity"] as TrainingQualitySlug[],
    exercise_count_min: 1,
    exercise_count_max: 2,
    fatigue_budget_share: 4,
    prescription_style: "aerobic_steady",
  },
  core: {
    format: "circuit",
    title: "Core",
    purpose: "Trunk and anti-movement",
    target_qualities: ["core_tension", "trunk_anti_flexion", "trunk_anti_rotation"] as TrainingQualitySlug[],
    exercise_count_min: 2,
    exercise_count_max: 4,
    fatigue_budget_share: 2,
    prescription_style: "controlled_resilience",
  },
  carry: {
    format: "straight_sets",
    title: "Carry",
    purpose: "Loaded carries; grip and core",
    target_qualities: ["grip_strength", "core_tension"] as TrainingQualitySlug[],
    exercise_count_min: 1,
    exercise_count_max: 2,
    fatigue_budget_share: 2,
    prescription_style: "controlled_resilience",
  },
  cooldown: {
    format: "flow",
    title: "Cooldown",
    purpose: "Reduce arousal, light mobility",
    exercise_count_min: 2,
    exercise_count_max: 4,
    fatigue_budget_share: 0,
    prescription_style: "mobility_flow",
  },
  mobility: {
    format: "flow",
    title: "Mobility",
    purpose: "Range of motion and tissue quality",
    target_qualities: ["mobility", "thoracic_mobility", "recovery"] as TrainingQualitySlug[],
    exercise_count_min: 3,
    exercise_count_max: 8,
    fatigue_budget_share: 0,
    prescription_style: "mobility_flow",
  },
  recovery: {
    format: "flow",
    title: "Recovery",
    purpose: "Light movement and restoration",
    target_qualities: ["recovery", "mobility"] as TrainingQualitySlug[],
    exercise_count_min: 2,
    exercise_count_max: 6,
    fatigue_budget_share: 0,
    prescription_style: "mobility_flow",
  },
};

/** Build a full WorkoutBlockTemplate for a block type (with optional format override). */
export function getBlockTemplate(
  blockType: BlockType,
  formatOverride?: BlockFormat
): WorkoutBlockTemplate {
  const def = BLOCK_TEMPLATE_DEFAULTS[blockType];
  const format = formatOverride ?? (def?.format ?? "straight_sets");
  return {
    block_type: blockType,
    format,
    title: def?.title ?? blockType.replace(/_/g, " "),
    purpose: def?.purpose,
    target_qualities: def?.target_qualities,
    target_movement_patterns: def?.target_movement_patterns,
    exercise_count_min: def?.exercise_count_min ?? 1,
    exercise_count_max: def?.exercise_count_max ?? 4,
    fatigue_budget_share: def?.fatigue_budget_share,
    prescription_style: def?.prescription_style,
  };
}

/** Convert stimulus profile block sequence + format hints into BlockSpec[]. */
export function blockSpecsFromStimulus(stimulusProfile: StimulusProfileSlug): BlockSpec[] {
  const profile = getStimulusProfile(stimulusProfile);
  const sequence = profile.appropriate_block_sequence;
  const formatHints = profile.format_hints ?? {};
  return sequence.map((blockType) => {
    const tmpl = getBlockTemplate(blockType, formatHints[blockType]);
    return {
      block_type: tmpl.block_type,
      format: tmpl.format,
      min_items: tmpl.exercise_count_min,
      max_items: tmpl.exercise_count_max,
      quality_focus: tmpl.target_qualities,
    };
  });
}
