-- Exercise progressions and regressions (related exercise variants).
-- Run after exercises table and seed exist.

CREATE TABLE IF NOT EXISTS public.exercise_progressions (
  exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  related_exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  relationship text NOT NULL CHECK (relationship IN ('progression', 'regression')),
  PRIMARY KEY (exercise_id, related_exercise_id, relationship)
);

CREATE INDEX IF NOT EXISTS idx_exercise_progressions_exercise_relationship
  ON public.exercise_progressions(exercise_id, relationship);

ALTER TABLE public.exercise_progressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exercise_progressions_select_authenticated" ON public.exercise_progressions
  FOR SELECT TO authenticated USING (true);

-- Seed: same pairs as in data/exercises.ts (only rows where both slugs exist in exercises).
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression'
FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'goblet_squat' AND e2.slug = 'split_squat'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;

INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression'
FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'goblet_squat' AND e2.slug = 'leg_press_machine'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;

INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression'
FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'rdl_dumbbell' AND e2.slug = 'kb_swing'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;

INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression'
FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'rdl_dumbbell' AND e2.slug = 'hip_thrust'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;

INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'regression'
FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'split_squat' AND e2.slug = 'goblet_squat'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;

INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'regression'
FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'split_squat' AND e2.slug = 'walking_lunge'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;

INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'regression'
FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'bench_press_barbell' AND e2.slug = 'db_bench'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;

INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression'
FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'db_bench' AND e2.slug = 'bench_press_barbell'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;

INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'regression'
FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'oh_press' AND e2.slug = 'db_bench'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;

INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'regression'
FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'pullup' AND e2.slug = 'lat_pulldown'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;

INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression'
FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'lat_pulldown' AND e2.slug = 'pullup'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;

INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'regression'
FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'plank' AND e2.slug = 'dead_bug'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;

INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression'
FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'dead_bug' AND e2.slug = 'plank'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;

INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'regression'
FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'hip_thrust' AND e2.slug = 'rdl_dumbbell'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;

INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'regression'
FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'kb_swing' AND e2.slug = 'rdl_dumbbell'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;

INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'regression'
FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'walking_lunge' AND e2.slug = 'stepup'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;

INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression'
FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'walking_lunge' AND e2.slug = 'split_squat'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;

INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression'
FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'stepup' AND e2.slug = 'walking_lunge'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;

INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'regression'
FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'leg_press_machine' AND e2.slug = 'goblet_squat'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
