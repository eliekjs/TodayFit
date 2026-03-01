-- App entities: exercises, tags, gym_profiles, workouts, user_preferences, user_goals
-- Run after sport_mode schema. Supabase-compatible.

-- exercises (reference)
CREATE TABLE IF NOT EXISTS public.exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  movement_pattern text,
  primary_muscles text[] NOT NULL DEFAULT '{}',
  secondary_muscles text[] NOT NULL DEFAULT '{}',
  equipment text[] NOT NULL DEFAULT '{}',
  modalities text[] NOT NULL DEFAULT '{}',
  level text DEFAULT 'intermediate',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exercises_slug ON public.exercises(slug);
CREATE INDEX IF NOT EXISTS idx_exercises_is_active ON public.exercises(is_active);
CREATE INDEX IF NOT EXISTS idx_exercises_equipment ON public.exercises USING GIN(equipment);
CREATE INDEX IF NOT EXISTS idx_exercises_primary_muscles ON public.exercises USING GIN(primary_muscles);

-- exercise_tags (reference)
CREATE TABLE IF NOT EXISTS public.exercise_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  tag_group text NOT NULL,
  sort_order int NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_exercise_tags_slug ON public.exercise_tags(slug);
CREATE INDEX IF NOT EXISTS idx_exercise_tags_tag_group ON public.exercise_tags(tag_group);

-- exercise_tag_map (reference)
CREATE TABLE IF NOT EXISTS public.exercise_tag_map (
  exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.exercise_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (exercise_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_exercise_tag_map_exercise ON public.exercise_tag_map(exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_tag_map_tag ON public.exercise_tag_map(tag_id);

-- exercise_contraindications (reference): joint/joint area to avoid
CREATE TABLE IF NOT EXISTS public.exercise_contraindications (
  exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  contraindication text NOT NULL,
  joint text,
  PRIMARY KEY (exercise_id, contraindication)
);

CREATE INDEX IF NOT EXISTS idx_exercise_contraindications_exercise ON public.exercise_contraindications(exercise_id);

-- gym_profiles (user-owned)
CREATE TABLE IF NOT EXISTS public.gym_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  dumbbell_max_weight int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gym_profiles_user_id ON public.gym_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_gym_profiles_is_active ON public.gym_profiles(user_id, is_active);

-- gym_profile_equipment (user-owned)
CREATE TABLE IF NOT EXISTS public.gym_profile_equipment (
  gym_profile_id uuid NOT NULL REFERENCES public.gym_profiles(id) ON DELETE CASCADE,
  equipment_slug text NOT NULL,
  available boolean NOT NULL DEFAULT true,
  notes text,
  PRIMARY KEY (gym_profile_id, equipment_slug)
);

CREATE INDEX IF NOT EXISTS idx_gym_profile_equipment_profile ON public.gym_profile_equipment(gym_profile_id);

-- workouts (user-owned)
CREATE TABLE IF NOT EXISTS public.workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'manual',
  title text,
  intent jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON public.workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_created_at ON public.workouts(user_id, created_at DESC);

-- workout_blocks (user-owned, child of workout)
CREATE TABLE IF NOT EXISTS public.workout_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  block_type text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  title text,
  reasoning text
);

CREATE INDEX IF NOT EXISTS idx_workout_blocks_workout ON public.workout_blocks(workout_id);

-- workout_exercises (user-owned)
CREATE TABLE IF NOT EXISTS public.workout_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  exercise_id uuid REFERENCES public.exercises(id) ON DELETE SET NULL,
  block_id uuid REFERENCES public.workout_blocks(id) ON DELETE SET NULL,
  sort_order int NOT NULL DEFAULT 0,
  prescription jsonb NOT NULL DEFAULT '{}',
  notes text,
  exercise_slug text,
  exercise_name text
);

CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout ON public.workout_exercises(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_block ON public.workout_exercises(block_id);

-- user_preferences (user-owned)
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  default_duration int,
  default_energy text,
  preferences jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- user_goals (user-owned)
CREATE TABLE IF NOT EXISTS public.user_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_type text NOT NULL,
  goal_slug text NOT NULL,
  priority int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_goals_user_id ON public.user_goals(user_id);

-- preference_presets (user-owned): named snapshot of preferences
CREATE TABLE IF NOT EXISTS public.preference_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  saved_at timestamptz NOT NULL DEFAULT now(),
  preferences jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_preference_presets_user_id ON public.preference_presets(user_id);

-- updated_at trigger (reuse if exists)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS set_exercises_updated_at ON public.exercises;
CREATE TRIGGER set_exercises_updated_at
  BEFORE UPDATE ON public.exercises
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_gym_profiles_updated_at ON public.gym_profiles;
CREATE TRIGGER set_gym_profiles_updated_at
  BEFORE UPDATE ON public.gym_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_workouts_updated_at ON public.workouts;
CREATE TRIGGER set_workouts_updated_at
  BEFORE UPDATE ON public.workouts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_user_preferences_updated_at ON public.user_preferences;
CREATE TRIGGER set_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_user_goals_updated_at ON public.user_goals;
CREATE TRIGGER set_user_goals_updated_at
  BEFORE UPDATE ON public.user_goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_preference_presets_updated_at ON public.preference_presets;
CREATE TRIGGER set_preference_presets_updated_at
  BEFORE UPDATE ON public.preference_presets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS: reference tables read-only for authenticated
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_tag_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_contraindications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exercises_select_authenticated" ON public.exercises
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "exercise_tags_select_authenticated" ON public.exercise_tags
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "exercise_tag_map_select_authenticated" ON public.exercise_tag_map
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "exercise_contraindications_select_authenticated" ON public.exercise_contraindications
  FOR SELECT TO authenticated USING (true);

-- RLS: user-owned tables
ALTER TABLE public.gym_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_profile_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preference_presets ENABLE ROW LEVEL SECURITY;

-- gym_profiles
CREATE POLICY "gym_profiles_select_own" ON public.gym_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "gym_profiles_insert_own" ON public.gym_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "gym_profiles_update_own" ON public.gym_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "gym_profiles_delete_own" ON public.gym_profiles FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- gym_profile_equipment (via profile ownership)
CREATE POLICY "gym_profile_equipment_select_own" ON public.gym_profile_equipment
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.gym_profiles p WHERE p.id = gym_profile_id AND p.user_id = auth.uid())
  );
