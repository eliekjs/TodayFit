/**
 * Goal slug ↔ UI label maps shared by preferences, sub-focus resolution, and adapters.
 * Kept separate from preferencesConstants to avoid require cycles with data/goalSubFocus.
 */

/** Map DB goal slugs to display labels (for Adaptive mode). */
export const GOAL_SLUG_TO_LABEL: Record<string, string> = {
  strength: "Max strength",
  muscle: "Build muscle",
  endurance: "Endurance",
  conditioning: "Sport conditioning",
  mobility: "Mobility & joint health",
  athletic_performance: "Athletic performance",
  power: "Power",
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
  /** Normalized bias label from older UI strings */
  Hypertrophy: "muscle",
  "Body Recomp (fat loss & muscle gain)": "physique",
  // Backward-compat for persisted presets created before rename.
  "Body Recomposition": "physique",
  "Sport Conditioning": "conditioning",
  "Improve Endurance": "endurance",
  "Mobility & Joint Health": "mobility",
  "Athletic Performance": "athletic_performance",
  Calisthenics: "calisthenics",
  "Power & Explosiveness": "power",
  Recovery: "resilience",
};

/** Map goal slug to a canonical primary focus label (for session intent when dedicating days to goals). */
export const GOAL_SLUG_TO_PRIMARY_FOCUS: Record<string, string> = {
  strength: "Build Strength",
  muscle: "Build Muscle (Hypertrophy)",
  physique: "Body Recomp (fat loss & muscle gain)",
  conditioning: "Sport Conditioning",
  endurance: "Improve Endurance",
  mobility: "Mobility & Joint Health",
  athletic_performance: "Athletic Performance",
  power: "Power & Explosiveness",
  calisthenics: "Calisthenics",
  resilience: "Recovery",
  climbing: "Sport Conditioning",
  trail_running: "Improve Endurance",
  ski: "Sport Conditioning",
};
