-- Pilot sports scope (D1 2026-08-12): 12 sports active; swimming display name cleaned.
-- App also filters via lib/pilotCatalog.ts (bundled offline path).

UPDATE public.sports
SET name = 'Swimming'
WHERE slug = 'swimming_open_water'
  AND name IS DISTINCT FROM 'Swimming';

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
  'road_running'
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
  'road_running'
);
