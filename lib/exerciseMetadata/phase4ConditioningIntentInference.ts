/**
 * Phase 4: Infer CONDITIONING_INTENT_SLUGS into tags.attribute_tags (+ stimulus bridge)
 * for conditioning/power work. See docs/research/exercise-metadata-phase4-conditioning-intent.md
 * and data/goalSubFocus/conditioningSubFocus.ts.
 */

import type { Exercise, ExerciseTags } from "../../logic/workoutGeneration/types";
import { CONDITIONING_INTENT_SLUGS } from "../../data/goalSubFocus/conditioningSubFocus";
import type { ExerciseInferenceInput } from "./inferenceTypes";

const INTENT_SET = new Set<string>(CONDITIONING_INTENT_SLUGS);

const ALLOWED_STIMULUS_BRIDGE = new Set(["aerobic_zone2", "anaerobic", "plyometric"]);

function norm(s: string): string {
  return s.toLowerCase().replace(/[\s-]+/g, "_").replace(/_+/g, "_");
}

function blob(input: ExerciseInferenceInput): string {
  return norm(`${input.id}_${input.name}`);
}

function modalitySet(input: ExerciseInferenceInput): Set<string> {
  return new Set(input.modalities.map(norm));
}

function patternSet(ctx: Phase4Context): Set<string> {
  return new Set(ctx.movement_patterns.map(norm));
}

export type Phase4Context = {
  movement_patterns: string[];
  primary_movement_family?: string;
  modality: string;
  equipment: string[];
};

function equipmentSet(ctx: Phase4Context): Set<string> {
  return new Set(ctx.equipment.map(norm));
}

/** True when exercise is in conditioning/power (or conditioning family), or narrow Olympic cue on strength. */
export function shouldRunPhase4ConditioningInference(exercise: Exercise, input: ExerciseInferenceInput): boolean {
  const m = norm(exercise.modality ?? "strength");
  if (m === "conditioning" || m === "power") return true;
  const fam = norm(exercise.primary_movement_family ?? "");
  if (fam === "conditioning") return true;
  const mods = modalitySet(input);
  if (mods.has("conditioning") || mods.has("power")) return true;

  const b = blob(input);
  if (m === "strength" || m === "hypertrophy" || m === "skill") {
    if (/\b(power_clean|hang_clean|squat_clean|muscle_clean|power_snatch|hang_snatch|snatch\b|clean\b|split_jerk|push_jerk)\b/.test(b)) return true;
    if ((b.includes("clean") || b.includes("snatch")) && !b.includes("curl") && !b.includes("hammer_curl")) return true;
  }
  return false;
}

/**
 * Infer canonical conditioning intent slugs. Multiple intents allowed (e.g. versatile erg work).
 */
