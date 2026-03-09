/**
 * Phase 9/10: Ontology-aware scoring components for exercise ranking.
 * Additive, explainable components; ontology is source of truth when present, fallback to legacy.
 * Phase 10: uses canonical normalization layer (grip fatigue, unilateral/variety signals).
 */

import type { Exercise } from "./types";
import {
  getCanonicalExerciseRole,
  getCanonicalMovementFamilies,
  getCanonicalFatigueRegions,
  getCanonicalJointStressTags,
  getCanonicalMobilityTargets,
  getCanonicalStretchTargets,
  getCanonicalMovementPatterns,
  isCanonicalUnilateral,
  type ExerciseForNormalization,
} from "./ontologyNormalization";

/** Minimal exercise shape for scoring (generator Exercise or adapter with ontology). */
export interface ExerciseForScoring {
  id: string;
  movement_pattern?: string;
  muscle_groups?: string[];
  primary_movement_family?: string;
  secondary_movement_families?: string[];
  movement_patterns?: string[];
  exercise_role?: string;
  pairing_category?: string;
  fatigue_regions?: string[];
  mobility_targets?: string[];
  stretch_targets?: string[];
  joint_stress_tags?: string[];
  tags?: { joint_stress?: string[]; stimulus?: string[] };
  unilateral?: boolean;
}

function toNormalization(ex: ExerciseForScoring): ExerciseForNormalization {
  return {
    id: ex.id,
    movement_pattern: ex.movement_pattern,
    muscle_groups: ex.muscle_groups,
    primary_movement_family: ex.primary_movement_family,
    secondary_movement_families: ex.secondary_movement_families,
    movement_patterns: ex.movement_patterns,
    exercise_role: ex.exercise_role,
    pairing_category: ex.pairing_category,
    fatigue_regions: ex.fatigue_regions,
    mobility_targets: ex.mobility_targets,
    stretch_targets: ex.stretch_targets,
    joint_stress_tags: ex.joint_stress_tags,
    tags: ex.tags,
    unilateral: ex.unilateral,
  };
}

/** Per-factor score components (additive; for debug/tuning). */
export interface OntologyScoreBreakdown {
  role_fit?: number;
  movement_family_fit?: number;
  main_lift_anchor?: number;
  fatigue_balance?: number;
  joint_stress_soft?: number;
  warmup_cooldown_relevance?: number;
  /** Phase 10: unilateral variety bonus when session has bilateral lower and candidate is unilateral. */
  unilateral_variety_bonus?: number;
  /** Phase 10: penalty for redundant movement pattern vs session. */
  movement_pattern_redundancy_penalty?: number;
}

/** Normalize slug for comparison. */
function norm(s: string | undefined): string {
  if (!s) return "";
  return s.toLowerCase().replace(/\s/g, "_");
}

/** Effective fatigue regions (canonical; includes grip when hasGripFatigueDemand). */
export function getEffectiveFatigueRegions(ex: ExerciseForScoring): string[] {
  return getCanonicalFatigueRegions(toNormalization(ex));
}

/** Effective primary movement family (canonical). */
export function getEffectivePrimaryFamily(ex: ExerciseForScoring): string | undefined {
  return getCanonicalMovementFamilies(toNormalization(ex)).primary;
}

/** Effective exercise role (canonical). */
function getEffectiveRole(ex: ExerciseForScoring): string | undefined {
  return getCanonicalExerciseRole(toNormalization(ex));
}

// --- Role preferences by block type (additive scores; tunable) ---
const ROLE_MAIN_STRENGTH_PREFERRED = new Set(["main_compound", "secondary_compound"]);
const ROLE_MAIN_STRENGTH_ACCEPTABLE = new Set(["accessory", "isolation", "finisher"]);
const ROLE_MAIN_PENALIZED = new Set(["cooldown", "stretch", "mobility", "breathing", "warmup"]);
const ROLE_WARMUP_PREFERRED = new Set(["prep", "warmup", "mobility", "activation", "mobility_prep"]);
const ROLE_COOLDOWN_PREFERRED = new Set(["cooldown", "stretch", "breathing", "mobility"]);

