-- Exercise progressions & regressions: full dataset for Swap → Easier / Harder / Similar.
-- Based on ACE/NASM-style chains. Only inserts pairs where both exercises exist (slug match).
-- Run after 20250308100000. Uses INSERT...SELECT so missing exercises no-op.

-- Helper: insert one progression or regression (no-op if either slug missing).
-- We use INSERT SELECT so rows only inserted when both e1 and e2 exist.

-- ============== BARBELL BACK SQUAT ==============
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'regression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'barbell_back_squat' AND e2.slug = 'goblet_squat'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'regression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'barbell_back_squat' AND e2.slug = 'box_squat'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'barbell_back_squat' AND e2.slug = 'pause_squat'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'barbell_back_squat' AND e2.slug = 'front_squat'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'barbell_back_squat' AND e2.slug = 'bulgarian_split_squat'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'barbell_back_squat' AND e2.slug = 'pistol_squat'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;

-- ============== FRONT SQUAT ==============
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'regression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'front_squat' AND e2.slug = 'goblet_squat'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'front_squat' AND e2.slug = 'pause_front_squat'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'front_squat' AND e2.slug = 'front_rack_lunge'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;

-- ============== GOBLET SQUAT ==============
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'regression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'goblet_squat' AND e2.slug = 'box_squat'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'goblet_squat' AND e2.slug = 'front_squat'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'goblet_squat' AND e2.slug = 'bulgarian_split_squat'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'goblet_squat' AND e2.slug = 'split_squat'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'goblet_squat' AND e2.slug = 'pistol_squat'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;

-- ============== ROMANIAN DEADLIFT (Barbell + Dumbbell) ==============
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'regression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'barbell_rdl' AND e2.slug = 'kb_deadlift'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'regression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'barbell_rdl' AND e2.slug = 'rdl_dumbbell'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'barbell_rdl' AND e2.slug = 'single_leg_rdl'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'barbell_rdl' AND e2.slug = 'snatch_grip_deadlift'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'barbell_rdl' AND e2.slug = 'nordic_curl'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;

INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'regression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'rdl_dumbbell' AND e2.slug = 'kb_deadlift'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'rdl_dumbbell' AND e2.slug = 'barbell_rdl'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'rdl_dumbbell' AND e2.slug = 'single_leg_rdl'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'rdl_dumbbell' AND e2.slug = 'kb_swing'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'rdl_dumbbell' AND e2.slug = 'hip_thrust'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;

-- ============== CONVENTIONAL DEADLIFT ==============
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'regression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'barbell_deadlift' AND e2.slug = 'kb_deadlift'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'regression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'barbell_deadlift' AND e2.slug = 'trap_bar_deadlift'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'regression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'barbell_deadlift' AND e2.slug = 'rack_pull'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'barbell_deadlift' AND e2.slug = 'deficit_deadlift'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'barbell_deadlift' AND e2.slug = 'snatch_grip_deadlift'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'barbell_deadlift' AND e2.slug = 'single_leg_rdl'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;

-- ============== TRAP BAR DEADLIFT ==============
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'regression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'trap_bar_deadlift' AND e2.slug = 'kb_deadlift'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'trap_bar_deadlift' AND e2.slug = 'barbell_deadlift'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'trap_bar_deadlift' AND e2.slug = 'deficit_deadlift'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;

-- ============== WALKING LUNGE ==============
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'regression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'walking_lunge' AND e2.slug = 'split_squat'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'regression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'walking_lunge' AND e2.slug = 'stepup'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'walking_lunge' AND e2.slug = 'bulgarian_split_squat'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'walking_lunge' AND e2.slug = 'split_squat'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'walking_lunge' AND e2.slug = 'jump_squat_light'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;

-- ============== BULGARIAN SPLIT SQUAT ==============
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'regression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'bulgarian_split_squat' AND e2.slug = 'split_squat'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'regression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'bulgarian_split_squat' AND e2.slug = 'stepup'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'bulgarian_split_squat' AND e2.slug = 'front_rack_lunge'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'bulgarian_split_squat' AND e2.slug = 'pistol_squat'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;

-- ============== STEP UP ==============
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'regression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'stepup' AND e2.slug = 'lateral_step_up'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'stepup' AND e2.slug = 'walking_lunge'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'stepup' AND e2.slug = 'pistol_squat'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'stepup' AND e2.slug = 'box_jump'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;

