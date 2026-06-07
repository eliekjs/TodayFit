/**
 * Shared vertical-jump sub-focus classification, tag weights, and exercise signals.
 * Sport-agnostic: basketball, volleyball, standalone vertical_jump sport, and goal-level
 * vertical_jump sub-focuses should rank lower-body plyometrics and strength staples ahead of
 * med-ball throws that only share generic explosive_power tags.
 */

import type { SubFocusTagMapEntry } from "./types";
import type { Exercise } from "../../logic/workoutGeneration/types";
import { tagSetHasDynamicPowerSignal } from "./subFocusIntentArchetypes";

export const VERTICAL_JUMP_SUB_FOCUS_SLUG = "vertical_jump";

const MED_BALL_POWER_TOKENS = [
  "med_ball",
  "medicine_ball",
  "wall_ball",
  "ball_slam",
  "ball_throw",
  "medball",
] as const;

const LOWER_BODY_PLYO_JUMP_TOKENS = [
  "box_jump",
  "depth_jump",
  "depth_drop",
  "pogo_jump",
  "pogo_jumps",
  "squat_jump",
  "jump_squat",
  "tuck_jump",
  "hurdle_jump",
  "trap_bar_jump",
  "knee_jump",
  "single_leg_vertical",
  "rebound_vertical",
  "linear_pogo",
  "lateral_pogo",
  "mini_hurdle_hop",
] as const;

export function normVerticalJumpToken(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
}

export function isVerticalJumpSubFocusSlug(slug: string): boolean {
  return normVerticalJumpToken(slug) === VERTICAL_JUMP_SUB_FOCUS_SLUG;
}

/** Primary vertical-jump emphasis: plyos first, strength patterns secondary. */
export const SHARED_TAG_WEIGHTS_VERTICAL_JUMP: SubFocusTagMapEntry[] = [
  { tag_slug: "explosive_power", weight: 1.4 },
  { tag_slug: "plyometric", weight: 1.3 },
  { tag_slug: "explosive", weight: 1.2 },
  { tag_slug: "power", weight: 1.2 },
  { tag_slug: "reactive_power", weight: 1 },
  { tag_slug: "squat_pattern", weight: 0.9 },
  { tag_slug: "hinge_pattern", weight: 0.9 },
  { tag_slug: "single_leg_strength", weight: 0.8 },
  { tag_slug: "knee_stability", weight: 0.7 },
];

/** Strength foundation sub-focus under standalone vertical_jump sport. */
export const SHARED_TAG_WEIGHTS_VERTICAL_JUMP_STRENGTH_FOUNDATION: SubFocusTagMapEntry[] = [
  { tag_slug: "squat_pattern", weight: 1.3 },
  { tag_slug: "hinge_pattern", weight: 1.2 },
  { tag_slug: "max_strength", weight: 1.1 },
  { tag_slug: "posterior_chain", weight: 1 },
  { tag_slug: "single_leg_strength", weight: 0.9 },
];

export function exerciseBlobForVerticalJump(exercise: Pick<Exercise, "id" | "name">): string {
  return normVerticalJumpToken(`${exercise.id ?? ""}_${exercise.name ?? ""}`);
}

/** Med-ball slams/tosses share explosive tags but are not vertical-jump plyometrics. */
export function exerciseIsMedBallPowerThrow(exercise: Pick<Exercise, "id" | "name">): boolean {
  const blob = exerciseBlobForVerticalJump(exercise);
  return MED_BALL_POWER_TOKENS.some((token) => blob.includes(token));
}

function exerciseHasLowerBodyMuscleSignal(exercise: Exercise): boolean {
  const muscles = new Set((exercise.muscle_groups ?? []).map((m) => normVerticalJumpToken(m)));
  const pattern = normVerticalJumpToken(exercise.movement_pattern ?? "");
  const family = normVerticalJumpToken(exercise.primary_movement_family ?? "");
  return (
    pattern === "locomotion" ||
    pattern === "squat" ||
    pattern === "hinge" ||
    family === "lower_body" ||
    muscles.has("legs") ||
    muscles.has("quads") ||
    muscles.has("glutes") ||
    muscles.has("hamstrings") ||
    muscles.has("calves")
  );
}

