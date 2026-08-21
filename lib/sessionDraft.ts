import type { AdaptiveSetup } from "../context/appStateModel";
import type { ManualPreferences, WeeklyBodyFocusMode } from "./types";
import { sportSetupRouteWhenNoPlan } from "./sessionFlowRoutes";
import type { SessionFlow, SessionPhase } from "./sessionFlowTypes";
export type { SessionFlow, SessionPhase } from "./sessionFlowTypes";
import { formatItemList } from "./formatItemList";

export type WeekSetupDraft = {
  /** User opened week builder (past preferences). */
  enteredWeekScreen: boolean;
  step: "pickDays" | "sessionFocus";
  selectedTrainingDays: number[];
  dayFocusChoiceIds: string[];
  dayBodyFocusChoiceIds?: string[];
  /** Per-day Region | Pattern | Muscle vocabulary (not a week-wide lock). */
  dayBodyFocusModes?: WeeklyBodyFocusMode[];
  /** Days the user edited — recommendations must not overwrite these picks. */
  daySessionFocusLocked?: boolean[];
  /** Fingerprint of goals/sub-focuses used to seed per-day recommendations. */
  recommendationSeed?: string;
};

/** Keep selected days, but always re-open weekday picking after returning to filters. */
export function weekSetupAtPickDays(
  ws: WeekSetupDraft | null | undefined
): WeekSetupDraft | null {
  if (ws == null) return null;
  if (ws.step === "pickDays") return ws;
  return { ...ws, step: "pickDays" };
}

export function weekSetupDraftEqual(
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
    (a.dayBodyFocusChoiceIds ?? []).every((id, i) => id === (b.dayBodyFocusChoiceIds ?? [])[i]) &&
    (a.dayBodyFocusModes ?? []).length === (b.dayBodyFocusModes ?? []).length &&
    (a.dayBodyFocusModes ?? []).every((id, i) => id === (b.dayBodyFocusModes ?? [])[i]) &&
    (a.daySessionFocusLocked ?? []).length === (b.daySessionFocusLocked ?? []).length &&
    (a.daySessionFocusLocked ?? []).every((v, i) => v === (b.daySessionFocusLocked ?? [])[i]) &&
    (a.recommendationSeed ?? "") === (b.recommendationSeed ?? "")
  );
}

/** Serialized sport-mode setup form (local UI state lifted for resume / last-edited). */
export type SportFormSnapshot = {
  rankedGoals: (string | null)[];
  intensityLevel: string;
  injuryStatus: string;
  injuryTypes: string[];
  sportFocusPct: [number, number];
  sportVsGoalPct: number;
  rankedSportSlugs: (string | null)[];
  subFocusBySport: Record<string, string[]>;
  oneDayDuration: number;
  oneDayBodyBias: "upper" | "lower" | "full";
};

export type ModeFilterSnapshot = {
  manualPreferences: ManualPreferences;
  adaptiveSetup?: AdaptiveSetup | null;
  sportForm?: SportFormSnapshot | null;
  weekSetup?: WeekSetupDraft | null;
  updatedAt: number;
};

/** Saved Sport-Focused Training preset (named snapshot of the sport-mode setup form). */
export type SportPreset = {
  id: string;
  name: string;
  savedAt: string;
  sportForm: SportFormSnapshot;
};

/** Kind of saved workout preset — mirrors the Home screen's goal vs sport split. */
export type WorkoutPresetKind = "goal" | "sport";

export type SessionDraft = {
  id: string;
  flow: SessionFlow;
  phase: SessionPhase;
  summary: string;
  resumeRoute: string;
  gymProfileId: string | null;
  preferences: ManualPreferences;
  adaptiveSetup: AdaptiveSetup | null;
  weekSetup: WeekSetupDraft | null;
  updatedAt: number;
};

export { SESSION_PHASES } from "./sessionFlowTypes";

export const SESSION_FLOW_LABELS: Record<SessionFlow, string> = {
  goal_day: "Goal · One day",
  goal_week: "Goal · Week plan",
  sport_day: "Sport · One day",
  sport_week: "Sport · Week plan",
};

export function sessionFlowFromManualScope(scope: "day" | "week"): SessionFlow {
  return scope === "week" ? "goal_week" : "goal_day";
}

