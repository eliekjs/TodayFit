import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "./client";
import type { ExerciseDefinition } from "../types";
import type { Exercise } from "../../logic/workoutGeneration/types";
import type { ExerciseRowWithOntology } from "./generatorExerciseAdapter";
import { mapDbExerciseToGeneratorExercise } from "./generatorExerciseAdapter";
import { isBlockedExercise } from "../workoutRules";

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
    .select("id, slug, name, primary_muscles, secondary_muscles, equipment, modalities, is_active, aliases")
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
    aliases?: string[] | null;
  }>) {
    if (filters?.injuries?.length) {
      const contra = contraByExerciseId.get(row.id) ?? [];
      if (contra.some((c) => filters.injuries!.includes(c))) continue;
    }
    if (filters?.tagSlugs?.length) {
      const exTags = tagsByExerciseId.get(row.id) ?? [];
      if (!filters.tagSlugs.some((t) => exTags.includes(t))) continue;
    }
    const def: ExerciseDefinition = {
      id: row.slug,
      name: row.name,
      muscles: row.primary_muscles as ExerciseDefinition["muscles"],
      modalities: row.modalities as ExerciseDefinition["modalities"],
      equipment: row.equipment as ExerciseDefinition["equipment"],
      tags: tagsByExerciseId.get(row.id) ?? [],
      contraindications: (contraByExerciseId.get(row.id) ?? []) as ExerciseDefinition["contraindications"],
      progressions: progressionsByExerciseId.get(row.id) ?? [],
      regressions: regressionsByExerciseId.get(row.id) ?? [],
    };
    if (row.aliases?.length) def.aliases = row.aliases;
    result.push(def);
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

/**
 * Columns loaded for `mapDbExerciseToGeneratorExercise`. Must include every `ExerciseRowWithOntology`
 * field the adapter reads from the row; omitted columns were always undefined in-app (inference only).
 */
const EXERCISE_SELECT_WITH_ONTOLOGY =
  "id, slug, name, description, primary_muscles, secondary_muscles, equipment, modalities, movement_pattern, is_active, primary_movement_family, secondary_movement_families, movement_patterns, joint_stress_tags, contraindication_tags, exercise_role, pairing_category, fatigue_regions, mobility_targets, stretch_targets, unilateral, rep_range_min, rep_range_max, workout_levels, aliases, swap_candidates, warmup_relevance, cooldown_relevance, stability_demand, grip_demand, impact_level, curation_primary_role, curation_equipment_class, curation_complexity, curation_keep_category, curation_generator_eligibility_state, curation_canonical_exercise_id, curation_cluster_id, curation_sport_transfer_tags, curation_movement_patterns, curation_llm_confidence, curation_pruning_recommendation, curation_updated_at, curation_is_canonical, curation_merge_target_exercise_id, curation_review_notes, curation_reason_codes";

/** PostgREST often caps a single response (~1000 rows); paginate so large catalogs (e.g. functional fitness) load fully. */
const GENERATOR_EXERCISE_PAGE_SIZE = 1000;

/** Chunk `.in(...)` queries so URL / param limits are not exceeded with large catalogs. */
const IN_QUERY_CHUNK_SIZE = 200;

async function selectInChunks<T extends Record<string, unknown>>(
  supabase: SupabaseClient,
  table: string,
  columns: string,
  filterColumn: string,
  ids: string[],
  chunkSize: number
): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    if (chunk.length === 0) continue;
    const { data, error } = await supabase.from(table).select(columns).in(filterColumn, chunk);
    if (error) throw new Error(error.message);
    out.push(...((data ?? []) as unknown as T[]));
  }
  return out;
}

async function fetchAllActiveExerciseRowsForGenerator(supabase: SupabaseClient): Promise<ExerciseRowWithOntology[]> {
  const rows: ExerciseRowWithOntology[] = [];
  let from = 0;
  const page = GENERATOR_EXERCISE_PAGE_SIZE;
  for (;;) {
    const { data, error } = await supabase
      .from("exercises")
      .select(EXERCISE_SELECT_WITH_ONTOLOGY)
      .eq("is_active", true)
      .order("id", { ascending: true })
      .range(from, from + page - 1);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as ExerciseRowWithOntology[];
    rows.push(...batch);
    if (batch.length < page) break;
    from += page;
  }
  return rows;
}

