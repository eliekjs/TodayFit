import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { GymProfile, initialGymProfiles } from "../data/gymProfiles";
import type {
  ManualPreferences,
  GeneratedWorkout,
  WorkoutHistoryItem,
  SavedWorkout,
  ExecutionProgress,
  PreferencePreset,
} from "../lib/types";
import { useAuth } from "./AuthContext";
import { isDbConfigured } from "../lib/db";
import * as GymProfileRepo from "../lib/db/gymProfileRepository";
import * as PreferencesRepo from "../lib/db/preferencesRepository";
import * as WorkoutRepo from "../lib/db/workoutRepository";

export const defaultManualPreferences: ManualPreferences = {
  primaryFocus: [],
  targetBody: null,
  targetModifier: [],
  durationMinutes: null,
  energyLevel: null,
  injuries: [],
  upcoming: [],
  subFocusByGoal: {},
  workoutStyle: [],
};

type AppStateContextValue = {
  activeGymProfileId: string | null;
  gymProfiles: GymProfile[];
  preferencePresets: PreferencePreset[];
  manualPreferences: ManualPreferences;
  generatedWorkout: GeneratedWorkout | null;
  workoutHistory: WorkoutHistoryItem[];
  savedWorkouts: SavedWorkout[];
  resumeProgress: ExecutionProgress | null;
  setActiveGymProfile: (id: string) => void;
  addGymProfile: (profile: Omit<GymProfile, "id" | "isActive">) => void;
  updateGymProfile: (id: string, update: Partial<Pick<GymProfile, "name" | "equipment" | "dumbbellMaxWeight">>) => void;
  removeGymProfile: (id: string) => void;
  addPreferencePreset: (preset: Omit<PreferencePreset, "id">) => void;
  updatePreferencePreset: (id: string, update: Partial<Pick<PreferencePreset, "name" | "preferences">>) => void;
  removePreferencePreset: (id: string) => void;
  applyPreferencePreset: (id: string) => void;
  updateManualPreferences: (update: Partial<ManualPreferences>) => void;
  setGeneratedWorkout: (workout: GeneratedWorkout | null) => void;
  setResumeProgress: (progress: ExecutionProgress | null) => void;
  addCompletedWorkout: (summary: Omit<WorkoutHistoryItem, "id">) => void;
  updateWorkoutHistoryItem: (id: string, update: Partial<Pick<WorkoutHistoryItem, "name">>) => void;
  addSavedWorkout: (item: Omit<SavedWorkout, "id">) => void;
  removeSavedWorkout: (id: string) => void;
  removeSavedWorkoutByWorkoutId: (workoutId: string) => void;
};

