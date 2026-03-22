/**
 * Phase 3: Infer exercise_role, pairing_category, fatigue_regions for block placement,
 * superset pairing (logic/workoutIntelligence/supersetPairing.ts), and ontology scoring.
 *
 * Anchored in docs/research/exercise-metadata-phase3-session-structure.md
 * (NSCA-style exercise order; agonist–antagonist / complementary pairing literature).
 */

import type { Exercise } from "../../logic/workoutGeneration/types";
import {
  FATIGUE_REGIONS,
  isExerciseRole,
  isFatigueRegion,
  isPairingCategory,
  type ExerciseRole,
  type FatigueRegion,
  type PairingCategory,
} from "../ontology/vocabularies";
import type { ExerciseInferenceInput } from "./inferenceTypes";

const FATIGUE_SET = new Set<string>(FATIGUE_REGIONS);

const COMPOUND_FINE = new Set([
  "squat",
  "hinge",
  "lunge",
  "horizontal_push",
  "vertical_push",
  "horizontal_pull",
  "vertical_pull",
  "carry",
]);

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

export type Phase3Context = {
  movement_patterns: string[];
  primary_movement_family?: string;
  movement_pattern: string;
  modality: string;
  joint_stress_tags?: string[];
};

export type Phase3SessionResult = {
  exercise_role?: ExerciseRole;
  pairing_category?: PairingCategory;
  fatigue_regions?: FatigueRegion[];
};

/** Muscle taxonomy → canonical fatigue region (aligns with ontologyNormalization MUSCLE_TO_FATIGUE). */
const MUSCLE_TO_FATIGUE: Record<string, FatigueRegion> = {
  chest: "pecs",
  pecs: "pecs",
  triceps: "triceps",
  shoulders: "shoulders",
  back: "lats",
  lats: "lats",
  biceps: "biceps",
  quads: "quads",
  glutes: "glutes",
  hamstrings: "hamstrings",
  calves: "calves",
  core: "core",
  forearms: "grip",
  push: "pecs",
  pull: "lats",
  legs: "quads",
};

function addFatigue(out: Set<string>, slug: string) {
  const u = norm(slug);
  if (FATIGUE_SET.has(u)) out.add(u);
}

function inferFatigueRegions(
  input: ExerciseInferenceInput,
  ctx: Phase3Context,
  pairing: PairingCategory | undefined
): FatigueRegion[] {
  const out = new Set<string>();
  const muscles = muscleSet(input);
  const patterns = new Set(ctx.movement_patterns.map(norm));

  for (const m of muscles) {
    const mapped = MUSCLE_TO_FATIGUE[m];
    if (mapped) addFatigue(out, mapped);
  }

  if (muscles.has("legs")) {
    if (patterns.has("hinge")) {
      addFatigue(out, "hamstrings");
      addFatigue(out, "glutes");
    } else if (patterns.has("squat") || patterns.has("lunge")) {
      addFatigue(out, "quads");
      addFatigue(out, "glutes");
    } else {
      addFatigue(out, "quads");
      addFatigue(out, "glutes");
    }
  }

  if (pairing === "posterior_chain") {
    addFatigue(out, "hamstrings");
    addFatigue(out, "glutes");
  }
  if (pairing === "quads") {
    addFatigue(out, "quads");
    addFatigue(out, "glutes");
  }
  if (pairing === "chest") {
    addFatigue(out, "pecs");
    addFatigue(out, "triceps");
  }
  if (pairing === "shoulders") addFatigue(out, "shoulders");
  if (pairing === "triceps") addFatigue(out, "triceps");
  if (pairing === "back") {
    addFatigue(out, "lats");
    addFatigue(out, "biceps");
  }
  if (pairing === "biceps") addFatigue(out, "biceps");
  if (pairing === "core") addFatigue(out, "core");
  if (pairing === "grip") addFatigue(out, "grip");
  if (pairing === "mobility") addFatigue(out, "core");

  const joint = ctx.joint_stress_tags ?? [];
  if (joint.some((t) => norm(t) === "grip_hanging")) addFatigue(out, "grip");

  const b = blob(input);
  if (/\b(row|rowing|pullup|pull_up|chin|deadlift|carry|farmer|swing)\b/.test(b) || b.includes("pullup")) {
    addFatigue(out, "grip");
  }

  const list = [...out].filter(isFatigueRegion) as FatigueRegion[];
  return [...new Set(list)];
}

function inferPairingCategory(input: ExerciseInferenceInput, ctx: Phase3Context): PairingCategory | undefined {
  const patterns = new Set(ctx.movement_patterns.map(norm));
  const muscles = muscleSet(input);
  const family = ctx.primary_movement_family ? norm(ctx.primary_movement_family) : "";
  const b = blob(input);

  if (family === "mobility" || family === "conditioning") {
    if (/\b(battle_rope|rope_wave|ski_erg)\b/.test(b)) return "back";
    if (family === "mobility") return "mobility";
  }

  if (patterns.has("horizontal_push")) {
    if ((muscles.has("shoulders") || muscles.has("delts")) && !muscles.has("chest") && !muscles.has("pecs"))
      return "shoulders";
    if (muscles.has("triceps") && muscles.size <= 2 && !muscles.has("chest")) return "triceps";
    return "chest";
  }
  if (patterns.has("vertical_push")) return "shoulders";

  if (patterns.has("horizontal_pull") || patterns.has("vertical_pull")) return "back";

  if (patterns.has("squat") || patterns.has("lunge")) return "quads";
  if (patterns.has("hinge")) return "posterior_chain";
  if (patterns.has("carry")) return "grip";
  if (patterns.has("rotation") || patterns.has("anti_rotation")) return "core";
  if (patterns.has("locomotion")) return "quads";

  const leg = norm(ctx.movement_pattern);
  if (leg === "squat" || leg === "hinge" || leg === "locomotion") {
    if (muscles.has("hamstrings") || muscles.has("glutes")) return "posterior_chain";
    return "quads";
  }
  if (leg === "push") {
    if (muscles.has("chest")) return "chest";
    if (muscles.has("shoulders")) return "shoulders";
    if (muscles.has("triceps")) return "triceps";
    return "chest";
  }
  if (leg === "pull") return "back";
  if (leg === "carry") return "grip";
  if (leg === "rotate") return "core";

  return undefined;
}

