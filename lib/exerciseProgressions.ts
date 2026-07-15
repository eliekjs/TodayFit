import type { BlockType, ExerciseDefinition, WorkoutTierPreference } from "./types";
import { getSubstitutes } from "./generation/exerciseSubstitution";
import type { ExerciseLike } from "./generation/exerciseSubstitution";
import { isCooldownEligibleEquipment, isWarmupEligibleEquipment } from "./workoutRules";
import { isDbConfigured } from "./db";
import { getExercise, getProgressionsRegressions, listExercises } from "./db/exerciseRepository";
import {
  exerciseMatchesWorkoutTier,
  inferCreativeVariationFromSource,
  inferWorkoutLevelsWithExplanation,
  isComplexSkillLiftForNonAdvanced,
  isHardBlockedForBeginnerTier,
  type WorkoutLevelExtendedSource,
} from "./workoutLevel";

export type ProgressionsRegressionsOption = { id: string; name: string };

export type ProgressionsRegressions = {
  progressions: ProgressionsRegressionsOption[];
  regressions: ProgressionsRegressionsOption[];
};

const MIN_SUGGESTIONS = 3;

/** Derive energy_fit from tags array (e.g. from DB tag slugs). */
function energyFitFromTags(tags: string[] | undefined): ("low" | "medium" | "high")[] | undefined {
  if (!tags?.length) return undefined;
  const out: ("low" | "medium" | "high")[] = [];
  if (tags.includes("energy_low")) out.push("low");
  if (tags.includes("energy_medium")) out.push("medium");
  if (tags.includes("energy_high")) out.push("high");
  return out.length ? out : undefined;
}

/** Map ExerciseDefinition to ExerciseLike for getSubstitutes similarity ranking. */
function definitionToExerciseLike(def: ExerciseDefinition): ExerciseLike {
  const tags = Array.isArray(def.tags) ? def.tags : [];
  const energy_fit = energyFitFromTags(tags);
  return {
    id: def.id,
    name: def.name,
    movement_pattern: def.movement_pattern ?? "",
    muscle_groups: def.muscles,
    equipment_required: def.equipment,
    modality: def.modalities?.[0],
    progressions: def.progressions,
    regressions: def.regressions,
    unilateral: def.unilateral,
    swap_candidates: def.swap_candidates,
    primary_movement_family: def.primary_movement_family,
    tags: def.contraindications?.length ? { contraindications: def.contraindications } : undefined,
    energy_fit,
  };
}

/** Warmup/cooldown swap lists are restricted (mobility+activation BW vs stretch-only). Main = normal substitution. */
export type SwapBlockRole = "warmup" | "cooldown" | "main";

export type ProgressionsRegressionsOptions = {
  /** When provided, suggested substitutes are filtered to match this energy (e.g. low → no high-only). */
  energyLevel?: "low" | "medium" | "high";
  /** Block context for swap UI: warmup = bodyweight/band activation only; cooldown = stretching only. */
  swapBlockRole?: SwapBlockRole;
  /**
   * When provided, candidates that carry at least one of these tag or modality slugs sort first
   * (e.g. hypertrophy-aligned swaps for a hypertrophy-labelled exercise).
   */
  preferredGoalTagSlugs?: string[];
  /**
   * Match swap difficulty to the session’s experience tier (defaults to intermediate).
   * Excludes advanced-only / complex skill lifts for non-advanced users, mirroring the generator.
   */
  workoutTier?: WorkoutTierPreference;
  /** When false (default), omit creative/complex-variation swaps (same as generation without creative mode). */
  includeCreativeVariations?: boolean;
  /**
   * When set (from `WorkoutBlock.goal_intent.swap_pool_exercise_ids`), swap suggestions are
   * **restricted** to this pool — the same filtered candidate set the generator used for this slot.
   * Tier and creative-variation filters are still applied within the pool.
   * Falls back to tag-similarity expansion when absent or empty (backward compat).
   */
  swapPoolExerciseIds?: string[];
};

