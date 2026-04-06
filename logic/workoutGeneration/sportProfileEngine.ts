/**
 * Sport profile engine: pool filter, scoring, conditioning scale — driven by canonical
 * `SportDefinition.engine` in data/sportSubFocus/sportDefinitions.ts (via mapper).
 */

import { SPORT_DEFINITIONS, getCanonicalSportSlug, getSportDefinition } from "../../data/sportSubFocus";
import type { GenerateWorkoutInput } from "./types";
import type { Exercise } from "./types";
import {
  mapSportDefinitionToNormalizedProfile,
  type MapSportDefinitionResult,
} from "./mapSportDefinitionToNormalizedProfile";
import { exerciseIsHeavyLowerOnlySquatHinge } from "./sportProfileBanPredicates";
import type {
  NormalizedSportProfile,
  NormalizedSportProfileSummary,
  SportProfileAppliedSnapshot,
  SportProfileMappingDebug,
} from "./sportProfileTypes";

export type {
  NormalizedSportProfile,
  NormalizedSportProfileSummary,
  SportProfileAppliedSnapshot,
} from "./sportProfileTypes";
export type { StructureBiasKind } from "./sportProfileTypes";

export { exerciseIsHeavyLowerOnlySquatHinge, hardBanLegPressFamily } from "./sportProfileBanPredicates";

export type SportProfileSessionLoadResult =
  | { status: "skipped"; reason: string }
  | {
      status: "applied";
      canonicalSlug: string;
      profile: NormalizedSportProfile;
      mapResult: Extract<MapSportDefinitionResult, { ok: true }>;
    }
  | { status: "map_failed"; canonicalSlug: string; errors: string[] };

/**
 * Single entry: load canonical `SportDefinition.engine` → profile, update cache, or report map failure.
 * Use this in generation so pool filtering never runs off a profile that did not map successfully.
 */
export function loadSportProfileForSession(input: GenerateWorkoutInput): SportProfileSessionLoadResult {
  if (input.sport_profile_engine_disabled === true) {
    return { status: "skipped", reason: "sport_profile_engine_disabled" };
  }
  const slug = input.sport_slugs?.[0];
  if (!slug) return { status: "skipped", reason: "no_sport_slug" };
  const canonicalSlug = getCanonicalSportSlug(slug);
  const def = getSportDefinition(canonicalSlug);
  if (!def?.engine || def.engine.enabled === false) {
    return { status: "skipped", reason: "no_canonical_engine" };
  }
  const mapResult = mapSportDefinitionToNormalizedProfile(def);
  if (mapResult.ok) {
    profileCache.set(canonicalSlug, mapResult.profile);
    return { status: "applied", canonicalSlug, profile: mapResult.profile, mapResult };
  }
  return { status: "map_failed", canonicalSlug, errors: mapResult.errors };
}

/** Slugs that have a non-disabled `engine` in canonical sport definitions. */
export function getSportSlugsWithProfileEngine(): string[] {
  return SPORT_DEFINITIONS.filter((d) => d.engine && d.engine.enabled !== false).map((d) => d.slug);
}

const profileCache = new Map<string, NormalizedSportProfile>();

/** Test-only: reset cached profiles after mutating canonical definitions. */
export function clearSportProfileEngineCache(): void {
  profileCache.clear();
}

function cachedNormalizedProfileForSlug(canonicalSlug: string): NormalizedSportProfile | null {
  const hit = profileCache.get(canonicalSlug);
  if (hit) return hit;
  const def = getSportDefinition(canonicalSlug);
  if (!def?.engine || def.engine.enabled === false) return null;
  const mapped = mapSportDefinitionToNormalizedProfile(def);
  if (!mapped.ok) return null;
  profileCache.set(canonicalSlug, mapped.profile);
  return mapped.profile;
}

export function shouldApplySportProfileEngine(input: GenerateWorkoutInput): boolean {
  return loadSportProfileForSession(input).status === "applied";
}

export function buildNormalizedSportProfile(input: GenerateWorkoutInput): NormalizedSportProfile | null {
  const slug = input.sport_slugs?.[0];
  if (!slug) return null;
  return cachedNormalizedProfileForSlug(getCanonicalSportSlug(slug));
}

/** Validate mapping for a canonical slug (tests / diagnostics). */
export function mapSportDefinitionForSlug(canonicalSlug: string) {
  const def = getSportDefinition(canonicalSlug);
  if (!def) return { ok: false as const, errors: [`No sport definition for ${canonicalSlug}`] };
  return mapSportDefinitionToNormalizedProfile(def);
}

