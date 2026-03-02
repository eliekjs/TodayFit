-- Idempotent seed for goals + goal_demand_profile used by Sports Prep / Adaptive mode.
-- Run after 20250301000004_sport_prep_plans_schema.sql

-- ---------------------------------------------------------------------------
-- Goals catalog
-- ---------------------------------------------------------------------------

INSERT INTO public.goals (slug, name, goal_type, description, tags)
VALUES
  ('strength', 'Max strength foundation', 'performance', 'Build a strong base for heavier lifts and sport power.', '["gym","strength"]'::jsonb),
  ('muscle', 'Build visible muscle', 'physique', 'Hypertrophy-biased training for size and shape.', '["physique","hypertrophy"]'::jsonb),
  ('endurance', 'Endurance engine', 'performance', 'Cardio base and sustainable engine for long efforts.', '["endurance","aerobic"]'::jsonb),
  ('conditioning', 'Sport-specific conditioning', 'performance', 'Repeat sprint / interval engine tuned to your sport.', '["conditioning","sport"]'::jsonb),
  ('mobility', 'Mobility & joint health', 'mobility', 'Range of motion, joint-friendly patterns, tissue quality.', '["mobility","recovery"]'::jsonb),
  ('climbing', 'Climbing / grip performance', 'sport', 'Strength, power, and density for climbing and grip.', '["climbing","grip"]'::jsonb),
  ('trail_running', 'Trail running', 'sport', 'Uphill engine, downhill resilience, and strength support.', '["trail","running"]'::jsonb),
  ('ski', 'Ski / snow', 'sport', 'Leg endurance, eccentric control, and trunk stability.', '["ski","winter"]'::jsonb),
  ('physique', 'Physique / body comp', 'physique', 'Body recomposition and aesthetic changes.', '["physique","recomp"]'::jsonb),
  ('resilience', 'Resilience / recovery', 'mobility', 'Injury resilience, rebuild phases, and recovery capacity.', '["rehab","resilience"]'::jsonb)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  goal_type = EXCLUDED.goal_type,
  description = EXCLUDED.description,
  tags = EXCLUDED.tags;

-- ---------------------------------------------------------------------------
-- Goal demand profiles
-- Simple relative weights (0-3) across strength, power, aerobic, anaerobic,
-- mobility, prehab, and recovery.
-- ---------------------------------------------------------------------------

WITH rows(slug, strength, power, aerobic, anaerobic, mobility, prehab, recovery) AS (
  VALUES
    -- Performance
    ('strength', 3, 1, 1, 1, 1, 1, 1),
    ('endurance', 1, 0, 3, 1, 1, 1, 1),
    ('conditioning', 1, 2, 2, 3, 1, 1, 1),

    -- Physique
    ('muscle', 2, 0, 1, 1, 1, 1, 1),
    ('physique', 2, 0, 1, 1, 1, 1, 1),

    -- Mobility / resilience
    ('mobility', 0, 0, 1, 0, 3, 2, 2),
    ('resilience', 0, 0, 1, 0, 2, 3, 3),

    -- Sport goals (approximate composite demands)
    ('climbing', 2, 3, 1, 1, 1, 2, 1),
    ('trail_running', 1, 1, 3, 2, 1, 2, 1),
    ('ski', 2, 2, 2, 2, 1, 2, 1)
)
INSERT INTO public.goal_demand_profile (
  goal_id,
  strength,
  power,
  aerobic,
  anaerobic,
  mobility,
  prehab,
  recovery
)
SELECT
  g.id,
  r.strength,
  r.power,
  r.aerobic,
  r.anaerobic,
  r.mobility,
  r.prehab,
  r.recovery
FROM rows r
JOIN public.goals g ON g.slug = r.slug
ON CONFLICT (goal_id) DO UPDATE SET
  strength = EXCLUDED.strength,
  power = EXCLUDED.power,
  aerobic = EXCLUDED.aerobic,
  anaerobic = EXCLUDED.anaerobic,
  mobility = EXCLUDED.mobility,
  prehab = EXCLUDED.prehab,
  recovery = EXCLUDED.recovery;

