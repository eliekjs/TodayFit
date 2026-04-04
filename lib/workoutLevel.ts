/**
 * Workout level (experience tier + optional creative/complex variations).
 * Used by generator filtering, ontology-aware inference, and tier/creative scoring.
 */

import type {
  Exercise,
  ExerciseTags,
  GenerateWorkoutInput,
  PrimaryGoal,
  UserLevel,
} from "../logic/workoutGeneration/types";
import type { WorkoutTierPreference } from "./types";

export type { WorkoutTierPreference };

const TIER_ORDER: UserLevel[] = ["beginner", "intermediate", "advanced"];

/** Shape for inferring tiers from static defs or DB tag lists (minimal). */
export type WorkoutLevelSource = {
  id: string;
  name: string;
  tags: string[];
  workout_levels?: readonly UserLevel[];
};

export type DemandLevelHint = "none" | "low" | "medium" | "high" | undefined;

/** Full inference: explicit levels + ontology-backed hints. */
export type WorkoutLevelExtendedSource = {
  id: string;
  name: string;
  tags: string[];
  workout_levels?: readonly UserLevel[];
  stability_demand?: DemandLevelHint;
  grip_demand?: DemandLevelHint;
  impact_level?: DemandLevelHint;
  modality?: string;
  movement_pattern?: string;
  difficulty?: number;
  unilateral?: boolean;
  attribute_tags?: readonly string[];
  equipment_required?: readonly string[];
};

function slugifyTag(t: string): string {
  return t.toLowerCase().replace(/\s/g, "_");
}

function demandPoints(d: DemandLevelHint): number {
  if (d === "high") return 2;
  if (d === "medium") return 1;
  if (d === "low") return 0.45;
  return 0;
}

function sortedExplicit(want: readonly UserLevel[]): UserLevel[] {
  const set = new Set(want);
  const out = TIER_ORDER.filter((t) => set.has(t));
  return out.length > 0 ? out : TIER_ORDER;
}

/** When set (in Node / Metro), adapters attach `workout_levels_meta` on generator exercises. */
export function isWorkoutLevelsDebugEnabled(): boolean {
  return (
    typeof process !== "undefined" &&
    (process.env.WORKOUT_LEVEL_DEBUG === "1" || process.env.EXPO_PUBLIC_WORKOUT_LEVEL_DEBUG === "1")
  );
}

/** When set, `scoreExercise` breakdown includes assignment trace + hard-reject reason (Node / Metro). */
export function isWorkoutLevelScoreDebugEnabled(): boolean {
  return (
    typeof process !== "undefined" &&
    (process.env.WORKOUT_LEVEL_SCORE_DEBUG === "1" ||
      process.env.EXPO_PUBLIC_WORKOUT_LEVEL_SCORE_DEBUG === "1")
  );
}

function collectTagSlugsFromExerciseTags(tags: ExerciseTags | undefined): string[] {
  if (!tags) return [];
  const parts: string[] = [];
  const add = (a?: readonly string[]) => {
    if (a) for (const x of a) parts.push(String(x));
  };
  add(tags.goal_tags);
  add(tags.sport_tags);
  add(tags.stimulus);
  add(tags.attribute_tags);
  add(tags.joint_stress);
  add(tags.contraindications);
  if (tags.energy_fit?.length) {
    for (const e of tags.energy_fit) parts.push(`energy_${e}`);
  }
  return parts;
}

/** Build extended inference input from an in-memory exercise (score-debug / tooling). */
export function exerciseToWorkoutLevelExtendedSource(exercise: Exercise): WorkoutLevelExtendedSource {
  return {
    id: exercise.id,
    name: exercise.name,
    tags: collectTagSlugsFromExerciseTags(exercise.tags),
    workout_levels: exercise.workout_levels_from_db,
    stability_demand: exercise.stability_demand,
    grip_demand: exercise.grip_demand,
    impact_level: exercise.impact_level,
    modality: exercise.modality,
    movement_pattern: exercise.movement_pattern,
    difficulty: exercise.difficulty,
    unilateral: exercise.unilateral,
    attribute_tags: exercise.tags.attribute_tags,
    equipment_required: exercise.equipment_required,
  };
}

