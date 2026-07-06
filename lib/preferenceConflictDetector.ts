/**
 * Preference conflict detector: pure function that inspects ManualPreferences and
 * returns an array of PreferenceConflict objects describing meaningful contradictions
 * that would significantly distort workout generation.
 *
 * Conflicts are advisory only — the user can always dismiss and proceed.
 */

import type { ManualPreferences, TargetBody } from "./types";
import { GOAL_SUB_FOCUS_OPTIONS } from "../data/goalSubFocus";
import {
  isLowerBodySubFocusSlug,
  isUpperBodySubFocusSlug,
  resolveSubFocusSlugFromDisplayName,
} from "./subFocusBodyRegion";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ConflictResolution = {
  label: string;
  apply: (prefs: ManualPreferences) => Partial<ManualPreferences>;
};

export type PreferenceConflict = {
  id: string;
  severity: "high" | "medium";
  message: string;
  resolutions: ConflictResolution[];
};

/**
 * Optional context for conflicts that depend on state outside ManualPreferences
 * (e.g. sport-mode local state).
 */
export type ConflictContext = {
  /** Sport slugs selected in sport-mode (canonical). */
  sportSlugs?: string[];
  /** Body bias from sport-mode one-day screen; overrides prefs.targetBody when set. */
  targetBodyOverride?: TargetBody | null;
  /** Equipment key strings from the active gym profile (for calisthenics check). */
  gymEquipmentKeys?: string[];
};

// ---------------------------------------------------------------------------
// Sub-goal body-region classification
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Sport → dominant body region map
// ---------------------------------------------------------------------------

/**
 * Dominant body region for each canonical sport slug.
 * "Full" means no meaningful conflict; omitted sports are treated as "Full".
 * Sourced from structureBias fields and movement pattern ranks in sportDefinitions.ts.
 */
const SPORT_DOMINANT_REGION: Record<string, TargetBody> = {
  rock_climbing: "Upper",
  swimming_open_water: "Upper",
  boxing: "Upper",
  muay_thai: "Upper",
  alpine_skiing: "Lower",
  backcountry_skiing: "Lower",
  xc_skiing: "Full",
  hiking_backpacking: "Lower",
  mountaineering: "Lower",
  rucking: "Lower",
  road_running: "Lower",
  trail_running: "Lower",
  cycling: "Lower",
  soccer: "Lower",
  hyrox: "Full",
  surfing: "Full",
  rowing_erg: "Full",
  triathlon: "Full",
  grappling: "Full",
  basketball: "Full",
  rugby: "Full",
  mountain_biking: "Lower",
  kite_surfing: "Upper",
  wind_surfing: "Upper",
};

// ---------------------------------------------------------------------------
// Recovery / mobility goals
// ---------------------------------------------------------------------------

const RECOVERY_MOBILITY_GOALS = new Set([
  "Recovery & Mobility",
  "Recovery",
  "Mobility & Joint Health",
]);

// ---------------------------------------------------------------------------
// Opposing goal pairs
// ---------------------------------------------------------------------------

/** Goal labels that are strongly opposing when both appear in the top-2. */
const OPPOSING_GOAL_PAIRS: [string, string][] = [
  ["Build Muscle (Hypertrophy)", "Recovery & Mobility"],
  ["Build Strength", "Recovery & Mobility"],
  ["Power & Explosiveness", "Recovery & Mobility"],
  ["Build Muscle (Hypertrophy)", "Recovery"],
  ["Build Strength", "Recovery"],
  ["Power & Explosiveness", "Recovery"],
];

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

/**
 * Resolve all selected sub-focus slugs across all goals.
 * Returns a Set<string> of the actual slugs (not display names).
 */
function resolveSelectedSubFocusSlugs(prefs: ManualPreferences): Set<string> {
  const out = new Set<string>();
  for (const [goalLabel, displayNames] of Object.entries(prefs.subFocusByGoal)) {
    for (const name of displayNames) {
      const slug = resolveSubFocusSlugFromDisplayName(goalLabel, name);
      if (slug) out.add(slug);
    }
  }
  return out;
}

/** Display names (comma-joined) of conflicting sub-goals for the message. */
function conflictingSubFocusDisplayNames(
  prefs: ManualPreferences,
  conflictingSlugs: Set<string>
): string {
  const names: string[] = [];
  for (const [goalLabel, displayNames] of Object.entries(prefs.subFocusByGoal)) {
    const entry = GOAL_SUB_FOCUS_OPTIONS[goalLabel];
    if (!entry) continue;
    const nameToSlug = new Map(entry.subFocuses.map((f) => [f.name, f.slug]));
    for (const name of displayNames) {
      const slug = nameToSlug.get(name);
      if (slug && conflictingSlugs.has(slug)) names.push(name);
    }
  }
  return names.slice(0, 2).join(", ");
}

