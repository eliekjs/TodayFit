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
  tagSetHasDynamicPowerSignal,
} from "./subFocusIntentArchetypes";
import {
  exerciseTagSetHasSpeedAgilityDynamicMovement,
  isSpeedAgilityPowerStyleSubFocusSlug,
} from "./speedAgilitySubFocusShared";

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
  speed_sprint: "speed",
  sprint: "speed",
  acceleration: "acceleration_power",
  agility_cod: "change_of_direction",
  power_explosive: "speed_power",
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

/** Sim-7-style golden exercises — lateral/sprint/decel power, not generic main_strength. */
const SPEED_POWER_GOLDEN_EXERCISE_TOKENS = [
  "lateral_bound",
  "lateral_shuffle",
  "lateral_power_shuffle",
  "build_up_sprint",
  "jump_lunge",
  "decel_step",
  "crossover_step",
] as const;

const WARMUP_COD_PREP_TOKENS = [
  "decel_step",
  "crossover_step",
  "eccentric_brake",
  "landing",
] as const;

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
    if (blobHasToken(blob, SPEED_POWER_GOLDEN_EXERCISE_TOKENS)) score += 14;
    if (tags.has("sprinting") || tags.has("speed") || tags.has("acceleration")) score += 8;
    if (tags.has("lateral_power")) score += 6;
    if (exercise.modality === "conditioning" && blobHasToken(blob, SPRINT_RSA_TOKENS)) score += 4;
    if (exercise.exercise_role === "isolation" && !tagSetHasDynamicPowerSignal(tags)) score -= 8;
    if (exercise.modality === "hypertrophy") score -= 6;
    if (
      exercise.exercise_role === "main_compound" &&
      exercise.modality === "strength" &&
      !blobHasToken(blob, SPEED_POWER_GOLDEN_EXERCISE_TOKENS) &&
      !tagSetHasDynamicPowerSignal(tags)
    ) {
      score -= 6;
    }
    if (exerciseIsGenericConditioningMetcon(exercise) && !exerciseIsSprintOrCodDrill(exercise)) score -= 20;
  }

  if (canon === "change_of_direction") {
    if (blobHasToken(blob, COD_DECEL_TOKENS)) score += 12;
    if (blobHasToken(blob, SPEED_POWER_GOLDEN_EXERCISE_TOKENS)) score += 14;
    if (tags.has("agility") || tags.has("reactive_power") || tags.has("deceleration")) score += 8;
    if (tags.has("lateral_power")) score += 6;
    if (exercise.exercise_role === "isolation" && !tagSetHasDynamicPowerSignal(tags)) score -= 8;
    if (
      exercise.exercise_role === "main_compound" &&
      exercise.modality === "strength" &&
      !blobHasToken(blob, COD_DECEL_TOKENS) &&
      !blobHasToken(blob, SPEED_POWER_GOLDEN_EXERCISE_TOKENS) &&
      !tagSetHasDynamicPowerSignal(tags)
    ) {
      score -= 6;
    }
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

/** Whether a sub-focus slug (sport or goal) routes to dedicated power blocks. */
export function isPowerStyleSubFocusSlug(slug: string): boolean {
  const canon = normalizeSubFocusSlug(slug);
  return (
    isSpeedAgilityPowerStyleSubFocusSlug(canon) ||
    isExplosivePlyometricSportSubFocusSlug(canon) ||
    isSprintAccelerationSubFocusSlug(canon)
  );
}

export type SpeedPowerSessionTemplate = {
  requiresPowerBlock: boolean;
  preferMultipleIntentPowerBlocks: boolean;
  warmupDecelPrep: boolean;
  powerExerciseFamilies: readonly string[];
};

const SPEED_POWER_EXERCISE_FAMILIES = [
  "lateral_power",
  "sprint_acceleration",
  "plyometric",
  "decel",
] as const;

function countPowerStyleSubFocuses(input: SubFocusIntentInput): number {
  return collectActiveSubFocusSlugs(input).filter(isPowerStyleSubFocusSlug).length;
}

function sessionHasCodSubFocus(input: SubFocusIntentInput): boolean {
  return collectActiveSubFocusSlugs(input).some(isChangeOfDirectionSubFocusSlug);
}

/**
 * Session composition hints for speed/COD/sprint archetypes (sport + manual goal sub-focuses).
 * Drives single-leaf power routing, warmup decel prep, and conditioning field-drill bias.
 */
export function resolveSpeedPowerSessionTemplate(
  input: SubFocusIntentInput
): SpeedPowerSessionTemplate {
  const powerCount = countPowerStyleSubFocuses(input);
  const hasPowerArchetype = inputHasIntentDedicatedPowerArchetypeSubFocus(input);
  return {
    requiresPowerBlock: hasPowerArchetype,
    preferMultipleIntentPowerBlocks: powerCount >= 2,
    warmupDecelPrep: sessionHasCodSubFocus(input),
    powerExerciseFamilies: SPEED_POWER_EXERCISE_FAMILIES,
  };
}

/** Warmup scoring boost for COD/decel prep moves (crossover step up, decel step ups, etc.). */
export function warmupCodPrepSelectionScore(exercise: Exercise): number {
  const blob = exerciseBlob(exercise);
  if (!blobHasToken(blob, WARMUP_COD_PREP_TOKENS)) return 0;
  let score = 10;
  if (blob.includes("decel")) score += 4;
  if (blob.includes("crossover")) score += 3;
  return score;
}

export function exerciseIsSpeedPowerGoldenDrill(exercise: Exercise): boolean {
  const blob = exerciseBlob(exercise);
  return blobHasToken(blob, SPEED_POWER_GOLDEN_EXERCISE_TOKENS);
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
  /** Standalone cooldown block with stretch/mobility finishers (not recovery-primary unified session). */
  requiresCooldownBlock: boolean;
  /** Minimum stretch items when cooldown block is required (duration may raise further). */
  minCooldownItems: number;
  /** Dedicated power block with explosive / sprint-appropriate work (speed/RSA/acceleration intents). */
  requiresPowerBlock: boolean;
};

export type BlockStructureProfile = SubFocusBlockStructureFlags;

type BlockStructurePartial = Partial<SubFocusBlockStructureFlags>;

const EMPTY_BLOCK_STRUCTURE: BlockStructureProfile = {
  requiresConditioningBlock: false,
  suppressAccessoryBlocks: false,
  requiresAccessoryBlocks: false,
  fieldDrillConditioningEligible: false,
  requiresCooldownBlock: false,
  minCooldownItems: 0,
  requiresPowerBlock: false,
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
    requiresCooldownBlock: true,
    minCooldownItems: 2,
    requiresPowerBlock: true,
  },
  reactive_speed: {
    requiresConditioningBlock: true,
    suppressAccessoryBlocks: true,
    fieldDrillConditioningEligible: true,
    requiresCooldownBlock: true,
    minCooldownItems: 2,
    requiresPowerBlock: true,
  },
  speed_power: {
    requiresConditioningBlock: true,
    suppressAccessoryBlocks: true,
    fieldDrillConditioningEligible: true,
    requiresCooldownBlock: true,
    minCooldownItems: 2,
    requiresPowerBlock: true,
  },
  change_of_direction: {
    requiresConditioningBlock: true,
    suppressAccessoryBlocks: true,
    fieldDrillConditioningEligible: true,
    requiresCooldownBlock: true,
    minCooldownItems: 2,
  },
  acceleration_power: {
    requiresConditioningBlock: true,
    suppressAccessoryBlocks: true,
    fieldDrillConditioningEligible: true,
    requiresCooldownBlock: true,
    minCooldownItems: 2,
    requiresPowerBlock: true,
  },
  vertical_jump: {
    requiresCooldownBlock: true,
    minCooldownItems: 2,
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

/** Speed / RSA / sprint-acceleration sub-focus slugs (sport + manual goal) that require a power block. */
export function isSpeedSprintPowerBlockSubFocusSlug(slug: string): boolean {
  const canon = normalizeSubFocusSlug(slug);
  return isSpeedRsaSubFocusSlug(canon) || isSprintAccelerationSubFocusSlug(canon);
}

export function sessionRequiresPowerBlock(
  input: SubFocusIntentInput & { primary_goal?: string; secondary_goals?: string[] }
): boolean {
  if (resolveBlockStructureProfile(input).requiresPowerBlock) return true;
  return collectActiveSubFocusSlugs(input).some(isSpeedSprintPowerBlockSubFocusSlug);
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
    requiresCooldownBlock:
      base.requiresCooldownBlock || partial.requiresCooldownBlock === true,
    minCooldownItems: Math.max(base.minCooldownItems, partial.minCooldownItems ?? 0),
    requiresPowerBlock: base.requiresPowerBlock || partial.requiresPowerBlock === true,
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
    return (
      isSpeedRsaSubFocusSlug(c) ||
      isSprintAccelerationSubFocusSlug(c) ||
      isChangeOfDirectionSubFocusSlug(c)
    );
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
    profile.requiresCooldownBlock = true;
    profile.minCooldownItems = Math.max(profile.minCooldownItems, 2);
  }

  if (
    primary === "strength" ||
    primary === "power" ||
    primary === "athletic_performance" ||
    primary === "calisthenics"
  ) {
    profile.requiresCooldownBlock = true;
    profile.minCooldownItems = Math.max(profile.minCooldownItems, 2);
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

  if (primary === "hypertrophy") {
    profile.requiresConditioningBlock = false;
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

// ---------------------------------------------------------------------------
// Cooldown policy — when standalone cooldown blocks are required
// ---------------------------------------------------------------------------

export type CooldownPolicyInput = SubFocusIntentInput & {
  primary_goal?: string;
  secondary_goals?: string[];
  duration_minutes?: number;
  sport_slugs?: string[];
  focus_body_parts?: string[];
  body_region_focus?: string[];
};

export type CooldownPolicy = {
  requiresCooldownBlock: boolean;
  minCooldownItems: number;
};

const SHORT_SESSION_NO_COOLDOWN_MINUTES = 20;

const COOLDOWN_REQUIRED_PRIMARY_GOALS = new Set([
  "strength",
  "hypertrophy",
  "power",
  "athletic_performance",
  "body_recomp",
  "calisthenics",
  "endurance",
  "conditioning",
]);

function normGoalToken(value: string): string {
  return value.toLowerCase().replace(/\s/g, "_");
}

function inputHasSportContext(input: CooldownPolicyInput): boolean {
  if ((input.sport_slugs?.length ?? 0) > 0) return true;
  if (Object.values(input.sport_sub_focus ?? {}).some((slugs) => (slugs?.length ?? 0) > 0)) return true;
  if (
    Object.values(input.session_intent?.sport_sub_focus_by_sport ?? {}).some(
      (slugs) => (slugs?.length ?? 0) > 0
    )
  ) {
    return true;
  }
  return false;
}

function inputHasBodyRegionFocus(input: CooldownPolicyInput): boolean {
  const focus = input.focus_body_parts ?? input.body_region_focus ?? [];
  return focus.length > 0;
}

function minCooldownItemsForDuration(durationMinutes: number): number {
  if (durationMinutes < SHORT_SESSION_NO_COOLDOWN_MINUTES) return 0;
  if (durationMinutes >= 30) return durationMinutes >= 45 ? 3 : 2;
  return 2;
}

/**
 * Global cooldown policy: which sessions need a standalone cooldown block and how many stretches.
 *
 * Optional: recovery/mobility-primary (unified stretch session) and sessions under 20 min.
 * Required: sport mode, strength/hypertrophy/power/athletic goals, body-focus sessions, ≥20 min work.
 */
export function resolveCooldownPolicy(input: CooldownPolicyInput): CooldownPolicy {
  const duration = input.duration_minutes ?? 45;
  const primary = normGoalToken(input.primary_goal ?? "");
  const secondary = input.secondary_goals ?? [];
  const blockStructure = resolveBlockStructureProfile(input);

  if (
    primary === "recovery" ||
    primary === "mobility" ||
    primary === "recovery_mobility" ||
    primary === "joint_health"
  ) {
    return { requiresCooldownBlock: false, minCooldownItems: 0 };
  }
  if (duration < SHORT_SESSION_NO_COOLDOWN_MINUTES) {
    return { requiresCooldownBlock: false, minCooldownItems: 0 };
  }

  const mobilitySecondary = secondary.some(
    (g) => normGoalToken(g).includes("mobility") || g.toLowerCase().includes("mobility")
  );
  const recoverySecondary = secondary.some(
    (g) => normGoalToken(g).includes("recovery") || g.toLowerCase().includes("recovery")
  );
  const jointHealthSecondary = secondary.some(
    (g) => normGoalToken(g) === "joint_health" || g.toLowerCase().includes("joint_health")
  );

  let requires =
    blockStructure.requiresCooldownBlock ||
    inputHasSportContext(input) ||
    COOLDOWN_REQUIRED_PRIMARY_GOALS.has(primary) ||
    inputHasBodyRegionFocus(input) ||
    mobilitySecondary ||
    recoverySecondary;

  let minItems = requires
    ? Math.max(blockStructure.minCooldownItems, minCooldownItemsForDuration(duration))
    : 0;

  if (mobilitySecondary || recoverySecondary || jointHealthSecondary) {
    requires = true;
    minItems = Math.max(minItems, recoverySecondary ? 3 : jointHealthSecondary ? 2 : 2);
  }

  return {
    requiresCooldownBlock: requires,
    minCooldownItems: requires ? minItems : 0,
  };
}

export function sessionRequiresCooldownBlock(
  input: CooldownPolicyInput
): boolean {
  return resolveCooldownPolicy(input).requiresCooldownBlock;
}
