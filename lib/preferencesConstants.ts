import type { BodyPartFocusKey, TargetBody, WorkoutStyleKey } from "./types";

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

/** Refinements – Style (optional multi-select). */
export const WORKOUT_STYLE_OPTIONS: WorkoutStyleKey[] = [
  "Compound Strength",
  "Hypertrophy Bias",
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

/** Sub-focus: contextual options per primary focus (sub-goals under each goal). Spec-aligned where noted (e.g. Max Strength, Relative Strength). */
export const SUB_FOCUS_BY_PRIMARY: Record<string, string[]> = {
  "Build Strength": [
    "Max Strength",
    "Relative Strength",
    "Squat",
    "Hinge",
    "Press",
    "Pull",
    "Full-body",
  ],
  "Build Muscle (Hypertrophy)": [
    "Glutes",
    "Quads",
    "Back",
    "Arms",
    "Shoulders",
    "Chest",
    "Balanced",
  ],
  "Body Recomposition": [
    "Glutes",
    "Quads",
    "Back",
    "Arms",
    "Shoulders",
    "Chest",
    "Balanced",
  ],
  "Sport Conditioning": [
    "Upper body",
    "Lower body",
    "Core",
    "Full-body",
    "Zone 2",
    "Threshold",
    "Intervals",
    "Hills",
  ],
  "Improve Endurance": [
    "Zone 2",
    "Threshold",
    "Intervals",
    "Hills",
  ],
  "Mobility & Joint Health": [
    "Hips",
    "Ankles",
    "T-spine",
    "Shoulders",
    "Full-body",
  ],
  "Athletic Performance": [
    "Upper body",
    "Lower body",
    "Core",
    "Full-body",
    "Power output",
    "Sprint speed",
    "Vertical jump",
    "Elasticity",
    "Reactive strength",
  ],
  Calisthenics: [
    "Pull-up Capacity",
    "Dips",
    "Handstand",
    "Front lever",
    "Core compression strength",
  ],
  "Power & Explosiveness": [
    "Upper body",
    "Lower body",
    "Core",
    "Full-body",
    "Squat",
    "Hinge",
    "Press",
    "Pull",
  ],
  Recovery: [
    "Hips",
    "Ankles",
    "T-spine",
    "Shoulders",
    "Full-body",
  ],
};

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
    const np1 = sum > 0 ? Math.round((p1 / sum) * 100) : 50;
    const np2 = 100 - np1;
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
 * Derives body part focus from sub-goals (e.g. "Upper body", "Lower body", "Core", "Full-body").
 * Used when Target body is not set but user picked a body-area sub-focus under Athletic Performance, Sport Conditioning, or Power.
 */
export function deriveBodyPartFocusFromSubFocus(
  subFocus: string[]
): BodyPartFocusKey[] {
  const out: BodyPartFocusKey[] = [];
  for (const s of subFocus) {
    if (s === "Full-body") return ["Full body"];
    if (s === "Upper body" && !out.includes("Upper body")) out.push("Upper body");
    if (s === "Lower body" && !out.includes("Lower body")) out.push("Lower body");
    if (s === "Core" && !out.includes("Core")) out.push("Core");
  }
  return out;
}
