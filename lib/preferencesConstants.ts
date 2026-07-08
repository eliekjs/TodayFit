import type { BodyPartFocusKey, TargetBody, WorkoutStyleKey } from "./types";
import { GOAL_SUB_FOCUS_OPTIONS } from "../data/goalSubFocus/goalSubFocusOptions";
import { normalizeSubFocusPctRecord } from "./subFocusWeights";
import {
  ATHLETIC_PERFORMANCE_PRIMARY_LABEL,
  LEGACY_ATHLETIC_PRIMARY_FOCUS_LABELS,
  migrateLegacyAthleticPreferences,
} from "../data/goalSubFocus/athleticSubFocusArchetypes";
export {
  GOAL_SLUG_TO_LABEL,
  GOAL_SLUG_TO_PRIMARY_FOCUS,
  PRIMARY_FOCUS_TO_GOAL_SLUG,
} from "./goalSlugMapping";

/** Core: primary focus options (multi-select, suggest up to 2). */
export const PRIMARY_FOCUS_OPTIONS = [
  "Build Strength",
  "Build Muscle (Hypertrophy)",
  "Body Recomp (fat loss & muscle gain)",
  "Improve Endurance",
  "Recovery & Mobility",
  "Athletic Performance",
  "Calisthenics",
  "Strength Training for Joint Health",
] as const;

/** @deprecated User-facing choices — kept for persisted presets / slug resolution only. */
export const LEGACY_PRIMARY_FOCUS_OPTIONS = [
  "Sport Conditioning",
  "Power & Explosiveness",
] as const;

/** Core: duration in minutes (single select). */
export const DURATIONS = [20, 30, 45, 60, 75] as const;

/** Core: energy level (single select). */
export const ENERGY_LEVELS = ["Low", "Medium", "High"] as const;

/** Targets: body target (single select). */
export const TARGET_OPTIONS: TargetBody[] = ["Upper", "Lower", "Full"];

/** Map session body emphasis to sport one-day body bias chips. */
export function oneDayBodyBiasFromTargetBody(
  targetBody: TargetBody | null | undefined
): "upper" | "lower" | "full" | null {
  if (targetBody === "Upper") return "upper";
  if (targetBody === "Lower") return "lower";
  if (targetBody === "Full") return "full";
  return null;
}

/** Targets: modifiers by target. Upper → Push/Pull; Lower → Quad/Posterior; Full → none. */
export const MODIFIERS_BY_TARGET: Record<TargetBody, string[]> = {
  Upper: ["Push", "Pull"],
  Lower: ["Quad", "Posterior"],
  Full: [],
};

/** Refinements – Constraints: single list; "No restrictions" is mutually exclusive with others. Spec-aligned: body regions + Core. */
export const CONSTRAINT_OPTIONS = [
  "Shoulder",
  "Elbow",
  "Wrist",
  "Lower Back",
  "Hip",
  "Knee",
  "Ankle",
  "Core",
  "No restrictions",
] as const;

/** When target is Upper, only show upper-body constraints; when Lower, only lower-body. Full/null = all. */
export const CONSTRAINT_OPTIONS_UPPER: readonly string[] = [
  "Shoulder",
  "Elbow",
  "Wrist",
  "Core",
  "No restrictions",
];
export const CONSTRAINT_OPTIONS_LOWER: readonly string[] = [
  "Lower Back",
  "Hip",
  "Knee",
  "Ankle",
  "Core",
  "No restrictions",
];

/** Refinements – Style (optional multi-select). Hypertrophy Bias omitted; use Build Muscle (Hypertrophy) goal instead. */
export const WORKOUT_STYLE_OPTIONS: WorkoutStyleKey[] = [
  "Compound Strength",
  "Functional / Athletic",
  "Calisthenics Focus",
  "CrossFit-style / HIIT",
  "Cardio Emphasis",
  "Mixed Strength + Conditioning",
];

/** Refinements – Upcoming 1–3 days (optional multi-select). */
export const UPCOMING_OPTIONS = [
  "Long Run",
  "Big Hike",
  "Ski Day",
  "Climbing Day",
  "Hard Leg Day",
  "Hard Upper Day",
] as const;

/** Zone 2 cardio modality keys (for preferredZone2Cardio). Empty = any. */
export const ZONE2_CARDIO_OPTIONS = [
  { key: "bike", label: "Bike" },
  { key: "treadmill", label: "Treadmill / Run" },
  { key: "rower", label: "Rower" },
  { key: "stair_climber", label: "Stair climber" },
] as const;

/** Sub-focus: contextual options per primary focus (sub-goals under each goal). Derived from goalSubFocusOptions. */
export const SUB_FOCUS_BY_PRIMARY: Record<string, string[]> = (() => {
  const out: Record<string, string[]> = {};
  for (const [primaryFocus, entry] of Object.entries(GOAL_SUB_FOCUS_OPTIONS)) {
    out[primaryFocus] = entry.subFocuses.map((f) => f.name);
  }
  return out;
})();