/** Remove sub-focus display-name entries whose slugs are in the given set. */
function removeConflictingSubFocuses(
  prefs: ManualPreferences,
  conflictingSlugs: Set<string>
): Pick<ManualPreferences, "subFocusByGoal"> {
  const nextSubFocusByGoal: Record<string, string[]> = {};
  for (const [goalLabel, displayNames] of Object.entries(prefs.subFocusByGoal)) {
    const entry = GOAL_SUB_FOCUS_OPTIONS[goalLabel];
    if (!entry) {
      nextSubFocusByGoal[goalLabel] = displayNames;
      continue;
    }
    const nameToSlug = new Map(entry.subFocuses.map((f) => [f.name, f.slug]));
    const kept = displayNames.filter((n) => {
      const slug = nameToSlug.get(n);
      return !slug || !conflictingSlugs.has(slug);
    });
    if (kept.length > 0) nextSubFocusByGoal[goalLabel] = kept;
  }
  return { subFocusByGoal: nextSubFocusByGoal };
}

// ---------------------------------------------------------------------------
// Conflict detectors
// ---------------------------------------------------------------------------

function detectBodyRegionVsSubGoalConflict(
  prefs: ManualPreferences,
  targetBody: TargetBody | null
): PreferenceConflict | null {
  if (!targetBody || targetBody === "Full") return null;
  const selectedSlugs = resolveSelectedSubFocusSlugs(prefs);
  if (selectedSlugs.size === 0) return null;

  if (targetBody === "Upper") {
    const lowerSlugs = new Set([...selectedSlugs].filter((s) => isLowerBodySubFocusSlug(s)));
    if (lowerSlugs.size === 0) return null;
    const names = conflictingSubFocusDisplayNames(prefs, lowerSlugs);
    return {
      id: "body_vs_subgoal_upper_lower",
      severity: "high",
      message: `Your sub-goals (${names}) focus on lower body, but your session is set to Upper body.`,
      resolutions: [
        {
          label: "Switch to Full body",
          apply: () => ({ targetBody: "Full" as TargetBody, targetModifier: [] }),
        },
        {
          label: "Clear lower-body sub-goals",
          apply: (p) => removeConflictingSubFocuses(p, lowerSlugs),
        },
      ],
    };
  }

  if (targetBody === "Lower") {
    const upperSlugs = new Set([...selectedSlugs].filter((s) => isUpperBodySubFocusSlug(s)));
    if (upperSlugs.size === 0) return null;
    const names = conflictingSubFocusDisplayNames(prefs, upperSlugs);
    return {
      id: "body_vs_subgoal_lower_upper",
      severity: "high",
      message: `Your sub-goals (${names}) focus on upper body, but your session is set to Lower body.`,
      resolutions: [
        {
          label: "Switch to Full body",
          apply: () => ({ targetBody: "Full" as TargetBody, targetModifier: [] }),
        },
        {
          label: "Clear upper-body sub-goals",
          apply: (p) => removeConflictingSubFocuses(p, upperSlugs),
        },
      ],
    };
  }

  return null;
}

function detectSportVsBodyRegionConflict(
  sportSlugs: string[],
  targetBody: TargetBody | null
): PreferenceConflict | null {
  if (!targetBody || targetBody === "Full") return null;
  if (sportSlugs.length === 0) return null;

  // Use the first (primary) sport for the conflict check.
  const primarySport = sportSlugs[0];
  if (!primarySport) return null;
  const dominant = SPORT_DOMINANT_REGION[primarySport];
  if (!dominant || dominant === "Full") return null;

  if (dominant === targetBody) return null;

  const sportName = primarySport.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  if (dominant === "Upper" && targetBody === "Lower") {
    return {
      id: `sport_body_mismatch_${primarySport}`,
      severity: "high",
      message: `${sportName} prep focuses on upper body, but your session is set to Lower. Sport-specific exercises may be skipped.`,
      resolutions: [
        {
          label: "Switch to Upper body",
          apply: () => ({ targetBody: "Upper" as TargetBody, targetModifier: [] }),
        },
        {
          label: "Keep Lower (limit sport transfer)",
          apply: () => ({}),
        },
      ],
    };
  }

  if (dominant === "Lower" && targetBody === "Upper") {
    return {
      id: `sport_body_mismatch_${primarySport}`,
      severity: "high",
      message: `${sportName} prep focuses on lower body, but your session is set to Upper. Sport-specific exercises may be skipped.`,
      resolutions: [
        {
          label: "Switch to Lower body",
          apply: () => ({ targetBody: "Lower" as TargetBody, targetModifier: [] }),
        },
        {
          label: "Keep Upper (limit sport transfer)",
          apply: () => ({}),
        },
      ],
    };
  }

  return null;
}

