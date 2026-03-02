import { getSupabase } from "./client";

function requireClient() {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
  return supabase;
}

/**
 * Get tag slugs for a sport from sport_tag_profile.
 * Returns empty array if sport not found or not configured.
 */
export async function getSportTags(sportSlug: string): Promise<string[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from("sport_tag_profile")
    .select("tags")
    .eq("sport_slug", sportSlug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.tags || !Array.isArray(data.tags)) return [];
  return data.tags as string[];
}

export type StarterExerciseRankRow = {
  slug: string;
  name: string;
  relevance: number;
};

/**
 * Get starter_exercises ranked by goal_exercise_relevance for the given goal slugs.
 * Resolves goal slugs to IDs via public.goals, then joins goal_exercise_relevance and starter_exercises.
 * Returns list ordered by aggregate relevance (sum) across the selected goals.
 */
export async function getStarterExercisesRankedByGoals(
  goalSlugs: string[]
): Promise<StarterExerciseRankRow[]> {
  if (!goalSlugs.length) return [];
  const supabase = requireClient();

  const { data: goals, error: goalsError } = await supabase
    .from("goals")
    .select("id")
    .in("slug", goalSlugs);
  if (goalsError) throw new Error(goalsError.message);
  const goalIds = (goals ?? []).map((g: { id: string }) => g.id);
  if (!goalIds.length) return [];

  const { data: relRows, error: relError } = await supabase
    .from("goal_exercise_relevance")
    .select("exercise_id, relevance")
    .in("goal_id", goalIds);
  if (relError) throw new Error(relError.message);
  const exerciseIds = [...new Set((relRows ?? []).map((r: { exercise_id: string }) => r.exercise_id))];
  if (!exerciseIds.length) return [];

  const { data: exRows, error: exError } = await supabase
    .from("starter_exercises")
    .select("id, slug, name")
    .in("id", exerciseIds)
    .eq("is_active", true);
  if (exError) throw new Error(exError.message);
  const byId = new Map((exRows ?? []).map((e: { id: string; slug: string; name: string }) => [e.id, e]));

  const relevanceByExerciseId = new Map<string, number>();
  for (const r of relRows ?? []) {
    const eid = (r as { exercise_id: string }).exercise_id;
    const rel = Number((r as { relevance: number }).relevance) || 0;
    relevanceByExerciseId.set(eid, (relevanceByExerciseId.get(eid) ?? 0) + rel);
  }

  const out: StarterExerciseRankRow[] = [];
  for (const [eid, relevance] of relevanceByExerciseId) {
    const ex = byId.get(eid);
    if (ex) out.push({ slug: ex.slug, name: ex.name, relevance });
  }
  out.sort((a, b) => b.relevance - a.relevance);
  return out;
}

/**
 * Preferred exercise names for sport- and goal-aware workout building.
 * Merges goal relevance (primary signal) with sport tag overlap (secondary).
 * Returns name list in preference order (no duplicates) for matching against public.exercises.name.
 */
export async function getPreferredExerciseNamesForSportAndGoals(
  sportSlug: string | null,
  goalSlugs: string[]
): Promise<string[]> {
  const byGoal = await getStarterExercisesRankedByGoals(goalSlugs);
  const nameSet = new Set<string>();
  const ordered: string[] = [];

  for (const row of byGoal) {
    if (!nameSet.has(row.name)) {
      nameSet.add(row.name);
      ordered.push(row.name);
    }
  }

  if (!sportSlug) return ordered;

  const sportTags = await getSportTags(sportSlug);
  if (!sportTags.length) return ordered;

  const sportTagSet = new Set(sportTags);
  const { data: all, error } = requireClient()
    .from("starter_exercises")
    .select("name, tags")
    .eq("is_active", true);
  if (error || !all?.length) return ordered;

  const overlap: { name: string; count: number }[] = [];
  for (const row of all as Array<{ name: string; tags: string[] }>) {
    const tags = Array.isArray(row.tags) ? row.tags : [];
    const count = tags.filter((t: string) => sportTagSet.has(t)).length;
    if (count > 0 && !nameSet.has(row.name)) overlap.push({ name: row.name, count });
  }
  overlap.sort((a, b) => b.count - a.count);
  for (const { name } of overlap) {
    if (!nameSet.has(name)) {
      nameSet.add(name);
      ordered.push(name);
    }
  }
  return ordered;
}
