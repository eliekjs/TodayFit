import * as GymProfileRepo from "../lib/db/gymProfileRepository";
import * as PreferencesRepo from "../lib/db/preferencesRepository";
import * as WorkoutRepo from "../lib/db/workoutRepository";
import type {
  ManualPreferences,
  PreferencePreset,
  WorkoutHistoryItem,
  SavedWorkout,
} from "../lib/types";

/** Snapshot from Supabase (or empty defaults) after parallel fetch for the signed-in user. */
export type LoadedRemoteAppState = {
  profiles: Awaited<ReturnType<typeof GymProfileRepo.listProfiles>>;
  prefs: ManualPreferences | null;
  presets: PreferencePreset[];
  history: WorkoutHistoryItem[];
  saved: SavedWorkout[];
};

export async function loadRemoteAppState(userId: string): Promise<LoadedRemoteAppState> {
  const [profiles, prefs, presets, history, saved] = await Promise.all([
    GymProfileRepo.listProfiles(userId),
    PreferencesRepo.getPreferences(userId),
    PreferencesRepo.listPresets(userId),
    WorkoutRepo.listCompletedWorkouts(userId),
    WorkoutRepo.listSavedWorkouts(userId),
  ]);
  return { profiles, prefs, presets, history, saved };
}
