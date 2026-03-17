-- Change of direction (COD) / Agility: add missing exercise_tags and tag main-catalog exercises
-- so the "Agility / Change of direction" goal sub-focus (agility_cod) surfaces accurate exercises.
-- See docs/research/change-of-direction-exercise-tagging.md and goal-sub-goals-audit-2025.md.

-- 1) Ensure COD tag slugs exist in exercise_tags (agility, lateral_power, single_leg_strength)
INSERT INTO public.exercise_tags (slug, name, tag_group, sort_order, weight)
VALUES
  ('agility', 'Agility', 'general', 113, 1.0),
  ('lateral_power', 'Lateral power', 'general', 114, 1.0),
  ('single_leg_strength', 'Single-leg strength', 'general', 115, 1.0)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  tag_group = EXCLUDED.tag_group,
  sort_order = EXCLUDED.sort_order,
  weight = COALESCE(public.exercise_tags.weight, EXCLUDED.weight);

-- 2) Tag COD-relevant exercises in exercise_tag_map (only for exercises that exist)
--    Pairs: (exercise_slug, tag_slug). INSERT only; ON CONFLICT DO NOTHING.
WITH cod_pairs(exercise_slug, tag_slug) AS (
  VALUES
    -- Lateral bound: full COD profile
    ('lateral_bound', 'agility'),
    ('lateral_bound', 'plyometric'),
    ('lateral_bound', 'lateral_power'),
    ('lateral_bound', 'single_leg_strength'),
    ('lateral_bound', 'balance'),
    -- Box jump
    ('box_jump', 'agility'),
    ('box_jump', 'plyometric'),
    -- Jump squat
    ('jump_squat', 'agility'),
    ('jump_squat', 'plyometric'),
    -- Jump lunge
    ('jump_lunge', 'agility'),
    ('jump_lunge', 'plyometric'),
    ('jump_lunge', 'single_leg_strength'),
    ('jump_lunge', 'balance'),
    -- Lateral lunge
    ('lateral_lunge', 'agility'),
    ('lateral_lunge', 'lateral_power'),
    ('lateral_lunge', 'single_leg_strength'),
    ('lateral_lunge', 'balance'),
    -- Banded walk
    ('banded_walk', 'agility'),
    ('banded_walk', 'lateral_power'),
    ('banded_walk', 'balance'),
    -- Step-up (DB slug: stepup)
    ('stepup', 'agility'),
    ('stepup', 'single_leg_strength'),
    ('stepup', 'balance'),
    -- Single-leg RDL
    ('single_leg_rdl', 'single_leg_strength'),
    ('single_leg_rdl', 'balance'),
    -- Reverse lunge
    ('reverse_lunge', 'agility'),
    ('reverse_lunge', 'single_leg_strength'),
    ('reverse_lunge', 'balance'),
    -- Bulgarian split squat
    ('bulgarian_split_squat', 'agility'),
    ('bulgarian_split_squat', 'single_leg_strength'),
    ('bulgarian_split_squat', 'balance'),
    -- Goblet lateral lunge
    ('goblet_lateral_lunge', 'agility'),
    ('goblet_lateral_lunge', 'lateral_power'),
    ('goblet_lateral_lunge', 'single_leg_strength'),
    ('goblet_lateral_lunge', 'balance'),
    -- Single-leg hop
    ('single_leg_hop', 'agility'),
    ('single_leg_hop', 'plyometric'),
    ('single_leg_hop', 'lateral_power'),
    ('single_leg_hop', 'single_leg_strength'),
    ('single_leg_hop', 'balance'),
    -- Split squat (single-leg, balance)
    ('split_squat', 'single_leg_strength'),
    ('split_squat', 'balance')
)
INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id
FROM cod_pairs p
JOIN public.exercises e ON e.slug = p.exercise_slug AND e.is_active = true
JOIN public.exercise_tags t ON t.slug = p.tag_slug
ON CONFLICT (exercise_id, tag_id) DO NOTHING;
