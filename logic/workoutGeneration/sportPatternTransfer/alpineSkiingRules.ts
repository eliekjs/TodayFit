/**
 * Alpine skiing rules — re-export from mountain snow family (alpine kind = reference config).
 */

import type { Exercise } from "../types";
import type { SportCoverageContext } from "./types";
import {
  evaluateSnowSportMinimumCoverage,
  getSnowMinimumCoverageRules,
  getSnowSportDeprioritized,
  getSnowSportSelectionRules,
  type SnowMinimumCoverageRule,
  SNOW_DESCENT_MAIN_GATE,
  SNOW_ECCENTRIC_CONTROL_FAMILY,
  SNOW_ECCENTRIC_OR_DECEL,
  SNOW_LATERAL_TRUNK,
  SNOW_QUAD_SUSTAINED,
} from "./snowSportFamily/snowSportFamilyRules";
import type { AlpineSkiingPatternCategory } from "./alpineSkiingTypes";

export type AlpineMinimumCoverageRule = SnowMinimumCoverageRule;

export const ALPINE_MAIN_GATE_MATCH_CATEGORIES = SNOW_DESCENT_MAIN_GATE;
export const ALPINE_DEPRIORITIZED_CATEGORIES = getSnowSportDeprioritized("alpine_skiing");
export const ALPINE_MAIN_PREFER_CATEGORIES = [
  "eccentric_braking_control",
  "lateral_frontal_plane_stability",
  "landing_deceleration_support",
  "sustained_tension_lower_body",
  "quad_dominant_endurance",
  "hip_knee_control",
] as const satisfies readonly AlpineSkiingPatternCategory[];

export const ALPINE_ECCENTRIC_CONTROL_CATEGORIES = SNOW_ECCENTRIC_CONTROL_FAMILY;
export const ALPINE_MAIN_ECCENTRIC_OR_DECEL_CATEGORIES = SNOW_ECCENTRIC_OR_DECEL;
export const ALPINE_LATERAL_STABILITY_CATEGORIES = SNOW_LATERAL_TRUNK;
export const ALPINE_LOWER_BODY_TENSION_ENDURANCE_CATEGORIES = SNOW_QUAD_SUSTAINED;

export const alpineSportSelectionRules = getSnowSportSelectionRules("alpine_skiing");

export const ALPINE_QUALITY_LADDER_ANCHOR_CATEGORIES = [
  ...ALPINE_MAIN_GATE_MATCH_CATEGORIES,
  "hip_knee_control",
  "trunk_bracing_dynamic",
  "ski_conditioning",
] as const;

export const ALPINE_QUALITY_LADDER_MIN_SCORE = 0.35;

export const alpineSportWorkoutConstraints = {
  minimumCoverage: getSnowMinimumCoverageRules("alpine_skiing"),
};

export function evaluateAlpineMinimumCoverage(
  ctx: SportCoverageContext,
  blocksExerciseIdsByType: Map<string, string[]>,
  exerciseById: Map<string, Exercise>
): { ok: boolean; violations: { ruleId: string; description: string }[] } {
  return evaluateSnowSportMinimumCoverage("alpine_skiing", ctx, blocksExerciseIdsByType, exerciseById);
}
