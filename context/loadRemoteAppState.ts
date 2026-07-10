import * as GymProfileRepo from "../lib/db/gymProfileRepository";
import * as PreferencesRepo from "../lib/db/preferencesRepository";
import * as SportPresetsRepo from "../lib/db/sportPresetsRepository";
import * as WorkoutRepo from "../lib/db/workoutRepository";
import * as WeekPlanRepo from "../lib/db/weekPlanRepository";
import type {
  ManualPreferences,
  PreferencePreset,
  WorkoutHistoryItem,
  SavedWorkout,
  SavedWeek,
} from "../lib/types";
import type { SportPreset } from "../lib/sessionDraft";

/** Snapshot from Supabase (or empty defaults) after parallel fetch for the signed-in user. */
export type LoadedRemoteAppState = {
  profiles: Awaited<ReturnType<typeof GymProfileRepo.listProfiles>>;
  prefs: ManualPreferences | null;
  presets: PreferencePreset[];
  sportPresets: SportPreset[];
  history: WorkoutHistoryItem[];
  saved: SavedWorkout[];
  savedWeeks: SavedWeek[];
};

export async function loadRemoteAppState(userId: string): Promise<LoadedRemoteAppState> {
  const [profiles, prefs, presets, sportPresets, history, saved, savedWeeks] = await Promise.all([
    GymProfileRepo.listProfiles(userId),
    PreferencesRepo.getPreferences(userId),
    PreferencesRepo.listPresets(userId),
    SportPresetsRepo.listSportPresets(userId),
    WorkoutRepo.listCompletedWorkouts(userId),
    WorkoutRepo.listSavedWorkouts(userId),
    WeekPlanRepo.listSavedWeeks(userId),
  ]);
  return { profiles, prefs, presets, sportPresets, history, saved, savedWeeks };
}