/** Map workout block type to swap filtering (main work blocks use normal substitution rules). */
export function blockTypeToSwapBlockRole(blockType: BlockType | string): SwapBlockRole {
  if (blockType === "warmup") return "warmup";
  if (blockType === "cooldown") return "cooldown";
  return "main";
}

/** Map generator / UI session goal slug to exercise tag slugs used for swap ranking. */
export function generatorGoalToSwapTagSlugs(goal: string | undefined | null): string[] | undefined {
  if (!goal) return undefined;
  const g = goal.toLowerCase().replace(/\s/g, "_");
  const map: Record<string, string[]> = {
    strength: ["strength"],
    hypertrophy: ["hypertrophy"],
    muscle: ["hypertrophy"],
    body_recomp: ["hypertrophy", "strength"],
    conditioning: ["conditioning"],
    endurance: ["endurance", "conditioning"],
    mobility: ["mobility"],
    recovery: ["recovery", "mobility"],
    resilience: ["recovery"],
    power: ["power", "plyometric"],
    athletic_performance: ["athleticism", "strength", "power"],
    calisthenics: ["strength", "hypertrophy"],
    physique: ["hypertrophy", "strength"],
  };
  return map[g] ?? [g];
}

function exerciseDefMatchesGoalTags(def: ExerciseDefinition, slugs: string[]): boolean {
  if (!slugs.length) return false;
  const lower = new Set(tagSlugsLower(def.tags));
  for (const m of def.modalities ?? []) lower.add(m.toLowerCase());
  for (const s of slugs) {
    if (lower.has(s.toLowerCase())) return true;
  }
  return false;
}

function tagSlugsLower(tags: string[] | undefined): string[] {
  return (tags ?? []).map((t) => t.toLowerCase());
}

function definitionToWorkoutLevelExtendedSource(def: ExerciseDefinition): WorkoutLevelExtendedSource {
  return {
    id: def.id,
    name: def.name,
    tags: def.tags ?? [],
    workout_levels: def.workout_levels,
    modality: def.modalities?.[0],
    equipment_required: def.equipment,
  };
}

/** Placeholder / junk rows that must never be offered as swaps (e.g. muscle-only OTA stubs). */
export function isDisallowedSwapPlaceholder(def: ExerciseDefinition): boolean {
  if (def.id === "glutes") return true;
  const n = def.name.trim().toLowerCase();
  if (n === "glutes") return true;
  return false;
}

/**
 * True when this catalog exercise is appropriate for the swap UI given session tier and creative prefs.
 * Aligns with generator gates (tier overlap, complex lifts for non-advanced, creative tag).
 */
export function exerciseDefinitionEligibleForSwap(
  def: ExerciseDefinition,
  opts: { workoutTier: WorkoutTierPreference; includeCreativeVariations: boolean }
): boolean {
  if (isDisallowedSwapPlaceholder(def)) return false;
  const tier = opts.workoutTier;
  if (tier === "beginner") {
    if (
      isHardBlockedForBeginnerTier({
        workout_level_tags: def.workout_levels,
        difficulty: undefined,
      })
    ) {
      return false;
    }
  }
  if (tier !== "advanced") {
    if (
      isComplexSkillLiftForNonAdvanced({
        id: def.id,
        name: def.name,
        tags: def.tags,
        modality: def.modalities?.[0],
      })
    ) {
      return false;
    }
  }
  if (!opts.includeCreativeVariations) {
    if (
      inferCreativeVariationFromSource({
        id: def.id,
        name: def.name,
        tags: def.tags ?? [],
        workout_levels: def.workout_levels,
      })
    ) {
      return false;
    }
  }
  const inferred = inferWorkoutLevelsWithExplanation(definitionToWorkoutLevelExtendedSource(def));
  return exerciseMatchesWorkoutTier(inferred.levels, tier);
}

function resolvedSwapSessionPrefs(opts: ProgressionsRegressionsOptions | undefined): {
  workoutTier: WorkoutTierPreference;
  includeCreativeVariations: boolean;
} {
  return {
    workoutTier: opts?.workoutTier ?? "intermediate",
    includeCreativeVariations: opts?.includeCreativeVariations === true,
  };
}

