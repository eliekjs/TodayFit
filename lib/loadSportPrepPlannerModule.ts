/**
 * Cached dynamic import for the sport prep planner (generator stack + weekly templates).
 * Keeps the tab shell bundle smaller; loads when Sport Mode or schedule flows run.
 */
let sportPrepPlannerModule: Promise<typeof import("../services/sportPrepPlanner")> | null = null;

export function loadSportPrepPlannerModule(): Promise<
  typeof import("../services/sportPrepPlanner")
> {
  if (!sportPrepPlannerModule) {
    sportPrepPlannerModule = import("../services/sportPrepPlanner");
  }
  return sportPrepPlannerModule;
}
