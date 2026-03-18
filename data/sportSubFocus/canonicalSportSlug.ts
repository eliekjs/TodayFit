/**
 * Maps legacy/deprecated sport slugs to the canonical slug after consolidation.
 * Use when resolving sub-focus, tag map, or quality weights so old stored slugs still work.
 */

export const LEGACY_TO_CANONICAL_SPORT: Record<string, string> = {
  // Backcountry: splitboarding → backcountry_skiing (name updated to "Backcountry Skiing or Splitboarding")
  splitboarding: "backcountry_skiing",
  // Rock climbing: bouldering, sport/lead, trad → rock_climbing
  rock_bouldering: "rock_climbing",
  rock_sport_lead: "rock_climbing",
  rock_trad: "rock_climbing",
  // Volleyball: indoor + beach → volleyball
  volleyball_indoor: "volleyball",
  volleyball_beach: "volleyball",
  // Track: track_field → track_sprinting
  track_field: "track_sprinting",
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
};

/**
 * Returns the canonical sport slug for lookup. If the slug was consolidated, returns the new slug; otherwise returns the input.
 */
export function getCanonicalSportSlug(slug: string): string {
  if (!slug) return slug;
  const normalized = slug.toLowerCase().trim();
  return LEGACY_TO_CANONICAL_SPORT[normalized] ?? normalized;
}
