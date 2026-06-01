/**
 * Phase 9: Sports-training dynamic power tags (agility, speed, plyometric stimulus).
 * Ensures speed/COD sub-focus scoring and `tagSetHasDynamicPowerSignal` gates find real drills.
 *
 * Complements Phase 4 (conditioning intent slugs) by tagging agility/COD/plyo exercises
 * regardless of modality when id/name signals match.
 */

import type { Exercise, ExerciseTags } from "../../logic/workoutGeneration/types";
import { DYNAMIC_POWER_SIGNAL_TAG_SLUGS } from "../../data/sportSubFocus/subFocusIntentArchetypes";
import type { ExerciseInferenceInput } from "./inferenceTypes";

const ALLOWED_STIMULUS = new Set(["plyometric"]);

function norm(s: string): string {
  return s.toLowerCase().replace(/[\s-]+/g, "_").replace(/_+/g, "_");
}

function blob(input: ExerciseInferenceInput): string {
  return norm(`${input.id}_${input.name}`);
}

/** Strength-hypertrophy skater patterns — not COD/agility drills. */
const SKATER_STRENGTH_TOKENS = ["skater_squat", "skater_lunge"] as const;

const AGILITY_COD_TOKENS = [
  "shuffle",
  "shuttles",
  "cone",
  "cones",
  "ladder",
  "footwork",
  "carioca",
  "agility",
  "change_of_direction",
  "cutting",
  "mirror_drill",
  "react_drill",
  "reaction_drill",
  "lateral_bound",
  "lateral_hop",
  "pro_agility",
  "t_test",
  "t_drill",
  "deceleration",
  "acceleration_drill",
  "decel_drill",
] as const;

const SKATER_DYNAMIC_TOKENS = ["skater_jump", "skater_hops", "skater_bound", "skater_jumps", "lateral_skater"] as const;

const SPRINT_SPEED_TOKENS = [
  "sprint",
  "sprinting",
  "max_velocity",
  "max_speed",
  "flying_sprint",
  "accel_",
  "acceleration",
  "speed_drill",
  "speed_ladder",
] as const;

const PLYO_JUMP_TOKENS = [
  "box_jump",
  "depth_jump",
  "broad_jump",
  "tuck_jump",
  "squat_jump",
  "jump_squat",
  "plyo",
  "plyometric",
  "vertical_jump",
  "med_ball_throw",
  "medicine_ball_slam",
  "ball_slam",
  "wall_ball",
] as const;

const PLYO_HOP_BOUND_TOKENS = ["bound", "bounds", "hops"] as const;

const EXCLUDE_STEADY_CARDIO_TOKENS = [
  "zone2",
  "zone_2",
  "steady_state",
  "easy_run",
  "recovery_jog",
  "long_slow",
  "lsd",
] as const;

function blobIncludesAny(b: string, tokens: readonly string[]): boolean {
  return tokens.some((t) => b.includes(t));
}

function isCodToken(b: string): boolean {
  return b.includes("_cod_") || b.endsWith("_cod") || b.startsWith("cod_");
}

export type Phase9DynamicPowerResult = {
  attribute_tags: string[];
  stimulus_add: ("plyometric")[];
};

