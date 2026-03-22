/**
 * Phase 2: Infer joint_stress_tags, contraindication_tags, impact_level when DB curation is absent.
 * Definitions and conservative rules are anchored in docs/research/exercise-metadata-phase2-safety-layer.md
 * (NSCA plyometric/landing framing, ACSM resistance-training selection, NATA multicomponent ACL prevention).
 *
 * Policy: only emit canonical slugs from lib/ontology/vocabularies.ts. Unknown / ambiguous → omit tags
 * (no false hard-excludes). Mobility/recovery-only entries default to no joint-stress tags.
 */

import type { Exercise } from "../../logic/workoutGeneration/types";
import {
  DEMAND_LEVELS,
  JOINT_STRESS_TAGS,
  isContraindicationTag,
  isJointStressTag,
  type ContraindicationTag,
  type DemandLevel,
  type JointStressTag,
} from "../ontology/vocabularies";
import type { ExerciseInferenceInput } from "./inferenceTypes";

const STRESS_SET = new Set<string>(JOINT_STRESS_TAGS);
const DEMAND_SET = new Set<string>(DEMAND_LEVELS);

export type Phase2MovementContext = {
  movement_patterns: string[];
  primary_movement_family?: string;
};

export type Phase2SafetyResult = {
  joint_stress_tags: JointStressTag[];
  impact_level?: DemandLevel;
};

/** Implied user-facing regions for each joint-stress slug (see EXERCISE_ONTOLOGY_DESIGN F.6). */
export const JOINT_STRESS_TO_CONTRAINDICATION: Record<JointStressTag, readonly ContraindicationTag[]> = {
  shoulder_overhead: ["shoulder"],
  shoulder_extension_load: ["shoulder"],
  shoulder_abduction_load: ["shoulder"],
  shoulder_external_rotation_load: ["shoulder"],
  grip_hanging: ["shoulder"],
  knee_flexion: ["knee"],
  deep_knee_flexion: ["knee"],
  spinal_axial_load: ["lower_back"],
  lumbar_shear: ["lower_back"],
  lumbar_flexion_load: ["lower_back"],
  wrist_extension_load: ["wrist"],
  elbow_stress: ["elbow"],
  hip_stress: ["hip"],
  ankle_stress: ["ankle"],
};

function norm(s: string): string {
  return s.toLowerCase().replace(/[\s-]+/g, "_").replace(/_+/g, "_");
}

function blob(input: ExerciseInferenceInput): string {
  return norm(`${input.id}_${input.name}`);
}

function tagSet(input: ExerciseInferenceInput): Set<string> {
  return new Set(input.tags.map(norm));
}

function muscleSet(input: ExerciseInferenceInput): Set<string> {
  return new Set(input.muscles.map(norm));
}

function modalitySet(input: ExerciseInferenceInput): Set<string> {
  return new Set(input.modalities.map(norm));
}

function hasStimulus(tagS: Set<string>, s: string): boolean {
  return tagS.has(norm(s));
}

/** Map legacy / DB slugs to canonical joint_stress_tags (matches generatorExerciseAdapter + INJURY_AVOID legacy names). */
export function canonicalizeJointStressSlugs(raw: string[] | null | undefined): JointStressTag[] {
  if (!raw?.length) return [];
  const out: JointStressTag[] = [];
  for (let s of raw) {
    let u = norm(String(s));
    if (u.startsWith("joint_")) u = u.slice(6);
    if (u === "shoulder_extension") u = "shoulder_extension_load";
    if (u === "wrist_stress") u = "wrist_extension_load";
    if (isJointStressTag(u)) out.push(u);
  }
  return [...new Set(out)];
}

export function contraindicationsFromJointStress(tags: readonly JointStressTag[]): ContraindicationTag[] {
  const out = new Set<ContraindicationTag>();
  for (const t of tags) {
    for (const c of JOINT_STRESS_TO_CONTRAINDICATION[t] ?? []) out.add(c);
  }
  return [...out];
}

function normalizeContraindicationSlugs(raw: string[] | null | undefined): ContraindicationTag[] {
  if (!raw?.length) return [];
  const out: ContraindicationTag[] = [];
  for (const s of raw) {
    const u = norm(String(s));
    if (isContraindicationTag(u)) out.push(u);
  }
  return [...new Set(out)];
}

function addStress(out: Set<string>, slug: string) {
  if (STRESS_SET.has(slug)) out.add(slug);
}

/**
 * Research-aligned heuristic inference. Conservative where load is ambiguous (e.g. omit wrist tags for generic work).
 */
