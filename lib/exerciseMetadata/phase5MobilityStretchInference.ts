/**
 * Phase 5: Infer mobility_targets + stretch_targets for warmup/cooldown matching.
 * See docs/research/exercise-metadata-phase5-mobility-stretch-targets.md
 * and docs/PHASE4_ANNOTATION_CONVENTIONS.md §6.
 */

import type { Exercise } from "../../logic/workoutGeneration/types";
import { MOBILITY_TARGETS, STRETCH_TARGETS } from "../ontology/vocabularies";
import type { ExerciseInferenceInput } from "./inferenceTypes";

const MOB_SET = new Set<string>(MOBILITY_TARGETS);
const STR_SET = new Set<string>(STRETCH_TARGETS);

const PHASE5_ROLES = new Set([
  "warmup",
  "prep",
  "mobility",
  "stretch",
  "cooldown",
  "breathing",
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

function modalitySet(input: ExerciseInferenceInput): Set<string> {
  return new Set(input.modalities.map(norm));
}

function patternSet(exercise: Exercise): Set<string> {
  return new Set((exercise.movement_patterns ?? []).map(norm));
}

function addMob(out: Set<string>, slug: string) {
  const u = norm(slug);
  if (MOB_SET.has(u)) out.add(u);
}

function addStr(out: Set<string>, slug: string) {
  const u = norm(slug);
  if (STR_SET.has(u)) out.add(u);
}

/** True when modalities, family, or post–Phase-3 role indicate mobility/cooldown menu. */
export function shouldRunPhase5MobilityStretchInference(exercise: Exercise, input: ExerciseInferenceInput): boolean {
  const mods = modalitySet(input);
  if (mods.has("mobility") || mods.has("recovery")) return true;
  const fam = norm(exercise.primary_movement_family ?? "");
  if (fam === "mobility") return true;
  const role = norm(exercise.exercise_role ?? "");
  if (role && PHASE5_ROLES.has(role)) return true;
  return false;
}

/**
 * Infer canonical mobility + stretch target slugs. Conservative: breathing-only → empty.
 */
export function inferPhase5MobilityStretchFromInput(
  input: ExerciseInferenceInput,
  exercise: Exercise
): { mobility_targets: string[]; stretch_targets: string[] } {
  const b = blob(input);
  const tags = tagSet(input);
  const patterns = patternSet(exercise);

  const mobility = new Set<string>();
  const stretch = new Set<string>();

  // Pure breathing / breath-work: no regional targets (Phase 3 may label these as mobility modality).
  if (
    norm(exercise.exercise_role ?? "") === "breathing" ||
    b.includes("breathing_diaphragmatic") ||
    b.includes("diaphragmatic_breathing") ||
    b.includes("box_breathing") ||
    b.includes("breath_work")
  ) {
    return { mobility_targets: [], stretch_targets: [] };
  }

  // --- Multi-region flows (annotation convention: both menus) ---
  if ((b.includes("world") && b.includes("greatest")) || b.includes("worlds_greatest")) {
    addMob(mobility, "thoracic_spine");
    addMob(mobility, "hip_flexors");
    addMob(mobility, "hamstrings");
    addStr(stretch, "thoracic_spine");
    addStr(stretch, "hip_flexors");
    addStr(stretch, "hamstrings");
  }

  // --- Static / end-range stretch cues ---
  if (b.includes("pigeon") || /figure_4|figure4|supine_figure/.test(b)) {
    addStr(stretch, "glutes");
    addStr(stretch, "hip_flexors");
    addMob(mobility, "hip_external_rotation");
  }
  if (b.includes("frog") || b.includes("butterfly") || b.includes("groin") || b.includes("adductor")) {
    addStr(stretch, "hip_flexors");
    addMob(mobility, "hip_internal_rotation");
  }
  if (
    /\b(seated_hamstring|hamstring_stretch|forward_fold|toe_touch|jefferson_curl|straight_leg)\b/.test(b) ||
    (b.includes("forward") && b.includes("fold"))
  ) {
    addStr(stretch, "hamstrings");
  }
  if (/\b(couch_stretch|kneeling_quad|quad_stretch|hip_flexor_stretch|hip_flexor_lunge)\b/.test(b) || (b.includes("hip_flexor") && b.includes("stretch"))) {
    addStr(stretch, "quadriceps");
    addStr(stretch, "hip_flexors");
  }
  if (/\b(calf_stretch|wall_calf|gastroc|soleus)\b/.test(b)) {
    addStr(stretch, "calves");
  }
  if (/\b(child|childs_pose|happy_baby)\b/.test(b)) {
    addStr(stretch, "low_back");
    addStr(stretch, "hip_flexors");
  }
  if (/\b(lat_stretch|doorway_lat|lat_door)\b/.test(b)) {
    addStr(stretch, "lats");
    addStr(stretch, "shoulders");
  }
  if (/\b(cross_body|sleeper_stretch|posterior_capsule|doorway_pec|pec_stretch)\b/.test(b)) {
    addStr(stretch, "shoulders");
  }
  if (/\b(cobra|upward_dog|sphinx)\b/.test(b)) {
    addStr(stretch, "thoracic_spine");
    addStr(stretch, "hip_flexors");
  }
  if (/\b(supine_twist|spinal_twist|thread_the_needle)\b/.test(b) && b.includes("twist")) {
    addStr(stretch, "thoracic_spine");
    addStr(stretch, "low_back");
  }

  // --- Dynamic mobility / prep ---
  if (/\b(cat_camel|cat_cow|quadruped_rock|open_book|book_opener|thoracic_rotation)\b/.test(b) || /\bt_spine\b|t-spine/.test(b)) {
    addMob(mobility, "thoracic_spine");
  }
  if (/\bthread_the_needle\b/.test(b)) {
    addMob(mobility, "thoracic_spine");
    addMob(mobility, "shoulders");
  }
  if (/\b(wall_slide|scap_push|serratus|wall_angel)\b/.test(b) || b.includes("face_pull")) {
    addMob(mobility, "shoulders");
  }
  if (b.includes("band_pull") || b.includes("band_pullapart")) {
    addMob(mobility, "shoulders");
  }
  if (/\b(90_90|hip_switch|hip_car|hip_circle|fire_hydrant|clamshell)\b/.test(b) || b.includes("90/90")) {
    addMob(mobility, "hip_internal_rotation");
    addMob(mobility, "hip_external_rotation");
    addMob(mobility, "glutes");
  }
  if (/\b(ankle_mobility|ankle_rocker|ankle_circles)\b/.test(b)) {
    addMob(mobility, "calves");
  }
  if (/\b(wrist|carpal)\b/.test(b) && (b.includes("mobility") || b.includes("circle") || b.includes("stretch"))) {
    addMob(mobility, "wrists");
  }
  if (/\b(inchworm|walkout)\b/.test(b)) {
    addMob(mobility, "hamstrings");
    addMob(mobility, "thoracic_spine");
  }
  if (/\b(leg_swing|dynamic_hamstring|walking_knee)\b/.test(b)) {
    addMob(mobility, "hamstrings");
    addMob(mobility, "hip_flexors");
  }
  if (/\b(bird_dog|dead_bug|quadruped)\b/.test(b) && !b.includes("rock")) {
    addMob(mobility, "lumbar");
    addMob(mobility, "shoulders");
  }
  if (b.includes("cossack")) {
    addMob(mobility, "hamstrings");
    addMob(mobility, "hip_flexors");
  }

  // --- Tag hints (seed strings like "hip mobility") ---
  for (const t of tags) {
    if (t.includes("thoracic") && t.includes("mobility")) addMob(mobility, "thoracic_spine");
    if (t.includes("hip") && t.includes("mobility")) {
      addMob(mobility, "hip_flexors");
      addMob(mobility, "hip_internal_rotation");
    }
    if (t.includes("shoulder") && (t.includes("mobility") || t.includes("stability"))) addMob(mobility, "shoulders");
  }

  // --- Pattern fallback (Phase 1 patterns) ---
  if (patterns.has("thoracic_mobility")) {
    addMob(mobility, "thoracic_spine");
  }
  if (patterns.has("shoulder_stability")) {
    addMob(mobility, "shoulders");
  }

  // --- Name contains "stretch" but not yet tagged: mild static default from region words ---
  if (stretch.size === 0 && b.includes("stretch") && !b.includes("band_stretch")) {
    if (b.includes("hamstring") || b.includes("seated")) addStr(stretch, "hamstrings");
    else if (b.includes("quad")) addStr(stretch, "quadriceps");
    else if (b.includes("calf")) addStr(stretch, "calves");
    else if (b.includes("shoulder") || b.includes("chest")) addStr(stretch, "shoulders");
    else if (b.includes("hip") || b.includes("glute")) {
      addStr(stretch, "hip_flexors");
      addStr(stretch, "glutes");
    }
  }

  return {
    mobility_targets: [...mobility].sort(),
    stretch_targets: [...stretch].sort(),
  };
}

/**
 * Fill mobility_targets / stretch_targets when DB/static omitted them. Does not overwrite non-empty arrays.
 */
export function mergePhase5MobilityStretchOntologyIntoExercise(exercise: Exercise, input: ExerciseInferenceInput): void {
  if (!shouldRunPhase5MobilityStretchInference(exercise, input)) return;

  const { mobility_targets, stretch_targets } = inferPhase5MobilityStretchFromInput(input, exercise);

  if (!(exercise.mobility_targets?.length) && mobility_targets.length) {
    exercise.mobility_targets = mobility_targets;
  }
  if (!(exercise.stretch_targets?.length) && stretch_targets.length) {
    exercise.stretch_targets = stretch_targets;
  }
}