/** Aerobic / anaerobic engine sub-focus slugs — not strength-power development (Power & Explosiveness / plyo slugs stay allowed there). */
export const ENGINE_CARDIO_SUB_FOCUS_SLUGS: readonly string[] = [
  "zone2_aerobic_base",
  "intervals_hiit",
  "threshold_tempo",
  "hills",
  "zone2_long_steady",
  "intervals",
  "durability",
];

const ENGINE_CARDIO_SUB_FOCUS_SLUG_SET = new Set(ENGINE_CARDIO_SUB_FOCUS_SLUGS);

/** Primary goals that may show engine / sport-conditioning style sub-focus chips (matches `PRIMARY_FOCUS_OPTIONS` strings). */
const PRIMARY_FOCUS_ALLOWLIST_CONDITIONING_SUB_FOCUS = new Set<string>([
  ATHLETIC_PERFORMANCE_PRIMARY_LABEL,
  "Improve Endurance",
  ...LEGACY_ATHLETIC_PRIMARY_FOCUS_LABELS,
]);

const ENGINE_CARDIO_SUB_FOCUS_DISPLAY_NAME_SET: ReadonlySet<string> = (() => {
  const names = new Set<string>();
  for (const label of ["Sport Conditioning", "Improve Endurance"] as const) {
    const entry = GOAL_SUB_FOCUS_OPTIONS[label];
    if (!entry) continue;
    for (const f of entry.subFocuses) {
      if (ENGINE_CARDIO_SUB_FOCUS_SLUG_SET.has(f.slug)) names.add(f.name);
    }
  }
  return names;
})();

/**
 * Whether this Manual primary-focus label may offer conditioning / engine-cardio-related sub-focus options.
 * Denylist: hypertrophy-, strength-, recomp-, mobility-, calisthenics-, recovery-primary flows.
 */
export function primaryFocusAllowsConditioningSubFocus(goalLabel: string): boolean {
  return PRIMARY_FOCUS_ALLOWLIST_CONDITIONING_SUB_FOCUS.has(goalLabel);
}

/** True if this display label is sport/endurance-type engine conditioning (cross-check for stale persisted prefs). */
export function engineCardioSubFocusDisplayName(displayName: string): boolean {
  return ENGINE_CARDIO_SUB_FOCUS_DISPLAY_NAME_SET.has(displayName);
}

/** True if `(goalLabel, displayName)` pairs engine conditioning intents with a primary that forbids them. */
export function conditioningSubFocusInvalidForPrimaryGoal(
  goalLabel: string,
  displayName: string
): boolean {
  if (primaryFocusAllowsConditioningSubFocus(goalLabel)) return false;
  const slug = GOAL_SUB_FOCUS_OPTIONS[goalLabel]?.subFocuses.find((f) => f.name === displayName)?.slug;
  if (slug != null && ENGINE_CARDIO_SUB_FOCUS_SLUG_SET.has(slug)) return true;
  return ENGINE_CARDIO_SUB_FOCUS_DISPLAY_NAME_SET.has(displayName);
}

export function collectInvalidConditioningSubFocusSelections(
  subFocusByGoal: Record<string, string[]>
): { goalLabel: string; displayName: string }[] {
  const out: { goalLabel: string; displayName: string }[] = [];
  for (const [goalLabel, labels] of Object.entries(subFocusByGoal)) {
    for (const displayName of labels ?? []) {
      if (conditioningSubFocusInvalidForPrimaryGoal(goalLabel, displayName)) {
        out.push({ goalLabel, displayName });
      }
    }
  }
  return out;
}

/** Sub-focus chip labels offered in Manual / Adaptive UI for one primary goal (filters engine options when disallowed). */
export function subFocusChoicesForManualPrimaryGoal(goalLabel: string): string[] {
  const all = SUB_FOCUS_BY_PRIMARY[goalLabel] ?? [];
  return all.filter((name) => !conditioningSubFocusInvalidForPrimaryGoal(goalLabel, name));
}

/** Remove engine/cardio-conditioning sub-focus labels from goals whose primary forbids them; deletes empty keys. */
export function normalizeSubFocusByGoalAgainstConditioningPolicy(
  subFocusByGoal: Record<string, string[]>
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [goalLabel, labels] of Object.entries(subFocusByGoal)) {
    if (!labels?.length) continue;
    const next = labels.filter((d) => !conditioningSubFocusInvalidForPrimaryGoal(goalLabel, d));
    if (next.length > 0) out[goalLabel] = next;
  }
  return out;
}

