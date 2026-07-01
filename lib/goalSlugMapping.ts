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
  mobility: "Recovery & mobility",
  recovery_mobility: "Recovery & mobility",
  joint_health: "Joint health strength",
  athletic_performance: "Athletic performance",
  power: "Power",
  climbing: "Climbing",
  trail_running: "Trail running",
  ski: "Ski / snow",
  physique: "Physique / body comp",
  resilience: "Recovery & mobility",
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
  "Improve Endurance": "endurance",
  "Recovery & Mobility": "recovery_mobility",
  /** @deprecated persisted presets */
  "Mobility & Joint Health": "recovery_mobility",
  Recovery: "recovery_mobility",
  "Athletic Performance": "athletic_performance",
  Calisthenics: "calisthenics",
  /** @deprecated persisted presets — slug retained for internal archetype routing */
  "Power & Explosiveness": "power",
  /** @deprecated persisted presets — slug retained for internal archetype routing */
  "Sport Conditioning": "conditioning",
  "Strength Training for Joint Health": "joint_health",
};

/** Map goal slug to a canonical primary focus label (for session intent when dedicating days to goals). */
export const GOAL_SLUG_TO_PRIMARY_FOCUS: Record<string, string> = {
  strength: "Build Strength",
  muscle: "Build Muscle (Hypertrophy)",
  physique: "Body Recomp (fat loss & muscle gain)",
  endurance: "Improve Endurance",
  mobility: "Recovery & Mobility",
  recovery_mobility: "Recovery & Mobility",
  joint_health: "Strength Training for Joint Health",
  athletic_performance: "Athletic Performance",
  calisthenics: "Calisthenics",
  power: "Athletic Performance",
  conditioning: "Athletic Performance",
  resilience: "Recovery & Mobility",
  climbing: "Athletic Performance",
  trail_running: "Improve Endurance",
  ski: "Athletic Performance",
};
