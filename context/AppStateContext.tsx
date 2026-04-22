import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { GymProfile, initialGymProfiles } from "../data/gymProfiles";
import type {
  ManualPreferences,
  GeneratedWorkout,
  WorkoutHistoryItem,
  SavedWorkout,
  ExecutionProgress,
  PreferencePreset,
  ManualWeekPlan,
} from "../lib/types";
import { useAuth } from "./AuthContext";
import { isDbConfigured } from "../lib/db";
import * as GymProfileRepo from "../lib/db/gymProfileRepository";
import * as PreferencesRepo from "../lib/db/preferencesRepository";
import * as WorkoutRepo from "../lib/db/workoutRepository";
import type { PlanWeekResult } from "../services/sportPrepPlanner";
import { persistWithHandling } from "./persistWithHandling";
import { createLatestSerializedPersistenceQueue } from "./latestSerializedPersistenceQueue";
import type { AdaptiveSetup } from "./appStateModel";
import { defaultManualPreferences } from "./appStateModel";
import { loadRemoteAppState } from "./loadRemoteAppState";

type AppStateContextValue = {
  activeGymProfileId: string | null;
  gymProfiles: GymProfile[];
  preferencePresets: PreferencePreset[];
  manualPreferences: ManualPreferences;
  generatedWorkout: GeneratedWorkout | null;
  workoutHistory: WorkoutHistoryItem[];
  savedWorkouts: SavedWorkout[];
  resumeProgress: ExecutionProgress | null;
  /** In-memory execution progress for the current `generatedWorkout` (survives leaving Execute). */
  manualSessionProgress: ExecutionProgress | null;
  /** True after user opens Execute for this workout (from Start / week / library / etc.). */
  manualExecutionStarted: boolean;
  /** Sports Prep (adaptive) weekly plan; kept separate from manual mode state. */
  sportPrepWeekPlan: PlanWeekResult | null;
  /** Manual flow: generated week of 7 workouts (before save). */
  manualWeekPlan: ManualWeekPlan | null;
  /** Adaptive mode: goals/sports/etc. from first page; used on schedule page to generate plan. */
  adaptiveSetup: AdaptiveSetup | null;
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
  setManualSessionProgress: (progress: ExecutionProgress | null) => void;
  setManualExecutionStarted: (started: boolean) => void;
  addCompletedWorkout: (summary: Omit<WorkoutHistoryItem, "id">) => void;
  updateWorkoutHistoryItem: (id: string, update: Partial<Pick<WorkoutHistoryItem, "name">>) => void;
  addSavedWorkout: (item: Omit<SavedWorkout, "id">) => void;
  removeSavedWorkout: (id: string) => void;
  removeSavedWorkoutByWorkoutId: (workoutId: string) => void;
  setSportPrepWeekPlan: (plan: PlanWeekResult | null) => void;
  setManualWeekPlan: (plan: ManualWeekPlan | null) => void;
  setAdaptiveSetup: (setup: AdaptiveSetup | null) => void;
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
  const [manualSessionProgress, setManualSessionProgress] =
    useState<ExecutionProgress | null>(null);
  const [manualExecutionStarted, setManualExecutionStarted] = useState(false);
  const [preferencePresets, setPreferencePresets] = useState<PreferencePreset[]>([]);
  const [sportPrepWeekPlan, setSportPrepWeekPlan] = useState<PlanWeekResult | null>(null);
  const [manualWeekPlan, setManualWeekPlan] = useState<ManualWeekPlan | null>(null);
  const [adaptiveSetup, setAdaptiveSetup] = useState<AdaptiveSetup | null>(null);
  const manualPreferencesPersistQueueRef = useRef<{
    persistUserId: string;
    enqueue: (preferences: ManualPreferences) => void;
  } | null>(null);

  const prevGeneratedWorkoutIdRef = useRef<string | null>(null);
  useEffect(() => {
    const id = generatedWorkout?.id ?? null;
    const prevId = prevGeneratedWorkoutIdRef.current;
    if (id === prevId) return;
    prevGeneratedWorkoutIdRef.current = id;
    setManualSessionProgress(null);
    if (prevId != null) {
      setManualExecutionStarted(false);
    }
  }, [generatedWorkout?.id]);

  // Load from Supabase when user is available and DB configured
  useEffect(() => {
    if (!persist || !userId) return;
    let cancelled = false;
    (async () => {
      try {
        const { profiles, prefs, presets, history, saved } = await loadRemoteAppState(userId);
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
      void persistWithHandling({
        operation: "setActiveGymProfile",
        action: () => GymProfileRepo.setActiveProfile(userId, id),
      });
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
      return profiles.map((p) => (p.id === id ? { ...p, ...update } : p));
    });
    const current = gymProfiles.find((p) => p.id === id);
    const profileToPersist = current ? { ...current, ...update } : undefined;
    if (persist && userId && profileToPersist) {
      void persistWithHandling({
        operation: "updateGymProfile",
        action: () =>
          GymProfileRepo.upsertProfile(userId, {
            id,
            name: profileToPersist.name,
            equipment: profileToPersist.equipment,
            dumbbellMaxWeight: profileToPersist.dumbbellMaxWeight,
            isActive: profileToPersist.isActive,
          }),
      });
    }
  }, [userId, persist, gymProfiles]);

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
    setManualPreferences((prev) => {
      const next = { ...prev, ...update };
      if (persist && userId) {
        if (
          !manualPreferencesPersistQueueRef.current ||
          manualPreferencesPersistQueueRef.current.persistUserId !== userId
        ) {
          manualPreferencesPersistQueueRef.current = {
            persistUserId: userId,
            enqueue: createLatestSerializedPersistenceQueue<ManualPreferences>(
              (preferences) =>
                persistWithHandling({
                  operation: "updateManualPreferences",
                  action: () => PreferencesRepo.upsertPreferences(userId, preferences),
                })
            ).enqueue,
          };
        }
        manualPreferencesPersistQueueRef.current.enqueue(next);
      }
      return next;
    });
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
    const removedIndex = savedWorkouts.findIndex((w) => w.id === id);
    const removedItem = removedIndex >= 0 ? savedWorkouts[removedIndex] : undefined;
    setSavedWorkouts((prev) => {
      return prev.filter((w) => w.id !== id);
    });
    if (persist && userId) {
      void persistWithHandling({
        operation: "removeSavedWorkout",
        action: () => WorkoutRepo.deleteWorkout(userId, id),
        rollback: () => {
          if (!removedItem) return;
          setSavedWorkouts((prev) => {
            if (prev.some((w) => w.id === removedItem.id)) return prev;
            const insertionIndex =
              removedIndex >= 0 ? Math.min(Math.max(removedIndex, 0), prev.length) : prev.length;
            const next = [...prev];
            next.splice(insertionIndex, 0, removedItem);
            return next;
          });
        },
      });
    }
  }, [userId, persist, savedWorkouts]);

  const removeSavedWorkoutByWorkoutId = useCallback((workoutId: string) => {
    setSavedWorkouts((prev) =>
      prev.filter((w) => w.workout.id !== workoutId)
    );
    if (persist && userId) {
      const saved = savedWorkouts.find((w) => w.workout.id === workoutId);
      if (saved) {
        void persistWithHandling({
          operation: "removeSavedWorkoutByWorkoutId",
          action: () => WorkoutRepo.deleteWorkout(userId, saved.id),
        });
      }
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
      manualSessionProgress,
      manualExecutionStarted,
      sportPrepWeekPlan,
      manualWeekPlan,
      adaptiveSetup,
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
      setManualSessionProgress,
      setManualExecutionStarted,
      addCompletedWorkout,
      updateWorkoutHistoryItem,
      addSavedWorkout,
      removeSavedWorkout,
      removeSavedWorkoutByWorkoutId,
      setSportPrepWeekPlan,
      setManualWeekPlan,
      setAdaptiveSetup,
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
      manualSessionProgress,
      manualExecutionStarted,
      sportPrepWeekPlan,
      manualWeekPlan,
      adaptiveSetup,
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
      setSportPrepWeekPlan,
      setManualWeekPlan,
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
