-- Allow unauthenticated (anon) read access to all catalog/reference data
-- so the app can load sports, exercises, goals, etc. without sign-in.
-- User-specific data (profiles, saved workouts, week plans) stays authenticated-only.

-- Sport mode catalogs (20250301000000)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sports' AND policyname = 'sports_select_anon') THEN
    CREATE POLICY "sports_select_anon" ON public.sports FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sport_qualities' AND policyname = 'sport_qualities_select_anon') THEN
    CREATE POLICY "sport_qualities_select_anon" ON public.sport_qualities FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sport_quality_map' AND policyname = 'sport_quality_map_select_anon') THEN
    CREATE POLICY "sport_quality_map_select_anon" ON public.sport_quality_map FOR SELECT TO anon USING (true);
  END IF;
END$$;

-- App entities: exercises, tags, maps (20250301000002)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'exercises' AND policyname = 'exercises_select_anon') THEN
    CREATE POLICY "exercises_select_anon" ON public.exercises FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'exercise_tags' AND policyname = 'exercise_tags_select_anon') THEN
    CREATE POLICY "exercise_tags_select_anon" ON public.exercise_tags FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'exercise_tag_map' AND policyname = 'exercise_tag_map_select_anon') THEN
    CREATE POLICY "exercise_tag_map_select_anon" ON public.exercise_tag_map FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'exercise_contraindications' AND policyname = 'exercise_contraindications_select_anon') THEN
    CREATE POLICY "exercise_contraindications_select_anon" ON public.exercise_contraindications FOR SELECT TO anon USING (true);
  END IF;
END$$;

-- Sport prep: goals and demand profiles (20250301000004)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'goals' AND policyname = 'goals_select_anon') THEN
    CREATE POLICY "goals_select_anon" ON public.goals FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'goal_demand_profile' AND policyname = 'goal_demand_profile_select_anon') THEN
    CREATE POLICY "goal_demand_profile_select_anon" ON public.goal_demand_profile FOR SELECT TO anon USING (true);
  END IF;
END$$;

-- Sports tags and starter exercises (20250301000008)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sport_tag_profile' AND policyname = 'sport_tag_profile_select_anon') THEN
    CREATE POLICY "sport_tag_profile_select_anon" ON public.sport_tag_profile FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'exercise_tag_taxonomy' AND policyname = 'exercise_tag_taxonomy_select_anon') THEN
    CREATE POLICY "exercise_tag_taxonomy_select_anon" ON public.exercise_tag_taxonomy FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'starter_exercises' AND policyname = 'starter_exercises_select_anon') THEN
    CREATE POLICY "starter_exercises_select_anon" ON public.starter_exercises FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'goal_exercise_relevance' AND policyname = 'goal_exercise_relevance_select_anon') THEN
    CREATE POLICY "goal_exercise_relevance_select_anon" ON public.goal_exercise_relevance FOR SELECT TO anon USING (true);
  END IF;
END$$;
