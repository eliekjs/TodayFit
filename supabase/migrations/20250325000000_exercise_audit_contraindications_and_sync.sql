-- Exercise table audit: add missing contraindications (research-backed) and sync contraindication_tags.
-- See docs/research/exercise-table-full-audit.md and docs/CONTRAINDICATIONS_AUDIT.md.
-- Idempotent: INSERT ON CONFLICT DO NOTHING; sync rebuilds contraindication_tags from exercise_contraindications.

-- ============== 1) Add missing exercise_contraindications ==============
-- Shoulder: dips, lateral/front raise, landmine/overhead variants, push-ups, plank
-- Knee: leg extension, leg curl, nordic curl, jump/impact (box jump, burpee, jump rope, double unders already in 20250323)
-- Lower back: good morning, back extension, single_leg_rdl, deficit_deadlift, snatch_grip_deadlift
-- Elbow: dips, skull crusher, close-grip bench, preacher curl
-- Wrist: push-ups, dips, plank (already in seed for some)

INSERT INTO public.exercise_contraindications (exercise_id, contraindication, joint)
SELECT e.id, c.contraindication, c.contraindication
FROM (VALUES
  -- Dips: shoulder, elbow, wrist (NCSF / biomechanics)
  ('dips', 'shoulder'),
  ('dips', 'elbow'),
  ('dips', 'wrist'),
  ('tricep_dip_bench', 'shoulder'),
  ('tricep_dip_bench', 'elbow'),
  ('tricep_dip_bench', 'wrist'),
  ('dip_assisted', 'shoulder'),
  ('dip_assisted', 'elbow'),
  ('dip_assisted', 'wrist'),
  -- Leg extension / leg curl: knee (NSCA, NCSF, tibialist/cristchiropractic)
  ('leg_extension', 'knee'),
  ('leg_curl', 'knee'),
  -- Good morning, back extension: lower back
  ('good_morning', 'lower_back'),
  ('back_extension', 'lower_back'),
  ('back_extension_45', 'lower_back'),
  ('back_extension_reverse_hyper', 'lower_back'),
  -- Single-leg RDL, deficit/snatch-grip deadlift: lower back
  ('single_leg_rdl', 'lower_back'),
  ('deficit_deadlift', 'lower_back'),
  ('snatch_grip_deadlift', 'lower_back'),
  -- Lateral/front raise: shoulder
  ('lateral_raise', 'shoulder'),
  ('front_raise', 'shoulder'),
  -- Close-grip push-up: wrist, shoulder
  ('close_grip_push_up', 'wrist'),
  ('close_grip_push_up', 'shoulder'),
  -- Elbow stress: skull crusher, overhead tricep extension, close-grip bench, preacher curl
  ('skull_crusher', 'elbow'),
  ('overhead_tricep_extension', 'elbow'),
  ('close_grip_bench', 'elbow'),
  ('preacher_curl', 'elbow'),
  -- Nordic curl: knee (eccentric hamstring can stress knee)
  ('nordic_curl', 'knee'),
  -- Incline/decline bench: shoulder, wrist
  ('incline_db_press', 'shoulder'),
  ('decline_bench', 'shoulder'),
  ('decline_bench', 'wrist'),
  -- Landmine / overhead variants: shoulder
  ('landmine_press_one_arm', 'shoulder'),
  ('half_kneeling_landmine_press', 'shoulder'),
  ('bottoms_up_kb_press', 'shoulder'),
  ('seated_dumbbell_ohp', 'shoulder'),
  -- Push-up (if not already): shoulder, wrist
  ('push_up', 'shoulder'),
  ('push_up', 'wrist'),
  -- Box jump, burpee, jump rope: knee (impact)
  ('box_jump', 'knee'),
  ('burpee', 'knee'),
  ('jump_rope', 'knee'),
  ('jump_squat_light', 'knee'),
  -- Wall ball: shoulder, knee
  ('wall_ball', 'shoulder'),
  ('wall_ball', 'knee'),
  -- Cable/DB tricep extension: elbow
  ('cable_tricep_extension', 'elbow'),
  ('db_tricep_kickback', 'elbow'),
  -- Rowing (machine/cable/barbell) can stress lower back when heavy
  ('barbell_row', 'lower_back'),
  ('cable_row', 'lower_back'),
  ('pendlay_row', 'lower_back'),
  ('yates_row', 'lower_back'),
  ('t_bar_row', 'lower_back'),
  ('inverted_row_feet_elevated', 'shoulder'),
  ('trx_row', 'shoulder'),
  -- Hanging leg raise: shoulder, grip
  ('hanging_leg_raise', 'shoulder'),
  ('hanging_leg_raise', 'elbow'),
  -- Assault bike / zone2: knee (repetitive)
  ('assault_bike', 'knee'),
  ('zone2_bike', 'knee')
) AS c(exercise_slug, contraindication)
JOIN public.exercises e ON e.slug = c.exercise_slug
WHERE e.is_active = true
ON CONFLICT (exercise_id, contraindication) DO NOTHING;

-- ============== 2) Sync contraindication_tags on exercises from exercise_contraindications ==============
-- So the denormalized column matches the table (listExercisesForGenerator uses both).
UPDATE public.exercises e
SET contraindication_tags = (
  SELECT COALESCE(array_agg(DISTINCT c.contraindication ORDER BY c.contraindication), '{}')
  FROM public.exercise_contraindications c
  WHERE c.exercise_id = e.id
)
WHERE e.is_active = true;
