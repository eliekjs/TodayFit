/**
 * Load training qualities and demand mappings from Supabase.
 * Phase 1: optional; app can use static config (goalQualityWeights, sportQualityWeights) or DB.
 */

import { getSupabase } from "./client";
import type { TrainingQualitySlug } from "../../logic/workoutIntelligence/trainingQualities";
import type {
  SportTrainingDemandMap,
  GoalTrainingDemandMap,
  ExerciseQualityScoreMap,
} from "../../logic/workoutIntelligence/dataModels";

export type TrainingQualityRow = {
  slug: string;
  name: string;
  category: string;
  description: string | null;
  sort_order: number;
};

/** Load all training qualities (slug, name, category, description, sort_order). */
export async function getTrainingQualities(): Promise<TrainingQualityRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("training_qualities")
    .select("slug, name, category, description, sort_order")
    .order("sort_order", { ascending: true });
  if (error) return [];
  return (data ?? []) as TrainingQualityRow[];
}

/** Load sport → quality weights as a map. */
export async function getSportTrainingDemandMap(): Promise<SportTrainingDemandMap> {
  const supabase = getSupabase();
  if (!supabase) return {};
  const { data, error } = await supabase
    .from("sport_training_demand")
    .select("sport_slug, training_quality_slug, weight");
  if (error) return {};
  const out: SportTrainingDemandMap = {};
  for (const row of data ?? []) {
    const slug = (row as { sport_slug: string }).sport_slug;
    const q = (row as { training_quality_slug: string }).training_quality_slug;
    const w = (row as { weight: number }).weight;
    if (!out[slug]) out[slug] = {};
    out[slug][q as TrainingQualitySlug] = w;
  }
  return out;
}

/** Load goal → quality weights as a map. */
export async function getGoalTrainingDemandMap(): Promise<GoalTrainingDemandMap> {
  const supabase = getSupabase();
  if (!supabase) return {};
  const { data, error } = await supabase
    .from("goal_training_demand")
    .select("goal_slug, training_quality_slug, weight");
  if (error) return {};
  const out: GoalTrainingDemandMap = {};
  for (const row of data ?? []) {
    const slug = (row as { goal_slug: string }).goal_slug;
    const q = (row as { training_quality_slug: string }).training_quality_slug;
    const w = (row as { weight: number }).weight;
    if (!out[slug]) out[slug] = {};
    out[slug][q as TrainingQualitySlug] = w;
  }
  return out;
}

/** Load exercise → quality weights keyed by exercise slug (requires join with exercises). */
export async function getExerciseQualityScoreMapBySlug(): Promise<
  Record<string, Partial<Record<TrainingQualitySlug, number>>>
> {
  const supabase = getSupabase();
  if (!supabase) return {};
  const { data, error } = await supabase
    .from("exercise_training_quality")
    .select("exercise_id, training_quality_slug, weight");
  if (error) return {};
  const byId: Record<string, Partial<Record<TrainingQualitySlug, number>>> = {};
  for (const row of data ?? []) {
    const id = (row as { exercise_id: string }).exercise_id;
    const q = (row as { training_quality_slug: string }).training_quality_slug;
    const w = (row as { weight: number }).weight;
    if (!byId[id]) byId[id] = {};
    byId[id][q as TrainingQualitySlug] = w;
  }
  const { data: exercises } = await supabase.from("exercises").select("id, slug");
  const bySlug: Record<string, Partial<Record<TrainingQualitySlug, number>>> = {};
  for (const e of exercises ?? []) {
    const slug = (e as { slug: string }).slug;
    const id = (e as { id: string }).id;
    if (byId[id]) bySlug[slug] = byId[id];
  }
  return bySlug;
}
