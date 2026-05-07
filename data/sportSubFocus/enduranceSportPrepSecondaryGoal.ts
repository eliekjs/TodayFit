/**
 * Decide when sport prep should append `endurance` as a secondary PrimaryGoal while the session
 * primary remains strength/hypertrophy/power/etc. That activates the existing endurance/conditioning
 * constraint path (e.g. finisher) without treating every sport sub-focus as aerobic work.
 *
 * Tradeoff we intentionally avoid: `"any sub-focus for cycling → endurance secondary"` would fire
 * for leg_strength–only cyclists and dilute strength-primary sessions; we instead require sub-focus
 * slugs that imply engine / Zone2-ish / threshold-capacity priorities.
 */

import { SPORTS_WITH_SUB_FOCUSES } from "./sportsWithSubFocuses";

function normSlug(s: string): string {
  return String(s).toLowerCase().replace(/\s/g, "_");
}

/** All sports listed under Sports Prep category "Endurance" (canonical slugs). */
const CANONICAL_SPORTS_IN_ENDURANCE_CATEGORY = new Set(
  SPORTS_WITH_SUB_FOCUSES.filter((s) => s.category === "Endurance").map((s) => s.slug)
);

/**
 * Canonical sport slugs that are aerobic/threshold/engine-primary in prep even when their picker
 * category is not `"Endurance"` (kept small and explicit; extend alongside sportsWithSubFocuses).
 */
const EXTRA_ENGINE_PRIMARY_SPORTS = [
  "xc_skiing",
  "rowing_erg",
  "swimming_open_water",
  /** Uphill/skin engine + vert days */
  "backcountry_skiing",
  /** Paddling / repeat efforts */
  "surfing",
] as const;

export const ENDURANCE_ENGINE_CANONICAL_SPORT_SLUGS = new Set<string>([
  ...CANONICAL_SPORTS_IN_ENDURANCE_CATEGORY,
  ...EXTRA_ENGINE_PRIMARY_SPORTS,
]);

/**
 * Sub-focus selections that imply the athlete wants aerobic base, thresholds, pacing, or comparable
 * work capacity—not purely strength/power/mobility emphasis for that sport.
 */
export const ENDURANCE_SIGNAL_SPORT_SUB_FOCUS_SLUGS = new Set([
  normSlug("aerobic_base"),
  normSlug("uphill_endurance"),
  normSlug("marathon_pace"),
  normSlug("threshold"),
  normSlug("speed_endurance"),
  normSlug("vo2_intervals"),
  normSlug("power_endurance"),
  normSlug("bike_run_durability"),
  normSlug("load_carriage_durability"),
  normSlug("leg_resilience"),
  normSlug("durability"),
  normSlug("paddle_endurance"),
]);

export function sportSubFocusSelectionsImplyEnduranceSecondary(
  canonicalSportSlug: string,
  selectedSubFocusSlugs: string[] | undefined | null
): boolean {
  if (!ENDURANCE_ENGINE_CANONICAL_SPORT_SLUGS.has(canonicalSportSlug)) return false;
  if (!selectedSubFocusSlugs?.length) return false;
  return selectedSubFocusSlugs.some((s) =>
    ENDURANCE_SIGNAL_SPORT_SUB_FOCUS_SLUGS.has(normSlug(s))
  );
}