/**
 * Sport Mode training goal ids (same as `primaryGoalSlug` in planWeek) → Manual primary focus
 * label. Used to read/write `subFocusByGoal` for goal sub-focus chips.
 */
export const ADAPTIVE_GOAL_ID_TO_MANUAL_PRIMARY: Record<string, string> = {
  strength: "Build Strength",
  muscle: "Build Muscle (Hypertrophy)",
  endurance: "Improve Endurance",
  mobility: "Recovery & Mobility",
  recovery_mobility: "Recovery & Mobility",
  joint_health: "Strength Training for Joint Health",
  physique: "Body Recomp (fat loss & muscle gain)",
  resilience: "Recovery & Mobility",
  conditioning: ATHLETIC_PERFORMANCE_PRIMARY_LABEL,
  athletic_performance: ATHLETIC_PERFORMANCE_PRIMARY_LABEL,
  power: ATHLETIC_PERFORMANCE_PRIMARY_LABEL,
  calisthenics: "Calisthenics",
};

/**
 * Map day-level goal bias chips → canonical Manual primary-focus label for the generator.
 * Keeps `Build Muscle (Hypertrophy)` so adapter maps to hypertrophy, not strength.
 */
export const GOAL_BIAS_TO_PRIMARY_FOCUS_LABEL: Record<string, string> = {
  strength: "Build Strength",
  hypertrophy: "Build Muscle (Hypertrophy)",
  endurance: "Improve Endurance",
  mobility: "Recovery & Mobility",
  recovery: "Recovery & Mobility",
  recovery_mobility: "Recovery & Mobility",
  joint_health: "Strength Training for Joint Health",
  power: ATHLETIC_PERFORMANCE_PRIMARY_LABEL,
  conditioning: ATHLETIC_PERFORMANCE_PRIMARY_LABEL,
  athletic_performance: ATHLETIC_PERFORMANCE_PRIMARY_LABEL,
};

/** Build goal sub-focus map for `planWeek` / workout builder from Sport Mode goals + saved preferences. */
export function goalSubFocusPayloadForAdaptiveGoals(
  rankedGoalIds: string[],
  subFocusByGoal: Record<string, string[]>
): Record<string, string[]> {
  const cleaned = normalizeSubFocusByGoalAgainstConditioningPolicy(subFocusByGoal);
  const out: Record<string, string[]> = {};
  for (const id of rankedGoalIds) {
    const label = ADAPTIVE_GOAL_ID_TO_MANUAL_PRIMARY[id];
    if (label && (cleaned[label]?.length ?? 0) > 0) {
      out[label] = [...(cleaned[label] ?? [])];
    }
  }
  return out;
}

/**
 * Same ranked-goal filter as `goalSubFocusPayloadForAdaptiveGoals`, for sub-focus blend % map.
 * When `canonicalSubsByGoal` is set (typically the sanitised subs map sent to planWeek), only those
 * labels remain and percentages are renormalised per goal.
 */