function filterSwapOptionRows(
  opts: ProgressionsRegressionsOptions | undefined,
  rows: ProgressionsRegressionsOption[],
  byId: Map<string, ExerciseDefinition>
): ProgressionsRegressionsOption[] {
  const { workoutTier, includeCreativeVariations } = resolvedSwapSessionPrefs(opts);
  return rows.filter((o) => {
    const def = byId.get(o.id);
    if (!def) return false;
    return exerciseDefinitionEligibleForSwap(def, { workoutTier, includeCreativeVariations });
  });
}

function filterExerciseDefsForSwap(
  opts: ProgressionsRegressionsOptions | undefined,
  defs: ExerciseDefinition[]
): ExerciseDefinition[] {
  const { workoutTier, includeCreativeVariations } = resolvedSwapSessionPrefs(opts);
  return defs.filter((d) =>
    exerciseDefinitionEligibleForSwap(d, { workoutTier, includeCreativeVariations })
  );
}

async function applyTierFilterToCombined(
  exerciseId: string,
  options: ProgressionsRegressionsOptions | undefined,
  combined: ProgressionsRegressionsOption[]
): Promise<ProgressionsRegressionsOption[]> {
  if (!isDbConfigured() || combined.length === 0) return combined;
  try {
    const [targetDef, poolDefs] = await Promise.all([getExercise(exerciseId), listExercises()]);
    if (!targetDef || !poolDefs?.length) return combined;
    const byId = buildSlugToDefMap(poolDefs, targetDef);
    return filterSwapOptionRows(options, combined, byId);
  } catch {
    return combined;
  }
}

/**
 * Warmup swaps: mobility / activation — same equipment policy as generated activation (bodyweight + bands only).
 */
export function exerciseMatchesWarmupSwapRules(def: ExerciseDefinition): boolean {
  if (!isWarmupEligibleEquipment(def.equipment ?? [])) return false;
  if (def.modalities?.includes("conditioning")) return false;
  const tags = tagSlugsLower(def.tags);
  const hasMobilityMod = def.modalities?.includes("mobility");
  const hasPrepOrWarmupRole = tags.some((t) =>
    ["role_prep", "role_warmup", "role_mobility"].includes(t)
  );
  return hasMobilityMod || hasPrepOrWarmupRole;
}

/**
 * Cooldown swaps: stretching-focused only (stretch tags / stretch role), eligible cooldown equipment.
 */
export function exerciseMatchesCooldownStretchSwapRules(def: ExerciseDefinition): boolean {
  if (!isCooldownEligibleEquipment(def.equipment)) return false;
  const tags = tagSlugsLower(def.tags);
  if (tags.some((t) => t === "role_stretch")) return true;
  if (tags.some((t) => t.startsWith("stretch_"))) return true;
  const n = def.name.toLowerCase();
  if (n.includes("stretch")) return true;
  return false;
}

export function exerciseMatchesSwapBlockRole(
  def: ExerciseDefinition,
  role: SwapBlockRole | undefined
): boolean {
  if (role == null || role === "main") return true;
  if (role === "warmup") return exerciseMatchesWarmupSwapRules(def);
  if (role === "cooldown") return exerciseMatchesCooldownStretchSwapRules(def);
  return true;
}

function buildSlugToDefMap(pool: ExerciseDefinition[], target: ExerciseDefinition | null): Map<string, ExerciseDefinition> {
  const m = new Map<string, ExerciseDefinition>();
  for (const d of pool) m.set(d.id, d);
  if (target) m.set(target.id, target);
  return m;
}

const SWAP_PAGE_SIZE = 3;
/** Pad candidate list so users can cycle through several sets of 3 without repeats until the pool wraps. */
const MIN_EXPANDED_CANDIDATES = 12;

function dedupeById(items: ProgressionsRegressionsOption[]): ProgressionsRegressionsOption[] {
  const seen = new Set<string>();
  const out: ProgressionsRegressionsOption[] = [];
  for (const x of items) {
    if (seen.has(x.id)) continue;
    seen.add(x.id);
    out.push(x);
  }
  return out;
}