/** Role fit score for block type. */
export function scoreRoleFit(
  ex: ExerciseForScoring,
  blockType: string | undefined
): { score: number; reason?: string } {
  const role = getEffectiveRole(ex);
  if (!blockType) return { score: 0 };
  const bt = blockType.toLowerCase().replace(/\s/g, "_");

  if (bt === "main_strength" || bt === "main_hypertrophy") {
    if (role && ROLE_MAIN_PENALIZED.has(role)) return { score: -3, reason: "main_work_excluded_role" };
    if (role && ROLE_MAIN_STRENGTH_PREFERRED.has(role)) return { score: 2, reason: "compound_anchor" };
    if (role && ROLE_MAIN_STRENGTH_ACCEPTABLE.has(role)) return { score: 0.5, reason: "accessory_ok" };
    if (bt === "main_hypertrophy" && role === "isolation") return { score: 0.3, reason: "isolation_ok_hypertrophy" };
    return { score: 0 };
  }

  if (bt === "warmup") {
    if (role && ROLE_WARMUP_PREFERRED.has(role)) return { score: 1.5, reason: "warmup_prep_role" };
    return { score: 0 };
  }

  if (bt === "cooldown") {
    if (role && ROLE_COOLDOWN_PREFERRED.has(role)) return { score: 1.5, reason: "cooldown_role" };
    return { score: 0 };
  }

  if (bt === "accessory") {
    if (role && (role === "accessory" || role === "isolation")) return { score: 1, reason: "accessory_role" };
    return { score: 0 };
  }

  return { score: 0 };
}

/** Movement family fit: focus body parts vs exercise family (canonical). */
export function scoreMovementFamilyFit(
  ex: ExerciseForScoring,
  focusBodyParts: string[] | undefined
): { score: number; reason?: string } {
  if (!focusBodyParts?.length) return { score: 0 };
  const { primary, secondary } = getCanonicalMovementFamilies(toNormalization(ex));
  if (!primary) return { score: 0 };
  const focusSet = new Set(focusBodyParts.map((f) => norm(f)));
  if (focusSet.has(primary)) return { score: 1.5, reason: "primary_family_match" };
  if (secondary.some((s) => focusSet.has(s))) return { score: 0.8, reason: "secondary_family_match" };
  return { score: 0 };
}

/** Main-lift anchor: prefer compounds and session-family match for main blocks. */
export function scoreMainLiftAnchor(
  ex: ExerciseForScoring,
  blockType: string | undefined,
  focusBodyParts: string[] | undefined,
  _primaryGoal: string | undefined
): { score: number; reason?: string } {
  if (!blockType || (blockType !== "main_strength" && blockType !== "main_hypertrophy")) return { score: 0 };
  const role = getEffectiveRole(ex);
  const primary = getEffectivePrimaryFamily(ex);
  const pattern = norm(ex.movement_pattern);
  const patterns = getCanonicalMovementPatterns(toNormalization(ex));

  // Strong anchor: compound role + matching family
  if (role && ROLE_MAIN_STRENGTH_PREFERRED.has(role)) {
    const focusSet = focusBodyParts?.length ? new Set(focusBodyParts.map(norm)) : null;
    if (!focusSet || (primary && focusSet.has(primary))) {
      return { score: 2, reason: "compound_anchor_match" };
    }
    return { score: 1.2, reason: "compound_anchor" };
  }

  // Upper push: prefer push patterns (horizontal_push, vertical_push, push) over small isolation
  const upperPush = focusBodyParts?.some((f) => norm(f) === "upper_push");
  if (upperPush && primary === "upper_push") {
    const isPressLike = ["push", "horizontal_push", "vertical_push"].some((p) => pattern === p || patterns.includes(p));
    if (isPressLike) return { score: 1, reason: "upper_push_press" };
    if (role === "isolation") return { score: -0.8, reason: "upper_push_avoid_isolation_anchor" };
  }

  // Lower: prefer squat/hinge over minor accessories
  const lower = focusBodyParts?.some((f) => norm(f) === "lower" || norm(f) === "lower_body");
  if (lower && primary === "lower_body") {
    const isBigCompound = ["squat", "hinge", "lunge"].some((p) => pattern === p || patterns.includes(p));
    if (isBigCompound) return { score: 1, reason: "lower_compound" };
  }

  // Core: prefer real core work over filler
  const core = focusBodyParts?.some((f) => norm(f) === "core");
  if (core && primary === "core") {
    const isCorePattern = ["rotate", "anti_rotation", "carry"].some((p) => pattern === p || patterns.includes(p));
    if (isCorePattern) return { score: 0.8, reason: "core_main" };
  }

  return { score: 0 };
}