export function goalSubFocusPctPayloadForAdaptiveGoals(
  rankedGoalIds: string[],
  subFocusPctByGoal: Record<string, Record<string, number>> | undefined,
  canonicalSubsByGoal?: Record<string, string[]>
): Record<string, Record<string, number>> | undefined {
  if (!subFocusPctByGoal || Object.keys(subFocusPctByGoal).length === 0) return undefined;
  const out: Record<string, Record<string, number>> = {};
  for (const id of rankedGoalIds) {
    const label = ADAPTIVE_GOAL_ID_TO_MANUAL_PRIMARY[id];
    if (!label) continue;
    const slice = subFocusPctByGoal[label];
    if (!slice || Object.keys(slice).length === 0) continue;
    const canon = canonicalSubsByGoal?.[label];
    if (canon?.length) out[label] = normalizeSubFocusPctRecord(canon, slice);
    else out[label] = { ...slice };
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Normalize goal match percentages so the first `goalCount` goals sum to 100.
 * Returns { goalMatchPrimaryPct, goalMatchSecondaryPct, goalMatchTertiaryPct }.
 */
export function normalizeGoalMatchPct(
  p1: number,
  p2: number,
  p3: number,
  goalCount: number
): { goalMatchPrimaryPct: number; goalMatchSecondaryPct: number; goalMatchTertiaryPct: number } {
  if (goalCount <= 0) return { goalMatchPrimaryPct: 50, goalMatchSecondaryPct: 30, goalMatchTertiaryPct: 20 };
  if (goalCount === 1) return { goalMatchPrimaryPct: 100, goalMatchSecondaryPct: 0, goalMatchTertiaryPct: 0 };
  if (goalCount === 2) {
    const sum = p1 + p2;
    let np1 = sum > 0 ? Math.round((p1 / sum) * 100) : 50;
    let np2 = 100 - np1;
    if (np2 === 0) {
      np1 = 60;
      np2 = 40;
    }
    return { goalMatchPrimaryPct: np1, goalMatchSecondaryPct: np2, goalMatchTertiaryPct: 0 };
  }
  const sum = p1 + p2 + p3;
  if (sum <= 0) return { goalMatchPrimaryPct: 50, goalMatchSecondaryPct: 30, goalMatchTertiaryPct: 20 };
  const np1 = Math.round((p1 / sum) * 100);
  const np2 = Math.round((p2 / sum) * 100);
  const np3 = 100 - np1 - np2;
  return { goalMatchPrimaryPct: np1, goalMatchSecondaryPct: np2, goalMatchTertiaryPct: np3 };
}

/**
 * Normalize manual preferences after athletic goal consolidation:
 * legacy Power / Sport Conditioning primaries and sub-focus keys → Athletic Performance.
 */
export function normalizeAthleticGoalPreferences<T extends {
  primaryFocus: string[];
  subFocusByGoal: Record<string, string[]>;
}>(prefs: T): T {
  const migrated = migrateLegacyAthleticPreferences({
    primaryFocus: prefs.primaryFocus,
    subFocusByGoal: prefs.subFocusByGoal,
  });
  return {
    ...prefs,
    primaryFocus: migrated.primaryFocus,
    subFocusByGoal: migrated.subFocusByGoal,
  };
}

/**
 * Derives flat sub-focus list for the generator from subFocusByGoal (in primaryFocus order).
 */
export function deriveSubFocus(
  primaryFocus: string[],
  subFocusByGoal: Record<string, string[]>
): string[] {
  return primaryFocus.flatMap((goal) => subFocusByGoal[goal] ?? []);
}

/**
 * Derives bodyPartFocus for the generator from targetBody + targetModifier.
 * Do not store bodyPartFocus in state; compute at generate time.
 */
export function deriveBodyPartFocus(
  targetBody: TargetBody | null,
  targetModifier: string[]
): BodyPartFocusKey[] {
  if (!targetBody) return [];
  if (targetBody === "Full") return ["Full body"];
  if (targetBody === "Upper") {
    const base: BodyPartFocusKey[] = ["Upper body"];
    if (targetModifier.includes("Push")) base.push("Push");
    if (targetModifier.includes("Pull")) base.push("Pull");
    return base;
  }
  if (targetBody === "Lower") {
    const base: BodyPartFocusKey[] = ["Lower body"];
    if (targetModifier.includes("Quad")) base.push("Quad");
    if (targetModifier.includes("Posterior")) base.push("Posterior");
    return base;
  }
  return [];
}

/**
 * Derives body part focus from sub-goals (e.g. "Upper", "Lower", "Core", "Full-body").
 * Used when Target body is not set but user picked a body-area sub-focus under Athletic Performance, Sport Conditioning, or Power.
 */
export function deriveBodyPartFocusFromSubFocus(
  subFocus: string[]
): BodyPartFocusKey[] {
  const out: BodyPartFocusKey[] = [];

  const addUnique = (v: BodyPartFocusKey) => {
    if (!out.includes(v)) out.push(v);
  };

  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

  // Special-case full-body so warm-up stays generic and balanced across compounds.
  if (subFocus.some((s) => {
    const n = norm(s);
    return n === "balanced" || n === "full-body" || n === "full body";
  })) {
    return ["Full body"];
  }

  for (const s of subFocus) {
    if (s === "Full-body") return ["Full body"];

    // Legacy body-area sub-focus mapping (used by other goal types).
    if ((s === "Upper" || s === "Upper body") && !out.includes("Upper body")) addUnique("Upper body");
    if ((s === "Lower" || s === "Lower body") && !out.includes("Lower body")) addUnique("Lower body");
    if (s === "Core" && !out.includes("Core")) addUnique("Core");

    // Hypertrophy (muscle) sub-focus mapping for warm-up alignment.
    // We intentionally keep this direct + simple (no hidden ontology).
    const n = norm(s);
    if (n === "glutes" || n === "legs") {
      addUnique("Lower body");
    } else if (n === "back") {
      addUnique("Upper body");
      addUnique("Pull");
    } else if (n === "chest") {
      addUnique("Upper body");
      addUnique("Push");
    } else if (n === "arms") {
      addUnique("Upper body");
      addUnique("Push");
      addUnique("Pull");
    } else if (n === "shoulders") {
      addUnique("Upper body");
      addUnique("Push");
    } else if (n === "core") {
      addUnique("Core");
    }
  }

  // If the user picked both upper and lower hypertrophy sub-focuses, warm-up should be full-body.
  if (out.includes("Upper body") && out.includes("Lower body")) return ["Full body"];

  return out;
}
