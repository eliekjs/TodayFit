/**
 * Research-backed intent contracts for Manual-mode goal sub-focuses.
 *
 * Each contract states what a user should see when they select that sub-goal alone,
 * plus anti-patterns that look related but fail the product expectation
 * (e.g. jump squats for "Olympic / Triple extension").
 *
 * Evidence anchors: NSCA Essentials / weightlifting position statement (power & Olympic
 * derivatives), ACSM Guidelines (aerobic base / threshold / intervals), ExRx movement
 * patterns (strength), NCSF athletic qualities, prior notes in docs/research/goal-sub-goals-audit-2025.md.
 */

import type { Exercise } from "../../logic/workoutGeneration/types";
import { PRIMARY_FOCUS_OPTIONS } from "../../lib/preferencesConstants";
import { GOAL_SUB_FOCUS_OPTIONS } from "./goalSubFocusOptions";
import { getSubFocusClass } from "./subFocusClassifications";
import { exerciseMatchesGoalSubFocusSlugUnified } from "../../logic/workoutGeneration/subFocusSlugMatch";
import {
  exerciseHasLowerBodyPlyoJumpSignal,
  exerciseIsMedBallPowerThrow,
} from "../sportSubFocus/verticalJumpSubFocusShared";
import {
  exerciseHasOlympicTripleExtensionNameSignal,
  exerciseMatchesOlympicTripleExtension,
} from "./olympicTripleExtensionShared";
import { exerciseHasSubFocusSlug } from "./conditioningSubFocus";

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
}

function blob(ex: Pick<Exercise, "id" | "name">): string {
  return norm(`${ex.id ?? ""}_${ex.name ?? ""}`);
}

function attrs(ex: Exercise): Set<string> {
  return new Set((ex.tags?.attribute_tags ?? []).map(norm));
}

function muscles(ex: Exercise): Set<string> {
  return new Set((ex.muscle_groups ?? []).map(norm));
}

function pattern(ex: Exercise): string {
  return norm(ex.movement_pattern ?? "");
}

/** Working-block exercise that satisfies the user's selected sub-goal intent. */
export type SubGoalIntentMatchFn = (exercise: Exercise) => boolean;

export type SubGoalIntentContract = {
  /** UI primary focus label from PRIMARY_FOCUS_OPTIONS. */
  primaryLabel: string;
  /** Display name of the sub-focus. */
  displayName: string;
  /** Canonical sub-focus slug. */
  slug: string;
  /** Internal goal slug used for unified matching / routing. */
  goalSlug: string;
  class: "intent" | "overlay";
  /** One-line research / product intent. */
  intentSummary: string;
  /**
   * Strict positive signal for working blocks. When omitted, falls back to
   * `exerciseMatchesGoalSubFocusSlugUnified(goalSlug, slug)`.
   */
  matchesIntent?: SubGoalIntentMatchFn;
  /**
   * Exercises that may unify-match but should not be the *only* / majority representation
   * of this sub-goal (e.g. jump squat for Olympic).
   */
  isWeakProxy?: SubGoalIntentMatchFn;
  /** Minimum matching working exercises required (default 1). */
  minMatchingWorking?: number;
  /**
   * Of matching working exercises, at least this many must NOT be weak proxies
   * (default: 1 when isWeakProxy is set, else 0).
   */
  minStrongMatches?: number;
};

function defaultMatch(goalSlug: string, slug: string): SubGoalIntentMatchFn {
  return (ex) => exerciseMatchesGoalSubFocusSlugUnified(ex, goalSlug, slug);
}

function isSprintLike(ex: Exercise): boolean {
  const b = blob(ex);
  return (
    exerciseHasSubFocusSlug(ex, "sprint") ||
    /\b(sprint|acceleration|shuttle|wall_drill|build.?up)\b/.test(b)
  );
}

function isCodLike(ex: Exercise): boolean {
  const b = blob(ex);
  const a = attrs(ex);
  return (
    a.has("agility") ||
    a.has("lateral_power") ||
    a.has("change_of_direction") ||
    /\b(skater|shuffle|cut|cod|lateral_bound|cone|ladder|carioca|decel)\b/.test(b)
  );
}