/**
 * Build a longer ordered list of swap candidates (progressions + regressions + similar substitutes)
 * so we can paginate in pages of 3.
 */
async function expandSwapCandidatesList(
  exerciseId: string,
  options: ProgressionsRegressionsOptions | undefined,
  seed: ProgressionsRegressions
): Promise<ProgressionsRegressionsOption[]> {
  let combined = dedupeById([...seed.regressions, ...seed.progressions]);
  const role = options?.swapBlockRole;
  if (isDbConfigured() && role != null && role !== "main") {
    try {
      const [targetDef, poolDefs] = await Promise.all([getExercise(exerciseId), listExercises()]);
      if (targetDef && poolDefs?.length) {
        const byId = buildSlugToDefMap(poolDefs, targetDef);
        combined = combined.filter((o) => {
          const def = byId.get(o.id);
          return def != null && exerciseMatchesSwapBlockRole(def, role);
        });
      }
    } catch {
      /* keep combined */
    }
  }
  if (!isDbConfigured() || combined.length >= MIN_EXPANDED_CANDIDATES) {
    return combined;
  }
  try {
    const [targetDef, poolDefs] = await Promise.all([
      getExercise(exerciseId),
      listExercises(),
    ]);
    if (!targetDef || !poolDefs?.length) return combined;
    const target = definitionToExerciseLike(targetDef);
    let poolForSubs = poolDefs;
    if (role != null && role !== "main") {
      poolForSubs = poolDefs.filter((d) => exerciseMatchesSwapBlockRole(d, role));
    }
    poolForSubs = filterExerciseDefsForSwap(options, poolForSubs);
    const pool = poolForSubs.map(definitionToExerciseLike);
    const existingIds = new Set<string>([exerciseId, ...combined.map((x) => x.id)]);
    const substitutes = getSubstitutes(target, pool, {
      maxResults: 40,
      excludeIds: existingIds,
      energyLevel: options?.energyLevel,
      allowSameCluster: true,
    });
    for (const s of substitutes) {
      if (existingIds.has(s.exercise.id)) continue;
      existingIds.add(s.exercise.id);
      combined.push({ id: s.exercise.id, name: s.exercise.name });
      if (combined.length >= MIN_EXPANDED_CANDIDATES) break;
    }
  } catch {
    /* keep combined */
  }
  return combined;
}

/**
 * When the generator recorded the slot-specific candidate pool, build the swap list from
 * those IDs so swaps respect the same tier/equipment/injury/goal constraints as generation.
 * Candidates are ranked by similarity to the exercise being swapped (curated swap_candidates,
 * progressions/regressions, movement pattern/family, muscles, equipment). Unscored pool
 * members append after ranked ones so pagination can still cycle the full pool.
 * Returns an empty array when the DB is not configured or no pool IDs resolve to known exercises.
 */
async function buildSwapCandidatesFromPool(
  exerciseId: string,
  options: ProgressionsRegressionsOptions
): Promise<ProgressionsRegressionsOption[]> {
  const poolIds = options.swapPoolExerciseIds!;
  const poolSet = new Set(poolIds);
  poolSet.delete(exerciseId);
  if (poolSet.size === 0 || !isDbConfigured()) return [];
  try {
    const [targetDef, poolDefs] = await Promise.all([getExercise(exerciseId), listExercises()]);
    if (!targetDef) return [];

    const byId = buildSlugToDefMap(poolDefs, targetDef);
    const poolDefsInSet: ExerciseDefinition[] = [];
    for (const id of poolSet) {
      const def = byId.get(id);
      if (def) poolDefsInSet.push(def);
    }
    if (poolDefsInSet.length === 0) return [];

    const target = definitionToExerciseLike(targetDef);
    const ranked = getSubstitutes(target, poolDefsInSet.map(definitionToExerciseLike), {
      maxResults: poolDefsInSet.length,
      excludeIds: new Set([exerciseId]),
      energyLevel: options.energyLevel,
      allowSameCluster: true,
    });

    const candidates: ProgressionsRegressionsOption[] = [];
    const seen = new Set<string>([exerciseId]);
    for (const s of ranked) {
      if (seen.has(s.exercise.id)) continue;
      candidates.push({ id: s.exercise.id, name: s.exercise.name });
      seen.add(s.exercise.id);
    }
    // Keep remaining eligible pool members (no similarity reason) so "Show different" can cycle them.
    for (const def of poolDefsInSet) {
      if (seen.has(def.id)) continue;
      candidates.push({ id: def.id, name: def.name });
      seen.add(def.id);
    }
    return candidates;
  } catch {
    return [];
  }
}