export function inferPhase4ConditioningIntents(
  input: ExerciseInferenceInput,
  ctx: Phase4Context
): { intent_slugs: string[]; stimulus_add: ("aerobic_zone2" | "anaerobic" | "plyometric")[] } {
  const b = blob(input);
  const eq = equipmentSet(ctx);
  const patterns = patternSet(ctx);
  const intents = new Set<string>();

  const add = (slug: string) => {
    if (INTENT_SET.has(slug)) intents.add(slug);
  };

  const hiitName = /hiit|tabata|emom|amrap|metcon|interval|circuit/.test(b);
  const sprintName = /\bsprint\b|max_velocity|maximal_velocity|flying_sprint|accel_/.test(b);
  const thresholdName = /threshold|tempo_run|lactate|ftp\b|10k_pace|cruise|yasso/.test(b);
  const zone2Name = /zone2|zone_2|steady|easy_run|recovery_run|recovery_jog|long_slow|lsd\b|aerobic_base/.test(b);
  const hillName = /\bhill|uphill|incline|stair|sled_push|sled_drag|walking_lunge|hill_sprint/.test(b) || b.includes("stair_climber");
  const plyoJumpName =
    /\b(jump|hop|bound|plyo|plyometric|box_jump|depth_jump|squat_jump|tuck_jump|broad_jump|lateral_bound|burpee)\b/.test(b) ||
    b.includes("box_jump") ||
    b.includes("depth_jump");
  const upperPowerName = /med_ball|medicine_ball|wall_ball|ball_slams|ball_throw|plyo_push|explosive_push/.test(b);
  const olympicName =
    /\b(clean|snatch|jerk|high_pull)\b/.test(b) ||
    b.includes("power_clean") ||
    b.includes("hang_clean") ||
    b.includes("snatch") ||
    (b.includes("clean") && !b.includes("curl"));

  // --- Olympic / barbell triple extension (strength or power) ---
  if (olympicName && !b.includes("curl")) {
    add("olympic_triple_extension");
    add("lower_body_power_plyos");
  }

  // --- Sprint / acceleration ---
  if (sprintName || (patterns.has("locomotion") && sprintName)) {
    add("sprint");
    add("intervals_hiit");
  }

  // --- Vertical / lower plyos (exclude pure Olympic if already tagged above — still allow explicit jump names) ---
  if (plyoJumpName) {
    add("lower_body_power_plyos");
    add("intervals_hiit");
    if (/\bvertical_jump|depth_jump|box_jump\b/.test(b) || b.includes("vertical_jump")) add("vertical_jump");
  }

  if (upperPowerName) {
    add("upper_body_power");
    add("intervals_hiit");
  }

  // --- Machine / modality conditioning ---
  const isConditioningMod = norm(ctx.modality) === "conditioning" || norm(ctx.primary_movement_family ?? "") === "conditioning";

  if (eq.has("treadmill")) {
    if (/incline|hill|grade|uphill/.test(b)) add("hills");
    if (sprintName || hiitName) {
      add("sprint");
      add("intervals_hiit");
    } else if (zone2Name || /walk|jog|easy|light/.test(b)) {
      add("zone2_aerobic_base");
    } else {
      add("zone2_aerobic_base");
      add("threshold_tempo");
    }
  }

  if (eq.has("bike") && !eq.has("assault_bike")) {
    add("zone2_aerobic_base");
    if (hiitName || sprintName) add("intervals_hiit");
  }

  if (eq.has("assault_bike") || b.includes("assault_bike") || b.includes("air_bike")) {
    add("intervals_hiit");
    add("threshold_tempo");
    add("zone2_aerobic_base");
  }

  if (eq.has("rower") || b.includes("rower") || b.includes("rowing")) {
    add("zone2_aerobic_base");
    add("threshold_tempo");
    add("intervals_hiit");
  }

  if (eq.has("ski_erg") || b.includes("ski_erg") || b.includes("ski_ergometer")) {
    add("zone2_aerobic_base");
    add("threshold_tempo");
    add("intervals_hiit");
  }

  if (eq.has("elliptical")) {
    add("zone2_aerobic_base");
  }

  if (eq.has("stair_climber") || b.includes("stair_climber")) {
    add("hills");
    add("intervals_hiit");
    if (zone2Name) add("zone2_aerobic_base");
  }

  if (eq.has("sled") || b.includes("sled_")) {
    add("hills");
    add("intervals_hiit");
  }

  // --- Locomotion (no machine): run/jog/shuffle ---
  if (patterns.has("locomotion") && isConditioningMod) {
    if (sprintName || hiitName) {
      add("sprint");
      add("intervals_hiit");
    } else if (thresholdName) {
      add("threshold_tempo");
      add("intervals_hiit");
    } else if (hillName) {
      add("hills");
      add("intervals_hiit");
    } else if (zone2Name || /jog|run|shuffle|march|tempo_run/.test(b)) {
      add("zone2_aerobic_base");
      if (/tempo/.test(b) && !sprintName) add("threshold_tempo");
    }
  }

  // --- Name-only HIIT / threshold (kettlebells, bodyweight metcon) ---
  if (hiitName && (isConditioningMod || norm(ctx.modality) === "power")) {
    add("intervals_hiit");
  }
  if (thresholdName && isConditioningMod) {
    add("threshold_tempo");
    add("intervals_hiit");
  }
  if (zone2Name && isConditioningMod && !hiitName && !sprintName) {
    add("zone2_aerobic_base");
  }
  if (hillName && isConditioningMod && !intents.has("hills")) {
    add("hills");
  }

  // --- Battle ropes, jump rope, common metcon ---
  if (/battle_rope|rope_slam|jump_rope|jumping_rope|skipping|kb_swing|kettlebell_swing|mountain_climber|burpee/.test(b)) {
    add("intervals_hiit");
    if (plyoJumpName || /burpee|jump_rope|skipping/.test(b)) add("lower_body_power_plyos");
  }

  const intent_slugs = [...intents];

  const stimulus_add: ("aerobic_zone2" | "anaerobic" | "plyometric")[] = [];
  if (intent_slugs.includes("zone2_aerobic_base")) stimulus_add.push("aerobic_zone2");
  if (
    intent_slugs.some((s) =>
      ["intervals_hiit", "sprint", "threshold_tempo", "hills"].includes(s)
    )
  ) {
    stimulus_add.push("anaerobic");
  }
  if (
    intent_slugs.some((s) =>
      ["lower_body_power_plyos", "vertical_jump", "upper_body_power", "olympic_triple_extension"].includes(s)
    )
  ) {
    stimulus_add.push("plyometric");
  }

  const stimUnique = [...new Set(stimulus_add)];

  return { intent_slugs, stimulus_add: stimUnique };
}

function mergeStimulus(
  existing: ExerciseTags["stimulus"] | undefined,
  adds: ("aerobic_zone2" | "anaerobic" | "plyometric")[]
): ExerciseTags["stimulus"] | undefined {
  const seen = new Set((existing ?? []).map(norm));
  const out = [...(existing ?? [])] as NonNullable<ExerciseTags["stimulus"]>;
  for (const a of adds) {
    if (!ALLOWED_STIMULUS_BRIDGE.has(a) || seen.has(a)) continue;
    out.push(a);
    seen.add(a);
  }
  return out.length ? out : existing;
}

/**
 * Union inferred conditioning intents into attribute_tags; optional stimulus bridge for legacy matching.
 */
export function mergePhase4ConditioningIntentOntologyIntoExercise(
  exercise: Exercise,
  input: ExerciseInferenceInput
): void {
  if (!shouldRunPhase4ConditioningInference(exercise, input)) return;

  const ctx: Phase4Context = {
    movement_patterns: exercise.movement_patterns ?? [],
    primary_movement_family: exercise.primary_movement_family,
    modality: exercise.modality,
    equipment: exercise.equipment_required ?? [],
  };

  const { intent_slugs, stimulus_add } = inferPhase4ConditioningIntents(input, ctx);
  if (!intent_slugs.length && !stimulus_add.length) return;

  const attrSet = new Set((exercise.tags.attribute_tags ?? []).map(norm));
  for (const s of intent_slugs) {
    if (INTENT_SET.has(s)) attrSet.add(s);
  }
  const newAttrs = [...attrSet].filter(Boolean);
  if (newAttrs.length) {
    exercise.tags = { ...exercise.tags, attribute_tags: newAttrs };
  }

  if (stimulus_add.length) {
    const mergedStim = mergeStimulus(exercise.tags.stimulus, stimulus_add);
    if (mergedStim?.length) {
      exercise.tags = { ...exercise.tags, stimulus: mergedStim };
    }
  }
}
