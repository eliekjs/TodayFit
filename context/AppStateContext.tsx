import React, { createContext, useContext, useMemo, useState } from "react";
import { GymProfile, initialGymProfiles } from "../data/gymProfiles";
import type {
  ManualPreferences,
  GeneratedWorkout,
  WorkoutHistoryItem,
} from "../lib/types";

const defaultPreferences: ManualPreferences = {
  primaryFocus: [],
  durationMinutes: null,
  energyLevel: null,
  injuries: [],
  upcoming: [],
  subFocus: [],
  useGymEquipmentOnly: false,
};

type AppStateContextValue = {
  activeGymProfileId: string | null;
  gymProfiles: GymProfile[];
  manualPreferences: ManualPreferences;
  generatedWorkout: GeneratedWorkout | null;
  workoutHistory: WorkoutHistoryItem[];
  setActiveGymProfile: (id: string) => void;
  addGymProfile: (profile: Omit<GymProfile, "id" | "isActive">) => void;
  updateManualPreferences: (update: Partial<ManualPreferences>) => void;
  setGeneratedWorkout: (workout: GeneratedWorkout | null) => void;
  addCompletedWorkout: (summary: Omit<WorkoutHistoryItem, "id">) => void;
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
    useState<ManualPreferences>(defaultPreferences);
  const [generatedWorkout, setGeneratedWorkout] =
    useState<GeneratedWorkout | null>(null);
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutHistoryItem[]>(
    []
  );

  const value = useMemo<AppStateContextValue>(
    () => ({
      activeGymProfileId,
      gymProfiles,
      manualPreferences,
      generatedWorkout,
      workoutHistory,
      setActiveGymProfile: (id) => {
        setActiveGymProfileId(id);
        setGymProfiles((profiles) =>
          profiles.map((p) => ({ ...p, isActive: p.id === id }))
        );
      },
      addGymProfile: (profile) => {
        setGymProfiles((profiles) => [
          ...profiles,
          { id: `profile_${profiles.length + 1}`, ...profile },
        ]);
      },
      updateManualPreferences: (update) => {
        setManualPreferences((prev) => ({ ...prev, ...update }));
      },
      setGeneratedWorkout,
      addCompletedWorkout: (summary) => {
        setWorkoutHistory((prev) => [
          ...prev,
          { id: String(prev.length + 1), ...summary },
        ]);
      },
    }),
    [
      activeGymProfileId,
      gymProfiles,
      manualPreferences,
      generatedWorkout,
      workoutHistory,
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
