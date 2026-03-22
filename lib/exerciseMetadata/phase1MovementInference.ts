/**
 * Phase 1: Infer primary_movement_family, secondary_movement_families, movement_patterns
 * when DB curation is absent. Rules align with docs/research/exercise-metadata-phase1-movement-patterns.md
 * (NSCA movement-pattern frameworks + ACSM multi-joint / major-muscle-group emphasis).
 */

import type { ExerciseDefinition } from "../types";
import type { Exercise } from "../../logic/workoutGeneration/types";
import { getLegacyMovementPattern } from "../ontology/legacyMapping";
import {
  MOVEMENT_FAMILIES,
  MOVEMENT_PATTERNS,
  type MovementFamily,
  type MovementPatternSlug,
} from "../ontology/vocabularies";
import type { ExerciseInferenceInput } from "./inferenceTypes";

const FAMILY = new Set<string>(MOVEMENT_FAMILIES);
const FINE = new Set<string>(MOVEMENT_PATTERNS);

function norm(s: string): string {
  return s.toLowerCase().replace(/\s/g, "_");
}

function blob(input: ExerciseInferenceInput): string {
  return norm(`${input.id}_${input.name}`);
}

function hasMod(input: ExerciseInferenceInput, ...m: string[]): boolean {
  const s = new Set(input.modalities.map(norm));
  return m.some((x) => s.has(norm(x)));
}

function tagSet(input: ExerciseInferenceInput): Set<string> {
  return new Set(input.tags.map(norm));
}

function muscleSet(input: ExerciseInferenceInput): Set<string> {
  return new Set(input.muscles.map(norm));
}

function addFine(out: MovementPatternSlug[], p: string) {
  if (FINE.has(p)) out.push(p as MovementPatternSlug);
}

export type Phase1MovementResult = {
  primary_movement_family: MovementFamily;
  secondary_movement_families: MovementFamily[];
  movement_patterns: MovementPatternSlug[];
};

/**
 * Research-aligned inference. When signals conflict, prefer multi-joint / fundamental pattern
 * (NSCA teaching progression; ACSM emphasis on major muscle groups and multi-joint work).
 */
