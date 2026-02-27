import React, { createContext, useContext, useMemo, useState } from "react";
import { GymProfile, initialGymProfiles } from "../data/gymProfiles";
import type {
  ManualPreferences,
  GeneratedWorkout,
  WorkoutHistoryItem,
  SavedWorkout,
  ExecutionProgress,
} from "../lib/types";

export const defaultManualPreferences: ManualPreferences = {
  primaryFocus: [],
  targetBody: null,
  targetModifier: [],
  durationMinutes: null,
  energyLevel: null,
  injuries: [],
  upcoming: [],
  subFocus: [],
  workoutStyle: [],
};

type AppStateContextValue = {
  activeGymProfileId: string | null;
  gymProfiles: GymProfile[];
  manualPreferences: ManualPreferences;
  generatedWorkout: GeneratedWorkout | null;
  workoutHistory: WorkoutHistoryItem[];
  savedWorkouts: SavedWorkout[];
  resumeProgress: ExecutionProgress | null;
  setActiveGymProfile: (id: string) => void;
  addGymProfile: (profile: Omit<GymProfile, "id" | "isActive">) => void;
  updateGymProfile: (id: string, update: Partial<Pick<GymProfile, "name" | "equipment" | "dumbbellMaxWeight">>) => void;
  updateManualPreferences: (update: Partial<ManualPreferences>) => void;
  setGeneratedWorkout: (workout: GeneratedWorkout | null) => void;
  setResumeProgress: (progress: ExecutionProgress | null) => void;
  addCompletedWorkout: (summary: Omit<WorkoutHistoryItem, "id">) => void;
  addSavedWorkout: (item: Omit<SavedWorkout, "id">) => void;
  removeSavedWorkout: (id: string) => void;
  removeSavedWorkoutByWorkoutId: (workoutId: string) => void;
};

const AppStateContext = createContext<AppStateContextValue | undefined>(
  undefined
);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [gymProfiles, setGymProfiles] = useState<GymProfile[]>(initialGymProfiles);
  const [activeGymProfileId, setActiveGymProfileId] = useState<string | null>(
    initialGymProfiles[0]?.id ?? null
  );
  const [manualPreferences, setManualPreferences] =
    useState<ManualPreferences>(defaultManualPreferences);
  const [generatedWorkout, setGeneratedWorkout] =
    useState<GeneratedWorkout | null>(null);
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutHistoryItem[]>(
    []
  );
  const [savedWorkouts, setSavedWorkouts] = useState<SavedWorkout[]>([]);
  const [resumeProgress, setResumeProgress] = useState<ExecutionProgress | null>(null);

  const value = useMemo<AppStateContextValue>(
    () => ({
      activeGymProfileId,
      gymProfiles,
      manualPreferences,
      generatedWorkout,
      workoutHistory,
      savedWorkouts,
      resumeProgress,
      setActiveGymProfile: (id) => {
        setActiveGymProfileId(id);
        setGymProfiles((profiles) =>
          profiles.map((p) => ({ ...p, isActive: p.id === id }))
        );
      },
      addGymProfile: (profile) => {
        setGymProfiles((profiles) => [
          ...profiles,
          { id: `profile_${Date.now()}`, ...profile, isActive: false },
        ]);
      },
      updateGymProfile: (id, update) => {
        setGymProfiles((profiles) =>
          profiles.map((p) => (p.id === id ? { ...p, ...update } : p))
        );
      },
      updateManualPreferences: (update) => {
        setManualPreferences((prev) => ({ ...prev, ...update }));
      },
      setGeneratedWorkout,
      setResumeProgress,
      addCompletedWorkout: (summary) => {
        setWorkoutHistory((prev) => [
          ...prev,
          { id: `hist_${Date.now()}`, ...summary },
        ]);
      },
      addSavedWorkout: (item) => {
        setSavedWorkouts((prev) => [
          ...prev,
          { ...item, id: `saved_${Date.now()}` },
        ]);
      },
      removeSavedWorkout: (id) => {
        setSavedWorkouts((prev) => prev.filter((w) => w.id !== id));
      },
      removeSavedWorkoutByWorkoutId: (workoutId) => {
        setSavedWorkouts((prev) =>
          prev.filter((w) => w.workout.id !== workoutId)
        );
      },
    }),
    [
      activeGymProfileId,
      gymProfiles,
      manualPreferences,
      generatedWorkout,
      workoutHistory,
      savedWorkouts,
      resumeProgress,
    ]
  );

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState(): AppStateContextValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error("useAppState must be used within AppStateProvider");
  }
  return ctx;
}
