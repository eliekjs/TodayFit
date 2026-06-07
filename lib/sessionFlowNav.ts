import type { SessionFlow, SessionPhase } from "./sessionDraft";
import { SESSION_PHASES } from "./sessionDraft";
import { manualGoalPreferencesHref } from "./manualGoalPreferencesHref";

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

export function weekPreferencesHref(): string {
  return manualGoalPreferencesHref("week");
}

/** Default back action label targeting the previous session phase. */
export function backLabelForPhase(targetPhase: SessionPhase): string {
  const match = SESSION_PHASES.find((p) => p.key === targetPhase);
  return match?.label ?? "Back";
}
