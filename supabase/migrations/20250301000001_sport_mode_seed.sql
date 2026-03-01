-- Idempotent seed: sports, sport_qualities, sport_quality_map
-- Run after 20250301000000_sport_mode_schema.sql

-- Sport qualities (upsert by slug)
INSERT INTO public.sport_qualities (slug, name, description, quality_group, is_active, sort_order)
VALUES
  ('speed_agility', 'Speed & Agility', 'Quick direction changes, acceleration, reaction', 'performance', true, 1),
  ('power', 'Power', 'Explosive strength, jumping, throwing', 'performance', true, 2),
  ('conditioning', 'Conditioning', 'Work capacity, repeat efforts, gas tank', 'energy_system', true, 3),
  ('durability_resilience', 'Durability & Resilience', 'Injury resilience, load tolerance, recovery', 'resilience', true, 4),
  ('transfer', 'Transfer', 'Sport-specific carryover from gym to field', 'transfer', true, 5)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  quality_group = EXCLUDED.quality_group,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;

-- Sports by category (upsert by slug)
INSERT INTO public.sports (slug, name, category, is_active, sort_order)
VALUES
  -- team sports
  ('soccer', 'Soccer', 'team_sports', true, 1),
  ('basketball', 'Basketball', 'team_sports', true, 2),
  ('football', 'Football (American)', 'team_sports', true, 3),
  ('hockey', 'Hockey', 'team_sports', true, 4),
  ('rugby', 'Rugby', 'team_sports', true, 5),
  ('volleyball', 'Volleyball', 'team_sports', true, 6),
  -- racquet
  ('tennis', 'Tennis', 'racquet', true, 10),
  ('squash', 'Squash', 'racquet', true, 11),
  ('badminton', 'Badminton', 'racquet', true, 12),
  -- climbing
  ('climbing', 'Climbing', 'climbing', true, 20),
  ('bouldering', 'Bouldering', 'climbing', true, 21),
  -- winter
  ('alpine_skiing', 'Alpine Skiing', 'winter', true, 30),
  ('cross_country_skiing', 'Cross-Country Skiing', 'winter', true, 31),
  ('snowboarding', 'Snowboarding', 'winter', true, 32),
  ('backcountry_skiing', 'Backcountry Skiing', 'winter', true, 33),
  -- combat
  ('boxing', 'Boxing', 'combat', true, 40),
  ('wrestling', 'Wrestling', 'combat', true, 41),
  ('bjj', 'BJJ', 'combat', true, 42),
  ('mma', 'MMA', 'combat', true, 43),
  -- track/sprint
  ('sprinting', 'Sprinting', 'track_sprint', true, 50),
  ('track_field', 'Track & Field', 'track_sprint', true, 51),
  -- endurance racing
  ('marathon', 'Marathon / Road Running', 'endurance_racing', true, 60),
  ('trail_running', 'Trail Running', 'endurance_racing', true, 61),
  ('cycling', 'Cycling', 'endurance_racing', true, 62),
  ('triathlon', 'Triathlon', 'endurance_racing', true, 63),
  ('swimming', 'Swimming', 'endurance_racing', true, 64),
  ('rowing_racing', 'Rowing (Racing)', 'endurance_racing', true, 65)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;