/** Persistable tier list for Supabase `workout_levels` text[]. */
export function serializeWorkoutLevelsForDb(levels: readonly UserLevel[]): string[] {
  return TIER_ORDER.filter((t) => levels.includes(t));
}

export type WorkoutLevelInferenceResult = {
  levels: UserLevel[];
  origin: "explicit" | "inferred";
  /** Human/ machine-readable inference trail (explicit: usually one entry). */
  reasons: string[];
  /** Final complexity score before banding (inferred only). */
  complexityScore?: number;
};

/**
 * Infer experience tiers with explainability. Avoids tagging every movement as all three levels.
 */
export function inferWorkoutLevelsWithExplanation(src: WorkoutLevelExtendedSource): WorkoutLevelInferenceResult {
  if (src.workout_levels?.length) {
    return {
      levels: sortedExplicit(src.workout_levels),
      origin: "explicit",
      reasons: ["explicit_workout_levels"],
    };
  }

  const reasons: string[] = [];
  const slugs = new Set([
    ...(src.tags ?? []).map(slugifyTag),
    ...(src.attribute_tags ?? []).map(slugifyTag),
  ]);
  const id = `${src.id} ${src.name}`.toLowerCase().replace(/-/g, "_");
  const compact = id.replace(/\s+/g, "_");

  const advancedOnly =
    /\b(snatch|clean_and_jerk|muscle_up|planche|handstand_push|pistol|dragon_flag|skin_the_cat|one_arm_|one_arm\b|front_lever|iron_cross)\b/.test(
      id
    );
  if (advancedOnly) {
    reasons.push("name_pattern:elite_movement");
    return { levels: ["advanced"], origin: "inferred", reasons, complexityScore: 99 };
  }

  if (slugs.has("advanced_only") || slugs.has("elite_skill")) {
    reasons.push("tag:advanced_only");
    return { levels: ["advanced"], origin: "inferred", reasons };
  }
  if (slugs.has("intermediate_plus") || slugs.has("high_skill_movement")) {
    reasons.push("tag:intermediate_plus");
    return { levels: ["intermediate", "advanced"], origin: "inferred", reasons };
  }

  let complexity =
    demandPoints(src.stability_demand) +
    demandPoints(src.grip_demand) +
    demandPoints(src.impact_level) +
    (src.unilateral ? 1.15 : 0) +
    (Math.max(1, Math.min(5, src.difficulty ?? 3)) - 2) * 0.5;
  if (src.stability_demand) reasons.push(`stability_demand:${src.stability_demand}`);
  if (src.grip_demand) reasons.push(`grip_demand:${src.grip_demand}`);
  if (src.impact_level) reasons.push(`impact_level:${src.impact_level}`);
  if (src.unilateral) reasons.push("unilateral");
  reasons.push(`difficulty_contribution:${((Math.max(1, Math.min(5, src.difficulty ?? 3)) - 2) * 0.5).toFixed(2)}`);

  const mod = (src.modality ?? "").toLowerCase().replace(/\s/g, "_");
  if (mod === "skill") {
    complexity += 1.35;
    reasons.push("modality:skill");
  }
  if (mod === "power") {
    complexity += 0.75;
    reasons.push("modality:power");
  }

  if (slugs.has("plyometric") || slugs.has("single_leg") || slugs.has("single_leg_strength")) {
    complexity += 0.55;
    reasons.push("tag:plyometric_or_single_leg");
  }
  if (slugs.has("complex_variation") || slugs.has("creative")) {
    complexity += 1.1;
    reasons.push("tag:creative_or_complex");
  }
  if (slugs.has("olympic") || slugs.has("weightlifting")) {
    complexity += 1.5;
    reasons.push("tag:olympic");
  }

  const eq = new Set((src.equipment_required ?? []).map((e) => e.toLowerCase().replace(/\s/g, "_")));
  if (eq.has("rings")) {
    complexity += 1.6;
    reasons.push("equipment:rings");
  }
  if (eq.has("clubbell") || eq.has("macebell") || eq.has("steel_mace") || eq.has("gada") || eq.has("indian_club")) {
    complexity += 1.4;
    reasons.push("equipment:implement");
  }
  if (eq.has("barbell")) {
    complexity += 0.55;
    reasons.push("equipment:barbell");
  }
  if (
    eq.has("machine") ||
    eq.has("leg_press") ||
    eq.has("chest_press") ||
    eq.has("hamstring_curl") ||
    eq.has("leg_extension")
  ) {
    complexity -= 0.35;
    reasons.push("equipment:machine_supported");
  }

  const pattern = (src.movement_pattern ?? "").toLowerCase().replace(/\s/g, "_");
  if (pattern === "carry") {
    complexity += 0.45;
    reasons.push("pattern:carry");
  }

  if (
    /\b(deficit|pin\s+press|board\s+press|chains|banded|accommodating|snatch\s+pull|clean\s+pull|jefferson)\b/i.test(
      id
    )
  ) {
    complexity += 1.1;
    reasons.push("name_pattern:advanced_variation");
  }

  if (/(?:^|_)bottoms_up(?:_|$)|\bbottoms[\s_]+up\b/.test(compact)) {
    complexity += 1.25;
    reasons.push("name_pattern:bottoms_up");
  }
  if (/(?:^|_)zercher(?:_|$)|\bzercher\b/.test(id)) {
    complexity += 0.9;
    reasons.push("name_pattern:zercher");
  }

  if (slugs.has("beginner_friendly")) {
    complexity = Math.max(0, complexity - 1.4);
    reasons.push("tag:beginner_friendly_adjustment");
  }

  reasons.push(`complexity_final:${complexity.toFixed(2)}`);

  if (complexity >= 6.8) {
    reasons.push("band:intermediate_advanced_only");
    return {
      levels: ["intermediate", "advanced"],
      origin: "inferred",
      reasons,
      complexityScore: complexity,
    };
  }
  if (complexity >= 4.9) {
    reasons.push("band:all_three");
    return {
      levels: ["beginner", "intermediate", "advanced"],
      origin: "inferred",
      reasons,
      complexityScore: complexity,
    };
  }
  reasons.push("band:beginner_intermediate");
  return {
    levels: ["beginner", "intermediate"],
    origin: "inferred",
    reasons,
    complexityScore: complexity,
  };
}

