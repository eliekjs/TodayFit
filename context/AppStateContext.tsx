import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Alert } from "react-native";
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
import { formatRemoteLoadError } from "./formatRemoteLoadError";
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
import type { LoadedRemoteAppState } from "./loadRemoteAppState";

type RemoteSyncStatus = "idle" | "loading" | "ready" | "error";

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
  /** Supabase-backed snapshot load for signed-in users (profiles, prefs, history, saved). */
  remoteSyncStatus: RemoteSyncStatus;
  remoteSyncError: string | null;
  /** True when local edits happened during the initial cloud load so server data was not applied. */
  remoteSyncSkippedMerge: boolean;
  /** Re-fetch from Supabase and replace local synced slices (use after errors or skipped merge). */
  reloadRemoteAppState: () => void;
  dismissRemoteSyncSkippedMerge: () => void;
};

const AppStateContext = createContext<AppStateContextValue | undefined>(
  undefined
);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const { userId, isLoading: authLoading } = useAuth();
  const persist = isDbConfigured() && Boolean(userId);

  const [remoteSyncStatus, setRemoteSyncStatus] = useState<RemoteSyncStatus>("idle");
  const [remoteSyncError, setRemoteSyncError] = useState<string | null>(null);
  const [remoteSyncSkippedMerge, setRemoteSyncSkippedMerge] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const forceApplyRemoteOnNextLoadRef = useRef(false);
  const userIdRef = useRef<string | null>(null);
  const remoteLoadSeqRef = useRef(0);
  const remoteLoadInProgressRef = useRef(false);
  const userEditedDuringRemoteLoadRef = useRef(false);

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  const applyRemoteData = useCallback((data: LoadedRemoteAppState) => {
    const { profiles, prefs, presets, history, saved } = data;
    if (profiles.length) {
      setGymProfiles(profiles);
      const active = profiles.find((p) => p.isActive) ?? profiles[0];
      setActiveGymProfileId(active?.id ?? null);
    }
    if (prefs) setManualPreferences(prefs);
    setPreferencePresets(presets);
    setWorkoutHistory(history);
    setSavedWorkouts(saved);
  }, []);

  const touchPersistedStateDuringRemoteLoad = useCallback(() => {
    if (remoteLoadInProgressRef.current) {
      userEditedDuringRemoteLoadRef.current = true;
    }
  }, []);

  const notifySaveFailed = useCallback(() => {
    Alert.alert(
      "Couldn't save",
      "Your changes may not have been saved. Check your connection and try again."
    );
  }, []);

  const reloadRemoteAppState = useCallback(() => {
    if (!isDbConfigured() || !userIdRef.current) return;
    forceApplyRemoteOnNextLoadRef.current = true;
    setRemoteSyncError(null);
    setReloadToken((t) => t + 1);
  }, []);

  const dismissRemoteSyncSkippedMerge = useCallback(() => {
    setRemoteSyncSkippedMerge(false);
  }, []);

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

  useEffect(() => {
    if (authLoading) return;

    if (!persist || !userId) {
      setRemoteSyncStatus("idle");
      setRemoteSyncError(null);
      setRemoteSyncSkippedMerge(false);
      return;
    }

    const seq = ++remoteLoadSeqRef.current;
    const forceApply = forceApplyRemoteOnNextLoadRef.current;
    forceApplyRemoteOnNextLoadRef.current = false;
    const startedUserId = userId;

    remoteLoadInProgressRef.current = true;
    userEditedDuringRemoteLoadRef.current = false;

    setRemoteSyncStatus("loading");
    if (!forceApply) {
      setRemoteSyncError(null);
      setRemoteSyncSkippedMerge(false);
    }

    void (async () => {
      try {
        const data = await loadRemoteAppState(startedUserId);
        if (seq !== remoteLoadSeqRef.current || userIdRef.current !== startedUserId) return;

        if (!forceApply && userEditedDuringRemoteLoadRef.current) {
          setRemoteSyncSkippedMerge(true);
          setRemoteSyncStatus("ready");
          return;
        }

        applyRemoteData(data);
        setRemoteSyncStatus("ready");
        setRemoteSyncError(null);
        setRemoteSyncSkippedMerge(false);
      } catch (error) {
        if (seq !== remoteLoadSeqRef.current || userIdRef.current !== startedUserId) return;
        console.error("[AppStateRemoteLoadError]", {
          userId: startedUserId,
          forceApply,
          error,
        });
        setRemoteSyncError(formatRemoteLoadError(error));
        setRemoteSyncStatus("error");
      } finally {
        if (seq === remoteLoadSeqRef.current) {
          remoteLoadInProgressRef.current = false;
        }
      }
    })();
  }, [userId, persist, authLoading, reloadToken, applyRemoteData]);

  const setActiveGymProfile = useCallback((id: string) => {
    if (persist && userId) touchPersistedStateDuringRemoteLoad();
    const previousProfiles = gymProfiles;
    const previousActiveId = activeGymProfileId;
    setActiveGymProfileId(id);
    setGymProfiles((profiles) =>
      profiles.map((p) => ({ ...p, isActive: p.id === id }))
    );
    if (persist && userId) {
      void persistWithHandling({
        operation: "setActiveGymProfile",
        action: () => GymProfileRepo.setActiveProfile(userId, id),
        rollback: () => {
          setGymProfiles(previousProfiles);
          setActiveGymProfileId(previousActiveId);
        },
        onFailure: notifySaveFailed,
      });
    }
  }, [
    userId,
    persist,
    touchPersistedStateDuringRemoteLoad,
    gymProfiles,
    activeGymProfileId,
    notifySaveFailed,
  ]);

  const addGymProfile = useCallback((profile: Omit<GymProfile, "id" | "isActive">) => {
    if (persist && userId) {
      touchPersistedStateDuringRemoteLoad();
      void persistWithHandling({
        operation: "addGymProfile",
        action: async () => {
          const p = await GymProfileRepo.upsertProfile(userId, {
            name: profile.name,
            equipment: profile.equipment,
            dumbbellMaxWeight: profile.dumbbellMaxWeight,
            isActive: false,
          });
          setGymProfiles((prev) => [...prev, p]);
        },
        onFailure: notifySaveFailed,
      });
    } else {
      setGymProfiles((profiles) => [
        ...profiles,
        { id: `profile_${Date.now()}`, ...profile, isActive: false },
      ]);
    }
  }, [userId, persist, touchPersistedStateDuringRemoteLoad, notifySaveFailed]);

  const updateGymProfile = useCallback((id: string, update: Partial<Pick<GymProfile, "name" | "equipment" | "dumbbellMaxWeight">>) => {
    const previousSnapshot = gymProfiles.find((p) => p.id === id);
    const profileToPersist =
      previousSnapshot != null ? { ...previousSnapshot, ...update } : undefined;
    setGymProfiles((profiles) =>
      profiles.map((p) => (p.id === id ? { ...p, ...update } : p))
    );
    if (persist && userId && profileToPersist && previousSnapshot != null) {
      touchPersistedStateDuringRemoteLoad();
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
        rollback: () =>
          setGymProfiles((prev) =>
            prev.map((p) => (p.id === id ? previousSnapshot : p))
          ),
        onFailure: notifySaveFailed,
      });
    }
  }, [userId, persist, gymProfiles, touchPersistedStateDuringRemoteLoad, notifySaveFailed]);

  const removeGymProfile = useCallback((id: string) => {
    const profilesSnapshot = gymProfiles;
    const activeSnapshot = activeGymProfileId;
    setGymProfiles((prev) => {
      const next = prev.filter((p) => p.id !== id);
      if (activeGymProfileId === id) {
        setActiveGymProfileId(next[0]?.id ?? null);
      }
      return next;
    });
    if (persist && userId) {
      touchPersistedStateDuringRemoteLoad();
      void persistWithHandling({
        operation: "removeGymProfile",
        action: () => GymProfileRepo.removeProfile(userId, id),
        rollback: () => {
          setGymProfiles(profilesSnapshot);
          setActiveGymProfileId(activeSnapshot);
        },
        onFailure: notifySaveFailed,
      });
    }
  }, [
    userId,
    persist,
    activeGymProfileId,
    gymProfiles,
    touchPersistedStateDuringRemoteLoad,
    notifySaveFailed,
  ]);

  const addPreferencePreset = useCallback((preset: Omit<PreferencePreset, "id">) => {
    if (persist && userId) {
      touchPersistedStateDuringRemoteLoad();
      void persistWithHandling({
        operation: "addPreferencePreset",
        action: async () => {
          const p = await PreferencesRepo.addPreset(userId, preset);
          setPreferencePresets((prev) => [...prev, p]);
        },
        onFailure: notifySaveFailed,
      });
    } else {
      setPreferencePresets((prev) => [
        ...prev,
        { ...preset, id: `preset_${Date.now()}` },
      ]);
    }
  }, [userId, persist, touchPersistedStateDuringRemoteLoad, notifySaveFailed]);

  const updatePreferencePreset = useCallback((id: string, update: Partial<Pick<PreferencePreset, "name" | "preferences">>) => {
    const previousSnapshot = preferencePresets.find((p) => p.id === id);
    setPreferencePresets((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...update } : p))
    );
    if (persist && userId && previousSnapshot != null) {
      touchPersistedStateDuringRemoteLoad();
      void persistWithHandling({
        operation: "updatePreferencePreset",
        action: () => PreferencesRepo.updatePreset(userId, id, update),
        rollback: () =>
          setPreferencePresets((prev) =>
            prev.map((p) => (p.id === id ? previousSnapshot : p))
          ),
        onFailure: notifySaveFailed,
      });
    }
  }, [userId, persist, preferencePresets, touchPersistedStateDuringRemoteLoad, notifySaveFailed]);

  const removePreferencePreset = useCallback((id: string) => {
    const removed = preferencePresets.find((p) => p.id === id);
    const removedIndex = preferencePresets.findIndex((p) => p.id === id);
    setPreferencePresets((prev) => prev.filter((p) => p.id !== id));
    if (persist && userId && removed != null) {
      touchPersistedStateDuringRemoteLoad();
      void persistWithHandling({
        operation: "removePreferencePreset",
        action: () => PreferencesRepo.removePreset(userId, id),
        rollback: () =>
          setPreferencePresets((prev) => {
            if (prev.some((p) => p.id === id)) return prev;
            const next = [...prev];
            const i = Math.min(Math.max(removedIndex, 0), next.length);
            next.splice(i, 0, removed);
            return next;
          }),
        onFailure: notifySaveFailed,
      });
    }
  }, [userId, persist, preferencePresets, touchPersistedStateDuringRemoteLoad, notifySaveFailed]);

  const updateManualPreferences = useCallback((update: Partial<ManualPreferences>) => {
    setManualPreferences((prev) => {
      const next = { ...prev, ...update };
      if (persist && userId) {
        touchPersistedStateDuringRemoteLoad();
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
                  onFailure: notifySaveFailed,
                })
            ).enqueue,
          };
        }
        manualPreferencesPersistQueueRef.current.enqueue(next);
      }
      return next;
    });
  }, [userId, persist, touchPersistedStateDuringRemoteLoad, notifySaveFailed]);

  const addCompletedWorkout = useCallback((summary: Omit<WorkoutHistoryItem, "id">) => {
    const item = { ...summary, id: `hist_${Date.now()}` };
    setWorkoutHistory((prev) => [...prev, item]);
    if (persist && userId) {
      touchPersistedStateDuringRemoteLoad();
      void persistWithHandling({
        operation: "addCompletedWorkout",
        action: () => WorkoutRepo.saveCompletedWorkout(userId, summary),
        onFailure: notifySaveFailed,
      });
    }
  }, [userId, persist, touchPersistedStateDuringRemoteLoad, notifySaveFailed]);

  const updateWorkoutHistoryItem = useCallback((id: string, update: Partial<Pick<WorkoutHistoryItem, "name">>) => {
    setWorkoutHistory((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...update } : item))
    );
    // Optional: persist name update to workout intent (would need updateWorkoutIntent or similar)
  }, []);

  const addSavedWorkout = useCallback((item: Omit<SavedWorkout, "id">) => {
    if (persist && userId) {
      touchPersistedStateDuringRemoteLoad();
      void persistWithHandling({
        operation: "addSavedWorkout",
        action: async () => {
          const rowId = await WorkoutRepo.saveSavedWorkout(userId, item);
          setSavedWorkouts((prev) => [...prev, { ...item, id: rowId }]);
        },
        onFailure: notifySaveFailed,
      });
    } else {
      setSavedWorkouts((prev) => [
        ...prev,
        { ...item, id: `saved_${Date.now()}` },
      ]);
    }
  }, [userId, persist, touchPersistedStateDuringRemoteLoad, notifySaveFailed]);

  const removeSavedWorkout = useCallback((id: string) => {
    const removedIndex = savedWorkouts.findIndex((w) => w.id === id);
    const removedItem = removedIndex >= 0 ? savedWorkouts[removedIndex] : undefined;
    setSavedWorkouts((prev) => {
      return prev.filter((w) => w.id !== id);
    });
    if (persist && userId) {
      touchPersistedStateDuringRemoteLoad();
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
        onFailure: notifySaveFailed,
      });
    }
  }, [userId, persist, savedWorkouts, touchPersistedStateDuringRemoteLoad, notifySaveFailed]);

  const removeSavedWorkoutByWorkoutId = useCallback((workoutId: string) => {
    const removedIndex = savedWorkouts.findIndex((w) => w.workout.id === workoutId);
    const saved = savedWorkouts.find((w) => w.workout.id === workoutId);
    setSavedWorkouts((prev) =>
      prev.filter((w) => w.workout.id !== workoutId)
    );
    if (persist && userId && saved) {
      touchPersistedStateDuringRemoteLoad();
      void persistWithHandling({
        operation: "removeSavedWorkoutByWorkoutId",
        action: () => WorkoutRepo.deleteWorkout(userId, saved.id),
        rollback: () =>
          setSavedWorkouts((prev) => {
            if (prev.some((w) => w.id === saved.id)) return prev;
            const next = [...prev];
            const i =
              removedIndex >= 0 ? Math.min(Math.max(removedIndex, 0), next.length) : next.length;
            next.splice(i, 0, saved);
            return next;
          }),
        onFailure: notifySaveFailed,
      });
    }
  }, [userId, persist, savedWorkouts, touchPersistedStateDuringRemoteLoad, notifySaveFailed]);

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
        if (!preset) return;
        if (persist && userId) touchPersistedStateDuringRemoteLoad();
        setManualPreferences(preset.preferences);
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
      remoteSyncStatus,
      remoteSyncError,
      remoteSyncSkippedMerge,
      reloadRemoteAppState,
      dismissRemoteSyncSkippedMerge,
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
      remoteSyncStatus,
      remoteSyncError,
      remoteSyncSkippedMerge,
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
      setAdaptiveSetup,
      reloadRemoteAppState,
      dismissRemoteSyncSkippedMerge,
      persist,
      userId,
      touchPersistedStateDuringRemoteLoad,
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