/**
 * True for box/depth/pogo/squat jumps and other lower-body reactive plyometrics — not med-ball throws.
 */
export function exerciseHasLowerBodyPlyoJumpSignal(exercise: Exercise): boolean {
  if (exerciseIsMedBallPowerThrow(exercise)) return false;

  const blob = exerciseBlobForVerticalJump(exercise);
  if (blob.includes("burpee_broad") || (blob.includes("burpee") && blob.includes("broad"))) return false;
  if (LOWER_BODY_PLYO_JUMP_TOKENS.some((token) => blob.includes(token))) return true;
  if (/approach_.*jump/.test(blob)) return true;

  const stimulus = new Set((exercise.tags?.stimulus ?? []).map((s) => normVerticalJumpToken(String(s))));
  if (stimulus.has("plyometric") && exerciseHasLowerBodyMuscleSignal(exercise)) return true;

  const attrs = new Set((exercise.tags?.attribute_tags ?? []).map((a) => normVerticalJumpToken(a)));
  if (
    (attrs.has("jumping") || attrs.has("reactive_power")) &&
    exerciseHasLowerBodyMuscleSignal(exercise)
  ) {
    return true;
  }

  return false;
}

/** Stricter than generic explosive_plyometric gate: excludes med-ball throws. */
export function exercisePassesVerticalJumpDynamicGate(exercise: Exercise): boolean {
  if (exerciseIsMedBallPowerThrow(exercise)) return false;
  if (exerciseHasLowerBodyPlyoJumpSignal(exercise)) return true;
  const tags = new Set<string>();
  const add = (s: string | undefined) => {
    if (s) tags.add(normVerticalJumpToken(s));
  };
  for (const t of exercise.tags?.goal_tags ?? []) add(t);
  for (const t of exercise.tags?.sport_tags ?? []) add(t);
  for (const t of exercise.tags?.stimulus ?? []) add(String(t));
  for (const t of exercise.tags?.attribute_tags ?? []) add(t);
  return tagSetHasDynamicPowerSignal(tags) && exerciseHasLowerBodyMuscleSignal(exercise);
}

type VerticalJumpIntentInput = {
  goal_sub_focus?: Record<string, string[] | undefined>;
  sport_sub_focus?: Record<string, string[] | undefined>;
  session_intent?: {
    sport_sub_focus_by_sport?: Record<string, string[] | undefined>;
  };
};

export function inputHasVerticalJumpSubFocus(input: VerticalJumpIntentInput): boolean {
  const fromMap = (map: Record<string, string[] | undefined> | undefined): boolean => {
    if (!map) return false;
    return Object.values(map).some((slugs) =>
      (slugs ?? []).some((s) => isVerticalJumpSubFocusSlug(s))
    );
  };
  return (
    fromMap(input.goal_sub_focus) ||
    fromMap(input.sport_sub_focus) ||
    fromMap(input.session_intent?.sport_sub_focus_by_sport)
  );
}

/** Hard exclude med-ball throws from vertical-jump session pools (sport proportion repair, selection). */
export function exerciseEligibleForVerticalJumpSession(
  exercise: Exercise,
  verticalJumpIntentActive: boolean
): boolean {
  if (!verticalJumpIntentActive) return true;
  return !exerciseIsMedBallPowerThrow(exercise);
}

/** Scoring nudge used by power-block selection and coverage picks. */
export function verticalJumpExerciseSelectionScore(exercise: Exercise): number {
  let score = 0;
  if (exerciseHasLowerBodyPlyoJumpSignal(exercise)) score += 12;
  if (exerciseIsMedBallPowerThrow(exercise)) score -= 12;
  const attrs = new Set((exercise.tags?.attribute_tags ?? []).map((a) => normVerticalJumpToken(a)));
  if (attrs.has("squat_pattern") || attrs.has("hinge_pattern") || attrs.has("single_leg_strength")) {
    score += 2;
  }
  return score;
}