export function inferWorkoutLevelsFromExtendedSource(src: WorkoutLevelExtendedSource): UserLevel[] {
  return inferWorkoutLevelsWithExplanation(src).levels;
}

/** Legacy: forwards to extended inference with tag/id/name only. */
export function inferWorkoutLevelsFromSource(src: WorkoutLevelSource): UserLevel[] {
  return inferWorkoutLevelsFromExtendedSource({
    id: src.id,
    name: src.name,
    tags: src.tags ?? [],
    workout_levels: src.workout_levels,
  });
}

/** Parse DB string list (e.g. future column) into ordered tier tags; invalid entries dropped. */
export function parseWorkoutLevelsFromDb(raw: string[] | null | undefined): UserLevel[] | undefined {
  if (!raw?.length) return undefined;
  const allowed = new Set<string>(TIER_ORDER);
  const seen = new Set<UserLevel>();
  for (const r of raw) {
    const s = r.toLowerCase().replace(/\s/g, "_") as UserLevel;
    if (allowed.has(s)) seen.add(s as UserLevel);
  }
  const out = TIER_ORDER.filter((t) => seen.has(t));
  return out.length > 0 ? out : undefined;
}

export function inferCreativeVariationFromSource(src: WorkoutLevelSource): boolean {
  const slugs = new Set((src.tags ?? []).map(slugifyTag));
  if (slugs.has("creative") || slugs.has("complex_variation")) return true;

  const identity = `${src.id} ${src.name}`.toLowerCase().replace(/-/g, "_");

  const complexNamePattern =
    /\b(clubbell|mace|gada|steel_mace)\b.*\b(cast|mill|circle|flag_press|torch_press|inside_circle|outside_circle|gamma_cast|shield_cast)\b|\b(cast|mill|flag_press|torch_press|gamma_cast|shield_cast)\b.*\b(clubbell|mace|gada|steel_mace)\b/;
  if (complexNamePattern.test(identity)) return true;

  const comboChainPattern = /\b(to|and)\b.*\b(flag_press|cast|mill|clean)\b/;
  if (comboChainPattern.test(identity) && /\b(clubbell|mace|gada|steel_mace)\b/.test(identity)) return true;

  return false;
}

