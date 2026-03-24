import type { BodyPartFocusKey, TargetBody, WorkoutStyleKey } from "./types";
import { GOAL_SUB_FOCUS_OPTIONS } from "../data/goalSubFocus";

/** Core: primary focus options (multi-select, suggest up to 2). */
export const PRIMARY_FOCUS_OPTIONS = [
  "Build Strength",
  "Build Muscle (Hypertrophy)",
  "Body Recomposition",
  "Sport Conditioning",
  "Improve Endurance",
  "Mobility & Joint Health",
  "Athletic Performance",
  "Calisthenics",
  "Power & Explosiveness",
  "Recovery",
] as const;

/** Map DB goal slugs to display labels (for Adaptive mode). */
export const GOAL_SLUG_TO_LABEL: Record<string, string> = {
  strength: "Max strength",
  muscle: "Build muscle",
  endurance: "Endurance",
  conditioning: "Sport conditioning",
  mobility: "Mobility & joint health",
  climbing: "Climbing",
  trail_running: "Trail running",
  ski: "Ski / snow",
  physique: "Physique / body comp",
  resilience: "Resilience / recovery",
};

/** Map Manual primary focus labels to DB goal slugs (for weighted exercise ranking). */
export const PRIMARY_FOCUS_TO_GOAL_SLUG: Record<string, string> = {
  "Build Strength": "strength",
  "Build Muscle (Hypertrophy)": "muscle",
  "Body Recomposition": "physique",
  "Sport Conditioning": "conditioning",
  "Improve Endurance": "endurance",
  "Mobility & Joint Health": "mobility",
  "Athletic Performance": "strength",
  "Calisthenics": "strength",
  "Power & Explosiveness": "conditioning",
  "Recovery": "resilience",
};

/** Map goal slug to a canonical primary focus label (for session intent when dedicating days to goals). */
export const GOAL_SLUG_TO_PRIMARY_FOCUS: Record<string, string> = {
  strength: "Build Strength",
  muscle: "Build Muscle (Hypertrophy)",
  physique: "Body Recomposition",
  conditioning: "Sport Conditioning",
  endurance: "Improve Endurance",
  mobility: "Mobility & Joint Health",
  resilience: "Recovery",
  climbing: "Sport Conditioning",
  trail_running: "Improve Endurance",
  ski: "Sport Conditioning",
};

/** Core: duration in minutes (single select). */
export const DURATIONS = [20, 30, 45, 60, 75] as const;

/** Core: energy level (single select). */
export const ENERGY_LEVELS = ["Low", "Medium", "High"] as const;

/** Targets: body target (single select). */
export const TARGET_OPTIONS: TargetBody[] = ["Upper", "Lower", "Full"];

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

/**
 * Sport Mode training goal ids (same as `primaryGoalSlug` in planWeek) → Manual primary focus
 * label. Used to read/write `subFocusByGoal` for goal sub-focus chips.
 */
export const ADAPTIVE_GOAL_ID_TO_MANUAL_PRIMARY: Record<string, string> = {
  strength: "Build Strength",
  muscle: "Build Muscle (Hypertrophy)",
  endurance: "Improve Endurance",
  mobility: "Mobility & Joint Health",
  physique: "Body Recomposition",
  resilience: "Recovery",
};

/** Build goal sub-focus map for `planWeek` / workout builder from Sport Mode goals + saved preferences. */
export function goalSubFocusPayloadForAdaptiveGoals(
  rankedGoalIds: string[],
  subFocusByGoal: Record<string, string[]>
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const id of rankedGoalIds) {
    const label = ADAPTIVE_GOAL_ID_TO_MANUAL_PRIMARY[id];
    if (label && (subFocusByGoal[label]?.length ?? 0) > 0) {
      out[label] = [...(subFocusByGoal[label] ?? [])];
    }
  }
  return out;
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
