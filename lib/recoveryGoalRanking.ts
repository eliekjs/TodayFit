/**
 * When Recovery & Mobility is combined with a training goal, demote recovery to
 * secondary so session structure (supersets, sets/reps) follows the load goal.
 * Recovery alone stays primary (stretch circuit + holds).
 *
 * Evidence: NSCA/ACSM session model — main training phase, then cooldown mobility.
 */

import type { PrimaryGoal } from "../logic/workoutGeneration/types";

const RECOVERY_GOAL_SLUGS = new Set<PrimaryGoal>([
  "recovery",
  "mobility",
  "recovery_mobility",
]);

export function isRecoveryStructureGoal(goal: PrimaryGoal): boolean {
  return RECOVERY_GOAL_SLUGS.has(goal);
}

/**
 * Resolve generator primary + secondary from ranked UI focus labels.
 * Preserves order among non-recovery goals; appends recovery last among secondaries.
 */
export function resolvePrimaryAndSecondaryGoalsFromFocus(
  focusLabels: readonly string[],
  mapLabel: (label: string) => PrimaryGoal
): { primary_goal: PrimaryGoal; secondary_goals: PrimaryGoal[] } {
  const mapped: PrimaryGoal[] = [];
  for (const label of focusLabels.slice(0, 3)) {
    if (!label) continue;
    const g = mapLabel(label);
    if (!mapped.includes(g)) mapped.push(g);
  }

  if (mapped.length === 0) {
    return { primary_goal: "strength", secondary_goals: [] };
  }

  const structureGoals = mapped.filter((g) => !isRecoveryStructureGoal(g));
  const recoveryGoals = mapped.filter((g) => isRecoveryStructureGoal(g));

  if (recoveryGoals.length > 0 && structureGoals.length > 0) {
    const primary_goal = structureGoals[0]!;
    const secondary_goals = [...structureGoals.slice(1), ...recoveryGoals]
      .filter((g) => g !== primary_goal)
      .slice(0, 2);
    return { primary_goal, secondary_goals };
  }

  return {
    primary_goal: mapped[0]!,
    secondary_goals: mapped.slice(1),
  };
}