export function inferPhase9DynamicPowerTags(
  input: ExerciseInferenceInput,
  exercise: Pick<Exercise, "modality" | "movement_patterns" | "primary_movement_family">
): Phase9DynamicPowerResult {
  const b = blob(input);
  const attrs = new Set<string>();
  const stimulus_add: ("plyometric")[] = [];

  if (blobIncludesAny(b, SKATER_STRENGTH_TOKENS)) {
    return { attribute_tags: [], stimulus_add: [] };
  }

  const isAgilityCod =
    blobIncludesAny(b, AGILITY_COD_TOKENS) || blobIncludesAny(b, SKATER_DYNAMIC_TOKENS) || isCodToken(b);
  const isSprintSpeed = blobIncludesAny(b, SPRINT_SPEED_TOKENS);
  const isPlyoJump =
    blobIncludesAny(b, PLYO_JUMP_TOKENS) ||
    blobIncludesAny(b, PLYO_HOP_BOUND_TOKENS) ||
    b.includes("_hop_") ||
    b.endsWith("_hop");
  const steadyCardio =
    blobIncludesAny(b, EXCLUDE_STEADY_CARDIO_TOKENS) && !isAgilityCod && !isPlyoJump;

  if (steadyCardio) {
    return { attribute_tags: [], stimulus_add: [] };
  }

  if (isAgilityCod) {
    attrs.add("agility");
    attrs.add("reactive_power");
    if (blobIncludesAny(b, SKATER_DYNAMIC_TOKENS) || b.includes("jump") || b.includes("hop") || b.includes("bound")) {
      attrs.add("jumping");
      stimulus_add.push("plyometric");
    }
  }

  if (isSprintSpeed) {
    attrs.add("speed");
    attrs.add("sprinting");
    if (b.includes("accel") || b.includes("acceleration")) attrs.add("acceleration");
  }

  if (isPlyoJump) {
    attrs.add("explosive_power");
    attrs.add("jumping");
    stimulus_add.push("plyometric");
  }

  if (/\b(med_ball|medicine_ball|ball_throw|throw\b|slam)\b/.test(b) && exercise.modality === "power") {
    attrs.add("explosive_power");
    stimulus_add.push("plyometric");
  }

  // Olympic lifts: explosive attribute for athletic scoring (stimulus via phase4).
  if (
    (b.includes("power_clean") ||
      b.includes("hang_clean") ||
      b.includes("squat_clean") ||
      b.includes("power_snatch") ||
      b.includes("hang_snatch") ||
      b.includes("push_jerk") ||
      b.includes("split_jerk")) &&
    !attrs.size
  ) {
    attrs.add("explosive_power");
    attrs.add("explosive");
  }

  const attribute_tags = [...attrs].filter((t) => DYNAMIC_POWER_SIGNAL_TAG_SLUGS.has(t));

  const stimUnique = [...new Set(stimulus_add)];

  return { attribute_tags, stimulus_add: stimUnique };
}

export function shouldRunPhase9DynamicPowerInference(
  input: ExerciseInferenceInput,
  exercise: Pick<Exercise, "modality" | "movement_patterns">
): boolean {
  const b = blob(input);
  if (blobIncludesAny(b, SKATER_STRENGTH_TOKENS)) return false;
  if (
    blobIncludesAny(b, AGILITY_COD_TOKENS) ||
    blobIncludesAny(b, SKATER_DYNAMIC_TOKENS) ||
    isCodToken(b) ||
    blobIncludesAny(b, SPRINT_SPEED_TOKENS) ||
    blobIncludesAny(b, PLYO_JUMP_TOKENS) ||
    blobIncludesAny(b, PLYO_HOP_BOUND_TOKENS)
  ) {
    return true;
  }
  if (exercise.modality === "power") return true;
  const patterns = new Set((exercise.movement_patterns ?? []).map(norm));
  if (patterns.has("locomotion") && (b.includes("run") || b.includes("shuffle") || b.includes("sprint") || b.includes("drill"))) {
    return true;
  }
  return false;
}

function mergeStimulus(
  existing: ExerciseTags["stimulus"] | undefined,
  adds: ("plyometric")[]
): ExerciseTags["stimulus"] | undefined {
  const seen = new Set((existing ?? []).map(norm));
  const out = [...(existing ?? [])] as NonNullable<ExerciseTags["stimulus"]>;
  for (const a of adds) {
    if (!ALLOWED_STIMULUS.has(a) || seen.has(a)) continue;
    out.push(a);
    seen.add(a);
  }
  return out.length ? out : existing;
}

export function mergePhase9DynamicPowerTagsIntoExercise(
  exercise: Exercise,
  input: ExerciseInferenceInput
): void {
  if (!shouldRunPhase9DynamicPowerInference(input, exercise)) return;

  const { attribute_tags, stimulus_add } = inferPhase9DynamicPowerTags(input, exercise);
  if (!attribute_tags.length && !stimulus_add.length) return;

  if (attribute_tags.length) {
    const attrSet = new Set((exercise.tags.attribute_tags ?? []).map(norm));
    for (const t of attribute_tags) attrSet.add(t);
    exercise.tags = { ...exercise.tags, attribute_tags: [...attrSet] };
  }

  if (stimulus_add.length) {
    const merged = mergeStimulus(exercise.tags.stimulus, stimulus_add);
    if (merged?.length) {
      exercise.tags = { ...exercise.tags, stimulus: merged };
    }
  }
}
