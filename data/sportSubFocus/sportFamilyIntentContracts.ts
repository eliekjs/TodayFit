/**
 * FAMILY-based sport sub-focus intent contracts for stratified fidelity gates.
 *
 * Mirrors Manual `subGoalIntentContracts` but groups by transfer family
 * (jump, COD, pull-grip, endurance prep, …) — not one contract per sport×sub.
 *
 * Stratified audit samples: sport category × flagship sub-focus × gym × seeds.
 */

import type { Exercise } from "../../logic/workoutGeneration/types";
import {
  exerciseHasLowerBodyPlyoJumpSignal,
  exerciseIsMedBallPowerThrow,
  exercisePassesVerticalJumpTrainingGate,
} from "./verticalJumpSubFocusShared";
import {
  exerciseIsSprintOrCodDrill,
  exercisePassesSubFocusTrainingGate,
  normalizeSubFocusSlug,
} from "./subFocusIntentRegistry";
import {
  isEnduranceConditioningSportSubFocusSlug,
  tagSetHasStabilityPrehabSignal,
} from "./subFocusIntentArchetypes";
import { hardBanLegPressFamily } from "../../logic/workoutGeneration/sportProfileBanPredicates";

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
}

function blob(ex: Pick<Exercise, "id" | "name">): string {
  return norm(`${ex.id ?? ""}_${ex.name ?? ""}`);
}

function tagSet(ex: Exercise): Set<string> {
  const out = new Set<string>();
  for (const t of ex.tags?.attribute_tags ?? []) out.add(norm(t));
  for (const t of ex.tags?.stimulus ?? []) out.add(norm(String(t)));
  for (const t of ex.tags?.goal_tags ?? []) out.add(norm(t));
  for (const t of ex.tags?.sport_tags ?? []) out.add(norm(String(t)));
  if (ex.movement_pattern) out.add(norm(ex.movement_pattern));
  return out;
}

export type SportIntentFamilyId =
  | "jump_power"
  | "change_of_direction"
  | "speed_sprint"
  | "pull_grip"
  | "endurance_prep"
  | "stability_prehab";

export type SportFamilySample = {
  sportSlug: string;
  sportCategory: string;
  subFocusSlug: string;
  /** Body focus for the sample day. */
  targetBody: "Lower" | "Upper" | "Full";
};

export type SportFamilyIntentContract = {
  familyId: SportIntentFamilyId;
  displayName: string;
  intentSummary: string;
  /** Representative (category × flagship sub) cells for stratified audit. */
  stratifiedSamples: SportFamilySample[];
  matchesIntent: (exercise: Exercise) => boolean;
  isWeakProxy?: (exercise: Exercise) => boolean;
  minMatchingWorking?: number;
  minStrongMatches?: number;
  /** Soft anti-patterns for reports (not hard fails by themselves). */
  antiPatterns?: string[];
};

function exerciseIsPullGrip(ex: Exercise): boolean {
  const b = blob(ex);
  const tags = tagSet(ex);
  if (
    /pull.?up|chin.?up|dead.?hang|hangboard|lock.?off|finger.?board|campus|lat.?pulldown|bent.?over.?row|seated.?row|face.?pull|scapular/i.test(
      b
    )
  ) {
    return true;
  }
  if (
    tags.has("finger_strength") ||
    tags.has("grip_endurance") ||
    tags.has("pulling_strength") ||
    tags.has("vertical_pull") ||
    tags.has("lockoff_strength") ||
    tags.has("scapular_control")
  ) {
    return true;
  }
  return (
    (ex.movement_pattern === "pull" || norm(ex.primary_movement_family ?? "") === "upper_pull") &&
    !hardBanLegPressFamily(ex)
  );
}

function exerciseIsEndurancePrep(ex: Exercise): boolean {
  const b = blob(ex);
  const tags = tagSet(ex);
  if (/zone2|tempo|threshold|incline|hill|uphill|aerobic|eccentric|step.?down|nordic|lung/i.test(b)) {
    return true;
  }
  if (
    tags.has("aerobic_zone2") ||
    tags.has("eccentric") ||
    tags.has("eccentric_strength") ||
    tags.has("durability") ||
    tags.has("running_economy") ||
    tags.has("single_leg_strength")
  ) {
    return true;
  }
  return ex.modality === "conditioning" && !exerciseIsSprintOrCodDrill(ex);
}