function isUpperPowerLike(ex: Exercise): boolean {
  if (exerciseHasSubFocusSlug(ex, "upper_body_power")) return true;
  const b = blob(ex);
  return /\b(med_ball|medicine_ball|wall_ball|slam|plyo_push|push_press|landmine_press)\b/.test(b);
}

function isPlyoJumpLike(ex: Exercise): boolean {
  return exerciseHasLowerBodyPlyoJumpSignal(ex) || exerciseHasSubFocusSlug(ex, "lower_body_power_plyos");
}

function isOlympicStrong(ex: Exercise): boolean {
  return (
    exerciseMatchesOlympicTripleExtension(ex) &&
    exerciseHasOlympicTripleExtensionNameSignal(ex) &&
    !/\b(jump_squat|box_jump|med_ball|kb_swing|kettlebell_swing)\b/.test(blob(ex))
  );
}

function isOlympicWeakProxy(ex: Exercise): boolean {
  const b = blob(ex);
  return /\b(jump_squat|box_jump|med_ball_slam|kb_swing|kettlebell_swing)\b/.test(b);
}

function isZone2Like(ex: Exercise): boolean {
  if (exerciseHasSubFocusSlug(ex, "zone2_aerobic_base") || exerciseHasSubFocusSlug(ex, "zone2_long_steady")) {
    return true;
  }
  const b = blob(ex);
  const stim = (ex.tags?.stimulus ?? []).map(norm);
  return (
    stim.includes("aerobic_zone2") ||
    (/\b(zone2|zone_2|easy_run|steady|recovery_run)\b/.test(b) &&
      !/\b(sprint|interval|hiit|threshold)\b/.test(b))
  );
}

function isThresholdLike(ex: Exercise): boolean {
  return exerciseHasSubFocusSlug(ex, "threshold_tempo");
}

function isIntervalsLike(ex: Exercise): boolean {
  return (
    exerciseHasSubFocusSlug(ex, "intervals_hiit") ||
    exerciseHasSubFocusSlug(ex, "intervals")
  );
}

function isHillsLike(ex: Exercise): boolean {
  return exerciseHasSubFocusSlug(ex, "hills") || /\b(hill|incline|stair|sled_push|sled_drag)\b/.test(blob(ex));
}

function isDurabilityLike(ex: Exercise): boolean {
  return exerciseHasSubFocusSlug(ex, "durability");
}

/** Athletic Performance intent contracts (strict signatures where soft tags blur intents). */
const ATHLETIC_INTENT_OVERRIDES: Partial<
  Record<string, Pick<SubGoalIntentContract, "intentSummary" | "matchesIntent" | "isWeakProxy" | "minStrongMatches" | "minMatchingWorking">>