/** Session-level fatigue balance: penalize exercises that overlap heavily with already-used regions. */
export function scoreFatigueBalance(
  ex: ExerciseForScoring,
  sessionFatigueRegions: Map<string, number> | undefined
): { score: number; reason?: string } {
  if (!sessionFatigueRegions?.size) return { score: 0 };
  const regions = getEffectiveFatigueRegions(ex);
  if (!regions.length) return { score: 0 };
  let overlap = 0;
  for (const r of regions) {
    overlap += sessionFatigueRegions.get(r) ?? 0;
  }
  if (overlap === 0) return { score: 0.5, reason: "fatigue_fresh_region" };
  if (overlap >= 3) return { score: -1, reason: "fatigue_overlap_high" };
  if (overlap >= 1) return { score: -0.3, reason: "fatigue_overlap_low" };
  return { score: 0 };
}

/** Soft penalty for joint stress when not hard-excluded (canonical tags). */
export function scoreJointStressSoft(
  ex: ExerciseForScoring,
  _context: { blockType?: string }
): { score: number; reason?: string } {
  const tags = getCanonicalJointStressTags(toNormalization(ex));
  if (!tags.length) return { score: 0 };
  return { score: -0.2, reason: "joint_stress_present" };
}

/** Warmup/cooldown relevance: canonical mobility/stretch targets vs preferred. */
export function scoreWarmupCooldownRelevance(
  ex: ExerciseForScoring,
  blockType: string | undefined,
  preferredTargets: string[] | undefined
): { score: number; reason?: string } {
  if (!preferredTargets?.length || (blockType !== "warmup" && blockType !== "cooldown")) return { score: 0 };
  const mobility = new Set(getCanonicalMobilityTargets(toNormalization(ex)));
  const stretch = new Set(getCanonicalStretchTargets(toNormalization(ex)));
  const all = new Set([...mobility, ...stretch]);
  let score = 0;
  for (const t of preferredTargets) {
    const key = norm(t);
    if (all.has(key)) score += 1;
  }
  return score > 0 ? { score: Math.min(score * 0.5, 1.5), reason: "target_match" } : { score: 0 };
}

/** Phase 10: Unilateral variety bonus when session has bilateral lower and candidate is unilateral (tunable). */
export function scoreUnilateralVariety(
  ex: ExerciseForScoring,
  sessionHasBilateralLowerBody: boolean
): { score: number; reason?: string } {
  if (!sessionHasBilateralLowerBody) return { score: 0 };
  if (!isCanonicalUnilateral(toNormalization(ex))) return { score: 0 };
  const { primary } = getCanonicalMovementFamilies(toNormalization(ex));
  if (primary !== "lower_body") return { score: 0 };
  return { score: 0.3, reason: "unilateral_variety_after_bilateral_lower" };
}

/** Phase 10: Slight penalty when session already has many exercises in the same pattern cluster (tunable). */
export function scoreMovementPatternRedundancy(
  ex: ExerciseForScoring,
  sessionPatternCounts: Map<string, number> | undefined,
  maxSamePatternBeforePenalty?: number
): { score: number; reason?: string } {
  if (!sessionPatternCounts?.size) return { score: 0 };
  const patterns = getCanonicalMovementPatterns(toNormalization(ex));
  const legacy = ex.movement_pattern ? norm(ex.movement_pattern) : patterns[0];
  const key = legacy || (patterns[0] ?? "unknown");
  const count = sessionPatternCounts.get(key) ?? 0;
  const cap = maxSamePatternBeforePenalty ?? 2;
  if (count >= cap) return { score: -0.2, reason: "pattern_redundancy" };
  return { score: 0 };
}

/** Weights for ontology components (tunable). */
export const ONTOLOGY_WEIGHTS = {
  role_fit: 1.5,
  movement_family_fit: 1.0,
  main_lift_anchor: 1.2,
  fatigue_balance: 1.0,
  joint_stress_soft: 1.0,
  warmup_cooldown_relevance: 1.0,
  unilateral_variety_bonus: 0.5,
  movement_pattern_redundancy_penalty: 1.0,
};

/**
 * Compute all ontology-based score components for an exercise (generator Exercise).
 * Fallback to legacy fields when ontology is absent. Phase 10: adds unilateral/variety and pattern redundancy.
 */
