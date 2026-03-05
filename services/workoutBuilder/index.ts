import type { GeneratedWorkout, EnergyLevel, ManualPreferences } from "../../lib/types";
import type { GymProfile } from "../../data/gymProfiles";
import { generateWorkoutAsync } from "../../lib/generator";
import { isDbConfigured } from "../../lib/db";
import { getPreferredExerciseNamesForSportAndGoals } from "../../lib/db/starterExerciseRepository";

export type SessionIntent = {
  id: string;
  /** Human-readable label for the session (e.g. "Lower Strength + Zone 2"). */
  label: string;
  /** High-level focus labels mapped to Manual primaryFocus options. */
  focus: string[];
  durationMinutes: number;
  energyLevel: EnergyLevel;
  /** Optional rationale or notes for this session. */
  notes?: string;
};

export type SportGoalOptions = {
  sportSlug?: string | null;
  goalSlugs?: string[];
  /** Match % for 1st / 2nd / 3rd goal (e.g. [50, 30, 20]). Used with get_exercises_by_goals_ranked. */
  goalWeightsPct?: number[];
  /** Sub-focus slugs for primary sport (from SPORTS_WITH_SUB_FOCUSES). Biases exercise selection via tag mapping. */
  sportSubFocusSlugs?: string[];
};

/**
 * Shared workout builder that takes a high-level session intent and returns a concrete workout.
 * Both Manual mode and Sports Prep mode can route through this so exercise generation stays consistent.
 * When options.sportSlug and options.goalSlugs are provided and DB is configured, exercises are
 * preferred by goal_exercise_relevance and sport_tag_profile overlap.
 */
export async function buildWorkoutForSessionIntent(
  intent: SessionIntent,
  gymProfile?: GymProfile,
  seedExtra?: string | number,
  options?: SportGoalOptions
): Promise<GeneratedWorkout> {
  const basePreferences: ManualPreferences = {
    primaryFocus: intent.focus,
    targetBody: null,
    targetModifier: [],
    durationMinutes: intent.durationMinutes,
    energyLevel: intent.energyLevel,
    injuries: [],
    upcoming: [],
    subFocusByGoal: {},
    workoutStyle: [],
  };

  let preferredNames: string[] | undefined;
  if (isDbConfigured() && (options?.goalSlugs?.length || options?.sportSubFocusSlugs?.length)) {
    try {
      preferredNames = await getPreferredExerciseNamesForSportAndGoals(
        options.sportSlug ?? null,
        options.goalSlugs ?? [],
        options.goalWeightsPct ?? [50, 30, 20],
        options.sportSubFocusSlugs
      );
    } catch {
      preferredNames = undefined;
    }
  }

  const workout = await generateWorkoutAsync(
    basePreferences,
    gymProfile,
    seedExtra ?? intent.id,
    preferredNames
  );

  return {
    ...workout,
    notes: intent.notes ?? workout.notes,
  };
}