export function sportDefinitionExistsForEngineSlug(slug: string): boolean {
  return getSportDefinition(slug)?.engine != null && getSportDefinition(slug)?.engine?.enabled !== false;
}

const MIN_POOL_ABS = 12;
const MIN_POOL_FRAC = 0.12;

export function getSportAdjustedExercisePool(
  pool: Exercise[],
  profile: NormalizedSportProfile,
  relaxLevel: number
): { pool: Exercise[]; relaxLevel: number } {
  const minSize = Math.max(MIN_POOL_ABS, Math.floor(pool.length * MIN_POOL_FRAC));
  let level = relaxLevel;
  let out = pool;
  for (let attempt = 0; attempt < 4; attempt++) {
    out = pool.filter((e) => exercisePassesSportProfileHardGate(e, profile, level));
    if (out.length >= minSize || level >= 3) break;
    level += 1;
  }
  return { pool: out, relaxLevel: level };
}

function normTag(s: string): string {
  return s.toLowerCase().replace(/\s/g, "_");
}

function collectExerciseTagSet(exercise: Exercise): Set<string> {
  const slugs = new Set<string>();
  const add = (s: string) => slugs.add(normTag(s));
  for (const t of exercise.tags.goal_tags ?? []) add(t);
  for (const t of exercise.tags.sport_tags ?? []) add(t);
  for (const t of exercise.tags.stimulus ?? []) add(t);
  for (const t of exercise.tags.attribute_tags ?? []) add(t);
  for (const m of exercise.muscle_groups ?? []) add(m);
  if (exercise.movement_pattern) add(exercise.movement_pattern);
  const pairing = (exercise.pairing_category ?? "").trim();
  if (pairing) add(pairing);
  const fams = [
    exercise.primary_movement_family,
    ...(exercise.secondary_movement_families ?? []),
    ...(exercise.movement_patterns ?? []),
  ].filter(Boolean) as string[];
  for (const f of fams) add(f);
  return slugs;
}

export function exercisePassesSportProfileHardGate(
  exercise: Exercise,
  profile: NormalizedSportProfile,
  relaxLevel: number
): boolean {
  const tags = collectExerciseTagSet(exercise);

  for (const pred of profile.hardBanPredicates) {
    if (pred(exercise)) return false;
  }

  for (const ban of profile.bannedTagSlugs) {
    if (tags.has(normTag(ban))) return false;
  }

  if (relaxLevel < 2) {
    for (const ban of profile.softBannedTagSlugs) {
      if (tags.has(normTag(ban))) return false;
    }
  }

  if (relaxLevel < 1) {
    for (const pred of profile.softBanPredicates) {
      if (pred(exercise)) return false;
    }
  }

  if (relaxLevel < 1 && profile.climbingStyleDomainGate) {
    if (exerciseMatchesTopDomainRockClimbing(exercise, tags) === false) {
      if (exercise.modality === "strength" || exercise.modality === "hypertrophy" || exercise.modality === "power") {
        return false;
      }
    }
  }

  return true;
}

function exerciseMatchesTopDomainRockClimbing(exercise: Exercise, tags: Set<string>): boolean {
  const p = exercise.movement_pattern;
  if (p === "pull" || p === "rotate" || p === "push" || p === "carry") return true;
  if (tags.has("vertical_pull") || tags.has("horizontal_pull")) return true;
  if (tags.has("pulling_strength") || tags.has("finger_strength") || tags.has("grip_endurance")) return true;
  if (tags.has("core_bracing") || tags.has("anti_rotation") || tags.has("anti_extension")) return true;
  if (tags.has("scapular_control")) return true;
  return false;
}

export type SportProfileScoreComponents = {
  movement_pattern_match: number;
  sport_specificity: number;
  energy_system_alignment: number;
  penalty: number;
  penalty_flags: string[];
};