export function computeOntologyScoreComponents(
  exercise: Exercise,
  options: {
    blockType?: string;
    focusBodyParts?: string[];
    primaryGoal?: string;
    sessionFatigueRegions?: Map<string, number>;
    preferredWarmupCooldownTargets?: string[];
    /** Phase 10: for unilateral variety bonus. */
    sessionHasBilateralLowerBody?: boolean;
    /** Phase 10: for pattern redundancy penalty. */
    sessionMovementPatternCounts?: Map<string, number>;
  }
): { total: number; breakdown: OntologyScoreBreakdown } {
  const ex: ExerciseForScoring = {
    id: exercise.id,
    movement_pattern: exercise.movement_pattern,
    muscle_groups: exercise.muscle_groups,
    primary_movement_family: exercise.primary_movement_family,
    secondary_movement_families: exercise.secondary_movement_families,
    movement_patterns: exercise.movement_patterns,
    exercise_role: exercise.exercise_role,
    pairing_category: exercise.pairing_category,
    fatigue_regions: exercise.fatigue_regions,
    mobility_targets: exercise.mobility_targets,
    stretch_targets: exercise.stretch_targets,
    joint_stress_tags: exercise.joint_stress_tags,
    tags: exercise.tags,
    unilateral: exercise.unilateral,
  };

  const breakdown: OntologyScoreBreakdown = {};
  let total = 0;

  const roleResult = scoreRoleFit(ex, options.blockType);
  if (roleResult.score !== 0) {
    breakdown.role_fit = roleResult.score * ONTOLOGY_WEIGHTS.role_fit;
    total += breakdown.role_fit;
  }

  const familyResult = scoreMovementFamilyFit(ex, options.focusBodyParts);
  if (familyResult.score !== 0) {
    breakdown.movement_family_fit = familyResult.score * ONTOLOGY_WEIGHTS.movement_family_fit;
    total += breakdown.movement_family_fit;
  }

  const anchorResult = scoreMainLiftAnchor(
    ex,
    options.blockType,
    options.focusBodyParts,
    options.primaryGoal
  );
  if (anchorResult.score !== 0) {
    breakdown.main_lift_anchor = anchorResult.score * ONTOLOGY_WEIGHTS.main_lift_anchor;
    total += breakdown.main_lift_anchor;
  }

  const fatigueResult = scoreFatigueBalance(ex, options.sessionFatigueRegions);
  if (fatigueResult.score !== 0) {
    breakdown.fatigue_balance = fatigueResult.score * ONTOLOGY_WEIGHTS.fatigue_balance;
    total += breakdown.fatigue_balance;
  }

  const jointResult = scoreJointStressSoft(ex, { blockType: options.blockType });
  if (jointResult.score !== 0) {
    breakdown.joint_stress_soft = jointResult.score * ONTOLOGY_WEIGHTS.joint_stress_soft;
    total += breakdown.joint_stress_soft;
  }

  const warmupCoolResult = scoreWarmupCooldownRelevance(
    ex,
    options.blockType,
    options.preferredWarmupCooldownTargets
  );
  if (warmupCoolResult.score !== 0) {
    breakdown.warmup_cooldown_relevance = warmupCoolResult.score * ONTOLOGY_WEIGHTS.warmup_cooldown_relevance;
    total += breakdown.warmup_cooldown_relevance;
  }

  const unilateralResult = scoreUnilateralVariety(ex, options.sessionHasBilateralLowerBody ?? false);
  if (unilateralResult.score !== 0) {
    breakdown.unilateral_variety_bonus = unilateralResult.score * ONTOLOGY_WEIGHTS.unilateral_variety_bonus;
    total += breakdown.unilateral_variety_bonus!;
  }

  const redundancyResult = scoreMovementPatternRedundancy(
    ex,
    options.sessionMovementPatternCounts,
    2
  );
  if (redundancyResult.score !== 0) {
    breakdown.movement_pattern_redundancy_penalty =
      redundancyResult.score * ONTOLOGY_WEIGHTS.movement_pattern_redundancy_penalty;
    total += breakdown.movement_pattern_redundancy_penalty!;
  }

  return { total, breakdown };
}

/** Preferred mobility/stretch targets from focus body parts (for warmup/cooldown relevance). */
export const FOCUS_TO_WARMUP_TARGETS: Record<string, string[]> = {
  upper_push: ["shoulders", "thoracic_spine", "pecs"],
  upper_pull: ["lats", "shoulders", "thoracic_spine"],
  lower: ["hamstrings", "hip_flexors", "glutes", "calves", "quadriceps"],
  lower_body: ["hamstrings", "hip_flexors", "glutes", "calves", "quadriceps"],
  core: ["thoracic_spine", "low_back", "hip_flexors"],
};

export function getPreferredWarmupTargetsFromFocus(focusBodyParts: string[] | undefined): string[] {
  if (!focusBodyParts?.length) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const f of focusBodyParts) {
    const key = norm(f);
    const targets = FOCUS_TO_WARMUP_TARGETS[key];
    if (targets) {
      for (const t of targets) {
        if (!seen.has(t)) {
          seen.add(t);
          out.push(t);
        }
      }
    }
  }
  return out;
}