> = {
  speed_sprint: {
    intentSummary:
      "Linear speed / acceleration mechanics (NSCA speed-strength): sprints, wall drills, starts — not generic hypertrophy.",
    matchesIntent: isSprintLike,
    isWeakProxy: (ex) => isPlyoJumpLike(ex) && !isSprintLike(ex),
    minStrongMatches: 1,
  },
  vertical_jump: {
    intentSummary:
      "Vertical jump power via lower-body plyometrics and jump-specific work (PJT meta-analyses); med-ball throws are weak proxies.",
    matchesIntent: (ex) =>
      exerciseHasLowerBodyPlyoJumpSignal(ex) || exerciseHasSubFocusSlug(ex, "vertical_jump"),
    isWeakProxy: exerciseIsMedBallPowerThrow,
    minStrongMatches: 1,
  },
  power_explosive: {
    intentSummary:
      "General explosive power (NSCA power taxonomy): loaded or bodyweight explosive compounds, not only steady cardio.",
    matchesIntent: (ex) =>
      ex.modality === "power" ||
      (ex.tags?.goal_tags ?? []).map(norm).includes("power") ||
      attrs(ex).has("plyometric") ||
      attrs(ex).has("explosive_power"),
  },
  agility_cod: {
    intentSummary:
      "Change-of-direction / lateral agility (NCSF): cuts, shuffles, skaters, decel — not static balance holds alone.",
    matchesIntent: isCodLike,
    isWeakProxy: (ex) =>
      (attrs(ex).has("balance") || attrs(ex).has("single_leg")) && !isCodLike(ex),
    minStrongMatches: 1,
  },
  lower_body_power_plyos: {
    intentSummary:
      "Lower-body plyometrics / reactive jumps (NSCA plyometric progression) — distinct from Olympic catching lifts.",
    matchesIntent: isPlyoJumpLike,
    isWeakProxy: (ex) => isOlympicStrong(ex) && !isPlyoJumpLike(ex),
    minStrongMatches: 1,
  },
  olympic_triple_extension: {
    intentSummary:
      "Olympic weightlifting derivatives (NSCA position statement): clean/snatch/jerk/high-pull triple extension — not bare jump squats.",
    matchesIntent: isOlympicStrong,
    isWeakProxy: isOlympicWeakProxy,
    minStrongMatches: 1,
  },
  upper_body_power: {
    intentSummary:
      "Upper-body explosive throws/presses (med-ball, push press, plyo push) — not lower plyos alone.",
    matchesIntent: isUpperPowerLike,
    isWeakProxy: (ex) => isPlyoJumpLike(ex) && !isUpperPowerLike(ex),
    minStrongMatches: 1,
  },
  zone2_aerobic_base: {
    intentSummary: "Steady aerobic base (ACSM Zone 2) — sustained easy cardio, not HIIT bursts.",
    matchesIntent: isZone2Like,
    isWeakProxy: (ex) => isIntervalsLike(ex) && !isZone2Like(ex),
    minStrongMatches: 1,
  },
  intervals_hiit: {
    intentSummary: "High-intensity intervals / anaerobic bursts (ACSM HIIT) — not long Zone 2 only.",
    matchesIntent: isIntervalsLike,
    isWeakProxy: (ex) => isZone2Like(ex) && !isIntervalsLike(ex),
    minStrongMatches: 1,
  },
  threshold_tempo: {
    intentSummary: "Sustained hard aerobic / tempo (ACSM threshold) — not sprint starts or easy Zone 2.",
    matchesIntent: isThresholdLike,
    isWeakProxy: (ex) => (isSprintLike(ex) || isZone2Like(ex)) && !isThresholdLike(ex),
    minStrongMatches: 1,
  },
  hills: {
    intentSummary: "Uphill / incline / sled hill stimulus — not flat Zone 2 or pure sprint mechanics.",
    matchesIntent: isHillsLike,
    minStrongMatches: 1,
  },
};

const ENDURANCE_OVERRIDES: typeof ATHLETIC_INTENT_OVERRIDES = {
  zone2_long_steady: {
    intentSummary: "Long steady Zone 2 aerobic work (ACSM).",
    matchesIntent: isZone2Like,
    minStrongMatches: 1,
  },
  threshold_tempo: ATHLETIC_INTENT_OVERRIDES.threshold_tempo,
  intervals: {
    intentSummary: "Endurance intervals (ACSM) — hard repeats, not only Zone 2.",
    matchesIntent: isIntervalsLike,
    minStrongMatches: 1,
  },
  hills: ATHLETIC_INTENT_OVERRIDES.hills,
  durability: {
    intentSummary: "Tissue durability / long-session resilience work for endurance athletes.",
    matchesIntent: isDurabilityLike,
    minStrongMatches: 1,
  },
};

const STRENGTH_OVERRIDES: typeof ATHLETIC_INTENT_OVERRIDES = {
  squat: {
    intentSummary: "Squat-pattern strength (NSCA/ExRx) — knee-dominant compounds.",
    matchesIntent: defaultMatch("strength", "squat"),
  },
  deadlift_hinge: {
    intentSummary: "Hinge / deadlift-pattern strength (NSCA/ExRx).",
    matchesIntent: defaultMatch("strength", "deadlift_hinge"),
  },
  bench_press: {
    intentSummary: "Horizontal press strength (bench / press family).",
    matchesIntent: defaultMatch("strength", "bench_press"),
  },
  overhead_press: {
    intentSummary: "Vertical press strength (OHP / push press family).",
    matchesIntent: defaultMatch("strength", "overhead_press"),
  },
  pull: {
    intentSummary: "Vertical/horizontal pull strength (pull-ups, rows).",
    matchesIntent: defaultMatch("strength", "pull"),
  },
};

function hypertrophyOverride(slug: string, summary: string): typeof ATHLETIC_INTENT_OVERRIDES[string] {
  return {
    intentSummary: summary,
    matchesIntent: defaultMatch("muscle", slug),
  };
}

