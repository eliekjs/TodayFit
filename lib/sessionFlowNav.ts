import type { AdaptiveSetup } from "../context/appStateModel";
import type { SessionFlow, SessionPhase } from "./sessionFlowTypes";
import { SESSION_PHASES } from "./sessionFlowTypes";
import { manualGoalPreferencesHref } from "./manualGoalPreferencesHref";
import { ACTIVE_WEEK_ROUTE } from "./weekProgress";

export { sportSetupRouteWhenNoPlan } from "./sessionFlowRoutes";

export type FlowNavAction = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
};

/** Query flag when opening a plan editor from the Workout tab (not Create). */
export const EDIT_FROM_WORKOUT_PARAM = "from";
export const EDIT_FROM_WORKOUT_VALUE = "workout";

/** Edit href that returns to the Workout overview on back — not Create setup. */
export function editActivePlanHref(fullWeekRoute: string): string {
  const sep = fullWeekRoute.includes("?") ? "&" : "?";
  return `${fullWeekRoute}${sep}${EDIT_FROM_WORKOUT_PARAM}=${EDIT_FROM_WORKOUT_VALUE}`;
}

export function isEditFromWorkoutTab(
  params: { from?: string | string[] | undefined } | null | undefined
): boolean {
  const raw = params?.from;
  const from = Array.isArray(raw) ? raw[0] : raw;
  return from === EDIT_FROM_WORKOUT_VALUE;
}

/** Back from Train / editors into the active week or single-day overview. */
export function activeTrainingOverviewLabel(args: { singleDay: boolean }): string {
  return args.singleDay ? "Your workout" : "Your week";
}

export function activeTrainingOverviewHref(): string {
  return ACTIVE_WEEK_ROUTE;
}

export function phaseLabelBefore(current: SessionPhase): string | null {
  const idx = SESSION_PHASES.findIndex((p) => p.key === current);
  if (idx <= 0) return null;
  return SESSION_PHASES[idx - 1]!.label;
}

export function phaseLabelAfter(current: SessionPhase): string | null {
  const idx = SESSION_PHASES.findIndex((p) => p.key === current);
  if (idx < 0 || idx >= SESSION_PHASES.length - 1) return null;
  return SESSION_PHASES[idx + 1]!.label;
}

export function setupRouteForFlow(flow: SessionFlow): string {
  switch (flow) {
    case "goal_day":
      return "/manual/preferences";
    case "goal_week":
      return "/manual/preferences?scope=week";
    case "sport_day":
      return "/sport-mode?scope=day";
    case "sport_week":
      return "/sport-mode";
    default:
      return "/";
  }
}

export function reviewRouteForFlow(flow: SessionFlow): string {
  if (flow.startsWith("sport")) return "/sport-mode/recommendation";
  if (flow === "goal_week") return "/manual/week";
  return "/manual/workout";
}

type SportReviewNavContext = {
  sportPrepWeekPlan?: { scheduleSnapshot?: { gymDaysPerWeek?: number } } | null;
  adaptiveSetup?: AdaptiveSetup | null;
  /** True when the editor was opened from the Workout tab via Edit. */
  fromWorkoutTab?: boolean;
};

/** Header / phase back from sport review — never rely on router.back() (library Open, replace). */
export function sportReviewBackRoute(input: SportReviewNavContext): string {
  if (input.fromWorkoutTab) return ACTIVE_WEEK_ROUTE;
  const gymDays = input.sportPrepWeekPlan?.scheduleSnapshot?.gymDaysPerWeek;
  if (gymDays === 1) return "/sport-mode?scope=day";
  if (gymDays != null && gymDays > 1) return "/sport-mode/schedule";
  if (input.adaptiveSetup != null) return "/sport-mode/schedule";
  return "/sport-mode";
}

/** In-screen back label paired with {@link sportReviewBackRoute}. */
export function sportReviewBackLabel(input: SportReviewNavContext): string {
  if (input.fromWorkoutTab) {
    const gymDays = input.sportPrepWeekPlan?.scheduleSnapshot?.gymDaysPerWeek;
    return activeTrainingOverviewLabel({ singleDay: gymDays === 1 });
  }
  const gymDays = input.sportPrepWeekPlan?.scheduleSnapshot?.gymDaysPerWeek;
  if (gymDays === 1) return backLabelForPhase("setup");
  if ((gymDays != null && gymDays > 1) || input.adaptiveSetup != null) {
    return "Your schedule";
  }
  return backLabelForPhase("setup");
}

export function weekPreferencesHref(): string {
  return manualGoalPreferencesHref("week");
}

/** Default back action label targeting the previous session phase. */
export function backLabelForPhase(targetPhase: SessionPhase): string {
  const match = SESSION_PHASES.find((p) => p.key === targetPhase);
  return match?.label ?? "Back";
}