function detectRecoveryHighEnergyConflict(prefs: ManualPreferences): PreferenceConflict | null {
  if (prefs.energyLevel !== "high") return null;
  const hasRecoveryOrMobility = prefs.primaryFocus.some((g) => RECOVERY_MOBILITY_GOALS.has(g));
  if (!hasRecoveryOrMobility) return null;

  const goalName = prefs.primaryFocus.find((g) => RECOVERY_MOBILITY_GOALS.has(g)) ?? "Recovery";
  return {
    id: "recovery_high_energy",
    severity: "medium",
    message: `${goalName} works best at low or medium intensity. High energy may undermine the goal.`,
    resolutions: [
      {
        label: "Set to Medium",
        apply: () => ({ energyLevel: "medium" as const }),
      },
      {
        label: "Keep High anyway",
        apply: () => ({}),
      },
    ],
  };
}

function detectOpposingGoalsConflict(prefs: ManualPreferences): PreferenceConflict | null {
  const top2 = prefs.primaryFocus.slice(0, 2);
  if (top2.length < 2) return null;

  for (const [a, b] of OPPOSING_GOAL_PAIRS) {
    if (
      (top2.includes(a) && top2.includes(b)) ||
      (top2.includes(b) && top2.includes(a))
    ) {
      const primaryName = top2.includes(a) ? a : b;
      const secondaryName = top2.includes(a) ? b : a;
      const primary = primaryName.replace(" (Hypertrophy)", "").replace(" & Explosiveness", "");
      return {
        id: `opposing_goals_${a}_${b}`.replace(/\s+/g, "_").toLowerCase(),
        severity: "medium",
        message: `Combining ${primary} and ${secondaryName} as top goals pulls the workout in opposite directions. Results may be diluted.`,
        resolutions: [
          {
            label: `Keep only ${primary.split(" ").slice(0, 2).join(" ")}`,
            apply: (p) => ({
              primaryFocus: p.primaryFocus.filter((g) => g !== secondaryName),
              subFocusByGoal: (() => {
                const next = { ...p.subFocusByGoal };
                delete next[secondaryName];
                return next;
              })(),
            }),
          },
        ],
      };
    }
  }
  return null;
}

function detectCalisthenicsNoBodyweightConflict(
  prefs: ManualPreferences,
  gymEquipmentKeys?: string[]
): PreferenceConflict | null {
  if (!gymEquipmentKeys || gymEquipmentKeys.length === 0) return null;
  const hasCalisthenics = prefs.primaryFocus.includes("Calisthenics");
  if (!hasCalisthenics) return null;
  const hasBodyweight = gymEquipmentKeys.includes("bodyweight") || gymEquipmentKeys.includes("pullup_bar");
  if (hasBodyweight) return null;

  return {
    id: "calisthenics_no_bodyweight",
    severity: "medium",
    message: "Your gym profile doesn't include bodyweight or a pull-up bar. Calisthenics may be limited to barbells and machines.",
    resolutions: [
      {
        label: "Keep Calisthenics",
        apply: () => ({}),
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Detect meaningful preference conflicts.
 * Returns conflicts sorted by severity (high first), then detection order.
 * Pass `context` for sport-mode or gym-equipment-aware checks.
 */
export function detectPreferenceConflicts(
  prefs: ManualPreferences,
  context?: ConflictContext
): PreferenceConflict[] {
  const targetBody =
    context?.targetBodyOverride !== undefined
      ? context.targetBodyOverride
      : prefs.targetBody;

  const conflicts: (PreferenceConflict | null)[] = [
    detectBodyRegionVsSubGoalConflict(prefs, targetBody),
    detectSportVsBodyRegionConflict(context?.sportSlugs ?? [], targetBody),
    detectRecoveryHighEnergyConflict(prefs),
    detectOpposingGoalsConflict(prefs),
    detectCalisthenicsNoBodyweightConflict(prefs, context?.gymEquipmentKeys),
  ];

  return conflicts
    .filter((c): c is PreferenceConflict => c != null)
    .sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "high" ? -1 : 1));
}
