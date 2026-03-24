import { getSupabase } from "./client";
import { getExerciseTagsForSubFocuses, getCanonicalSportSlug } from "../../data/sportSubFocus";

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

/** Auto weights by rank: 50% / 30% / 20% for 3 sub-focuses; 50% / 30% for 2; 100% for 1. */
function getDefaultSubFocusWeights(count: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [1];
  if (count === 2) return [0.5, 0.3];
  return [0.5, 0.3, 0.2];
}

export type SportGoalMergeOptions = {
  rankedSportSlugs?: string[];
  sportFocusPct?: [number, number];
  sportVsGoalPct?: number;
  sportSubFocusSlugsBySport?: Record<string, string[]>;
};

/**
 * Build a name -> score map for exercises by sport (sub-focus 50/30/20 + sport tags).
 * When 2 sports: merge tag weights by sportFocusPct, then score.
 */
async function buildSportScoreMap(
  rankedSportSlugs: string[],
  sportFocusPct: [number, number] | undefined,
  sportSubFocusSlugsBySport: Record<string, string[]> | undefined
): Promise<Map<string, number>> {
  const byTag = new Map<string, number>();
  const sportWeights =
    rankedSportSlugs.length === 2 && sportFocusPct
      ? [sportFocusPct[0] / 100, sportFocusPct[1] / 100]
      : rankedSportSlugs.map(() => 1 / rankedSportSlugs.length);

  for (let s = 0; s < rankedSportSlugs.length; s++) {
    const slug = rankedSportSlugs[s];
    const weight = sportWeights[s] ?? 1 / rankedSportSlugs.length;
    const subSlugs = sportSubFocusSlugsBySport?.[slug] ?? [];
    const subWeights = getDefaultSubFocusWeights(subSlugs.length);
    const tagWeights = getExerciseTagsForSubFocuses(slug, subSlugs, subWeights);
    for (const { tag_slug, weight: w } of tagWeights) {
      byTag.set(tag_slug, (byTag.get(tag_slug) ?? 0) + w * weight);
    }
    const sportTags = await getSportTags(slug);
    for (const t of sportTags) {
      const tagSlug = tagToSlug(t);
      byTag.set(tagSlug, (byTag.get(tagSlug) ?? 0) + weight);
    }
  }

  const { data: allSport, error: sportError } = requireClient()
    .from("starter_exercises")
    .select("name, tags")
    .eq("is_active", true);
  if (sportError || !allSport?.length) return new Map();
  const scoreMap = new Map<string, number>();
  for (const row of allSport as Array<{ name: string; tags: string[] }>) {
    const tags = Array.isArray(row.tags) ? row.tags : [];
    let score = 0;
    for (const t of tags) {
      const w = byTag.get(tagToSlug(t));
      if (w != null) score += w;
    }
    if (score > 0) scoreMap.set(row.name, score);
  }
  return scoreMap;
}

/**
 * Preferred exercise names (and slugs) for sport- and goal-aware workout building.
 * Uses weighted goal ranking (get_exercises_by_goals_ranked) when goalSlugs and goalWeightsPct are provided;
 * when sportSubFocusSlugs are provided, ranks exercises by sub-focus tag overlap and prepends them.
 * When options.sportVsGoalPct is provided and both sports and goals exist, merges sport and goal rankings by that weight.
 */