export type ExerciseRelationMaps = {
  rows: ExerciseRowWithOntology[];
  tagsByExerciseId: Map<string, string[]>;
  contraByExerciseId: Map<string, string[]>;
  progressionsByExerciseId: Map<string, string[]>;
  regressionsByExerciseId: Map<string, string[]>;
};

/**
 * Cached full catalog + relation maps for workout generation (many paginated Supabase calls).
 * Cleared on load failure so the next generate can retry. Call `clearGeneratorExerciseCatalogCache()` after
 * catalog migrations or in tests that need a fresh fetch in the same JS runtime.
 */
let generatorRelationMapsPromise: Promise<ExerciseRelationMaps> | null = null;

export function clearGeneratorExerciseCatalogCache(): void {
  generatorRelationMapsPromise = null;
  listExercisesForGeneratorByFilterKey = null;
  cachedActiveCatalogExerciseCount = null;
}

function getCachedGeneratorRelationMaps(supabase: SupabaseClient): Promise<ExerciseRelationMaps> {
  if (!generatorRelationMapsPromise) {
    generatorRelationMapsPromise = loadActiveExercisesWithRelationMaps(supabase).catch((err) => {
      generatorRelationMapsPromise = null;
      throw err;
    });
  }
  return generatorRelationMapsPromise;
}

/**
 * Active exercises plus tag / contraindication / progression maps (paginated + chunked queries).
 */
export async function loadActiveExercisesWithRelationMaps(supabase: SupabaseClient): Promise<ExerciseRelationMaps> {
  const rows = await fetchAllActiveExerciseRowsForGenerator(supabase);
  if (!rows.length) {
    return {
      rows: [],
      tagsByExerciseId: new Map(),
      contraByExerciseId: new Map(),
      progressionsByExerciseId: new Map(),
      regressionsByExerciseId: new Map(),
    };
  }

  const exerciseIds = rows.map((r) => r.id);

  const [tagsRows, contraRows, progRows] = await Promise.all([
    selectInChunks<{ exercise_id: string; tag_id: string }>(
      supabase,
      "exercise_tag_map",
      "exercise_id, tag_id",
      "exercise_id",
      exerciseIds,
      IN_QUERY_CHUNK_SIZE
    ),
    selectInChunks<{ exercise_id: string; contraindication: string }>(
      supabase,
      "exercise_contraindications",
      "exercise_id, contraindication",
      "exercise_id",
      exerciseIds,
      IN_QUERY_CHUNK_SIZE
    ),
    selectInChunks<{ exercise_id: string; related_exercise_id: string; relationship: string }>(
      supabase,
      "exercise_progressions",
      "exercise_id, related_exercise_id, relationship",
      "exercise_id",
      exerciseIds,
      IN_QUERY_CHUNK_SIZE
    ),
  ]);

  const tagIds = [...new Set(tagsRows.map((r) => r.tag_id))];
  const tagRowList = tagIds.length
    ? await selectInChunks<{ id: string; slug: string; name: string }>(
        supabase,
        "exercise_tags",
        "id, slug, name",
        "id",
        tagIds,
        IN_QUERY_CHUNK_SIZE
      )
    : [];
  const tagById = new Map(tagRowList.map((t) => [t.id, t]));

  const tagsByExerciseId = new Map<string, string[]>();
  for (const r of tagsRows) {
    const t = tagById.get(r.tag_id);
    if (t) {
      const list = tagsByExerciseId.get(r.exercise_id) ?? [];
      list.push(t.slug);
      tagsByExerciseId.set(r.exercise_id, list);
    }
  }

  const contraByExerciseId = new Map<string, string[]>();
  for (const r of contraRows) {
    const list = contraByExerciseId.get(r.exercise_id) ?? [];
    list.push(r.contraindication);
    contraByExerciseId.set(r.exercise_id, list);
  }

  const relatedIds = [...new Set(progRows.map((r) => r.related_exercise_id))];
  const relatedSlugById = new Map<string, string>();
  if (relatedIds.length > 0) {
    const relatedRows = await selectInChunks<{ id: string; slug: string }>(
      supabase,
      "exercises",
      "id, slug",
      "id",
      relatedIds,
      IN_QUERY_CHUNK_SIZE
    );
    for (const e of relatedRows) {
      relatedSlugById.set(e.id, e.slug);
    }
  }
  const progressionsByExerciseId = new Map<string, string[]>();
  const regressionsByExerciseId = new Map<string, string[]>();
  for (const r of progRows) {
    const eid = r.exercise_id;
    const slug = relatedSlugById.get(r.related_exercise_id);
    if (!slug) continue;
    if (r.relationship === "progression") {
      const list = progressionsByExerciseId.get(eid) ?? [];
      list.push(slug);
      progressionsByExerciseId.set(eid, list);
    } else {
      const list = regressionsByExerciseId.get(eid) ?? [];
      list.push(slug);
      regressionsByExerciseId.set(eid, list);
    }
  }

  return {
    rows,
    tagsByExerciseId,
    contraByExerciseId,
    progressionsByExerciseId,
    regressionsByExerciseId,
  };
}

