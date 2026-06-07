/**
 * Registry for sport/goal sub-focus intent: slug aliases, training gates, and selection scoring.
 * Generalizes vertical-jump helpers to speed/COD/RSA archetypes without per-sport branches in dailyGenerator.
 */

import type { Exercise } from "../../logic/workoutGeneration/types";
import {
  exerciseHasLowerBodyPlyoJumpSignal,
  exerciseIsMedBallPowerThrow,
  exercisePassesVerticalJumpDynamicGate,
  inputHasVerticalJumpSubFocus,
  isVerticalJumpSubFocusSlug,
  verticalJumpExerciseSelectionScore,
} from "./verticalJumpSubFocusShared";
import {
  isExplosivePlyometricSportSubFocusSlug,
  isSpeedAgilityPowerStyleSubFocusSlug,
  tagSetHasDynamicPowerSignal,
} from "./subFocusIntentArchetypes";
import { exerciseTagSetHasSpeedAgilityDynamicMovement } from "./speedAgilitySubFocusShared";

export type SubFocusIntentInput = {
  goal_sub_focus?: Record<string, string[] | undefined>;
  sport_sub_focus?: Record<string, string[] | undefined>;
  session_intent?: {
    sport_sub_focus_by_sport?: Record<string, string[] | undefined>;
  };
};

function normSlug(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
}

/** User-facing / legacy aliases → canonical sub-focus slugs in SUB_FOCUS_TAG_MAP. */
export const SUB_FOCUS_SLUG_ALIASES: Record<string, string> = {
  repeat_sprint: "speed",
  repeat_sprints: "speed",
  rsa: "speed",
  repeat_sprint_ability: "speed",
  deceleration: "change_of_direction",
  deceleration_control: "change_of_direction",
  decel: "change_of_direction",
  cod: "change_of_direction",
  change_of_direction_speed: "change_of_direction",
};

export function normalizeSubFocusSlug(slug: string): string {
  const n = normSlug(slug);
  return SUB_FOCUS_SLUG_ALIASES[n] ?? n;
}

export function normalizeSubFocusSlugList(slugs: string[]): string[] {
  return [...new Set(slugs.map(normalizeSubFocusSlug))];
}

function exerciseBlob(exercise: Pick<Exercise, "id" | "name">): string {
  return normSlug(`${exercise.id ?? ""}_${exercise.name ?? ""}`);
}

const SPRINT_RSA_TOKENS = [
  "sprint",
  "shuttle",
  "repeat_sprint",
  "rsa",
  "acceleration",
  "flying_sprint",
  "pro_agility",
  "5_10_5",
  "505",
  "10_yard",
  "20_yard",
  "40_yard",
] as const;

const COD_DECEL_TOKENS = [
  "deceleration",
  "decel",
  "cutting",
  "cut",
  "cod",
  "change_of_direction",
  "lateral_shuffle",
  "shuffle",
  "lateral_bound",
  "skater",
  "cone",
  "agility",
  "ladder",
  "footwork",
  "landing",
  "eccentric_brake",
  "drop_landing",
  "figure_8",
  "figure8",
  "crossover",
  "lunge",
  "walking_lunge",
  "reverse_lunge",
] as const;

const PENALIZED_BROAD_JUMP_TOKENS = ["burpee_broad", "broad_jump"] as const;

/** Metabolic / HIIT fillers — not intent-dedicated speed, COD, or sprint power work. */
const GENERIC_CONDITIONING_METCON_TOKENS = [
  "burpee",
  "mountain_climber",
  "battle_rope",
  "kb_swing",
  "kettlebell_swing",
  "assault_bike",
  "air_bike",
  "tabata",
  "emom",
  "thruster",
  "wall_ball",
  "man_maker",
  "devil_press",
] as const;

function blobHasToken(blob: string, tokens: readonly string[]): boolean {
  return tokens.some((t) => blob.includes(t));
}

