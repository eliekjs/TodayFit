import type { BlockType, ExerciseDefinition } from "./types";
import { getSubstitutes } from "./generation/exerciseSubstitution";
import type { ExerciseLike } from "./generation/exerciseSubstitution";
import { isCooldownEligibleEquipment, isWarmupEligibleEquipment } from "./workoutRules";
import { isDbConfigured } from "./db";
import { getExercise, getProgressionsRegressions, listExercises } from "./db/exerciseRepository";

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

/** Map ExerciseDefinition to ExerciseLike for getSubstitutes (movement_pattern not on def, use empty). */
function definitionToExerciseLike(def: ExerciseDefinition): ExerciseLike {
  const tags = Array.isArray(def.tags) ? def.tags : [];
  const energy_fit = energyFitFromTags(tags);
  return {
    id: def.id,
    name: def.name,
    movement_pattern: "",
    muscle_groups: def.muscles,
    equipment_required: def.equipment,
    modality: def.modalities?.[0],
    progressions: def.progressions,
    regressions: def.regressions,
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
};

/** Map workout block type to swap filtering (main work blocks use normal substitution rules). */
export function blockTypeToSwapBlockRole(blockType: BlockType | string): SwapBlockRole {
  if (blockType === "warmup") return "warmup";
  if (blockType === "cooldown") return "cooldown";
  return "main";
}

function tagSlugsLower(tags: string[] | undefined): string[] {
  return (tags ?? []).map((t) => t.toLowerCase());
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
  if (!isDbConfigured() || combined.length >= MIN_EXPANDED_CANDIDATES) return combined;
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
    const pool = poolForSubs.map(definitionToExerciseLike);
    const existingIds = new Set<string>([exerciseId, ...combined.map((x) => x.id)]);
    const substitutes = getSubstitutes(target, pool, {
      maxResults: 40,
      excludeIds: existingIds,
      energyLevel: options?.energyLevel,
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
 * Returns one page (up to 3) of swap suggestions for the exercise swap modal.
 * Increment `page` and call again to show the next 3 candidates; wraps with modulo when `page >= numPages`.
 */
export async function getSwapSuggestionsPage(
  exerciseId: string,
  options: ProgressionsRegressionsOptions | undefined,
  page: number
): Promise<{ suggestions: ProgressionsRegressionsOption[]; numPages: number }> {
  const res = await getProgressionsRegressionsForExercise(exerciseId, options);
  const expanded = await expandSwapCandidatesList(exerciseId, options, res);
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
  if (isDbConfigured() && role != null && role !== "main") {
    try {
      const [targetDef, poolDefs] = await Promise.all([getExercise(exerciseId), listExercises()]);
      if (targetDef && poolDefs?.length) {
        const byId = buildSlugToDefMap(poolDefs, targetDef);
        regressions = regressions.filter((o) => {
          const def = byId.get(o.id);
          return def != null && exerciseMatchesSwapBlockRole(def, role);
        });
        progressions = progressions.filter((o) => {
          const def = byId.get(o.id);
          return def != null && exerciseMatchesSwapBlockRole(def, role);
        });
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
    const pool = poolForSubs.map(definitionToExerciseLike);
    const substitutes = getSubstitutes(target, pool, {
      maxResults: MIN_SUGGESTIONS,
      excludeIds: existingIds,
      energyLevel: options?.energyLevel,
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
          const pool = poolForSubs.map(definitionToExerciseLike);
          const substitutes = getSubstitutes(target, pool, { maxResults: 5, energyLevel: options?.energyLevel });
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
