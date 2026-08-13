-- Expand pilot sports allowlist: add 7 priority sports after sub-focus pool gates cleared (2026-08-12).
-- App allowlist: lib/pilotCatalog.ts PILOT_SPORT_SLUGS.

UPDATE public.sports
SET is_active = true
WHERE slug IN (
  'golf',
  'american_football',
  'cycling',
  'swimming_open_water',
  'rock_climbing',
  'lacrosse',
  'boxing',
  'volleyball',
  'court_racquet',
  'basketball',
  'hockey',
  'road_running',
  'surfing',
  'xc_skiing',
  'soccer',
  'trail_running',
  'alpine_skiing',
  'backcountry_skiing',
  'snowboarding'
);

UPDATE public.sports
SET is_active = false
WHERE slug NOT IN (
  'golf',
  'american_football',
  'cycling',
  'swimming_open_water',
  'rock_climbing',
  'lacrosse',
  'boxing',
  'volleyball',
  'court_racquet',
  'basketball',
  'hockey',
  'road_running',
  'surfing',
  'xc_skiing',
  'soccer',
  'trail_running',
  'alpine_skiing',
  'backcountry_skiing',
  'snowboarding'
);