function isIntentDedicatedSpeedCodExplosiveArchetype(canon: string): boolean {
  return (
    canon === "speed" ||
    canon === "reactive_speed" ||
    canon === "speed_power" ||
    canon === "change_of_direction" ||
    (isExplosivePlyometricSportSubFocusSlug(canon) && !isVerticalJumpSubFocusSlug(canon))
  );
}

/** HIIT / metcon drills that should not fill speed/COD/explosive intent or power slots. */
export function exerciseIsGenericConditioningMetcon(exercise: Exercise): boolean {
  const blob = exerciseBlob(exercise);
  if (blobHasToken(blob, GENERIC_CONDITIONING_METCON_TOKENS)) return true;
  if (exerciseIsSprintOrCodDrill(exercise)) return false;

  const role = normSlug(exercise.exercise_role ?? "");
  if (role === "conditioning" || role === "finisher") {
    if (exercise.modality === "conditioning") return true;
    if (exercise.modality === "power") return true;
  }
  if (exercise.modality === "conditioning") return true;

  const tags = exerciseTagSet(exercise);
  if (tags.has("intervals_hiit") || tags.has("anaerobic") || tags.has("aerobic_zone2")) {
    return true;
  }
  return false;
}

function exerciseTagSet(exercise: Exercise): Set<string> {
  const out = new Set<string>();
  const add = (s: string | undefined) => {
    if (s) out.add(normSlug(s));
  };
  for (const t of exercise.tags?.goal_tags ?? []) add(t);
  for (const t of exercise.tags?.stimulus ?? []) add(String(t));
  for (const t of exercise.tags?.attribute_tags ?? []) add(t);
  for (const t of exercise.tags?.sport_tags ?? []) add(String(t));
  return out;
}

export function exerciseIsSprintOrCodDrill(exercise: Exercise): boolean {
  const blob = exerciseBlob(exercise);
  if (blobHasToken(blob, SPRINT_RSA_TOKENS) || blobHasToken(blob, COD_DECEL_TOKENS)) return true;
  const tags = exerciseTagSet(exercise);
  return (
    tags.has("sprinting") ||
    tags.has("agility") ||
    tags.has("acceleration") ||
    tags.has("deceleration") ||
    tags.has("change_of_direction")
  );
}

/** Scoring nudge for sub-focus-aware selection (power blocks, coverage, proportion repair). */
export function subFocusExerciseSelectionScore(exercise: Exercise, subSlug: string): number {
  const canon = normalizeSubFocusSlug(subSlug);
  if (isVerticalJumpSubFocusSlug(canon)) return verticalJumpExerciseSelectionScore(exercise);

  let score = 0;
  const blob = exerciseBlob(exercise);
  const tags = exerciseTagSet(exercise);

  if (canon === "speed" || canon === "reactive_speed" || canon === "speed_power") {
    if (blobHasToken(blob, SPRINT_RSA_TOKENS)) score += 12;
    if (tags.has("sprinting") || tags.has("speed") || tags.has("acceleration")) score += 8;
    if (exercise.modality === "conditioning" && blobHasToken(blob, SPRINT_RSA_TOKENS)) score += 4;
    if (exercise.exercise_role === "isolation" && !tagSetHasDynamicPowerSignal(tags)) score -= 8;
    if (exercise.modality === "hypertrophy") score -= 6;
    if (exerciseIsGenericConditioningMetcon(exercise) && !exerciseIsSprintOrCodDrill(exercise)) score -= 20;
  }

  if (canon === "change_of_direction") {
    if (blobHasToken(blob, COD_DECEL_TOKENS)) score += 12;
    if (tags.has("agility") || tags.has("reactive_power") || tags.has("deceleration")) score += 8;
    if (exercise.exercise_role === "isolation" && !tagSetHasDynamicPowerSignal(tags)) score -= 8;
    if (exerciseIsGenericConditioningMetcon(exercise) && !exerciseIsSprintOrCodDrill(exercise)) score -= 20;
  }

  if (isExplosivePlyometricSportSubFocusSlug(canon) && !isVerticalJumpSubFocusSlug(canon)) {
    if (tagSetHasDynamicPowerSignal(tags)) score += 10;
    if (exercise.modality === "power") score += 5;
    if (tags.has("plyometric") || tags.has("jumping")) score += 4;
    if (exerciseIsGenericConditioningMetcon(exercise) && !exerciseIsSprintOrCodDrill(exercise)) score -= 20;
  }

  if (blobHasToken(blob, PENALIZED_BROAD_JUMP_TOKENS) && tags.has("plyometric")) score -= 10;

  return score;
}