-- ============== PUSH UP ==============
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'regression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'push_up' AND e2.slug = 'band_chest_press'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'regression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'push_up' AND e2.slug = 'trx_chest_press'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'push_up' AND e2.slug = 'close_grip_push_up'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'push_up' AND e2.slug = 'ring_pull_up'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'push_up' AND e2.slug = 'dips'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;

-- ============== BENCH PRESS ==============
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'regression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'bench_press_barbell' AND e2.slug = 'push_up'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'regression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'bench_press_barbell' AND e2.slug = 'db_bench'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'regression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'bench_press_barbell' AND e2.slug = 'chest_press_machine'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'bench_press_barbell' AND e2.slug = 'close_grip_bench'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'bench_press_barbell' AND e2.slug = 'incline_bench_barbell'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'bench_press_barbell' AND e2.slug = 'dips'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;

-- ============== PULL UP ==============
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'regression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'pullup' AND e2.slug = 'lat_pulldown'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'regression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'pullup' AND e2.slug = 'australian_pull_up'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'regression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'pullup' AND e2.slug = 'inverted_row'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'pullup' AND e2.slug = 'weighted_pull_up'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;

-- ============== CHIN UP ==============
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'regression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'chinup' AND e2.slug = 'lat_pulldown'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'regression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'chinup' AND e2.slug = 'ring_row'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'chinup' AND e2.slug = 'weighted_pull_up'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;

-- ============== RING ROW ==============
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'regression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'ring_row' AND e2.slug = 'inverted_row'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'ring_row' AND e2.slug = 'inverted_row_feet_elevated'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'ring_row' AND e2.slug = 'pullup'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;

-- ============== OVERHEAD PRESS (DB + Barbell) ==============
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'regression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'seated_dumbbell_ohp' AND e2.slug = 'landmine_press_one_arm'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'seated_dumbbell_ohp' AND e2.slug = 'oh_press'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'seated_dumbbell_ohp' AND e2.slug = 'push_press'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;

INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'regression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'oh_press' AND e2.slug = 'db_bench'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'regression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'oh_press' AND e2.slug = 'db_shoulder_press'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'regression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'oh_press' AND e2.slug = 'landmine_press_one_arm'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'oh_press' AND e2.slug = 'push_press'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'oh_press' AND e2.slug = 'pike_push_up'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;

-- ============== HIP THRUST & GLUTE BRIDGE ==============
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'regression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'hip_thrust' AND e2.slug = 'glute_bridge'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'hip_thrust' AND e2.slug = 'single_leg_hip_thrust'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;

INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'glute_bridge' AND e2.slug = 'hip_thrust'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'glute_bridge' AND e2.slug = 'single_leg_hip_thrust'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'glute_bridge' AND e2.slug = 'nordic_curl'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;

-- ============== PLANK & DEAD BUG ==============
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'regression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'plank' AND e2.slug = 'dead_bug'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'plank' AND e2.slug = 'plank_shoulder_tap'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'plank' AND e2.slug = 'rollout_ab_wheel'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;

INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'dead_bug' AND e2.slug = 'plank'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;

-- ============== AB WHEEL ROLLOUT ==============
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'regression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'rollout_ab_wheel' AND e2.slug = 'plank'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'regression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'ab_wheel' AND e2.slug = 'plank'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;

-- ============== BOX JUMP ==============
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'regression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'box_jump' AND e2.slug = 'stepup'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'box_jump' AND e2.slug = 'burpee_box_jump'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'box_jump' AND e2.slug = 'jump_squat_light'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;

-- ============== KETTLEBELL SWING ==============
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'regression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'kb_swing' AND e2.slug = 'rdl_dumbbell'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'regression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'kb_swing' AND e2.slug = 'kb_deadlift'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'kb_swing' AND e2.slug = 'kb_clean'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;

-- ============== BATTLE ROPES ==============
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'battle_rope_waves' AND e2.slug = 'jump_rope'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'battle_rope_waves' AND e2.slug = 'ski_erg'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'battle_ropes' AND e2.slug = 'jump_rope'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'battle_ropes' AND e2.slug = 'ski_erg'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;

-- ============== FARMER CARRY ==============
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'regression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'farmer_carry' AND e2.slug = 'suitcase_carry'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'farmer_carry' AND e2.slug = 'trap_bar_carry'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
INSERT INTO public.exercise_progressions (exercise_id, related_exercise_id, relationship)
SELECT e1.id, e2.id, 'progression' FROM public.exercises e1, public.exercises e2
WHERE e1.slug = 'farmer_carry' AND e2.slug = 'front_rack_carry'
ON CONFLICT (exercise_id, related_exercise_id, relationship) DO NOTHING;