export function isComplexSkillLiftForNonAdvanced(args: {
  id: string;
  name: string;
  tags?: string[];
  movementPattern?: string;
  modality?: string;
}): boolean {
  const raw = `${args.id} ${args.name}`.toLowerCase().replace(/-/g, "_");
  const compact = raw.replace(/\s+/g, "_");
  const tags = new Set((args.tags ?? []).map(slugifyTag));
  const pattern = (args.movementPattern ?? "").toLowerCase().replace(/\s/g, "_");
  const modality = (args.modality ?? "").toLowerCase().replace(/\s/g, "_");

  const hasDbKbGoblet = /\bdumbbell\b|\bdb\b|\bkettlebell\b|\bkb\b|\bgoblet\b/i.test(raw);

  if (
    /\b(muscle_up|planche|front_lever|iron_cross|turkish_get_up|windmill|handstand_push|handstand\s*walk)\b/.test(
      raw
    )
  ) {
    return true;
  }
  if (/\bhandstand\b/.test(raw) && /\b(straddle|press|walk|pushup|push_up)\b/.test(raw)) return true;

  if (
    /\bclean\s+to\b|\bclean_to\b|\bclean\s+and\b|\bclean_and\b|\bsquat\s+clean\b|\bhang\s+clean\b/.test(raw)
  ) {
    if (!hasDbKbGoblet) return true;
  }
  if (/\bsnatch\b|\bjerk\b/.test(raw)) {
    if (!hasDbKbGoblet) return true;
  }
  if (/\bthruster\b/.test(raw) && !hasDbKbGoblet) return true;

  if (/\boverhead\b.*\bsquat\b|\bsquat\b.*\boverhead\b|\boh\s*squat\b/i.test(raw)) {
    if (!hasDbKbGoblet) return true;
  }
  if (/\boverhead\b.*\bpause\b.*\bsquat\b|\bpause\b.*\boverhead\b.*\bsquat\b/i.test(raw)) {
    if (!hasDbKbGoblet) return true;
  }

  if (/\breactive\b/i.test(raw) && /\b(skater|cone|cones)\b/i.test(raw)) return true;
  if (/\b(start_stop_clean|complex|combo|sequence|order)\b/.test(raw)) return true;
  if (/\b(clubbell|mace|gada|steel_mace)\b/.test(raw)) return true;
  if (pattern === "push" && /\b(handstand|snatch|jerk)\b/.test(raw) && !hasDbKbGoblet) {
    return true;
  }
  if (modality === "power" && /\b(clean|snatch|jerk|complex|combo)\b/.test(raw) && !hasDbKbGoblet) {
    return true;
  }
  if (tags.has("complex_variation") || tags.has("creative")) return true;

  if (/(?:^|_)bottoms_up(?:_|$)|\bbottoms[\s_]+up\b/.test(compact)) return true;
  if (/(?:^|_)horn_grip(?:_|$)|\bhorn[\s_]+grip\b/.test(compact)) return true;
  if (/(?:^|_)cyclist(?:_|$)|\bcyclist\b/.test(raw)) return true;
  if (/(?:^|_)curtsy(?:_|$)|\bcurtsy\b/.test(raw)) return true;
  if (/(?:^|_)ipsilateral(?:_|$)|\bipsilateral\b/.test(raw)) return true;
  if (/(?:^|_)contralateral(?:_|$)|\bcontralateral\b/.test(raw)) return true;
  if (/(?:^|_)zercher(?:_|$)|\bzercher\b/.test(raw)) return true;
  if (/(?:^|_)slider(?:_|$)|\bslider\b/.test(raw)) return true;
  if (/(?:^|_)pass_through(?:_|$)|\bpass[\s_]+through\b/.test(raw)) return true;
  if (/\boverhead\b.*\bwalking\b|\bwalking\b.*\boverhead\b/.test(raw)) return true;

  return false;
}