/**
 * Returns one page (up to 3) of swap suggestions for the exercise swap modal.
 * Increment `page` and call again to show the next 3 candidates; wraps with modulo when `page >= numPages`.
 *
 * When `options.swapPoolExerciseIds` is provided (populated by the generator from the slot's
 * filtered candidate pool), candidates are **restricted** to that set so swaps honor the same
 * tier/equipment/injury/goal constraints that were applied during workout generation.
 * Falls back to tag-similarity expansion when no pool is recorded (older workouts, warmup/cooldown).
 */
export async function getSwapSuggestionsPage(
  exerciseId: string,
  options: ProgressionsRegressionsOptions | undefined,
  page: number
): Promise<{ suggestions: ProgressionsRegressionsOption[]; numPages: number }> {
  let expanded: ProgressionsRegressionsOption[];

  if (options?.swapPoolExerciseIds?.length) {
    // Use the generation-time slot pool directly.
    expanded = await buildSwapCandidatesFromPool(exerciseId, options);
    if (expanded.length === 0) {
      // Pool IDs couldn't be resolved (DB not configured or empty intersection) — fall back to
      // tag-similarity so the swap modal still shows options on older workouts.
      const res = await getProgressionsRegressionsForExercise(exerciseId, options);
      expanded = await expandSwapCandidatesList(exerciseId, options, res);
    }
  } else {
    const res = await getProgressionsRegressionsForExercise(exerciseId, options);
    expanded = await expandSwapCandidatesList(exerciseId, options, res);
  }

  if (options?.preferredGoalTagSlugs?.length && isDbConfigured()) {
    try {
      const poolDefs = await listExercises();
      const byId = new Map(poolDefs.map((d) => [d.id, d]));
      const want = options.preferredGoalTagSlugs.map((s) => s.toLowerCase());
      const scored = expanded.map((o) => {
        const d = byId.get(o.id);
        return { o, match: d != null && exerciseDefMatchesGoalTags(d, want) };
      });
      scored.sort((a, b) => (a.match === b.match ? 0 : a.match ? -1 : 1));
      expanded = scored.map((x) => x.o);
    } catch {
      /* keep order */
    }
  }

  expanded = await applyTierFilterToCombined(exerciseId, options, expanded);

  const numPages = Math.max(1, Math.ceil(expanded.length / SWAP_PAGE_SIZE));
  const safePage = ((page % numPages) + numPages) % numPages;
  const start = safePage * SWAP_PAGE_SIZE;
  return {
    suggestions: expanded.slice(start, start + SWAP_PAGE_SIZE),
    numPages,
  };
}

