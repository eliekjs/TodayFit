import { defaultManualPreferences } from "../context/appStateModel";
import type { AdaptiveSetup } from "../context/appStateModel";
import type {
  ModeFilterSnapshot,
  SessionDraft,
  SessionFlow,
  WeekSetupDraft,
} from "./sessionDraft";
import { defaultSportFormSnapshot } from "./sportFormHydration";
import type { ManualPreferences } from "./types";

export function createBlankManualPreferences(): ManualPreferences {
  return {
    ...defaultManualPreferences,
    primaryFocus: [],
    targetModifier: [],
    injuries: [],
    upcoming: [],
    subFocusByGoal: {},
    subFocusPctByGoal: {},
    workoutStyle: [],
    preferredZone2Cardio: [],
  };
}

/** Filters for a brand-new session — never last-edited or leftover global prefs. */
export function blankFiltersForNewSession(flow: SessionFlow): {
  preferences: ManualPreferences;
  adaptiveSetup: AdaptiveSetup | null;
  weekSetup: WeekSetupDraft | null;
  sportForm: ModeFilterSnapshot["sportForm"];
} {
  return {
    preferences: createBlankManualPreferences(),
    adaptiveSetup: null,
    weekSetup: null,
    sportForm: flow.startsWith("sport") ? defaultSportFormSnapshot() : null,
  };
}

/** Prompt before Create / Start new when another session is already in progress. */
export function shouldPromptSessionFlowConflict(
  active: SessionDraft | null,
  nextFlow: SessionFlow,
  forceNewSession: boolean
): boolean {
  if (active == null) return false;
  if (forceNewSession) return true;
  return active.flow !== nextFlow;
}