export function allowedTiersForUserPreference(tier: UserLevel): Set<UserLevel> {
  if (tier === "beginner") return new Set(["beginner"]);
  if (tier === "intermediate") return new Set(["beginner", "intermediate"]);
  return new Set(["beginner", "intermediate", "advanced"]);
}

export function exerciseMatchesWorkoutTier(
  exerciseLevels: UserLevel[] | undefined,
  userTier: UserLevel
): boolean {
  const levels: UserLevel[] =
    exerciseLevels && exerciseLevels.length > 0
      ? exerciseLevels
      : ["beginner", "intermediate", "advanced"];
  const allowed = allowedTiersForUserPreference(userTier);
  return levels.some((l) => allowed.has(l));
}

export function exerciseBlockedByCreativePreference(
  creativeVariation: boolean | undefined,
  includeCreativeVariations: boolean
): boolean {
  if (includeCreativeVariations) return false;
  return creativeVariation === true;
}

// --- Session scoring context (regressions / progressions in pool) ---

export type WorkoutLevelScoringContext = {
  regressionEasierIds: ReadonlySet<string>;
  poolIds: ReadonlySet<string>;
};

type PoolExerciseRef = { id: string; regressions?: string[]; progressions?: string[] };

export function buildWorkoutLevelScoringContext(pool: readonly PoolExerciseRef[]): WorkoutLevelScoringContext {
  const regressionEasierIds = new Set<string>();
  for (const e of pool) {
    for (const r of e.regressions ?? []) {
      if (r) regressionEasierIds.add(r);
    }
  }
  return {
    regressionEasierIds,
    poolIds: new Set(pool.map((e) => e.id)),
  };
}

const levelCtxByInput = new WeakMap<GenerateWorkoutInput, WorkoutLevelScoringContext>();

export function attachWorkoutLevelScoringContext(
  input: GenerateWorkoutInput,
  pool: readonly PoolExerciseRef[]
): void {
  levelCtxByInput.set(input, buildWorkoutLevelScoringContext(pool));
}

export function getWorkoutLevelScoringContext(
  input: GenerateWorkoutInput
): WorkoutLevelScoringContext | undefined {
  return levelCtxByInput.get(input);
}

/** Bounds for autonomous eval / safe tuning via env (default 1). */
const TIER_PREF_SCALE_MIN = 0.7;
const TIER_PREF_SCALE_MAX = 1.3;
const CREATIVE_BONUS_SCALE_MIN = 0.7;
const CREATIVE_BONUS_SCALE_MAX = 1.3;

function readBoundedEnvNumber(name: string, min: number, max: number, defaultVal: number): number {
  const raw = process.env[name];
  if (raw == null || raw === "") return defaultVal;
  const n = Number(raw);
  if (!Number.isFinite(n)) return defaultVal;
  return Math.min(max, Math.max(min, n));
}

/** Session tier preference total/part scale (`WORKOUT_LEVEL_TIER_PREF_SCALE`). Used by eval auto-tune; default off. */
export function getWorkoutLevelTierPreferenceEnvScale(): number {
  return readBoundedEnvNumber(
    "WORKOUT_LEVEL_TIER_PREF_SCALE",
    TIER_PREF_SCALE_MIN,
    TIER_PREF_SCALE_MAX,
    1
  );
}