export function computeSportProfileScoreComponents(
  exercise: Exercise,
  profile: NormalizedSportProfile,
  blockTypeNorm: string
): SportProfileScoreComponents {
  const penalty_flags: string[] = [];
  let movement_pattern_match = 0;
  const exPat = exercise.movement_pattern;
  const mult =
    (blockTypeNorm === "main_strength" || blockTypeNorm === "main_hypertrophy") &&
    profile.compositionNudge.mainStrengthPatternScoreMultiplier !== 1
      ? profile.compositionNudge.mainStrengthPatternScoreMultiplier
      : 1;

  for (const row of profile.weightedMovementPatterns) {
    if (row.pattern === exPat) {
      movement_pattern_match += 2.8 * row.weight * mult;
    }
  }
  const tags = collectExerciseTagSet(exercise);

  let sport_specificity = 0;
  for (const { tag, weight } of profile.requiredTagBoosts) {
    if (tags.has(normTag(tag))) sport_specificity += 0.55 * weight;
  }
  if (
    (exercise.tags.sport_tags ?? []).some((s) => normTag(getCanonicalSportSlug(s)) === profile.sportSlug)
  ) {
    sport_specificity += 1.2;
  }

  let energy_system_alignment = 0;
  const stim = new Set((exercise.tags.stimulus ?? []).map(normTag));
  for (const t of profile.energySystemBias.favorStimulusTags) {
    if (stim.has(normTag(t))) energy_system_alignment += 0.9;
  }
  if (exercise.modality === "conditioning") {
    energy_system_alignment += 0.5;
    if (blockTypeNorm === "conditioning") energy_system_alignment += 0.8;
  }

  let penalty = 0;
  const pkeys = new Set(profile.scoringPenaltyKeys);
  if (pkeys.has("climbing_heavy_lower_squat_hinge_penalty") && exerciseIsHeavyLowerOnlySquatHinge(exercise)) {
    penalty -= 2.8;
    penalty_flags.push("heavy_lower_only_squat_hinge");
  }
  if (
    pkeys.has("climbing_bilateral_squat_hypertrophy_penalty") &&
    exPat === "squat" &&
    (exercise.tags.goal_tags ?? []).some((g) => normTag(g) === "hypertrophy") &&
    !tags.has("single_leg_strength")
  ) {
    penalty -= 1.1;
    penalty_flags.push("bilateral_squat_hypertrophy_climbing");
  }
  if (pkeys.has("alpine_upper_hypertrophy_mismatch_penalty")) {
    const hypertrophyIntent =
      exercise.modality === "hypertrophy" ||
      (exercise.tags.goal_tags ?? []).some((g) => normTag(g) === "hypertrophy");
    if (
      (exPat === "push" || exPat === "pull") &&
      hypertrophyIntent &&
      !tags.has("single_leg_strength") &&
      !exercise.muscle_groups.map(normTag).some((m) => ["legs", "quads", "glutes", "hamstrings", "calves"].includes(m))
    ) {
      penalty -= 2.2;
      penalty_flags.push("upper_hypertrophy_alpine_mismatch");
    }
  }

  return {
    movement_pattern_match,
    sport_specificity,
    energy_system_alignment,
    penalty,
    penalty_flags,
  };
}

export function formatStructureBiasLabel(profile: NormalizedSportProfile): string {
  const { strength, conditioning, hybrid } = profile.structureBias;
  return `strength ${Math.round(strength * 100)}% · conditioning ${Math.round(conditioning * 100)}% · hybrid ${Math.round(hybrid * 100)}%`;
}

/**
 * True when canonical structure bias should nudge this session toward including / weighting conditioning.
 * Used by dailyGenerator only (incremental; does not replace weekly planner).
 */
export function sportProfileBiasedTowardConditioning(profile: NormalizedSportProfile): boolean {
  if (profile.structureEmphasis === "conditioning") return true;
  const { strength, conditioning } = profile.structureBias;
  return conditioning > strength + 0.05;
}

/** Conditioning pick score for sorting cardio pool (movement + specificity + energy + penalties). */
export function sportProfileConditioningPickScore(exercise: Exercise, profile: NormalizedSportProfile): number {
  const c = computeSportProfileScoreComponents(exercise, profile, "conditioning");
  return c.movement_pattern_match + c.sport_specificity + c.energy_system_alignment + c.penalty;
}

function normalizedProfileSummaryFrom(profile: NormalizedSportProfile): NormalizedSportProfileSummary {
  return {
    sport_slug: profile.sportSlug,
    display_name: profile.displayName,
    top_patterns: [...profile.topPatterns],
    secondary_patterns: [...profile.secondaryPatterns],
    weighted_movement_patterns: profile.weightedMovementPatterns.map((r) => ({
      pattern: r.pattern,
      rank: r.rank,
      weight: r.weight,
    })),
    required_tag_boosts: profile.requiredTagBoosts.map((t) => ({ tag: t.tag, weight: t.weight })),
    hard_banned_tag_slugs: [...profile.bannedTagSlugs],
    soft_banned_tag_slugs: [...profile.softBannedTagSlugs],
    hard_ban_predicate_count: profile.hardBanPredicates.length,
    soft_ban_predicate_count: profile.softBanPredicates.length,
    conditioning_minutes_scale: profile.energySystemBias.conditioningMinutesScale,
    favor_stimulus_tags: [...profile.energySystemBias.favorStimulusTags],
    structure_bias: { ...profile.structureBias },
    structure_emphasis: profile.structureEmphasis,
    composition_nudge: {
      conditioning_block_extra_scale: profile.compositionNudge.conditioningBlockExtraScale,
      conditioning_picker_minutes_multiplier: profile.compositionNudge.conditioningPickerMinutesMultiplier,
      main_strength_pattern_score_multiplier: profile.compositionNudge.mainStrengthPatternScoreMultiplier,
      climbing_style_domain_gate: profile.climbingStyleDomainGate,
    },
    scoring_penalty_keys: [...profile.scoringPenaltyKeys],
  };
}

