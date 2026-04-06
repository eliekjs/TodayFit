/**
 * Maps legacy/deprecated sport slugs to the canonical slug after consolidation.
 * Use when resolving sub-focus, tag map, or quality weights so old stored slugs still work.
 */

export const LEGACY_TO_CANONICAL_SPORT: Record<string, string> = {
  // Backcountry: splitboarding → backcountry_skiing (name updated to "Backcountry Skiing or Splitboarding")
  splitboarding: "backcountry_skiing",
  // Running: marathon-specific slug merged into road_running
  marathon_running: "road_running",
  ultra_running: "road_running",
  /** Legacy sport_mode seed (`20250301000001`) — same as canonical road_running */
  marathon: "road_running",
  /** Legacy sport_mode seed — same as canonical swimming_open_water */
  swimming: "swimming_open_water",
  /** Legacy sport_mode seed — same as canonical rowing_erg */
  rowing_racing: "rowing_erg",
  /** Legacy sport_mode seed — same as canonical xc_skiing */
  cross_country_skiing: "xc_skiing",
  // Rock climbing: bouldering, sport/lead, trad → rock_climbing
  rock_bouldering: "rock_climbing",
  rock_sport_lead: "rock_climbing",
  rock_trad: "rock_climbing",
  ice_climbing: "rock_climbing",
  bouldering: "rock_climbing",
  // Volleyball: indoor + beach → volleyball
  volleyball_indoor: "volleyball",
  volleyball_beach: "volleyball",
  // Track / sprinting: legacy slugs → track_sprinting
  track_field: "track_sprinting",
  /** Legacy `sport_mode` seed slug; same programming as track_sprinting */
  sprinting: "track_sprinting",
  // Removed from product (picker + catalog): map stored profile slugs for backward-compatible generation
  strongman: "hyrox",
  ocr_spartan: "hyrox",
  tactical_fitness: "hyrox",
  crossfit: "hyrox",
  /** Former “General Strength (Powerlifting)” */
  general_strength: "powerbuilding",
  olympic_weightlifting: "powerbuilding",
  vertical_jump: "track_sprinting",
  mountaineering: "trail_running",
  // Cycling: road + mtb → cycling
  cycling_road: "cycling",
  cycling_mtb: "cycling",
  // Racquet/court: tennis, pickleball, badminton, squash → court_racquet
  tennis: "court_racquet",
  pickleball: "court_racquet",
  badminton: "court_racquet",
  squash: "court_racquet",
  // Grappling: bjj, judo, mma, wrestling → grappling
  bjj: "grappling",
  judo: "grappling",
  mma: "grappling",
  wrestling: "grappling",
  // Field football codes → american_football (shared sub-goals with rugby-style training)
  flag_football: "american_football",
  football: "american_football",
};

/**
 * Returns the canonical sport slug for lookup. If the slug was consolidated, returns the new slug; otherwise returns the input.
 */
export function getCanonicalSportSlug(slug: string): string {
  if (!slug) return slug;
  const normalized = slug.toLowerCase().trim();
  return LEGACY_TO_CANONICAL_SPORT[normalized] ?? normalized;
}
