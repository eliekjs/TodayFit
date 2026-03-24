-- Consolidate overlapping sports for Sports Prep: hide flag football (→ american_football),
-- clarify running + climbing + football display names, deactivate legacy "football" slug if present.

UPDATE public.sports
SET is_active = false
WHERE slug IN ('flag_football', 'football');

UPDATE public.sports
SET
  name = 'Running (road & marathon)',
  description = 'Road running and marathon training from 5K through marathon. Sub-goals cover economy, threshold, marathon pace, and durability.'
WHERE slug = 'road_running';

UPDATE public.sports
SET
  name = 'American Football (tackle & flag)',
  description = 'Tackle and flag football. Gym priorities overlap with rugby and other collision field sports.'
WHERE slug = 'american_football';

UPDATE public.sports
SET
  name = 'Climbing (bouldering, rope, gym)',
  description = 'Bouldering, sport, lead, trad, and gym climbing. Pick strength vs endurance emphasis and specific focuses.'
WHERE slug = 'rock_climbing';

UPDATE public.sports
SET
  description = 'Field rugby codes (union / league / sevens). Sub-goals align with American football–style field strength and power.'
WHERE slug = 'rugby';
