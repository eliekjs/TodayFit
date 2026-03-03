import { getSupabase } from "./client";
import type { ExerciseDefinition } from "../types";

function requireClient() {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error("Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.");
  }
  return supabase;
}

export type ExerciseFilters = {
  equipment?: string[];
  injuries?: string[]; // joint slugs to exclude (e.g. knee, shoulder)
  primaryMuscles?: string[];
  tagSlugs?: string[];
};

/** Params for tag-based ranked exercise search. Energy is soft (scoring only) unless energyIsHardFilter is true. */
export type ExerciseByTagsRankedParams = {
  selectedTagSlugs?: string[];
  excludedTagSlugs?: string[];
  userEnergy?: "low" | "medium" | "high";
  energyIsHardFilter?: boolean;
  limit?: number;
  offset?: number;
};

/** Exercise row returned by get_exercises_by_tags_ranked RPC. */
export type ExerciseRankedRow = {
  id: string;
  slug: string;
  name: string;
  primary_muscles: string[];
  secondary_muscles: string[];
  equipment: string[];
  modalities: string[];
  movement_pattern: string | null;
  match_score: number;
  matched_tag_count: number;
};

/** ExerciseDefinition plus ranking metadata from tag search. */
export type ExerciseRankedResult = ExerciseDefinition & {
  match_score: number;
  matched_tag_count: number;
  movement_pattern?: string | null;
};

/**
 * List exercises with optional filters. Returns ExerciseDefinition-compatible shape.
 */
export async function listExercises(filters?: ExerciseFilters): Promise<ExerciseDefinition[]> {
  const supabase = requireClient();
  let query = supabase
    .from("exercises")
    .select("id, slug, name, primary_muscles, secondary_muscles, equipment, modalities, is_active")
    .eq("is_active", true);

  if (filters?.equipment?.length) {
    query = query.overlaps("equipment", filters.equipment);
  }
  if (filters?.primaryMuscles?.length) {
    query = query.overlaps("primary_muscles", filters.primaryMuscles);
  }

  const { data: rows, error } = await query;
  if (error) throw new Error(error.message);
  if (!rows?.length) return [];

  const exerciseIds = rows.map((r: { id: string }) => r.id);

  const [tagsRes, contraRes] = await Promise.all([
    supabase.from("exercise_tag_map").select("exercise_id, tag_id").in("exercise_id", exerciseIds),
    supabase.from("exercise_contraindications").select("exercise_id, contraindication").in("exercise_id", exerciseIds),
  ]);

  const tagIds = [...new Set((tagsRes.data ?? []).map((r: { tag_id: string }) => r.tag_id))];
  const tagRows = tagIds.length
    ? await supabase.from("exercise_tags").select("id, slug, name").in("id", tagIds)
    : { data: [] };
  const tagById = new Map((tagRows.data ?? []).map((t: { id: string; slug: string; name: string }) => [t.id, t]));

  const tagsByExerciseId = new Map<string, string[]>();
  for (const r of tagsRes.data ?? []) {
    const t = tagById.get((r as { tag_id: string }).tag_id);
    if (t) {
      const list = tagsByExerciseId.get((r as { exercise_id: string }).exercise_id) ?? [];
      list.push(t.slug);
      tagsByExerciseId.set((r as { exercise_id: string }).exercise_id, list);
    }
  }

  const contraByExerciseId = new Map<string, string[]>();
  for (const r of contraRes.data ?? []) {
    const eid = (r as { exercise_id: string }).exercise_id;
    const c = (r as { contraindication: string }).contraindication;
    const list = contraByExerciseId.get(eid) ?? [];
    list.push(c);
    contraByExerciseId.set(eid, list);
  }

  const result: ExerciseDefinition[] = [];
  for (const row of rows as Array<{
    id: string;
    slug: string;
    name: string;
    primary_muscles: string[];
    secondary_muscles: string[];
    equipment: string[];
    modalities: string[];
  }>) {
    if (filters?.injuries?.length) {
      const contra = contraByExerciseId.get(row.id) ?? [];
      if (contra.some((c) => filters.injuries!.includes(c))) continue;
    }
    if (filters?.tagSlugs?.length) {
      const exTags = tagsByExerciseId.get(row.id) ?? [];
      if (!filters.tagSlugs.some((t) => exTags.includes(t))) continue;
    }
    result.push({
      id: row.slug,
      name: row.name,
      muscles: row.primary_muscles as ExerciseDefinition["muscles"],
      modalities: row.modalities as ExerciseDefinition["modalities"],
      equipment: row.equipment as ExerciseDefinition["equipment"],
      tags: tagsByExerciseId.get(row.id) ?? [],
      contraindications: (contraByExerciseId.get(row.id) ?? []) as ExerciseDefinition["contraindications"],
    });
  }
  return result;
}

