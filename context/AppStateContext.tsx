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
import * as SportPresetsRepo from "../lib/db/sportPresetsRepository";
import * as WorkoutRepo from "../lib/db/workoutRepository";
import type { PlanWeekResult } from "../services/sportPrepPlanner";
import { persistWithHandling } from "./persistWithHandling";
import { createLatestSerializedPersistenceQueue } from "./latestSerializedPersistenceQueue";
import type { AdaptiveSetup } from "./appStateModel";
import { defaultManualPreferences } from "./appStateModel";
import { loadRemoteAppState } from "./loadRemoteAppState";
import type { LoadedRemoteAppState } from "./loadRemoteAppState";
import type { ManualGoalPreferencesScope } from "../lib/manualGoalPreferencesHref";
import { normalizeSubFocusByGoalAgainstConditioningPolicy } from "../lib/preferencesConstants";
import { sanitizeSubFocusPctMaps } from "../lib/subFocusWeights";
import type {
  ModeFilterSnapshot,
  SessionDraft,
  SessionFlow,
  SportFormSnapshot,
  SportPreset,
  WeekSetupDraft,
} from "../lib/sessionDraft";

function weekSetupDraftEqual(
  a: WeekSetupDraft | null | undefined,
  b: WeekSetupDraft | null | undefined
): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  return (
    a.enteredWeekScreen === b.enteredWeekScreen &&
    a.step === b.step &&
    a.selectedTrainingDays.length === b.selectedTrainingDays.length &&
    a.selectedTrainingDays.every((d, i) => d === b.selectedTrainingDays[i]) &&
    a.dayFocusChoiceIds.length === b.dayFocusChoiceIds.length &&
    a.dayFocusChoiceIds.every((id, i) => id === b.dayFocusChoiceIds[i]) &&
    (a.dayBodyFocusChoiceIds ?? []).length === (b.dayBodyFocusChoiceIds ?? []).length &&
    (a.dayBodyFocusChoiceIds ?? []).every((id, i) => id === (b.dayBodyFocusChoiceIds ?? [])[i])
  );
}

function isActiveSessionDraftPatchNoOp(
  prev: SessionDraft,
  patch: Partial<
    Pick<SessionDraft, "phase" | "preferences" | "adaptiveSetup" | "weekSetup" | "gymProfileId">
  >
): boolean {
  if (patch.phase !== undefined && patch.phase !== prev.phase) return false;
  if (patch.preferences !== undefined && patch.preferences !== prev.preferences) return false;
  if (patch.adaptiveSetup !== undefined && patch.adaptiveSetup !== prev.adaptiveSetup) return false;
  if (patch.gymProfileId !== undefined && patch.gymProfileId !== prev.gymProfileId) return false;
  if (patch.weekSetup !== undefined && !weekSetupDraftEqual(patch.weekSetup, prev.weekSetup)) {
    return false;
  }
  return true;
}
import {
  createSessionDraft,
  inferSessionPhase,
  patchSessionDraft,
  sessionFlowFromManualScope,
} from "../lib/sessionDraft";
import {
  loadLastEditedFiltersByMode,
  persistModeFilterSnapshot,
  type LastEditedFiltersByMode,
} from "./sessionDraftStorage";

/** Strip engine/cardio-conditioning sub-focus labels mismatched to primary goals; sync % maps. */
function sanitizeManualPreferenceSubLayers(prefs: ManualPreferences): ManualPreferences {
  const subFocusByGoal = normalizeSubFocusByGoalAgainstConditioningPolicy(prefs.subFocusByGoal ?? {});
  const subFocusPctSanitized = sanitizeSubFocusPctMaps(subFocusByGoal, prefs.subFocusPctByGoal);
  return { ...prefs, subFocusByGoal, subFocusPctByGoal: subFocusPctSanitized ?? {} };
}

type RemoteSyncStatus = "idle" | "loading" | "ready" | "error";