/** Aggregate score across all active sub-focus slugs on the session. */
export function aggregateSubFocusSelectionScore(
  exercise: Exercise,
  subSlugs: string[]
): number {
  if (subSlugs.length === 0) return 0;
  return subSlugs.reduce((sum, s) => sum + subFocusExerciseSelectionScore(exercise, s), 0);
}

/** Whether exercise satisfies dynamic-movement gate for a sub-focus (coverage / power slots). */
export function exercisePassesSubFocusTrainingGate(exercise: Exercise, subSlug: string): boolean {
  const canon = normalizeSubFocusSlug(subSlug);
  if (isVerticalJumpSubFocusSlug(canon)) return exercisePassesVerticalJumpDynamicGate(exercise);
  if (canon === "speed" || canon === "reactive_speed" || canon === "speed_power") {
    if (exerciseIsGenericConditioningMetcon(exercise) && !exerciseIsSprintOrCodDrill(exercise)) return false;
    return exerciseIsSprintOrCodDrill(exercise) || tagSetHasDynamicPowerSignal(exerciseTagSet(exercise));
  }
  if (canon === "change_of_direction") {
    if (exerciseIsGenericConditioningMetcon(exercise) && !exerciseIsSprintOrCodDrill(exercise)) return false;
    return (
      exerciseIsSprintOrCodDrill(exercise) ||
      exerciseTagSetHasSpeedAgilityDynamicMovement(exerciseTagSet(exercise))
    );
  }
  if (isExplosivePlyometricSportSubFocusSlug(canon)) {
    if (exerciseIsMedBallPowerThrow(exercise)) return false;
    if (exerciseIsGenericConditioningMetcon(exercise) && !exerciseIsSprintOrCodDrill(exercise)) return false;
    if (exerciseHasLowerBodyPlyoJumpSignal(exercise)) return true;
    return tagSetHasDynamicPowerSignal(exerciseTagSet(exercise));
  }
  if (isSpeedAgilityPowerStyleSubFocusSlug(canon)) {
    const tags = exerciseTagSet(exercise);
    return exerciseTagSetHasSpeedAgilityDynamicMovement(tags) || tagSetHasDynamicPowerSignal(tags);
  }
  return true;
}

export function collectActiveSubFocusSlugs(input: SubFocusIntentInput): string[] {
  const raw: string[] = [];
  const fromMap = (map: Record<string, string[] | undefined> | undefined) => {
    if (!map) return;
    for (const slugs of Object.values(map)) {
      for (const s of slugs ?? []) raw.push(s);
    }
  };
  fromMap(input.goal_sub_focus);
  fromMap(input.sport_sub_focus);
  fromMap(input.session_intent?.sport_sub_focus_by_sport);
  return normalizeSubFocusSlugList(raw);
}

export function inputHasSpeedOrCodSubFocus(input: SubFocusIntentInput): boolean {
  return collectActiveSubFocusSlugs(input).some(
    (s) =>
      s === "speed" ||
      s === "reactive_speed" ||
      s === "speed_power" ||
      s === "change_of_direction"
  );
}