export function inferPhase1Movement(input: ExerciseInferenceInput): Phase1MovementResult {
  const b = blob(input);
  const tags = tagSet(input);
  const muscles = muscleSet(input);

  const patterns: MovementPatternSlug[] = [];
  const secondaries: MovementFamily[] = [];

  const pushFamily = (): MovementFamily => "upper_push";
  const pullFamily = (): MovementFamily => "upper_pull";

  // --- Modality-first (clear buckets) ---
  if (hasMod(input, "mobility", "recovery")) {
    if (/\b(t_spine|t-spine|thoracic|cat_cow|thread_the_needle)\b/.test(b)) {
      addFine(patterns, "thoracic_mobility");
    } else if (/\b(shoulder|scap|face_pull|wall_slide|y_raise|t_raise)\b/.test(b)) {
      addFine(patterns, "shoulder_stability");
    } else if (/\b(hip|pigeon|90_90|ankle|dowel)\b/.test(b)) {
      addFine(patterns, "thoracic_mobility");
    } else {
      addFine(patterns, "thoracic_mobility");
    }
    return {
      primary_movement_family: "mobility",
      secondary_movement_families: secondaries,
      movement_patterns: patterns.length ? patterns : ["thoracic_mobility"],
    };
  }

  // Locomotion before generic `legs` muscle bucket (NSCA-style locomotion pattern).
  if (
    (hasMod(input, "conditioning") || hasMod(input, "power")) &&
    /(tempo|sprint|run|jog|shuffle|agility|skater|march|piston|high_knee|butt_kick|sled_push|dead_leg)/.test(b) &&
    !/\b(jump|hop|bound|plyo|box_jump|burpee)\b/.test(b)
  ) {
    return {
      primary_movement_family: "conditioning",
      secondary_movement_families: secondaries,
      movement_patterns: ["locomotion"],
    };
  }

  if (hasMod(input, "conditioning") && !hasMod(input, "strength", "hypertrophy", "power")) {
    if (/\b(run|sprint|jog|shuffle|agility|skater|march|piston|tempo_run|high_knee|butt_kick|sled_push)\b/.test(b)) {
      addFine(patterns, "locomotion");
      return { primary_movement_family: "conditioning", secondary_movement_families: secondaries, movement_patterns: patterns };
    }
    if (/\b(jump|hop|bound|plyo|burpee)\b/.test(b)) {
      addFine(patterns, "squat");
      return { primary_movement_family: "conditioning", secondary_movement_families: secondaries, movement_patterns: patterns };
    }
  }

  // --- Hybrids: lower + upper push (NSCA/ACSM multi-joint emphasis); name cues when muscle tags omit push+legs ---
  if (
    b.includes("thruster") ||
    b.includes("wall_ball") ||
    b.includes("wallball") ||
    (muscles.has("legs") && muscles.has("push") && /(push_press|jerk)/.test(b))
  ) {
    addFine(patterns, "squat");
    addFine(patterns, "vertical_push");
    secondaries.push("upper_push");
    return {
      primary_movement_family: "lower_body",
      secondary_movement_families: secondaries,
      movement_patterns: patterns,
    };
  }

  // --- Lower body ---
  if (muscles.has("legs")) {
    const hingeCue =
      tags.has("posterior_chain") ||
      tags.has("hamstrings") ||
      tags.has("glutes") ||
      /\b(deadlift|rdl|romanian|good_morning|hinge|kb_swing|kettlebell_swing|swing|hip_hinge|pull_through|glute_ham)\b/.test(b);
    const lungeCue = /\b(lunge|split_squat|split squat|bulgarian|step_up|step-up|rear_foot)\b/.test(b);
    const squatCue =
      tags.has("quad-focused") ||
      tags.has("squat") ||
      /\b(squat|leg_press|leg press|goblet|front_squat|back_squat|hack_squat)\b/.test(b);

    if (lungeCue) {
      addFine(patterns, "lunge");
    } else if (hingeCue && !squatCue) {
      addFine(patterns, "hinge");
    } else {
      addFine(patterns, "squat");
    }

    if (hasMod(input, "power") && /\b(jump|hop|bound|box|plyo)\b/.test(b)) {
      if (!patterns.includes("squat" as MovementPatternSlug)) addFine(patterns, "squat");
    }

    return {
      primary_movement_family: "lower_body",
      secondary_movement_families: secondaries,
      movement_patterns: patterns.length ? patterns : ["squat"],
    };
  }

  // --- Core ---
  if (muscles.has("core")) {
    if (/\b(pallof|anti_rotation|anti-rotation|side_plank|suitcase)\b/.test(b)) {
      addFine(patterns, "anti_rotation");
    } else if (/\b(woodchop|chop|lift|rotation|twist|russian)\b/.test(b)) {
      addFine(patterns, "rotation");
    } else {
      addFine(patterns, "anti_rotation");
      addFine(patterns, "rotation");
    }
    return {
      primary_movement_family: "core",
      secondary_movement_families: secondaries,
      movement_patterns: patterns.length ? patterns : ["anti_rotation"],
    };
  }

  // --- Upper push ---
  if (muscles.has("push")) {
    const vertical =
      /\b(overhead|ohp|oh_press|shoulder_press|strict_press|push_press|jerk|handstand|pike_push|arnold|landmine_press)\b/.test(b) ||
      tags.has("shoulders");
    if (vertical) {
      addFine(patterns, "vertical_push");
    } else {
      addFine(patterns, "horizontal_push");
    }
    return {
      primary_movement_family: pushFamily(),
      secondary_movement_families: secondaries,
      movement_patterns: patterns.length ? patterns : ["horizontal_push"],
    };
  }

  // --- Upper pull ---
  if (muscles.has("pull")) {
    const vertical =
      /\b(pull_up|pullup|pull-up|chin|chin-up|lat_pulldown|pulldown|muscle_up)\b/.test(b) ||
      tags.has("lats");
    if (vertical) {
      addFine(patterns, "vertical_pull");
    } else {
      addFine(patterns, "horizontal_pull");
    }
    return {
      primary_movement_family: pullFamily(),
      secondary_movement_families: secondaries,
      movement_patterns: patterns.length ? patterns : ["horizontal_pull"],
    };
  }

  // --- Carry (name-based; muscle taxonomy often omits) ---
  if (/\b(carry|farmer|suitcase|rack_walk|yoke)\b/.test(b)) {
    addFine(patterns, "carry");
    return {
      primary_movement_family: "lower_body",
      secondary_movement_families: secondaries,
      movement_patterns: patterns,
    };
  }

  // --- Power / conditioning without explicit legs tag (sprints, jumps) ---
  if (hasMod(input, "power", "conditioning")) {
    if (/\b(run|sprint|shuffle|agility)\b/.test(b)) {
      addFine(patterns, "locomotion");
      return { primary_movement_family: "conditioning", secondary_movement_families: secondaries, movement_patterns: patterns };
    }
    if (/\b(jump|hop|bound|box)\b/.test(b)) {
      addFine(patterns, "squat");
      return { primary_movement_family: "lower_body", secondary_movement_families: secondaries, movement_patterns: patterns };
    }
  }

  // --- Unknown: conservative default (fundamental pattern; see research note) ---
  return {
    primary_movement_family: "lower_body",
    secondary_movement_families: secondaries,
    movement_patterns: ["squat"],
  };
}

