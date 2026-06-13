/**
 * Canonical goal identity: UI label ↔ DB goal slug ↔ generator PrimaryGoal.
 * Single import surface for adapters and intent resolution (reduces silent sub-focus drops).
 */

import type { PrimaryGoal } from "../logic/workoutGeneration/types";
import {
  GOAL_SLUG_TO_LABEL,
  GOAL_SLUG_TO_PRIMARY_FOCUS,
  PRIMARY_FOCUS_TO_GOAL_SLUG,
} from "./goalSlugMapping";
import { canonicalGoalSubFocusLabel } from "../data/goalSubFocus";

export { canonicalGoalSubFocusLabel };

/** DB / sub-focus slug → generator PrimaryGoal. */
export function goalSlugToPrimaryGoal(slug: string): PrimaryGoal {
  const map: Record<string, PrimaryGoal> = {
    strength: "strength",
    muscle: "hypertrophy",
    physique: "body_recomp",
    conditioning: "conditioning",
    endurance: "endurance",
    mobility: "recovery_mobility",
    resilience: "recovery_mobility",
    recovery_mobility: "recovery_mobility",
    joint_health: "joint_health",
    calisthenics: "calisthenics",
    athletic_performance: "athletic_performance",
    power: "power",
  };
  return map[slug] ?? "strength";
}

/** Primary focus UI label → generator PrimaryGoal (via goal slug). */
export function primaryFocusLabelToPrimaryGoal(label: string): PrimaryGoal {
  if (label === "Sport preparation") return "strength";
  if (label.includes("Power")) return "power";
  const lower = label.toLowerCase();
  if (lower === "hypertrophy" || lower.includes("build muscle") || lower.includes("muscle (hypertrophy)")) {
    return "hypertrophy";
  }
  if (lower.includes("endurance") || lower.includes("engine")) return "endurance";
  if (lower.includes("strength training for joint health") || (lower.includes("joint health") && !lower.includes("mobility"))) {
    return "joint_health";
  }
  if (lower.includes("recovery") && lower.includes("mobility")) return "recovery_mobility";
  if (lower.includes("mobility") || lower.includes("recovery") || lower.includes("prehab")) return "recovery_mobility";
  if (label.includes("Athletic")) return "athletic_performance";
  if (label.includes("Calisthenics")) return "calisthenics";
  return goalSlugToPrimaryGoal(primaryFocusLabelToGoalSlug(label));
}

/** Primary focus UI label → sub-focus / DB goal slug. */
export function primaryFocusLabelToGoalSlug(label: string): string {
  const canonical = canonicalGoalSubFocusLabel(label);
  return (
    PRIMARY_FOCUS_TO_GOAL_SLUG[canonical] ??
    PRIMARY_FOCUS_TO_GOAL_SLUG[label] ??
    canonical.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")
  );
}

export function goalSlugToDisplayLabel(slug: string): string {
  return GOAL_SLUG_TO_LABEL[slug] ?? slug.replace(/_/g, " ");
}

export function goalSlugToPrimaryFocusLabel(slug: string): string | undefined {
  return GOAL_SLUG_TO_PRIMARY_FOCUS[slug];
}