type AppStateContextValue = {
  activeGymProfileId: string | null;
  gymProfiles: GymProfile[];
  preferencePresets: PreferencePreset[];
  sportPresets: SportPreset[];
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
  /**
   * Ephemeral manual Goal-Oriented flow: which `/manual/preferences` variant (day vs week) navigation should target.
   * Not persisted.
   */
  manualGoalPreferencesScope: ManualGoalPreferencesScope;
  setManualGoalPreferencesScope: (scope: ManualGoalPreferencesScope) => void;
  setActiveGymProfile: (id: string) => void;
  addGymProfile: (profile: Omit<GymProfile, "id" | "isActive">) => void;
  updateGymProfile: (id: string, update: Partial<Pick<GymProfile, "name" | "equipment" | "dumbbellMaxWeight">>) => void;
  removeGymProfile: (id: string) => void;
  addPreferencePreset: (preset: Omit<PreferencePreset, "id">) => void;
  updatePreferencePreset: (id: string, update: Partial<Pick<PreferencePreset, "name" | "preferences">>) => void;
  removePreferencePreset: (id: string) => void;
  applyPreferencePreset: (id: string) => void;
  addSportPreset: (preset: Omit<SportPreset, "id">) => void;
  updateSportPreset: (id: string, update: Partial<Pick<SportPreset, "name" | "sportForm">>) => void;
  removeSportPreset: (id: string) => void;
  /** Queues the preset's sport form for one-shot hydration next time the sport-mode screen focuses. */
  applySportPreset: (id: string) => void;
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
  /** Active workout/week build session (filter → review → train). One at a time. */
  activeSessionDraft: SessionDraft | null;
  /** Begin or continue a flow; returns false if another flow's session is active (show conflict UI). */
  beginSessionFlow: (flow: SessionFlow) => boolean;
  /** Discard current session artifacts and start the given flow with last-edited filters for that mode. */
  replaceSessionFlow: (flow: SessionFlow) => void;
  /** Clear in-progress session (workout/week/plan artifacts + draft). Keeps per-mode last-edited filters. */
  discardActiveSession: () => void;
  updateActiveSessionDraft: (
    patch: Partial<
      Pick<SessionDraft, "phase" | "preferences" | "adaptiveSetup" | "weekSetup" | "gymProfileId">
    >
  ) => void;
  /** Sport-mode: persist local form for last-edited + active session. */
  commitSportFormSnapshot: (form: SportFormSnapshot) => void;
  /** One-shot hydration for sport-mode setup when resuming / starting with last-edited filters. */
  pendingSportFormHydration: SportFormSnapshot | null;
  consumeSportFormHydration: () => SportFormSnapshot | null;
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
    const { profiles, prefs, presets, sportPresets, history, saved } = data;
    if (profiles.length) {
      setGymProfiles(profiles);
      const active = profiles.find((p) => p.isActive) ?? profiles[0];
      setActiveGymProfileId(active?.id ?? null);
    }
    if (prefs) setManualPreferences(sanitizeManualPreferenceSubLayers(prefs));
    setPreferencePresets(presets);
    setSportPresets(sportPresets);
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
  const [sportPresets, setSportPresets] = useState<SportPreset[]>([]);
  const [sportPrepWeekPlan, setSportPrepWeekPlan] = useState<PlanWeekResult | null>(null);
  const [manualWeekPlan, setManualWeekPlan] = useState<ManualWeekPlan | null>(null);
  const [adaptiveSetup, setAdaptiveSetup] = useState<AdaptiveSetup | null>(null);
  const [manualGoalPreferencesScope, setManualGoalPreferencesScope] =
    useState<ManualGoalPreferencesScope>("day");
  const [activeSessionDraft, setActiveSessionDraft] = useState<SessionDraft | null>(null);
  const lastEditedFiltersByModeRef = useRef<LastEditedFiltersByMode>({});
  const [pendingSportFormHydration, setPendingSportFormHydration] =
    useState<SportFormSnapshot | null>(null);
  const lastSportFormSnapshotRef = useRef<SportFormSnapshot | null>(null);
  const activeSessionDraftRef = useRef<SessionDraft | null>(null);
  const manualPreferencesRef = useRef(manualPreferences);
  manualPreferencesRef.current = manualPreferences;
  activeSessionDraftRef.current = activeSessionDraft;
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
    void loadLastEditedFiltersByMode().then((data) => {
      lastEditedFiltersByModeRef.current = data;
    });
  }, []);

  const activeGymName = useMemo(
    () => gymProfiles.find((g) => g.id === activeGymProfileId)?.name ?? null,
    [gymProfiles, activeGymProfileId]
  );

  const persistLastEditedForFlow = useCallback(
    (flow: SessionFlow, snapshot: ModeFilterSnapshot) => {
      void persistModeFilterSnapshot(flow, snapshot, lastEditedFiltersByModeRef.current).then(
        (next) => {
          lastEditedFiltersByModeRef.current = next;
        }
      );
    },
    []
  );

  const applyLastEditedFiltersForFlow = useCallback(
    (flow: SessionFlow) => {
      const snap = lastEditedFiltersByModeRef.current[flow];
      if (snap?.manualPreferences) {
        setManualPreferences(sanitizeManualPreferenceSubLayers(snap.manualPreferences));
      }
      if (snap?.adaptiveSetup !== undefined) {
        setAdaptiveSetup(snap.adaptiveSetup ?? null);
      }
      if (snap?.sportForm) {
        setPendingSportFormHydration(snap.sportForm);
        lastSportFormSnapshotRef.current = snap.sportForm;
      }
      return snap ?? null;
    },
    []
  );

  const clearSessionArtifacts = useCallback(() => {
    setManualWeekPlan(null);
    setGeneratedWorkout(null);
    setResumeProgress(null);
    setManualSessionProgress(null);
    setManualExecutionStarted(false);
    setSportPrepWeekPlan(null);
    setAdaptiveSetup(null);
    setManualGoalPreferencesScope("day");
  }, []);

  const discardActiveSession = useCallback(() => {
    clearSessionArtifacts();
    setActiveSessionDraft(null);
  }, [clearSessionArtifacts]);

  const startSessionForFlow = useCallback(
    (flow: SessionFlow) => {
      const snap = applyLastEditedFiltersForFlow(flow);
      const prefs = snap?.manualPreferences
        ? sanitizeManualPreferenceSubLayers(snap.manualPreferences)
        : manualPreferences;
      if (snap?.manualPreferences) {
        setManualPreferences(prefs);
      }
      setManualGoalPreferencesScope(flow === "goal_week" ? "week" : "day");
      const draft = createSessionDraft({
        flow,
        preferences: prefs,
        gymProfileId: activeGymProfileId,
        gymName: activeGymName,
        adaptiveSetup: snap?.adaptiveSetup ?? null,
        weekSetup: snap?.weekSetup ?? null,
        phase: inferSessionPhase({
          flow,
          generatedWorkout,
          manualWeekPlan,
          sportPrepWeekPlan,
          manualExecutionStarted,
          weekSetup: snap?.weekSetup ?? null,
          adaptiveSetup: snap?.adaptiveSetup ?? null,
        }),
      });
      setActiveSessionDraft(draft);
    },
    [
      applyLastEditedFiltersForFlow,
      manualPreferences,
      activeGymProfileId,
      activeGymName,
      generatedWorkout,
      manualWeekPlan,
      sportPrepWeekPlan,
      manualExecutionStarted,
    ]
  );

  const beginSessionFlow = useCallback(
    (flow: SessionFlow): boolean => {
      if (activeSessionDraft != null && activeSessionDraft.flow !== flow) {
        return false;
      }
      if (activeSessionDraft?.flow === flow) {
        return true;
      }
      startSessionForFlow(flow);
      return true;
    },
    [activeSessionDraft, startSessionForFlow]
  );

  const replaceSessionFlow = useCallback(
    (flow: SessionFlow) => {
      discardActiveSession();
      startSessionForFlow(flow);
    },
    [discardActiveSession, startSessionForFlow]
  );

  const updateActiveSessionDraft = useCallback(
    (
      patch: Partial<
        Pick<SessionDraft, "phase" | "preferences" | "adaptiveSetup" | "weekSetup" | "gymProfileId">
      >
    ) => {
      setActiveSessionDraft((prev) => {
        if (!prev) return prev;
        if (isActiveSessionDraftPatchNoOp(prev, patch)) return prev;
        const next = patchSessionDraft(prev, { ...patch, gymName: activeGymName });
        if (patch.weekSetup != null || patch.adaptiveSetup !== undefined) {
          const snapshot: ModeFilterSnapshot = {
            manualPreferences: next.preferences,
            adaptiveSetup: next.adaptiveSetup,
            sportForm: lastSportFormSnapshotRef.current,
            weekSetup: next.weekSetup,
            updatedAt: Date.now(),
          };
          persistLastEditedForFlow(next.flow, snapshot);
        }
        return next;
      });
    },
    [activeGymName, persistLastEditedForFlow]
  );

  const commitSportFormSnapshot = useCallback(
    (form: SportFormSnapshot) => {
      lastSportFormSnapshotRef.current = form;
      const draft = activeSessionDraftRef.current;
      if (!draft?.flow.startsWith("sport")) return;
      const snapshot: ModeFilterSnapshot = {
        manualPreferences: manualPreferencesRef.current,
        adaptiveSetup: draft.adaptiveSetup,
        sportForm: form,
        weekSetup: draft.weekSetup,
        updatedAt: Date.now(),
      };
      persistLastEditedForFlow(draft.flow, snapshot);
    },
    [persistLastEditedForFlow]
  );

  const consumeSportFormHydration = useCallback((): SportFormSnapshot | null => {
    let next: SportFormSnapshot | null = null;
    setPendingSportFormHydration((prev) => {
      next = prev;
      return null;
    });
    return next;
  }, []);

  useEffect(() => {
    setActiveSessionDraft((prev) => {
      if (!prev) return prev;
      const phase = inferSessionPhase({
        flow: prev.flow,
        generatedWorkout,
        manualWeekPlan,
        sportPrepWeekPlan,
        manualExecutionStarted,
        weekSetup: prev.weekSetup,
        adaptiveSetup: prev.adaptiveSetup ?? adaptiveSetup,
      });
      const preferences = manualPreferences;
      if (
        phase === prev.phase &&
        preferences === prev.preferences &&
        (prev.adaptiveSetup ?? null) === (adaptiveSetup ?? null)
      ) {
        return prev;
      }
      return patchSessionDraft(
        prev,
        {
          phase,
          preferences,
          adaptiveSetup: adaptiveSetup ?? prev.adaptiveSetup,
          gymName: activeGymName,
        },
        { sportPrepWeekPlan }
      );
    });
  }, [
    generatedWorkout,
    manualWeekPlan,
    sportPrepWeekPlan,
    manualExecutionStarted,
    manualPreferences,
    adaptiveSetup,
    activeGymName,
  ]);

  /** Hydrate session draft when legacy in-progress artifacts exist without a draft. */
  useEffect(() => {
    if (activeSessionDraft != null) return;
    if (sportPrepWeekPlan != null) {
      const gymDays = sportPrepWeekPlan.scheduleSnapshot?.gymDaysPerWeek ?? 0;
      const flow: SessionFlow = gymDays === 1 ? "sport_day" : "sport_week";
      setActiveSessionDraft(
        createSessionDraft({
          flow,
          preferences: manualPreferences,
          gymProfileId: activeGymProfileId,
          gymName: activeGymName,
          adaptiveSetup,
          phase: inferSessionPhase({
            flow,
            generatedWorkout,
            manualWeekPlan,
            sportPrepWeekPlan,
            manualExecutionStarted,
            weekSetup: null,
            adaptiveSetup,
          }),
        })
      );
      return;
    }
    if (manualWeekPlan != null && manualWeekPlan.days.length > 0) {
      const flow: SessionFlow = manualWeekPlan.days.length === 1 ? "goal_day" : "goal_week";
      setManualGoalPreferencesScope(flow === "goal_week" ? "week" : "day");
      setActiveSessionDraft(
        createSessionDraft({
          flow,
          preferences: manualPreferences,
          gymProfileId: activeGymProfileId,
          gymName: activeGymName,
          phase: inferSessionPhase({
            flow,
            generatedWorkout,
            manualWeekPlan,
            sportPrepWeekPlan,
            manualExecutionStarted,
            weekSetup: null,
            adaptiveSetup,
          }),
        })
      );
      return;
    }
    if (generatedWorkout != null) {
      const flow = sessionFlowFromManualScope(manualGoalPreferencesScope);
      setActiveSessionDraft(
        createSessionDraft({
          flow,
          preferences: manualPreferences,
          gymProfileId: activeGymProfileId,
          gymName: activeGymName,
          phase: inferSessionPhase({
            flow,
            generatedWorkout,
            manualWeekPlan,
            sportPrepWeekPlan,
            manualExecutionStarted,
            weekSetup: null,
            adaptiveSetup,
          }),
        })
      );
    }
  }, [
    activeSessionDraft,
    sportPrepWeekPlan,
    manualWeekPlan,
    generatedWorkout,
    manualPreferences,
    activeGymProfileId,
    activeGymName,
    adaptiveSetup,
    manualExecutionStarted,
    manualGoalPreferencesScope,
  ]);

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

  const addSportPreset = useCallback((preset: Omit<SportPreset, "id">) => {
    if (persist && userId) {
      touchPersistedStateDuringRemoteLoad();
      void persistWithHandling({
        operation: "addSportPreset",
        action: async () => {
          const p = await SportPresetsRepo.addSportPreset(userId, preset);
          setSportPresets((prev) => [...prev, p]);
        },
        onFailure: notifySaveFailed,
      });
    } else {
      setSportPresets((prev) => [
        ...prev,
        { ...preset, id: `sport_preset_${Date.now()}` },
      ]);
    }
  }, [userId, persist, touchPersistedStateDuringRemoteLoad, notifySaveFailed]);

  const updateSportPreset = useCallback((id: string, update: Partial<Pick<SportPreset, "name" | "sportForm">>) => {
    const previousSnapshot = sportPresets.find((p) => p.id === id);
    setSportPresets((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...update } : p))
    );
    if (persist && userId && previousSnapshot != null) {
      touchPersistedStateDuringRemoteLoad();
      void persistWithHandling({
        operation: "updateSportPreset",
        action: () => SportPresetsRepo.updateSportPreset(userId, id, update),
        rollback: () =>
          setSportPresets((prev) =>
            prev.map((p) => (p.id === id ? previousSnapshot : p))
          ),
        onFailure: notifySaveFailed,
      });
    }
  }, [userId, persist, sportPresets, touchPersistedStateDuringRemoteLoad, notifySaveFailed]);

  const removeSportPreset = useCallback((id: string) => {
    const removed = sportPresets.find((p) => p.id === id);
    const removedIndex = sportPresets.findIndex((p) => p.id === id);
    setSportPresets((prev) => prev.filter((p) => p.id !== id));
    if (persist && userId && removed != null) {
      touchPersistedStateDuringRemoteLoad();
      void persistWithHandling({
        operation: "removeSportPreset",
        action: () => SportPresetsRepo.removeSportPreset(userId, id),
        rollback: () =>
          setSportPresets((prev) => {
            if (prev.some((p) => p.id === id)) return prev;
            const next = [...prev];
            const i = Math.min(Math.max(removedIndex, 0), next.length);
            next.splice(i, 0, removed);
            return next;
          }),
        onFailure: notifySaveFailed,
      });
    }
  }, [userId, persist, sportPresets, touchPersistedStateDuringRemoteLoad, notifySaveFailed]);

  const updateManualPreferences = useCallback((update: Partial<ManualPreferences>) => {
    setManualPreferences((prev) => {
      const next = sanitizeManualPreferenceSubLayers({ ...prev, ...update });
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
      setActiveSessionDraft((draft) => {
        if (!draft) return draft;
        const patched = patchSessionDraft(draft, { preferences: next, gymName: activeGymName });
        const snapshot: ModeFilterSnapshot = {
          manualPreferences: next,
          adaptiveSetup: patched.adaptiveSetup,
          sportForm: lastSportFormSnapshotRef.current,
          weekSetup: patched.weekSetup,
          updatedAt: Date.now(),
        };
        persistLastEditedForFlow(draft.flow, snapshot);
        return patched;
      });
      return next;
    });
  }, [
    userId,
    persist,
    touchPersistedStateDuringRemoteLoad,
    notifySaveFailed,
    activeGymName,
    persistLastEditedForFlow,
  ]);

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
      sportPresets,
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
      manualGoalPreferencesScope,
      setManualGoalPreferencesScope,
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
        setManualPreferences(sanitizeManualPreferenceSubLayers(preset.preferences));
      },
      addSportPreset,
      updateSportPreset,
      removeSportPreset,
      applySportPreset: (id) => {
        const preset = sportPresets.find((p) => p.id === id);
        if (!preset) return;
        if (persist && userId) touchPersistedStateDuringRemoteLoad();
        lastSportFormSnapshotRef.current = preset.sportForm;
        setPendingSportFormHydration(preset.sportForm);
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
      activeSessionDraft,
      beginSessionFlow,
      replaceSessionFlow,
      discardActiveSession,
      updateActiveSessionDraft,
      commitSportFormSnapshot,
      pendingSportFormHydration,
      consumeSportFormHydration,
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
      sportPresets,
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
      manualGoalPreferencesScope,
      activeSessionDraft,
      beginSessionFlow,
      replaceSessionFlow,
      discardActiveSession,
      updateActiveSessionDraft,
      commitSportFormSnapshot,
      pendingSportFormHydration,
      consumeSportFormHydration,
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
      addSportPreset,
      updateSportPreset,
      removeSportPreset,
      updateManualPreferences,
      addCompletedWorkout,
      updateWorkoutHistoryItem,
      addSavedWorkout,
      removeSavedWorkout,
      removeSavedWorkoutByWorkoutId,
      setSportPrepWeekPlan,
      setManualWeekPlan,
      setAdaptiveSetup,
      setManualGoalPreferencesScope,
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
