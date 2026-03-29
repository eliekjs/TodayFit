-- Deactivate legacy sport_mode rows that duplicate canonical Sports Prep catalog slugs.
-- Original seed (20250301000001) inserted marathon, swimming, rowing_racing, cross_country_skiing
-- alongside canonical rows from 20250301000007 (road_running, swimming_open_water, rowing_erg, xc_skiing).
-- Stored user slugs still resolve via data/sportSubFocus/canonicalSportSlug.ts.

UPDATE public.sports
SET is_active = false
WHERE slug IN (
  'marathon',
  'swimming',
  'rowing_racing',
  'cross_country_skiing'
);