const MUSCLE_OVERRIDES: typeof ATHLETIC_INTENT_OVERRIDES = {
  glutes: hypertrophyOverride("glutes", "Glute-emphasized hypertrophy (ExRx region)."),
  back: hypertrophyOverride("back", "Back-emphasized hypertrophy."),
  chest: hypertrophyOverride("chest", "Chest-emphasized hypertrophy."),
  arms: hypertrophyOverride("arms", "Arm-emphasized hypertrophy."),
  shoulders: hypertrophyOverride("shoulders", "Shoulder-emphasized hypertrophy."),
  legs: hypertrophyOverride("legs", "Leg-emphasized hypertrophy."),
  core: hypertrophyOverride("core", "Core-emphasized hypertrophy / stability."),
  balanced: {
    intentSummary: "Balanced full-body hypertrophy without a single-region monopoly.",
    matchesIntent: defaultMatch("muscle", "balanced"),
    minMatchingWorking: 0, // soft: any session ok if unified balanced matches appear or compounds span regions
  },
};

const CALISTHENICS_OVERRIDES: typeof ATHLETIC_INTENT_OVERRIDES = {
  full_body_calisthenics: {
    intentSummary: "General bodyweight strength across patterns.",
    matchesIntent: defaultMatch("calisthenics", "full_body_calisthenics"),
  },
  legs_pistol: {
    intentSummary: "Single-leg / pistol progressions.",
    matchesIntent: defaultMatch("calisthenics", "legs_pistol"),
  },
  pull_ups: {
    intentSummary: "Pull-up family vertical pulls.",
    matchesIntent: defaultMatch("calisthenics", "pull_ups"),
  },
  push_ups: {
    intentSummary: "Push-up family horizontal presses.",
    matchesIntent: defaultMatch("calisthenics", "push_ups"),
  },
  dips: {
    intentSummary: "Dip family vertical presses.",
    matchesIntent: defaultMatch("calisthenics", "dips"),
  },
  handstand: {
    intentSummary: "Handstand / inverted balance & pressing progressions.",
    matchesIntent: defaultMatch("calisthenics", "handstand"),
  },
  core: {
    intentSummary: "Calisthenics core control.",
    matchesIntent: defaultMatch("calisthenics", "core"),
  },
  front_lever_advanced: {
    intentSummary: "Front-lever / advanced gymnastics pulls.",
    matchesIntent: defaultMatch("calisthenics", "front_lever_advanced"),
  },
};

const RECOVERY_OVERRIDES: typeof ATHLETIC_INTENT_OVERRIDES = {
  hips: {
    intentSummary: "Hip mobility / soft-tissue recovery (ACSM/NCSF regional).",
    matchesIntent: defaultMatch("recovery_mobility", "hips"),
    minMatchingWorking: 2,
  },
  shoulders: {
    intentSummary: "Shoulder mobility / recovery.",
    matchesIntent: defaultMatch("recovery_mobility", "shoulders"),
    minMatchingWorking: 2,
  },
  t_spine: {
    intentSummary: "Thoracic spine mobility.",
    matchesIntent: defaultMatch("recovery_mobility", "t_spine"),
    minMatchingWorking: 2,
  },
  lower_back: {
    intentSummary: "Lumbar-friendly mobility and anti-extension/rotation control.",
    matchesIntent: defaultMatch("recovery_mobility", "lower_back"),
    minMatchingWorking: 2,
  },
  ankles: {
    intentSummary: "Ankle mobility / dorsiflexion recovery.",
    matchesIntent: defaultMatch("recovery_mobility", "ankles"),
    minMatchingWorking: 2,
  },
  knees: {
    intentSummary: "Knee-friendly mobility / soft tissue.",
    matchesIntent: defaultMatch("recovery_mobility", "knees"),
    minMatchingWorking: 2,
  },
  elbows: {
    intentSummary: "Elbow mobility / soft tissue.",
    matchesIntent: defaultMatch("recovery_mobility", "elbows"),
    minMatchingWorking: 2,
  },
  wrists: {
    intentSummary: "Wrist mobility / soft tissue.",
    matchesIntent: defaultMatch("recovery_mobility", "wrists"),
    minMatchingWorking: 2,
  },
};