/**
 * Get a single exercise by id (uuid) or slug. Returns null if not found.
 */
export async function getExercise(idOrSlug: string): Promise<ExerciseDefinition | null> {
  const supabase = requireClient();
  const isUuid = /^[0-9a-f-]{36}$/i.test(idOrSlug);
  const query = isUuid
    ? supabase.from("exercises").select("*").eq("id", idOrSlug)
    : supabase.from("exercises").select("*").eq("slug", idOrSlug);
  const { data: row, error } = await query.single();
  if (error || !row) return null;

  const [tagsRes, contraRes] = await Promise.all([
    supabase.from("exercise_tag_map").select("tag_id").eq("exercise_id", row.id),
    supabase.from("exercise_contraindications").select("contraindication").eq("exercise_id", row.id),
  ]);
  const tagIds = (tagsRes.data ?? []).map((r: { tag_id: string }) => r.tag_id);
  const tagSlugs = tagIds.length
    ? (await supabase.from("exercise_tags").select("slug").in("id", tagIds)).data?.map((t: { slug: string }) => t.slug) ?? []
    : [];
  const contra = (contraRes.data ?? []).map((r: { contraindication: string }) => r.contraindication);

  return {
    id: row.slug,
    name: row.name,
    muscles: row.primary_muscles as ExerciseDefinition["muscles"],
    modalities: row.modalities as ExerciseDefinition["modalities"],
    equipment: row.equipment as ExerciseDefinition["equipment"],
    tags: tagSlugs,
    contraindications: contra as ExerciseDefinition["contraindications"],
  };
}

/**
 * List all exercise tags (for filtering/display). Includes optional weight for ranking.
 */
export async function listTags(): Promise<{
  slug: string;
  name: string;
  tag_group: string;
  weight?: number;
}[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from("exercise_tags")
    .select("slug, name, tag_group, weight")
    .order("tag_group")
    .order("slug");
  if (error) throw new Error(error.message);
  return (data ?? []) as { slug: string; name: string; tag_group: string; weight?: number }[];
}

/**
 * List exercises that have at least one of the given tag slugs.
 */
export async function listExercisesByTags(tagSlugs: string[]): Promise<ExerciseDefinition[]> {
  return listExercises({ tagSlugs });
}

/**
 * Tag-based ranked exercise search (RPC get_exercises_by_tags_ranked).
 * - More selected-tag matches = higher rank; tag weights apply when set.
 * - Energy is a soft preference by default (scores compatible intensity higher); set energyIsHardFilter
 *   to true to exclude exercises that don't match userEnergy.
 * Returns exercises with match_score and matched_tag_count; for full tags/contraindications use getExercise(slug).
 *
 * @example
 * // From Build flow: user selected squat + strength + legs, medium energy, no strict filter
 * const results = await getExercisesByTagsRanked({
 *   selectedTagSlugs: ['squat', 'strength', 'legs'],
 *   excludedTagSlugs: ['contra_knee'],
 *   userEnergy: 'medium',
 *   energyIsHardFilter: false,
 *   limit: 30,
 *   offset: 0,
 * });
 */
export async function getExercisesByTagsRanked(
  params: ExerciseByTagsRankedParams
): Promise<ExerciseRankedResult[]> {
  const supabase = requireClient();
  const {
    selectedTagSlugs = [],
    excludedTagSlugs = [],
    userEnergy = null,
    energyIsHardFilter = false,
    limit = 50,
    offset = 0,
  } = params;

  const { data: rows, error } = await supabase.rpc("get_exercises_by_tags_ranked", {
    selected_tag_slugs: selectedTagSlugs,
    excluded_tag_slugs: excludedTagSlugs,
    user_energy: userEnergy ?? null,
    energy_is_hard_filter: energyIsHardFilter,
    result_limit: limit,
    result_offset: offset,
  });

  if (error) throw new Error(error.message);
  const list = (rows ?? []) as ExerciseRankedRow[];

  return list.map((row) => ({
    id: row.slug,
    name: row.name,
    muscles: row.primary_muscles as ExerciseDefinition["muscles"],
    modalities: row.modalities as ExerciseDefinition["modalities"],
    equipment: row.equipment as ExerciseDefinition["equipment"],
    tags: [], // RPC does not return tag list; use getExercise(slug) for full details
    contraindications: undefined,
    match_score: row.match_score,
    matched_tag_count: row.matched_tag_count,
    movement_pattern: row.movement_pattern ?? undefined,
  }));
}
