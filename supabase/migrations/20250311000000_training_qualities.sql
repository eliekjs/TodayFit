-- =============================================================================
-- Phase 1: Training qualities system (workout intelligence backbone)
-- Tables: training_qualities, sport_training_demand, goal_training_demand,
--        exercise_training_quality
-- Run after: app_entities (exercises), sport_mode (sports). No dependency on
-- goal_tag_profile; can run in any order after 20250301000002.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. training_qualities (canonical taxonomy)
-- Slug is PK so app config and DB stay in sync; no UUID required.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.training_qualities (
  slug text PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL,
  description text,
  sort_order int NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_training_qualities_category
  ON public.training_qualities(category);
CREATE INDEX IF NOT EXISTS idx_training_qualities_sort
  ON public.training_qualities(sort_order);

COMMENT ON TABLE public.training_qualities IS
  'Canonical list of training qualities for goals, sports, and exercise scoring.';

-- -----------------------------------------------------------------------------
-- 2. sport_training_demand (sport → quality weights, 0–1)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sport_training_demand (
  sport_slug text NOT NULL,
  training_quality_slug text NOT NULL REFERENCES public.training_qualities(slug) ON DELETE CASCADE,
  weight real NOT NULL CHECK (weight >= 0 AND weight <= 1),
  PRIMARY KEY (sport_slug, training_quality_slug)
);

CREATE INDEX IF NOT EXISTS idx_sport_training_demand_sport
  ON public.sport_training_demand(sport_slug);
CREATE INDEX IF NOT EXISTS idx_sport_training_demand_quality
  ON public.sport_training_demand(training_quality_slug);

COMMENT ON TABLE public.sport_training_demand IS
  'Per-sport training demand: which qualities each sport emphasizes (weight 0–1).';

-- -----------------------------------------------------------------------------
-- 3. goal_training_demand (goal → quality weights, 0–1)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.goal_training_demand (
  goal_slug text NOT NULL,
  training_quality_slug text NOT NULL REFERENCES public.training_qualities(slug) ON DELETE CASCADE,
  weight real NOT NULL CHECK (weight >= 0 AND weight <= 1),
  PRIMARY KEY (goal_slug, training_quality_slug)
);

CREATE INDEX IF NOT EXISTS idx_goal_training_demand_goal
  ON public.goal_training_demand(goal_slug);
CREATE INDEX IF NOT EXISTS idx_goal_training_demand_quality
  ON public.goal_training_demand(training_quality_slug);

COMMENT ON TABLE public.goal_training_demand IS
  'Per-goal training demand: which qualities each user goal emphasizes (weight 0–1).';

-- -----------------------------------------------------------------------------
-- 4. exercise_training_quality (exercise → quality weights, 0–1)
-- References public.exercises(id). Weight = how much the exercise trains that quality.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.exercise_training_quality (
  exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  training_quality_slug text NOT NULL REFERENCES public.training_qualities(slug) ON DELETE CASCADE,
  weight real NOT NULL CHECK (weight >= 0 AND weight <= 1),
  PRIMARY KEY (exercise_id, training_quality_slug)
);

CREATE INDEX IF NOT EXISTS idx_exercise_training_quality_exercise
  ON public.exercise_training_quality(exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_training_quality_quality
  ON public.exercise_training_quality(training_quality_slug);

COMMENT ON TABLE public.exercise_training_quality IS
  'Per-exercise training quality scores (weight 0–1) for workout generation scoring.';

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
ALTER TABLE public.training_qualities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sport_training_demand ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_training_demand ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_training_quality ENABLE ROW LEVEL SECURITY;

-- Catalog: read-only for anon and authenticated
CREATE POLICY "training_qualities_select_all"
  ON public.training_qualities FOR SELECT TO anon USING (true);
CREATE POLICY "training_qualities_select_authenticated"
  ON public.training_qualities FOR SELECT TO authenticated USING (true);

CREATE POLICY "sport_training_demand_select_all"
  ON public.sport_training_demand FOR SELECT TO anon USING (true);
CREATE POLICY "sport_training_demand_select_authenticated"
  ON public.sport_training_demand FOR SELECT TO authenticated USING (true);

CREATE POLICY "goal_training_demand_select_all"
  ON public.goal_training_demand FOR SELECT TO anon USING (true);
CREATE POLICY "goal_training_demand_select_authenticated"
  ON public.goal_training_demand FOR SELECT TO authenticated USING (true);

CREATE POLICY "exercise_training_quality_select_all"
  ON public.exercise_training_quality FOR SELECT TO anon USING (true);
CREATE POLICY "exercise_training_quality_select_authenticated"
  ON public.exercise_training_quality FOR SELECT TO authenticated USING (true);
