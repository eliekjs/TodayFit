-- Goal sub-focus schema for Manual mode sub-goals and exercise-tag biasing.
-- Canonical data lives in data/goalSubFocus (TypeScript). This migration adds
-- optional DB tables for server-side or RPC use; the app uses the TS data
-- via getExerciseTagsForGoalSubFocuses().

-- goal_sub_focus: one row per (goal_slug, sub_focus_slug).
CREATE TABLE IF NOT EXISTS public.goal_sub_focus (
  goal_slug text NOT NULL,
  sub_focus_slug text NOT NULL,
  display_name text NOT NULL,
  sort_order smallint NOT NULL DEFAULT 0,
  PRIMARY KEY (goal_slug, sub_focus_slug)
);

COMMENT ON TABLE public.goal_sub_focus IS 'Sub-focus options per goal (Manual mode). Canonical source: data/goalSubFocus/goalSubFocusOptions.ts';

-- goal_sub_focus_tag_map: (goal_slug, sub_focus_slug) -> exercise tag slug with weight for scoring.
CREATE TABLE IF NOT EXISTS public.goal_sub_focus_tag_map (
  goal_slug text NOT NULL,
  sub_focus_slug text NOT NULL,
  tag_slug text NOT NULL,
  weight real NOT NULL DEFAULT 1.0,
  PRIMARY KEY (goal_slug, sub_focus_slug, tag_slug)
);

COMMENT ON TABLE public.goal_sub_focus_tag_map IS 'Maps goal sub-focus to exercise tags for workout generator biasing. Canonical source: data/goalSubFocus/goalSubFocusTagMap.ts';

CREATE INDEX IF NOT EXISTS idx_goal_sub_focus_tag_map_lookup
  ON public.goal_sub_focus_tag_map (goal_slug, sub_focus_slug);

-- RLS
ALTER TABLE public.goal_sub_focus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_sub_focus_tag_map ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'goal_sub_focus' AND policyname = 'goal_sub_focus_select_anon') THEN
    CREATE POLICY "goal_sub_focus_select_anon" ON public.goal_sub_focus FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'goal_sub_focus' AND policyname = 'goal_sub_focus_select_authenticated') THEN
    CREATE POLICY "goal_sub_focus_select_authenticated" ON public.goal_sub_focus FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'goal_sub_focus_tag_map' AND policyname = 'goal_sub_focus_tag_map_select_anon') THEN
    CREATE POLICY "goal_sub_focus_tag_map_select_anon" ON public.goal_sub_focus_tag_map FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'goal_sub_focus_tag_map' AND policyname = 'goal_sub_focus_tag_map_select_authenticated') THEN
    CREATE POLICY "goal_sub_focus_tag_map_select_authenticated" ON public.goal_sub_focus_tag_map FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- Seed: strength + muscle (sample). Full options and tag map live in TypeScript.
INSERT INTO public.goal_sub_focus (goal_slug, sub_focus_slug, display_name, sort_order)
VALUES
  ('strength', 'squat', 'Squat', 1),
  ('strength', 'deadlift_hinge', 'Deadlift / Hinge', 2),
  ('strength', 'bench_press', 'Bench / Press', 3),
  ('strength', 'overhead_press', 'Overhead Press', 4),
  ('strength', 'pull', 'Pull-ups / Pull', 5),
  ('strength', 'full_body', 'Full-body', 6),
  ('muscle', 'glutes', 'Glutes', 1),
  ('muscle', 'back', 'Back', 2),
  ('muscle', 'chest', 'Chest', 3),
  ('muscle', 'arms', 'Arms', 4),
  ('muscle', 'shoulders', 'Shoulders', 5),
  ('muscle', 'legs', 'Legs', 6),
  ('muscle', 'core', 'Core', 7),
  ('muscle', 'balanced', 'Balanced', 8)
ON CONFLICT (goal_slug, sub_focus_slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  sort_order = EXCLUDED.sort_order;

INSERT INTO public.goal_sub_focus_tag_map (goal_slug, sub_focus_slug, tag_slug, weight)
VALUES
  ('strength', 'squat', 'squat', 1.3),
  ('strength', 'squat', 'compound', 1.1),
  ('strength', 'squat', 'quads', 1.0),
  ('strength', 'squat', 'glutes', 1.0),
  ('strength', 'deadlift_hinge', 'hinge', 1.3),
  ('strength', 'deadlift_hinge', 'posterior_chain', 1.2),
  ('strength', 'deadlift_hinge', 'glutes', 1.1),
  ('strength', 'deadlift_hinge', 'hamstrings', 1.0),
  ('strength', 'bench_press', 'push', 1.3),
  ('strength', 'bench_press', 'chest', 1.2),
  ('strength', 'bench_press', 'triceps', 1.0),
  ('strength', 'pull', 'pull', 1.3),
  ('strength', 'pull', 'back', 1.1),
  ('strength', 'pull', 'lats', 1.1),
  ('muscle', 'glutes', 'glutes', 1.4),
  ('muscle', 'glutes', 'hinge', 1.1),
  ('muscle', 'back', 'back', 1.3),
  ('muscle', 'back', 'lats', 1.2),
  ('muscle', 'chest', 'chest', 1.3),
  ('muscle', 'chest', 'push', 1.1)
ON CONFLICT (goal_slug, sub_focus_slug, tag_slug) DO UPDATE SET weight = EXCLUDED.weight;