/** When DB is configured, pad result with similar exercises from the pool so we return at least MIN_SUGGESTIONS. */
async function fillToAtLeastThree(
  result: ProgressionsRegressions,
  exerciseId: string,
  options?: ProgressionsRegressionsOptions
): Promise<ProgressionsRegressions> {
  const role = options?.swapBlockRole;
  let regressions = result.regressions;
  let progressions = result.progressions;
  if (isDbConfigured()) {
    try {
      const [targetDef, poolDefs] = await Promise.all([getExercise(exerciseId), listExercises()]);
      if (targetDef && poolDefs?.length) {
        const byId = buildSlugToDefMap(poolDefs, targetDef);
        if (role != null && role !== "main") {
          regressions = regressions.filter((o) => {
            const def = byId.get(o.id);
            return def != null && exerciseMatchesSwapBlockRole(def, role);
          });
          progressions = progressions.filter((o) => {
            const def = byId.get(o.id);
            return def != null && exerciseMatchesSwapBlockRole(def, role);
          });
        }
        regressions = filterSwapOptionRows(options, regressions, byId);
        progressions = filterSwapOptionRows(options, progressions, byId);
      }
    } catch {
      /* keep */
    }
  }
  const combined = [...regressions, ...progressions];
  if (combined.length >= MIN_SUGGESTIONS) {
    return { progressions, regressions };
  }
  try {
    const [targetDef, poolDefs] = await Promise.all([
      getExercise(exerciseId),
      listExercises(),
    ]);
    if (!targetDef || !poolDefs?.length) return { progressions, regressions };
    const existingIds = new Set(combined.map((x) => x.id));
    const target = definitionToExerciseLike(targetDef);
    let poolForSubs = poolDefs;
    if (role != null && role !== "main") {
      poolForSubs = poolDefs.filter((d) => exerciseMatchesSwapBlockRole(d, role));
    }
    poolForSubs = filterExerciseDefsForSwap(options, poolForSubs);
    const pool = poolForSubs.map(definitionToExerciseLike);
    const substitutes = getSubstitutes(target, pool, {
      maxResults: MIN_SUGGESTIONS,
      excludeIds: existingIds,
      energyLevel: options?.energyLevel,
      allowSameCluster: true,
    });
    const need = MIN_SUGGESTIONS - combined.length;
    const extra = substitutes
      .slice(0, need)
      .map((s) => ({ id: s.exercise.id, name: s.exercise.name }));
    return {
      progressions,
      regressions: [...regressions, ...extra],
    };
  } catch {
    return { progressions, regressions };
  }
}

/**
 * Get progressions (harder) and regressions (easier) for an exercise.
 * Uses the database (single source of truth). When Supabase is not configured, returns empty.
 * When DB has no progressions/regressions for the exercise, suggests similar exercises from the catalog.
 * Optional energyLevel filters suggested substitutes to match session energy (e.g. low → no high-only).
 */
export async function getProgressionsRegressionsForExercise(
  exerciseId: string,
  options?: ProgressionsRegressionsOptions
): Promise<ProgressionsRegressions> {
  const dbConfigured = isDbConfigured();
  if (dbConfigured) {
    try {
      const res = await getProgressionsRegressions(exerciseId);
      const dbEmpty = res.progressions.length === 0 && res.regressions.length === 0;
      if (dbEmpty) {
        // No progressions/regressions in DB: suggest similar exercises from catalog (single source = DB).
        try {
          const [targetDef, poolDefs] = await Promise.all([
            getExercise(exerciseId),
            listExercises(),
          ]);
          if (!targetDef || !poolDefs?.length) return { progressions: [], regressions: [] };
          const target = definitionToExerciseLike(targetDef);
          let poolForSubs = poolDefs;
          if (options?.swapBlockRole && options.swapBlockRole !== "main") {
            poolForSubs = poolDefs.filter((d) => exerciseMatchesSwapBlockRole(d, options.swapBlockRole));
          }
          poolForSubs = filterExerciseDefsForSwap(options, poolForSubs);
          const pool = poolForSubs.map(definitionToExerciseLike);
          const substitutes = getSubstitutes(target, pool, {
            maxResults: 5,
            energyLevel: options?.energyLevel,
            allowSameCluster: true,
          });
          const similar = substitutes.map((s) => ({ id: s.exercise.id, name: s.exercise.name }));
          return fillToAtLeastThree({ progressions: [], regressions: similar }, exerciseId, options);
        } catch {
          return { progressions: [], regressions: [] };
        }
      }
      return fillToAtLeastThree(res, exerciseId, options);
    } catch {
      return { progressions: [], regressions: [] };
    }
  }
  // Single source = DB; when Supabase is not configured, no progressions/regressions.
  return { progressions: [], regressions: [] };
}