export function sessionFlowFromSportScope(isOneDay: boolean): SessionFlow {
  return isOneDay ? "sport_day" : "sport_week";
}

function humanizeSportSlug(slug: string): string {
  return slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Focus label for continue-editing copy: primary goal or sport name. */
export function buildSessionFocusLabel(
  draft: Pick<SessionDraft, "flow" | "preferences" | "adaptiveSetup">
): string {
  if (draft.flow.startsWith("sport")) {
    const slug = draft.adaptiveSetup?.rankedSportSlugs?.find((s): s is string => s != null);
    return slug ? humanizeSportSlug(slug) : "Sport";
  }
  return draft.preferences.primaryFocus[0] ?? "Goal";
}

/** "workout" for one-day flows, "week" for week plans. */
export function buildSessionScopeNoun(flow: SessionFlow): "workout" | "week" {
  return flow.endsWith("_week") ? "week" : "workout";
}

/** Short banner subtitle: primary goal or sport, plus day vs week scope. */
export function buildSessionBannerDetails(
  draft: Pick<SessionDraft, "flow" | "preferences" | "adaptiveSetup">
): string {
  const scopeLabel = draft.flow.endsWith("_week") ? "Week" : "Day";
  return `${buildSessionFocusLabel(draft)} · ${scopeLabel}`;
}

/** Create-tab resume title, e.g. "Continue editing Hypertrophy week". */
export function buildContinueEditingLabel(
  draft: Pick<SessionDraft, "flow" | "preferences" | "adaptiveSetup">
): string {
  return `Continue editing ${buildSessionFocusLabel(draft)} ${buildSessionScopeNoun(draft.flow)}`;
}

export function buildSessionSummary(
  prefs: ManualPreferences,
  flow: SessionFlow,
  gymName?: string | null
): string {
  const parts: string[] = [];
  const goals = prefs.primaryFocus;
  if (goals.length > 0) {
    parts.push(formatItemList(goals));
  } else if (flow.startsWith("sport")) {
    parts.push("Sport session");
  } else {
    parts.push("New session");
  }
  if (flow === "goal_day" && prefs.targetBody) {
    parts.push(prefs.targetBody === "Full" ? "Full body" : prefs.targetBody);
  }
  if (prefs.durationMinutes != null) {
    parts.push(`${prefs.durationMinutes} min`);
  }
  if (gymName) parts.push(gymName);
  return parts.join(" · ");
}

export function getSessionResumeRoute(
  draft: Pick<SessionDraft, "flow" | "phase" | "weekSetup" | "adaptiveSetup">,
  sportPrepWeekPlan?: unknown | null
): string {
  if (draft.phase === "train") {
    return "/manual/execute";
  }
  if (draft.phase === "review") {
    if (draft.flow.startsWith("sport")) {
      if (sportPrepWeekPlan == null) {
        return sportSetupRouteWhenNoPlan({
          flow: draft.flow,
          adaptiveSetup: draft.adaptiveSetup,
        });
      }
      return "/sport-mode/recommendation";
    }
    if (draft.flow === "goal_week") return "/manual/week";
    return "/manual/workout";
  }
  switch (draft.flow) {
    case "goal_day":
      return "/manual/preferences";
    case "goal_week":
      if (draft.weekSetup?.enteredWeekScreen) return "/manual/week";
      return "/manual/preferences?scope=week";
    case "sport_day":
      return "/sport-mode?scope=day";
    case "sport_week":
      if (draft.adaptiveSetup != null) return "/sport-mode/schedule";
      return "/sport-mode";
    default:
      return "/";
  }
}

export type SessionPhaseInput = {
  flow: SessionFlow;
  generatedWorkout: unknown | null;
  manualWeekPlan: { days: unknown[] } | null;
  sportPrepWeekPlan: unknown | null;
  manualExecutionStarted: boolean;
  weekSetup: WeekSetupDraft | null;
  adaptiveSetup: AdaptiveSetup | null;
};

export function inferSessionPhase(input: SessionPhaseInput): SessionPhase {
  if (input.manualExecutionStarted) return "train";
  if (input.flow === "goal_day" && input.generatedWorkout != null) return "review";
  if (input.flow === "goal_week" && input.manualWeekPlan != null && input.manualWeekPlan.days.length > 0) {
    return "review";
  }
  if (input.flow.startsWith("sport") && input.sportPrepWeekPlan != null) return "review";
  return "setup";
}

/** True when the user is inside the workout/week build or execute flow. */
export function isSessionFlowScreen(pathname: string): boolean {
  return (
    pathname.includes("/manual/") ||
    pathname.includes("/sport-mode/") ||
    pathname.includes("/week/")
  );
}

/**
 * Create-flow editing screens (preferences, week builder, sport setup/review).
 * Excludes execute — that belongs to the Workout tab, not "continue creating".
 */
export function isCreateEditingFlowScreen(routeOrPath: string): boolean {
  const normalized = routeOrPath.replace(/^\//, "").replace(/\(tabs\)\//, "");
  if (normalized === "manual/execute" || normalized.startsWith("manual/execute?")) {
    return false;
  }
  return (
    normalized.startsWith("manual/") ||
    normalized.startsWith("sport-mode") ||
    normalized.includes("/manual/") ||
    normalized.includes("/sport-mode")
  );
}

/** Create tab home only — continue-editing never appears on Workout / Library / Profile. */
export function isCreateTabHome(pathname: string): boolean {
  const trimmed = pathname.replace(/\/+$/, "") || "/";
  if (trimmed === "/" || trimmed === "/index") return true;
  if (trimmed.endsWith("/(tabs)") || trimmed.endsWith("/(tabs)/index")) return true;
  return false;
}

/**
 * Floating resume banner — Create tab home only, and only while still building
 * (setup/review). Hidden during train and on every other tab.
 */
export function shouldShowSessionResumeBanner(
  pathname: string,
  draft?: Pick<SessionDraft, "phase"> | null
): boolean {
  if (!isCreateTabHome(pathname)) return false;
  if (draft != null && draft.phase === "train") return false;
  return true;
}

/** Flush strip under nav header: continue-editing title. */
export const SESSION_BANNER_HEIGHT = 64;

export function createSessionDraft(params: {
  flow: SessionFlow;
  preferences: ManualPreferences;
  gymProfileId: string | null;
  gymName?: string | null;
  adaptiveSetup?: AdaptiveSetup | null;
  weekSetup?: WeekSetupDraft | null;
  phase?: SessionPhase;
}): SessionDraft {
  const weekSetup = params.weekSetup ?? null;
  const adaptiveSetup = params.adaptiveSetup ?? null;
  const phase = params.phase ?? "setup";
  const base = {
    id: `session_${Date.now()}`,
    flow: params.flow,
    phase,
    gymProfileId: params.gymProfileId,
    preferences: params.preferences,
    adaptiveSetup,
    weekSetup,
    updatedAt: Date.now(),
  };
  return {
    ...base,
    summary: buildSessionSummary(params.preferences, params.flow, params.gymName),
    resumeRoute: getSessionResumeRoute({ ...base, phase, weekSetup, adaptiveSetup }),
  };
}

export function patchSessionDraft(
  draft: SessionDraft,
  patch: Partial<
    Pick<
      SessionDraft,
      "phase" | "preferences" | "adaptiveSetup" | "weekSetup" | "gymProfileId" | "summary"
    >
  > & { gymName?: string | null },
  options?: { sportPrepWeekPlan?: unknown | null }
): SessionDraft {
  const preferences = patch.preferences ?? draft.preferences;
  const adaptiveSetup = patch.adaptiveSetup !== undefined ? patch.adaptiveSetup : draft.adaptiveSetup;
  const weekSetup = patch.weekSetup !== undefined ? patch.weekSetup : draft.weekSetup;
  const phase = patch.phase ?? draft.phase;
  const gymName = patch.gymName;
  const summary =
    patch.summary ??
    buildSessionSummary(preferences, draft.flow, gymName ?? undefined);
  const next: SessionDraft = {
    ...draft,
    preferences,
    adaptiveSetup,
    weekSetup,
    phase,
    summary,
    updatedAt: Date.now(),
    resumeRoute: getSessionResumeRoute(
      { flow: draft.flow, phase, weekSetup, adaptiveSetup },
      options?.sportPrepWeekPlan
    ),
  };
  return next;
}