const AppStateContext = createContext<AppStateContextValue | undefined>(
  undefined
);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const { userId } = useAuth();
  const persist = isDbConfigured() && Boolean(userId);

  const [gymProfiles, setGymProfiles] = useState<GymProfile[]>(initialGymProfiles);
  const [activeGymProfileId, setActiveGymProfileId] = useState<string | null>(
    initialGymProfiles[0]?.id ?? null
  );
  const [manualPreferences, setManualPreferences] =
    useState<ManualPreferences>(defaultManualPreferences);
  const [generatedWorkout, setGeneratedWorkout] =
    useState<GeneratedWorkout | null>(null);
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutHistoryItem[]>([]);
  const [savedWorkouts, setSavedWorkouts] = useState<SavedWorkout[]>([]);
  const [resumeProgress, setResumeProgress] = useState<ExecutionProgress | null>(null);
  const [preferencePresets, setPreferencePresets] = useState<PreferencePreset[]>([]);

  // Load from Supabase when user is available and DB configured
  useEffect(() => {
    if (!persist || !userId) return;
    let cancelled = false;
    (async () => {
      try {
        const [profiles, prefs, presets, history, saved] = await Promise.all([
          GymProfileRepo.listProfiles(userId),
          PreferencesRepo.getPreferences(userId),
          PreferencesRepo.listPresets(userId),
          WorkoutRepo.listCompletedWorkouts(userId),
          WorkoutRepo.listSavedWorkouts(userId),
        ]);
        if (cancelled) return;
        if (profiles.length) {
          setGymProfiles(profiles);
          const active = profiles.find((p) => p.isActive) ?? profiles[0];
          setActiveGymProfileId(active?.id ?? null);
        }
        if (prefs) setManualPreferences(prefs);
        setPreferencePresets(presets);
        setWorkoutHistory(history);
        setSavedWorkouts(saved);
      } catch {
        // keep default state on error
      }
    })();
    return () => { cancelled = true; };
  }, [userId, persist]);

  const setActiveGymProfile = useCallback((id: string) => {
    setActiveGymProfileId(id);
    setGymProfiles((profiles) =>
      profiles.map((p) => ({ ...p, isActive: p.id === id }))
    );
    if (persist && userId) {
      GymProfileRepo.setActiveProfile(userId, id).catch(() => {});
    }
  }, [userId, persist]);

  const addGymProfile = useCallback((profile: Omit<GymProfile, "id" | "isActive">) => {
    if (persist && userId) {
      GymProfileRepo.upsertProfile(userId, {
        name: profile.name,
        equipment: profile.equipment,
        dumbbellMaxWeight: profile.dumbbellMaxWeight,
        isActive: false,
      }).then((p) => {
        setGymProfiles((prev) => [...prev, p]);
      }).catch(() => {});
    } else {
      setGymProfiles((profiles) => [
        ...profiles,
        { id: `profile_${Date.now()}`, ...profile, isActive: false },
      ]);
    }
  }, [userId, persist]);

  const updateGymProfile = useCallback((id: string, update: Partial<Pick<GymProfile, "name" | "equipment" | "dumbbellMaxWeight">>) => {
    setGymProfiles((profiles) => {
      const next = profiles.map((p) => (p.id === id ? { ...p, ...update } : p));
      if (persist && userId) {
        const updated = next.find((p) => p.id === id);
        if (updated) {
          GymProfileRepo.upsertProfile(userId, {
            id,
            name: updated.name,
            equipment: updated.equipment,
            dumbbellMaxWeight: updated.dumbbellMaxWeight,
            isActive: updated.isActive,
          }).catch(() => {});
        }
      }
      return next;
    });
  }, [userId, persist]);

  const removeGymProfile = useCallback((id: string) => {
    setGymProfiles((prev) => {
      const next = prev.filter((p) => p.id !== id);
      if (activeGymProfileId === id) {
        setActiveGymProfileId(next[0]?.id ?? null);
      }
      return next;
    });
    if (persist && userId) {
      GymProfileRepo.removeProfile(userId, id).catch(() => {});
    }
  }, [userId, persist, activeGymProfileId]);

  const addPreferencePreset = useCallback((preset: Omit<PreferencePreset, "id">) => {
    if (persist && userId) {
      PreferencesRepo.addPreset(userId, preset).then((p) => {
        setPreferencePresets((prev) => [...prev, p]);
      }).catch(() => {});
    } else {
      setPreferencePresets((prev) => [
        ...prev,
        { ...preset, id: `preset_${Date.now()}` },
      ]);
    }
  }, [userId, persist]);

  const updatePreferencePreset = useCallback((id: string, update: Partial<Pick<PreferencePreset, "name" | "preferences">>) => {
    setPreferencePresets((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...update } : p))
    );
    if (persist && userId) {
      PreferencesRepo.updatePreset(userId, id, update).catch(() => {});
    }
  }, [userId, persist]);

  const removePreferencePreset = useCallback((id: string) => {
    setPreferencePresets((prev) => prev.filter((p) => p.id !== id));
    if (persist && userId) {
      PreferencesRepo.removePreset(userId, id).catch(() => {});
    }
  }, [userId, persist]);

  const updateManualPreferences = useCallback((update: Partial<ManualPreferences>) => {
    setManualPreferences((prev) => ({ ...prev, ...update }));
    if (persist && userId) {
      PreferencesRepo.upsertPreferences(userId, update).catch(() => {});
    }
  }, [userId, persist]);

  const addCompletedWorkout = useCallback((summary: Omit<WorkoutHistoryItem, "id">) => {
    const item = { ...summary, id: `hist_${Date.now()}` };
    setWorkoutHistory((prev) => [...prev, item]);
    if (persist && userId) {
      WorkoutRepo.saveCompletedWorkout(userId, summary).then(() => {}).catch(() => {});
    }
  }, [userId, persist]);

  const updateWorkoutHistoryItem = useCallback((id: string, update: Partial<Pick<WorkoutHistoryItem, "name">>) => {
    setWorkoutHistory((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...update } : item))
    );
    // Optional: persist name update to workout intent (would need updateWorkoutIntent or similar)
  }, []);

  const addSavedWorkout = useCallback((item: Omit<SavedWorkout, "id">) => {
    if (persist && userId) {
      WorkoutRepo.saveSavedWorkout(userId, item).then((id) => {
        setSavedWorkouts((prev) => [...prev, { ...item, id }]);
      }).catch(() => {});
    } else {
      setSavedWorkouts((prev) => [
        ...prev,
        { ...item, id: `saved_${Date.now()}` },
      ]);
    }
  }, [userId, persist]);

  const removeSavedWorkout = useCallback((id: string) => {
    setSavedWorkouts((prev) => prev.filter((w) => w.id !== id));
    if (persist && userId) {
      WorkoutRepo.deleteWorkout(userId, id).catch(() => {});
    }
  }, [userId, persist]);

  const removeSavedWorkoutByWorkoutId = useCallback((workoutId: string) => {
    setSavedWorkouts((prev) =>
      prev.filter((w) => w.workout.id !== workoutId)
    );
    if (persist && userId) {
      const saved = savedWorkouts.find((w) => w.workout.id === workoutId);
      if (saved) WorkoutRepo.deleteWorkout(userId, saved.id).catch(() => {});
    }
  }, [userId, persist, savedWorkouts]);

  const value = useMemo<AppStateContextValue>(
    () => ({
      activeGymProfileId,
      gymProfiles,
      preferencePresets,
      manualPreferences,
      generatedWorkout,
      workoutHistory,
      savedWorkouts,
      resumeProgress,
      setActiveGymProfile,
      addGymProfile,
      updateGymProfile,
      removeGymProfile,
      addPreferencePreset,
      updatePreferencePreset,
      removePreferencePreset,
      applyPreferencePreset: (id) => {
        const preset = preferencePresets.find((p) => p.id === id);
        if (preset) setManualPreferences(preset.preferences);
      },
      updateManualPreferences,
      setGeneratedWorkout,
      setResumeProgress,
      addCompletedWorkout,
      updateWorkoutHistoryItem,
      addSavedWorkout,
      removeSavedWorkout,
      removeSavedWorkoutByWorkoutId,
    }),
    [
      activeGymProfileId,
      gymProfiles,
      preferencePresets,
      manualPreferences,
      generatedWorkout,
      workoutHistory,
      savedWorkouts,
      resumeProgress,
      setActiveGymProfile,
      addGymProfile,
      updateGymProfile,
      removeGymProfile,
      addPreferencePreset,
      updatePreferencePreset,
      removePreferencePreset,
      updateManualPreferences,
      addCompletedWorkout,
      updateWorkoutHistoryItem,
      addSavedWorkout,
      removeSavedWorkout,
      removeSavedWorkoutByWorkoutId,
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