function inferExerciseRole(input: ExerciseInferenceInput, ctx: Phase3Context): ExerciseRole | undefined {
  const b = blob(input);
  const tags = tagSet(input);
  const muscles = muscleSet(input);
  const modalities = modalitySet(input);
  const patterns = new Set(ctx.movement_patterns.map(norm));
  const mod = norm(ctx.modality);
  const family = ctx.primary_movement_family ? norm(ctx.primary_movement_family) : "";

  const hasStrengthLike =
    modalities.has("strength") || modalities.has("hypertrophy") || modalities.has("power") || modalities.has("skill");
  const hasConditioning = modalities.has("conditioning");
  const hasMobilityMod = modalities.has("mobility") || modalities.has("recovery");

  if (hasMobilityMod && !hasStrengthLike && !hasConditioning) {
    if (
      /\b(stretch|forward_fold|seated_hamstring|pigeon_pose|static_stretch|passive)\b/.test(b) ||
      b.includes("stretch") && !b.includes("band_stretch")
    ) {
      return "stretch";
    }
    return "mobility";
  }

  if (/\b(breath|breathing|box_breathing|diaphragm|parasympathetic|meditation)\b/.test(b)) {
    return "breathing";
  }

  if (hasConditioning && !hasStrengthLike) {
    return "conditioning";
  }

  if (/\b(finisher|burnout|amrap_finish|metcon_finish)\b/.test(b)) {
    return "finisher";
  }

  if (
    /\b(bird_dog|dead_bug|band_pull|band_pull_apart|monster_walk|clamshell|inchworm|scap_push|shoulder_tap|glute_bridge|fire_hydrant|pallof)\b/.test(
      b
    ) ||
    b.includes("bird_dog") ||
    b.includes("dead_bug") ||
    b.includes("glute_bridge") ||
    b.includes("band_pull")
  ) {
    return "prep";
  }

  if (
    hasStrengthLike &&
    /\b(warmup|warm_up|dynamic_prep|leg_swing|arm_circle|jumping_jack|easy_|light_jog)\b/.test(b) &&
    !/\b(squat|deadlift|bench|press|row|clean|snatch)\b/.test(b)
  ) {
    return "warmup";
  }

  const accessoryCue =
    /\b(face_pull|y_raise|t_raise|wall_slide|rear_delt|reverse_fly|landmine_press|rotator)\b/.test(b) ||
    tags.has("scapular_control");

  const isolationCue =
    /\b(curl|triceps_extension|pushdown|kickback|fly|flies|lateral_raise|front_raise|calf_raise|leg_extension|leg_curl|wrist_curl|shrug|skull|preacher|pec_deck|concentration)\b/.test(
      b
    ) ||
    b.includes("pushdown") ||
    b.includes("leg_extension") ||
    b.includes("leg_curl") ||
    (muscles.size === 1 &&
      (muscles.has("biceps") || muscles.has("triceps") || muscles.has("calves") || muscles.has("forearms")));

  const hasCompoundFine = [...patterns].some((p) => COMPOUND_FINE.has(p));

  if (accessoryCue && !isolationCue) {
    return "accessory";
  }

  if (isolationCue) {
    return "isolation";
  }

  if (hasCompoundFine && (hasStrengthLike || mod === "power")) {
    return "main_compound";
  }

  if (family === "upper_push" || family === "upper_pull" || family === "lower_body") {
    if (hasCompoundFine) return "main_compound";
    return "accessory";
  }

  if (family === "core") {
    if (patterns.has("carry") || patterns.has("rotation")) return "main_compound";
    return "accessory";
  }

  if (family === "conditioning" && hasStrengthLike) {
    return "finisher";
  }

  return undefined;
}

export function inferPhase3SessionFromInput(input: ExerciseInferenceInput, ctx: Phase3Context): Phase3SessionResult {
  const pairingRaw = inferPairingCategory(input, ctx);
  const pairing = pairingRaw && isPairingCategory(pairingRaw) ? pairingRaw : undefined;
  const roleRaw = inferExerciseRole(input, ctx);
  const exercise_role = roleRaw && isExerciseRole(roleRaw) ? roleRaw : undefined;
  const fatigue_regions = inferFatigueRegions(input, ctx, pairing);
  return {
    exercise_role,
    pairing_category: pairing,
    fatigue_regions: fatigue_regions.length ? fatigue_regions : undefined,
  };
}

/**
 * Fill exercise_role, pairing_category, fatigue_regions when DB/static omitted them.
 * Does not overwrite non-empty curated ontology fields.
 */
export function mergePhase3SessionOntologyIntoExercise(
  exercise: Exercise,
  input: ExerciseInferenceInput,
  ctx: Phase3Context
): void {
  const p3 = inferPhase3SessionFromInput(input, ctx);

  if (!exercise.exercise_role && p3.exercise_role) {
    exercise.exercise_role = p3.exercise_role;
  }

  if (!exercise.pairing_category && p3.pairing_category) {
    exercise.pairing_category = p3.pairing_category;
  }

  if (!(exercise.fatigue_regions?.length) && p3.fatigue_regions?.length) {
    exercise.fatigue_regions = [...p3.fatigue_regions];
  }
}
