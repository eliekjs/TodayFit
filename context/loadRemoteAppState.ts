import * as GymProfileRepo from "../lib/db/gymProfileRepository";
import * as PreferencesRepo from "../lib/db/preferencesRepository";
import * as SportPresetsRepo from "../lib/db/sportPresetsRepository";
import * as WorkoutRepo from "../lib/db/workoutRepository";
import type {
  ManualPreferences,
  PreferencePreset,
  WorkoutHistoryItem,
  SavedWorkout,
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
};

export async function loadRemoteAppState(userId: string): Promise<LoadedRemoteAppState> {
  const [profiles, prefs, presets, sportPresets, history, saved] = await Promise.all([
    GymProfileRepo.listProfiles(userId),
    PreferencesRepo.getPreferences(userId),
    PreferencesRepo.listPresets(userId),
    SportPresetsRepo.listSportPresets(userId),
    WorkoutRepo.listCompletedWorkouts(userId),
    WorkoutRepo.listSavedWorkouts(userId),
  ]);
  return { profiles, prefs, presets, sportPresets, history, saved };
}