/** JSON-serializable row from Supabase for catalog export (merged with static in tooling). */
export type SupabaseCatalogExerciseRow = {
  supabase_row_id: string;
  id: string;
  name: string;
  description: string | null;
  primary_muscles: string[];
  secondary_muscles: string[];
  muscles: string[];
  modalities: string[];
  equipment: string[];
  movement_pattern: string | null;
  tags: string[];
  contraindications: string[];
  progressions: string[];
  regressions: string[];
  ontology: {
    primary_movement_family?: string | null;
    secondary_movement_families?: string[] | null;
    movement_patterns?: string[] | null;
    joint_stress_tags?: string[] | null;
    contraindication_tags?: string[] | null;
    exercise_role?: string | null;
    pairing_category?: string | null;
    fatigue_regions?: string[] | null;
    mobility_targets?: string[] | null;
    stretch_targets?: string[] | null;
    unilateral?: boolean | null;
    rep_range_min?: number | null;
    rep_range_max?: number | null;
    workout_levels?: string[] | null;
  };
};

function mergedMuscleGroups(primary: string[], secondary: string[]): string[] {
  return [...primary, ...secondary].filter((m, i, a) => a.indexOf(m) === i);
}

function contraindicationsForCatalogRow(
  row: ExerciseRowWithOntology,
  contraTable: string[]
): string[] {
  const fromOntology = (row.contraindication_tags ?? []).map((c) => c.toLowerCase().replace(/\s/g, "_"));
  return [...new Set([...contraTable, ...fromOntology])];
}

/**
 * All active Supabase exercises with relations, for catalog export. Returns null if Supabase is not configured.
 */
export async function listSupabaseCatalogExerciseRows(): Promise<SupabaseCatalogExerciseRow[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { rows, tagsByExerciseId, contraByExerciseId, progressionsByExerciseId, regressionsByExerciseId } =
    await loadActiveExercisesWithRelationMaps(supabase);

  const out: SupabaseCatalogExerciseRow[] = [];
  for (const row of rows) {
    if (isBlockedExercise({ id: row.slug, name: row.name })) continue;
    const primary = row.primary_muscles ?? [];
    const secondary = row.secondary_muscles ?? [];
    const contraTable = contraByExerciseId.get(row.id) ?? [];
    out.push({
      supabase_row_id: row.id,
      id: row.slug,
      name: row.name,
      description: row.description ?? null,
      primary_muscles: primary,
      secondary_muscles: secondary,
      muscles: mergedMuscleGroups(primary, secondary),
      modalities: row.modalities ?? [],
      equipment: row.equipment ?? [],
      movement_pattern: row.movement_pattern ?? null,
      tags: tagsByExerciseId.get(row.id) ?? [],
      contraindications: contraindicationsForCatalogRow(row, contraTable),
      progressions: progressionsByExerciseId.get(row.id) ?? [],
      regressions: regressionsByExerciseId.get(row.id) ?? [],
      ontology: {
        primary_movement_family: row.primary_movement_family ?? null,
        secondary_movement_families: row.secondary_movement_families ?? null,
        movement_patterns: row.movement_patterns ?? null,
        joint_stress_tags: row.joint_stress_tags ?? null,
        contraindication_tags: row.contraindication_tags ?? null,
        exercise_role: row.exercise_role ?? null,
        pairing_category: row.pairing_category ?? null,
        fatigue_regions: row.fatigue_regions ?? null,
        mobility_targets: row.mobility_targets ?? null,
        stretch_targets: row.stretch_targets ?? null,
        unilateral: row.unilateral ?? null,
        rep_range_min: row.rep_range_min ?? null,
        rep_range_max: row.rep_range_max ?? null,
        workout_levels: row.workout_levels ?? null,
      },
    });
  }
  return out;
}