/** Creative selection bonus scale (`WORKOUT_LEVEL_CREATIVE_BONUS_SCALE`). */
export function getWorkoutLevelCreativeBonusEnvScale(): number {
  return readBoundedEnvNumber(
    "WORKOUT_LEVEL_CREATIVE_BONUS_SCALE",
    CREATIVE_BONUS_SCALE_MIN,
    CREATIVE_BONUS_SCALE_MAX,
    1
  );
}

export function getWorkoutLevelScoringEnvScales(): {
  tier_preference: number;
  creative_bonus: number;
} {
  return {
    tier_preference: getWorkoutLevelTierPreferenceEnvScale(),
    creative_bonus: getWorkoutLevelCreativeBonusEnvScale(),
  };
}

type ExerciseForLevelScore = {
  id: string;
  stability_demand?: string;
  grip_demand?: string;
  impact_level?: string;
  unilateral?: boolean;
  difficulty?: number;
  progressions?: string[];
};

function demandSumFromExercise(e: ExerciseForLevelScore): number {
  return (
    demandPoints(e.stability_demand as DemandLevelHint) +
    demandPoints(e.grip_demand as DemandLevelHint) +
    demandPoints(e.impact_level as DemandLevelHint)
  );
}

export type ScoreBreakdown = { total: number; parts: Record<string, number> };

/**
 * Tier-aware ranking — calibrated so beginner skews clearly safer/simpler than advanced, without beating primary goal on typical lifts.
 */
export function computeWorkoutLevelPreferenceScoreBreakdown(
  exercise: ExerciseForLevelScore,
  userLevel: UserLevel | undefined,
  ctx: WorkoutLevelScoringContext | undefined
): ScoreBreakdown {
  const tier = userLevel ?? "intermediate";
  const parts: Record<string, number> = {};
  const demandSum = demandSumFromExercise(exercise);
  const diff = Math.max(1, Math.min(5, exercise.difficulty ?? 3));

  if (tier === "beginner") {
    if (diff >= 4) parts.difficulty_penalty = -1.85 * (diff - 3);
    if (diff <= 2) parts.difficulty_bonus = 1.52;
    parts.demand_penalty = -demandSum * 1.32;
    if (exercise.unilateral) parts.unilateral_penalty = -2.05;
    if (ctx?.regressionEasierIds.has(exercise.id)) parts.regression_target_bonus = 2.85;
  } else if (tier === "intermediate") {
    parts.demand_neutral = -demandSum * 0.12;
    if (exercise.unilateral) parts.unilateral_nudge = 0.08;
    if (ctx?.regressionEasierIds.has(exercise.id)) parts.regression_target_bonus = 0.42;
    if (diff >= 4) parts.difficulty_nudge = 0.26;
    if (diff <= 2) parts.difficulty_nudge = (parts.difficulty_nudge ?? 0) - 0.08;
  } else {
    if (diff >= 4) parts.difficulty_bonus = 1.28 * (diff - 3);
    if (diff <= 2) parts.difficulty_penalty = -0.78;
    parts.demand_bonus = demandSum * 0.74;
    if (exercise.unilateral) parts.unilateral_bonus = 1.05;
    if (ctx && exercise.progressions?.some((p) => ctx.poolIds.has(p))) parts.progression_in_pool_bonus = 2.38;
  }

  const tierScale = getWorkoutLevelTierPreferenceEnvScale();
  if (tierScale !== 1) {
    for (const k of Object.keys(parts)) {
      parts[k] *= tierScale;
    }
  }
  const total = Object.values(parts).reduce((a, v) => a + v, 0);
  return { total, parts };
}

export function computeWorkoutLevelPreferenceScore(
  exercise: ExerciseForLevelScore,
  userLevel: UserLevel | undefined,
  ctx: WorkoutLevelScoringContext | undefined
): number {
  return computeWorkoutLevelPreferenceScoreBreakdown(exercise, userLevel, ctx).total;
}

