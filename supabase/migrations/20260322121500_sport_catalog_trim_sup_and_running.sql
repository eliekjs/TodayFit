-- Trim sport picker catalog:
-- - Remove Stand-Up Paddleboarding from active selection.
-- - Keep Trail Running distinct, but fold other running variants into road_running.
-- - Ensure climbing variants are hidden in favor of consolidated rock_climbing.

UPDATE public.sports
SET
  name = 'Running (road, marathon, ultra)',
  description = 'Road running, marathon, and ultra running combined. Trail running remains separate.'
WHERE slug = 'road_running';

UPDATE public.sports
SET
  name = 'Climbing (rock, bouldering, ice)',
  description = 'Rock climbing, bouldering, and ice climbing combined under one climbing profile.'
WHERE slug = 'rock_climbing';

UPDATE public.sports
SET is_active = false
WHERE slug IN (
  'sup',
  'ultra_running',
  'marathon_running',
  'ice_climbing',
  'rock_bouldering',
  'rock_sport_lead',
  'rock_trad',
  'climbing',
  'bouldering'
);