/**
 * List exercises in generator Exercise format with ontology fields when present.
 * Uses structured DB columns (primary_movement_family, joint_stress_tags, etc.) and
 * populates legacy movement_pattern and tags.joint_stress/contraindications for compat.
 *
 * Fetches the **full** active catalog in pages (not a single capped query). Does **not** filter by
 * gym equipment here — `generateWorkoutSession` applies `filterByHardConstraints` so equipment matching
 * stays consistent with the merged static+DB pool in `generateWorkoutAsync`.
 */
/**
 * Cheap count of active exercises (no relation joins). Used to decide if Supabase is the
 * production catalog vs merging static fallback — see `lib/exerciseCatalogPolicy.ts`.
 * Memoized until `clearGeneratorExerciseCatalogCache()` so multi-day generation does not repeat the head request.
 */
let cachedActiveCatalogExerciseCount: number | null = null;

export async function countActiveCatalogExercises(): Promise<number> {
  const supabase = getSupabase();
  if (!supabase) return 0;
  if (cachedActiveCatalogExerciseCount != null) return cachedActiveCatalogExerciseCount;
  const { count, error } = await supabase
    .from("exercises")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);
  if (error) throw new Error(error.message);
  cachedActiveCatalogExerciseCount = count ?? 0;
  return cachedActiveCatalogExerciseCount;
}

function generatorListFiltersCacheKey(filters?: Pick<ExerciseFilters, "injuries" | "tagSlugs">): string {
  return JSON.stringify({
    i: filters?.injuries?.length ? [...filters.injuries].sort() : [],
    t: filters?.tagSlugs?.length ? [...filters.tagSlugs].sort() : [],
  });
}

/**
 * Resolved `listExercisesForGenerator` promises per filter key so parallel / sequential
 * generation (e.g. manual week) does not re-map thousands of rows per day.
 */
let listExercisesForGeneratorByFilterKey: Map<string, Promise<Exercise[]>> | null = null;

async function listExercisesForGeneratorImpl(
  filters?: Pick<ExerciseFilters, "injuries" | "tagSlugs">
): Promise<Exercise[]> {
  const supabase = requireClient();
  const { rows, tagsByExerciseId, contraByExerciseId, progressionsByExerciseId, regressionsByExerciseId } =
    await getCachedGeneratorRelationMaps(supabase);
  if (!rows.length) return [];

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
    const exercise = mapDbExerciseToGeneratorExercise(
      row,
      tagsByExerciseId.get(row.id) ?? [],
      contraByExerciseId.get(row.id) ?? [],
      progressionsByExerciseId.get(row.id) ?? [],
      regressionsByExerciseId.get(row.id) ?? []
    );
    if (!isBlockedExercise({ id: exercise.id, name: exercise.name })) result.push(exercise);
  }
  return result;
}

export async function listExercisesForGenerator(
  filters?: Pick<ExerciseFilters, "injuries" | "tagSlugs">
): Promise<Exercise[]> {
  const key = generatorListFiltersCacheKey(filters);
  if (!listExercisesForGeneratorByFilterKey) {
    listExercisesForGeneratorByFilterKey = new Map();
  }
  const existing = listExercisesForGeneratorByFilterKey.get(key);
  if (existing) return existing;
  const promise = listExercisesForGeneratorImpl(filters);
  listExercisesForGeneratorByFilterKey.set(key, promise);
  return promise;
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