export function inferPhase2Safety(input: ExerciseInferenceInput, ctx: Phase2MovementContext): Phase2SafetyResult {
  const b = blob(input);
  const tags = tagSet(input);
  const muscles = muscleSet(input);
  const modalities = modalitySet(input);
  const patterns = new Set((ctx.movement_patterns ?? []).map(norm));
  const family = ctx.primary_movement_family ? norm(ctx.primary_movement_family) : "";

  const stress = new Set<string>();
  let impact: DemandLevel | undefined;

  const hasLoadModality =
    modalities.has("strength") ||
    modalities.has("hypertrophy") ||
    modalities.has("power") ||
    modalities.has("conditioning") ||
    modalities.has("skill");

  const mobilityOnly =
    (modalities.has("mobility") || modalities.has("recovery")) && !hasLoadModality;

  if (mobilityOnly || family === "mobility") {
    return {
      joint_stress_tags: [],
      impact_level: "none",
    };
  }

  const plyoStimulus = hasStimulus(tags, "plyometric");
  // Word boundaries fail inside slug blobs like `foo_box_jump_bar` because `_` is a "word" char in JS.
  const plyoName =
    /\b(jump|jumping|hop|hopping|bound|bounding|plyo|plyometric|burpee|depth_jump|tuck_jump|broad_jump|vertical_jump|leap)\b/.test(b) ||
    b.includes("box_jump") ||
    b.includes("boxjump") ||
    b.includes("depth_jump");
  const skipRope = /\b(jump_rope|jumping_rope|skipping|skip_rope)\b/.test(b);

  if (plyoStimulus || plyoName) {
    addStress(stress, "knee_flexion");
    addStress(stress, "ankle_stress");
    if (/\b(depth|single_leg|single.leg|pistol|lateral_bound)\b/.test(b)) addStress(stress, "hip_stress");
    impact = "high";
  } else if (
    patterns.has("locomotion") ||
    /\b(run|running|sprint|sprinting|jog|jogging|shuffle|agility|skater|high_knee|butt_kick|tempo_run|treadmill)\b/.test(b) ||
    skipRope
  ) {
    addStress(stress, "knee_flexion");
    addStress(stress, "ankle_stress");
    impact = skipRope || /\b(sprint|agility|skater)\b/.test(b) ? "medium" : "medium";
  }

  if (patterns.has("vertical_push") || /\b(ohp|oh_press|overhead_press|military_press|strict_press|push_press|push_jerk|split_jerk|wall_ball|wallball|thruster|z_press|handstand_push|hspu|arnold_press)\b/.test(b)) {
    addStress(stress, "shoulder_overhead");
    if (
      /barbell|bb_|back_squat|front_squat|overhead_squat|oh_squat|yoke|standing/.test(b) ||
      (patterns.has("squat") && patterns.has("vertical_push"))
    ) {
      addStress(stress, "spinal_axial_load");
    }
  }

  const verticalPullCue =
    patterns.has("vertical_pull") ||
    /\b(pullup|pull.up|pull_up|chinup|chin.up|chin_up|muscle.up|muscle_up|lat_pulldown|lat.pulldown|cable_pulldown)\b/.test(b) ||
    b.includes("pullup") ||
    b.includes("pull_up") ||
    b.includes("chinup") ||
    b.includes("chin_up") ||
    b.includes("lat_pulldown");
  if (verticalPullCue) {
    addStress(stress, "shoulder_extension_load");
    if (
      /\b(pullup|pull_up|chin|chinup|muscle_up|hanging|toes_to_bar|leg_raise|dead_hang)\b/.test(b) ||
      b.includes("pullup") ||
      b.includes("pull_up") ||
      b.includes("chinup") ||
      b.includes("chin_up") ||
      b.includes("muscle_up") ||
      b.includes("toes_to_bar")
    ) {
      addStress(stress, "grip_hanging");
    }
  }

  if (
    patterns.has("horizontal_push") ||
    /\b(bench|pushup|push.up|push_up|dip|floor_press|chest_press|incline_press|decline_press|pec_deck)\b/.test(b)
  ) {
    addStress(stress, "shoulder_abduction_load");
    if (/\b(dip|skull|triceps_extension|preacher|jm_press)\b/.test(b)) addStress(stress, "elbow_stress");
  }

  if (patterns.has("horizontal_pull") || /\b(row|rowing|bent.over|bent_over|seated_row|t.bar_row|meadows_row)\b/.test(b)) {
    addStress(stress, "shoulder_extension_load");
  }

  if (
    patterns.has("squat") ||
    patterns.has("lunge") ||
    (muscles.has("legs") && /\b(squat|leg_press|leg_extension|hack_squat|goblet|wall_sit|sled_push)\b/.test(b))
  ) {
    addStress(stress, "knee_flexion");
    if (
      /\b(pistol|atg|deep_squat|ass_to|ass.to|overhead_squat|oh_squat|sissy|duck_walk|split_squat|bulgarian|lunge|step.up|step_up)\b/.test(b)
    ) {
      addStress(stress, "deep_knee_flexion");
    }
  }

  if (patterns.has("hinge") || /\b(deadlift|dead_lift|rdl|romanian|good_morning|stiff_leg|kb_swing|kettlebell_swing|clean|snatch|hip_thrust|glute_bridge)\b/.test(b)) {
    addStress(stress, "lumbar_shear");
    addStress(stress, "spinal_axial_load");
  }

  if (patterns.has("carry") || /\b(farmer|suitcase_carry|yoke|rack_walk|loaded_carry)\b/.test(b)) {
    addStress(stress, "spinal_axial_load");
  }

  if (patterns.has("rotation") || /\b(woodchop|wood_chop|chop|rotat|landmine_twist|med_ball_throw)\b/.test(b)) {
    addStress(stress, "lumbar_shear");
  }

  if (/\b(face_pull|external_rotation|cable_external_rotation|band_pull_apart)\b/.test(b)) {
    addStress(stress, "shoulder_external_rotation_load");
  }

  if (/\b(battle_rope|battling_rope|rope_wave|rope_slams)\b/.test(b)) {
    addStress(stress, "shoulder_extension_load");
    addStress(stress, "shoulder_abduction_load");
  }

  if (/\b(pushup|push_up|plank|handstand|bear_crawl|burpee)\b/.test(b)) {
    addStress(stress, "wrist_extension_load");
  }

  const joint_stress_tags = [...stress].filter(isJointStressTag) as JointStressTag[];

  const explicitContra = normalizeContraindicationSlugs(input.contraindications);
  const fromJoint = contraindicationsFromJointStress(joint_stress_tags);
  const contraindication_tags = [...new Set([...explicitContra, ...fromJoint])];

  if (impact === undefined) {
    if (modalities.has("conditioning") || modalities.has("power")) {
      impact = modalities.has("power") && !plyoName && !plyoStimulus ? "low" : "low";
    } else {
      impact = "low";
    }
  }

  return { joint_stress_tags, contraindication_tags, impact_level: impact };
}

