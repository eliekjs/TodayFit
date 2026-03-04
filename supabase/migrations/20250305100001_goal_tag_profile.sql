-- Goal -> tag slugs for weighted exercise scoring. Run after 20250305100000.

CREATE TABLE IF NOT EXISTS public.goal_tag_profile (
  goal_slug text PRIMARY KEY,
  tag_slugs text[] NOT NULL DEFAULT '{}'
);

COMMENT ON TABLE public.goal_tag_profile IS
  'Maps each goal to tag slugs used when scoring how well an exercise matches that goal.';

INSERT INTO public.goal_tag_profile (goal_slug, tag_slugs)
VALUES
  ('strength', ARRAY['strength', 'compound', 'squat', 'hinge', 'push', 'pull', 'bilateral']),
  ('muscle', ARRAY['hypertrophy', 'strength', 'compound', 'isolation', 'glutes', 'quads', 'back', 'chest', 'shoulders', 'lats', 'biceps', 'triceps']),
  ('endurance', ARRAY['conditioning', 'endurance', 'energy_medium', 'energy_low', 'low_impact', 'zone2', 'legs']),
  ('conditioning', ARRAY['conditioning', 'energy_high', 'intervals', 'power', 'legs', 'locomotion']),
  ('mobility', ARRAY['mobility', 'thoracic_mobility', 'hip_mobility', 'recovery', 'energy_low', 'core']),
  ('climbing', ARRAY['grip', 'scapular_control', 'pull', 'lats', 'strength', 'unilateral', 'balance', 'sport_climbing']),
  ('trail_running', ARRAY['sport_trail', 'single_leg', 'unilateral', 'calves', 'balance', 'posterior_chain', 'quads', 'conditioning', 'low_impact']),
  ('ski', ARRAY['sport_skiing', 'quads', 'glutes', 'single_leg', 'unilateral', 'balance', 'conditioning', 'low_impact', 'squat']),
  ('physique', ARRAY['hypertrophy', 'strength', 'compound', 'conditioning', 'glutes', 'back', 'chest']),
  ('resilience', ARRAY['core_stability', 'anti_rotation', 'mobility', 'prehab', 'recovery', 'energy_low'])
ON CONFLICT (goal_slug) DO UPDATE SET tag_slugs = EXCLUDED.tag_slugs;

ALTER TABLE public.goal_tag_profile ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'goal_tag_profile' AND policyname = 'goal_tag_profile_select_authenticated') THEN
    CREATE POLICY "goal_tag_profile_select_authenticated" ON public.goal_tag_profile FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'goal_tag_profile' AND policyname = 'goal_tag_profile_select_anon') THEN
    CREATE POLICY "goal_tag_profile_select_anon" ON public.goal_tag_profile FOR SELECT TO anon USING (true);
  END IF;
END$$;

-- RPC: rank exercises by weighted goal match (uses goal_tag_profile + exercise_tag_map.relevance_weight)
CREATE OR REPLACE FUNCTION public.get_exercises_by_goals_ranked(
  goal_slugs text[] DEFAULT '{}',
  goal_weights_pct real[] DEFAULT '{}',
  result_limit int DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  slug text,
  name text,
  primary_muscles text[],
  secondary_muscles text[],
  equipment text[],
  modalities text[],
  movement_pattern text,
  total_score double precision
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n int;
BEGIN
  n := COALESCE(array_length(goal_slugs, 1), 0);
  IF n = 0 THEN
    RETURN QUERY
    SELECT e.id, e.slug, e.name, e.primary_muscles, e.secondary_muscles, e.equipment, e.modalities, e.movement_pattern,
           0::double precision
    FROM public.exercises e
    WHERE e.is_active = true
    ORDER BY e.slug
    LIMIT result_limit;
    RETURN;
  END IF;

  RETURN QUERY
  WITH goals_indexed AS (
    SELECT i AS goal_idx, goal_slugs[i] AS goal_slug,
           CASE WHEN array_length(goal_weights_pct, 1) >= i AND goal_weights_pct[i] IS NOT NULL
                THEN goal_weights_pct[i] ELSE 100.0 / n END AS w_pct
    FROM generate_series(1, n) i
    WHERE goal_slugs[i] IS NOT NULL
  ),
  goal_tag_list AS (
    SELECT gw.goal_idx, gw.w_pct, unnest(gtp.tag_slugs) AS tag_slug
    FROM goals_indexed gw
    JOIN public.goal_tag_profile gtp ON gtp.goal_slug = gw.goal_slug
  ),
  per_goal_scores AS (
    SELECT m.exercise_id, gtl.goal_idx, gtl.w_pct,
           SUM(m.relevance_weight) AS score
    FROM public.exercise_tag_map m
    JOIN public.exercise_tags t ON t.id = m.tag_id
    JOIN goal_tag_list gtl ON gtl.tag_slug = t.slug
    GROUP BY m.exercise_id, gtl.goal_idx, gtl.w_pct
  ),
  total_scores AS (
    SELECT exercise_id, SUM((w_pct / 100.0) * score) AS total_score
    FROM per_goal_scores
    GROUP BY exercise_id
  )
  SELECT e.id, e.slug, e.name, e.primary_muscles, e.secondary_muscles, e.equipment, e.modalities, e.movement_pattern,
         COALESCE(ts.total_score, 0)::double precision
  FROM public.exercises e
  LEFT JOIN total_scores ts ON ts.exercise_id = e.id
  WHERE e.is_active = true
  ORDER BY COALESCE(ts.total_score, 0) DESC, e.slug
  LIMIT result_limit;
END;
$$;

COMMENT ON FUNCTION public.get_exercises_by_goals_ranked IS
  'Returns exercises ranked by weighted goal match. goal_slugs: ordered list (1st, 2nd, 3rd goal). goal_weights_pct: same order, percentages summing to 100. Uses goal_tag_profile and exercise_tag_map.relevance_weight.';

GRANT EXECUTE ON FUNCTION public.get_exercises_by_goals_ranked TO anon;
GRANT EXECUTE ON FUNCTION public.get_exercises_by_goals_ranked TO authenticated;