/** Speed/COD/RSA/explosive (non–vertical-jump) sessions that need true drill selection in power blocks. */
export function inputHasIntentDedicatedPowerArchetypeSubFocus(input: SubFocusIntentInput): boolean {
  return collectActiveSubFocusSlugs(input).some(isIntentDedicatedSpeedCodExplosiveArchetype);
}

export { inputHasVerticalJumpSubFocus };

// ---------------------------------------------------------------------------
// Block structure archetypes — when conditioning / accessory blocks appear
// ---------------------------------------------------------------------------

/** Per-archetype block inclusion flags (sport + goal sub-focus slugs). */
export type SubFocusBlockStructureFlags = {
  requiresConditioningBlock: boolean;
  suppressAccessoryBlocks: boolean;
  requiresAccessoryBlocks: boolean;
  /** Agility/shuttle/COD/lunge field drills qualify as conditioning (RSA/COD/sprint). */
  fieldDrillConditioningEligible: boolean;
};

export type BlockStructureProfile = SubFocusBlockStructureFlags;

type BlockStructurePartial = Partial<SubFocusBlockStructureFlags>;

const EMPTY_BLOCK_STRUCTURE: BlockStructureProfile = {
  requiresConditioningBlock: false,
  suppressAccessoryBlocks: false,
  requiresAccessoryBlocks: false,
  fieldDrillConditioningEligible: false,
};

const SPEED_RSA_SUB_FOCUS_SLUGS = new Set(["speed", "reactive_speed", "speed_power"]);
const SPRINT_ACCELERATION_SUB_FOCUS_SLUGS = new Set(["acceleration_power"]);
const COD_SUB_FOCUS_SLUGS = new Set(["change_of_direction"]);

/** Canonical sub-focus slug → block structure overrides (shared across sports/goals). */
export const SUB_FOCUS_BLOCK_STRUCTURE: Record<string, BlockStructurePartial> = {
  speed: {
    requiresConditioningBlock: true,
    suppressAccessoryBlocks: true,
    fieldDrillConditioningEligible: true,
  },
  reactive_speed: {
    requiresConditioningBlock: true,
    suppressAccessoryBlocks: true,
    fieldDrillConditioningEligible: true,
  },
  speed_power: {
    requiresConditioningBlock: true,
    suppressAccessoryBlocks: true,
    fieldDrillConditioningEligible: true,
  },
  change_of_direction: {
    requiresConditioningBlock: true,
    fieldDrillConditioningEligible: true,
  },
  acceleration_power: {
    requiresConditioningBlock: true,
    suppressAccessoryBlocks: true,
    fieldDrillConditioningEligible: true,
  },
};

export function getSubFocusBlockStructureFlags(subSlug: string): BlockStructurePartial {
  return SUB_FOCUS_BLOCK_STRUCTURE[normalizeSubFocusSlug(subSlug)] ?? {};
}

export function isSpeedRsaSubFocusSlug(canon: string): boolean {
  return SPEED_RSA_SUB_FOCUS_SLUGS.has(canon);
}

export function isSprintAccelerationSubFocusSlug(canon: string): boolean {
  return SPRINT_ACCELERATION_SUB_FOCUS_SLUGS.has(canon);
}

export function isChangeOfDirectionSubFocusSlug(canon: string): boolean {
  return COD_SUB_FOCUS_SLUGS.has(canon);
}

function mergeBlockStructure(
  base: BlockStructureProfile,
  partial: BlockStructurePartial
): BlockStructureProfile {
  return {
    requiresConditioningBlock:
      base.requiresConditioningBlock || partial.requiresConditioningBlock === true,
    suppressAccessoryBlocks:
      base.suppressAccessoryBlocks || partial.suppressAccessoryBlocks === true,
    requiresAccessoryBlocks:
      base.requiresAccessoryBlocks || partial.requiresAccessoryBlocks === true,
    fieldDrillConditioningEligible:
      base.fieldDrillConditioningEligible || partial.fieldDrillConditioningEligible === true,
  };
}

