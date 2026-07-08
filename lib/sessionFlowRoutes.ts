import type { AdaptiveSetup } from "../context/appStateModel";
import type { SessionFlow } from "./sessionFlowTypes";

/** Where to send users who hit sport review without a generated week plan. */
export function sportSetupRouteWhenNoPlan(input: {
  flow?: SessionFlow | null;
  adaptiveSetup?: AdaptiveSetup | null;
}): string {
  if (input.flow === "sport_day") return "/sport-mode?scope=day";
  if (input.adaptiveSetup != null) return "/sport-mode/schedule";
  return "/sport-mode";
}
