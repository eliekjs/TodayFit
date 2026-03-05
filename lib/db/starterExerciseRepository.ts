import { getSupabase } from "./client";
import { getExerciseTagsForSubFocuses } from "../../data/sportSubFocus";

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
 * Get public.exercises ranked by weighted goal match (goal_tag_profile + exercise_tag_map.relevance_weight).
 * Returns slugs and names in preference order for the generator.
 */
export async function getExercisesByGoalsRanked(
  goalSlugs: string[],
  goalWeightsPct: number[],
  limit: number = 100
): Promise<{ slug: string; name: string }[]> {
  if (!goalSlugs.length) return [];
  const supabase = requireClient();
  const weights =
    goalWeightsPct.length >= goalSlugs.length
      ? goalWeightsPct.slice(0, goalSlugs.length)
      : [...goalWeightsPct, ...Array(goalSlugs.length - goalWeightsPct.length).fill(0)];
  const sum = weights.reduce((a, b) => a + b, 0);
  const normalized = sum > 0 ? weights.map((w) => (w / sum) * 100) : weights.map(() => 100 / goalSlugs.length);
  const { data: rows, error } = await supabase.rpc("get_exercises_by_goals_ranked", {
    goal_slugs: goalSlugs,
    goal_weights_pct: normalized,
    result_limit: limit,
  });
  if (error) throw new Error(error.message);
  return (rows ?? []).map((r: { slug: string; name: string }) => ({ slug: r.slug, name: r.name }));
}

/** Normalize tag string to slug form for matching (lowercase, spaces to underscores). */
function tagToSlug(tag: string): string {
  return tag.toLowerCase().trim().replace(/\s+/g, "_");
}

/** Auto weights by rank: 50% / 30% / 20% for 3 sub-focuses; 60/40 for 2; 100% for 1. */
function getDefaultSubFocusWeights(count: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [1];
  if (count === 2) return [0.6, 0.4];
  return [0.5, 0.3, 0.2];
}

/**
 * Preferred exercise names (and slugs) for sport- and goal-aware workout building.
 * Uses weighted goal ranking (get_exercises_by_goals_ranked) when goalSlugs and goalWeightsPct are provided;
 * when sportSubFocusSlugs are provided, ranks exercises by sub-focus tag overlap and prepends them.
 * Optionally merges sport_tag_profile overlap.
 */
export async function getPreferredExerciseNamesForSportAndGoals(
  sportSlug: string | null,
  goalSlugs: string[],
  goalWeightsPct?: number[],
  sportSubFocusSlugs?: string[]
): Promise<string[]> {
  const nameSet = new Set<string>();
  const ordered: string[] = [];

  if (goalSlugs.length > 0) {
    const weights = goalWeightsPct ?? [50, 30, 20].slice(0, goalSlugs.length);
    try {
      const byGoals = await getExercisesByGoalsRanked(goalSlugs, weights, 100);
      for (const row of byGoals) {
        if (!nameSet.has(row.name)) {
          nameSet.add(row.name);
          ordered.push(row.name);
        }
      }
    } catch {
      const byGoal = await getStarterExercisesRankedByGoals(goalSlugs);
      for (const row of byGoal) {
        if (!nameSet.has(row.name)) {
          nameSet.add(row.name);
          ordered.push(row.name);
        }
      }
    }
  }

  if (sportSlug && sportSubFocusSlugs?.length) {
    const subFocusWeights = getDefaultSubFocusWeights(sportSubFocusSlugs.length);
    const tagWeights = getExerciseTagsForSubFocuses(sportSlug, sportSubFocusSlugs, subFocusWeights);
    if (tagWeights.length > 0) {
      const tagWeightMap = new Map(tagWeights.map((t) => [t.tag_slug, t.weight]));
      const { data: all, error } = requireClient()
        .from("starter_exercises")
        .select("name, tags")
        .eq("is_active", true);
      if (!error && all?.length) {
        const scored: { name: string; score: number }[] = [];
        for (const row of all as Array<{ name: string; tags: string[] }>) {
          const tags = Array.isArray(row.tags) ? row.tags : [];
          let score = 0;
          for (const t of tags) {
            const slug = tagToSlug(t);
            const w = tagWeightMap.get(slug);
            if (w != null) score += w;
          }
          if (score > 0 && !nameSet.has(row.name)) scored.push({ name: row.name, score });
        }
        scored.sort((a, b) => b.score - a.score);
        const topN = 50;
        for (let i = Math.min(topN, scored.length) - 1; i >= 0; i--) {
          const { name } = scored[i];
          if (!nameSet.has(name)) {
            nameSet.add(name);
            ordered.unshift(name);
          }
        }
      }
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
