import { getSupabase } from "./client";
import type { ExerciseDefinition } from "../types";
import type { Exercise } from "../../logic/workoutGeneration/types";
import type { ExerciseRowWithOntology } from "./generatorExerciseAdapter";
import { mapDbExerciseToGeneratorExercise } from "./generatorExerciseAdapter";

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

  const [tagsRes, contraRes, progRes] = await Promise.all([
    supabase.from("exercise_tag_map").select("exercise_id, tag_id").in("exercise_id", exerciseIds),
    supabase.from("exercise_contraindications").select("exercise_id, contraindication").in("exercise_id", exerciseIds),
    supabase.from("exercise_progressions").select("exercise_id, related_exercise_id, relationship").in("exercise_id", exerciseIds),
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

  const relatedIds = [...new Set((progRes.data ?? []).map((r: { related_exercise_id: string }) => r.related_exercise_id))];
  const relatedSlugById = new Map<string, string>();
  if (relatedIds.length > 0) {
    const { data: relatedRows } = await supabase.from("exercises").select("id, slug").in("id", relatedIds);
    for (const e of relatedRows ?? []) {
      relatedSlugById.set((e as { id: string }).id, (e as { slug: string }).slug);
    }
  }
  const progressionsByExerciseId = new Map<string, string[]>();
  const regressionsByExerciseId = new Map<string, string[]>();
  for (const r of progRes.data ?? []) {
    const eid = (r as { exercise_id: string }).exercise_id;
    const slug = relatedSlugById.get((r as { related_exercise_id: string }).related_exercise_id);
    if (!slug) continue;
    if ((r as { relationship: string }).relationship === "progression") {
      const list = progressionsByExerciseId.get(eid) ?? [];
      list.push(slug);
      progressionsByExerciseId.set(eid, list);
    } else {
      const list = regressionsByExerciseId.get(eid) ?? [];
      list.push(slug);
      regressionsByExerciseId.set(eid, list);
    }
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
      progressions: progressionsByExerciseId.get(row.id) ?? [],
      regressions: regressionsByExerciseId.get(row.id) ?? [],
    });
  }
  return result;
}

/** Result shape for progression/regression lookup (id = slug for consistency with app). */
export type ProgressionsRegressionsResult = {
  progressions: { id: string; name: string }[];
  regressions: { id: string; name: string }[];
};

/**
 * Get progressions (harder) and regressions (easier) for an exercise by id (uuid) or slug.
 * Returns empty arrays if exercise not found or has none.
 */