const COMMON_STRENGTH_PATTERNS = new Set(["squat", "hinge", "push", "pull"]);

/** Hard cap so stacked creative signals cannot outweigh `WEIGHT_PRIMARY_GOAL` (~3) in dailyGenerator. */
const CREATIVE_SELECTION_BONUS_MAX_TOTAL = 2.55;

/** Creative mode: meaningful novelty boost that stays below single-source goal weight (~3) for typical “slightly creative” moves. */
export function computeCreativeSelectionBonusBreakdown(
  exercise: {
    creative_variation?: boolean;
    movement_pattern?: string;
    modality?: string;
    tags?: { attribute_tags?: string[]; goal_tags?: string[] };
  },
  primaryGoal: PrimaryGoal,
  includeCreativeVariations: boolean
): ScoreBreakdown {
  const parts: Record<string, number> = {};
  if (!includeCreativeVariations) return { total: 0, parts };
  if (exercise.creative_variation) parts.creative_variation_flag = 1.58;
  const attrs = new Set((exercise.tags?.attribute_tags ?? []).map(slugifyTag));
  if (attrs.has("creative") || attrs.has("complex_variation")) parts.attribute_creative_or_complex = 0.88;

  const pat = (exercise.movement_pattern ?? "").toLowerCase().replace(/\s/g, "_");
  if (pat && !COMMON_STRENGTH_PATTERNS.has(pat)) parts.uncommon_pattern = 0.78;

  const mod = (exercise.modality ?? "").toLowerCase().replace(/\s/g, "_");
  if (mod === "skill") parts.modality_skill = 0.88;
  if (mod === "power" && primaryGoal === "hypertrophy") parts.cross_modality_power_vs_hyp = 0.55;
  if (mod === "conditioning" && (primaryGoal === "strength" || primaryGoal === "hypertrophy")) {
    parts.cross_modality_conditioning_vs_strength = 0.55;
  }

  const goals = exercise.tags?.goal_tags ?? [];
  const goalSet = new Set(goals);
  if (goalSet.has("power") && goalSet.has("hypertrophy")) parts.goal_tag_mix_power_hyp = 0.45;
  if (goalSet.has("strength") && goalSet.has("conditioning")) parts.goal_tag_mix_strength_cond = 0.45;

  const creativeScale = getWorkoutLevelCreativeBonusEnvScale();
  if (creativeScale !== 1) {
    for (const k of Object.keys(parts)) {
      parts[k] *= creativeScale;
    }
  }
  let total = Object.values(parts).reduce((a, v) => a + v, 0);
  if (total > CREATIVE_SELECTION_BONUS_MAX_TOTAL && total > 0) {
    const capScale = CREATIVE_SELECTION_BONUS_MAX_TOTAL / total;
    for (const k of Object.keys(parts)) parts[k] *= capScale;
    total = CREATIVE_SELECTION_BONUS_MAX_TOTAL;
  }
  return { total, parts };
}

export function computeCreativeSelectionBonus(
  exercise: {
    creative_variation?: boolean;
    movement_pattern?: string;
    modality?: string;
    tags?: { attribute_tags?: string[]; goal_tags?: string[] };
  },
  primaryGoal: PrimaryGoal,
  includeCreativeVariations: boolean
): number {
  return computeCreativeSelectionBonusBreakdown(exercise, primaryGoal, includeCreativeVariations).total;
}

/** Beginner hard gate beyond tier overlap (safety + mis-tagged difficult moves). */
export function isHardBlockedForBeginnerTier(exercise: {
  difficulty?: number;
  workout_level_tags?: UserLevel[];
}): boolean {
  const tags = exercise.workout_level_tags;
  if (tags?.length && !tags.includes("beginner")) return true;
  if ((exercise.difficulty ?? 0) >= 5) return true;
  return false;
}
