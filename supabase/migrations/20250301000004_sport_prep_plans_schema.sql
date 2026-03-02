-- Sports Prep / Adaptive Mode schema
-- Goals catalog, goal demand profiles, user training plans, and weekly plans.
-- Run after:
--   - 20250301000000_sport_mode_schema.sql
--   - 20250301000002_app_entities_schema.sql

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'goal_type_enum') THEN
    CREATE TYPE public.goal_type_enum AS ENUM ('sport', 'performance', 'physique', 'mobility', 'rehab');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plan_horizon_enum') THEN
    CREATE TYPE public.plan_horizon_enum AS ENUM ('week');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'weekly_day_status_enum') THEN
    CREATE TYPE public.weekly_day_status_enum AS ENUM ('planned', 'completed', 'skipped');
  END IF;
END$$;

-- ---------------------------------------------------------------------------
-- Goals catalog + demand profile
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  goal_type public.goal_type_enum NOT NULL,
  description text,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_goals_goal_type ON public.goals(goal_type);

-- Demand profile for non-sport and sport goals (aggregated per goal).
-- Values are relative weights (0-3) across key training qualities.
CREATE TABLE IF NOT EXISTS public.goal_demand_profile (
  goal_id uuid PRIMARY KEY REFERENCES public.goals(id) ON DELETE CASCADE,
  strength numeric NOT NULL DEFAULT 0,
  power numeric NOT NULL DEFAULT 0,
  aerobic numeric NOT NULL DEFAULT 0,
  anaerobic numeric NOT NULL DEFAULT 0,
  mobility numeric NOT NULL DEFAULT 0,
  prehab numeric NOT NULL DEFAULT 0,
  recovery numeric NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------------
-- User training plan config (persistent weekly planning inputs)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_training_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  primary_goal_id uuid NOT NULL REFERENCES public.goals(id),
  secondary_goal_id uuid REFERENCES public.goals(id),
  tertiary_goal_id uuid REFERENCES public.goals(id),
  plan_horizon public.plan_horizon_enum NOT NULL DEFAULT 'week',
  sport_sessions jsonb NOT NULL DEFAULT '[]'::jsonb,         -- [{date, goal_id, session_type}]
  gym_days_per_week int NOT NULL DEFAULT 3,
  preferred_training_days jsonb,                             -- e.g. ['mon','wed','fri']
  default_session_duration int NOT NULL DEFAULT 60,
  constraints jsonb NOT NULL DEFAULT '{}'::jsonb,            -- injuries, equipment_profile_id, etc.
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_training_plans_user_id ON public.user_training_plans(user_id);

-- updated_at trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_user_training_plans_updated_at'
  ) THEN
    CREATE TRIGGER set_user_training_plans_updated_at
      BEFORE UPDATE ON public.user_training_plans
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END$$;

-- ---------------------------------------------------------------------------
-- Weekly plan instances + days (outputs)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.weekly_plan_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start_date date NOT NULL,
  plan_id uuid REFERENCES public.user_training_plans(id) ON DELETE SET NULL,
  goals_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,         -- ids/slugs + weights at generation time
  rationale text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_weekly_plan_instances_user_week
  ON public.weekly_plan_instances(user_id, week_start_date DESC);

CREATE TABLE IF NOT EXISTS public.weekly_plan_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_plan_instance_id uuid NOT NULL REFERENCES public.weekly_plan_instances(id) ON DELETE CASCADE,
  date date NOT NULL,
  intent_id uuid,
  intent_label text,
  goal_contribution jsonb NOT NULL DEFAULT '{}'::jsonb,      -- {primary:0.6, secondary:0.3, tertiary:0.1}
  fatigue_score int,
  status public.weekly_day_status_enum NOT NULL DEFAULT 'planned',
  generated_workout_id uuid REFERENCES public.workouts(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_weekly_plan_days_instance_date
  ON public.weekly_plan_days(weekly_plan_instance_id, date);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_demand_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_training_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_plan_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_plan_days ENABLE ROW LEVEL SECURITY;

-- Goals + demand profiles: read-only catalog for authenticated users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'goals' AND policyname = 'goals_select_authenticated'
  ) THEN
    CREATE POLICY "goals_select_authenticated" ON public.goals
      FOR SELECT TO authenticated USING (true);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'goal_demand_profile' AND policyname = 'goal_demand_profile_select_authenticated'
  ) THEN
    CREATE POLICY "goal_demand_profile_select_authenticated" ON public.goal_demand_profile
      FOR SELECT TO authenticated USING (true);
  END IF;