function overlayContract(
  primaryLabel: string,
  goalSlug: string,
  slug: string,
  displayName: string
): SubGoalIntentContract {
  const regionChecks: Record<string, SubGoalIntentMatchFn> = {
    upper: (ex) =>
      ["chest", "shoulders", "triceps", "lats", "biceps", "upper_back"].some((m) => muscles(ex).has(m)) ||
      pattern(ex) === "push" ||
      pattern(ex) === "pull",
    lower: (ex) =>
      ["legs", "quads", "glutes", "hamstrings", "calves"].some((m) => muscles(ex).has(m)) ||
      pattern(ex) === "squat" ||
      pattern(ex) === "hinge",
    core: (ex) => muscles(ex).has("core") || attrs(ex).has("core_stability") || pattern(ex) === "rotate",
    full_body: () => true,
  };
  return {
    primaryLabel,
    displayName,
    slug,
    goalSlug,
    class: "overlay",
    intentSummary: `Body-region overlay (${slug}) — bias working work toward that region.`,
    matchesIntent: regionChecks[slug] ?? (() => true),
    minMatchingWorking: slug === "full_body" ? 0 : 1,
  };
}

function overridesForPrimary(primaryLabel: string): typeof ATHLETIC_INTENT_OVERRIDES {
  switch (primaryLabel) {
    case "Athletic Performance":
      return ATHLETIC_INTENT_OVERRIDES;
    case "Improve Endurance":
      return ENDURANCE_OVERRIDES;
    case "Build Strength":
      return STRENGTH_OVERRIDES;
    case "Build Muscle (Hypertrophy)":
    case "Body Recomp (fat loss & muscle gain)":
      return MUSCLE_OVERRIDES;
    case "Calisthenics":
      return CALISTHENICS_OVERRIDES;
    case "Recovery & Mobility":
      return RECOVERY_OVERRIDES;
    default:
      return {};
  }
}

/**
 * Build the full contract list for every sub-goal under active PRIMARY_FOCUS_OPTIONS.
 */
export function buildAllSubGoalIntentContracts(): SubGoalIntentContract[] {
  const out: SubGoalIntentContract[] = [];
  for (const primaryLabel of PRIMARY_FOCUS_OPTIONS) {
    const entry = GOAL_SUB_FOCUS_OPTIONS[primaryLabel];
    if (!entry) continue;
    const overrides = overridesForPrimary(primaryLabel);
    for (const { slug, name } of entry.subFocuses) {
      const cls = getSubFocusClass(entry.goalSlug, slug);
      if (cls === "overlay") {
        out.push(overlayContract(primaryLabel, entry.goalSlug, slug, name));
        continue;
      }
      const ov = overrides[slug];
      const goalSlugForMatch =
        primaryLabel === "Body Recomp (fat loss & muscle gain)" ? "physique" : entry.goalSlug;
      // Athletic power intents route to internal `power` / `conditioning` buckets for matching.
      const matchGoalSlug =
        primaryLabel === "Athletic Performance"
          ? slug === "zone2_aerobic_base" ||
            slug === "intervals_hiit" ||
            slug === "threshold_tempo" ||
            slug === "hills"
            ? "conditioning"
            : slug === "lower_body_power_plyos" ||
                slug === "olympic_triple_extension" ||
                slug === "upper_body_power"
              ? "power"
              : "athletic_performance"
          : goalSlugForMatch;

      out.push({
        primaryLabel,
        displayName: name,
        slug,
        goalSlug: matchGoalSlug,
        class: "intent",
        intentSummary:
          ov?.intentSummary ??
          `Intent sub-focus ${name} under ${primaryLabel} (see goal-sub-goals audit).`,
        matchesIntent: ov?.matchesIntent ?? defaultMatch(matchGoalSlug, slug),
        isWeakProxy: ov?.isWeakProxy,
        minMatchingWorking: ov?.minMatchingWorking ?? 1,
        minStrongMatches: ov?.minStrongMatches,
      });
    }
  }
  return out;
}

export function resolveMatchFn(contract: SubGoalIntentContract): SubGoalIntentMatchFn {
  return contract.matchesIntent ?? defaultMatch(contract.goalSlug, contract.slug);
}