-- sport_quality_map: relevance 1 (high) to 3 (low). Use subqueries to resolve slug -> id.
-- Format: (sport_slug, quality_slug, relevance)
-- We use a CTE to insert from values + join to get UUIDs.
WITH map_rows(sport_slug, quality_slug, relevance) AS (
  VALUES
    ('soccer', 'speed_agility', 1),
    ('soccer', 'conditioning', 1),
    ('soccer', 'power', 2),
    ('soccer', 'durability_resilience', 2),
    ('soccer', 'transfer', 1),
    ('basketball', 'speed_agility', 1),
    ('basketball', 'power', 1),
    ('basketball', 'conditioning', 2),
    ('basketball', 'durability_resilience', 2),
    ('basketball', 'transfer', 1),
    ('football', 'power', 1),
    ('football', 'speed_agility', 1),
    ('football', 'durability_resilience', 1),
    ('football', 'conditioning', 2),
    ('football', 'transfer', 2),
    ('hockey', 'power', 1),
    ('hockey', 'conditioning', 1),
    ('hockey', 'speed_agility', 2),
    ('hockey', 'durability_resilience', 2),
    ('hockey', 'transfer', 1),
    ('rugby', 'power', 1),
    ('rugby', 'conditioning', 1),
    ('rugby', 'durability_resilience', 1),
    ('rugby', 'speed_agility', 2),
    ('rugby', 'transfer', 2),
    ('volleyball', 'power', 1),
    ('volleyball', 'speed_agility', 2),
    ('volleyball', 'transfer', 1),
    ('volleyball', 'durability_resilience', 2),
    ('tennis', 'speed_agility', 1),
    ('tennis', 'power', 2),
    ('tennis', 'conditioning', 2),
    ('tennis', 'transfer', 1),
    ('tennis', 'durability_resilience', 2),
    ('squash', 'conditioning', 1),
    ('squash', 'speed_agility', 1),
    ('squash', 'power', 2),
    ('squash', 'transfer', 1),
    ('badminton', 'speed_agility', 1),
    ('badminton', 'power', 2),
    ('badminton', 'transfer', 1),
    ('climbing', 'power', 1),
    ('climbing', 'durability_resilience', 1),
    ('climbing', 'transfer', 1),
    ('climbing', 'conditioning', 2),
    ('bouldering', 'power', 1),
    ('bouldering', 'durability_resilience', 1),
    ('bouldering', 'transfer', 1),
    ('alpine_skiing', 'power', 1),
    ('alpine_skiing', 'durability_resilience', 1),
    ('alpine_skiing', 'speed_agility', 2),
    ('alpine_skiing', 'transfer', 1),
    ('cross_country_skiing', 'conditioning', 1),
    ('cross_country_skiing', 'power', 2),
    ('cross_country_skiing', 'durability_resilience', 2),
    ('cross_country_skiing', 'transfer', 1),
    ('snowboarding', 'power', 2),
    ('snowboarding', 'durability_resilience', 1),
    ('snowboarding', 'transfer', 1),
    ('backcountry_skiing', 'conditioning', 1),
    ('backcountry_skiing', 'durability_resilience', 1),
    ('backcountry_skiing', 'power', 2),
    ('backcountry_skiing', 'transfer', 1),
    ('boxing', 'power', 1),
    ('boxing', 'conditioning', 1),
    ('boxing', 'speed_agility', 2),
    ('boxing', 'durability_resilience', 2),
    ('boxing', 'transfer', 1),
    ('wrestling', 'power', 1),
    ('wrestling', 'conditioning', 1),
    ('wrestling', 'durability_resilience', 1),
    ('wrestling', 'transfer', 2),
    ('bjj', 'power', 2),
    ('bjj', 'conditioning', 2),
    ('bjj', 'durability_resilience', 1),
    ('bjj', 'transfer', 1),
    ('mma', 'power', 1),
    ('mma', 'conditioning', 1),
    ('mma', 'durability_resilience', 1),
    ('mma', 'transfer', 1),
    ('sprinting', 'power', 1),
    ('sprinting', 'speed_agility', 1),
    ('sprinting', 'transfer', 1),
    ('sprinting', 'conditioning', 2),
    ('track_field', 'power', 1),
    ('track_field', 'speed_agility', 1),
    ('track_field', 'transfer', 1),
    ('marathon', 'conditioning', 1),
    ('marathon', 'durability_resilience', 1),
    ('marathon', 'power', 2),
    ('marathon', 'transfer', 2),
    ('trail_running', 'conditioning', 1),
    ('trail_running', 'durability_resilience', 1),
    ('trail_running', 'power', 2),
    ('trail_running', 'transfer', 1),
    ('cycling', 'conditioning', 1),
    ('cycling', 'power', 2),
    ('cycling', 'durability_resilience', 2),
    ('cycling', 'transfer', 1),
    ('triathlon', 'conditioning', 1),
    ('triathlon', 'durability_resilience', 1),
    ('triathlon', 'transfer', 1),
    ('triathlon', 'power', 3),
    ('swimming', 'conditioning', 1),
    ('swimming', 'power', 2),
    ('swimming', 'transfer', 1),
    ('rowing_racing', 'power', 1),
    ('rowing_racing', 'conditioning', 1),
    ('rowing_racing', 'durability_resilience', 2),
    ('rowing_racing', 'transfer', 1)
)
INSERT INTO public.sport_quality_map (sport_id, quality_id, relevance)
SELECT s.id, q.id, m.relevance
FROM map_rows m
JOIN public.sports s ON s.slug = m.sport_slug
JOIN public.sport_qualities q ON q.slug = m.quality_slug
ON CONFLICT (sport_id, quality_id) DO UPDATE SET relevance = EXCLUDED.relevance;