CREATE POLICY "gym_profile_equipment_insert_own" ON public.gym_profile_equipment
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.gym_profiles p WHERE p.id = gym_profile_id AND p.user_id = auth.uid())
  );
CREATE POLICY "gym_profile_equipment_update_own" ON public.gym_profile_equipment
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.gym_profiles p WHERE p.id = gym_profile_id AND p.user_id = auth.uid())
  );
CREATE POLICY "gym_profile_equipment_delete_own" ON public.gym_profile_equipment
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.gym_profiles p WHERE p.id = gym_profile_id AND p.user_id = auth.uid())
  );

-- workouts
CREATE POLICY "workouts_select_own" ON public.workouts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "workouts_insert_own" ON public.workouts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "workouts_update_own" ON public.workouts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "workouts_delete_own" ON public.workouts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- workout_blocks (via workout ownership)
CREATE POLICY "workout_blocks_select_own" ON public.workout_blocks
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_id AND w.user_id = auth.uid())
  );
CREATE POLICY "workout_blocks_insert_own" ON public.workout_blocks
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_id AND w.user_id = auth.uid())
  );
CREATE POLICY "workout_blocks_update_own" ON public.workout_blocks
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_id AND w.user_id = auth.uid())
  );
CREATE POLICY "workout_blocks_delete_own" ON public.workout_blocks
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_id AND w.user_id = auth.uid())
  );

-- workout_exercises (via workout ownership)
CREATE POLICY "workout_exercises_select_own" ON public.workout_exercises
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_id AND w.user_id = auth.uid())
  );
CREATE POLICY "workout_exercises_insert_own" ON public.workout_exercises
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_id AND w.user_id = auth.uid())
  );
CREATE POLICY "workout_exercises_update_own" ON public.workout_exercises
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_id AND w.user_id = auth.uid())
  );
CREATE POLICY "workout_exercises_delete_own" ON public.workout_exercises
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_id AND w.user_id = auth.uid())
  );

-- user_preferences
CREATE POLICY "user_preferences_select_own" ON public.user_preferences FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_preferences_insert_own" ON public.user_preferences FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_preferences_update_own" ON public.user_preferences FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_preferences_delete_own" ON public.user_preferences FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- user_goals
CREATE POLICY "user_goals_select_own" ON public.user_goals FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_goals_insert_own" ON public.user_goals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_goals_update_own" ON public.user_goals FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_goals_delete_own" ON public.user_goals FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- preference_presets
CREATE POLICY "preference_presets_select_own" ON public.preference_presets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "preference_presets_insert_own" ON public.preference_presets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "preference_presets_update_own" ON public.preference_presets FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "preference_presets_delete_own" ON public.preference_presets FOR DELETE TO authenticated USING (auth.uid() = user_id);