function hasStrengthHypertrophySecondary(secondary: string[] | undefined): boolean {
  return (secondary ?? []).some((g) => {
    const n = g.toLowerCase().replace(/\s/g, "_");
    return (
      n.includes("strength") ||
      n.includes("hypertrophy") ||
      n.includes("body_recomp") ||
      n.includes("calisthenics")
    );
  });
}

function sessionHasRsaOrSprintAccelerationSubFocus(input: SubFocusIntentInput): boolean {
  return collectActiveSubFocusSlugs(input).some((s) => {
    const c = normalizeSubFocusSlug(s);
    return isSpeedRsaSubFocusSlug(c) || isSprintAccelerationSubFocusSlug(c);
  });
}

/** Vertical jump as sole explosive sub-focus with no hypertrophy/strength secondary. */
export function isVerticalJumpOnlySession(
  input: SubFocusIntentInput & { secondary_goals?: string[] }
): boolean {
  const slugs = collectActiveSubFocusSlugs(input);
  if (!slugs.some((s) => isVerticalJumpSubFocusSlug(normalizeSubFocusSlug(s)))) return false;
  if (
    slugs.some((s) => {
      const c = normalizeSubFocusSlug(s);
      return (
        isSpeedRsaSubFocusSlug(c) ||
        isChangeOfDirectionSubFocusSlug(c) ||
        isSprintAccelerationSubFocusSlug(c)
      );
    })
  ) {
    return false;
  }
  if (hasStrengthHypertrophySecondary(input.secondary_goals)) return false;
  return true;
}

/** Session-level block structure from primary goal + active sub-focus archetypes. */
export function resolveBlockStructureProfile(
  input: SubFocusIntentInput & { primary_goal?: string; secondary_goals?: string[] }
): BlockStructureProfile {
  let profile = { ...EMPTY_BLOCK_STRUCTURE };
  const primary = (input.primary_goal ?? "").toLowerCase().replace(/\s/g, "_");
  const secondary = input.secondary_goals ?? [];

  if (primary === "hypertrophy" || primary === "body_recomp") {
    profile.requiresAccessoryBlocks = true;
  }

  if (
    (primary === "endurance" || primary === "conditioning") &&
    !hasStrengthHypertrophySecondary(secondary)
  ) {
    profile = mergeBlockStructure(profile, {
      requiresConditioningBlock: true,
      suppressAccessoryBlocks: true,
    });
  }

  for (const slug of collectActiveSubFocusSlugs(input)) {
    profile = mergeBlockStructure(profile, getSubFocusBlockStructureFlags(slug));
  }

  if (isVerticalJumpOnlySession(input)) {
    profile.suppressAccessoryBlocks = true;
  }

  // Hypertrophy/strength secondary re-enables accessories except RSA/sprint-acceleration focus.
  if (
    hasStrengthHypertrophySecondary(secondary) &&
    primary !== "endurance" &&
    primary !== "conditioning" &&
    !sessionHasRsaOrSprintAccelerationSubFocus(input)
  ) {
    profile.suppressAccessoryBlocks = false;
  }

  return profile;
}

/** Alias for constraint / profile modules. */
export function sessionRequiresConditioningBlockFromArchetype(
  input: SubFocusIntentInput & { primary_goal?: string; secondary_goals?: string[] }
): boolean {
  return resolveBlockStructureProfile(input).requiresConditioningBlock;
}

export function sessionSuppressesAccessoryBlocks(
  input: SubFocusIntentInput & { primary_goal?: string; secondary_goals?: string[] }
): boolean {
  return resolveBlockStructureProfile(input).suppressAccessoryBlocks;
}

export function sessionRequiresAccessoryBlocks(
  input: SubFocusIntentInput & { primary_goal?: string; secondary_goals?: string[] }
): boolean {
  return resolveBlockStructureProfile(input).requiresAccessoryBlocks;
}
