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
  hypertrophy: "Build Muscle (Hypertrophy)",
  physique: "Body Recomp (fat loss & muscle gain)",
  endurance: "Improve Endurance",
  mobility: "Recovery & Mobility",
  recovery: "Recovery & Mobility",
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

/** Sport-mode / informal labels that should resolve to a canonical Manual primary-focus label. */
const PRIMARY_FOCUS_LABEL_ALIASES: Record<string, string> = {
  hypertrophy: "muscle",
  recovery: "recovery_mobility",
  "build visible muscle": "muscle",
  "build muscle": "muscle",
  "max strength": "strength",
  "max strength foundation": "strength",
  "endurance engine": "endurance",
  "physique / body comp": "physique",
  "recovery & mobility": "recovery_mobility",
  "joint health strength": "joint_health",
  "athletic performance": "athletic_performance",
};

function normGoalKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

/**
 * Normalize a stored goal slug, sport-mode id, or informal label to a Manual
 * primary-focus label used by week day presets.
 */
export function canonicalizePrimaryFocusLabel(raw: string | null | undefined): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return "";
  const directSlug = PRIMARY_FOCUS_TO_GOAL_SLUG[trimmed];
  if (directSlug) return GOAL_SLUG_TO_PRIMARY_FOCUS[directSlug] ?? trimmed;

  const underscored = trimmed.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
  if (GOAL_SLUG_TO_PRIMARY_FOCUS[underscored]) return GOAL_SLUG_TO_PRIMARY_FOCUS[underscored]!;

  const spaced = normGoalKey(trimmed);
  const aliased = PRIMARY_FOCUS_LABEL_ALIASES[spaced] ?? PRIMARY_FOCUS_LABEL_ALIASES[underscored];
  if (aliased && GOAL_SLUG_TO_PRIMARY_FOCUS[aliased]) return GOAL_SLUG_TO_PRIMARY_FOCUS[aliased]!;

  return trimmed;
}

/** Unique canonical labels, preserving first-seen order. */
export function canonicalizePrimaryFocusLabels(
  labels: readonly (string | null | undefined)[] | null | undefined
): string[] {
  const out: string[] = [];
  for (const raw of labels ?? []) {
    const next = canonicalizePrimaryFocusLabel(raw);
    if (!next || out.includes(next)) continue;
    out.push(next);
  }
  return out;
}