export function inferPhase1MovementFromInput(input: ExerciseInferenceInput): Phase1MovementResult {
  return inferPhase1Movement(input);
}

export function exerciseInferenceInputFromDefinition(def: ExerciseDefinition): ExerciseInferenceInput {
  return {
    id: def.id,
    name: def.name,
    muscles: [...(def.muscles ?? [])],
    modalities: [...(def.modalities ?? [])],
    equipment: [...(def.equipment ?? [])].map((e) => String(e)),
    tags: [...(def.tags ?? [])],
    contraindications: def.contraindications?.map((c) => String(c)),
  };
}

/** Minimal DB row shape (avoids circular import with generatorExerciseAdapter). */
export type Phase1DbRowInput = {
  slug: string;
  name: string;
  primary_muscles: string[];
  secondary_muscles: string[];
  modalities: string[];
  equipment: string[];
};

export function exerciseInferenceInputFromDbRow(row: Phase1DbRowInput, tagSlugs: string[]): ExerciseInferenceInput {
  const muscles = [...(row.primary_muscles ?? []), ...(row.secondary_muscles ?? [])];
  return {
    id: row.slug,
    name: row.name,
    muscles,
    modalities: [...(row.modalities ?? [])],
    equipment: [...(row.equipment ?? [])].map((e) => String(e)),
    tags: tagSlugs,
  };
}

/** Apply Phase 1 fields to a generator Exercise when DB did not supply them. */
export function mergePhase1MovementOntologyIntoExercise(
  exercise: Exercise,
  input: ExerciseInferenceInput
): void {
  const hasFamily = exercise.primary_movement_family != null && exercise.primary_movement_family !== "";
  const hasFine = (exercise.movement_patterns?.length ?? 0) > 0;
  if (hasFamily && hasFine) return;

  const p1 = inferPhase1MovementFromInput(input);
  if (!hasFamily && FAMILY.has(p1.primary_movement_family)) {
    exercise.primary_movement_family = p1.primary_movement_family;
  }
  if (!hasFine && p1.movement_patterns.length) {
    exercise.movement_patterns = [...p1.movement_patterns];
  }
  if (
    (!exercise.secondary_movement_families || exercise.secondary_movement_families.length === 0) &&
    p1.secondary_movement_families.length
  ) {
    exercise.secondary_movement_families = [...p1.secondary_movement_families];
  }
  exercise.movement_pattern = getLegacyMovementPattern({
    movement_patterns: exercise.movement_patterns,
    movement_pattern: exercise.movement_pattern,
  }) as Exercise["movement_pattern"];
}