const EMPTY_MAPPING_DEBUG: Omit<
  SportProfileMappingDebug,
  | "sourceDefinitionSlug"
  | "canonical_sport_definition_slug"
  | "mappingOk"
  | "mappingErrors"
  | "fallback_reason"
> = {
  canonical_profile_loaded: false,
  canonical_fields_used: [],
  mapper_defaults_applied: [],
  fallback_used: true,
  normalized_profile_summary: null,
  canonicalFieldsUsed: [],
  normalizedSummary: {
    topPatterns: [],
    hardBanPredicateCount: 0,
    softBanPredicateCount: 0,
    conditioningMinutesScale: 1,
    conditioningBlockExtraScale: 1,
    conditioningPickerMinutesMultiplier: 1,
    mainStrengthPatternScoreMultiplier: 1,
    climbingStyleDomainGate: false,
    scoringPenaltyKeys: [],
  },
};

export function buildSportProfileMappingDebug(
  canonicalSlug: string,
  profile: NormalizedSportProfile,
  mapResult: MapSportDefinitionResult
): SportProfileMappingDebug {
  if (!mapResult.ok) {
    const reason = mapResult.errors.join("; ");
    return {
      ...EMPTY_MAPPING_DEBUG,
      sourceDefinitionSlug: canonicalSlug,
      canonical_sport_definition_slug: canonicalSlug,
      mappingOk: false,
      mappingErrors: mapResult.errors,
      fallback_reason: reason,
      canonical_profile_loaded: false,
    };
  }
  const defaults = mapResult.defaultsApplied;
  const fallback_used = defaults.length > 0;
  const fallback_reason = fallback_used ? defaults.join("; ") : null;
  return {
    sourceDefinitionSlug: canonicalSlug,
    canonical_sport_definition_slug: canonicalSlug,
    canonical_profile_loaded: true,
    canonical_fields_used: mapResult.fieldsUsed,
    mapper_defaults_applied: defaults,
    fallback_used,
    fallback_reason,
    normalized_profile_summary: normalizedProfileSummaryFrom(profile),
    mappingOk: true,
    mappingWarnings: mapResult.warnings,
    canonicalFieldsUsed: mapResult.fieldsUsed,
    normalizedSummary: {
      topPatterns: [...profile.topPatterns],
      hardBanPredicateCount: profile.hardBanPredicates.length,
      softBanPredicateCount: profile.softBanPredicates.length,
      conditioningMinutesScale: profile.energySystemBias.conditioningMinutesScale,
      conditioningBlockExtraScale: profile.compositionNudge.conditioningBlockExtraScale,
      conditioningPickerMinutesMultiplier: profile.compositionNudge.conditioningPickerMinutesMultiplier,
      mainStrengthPatternScoreMultiplier: profile.compositionNudge.mainStrengthPatternScoreMultiplier,
      climbingStyleDomainGate: profile.climbingStyleDomainGate,
      scoringPenaltyKeys: [...profile.scoringPenaltyKeys],
    },
  };
}

export function applyConditioningDurationScaleToBlocks(
  blocks: import("./types").WorkoutBlock[],
  profile: NormalizedSportProfile
): import("./types").WorkoutBlock[] {
  const scale =
    profile.energySystemBias.conditioningMinutesScale * profile.compositionNudge.conditioningBlockExtraScale;
  if (scale === 1 || !Number.isFinite(scale)) return blocks;
  return blocks.map((b) => {
    if (b.block_type !== "conditioning") return b;
    const estimated_minutes =
      b.estimated_minutes != null ? Math.max(3, Math.round(b.estimated_minutes * scale)) : b.estimated_minutes;
    const items = b.items.map((it) => ({
      ...it,
      time_seconds:
        it.time_seconds != null && it.time_seconds > 0
          ? Math.max(90, Math.round(it.time_seconds * scale))
          : it.time_seconds,
    }));
    return { ...b, estimated_minutes, items };
  });
}
