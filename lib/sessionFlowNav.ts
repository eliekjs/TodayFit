import type { AdaptiveSetup } from "../context/appStateModel";
import type { SessionFlow, SessionPhase } from "./sessionFlowTypes";
import { SESSION_PHASES } from "./sessionFlowTypes";
import { manualGoalPreferencesHref } from "./manualGoalPreferencesHref";

export { sportSetupRouteWhenNoPlan } from "./sessionFlowRoutes";

export type FlowNavAction = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
};

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
};

/** Header / phase back from sport review — never rely on router.back() (library Open, replace). */
export function sportReviewBackRoute(input: SportReviewNavContext): string {
  const gymDays = input.sportPrepWeekPlan?.scheduleSnapshot?.gymDaysPerWeek;
  if (gymDays === 1) return "/sport-mode?scope=day";
  if (gymDays != null && gymDays > 1) return "/sport-mode/schedule";
  if (input.adaptiveSetup != null) return "/sport-mode/schedule";
  return "/sport-mode";
}

/** In-screen back label paired with {@link sportReviewBackRoute}. */
export function sportReviewBackLabel(input: SportReviewNavContext): string {
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