export async function getPreferredExerciseNamesForSportAndGoals(
  sportSlug: string | null,
  goalSlugs: string[],
  goalWeightsPct?: number[],
  sportSubFocusSlugs?: string[],
  options?: SportGoalMergeOptions
): Promise<string[]> {
  const rankedSlugs = options?.rankedSportSlugs?.length
    ? options.rankedSportSlugs
    : sportSlug
      ? [sportSlug]
      : [];
  const hasSport = rankedSlugs.length > 0;
  const hasGoals = goalSlugs.length > 0;
  const sportVsGoal = options?.sportVsGoalPct;

  if (hasSport && hasGoals && sportVsGoal != null) {
    const sportScoreMap = await buildSportScoreMap(
      rankedSlugs,
      rankedSlugs.length === 2 ? options?.sportFocusPct : undefined,
      options?.sportSubFocusSlugsBySport ?? (sportSlug && sportSubFocusSlugs?.length ? { [sportSlug]: sportSubFocusSlugs } : undefined)
    );
    const weights = goalWeightsPct ?? [50, 30, 20].slice(0, goalSlugs.length);
    let goalList: { name: string }[];
    try {
      goalList = await getExercisesByGoalsRanked(goalSlugs, weights, 100);
    } catch {
      const byGoal = await getStarterExercisesRankedByGoals(goalSlugs);
      goalList = byGoal.map((r) => ({ name: r.name }));
    }
    const sportMax = Math.max(1, ...sportScoreMap.values());
    const goalScoreMap = new Map<string, number>();
    goalList.forEach((row, i) => {
      goalScoreMap.set(row.name, 1 - i / Math.max(1, goalList.length));
    });
    const allNames = new Set([...sportScoreMap.keys(), ...goalScoreMap.keys()]);
    const sportW = sportVsGoal / 100;
    const goalW = 1 - sportW;
    const combined: { name: string; score: number }[] = [];
    for (const name of allNames) {
      const s = (sportScoreMap.get(name) ?? 0) / sportMax;
      const g = goalScoreMap.get(name) ?? 0;
      combined.push({ name, score: sportW * s + goalW * g });
    }
    combined.sort((a, b) => b.score - a.score);
    return combined.map((c) => c.name);
  }

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

  const primarySlug = sportSlug ?? rankedSlugs[0];
  const canonicalSlug = primarySlug ? getCanonicalSportSlug(primarySlug) : "";
  let subSlugs =
    primarySlug && (options?.sportSubFocusSlugsBySport?.[primarySlug] ?? sportSubFocusSlugs)?.length
      ? (options?.sportSubFocusSlugsBySport?.[primarySlug] ?? sportSubFocusSlugs)!
      : undefined;
  // When sport has no sub-focus selected, default so tag-based ranking runs. Use canonical slug for consolidated sports.
  if (primarySlug === "vertical_jump" && (!subSlugs || subSlugs.length === 0)) {
    subSlugs = ["vertical_jump"];
  }
  if (canonicalSlug === "cycling" && (!subSlugs || subSlugs.length === 0)) {
    subSlugs = ["aerobic_base", "leg_strength", "core_stability"];
  }
  if (primarySlug === "hiking_backpacking" && (!subSlugs || subSlugs.length === 0)) {
    subSlugs = ["uphill_endurance", "leg_strength", "ankle_stability"];
  }
  if (primarySlug === "golf" && (!subSlugs || subSlugs.length === 0)) {
    subSlugs = ["rotational_power"];
  }
  if (canonicalSlug === "court_racquet" && (!subSlugs || subSlugs.length === 0)) {
    subSlugs = ["lateral_speed", "rotational_power", "shoulder_stability"];
  }
  if (primarySlug === "hockey" && (!subSlugs || subSlugs.length === 0)) {
    subSlugs = ["speed", "leg_power", "work_capacity"];
  }
  if (primarySlug === "rugby" && (!subSlugs || subSlugs.length === 0)) {
    subSlugs = ["speed_power", "work_capacity", "posterior_chain"];
  }
  if (canonicalSlug === "volleyball" && (!subSlugs || subSlugs.length === 0)) {
    subSlugs = ["vertical_jump", "landing_mechanics"];
  }
  if (primarySlug === "american_football" && (!subSlugs || subSlugs.length === 0)) {
    subSlugs = ["speed_power", "change_of_direction", "work_capacity"];
  }
  if (primarySlug === "lacrosse" && (!subSlugs || subSlugs.length === 0)) {
    subSlugs = ["speed", "rotational_power"];
  }
  if (primarySlug === "boxing" && (!subSlugs || subSlugs.length === 0)) {
    subSlugs = ["rotational_power", "work_capacity"];
  }
  if (canonicalSlug === "grappling" && (!subSlugs || subSlugs.length === 0)) {
    subSlugs = ["grip_endurance", "hip_stability", "work_capacity"];
  }
  if (primarySlug === "muay_thai" && (!subSlugs || subSlugs.length === 0)) {
    subSlugs = ["rotational_power", "work_capacity"];
  }
  if (primarySlug === "surfing" && (!subSlugs || subSlugs.length === 0)) {
    subSlugs = ["pop_up_power", "paddle_endurance"];
  }
  if (primarySlug === "kite_wind_surf" && (!subSlugs || subSlugs.length === 0)) {
    subSlugs = ["balance", "core_stability"];
  }
  if (canonicalSlug === "rock_climbing" && (!subSlugs || subSlugs.length === 0)) {
    subSlugs = ["pull_strength", "core_tension", "finger_strength"];
  }
  if (canonicalSlug === "road_running" && (!subSlugs || subSlugs.length === 0)) {
    subSlugs = ["running_economy", "leg_resilience"];
  }
  if (primarySlug === "rowing_erg" && (!subSlugs || subSlugs.length === 0)) {
    subSlugs = ["aerobic_base", "posterior_chain"];
  }
  if (primarySlug === "swimming_open_water" && (!subSlugs || subSlugs.length === 0)) {
    subSlugs = ["pull_strength", "shoulder_scapular", "core_stability"];
  }
  if (primarySlug === "trail_running" && (!subSlugs || subSlugs.length === 0)) {
    subSlugs = ["uphill_endurance", "downhill_control", "ankle_stability"];
  }
  if (primarySlug === "triathlon" && (!subSlugs || subSlugs.length === 0)) {
    subSlugs = ["swim_specific", "bike_run_durability", "core_stability"];
  }
  if (primarySlug === "xc_skiing" && (!subSlugs || subSlugs.length === 0)) {
    subSlugs = ["double_pole_upper", "leg_drive", "core_stability"];
  }
  if (primarySlug === "hyrox" && (!subSlugs || subSlugs.length === 0)) {
    subSlugs = ["work_capacity", "running_endurance", "core_stability"];
  }
  if (primarySlug === "rucking" && (!subSlugs || subSlugs.length === 0)) {
    subSlugs = ["load_carriage_durability", "leg_strength", "core_stability"];
  }
  if (primarySlug === "ocr_spartan" && (!subSlugs || subSlugs.length === 0)) {
    subSlugs = ["work_capacity", "grip_endurance", "core_stability"];
  }
  if (primarySlug === "tactical_fitness" && (!subSlugs || subSlugs.length === 0)) {
    subSlugs = ["work_capacity", "strength_endurance", "core_stability"];
  }
  if (primarySlug === "crossfit" && (!subSlugs || subSlugs.length === 0)) {
    subSlugs = ["work_capacity", "strength", "engine"];
  }
  if (primarySlug === "general_strength" && (!subSlugs || subSlugs.length === 0)) {
    subSlugs = ["squat_strength", "bench_strength", "deadlift_strength"];
  }
  if (primarySlug === "bodybuilding" && (!subSlugs || subSlugs.length === 0)) {
    subSlugs = ["push_hypertrophy", "pull_hypertrophy", "legs_hypertrophy"];
  }
  if (canonicalSlug === "track_sprinting" && (!subSlugs || subSlugs.length === 0)) {
    subSlugs = ["acceleration_power", "plyometric_power", "leg_strength"];
  }
  if (primarySlug === "strongman" && (!subSlugs || subSlugs.length === 0)) {
    subSlugs = ["carries_load", "posterior_chain_strength", "work_capacity"];
  }
  if (primarySlug === "alpine_skiing" && (!subSlugs || subSlugs.length === 0)) {
    subSlugs = ["leg_strength", "eccentric_control", "core_stability"];
  }
  if (primarySlug === "snowboarding" && (!subSlugs || subSlugs.length === 0)) {
    subSlugs = ["leg_strength", "core_stability", "balance"];
  }
  if (primarySlug && subSlugs?.length) {
    const subFocusWeights = getDefaultSubFocusWeights(subSlugs.length);
    const tagWeights = getExerciseTagsForSubFocuses(primarySlug, subSlugs, subFocusWeights);
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

  if (!primarySlug) return ordered;

  const sportTags = await getSportTags(primarySlug);
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