function exerciseIsStabilityPrehab(ex: Exercise): boolean {
  const tags = tagSet(ex);
  if (tagSetHasStabilityPrehabSignal(tags)) return true;
  const b = blob(ex);
  return /single.?leg|balance|copenhagen|nordic|wall.?sit|step.?down|clamshell|hip.?abduct|tibialis|ankle|calf.?raise/i.test(
    b
  );
}

/** Canonical family contracts — shared matchers, stratified samples only. */
export const SPORT_FAMILY_INTENT_CONTRACTS: SportFamilyIntentContract[] = [
  {
    familyId: "jump_power",
    displayName: "Jump / vertical power",
    intentSummary:
      "Lower-body plyometrics and jump-transfer work; med-ball throws alone are weak proxies (PJT / NSCA).",
    stratifiedSamples: [
      {
        sportSlug: "basketball",
        sportCategory: "Court/Field",
        subFocusSlug: "vertical_jump",
        targetBody: "Lower",
      },
      {
        sportSlug: "volleyball",
        sportCategory: "Court/Field",
        subFocusSlug: "vertical_jump",
        targetBody: "Lower",
      },
    ],
    matchesIntent: (ex) => exercisePassesVerticalJumpTrainingGate(ex),
    isWeakProxy: (ex) => exerciseIsMedBallPowerThrow(ex) && !exerciseHasLowerBodyPlyoJumpSignal(ex),
    minMatchingWorking: 1,
    minStrongMatches: 1,
    antiPatterns: ["leg_press_family_in_power", "med_ball_only_jump_day"],
  },
  {
    familyId: "change_of_direction",
    displayName: "Change of direction / agility",
    intentSummary: "Deceleration, cut, and agility drills — not generic burpee metcon.",
    stratifiedSamples: [
      {
        sportSlug: "soccer",
        sportCategory: "Court/Field",
        subFocusSlug: "change_of_direction",
        targetBody: "Lower",
      },
      {
        sportSlug: "lacrosse",
        sportCategory: "Court/Field",
        subFocusSlug: "change_of_direction",
        targetBody: "Lower",
      },
    ],
    matchesIntent: (ex) =>
      exercisePassesSubFocusTrainingGate(ex, "change_of_direction") || exerciseIsSprintOrCodDrill(ex),
    isWeakProxy: (ex) =>
      /burpee|thruster|wall.?ball/i.test(blob(ex)) && !exerciseIsSprintOrCodDrill(ex),
    minMatchingWorking: 1,
    minStrongMatches: 1,
    antiPatterns: ["generic_metcon_as_cod"],
  },
  {
    familyId: "speed_sprint",
    displayName: "Speed / sprint / RSA",
    intentSummary: "Sprint mechanics, acceleration, or repeat-sprint patterns — not steady Zone 2.",
    stratifiedSamples: [
      {
        sportSlug: "soccer",
        sportCategory: "Court/Field",
        subFocusSlug: "speed",
        targetBody: "Lower",
      },
      {
        sportSlug: "american_football",
        sportCategory: "Court/Field",
        subFocusSlug: "speed_power",
        targetBody: "Lower",
      },
    ],
    matchesIntent: (ex) =>
      exercisePassesSubFocusTrainingGate(ex, "speed") ||
      exercisePassesSubFocusTrainingGate(ex, "speed_power") ||
      exerciseIsSprintOrCodDrill(ex),
    isWeakProxy: (ex) =>
      ex.modality === "conditioning" &&
      /zone\s*2|tempo run|aerobic base|long run/i.test(blob(ex)),
    minMatchingWorking: 1,
    minStrongMatches: 1,
    antiPatterns: ["zone2_on_speed_day"],
  },
  {
    familyId: "pull_grip",
    displayName: "Pull / grip (climbing & contact)",
    intentSummary: "Vertical pull, hang/grip, scapular control — not leg-press hypertrophy.",
    stratifiedSamples: [
      {
        sportSlug: "rock_climbing",
        sportCategory: "Climbing",
        subFocusSlug: "pull_strength",
        targetBody: "Upper",
      },
      {
        sportSlug: "rock_climbing",
        sportCategory: "Climbing",
        subFocusSlug: "finger_strength",
        targetBody: "Upper",
      },
      {
        sportSlug: "grappling",
        sportCategory: "Combat/Grappling",
        subFocusSlug: "grip_endurance",
        targetBody: "Full",
      },
    ],
    matchesIntent: (ex) =>
      exerciseIsPullGrip(ex) ||
      exercisePassesSubFocusTrainingGate(ex, "pull_strength") ||
      exercisePassesSubFocusTrainingGate(ex, "finger_strength") ||
      exercisePassesSubFocusTrainingGate(ex, "grip_endurance"),
    isWeakProxy: (ex) => hardBanLegPressFamily(ex),
    minMatchingWorking: 1,
    minStrongMatches: 1,
    antiPatterns: ["leg_press_on_climbing_day"],
  },
  {
    familyId: "endurance_prep",
    displayName: "Endurance / trail prep",
    intentSummary: "Aerobic engine and eccentric/durability patterns for outdoor endurance sports.",
    stratifiedSamples: [
      {
        sportSlug: "trail_running",
        sportCategory: "Endurance",
        subFocusSlug: "uphill_endurance",
        targetBody: "Lower",
      },
      {
        sportSlug: "road_running",
        sportCategory: "Endurance",
        subFocusSlug: "aerobic_base",
        targetBody: "Lower",
      },
    ],
    matchesIntent: (ex) => {
      const slugHints = ["uphill_endurance", "aerobic_base", "durability"];
      if (slugHints.some((s) => exercisePassesSubFocusTrainingGate(ex, s))) return true;
      return exerciseIsEndurancePrep(ex);
    },
    minMatchingWorking: 1,
    antiPatterns: ["machine_isolation_dominance"],
  },
  {
    familyId: "stability_prehab",
    displayName: "Stability / joint resilience",
    intentSummary: "Single-leg control, tendon resilience, and joint-stability patterns.",
    stratifiedSamples: [
      {
        sportSlug: "alpine_skiing",
        sportCategory: "Mountain/Snow",
        subFocusSlug: "knee_resilience",
        targetBody: "Lower",
      },
      {
        sportSlug: "trail_running",
        sportCategory: "Endurance",
        subFocusSlug: "ankle_stability",
        targetBody: "Lower",
      },
    ],
    matchesIntent: (ex) => {
      if (exerciseIsStabilityPrehab(ex)) return true;
      return (
        exercisePassesSubFocusTrainingGate(ex, "knee_resilience") ||
        exercisePassesSubFocusTrainingGate(ex, "ankle_stability")
      );
    },
    minMatchingWorking: 1,
    antiPatterns: ["high_impact_plyo_as_only_resilience"],
  },
];