export async function getProgressionsRegressions(
  idOrSlug: string
): Promise<ProgressionsRegressionsResult> {
  const supabase = requireClient();
  const isUuid = /^[0-9a-f-]{36}$/i.test(idOrSlug);
  const exerciseQuery = isUuid
    ? supabase.from("exercises").select("id").eq("id", idOrSlug)
    : supabase.from("exercises").select("id").eq("slug", idOrSlug);
  const { data: exerciseRow, error: exError } = await exerciseQuery.single();
  if (exError || !exerciseRow) {
    return { progressions: [], regressions: [] };
  }
  const exerciseId = exerciseRow.id;

  const { data: rows, error } = await supabase
    .from("exercise_progressions")
    .select("relationship, related_exercise_id")
    .eq("exercise_id", exerciseId);

  if (error || !rows?.length) {
    return { progressions: [], regressions: [] };
  }

  const relatedIds = [...new Set((rows as { related_exercise_id: string }[]).map((r) => r.related_exercise_id))];
  const { data: exerciseRows, error: exError2 } = await supabase
    .from("exercises")
    .select("id, slug, name")
    .in("id", relatedIds);
  if (exError2 || !exerciseRows?.length) {
    return { progressions: [], regressions: [] };
  }
  const byId = new Map(
    (exerciseRows as { id: string; slug: string; name: string }[]).map((e) => [e.id, { id: e.slug, name: e.name }])
  );

  const progressions: { id: string; name: string }[] = [];
  const regressions: { id: string; name: string }[] = [];
  for (const r of rows as { relationship: string; related_exercise_id: string }[]) {
    const item = byId.get(r.related_exercise_id);
    if (!item) continue;
    if (r.relationship === "progression") {
      progressions.push(item);
    } else {
      regressions.push(item);
    }
  }
  return { progressions, regressions };
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

  const { progressions: progList, regressions: regList } = await getProgressionsRegressions(row.id);

  return {
    id: row.slug,
    name: row.name,
    muscles: row.primary_muscles as ExerciseDefinition["muscles"],
    modalities: row.modalities as ExerciseDefinition["modalities"],
    equipment: row.equipment as ExerciseDefinition["equipment"],
    tags: tagSlugs,
    contraindications: contra as ExerciseDefinition["contraindications"],
    progressions: progList.map((p) => p.id),
    regressions: regList.map((r) => r.id),
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

/** Select list including structured ontology columns for generator adapter. */
const EXERCISE_SELECT_WITH_ONTOLOGY =
  "id, slug, name, primary_muscles, secondary_muscles, equipment, modalities, movement_pattern, is_active, primary_movement_family, secondary_movement_families, movement_patterns, joint_stress_tags, contraindication_tags, exercise_role, pairing_category, fatigue_regions, mobility_targets, stretch_targets, unilateral";

/**
 * List exercises in generator Exercise format with ontology fields when present.
 * Uses structured DB columns (primary_movement_family, joint_stress_tags, etc.) and
 * populates legacy movement_pattern and tags.joint_stress/contraindications for compat.
 */
export async function listExercisesForGenerator(
  filters?: ExerciseFilters
): Promise<Exercise[]> {
  const supabase = requireClient();
  let query = supabase
    .from("exercises")
    .select(EXERCISE_SELECT_WITH_ONTOLOGY)
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

  const [tagsRes, contraRes, progRes] = await Promise.all([
    supabase.from("exercise_tag_map").select("exercise_id, tag_id").in("exercise_id", exerciseIds),
    supabase.from("exercise_contraindications").select("exercise_id, contraindication").in("exercise_id", exerciseIds),
    supabase.from("exercise_progressions").select("exercise_id, related_exercise_id, relationship").in("exercise_id", exerciseIds),
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

  const relatedIds = [...new Set((progRes.data ?? []).map((r: { related_exercise_id: string }) => r.related_exercise_id))];
  const relatedSlugById = new Map<string, string>();
  if (relatedIds.length > 0) {
    const { data: relatedRows } = await supabase.from("exercises").select("id, slug").in("id", relatedIds);
    for (const e of relatedRows ?? []) {
      relatedSlugById.set((e as { id: string }).id, (e as { slug: string }).slug);
    }
  }
  const progressionsByExerciseId = new Map<string, string[]>();
  const regressionsByExerciseId = new Map<string, string[]>();
  for (const r of progRes.data ?? []) {
    const eid = (r as { exercise_id: string }).exercise_id;
    const slug = relatedSlugById.get((r as { related_exercise_id: string }).related_exercise_id);
    if (!slug) continue;
    if ((r as { relationship: string }).relationship === "progression") {
      const list = progressionsByExerciseId.get(eid) ?? [];
      list.push(slug);
      progressionsByExerciseId.set(eid, list);
    } else {
      const list = regressionsByExerciseId.get(eid) ?? [];
      list.push(slug);
      regressionsByExerciseId.set(eid, list);
    }
  }

  const result: Exercise[] = [];
  for (const row of rows as ExerciseRowWithOntology[]) {
    if (filters?.injuries?.length) {
      const contra = contraByExerciseId.get(row.id) ?? [];
      const fromOntology = (row.contraindication_tags ?? []).map((c) => c.toLowerCase().replace(/\s/g, "_"));
      const allContra = [...contra, ...fromOntology];
      if (allContra.some((c) => filters.injuries!.some((i) => i.toLowerCase().replace(/\s/g, "_") === c))) continue;
    }
    if (filters?.tagSlugs?.length) {
      const exTags = tagsByExerciseId.get(row.id) ?? [];
      if (!filters.tagSlugs.some((t) => exTags.includes(t))) continue;
    }
    result.push(
      mapDbExerciseToGeneratorExercise(
        row,
        tagsByExerciseId.get(row.id) ?? [],
        contraByExerciseId.get(row.id) ?? [],
        progressionsByExerciseId.get(row.id) ?? [],
        regressionsByExerciseId.get(row.id) ?? []
      )
    );
  }
  return result;
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
