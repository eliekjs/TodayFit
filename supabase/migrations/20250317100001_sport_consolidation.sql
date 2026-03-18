-- Sport consolidation: add canonical combined sports and deactivate legacy slugs.
-- App maps legacy slugs to canonical via data/sportSubFocus/canonicalSportSlug.ts.
-- Run after: 20250301000007_sports_canonical_seed.sql

-- 1. Update backcountry_skiing display name to include splitboarding
UPDATE public.sports
SET name = 'Backcountry Skiing or Splitboarding',
    description = 'Human-powered ski touring and backcountry descents (skis or splitboard).'
WHERE slug = 'backcountry_skiing';

-- 2. Insert new canonical sports (consolidated)
INSERT INTO public.sports (slug, name, category, description, is_active, popularity_tier)
VALUES
  ('rock_climbing', 'Rock Climbing', 'Climbing', 'Bouldering, sport, lead, and trad rock climbing. Sub-goals cover power vs endurance.', true, 1),
  ('volleyball', 'Volleyball', 'Court/Field', 'Indoor and beach volleyball.', true, 2),
  ('cycling', 'Cycling', 'Endurance', 'Road and mountain cycling. Sub-goals cover aerobic, threshold, VO2, power endurance.', true, 1),
  ('court_racquet', 'Racquet & Court Sports', 'Court/Field', 'Tennis, pickleball, badminton, squash. Shared movement and training priorities.', true, 1),
  ('grappling', 'Grappling (BJJ, Judo, MMA, Wrestling)', 'Combat/Grappling', 'Brazilian Jiu-Jitsu, Judo, MMA, and Wrestling. Sub-goals cover grip, hip, pull, explosive power, work capacity.', true, 1)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  popularity_tier = EXCLUDED.popularity_tier;

-- 3. Deactivate legacy slugs (so picker shows only canonical; existing user data still resolves via app mapping)
UPDATE public.sports SET is_active = false WHERE slug IN (
  'splitboarding',
  'rock_bouldering',
  'rock_sport_lead',
  'rock_trad',
  'volleyball_indoor',
  'volleyball_beach',
  'track_field',
  'cycling_road',
  'cycling_mtb',
  'tennis',
  'pickleball',
  'badminton',
  'squash',
  'bjj',
  'judo',
  'mma',
  'wrestling'
);

-- 4. Update track_sprinting display name to reflect consolidation
UPDATE public.sports
SET name = 'Track & Field / Sprinting'
WHERE slug = 'track_sprinting';
