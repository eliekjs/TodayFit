/**
 * Pilot / v1 catalog allowlists (D1 sports + D2 goals decided 2026-08-12/13).
 */

/** Sports shown in Sports Prep for the closed pilot (19 after priority build-up). */
export const PILOT_SPORT_SLUGS = [
  "golf",
  "american_football",
  "cycling",
  "swimming_open_water", // display name: "Swimming" (no open-water verbiage)
  "rock_climbing",
  "lacrosse",
  "boxing",
  "volleyball",
  "court_racquet",
  "basketball",
  "hockey",
  "road_running",
  // Priority build-up — pools cleared 2026-08-12 (see docs/PRIORITY_SPORT_MAPPING_PLAN.md)
  "surfing",
  "xc_skiing",
  "soccer",
  "trail_running",
  "alpine_skiing",
  "backcountry_skiing",
  "snowboarding",
] as const;

export type PilotSportSlug = (typeof PILOT_SPORT_SLUGS)[number];

const PILOT_SPORT_SET = new Set<string>(PILOT_SPORT_SLUGS);

/**
 * Previously thinner focus-audience sports. Cleared pool gates 2026-08-12 and
 * merged into PILOT_SPORT_SLUGS — kept empty for call-site compatibility.
 */
export const PRIORITY_BUILDUP_SPORT_SLUGS = [] as const;

/**
 * Pilot primary-focus labels (D2 2026-08-13): keep Recovery & Mobility; drop
 * Calisthenics + Joint Health for pilot variety. Labels must match
 * `PRIMARY_FOCUS_OPTIONS` in preferencesConstants.
 */
export const PILOT_PRIMARY_FOCUS_LABELS = [
  "Build Strength",
  "Build Muscle (Hypertrophy)",
  "Body Recomp (fat loss & muscle gain)",
  "Improve Endurance",
  "Recovery & Mobility",
  "Athletic Performance",
] as const;

export type PilotPrimaryFocusLabel = (typeof PILOT_PRIMARY_FOCUS_LABELS)[number];

const PILOT_GOAL_SET = new Set<string>(PILOT_PRIMARY_FOCUS_LABELS);

export function isPilotSportSlug(slug: string | null | undefined): boolean {
  if (!slug) return false;
  return PILOT_SPORT_SET.has(slug.trim().toLowerCase());
}

export function filterPilotSports<T extends { slug?: string | null }>(sports: T[]): T[] {
  return sports.filter((s) => isPilotSportSlug(s.slug));
}

export function isPilotPrimaryFocusLabel(label: string | null | undefined): boolean {
  if (!label) return false;
  return PILOT_GOAL_SET.has(label);
}

export function filterPilotPrimaryFocusLabels(labels: readonly string[]): string[] {
  return labels.filter((l) => isPilotPrimaryFocusLabel(l));
}

/**
 * Pilot: hide goal / sub-goal / sport match-% editors in Advanced options.
 * Defaults still drive generation; flip to false when reintroducing the UI.
 */
export const PILOT_HIDE_MATCH_PCT_ADVANCED_OPTIONS = true;