export function inferPhase2SafetyFromInput(
  input: ExerciseInferenceInput,
  ctx: Phase2MovementContext
): Phase2SafetyResult {
  return inferPhase2Safety(input, ctx);
}

function isValidDemand(s: string | undefined | null): s is DemandLevel {
  return s != null && DEMAND_SET.has(s);
}

/**
 * Lift legacy tags.joint_stress into joint_stress_tags when ontology column was empty.
 * Sync tags.joint_stress / tags.contraindications when ontology fields are populated.
 */
export function mergePhase2SafetyOntologyIntoExercise(
  exercise: Exercise,
  input: ExerciseInferenceInput,
  ctx: Phase2MovementContext
): void {
  const p2 = inferPhase2SafetyFromInput(input, ctx);

  if (!exercise.joint_stress_tags?.length) {
    const fromLegacy = canonicalizeJointStressSlugs(exercise.tags?.joint_stress);
    if (fromLegacy.length) {
      exercise.joint_stress_tags = [...fromLegacy];
    } else if (p2.joint_stress_tags.length) {
      exercise.joint_stress_tags = [...p2.joint_stress_tags];
    }
  }

  if (!exercise.contraindication_tags?.length) {
    const fromTags = normalizeContraindicationSlugs(exercise.tags?.contraindications);
    const jointCanon = (exercise.joint_stress_tags ?? []).filter(isJointStressTag) as JointStressTag[];
    const fromJoint = contraindicationsFromJointStress(jointCanon);
    const merged = [...new Set([...fromTags, ...fromJoint, ...normalizeContraindicationSlugs(input.contraindications)])];
    if (merged.length) {
      exercise.contraindication_tags = merged;
    }
  }

  if (!isValidDemand(exercise.impact_level) && p2.impact_level != null) {
    exercise.impact_level = p2.impact_level;
  }

  const ontologyJoint = exercise.joint_stress_tags;
  if (ontologyJoint?.length) {
    exercise.tags = { ...exercise.tags, joint_stress: [...ontologyJoint] };
  }

  const ontologyContra = exercise.contraindication_tags;
  if (ontologyContra?.length) {
    exercise.tags = { ...exercise.tags, contraindications: [...ontologyContra] };
  }
}
