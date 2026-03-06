export { getSupabase, isDbConfigured } from "./client";
export type { Sport, SportCategory, SportQuality, UserSportProfile, SportEvent } from "./types";
export {
  getSportCategories,
  getSportsByCategory,
  getQualitiesForSport,
  upsertUserSportProfile,
  upsertSportEvent,
  getLatestUserSportProfile,
} from "./sportRepository";
export type { UpsertUserSportProfileParams, UpsertSportEventParams } from "./sportRepository";

export {
  listExercises,
  getExercise,
  listTags,
  listExercisesByTags,
} from "./exerciseRepository";
export type { ExerciseFilters } from "./exerciseRepository";

export {
  listProfiles,
  getActiveProfile,
  setActiveProfile,
  upsertProfile,
  setEquipment,
  removeProfile,
} from "./gymProfileRepository";
export type { UpsertProfileParams } from "./gymProfileRepository";

export {
  createWorkout,
  addBlocksAndExercises,
  listWorkouts,
  getWorkout,
  saveGeneratedWorkout,
  saveCompletedWorkout,
  listCompletedWorkouts,
  saveSavedWorkout,
  listSavedWorkouts,
  deleteWorkout,
} from "./workoutRepository";
export type { CreateWorkoutIntent } from "./workoutRepository";

export {
  getPreferences,
  upsertPreferences,
  listPresets,
  addPreset,
  updatePreset,
  removePreset,
} from "./preferencesRepository";

export { listGoals, upsertGoals } from "./goalsRepository";
export type { UserGoal } from "./goalsRepository";

export { saveManualWeek, listWeeklyPlanInstances, getWeeklyPlanWithWorkouts } from "./weekPlanRepository";
export type { SavedWeekSummary, WeeklyPlanWithWorkouts } from "./weekPlanRepository";
