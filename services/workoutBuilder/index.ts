import type { GeneratedWorkout, EnergyLevel, ManualPreferences } from "../../lib/types";
import type { GymProfile } from "../../data/gymProfiles";
import { generateWorkoutAsync } from "../../lib/generator";

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

/**
 * Shared workout builder that takes a high-level session intent and returns a concrete workout.
 * Both Manual mode and Sports Prep mode can route through this so exercise generation stays consistent.
 */
export async function buildWorkoutForSessionIntent(
  intent: SessionIntent,
  gymProfile?: GymProfile,
  seedExtra?: string | number
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

  const workout = await generateWorkoutAsync(
    basePreferences,
    gymProfile,
    seedExtra ?? intent.id
  );

  return {
    ...workout,
    notes: intent.notes ?? workout.notes,
  };
}