END$$;

-- user_training_plans: CRUD own rows only
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_training_plans' AND policyname = 'user_training_plans_select_own'
  ) THEN
    CREATE POLICY "user_training_plans_select_own" ON public.user_training_plans
      FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_training_plans' AND policyname = 'user_training_plans_insert_own'
  ) THEN
    CREATE POLICY "user_training_plans_insert_own" ON public.user_training_plans
      FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_training_plans' AND policyname = 'user_training_plans_update_own'
  ) THEN
    CREATE POLICY "user_training_plans_update_own" ON public.user_training_plans
      FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_training_plans' AND policyname = 'user_training_plans_delete_own'
  ) THEN
    CREATE POLICY "user_training_plans_delete_own" ON public.user_training_plans
      FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END$$;

-- weekly_plan_instances: user-owned
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'weekly_plan_instances' AND policyname = 'weekly_plan_instances_select_own'
  ) THEN
    CREATE POLICY "weekly_plan_instances_select_own" ON public.weekly_plan_instances
      FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'weekly_plan_instances' AND policyname = 'weekly_plan_instances_insert_own'
  ) THEN
    CREATE POLICY "weekly_plan_instances_insert_own" ON public.weekly_plan_instances
      FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'weekly_plan_instances' AND policyname = 'weekly_plan_instances_update_own'
  ) THEN
    CREATE POLICY "weekly_plan_instances_update_own" ON public.weekly_plan_instances
      FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'weekly_plan_instances' AND policyname = 'weekly_plan_instances_delete_own'
  ) THEN
    CREATE POLICY "weekly_plan_instances_delete_own" ON public.weekly_plan_instances
      FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END$$;

-- weekly_plan_days: via instance ownership
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'weekly_plan_days' AND policyname = 'weekly_plan_days_select_own'
  ) THEN
    CREATE POLICY "weekly_plan_days_select_own" ON public.weekly_plan_days
      FOR SELECT TO authenticated USING (
        EXISTS (
          SELECT 1 FROM public.weekly_plan_instances i
          WHERE i.id = weekly_plan_instance_id AND i.user_id = auth.uid()
        )
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'weekly_plan_days' AND policyname = 'weekly_plan_days_insert_own'
  ) THEN
    CREATE POLICY "weekly_plan_days_insert_own" ON public.weekly_plan_days
      FOR INSERT TO authenticated WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.weekly_plan_instances i
          WHERE i.id = weekly_plan_instance_id AND i.user_id = auth.uid()
        )
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'weekly_plan_days' AND policyname = 'weekly_plan_days_update_own'
  ) THEN
    CREATE POLICY "weekly_plan_days_update_own" ON public.weekly_plan_days
      FOR UPDATE TO authenticated USING (
        EXISTS (
          SELECT 1 FROM public.weekly_plan_instances i
          WHERE i.id = weekly_plan_instance_id AND i.user_id = auth.uid()
        )
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'weekly_plan_days' AND policyname = 'weekly_plan_days_delete_own'
  ) THEN
    CREATE POLICY "weekly_plan_days_delete_own" ON public.weekly_plan_days
      FOR DELETE TO authenticated USING (
        EXISTS (
          SELECT 1 FROM public.weekly_plan_instances i
          WHERE i.id = weekly_plan_instance_id AND i.user_id = auth.uid()
        )
      );
  END IF;
END$$;

