-- Add missing contraindications for exercises that stress shoulder, wrist, or other joints.
-- Idempotent. Fixes: battle rope waves (and other conditioning/upper-body) missing shoulder/wrist;
-- ensures shoulder injury excludes these exercises when listExercises/listExercisesForGenerator filter by injuries.
-- See docs/CONTRAINDICATIONS_AUDIT.md for full audit.

INSERT INTO public.exercise_contraindications (exercise_id, contraindication, joint)
SELECT e.id, c.contraindication, c.contraindication
FROM (VALUES
  -- Battle rope waves: repetitive arm/wave motion heavily stresses shoulders and grip/wrist
  ('battle_rope_waves', 'shoulder'),
  ('battle_rope_waves', 'wrist'),
  -- Devil's press: overhead dumbbell press + hinge → shoulder and lower back
  ('devils_press', 'shoulder'),
  ('devils_press', 'lower_back'),
  -- Ski erg: pulling motion stresses shoulder and can stress lower back
  ('ski_erg_intervals', 'shoulder'),
  ('ski_erg_intervals', 'lower_back'),
  ('ski_erg_steady', 'shoulder'),
  ('ski_erg_steady', 'lower_back'),
  -- Rower variants (if not already present): lower back
  ('rower_steady', 'lower_back'),
  ('rower_intervals_30_30', 'lower_back'),
  ('row_calorie_burn', 'lower_back'),
  -- Isolation / push that stress shoulder
  ('cable_lateral_raise', 'shoulder'),
  ('leaning_lateral_raise', 'shoulder'),
  ('reverse_pec_deck', 'shoulder'),
  -- Medicine ball chest pass: explosive push
  ('medicine_ball_chest_pass', 'shoulder'),
  -- Double unders: repetitive impact and wrist
  ('double_unders', 'knee'),
  ('double_unders', 'wrist'),
  -- Prone extension: spinal extension
  ('prone_extension', 'lower_back')
) AS c(exercise_slug, contraindication)
JOIN public.exercises e ON e.slug = c.exercise_slug
WHERE e.is_active = true
ON CONFLICT (exercise_id, contraindication) DO NOTHING;
