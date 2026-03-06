/**
 * Central mapping: filters (upcoming events, recent load) → exercise tags to include or exclude.
 * Used by the manual generator and by adaptive/week generation so both paths share the same logic.
 *
 * Other filters and where they live:
 * - Injuries/constraints → EXCLUDE exercises with matching contraindications (lib/generator filterByInjuries;
 *   lib/workoutRules INJURY_AVOID_TAGS / INJURY_AVOID_EXERCISE_IDS for daily generator).
 * - Body part focus → INCLUDE only exercises matching target (Upper/Lower/Full/Push/Pull/Quad/Posterior/Core)
 *   via muscles + tags (lib/generator filterByBodyPartFocus).
 * - Primary focus → INCLUDE by modality (strength, hypertrophy, conditioning, mobility, power) in pool selection.
 * - Gym profile → INCLUDE only exercises whose equipment is in the profile (lib/generator filterByGymProfile).
 */

/** Tag slugs as they appear in data/exercises.ts and DB exercise_tags (e.g. "quad-focused", "posterior chain"). */
export type ExerciseTagSlug = string;

/**
 * Upcoming (manual) or recent-load (adaptive) option → exercise tag slugs to AVOID.
 * Rationale: reduce strain before/after the listed activity so the user can perform or recover.
 */
export const UPCOMING_AND_RECENT_LOAD_AVOID_TAGS: Record<string, ExerciseTagSlug[]> = {
  // Leg-dominant activities: avoid heavy leg strain so legs are fresh for the event or recovering
  "Long Run": [
    "quad-focused",
    "posterior chain",
    "hamstrings",
    "glutes",
    "single-leg",
    "hip hinge",
  ],
  "Big Hike": [
    "quad-focused",
    "posterior chain",
    "hamstrings",
    "glutes",
    "single-leg",
    "hip hinge",
  ],
  "Ski Day": [
    "quad-focused",
    "posterior chain",
    "hamstrings",
    "glutes",
    "single-leg",
    "hip hinge",
  ],
  "Hard Leg Day": [
    "quad-focused",
    "posterior chain",
    "hamstrings",
    "glutes",
    "single-leg",
    "hip hinge",
  ],
  "Heavy Lower": [
    "quad-focused",
    "posterior chain",
    "hamstrings",
    "glutes",
    "single-leg",
    "hip hinge",
  ],
  // Upper-dominant: avoid heavy upper so upper body is fresh or recovering
  "Hard Upper Day": [
    "chest",
    "triceps",
    "shoulders",
    "lats",
    "upper back",
    "lat-focused",
  ],
  "Heavy Upper": [
    "chest",
    "triceps",
    "shoulders",
    "lats",
    "upper back",
    "lat-focused",
  ],
  // Climbing: avoid grip-heavy so forearms are fresh for climbing
  "Climbing Day": ["grip strength"],
  // No avoidance for light/normal
  "Light / Off": [],
  "Normal / Mixed": [],
};

/**
 * Returns tag slugs to avoid for the given upcoming options (manual mode, multi-select).
 * Union of avoid tags for each selected option.
 */
export function getAvoidTagSlugsFromUpcoming(upcoming: string[]): ExerciseTagSlug[] {
  if (!upcoming.length) return [];
  const set = new Set<ExerciseTagSlug>();
  for (const opt of upcoming) {
    const tags = UPCOMING_AND_RECENT_LOAD_AVOID_TAGS[opt];
    if (tags) tags.forEach((t) => set.add(t));
  }
  return [...set];
}

/**
 * Returns tag slugs to avoid for the given recent-load option (adaptive mode, single select).
 */
export function getAvoidTagSlugsFromRecentLoad(recentLoad: string): ExerciseTagSlug[] {
  const tags = UPCOMING_AND_RECENT_LOAD_AVOID_TAGS[recentLoad];
  return tags ? [...tags] : [];
}

/**
 * Normalize a tag for comparison (exercise tags may have different casing/spacing).
 * Use when matching exercise.tags against avoid slugs.
 */
export function normalizeTagForMatch(tag: string): string {
  return tag.trim().toLowerCase();
}

/**
 * Check if an exercise should be excluded because it has any of the given avoid tag slugs.
 * Compares using normalized tags so "Posterior chain" matches "posterior chain".
 */
export function exerciseHasAnyAvoidTag(
  exerciseTags: string[],
  avoidTagSlugs: ExerciseTagSlug[]
): boolean {
  if (!avoidTagSlugs.length) return false;
  const avoidSet = new Set(avoidTagSlugs.map(normalizeTagForMatch));
  return exerciseTags.some((t) => avoidSet.has(normalizeTagForMatch(t)));
}