export type SportStratifiedCell = {
  familyId: SportIntentFamilyId;
  sportSlug: string;
  sportCategory: string;
  subFocusSlug: string;
  targetBody: "Lower" | "Upper" | "Full";
  gymTemplate: "your_gym" | "hotel_gym";
  seed: number;
};

/** Expand family contracts into stratified audit cells (category × flagship × gym × seeds). */
export function buildSportStratifiedAuditCells(seeds: number[] = [88042, 99002]): SportStratifiedCell[] {
  const cells: SportStratifiedCell[] = [];
  const gyms: Array<"your_gym" | "hotel_gym"> = ["your_gym", "hotel_gym"];
  for (const contract of SPORT_FAMILY_INTENT_CONTRACTS) {
    for (const sample of contract.stratifiedSamples) {
      for (const gymTemplate of gyms) {
        for (const seed of seeds) {
          cells.push({
            familyId: contract.familyId,
            sportSlug: sample.sportSlug,
            sportCategory: sample.sportCategory,
            subFocusSlug: sample.subFocusSlug,
            targetBody: sample.targetBody,
            gymTemplate,
            seed,
          });
        }
      }
    }
  }
  return cells;
}

export function sportFamilyContractById(
  familyId: SportIntentFamilyId
): SportFamilyIntentContract | undefined {
  return SPORT_FAMILY_INTENT_CONTRACTS.find((c) => c.familyId === familyId);
}

export function familiesCoveredByContracts(): SportIntentFamilyId[] {
  return SPORT_FAMILY_INTENT_CONTRACTS.map((c) => c.familyId);
}

/** Sanity: endurance family samples should use endurance-classified subs. */
export function assertEnduranceFamilySamplesUseEnduranceSubs(): boolean {
  const c = sportFamilyContractById("endurance_prep");
  if (!c) return false;
  return c.stratifiedSamples.every((s) =>
    isEnduranceConditioningSportSubFocusSlug(normalizeSubFocusSlug(s.subFocusSlug)) ||
    ["uphill_endurance", "aerobic_base", "durability"].includes(normalizeSubFocusSlug(s.subFocusSlug))
  );
}
