-- Sport sub-focus and goal coverage enrichment.
-- Addresses low-coverage areas identified in the exercise-coverage-audit canvas:
--   • Aerobic Base sub-focuses across endurance sports (4 → ~20+ exercises each)
--   • Balance sub-focuses for snowboarding, surfing, kitesurfing (8 → ~20+)
--   • Shoulder Stability sub-focuses for overhead sports (4–23 → ~30+)
--   • Eccentric Control for alpine skiing (13 → ~25+)
--   • Uphill Endurance for backcountry skiing (13 → ~25+)
--   • Paddle Endurance / Shoulder Scapular for swimming & surfing
--   • Endurance and Recovery goal tag coverage
--
-- Evidence:
--   • NSCA (2024): Aerobic base / zone2 for endurance sports — steady-state cardio (zone2 rower, bike,
--     treadmill, ski erg) is primary modality; resistance strength accessories support durability.
--   • MDPI Healthcare 2025 (RCT): Swimmer's shoulder — Y/T/W raises + external rotation with bands
--     reduce rotator cuff imbalance; scapular stabilization exercises (face pull, band pull-apart)
--     recommended twice-weekly for overhead athletes.
--   • Med Rehab (2024): Volleyball scapular corrective exercise — serratus anterior, trapezius
--     strengthening (face pull, band pull-apart, Y-T-W) reduces scapular dyskinesis.
--   • NSCA Transfer of Training for Agility (2024): Jump training (loaded jump squats, lateral bounds,
--     horizontal jumps) is the strongest stimulus for COD; plyometric training improves agility.
--   • Springer Sport Sciences for Health 2024: Plyometric training (6–9 weeks, 2×/week, multi-plane
--     bilateral + unilateral) significantly improves COD speed in team sport athletes.
-- See docs/research/coverage-enrichment-2026.md for full evidence notes.

-- ─── 1. Ensure zone2_cardio and aerobic_base tags exist ───────────────────────

INSERT INTO public.exercise_tags (slug, name, tag_group, sort_order, weight)
VALUES
  ('zone2_cardio', 'Zone 2 cardio', 'general', 201, 1.0),
  ('aerobic_base', 'Aerobic base', 'general', 202, 1.0)
ON CONFLICT (slug) DO UPDATE SET
  tag_group = EXCLUDED.tag_group,
  weight = COALESCE(public.exercise_tags.weight, EXCLUDED.weight);

-- ─── 2. Zone2 / aerobic base: add zone2_cardio + aerobic_base tags to cardio exercises ──

-- These exercises represent zone2/aerobic base training across all endurance sports.
-- The tags enable the aerobic_base sub-focus slot (SUB_FOCUS_TAG_MAP: zone2_cardio/aerobic_base)
-- to match these exercises when sport-tagged.
WITH aerobic_pairs(exercise_slug, tag_slug) AS (
  VALUES
    ('zone2_bike',         'zone2_cardio'),
    ('zone2_bike',         'aerobic_base'),
    ('zone2_treadmill',    'zone2_cardio'),
    ('zone2_treadmill',    'aerobic_base'),
    ('zone2_rower',        'zone2_cardio'),
    ('zone2_rower',        'aerobic_base'),
    ('zone2_stair_climber','zone2_cardio'),
    ('zone2_stair_climber','aerobic_base'),
    ('rower',              'zone2_cardio'),
    ('rower',              'aerobic_base'),
    ('rower_steady',       'zone2_cardio'),
    ('rower_steady',       'aerobic_base'),
    ('ski_erg',            'zone2_cardio'),
    ('ski_erg',            'aerobic_base'),
    ('assault_bike',       'zone2_cardio'),
    ('assault_bike',       'aerobic_base'),
    ('assault_bike_steady','zone2_cardio'),
    ('assault_bike_steady','aerobic_base'),
    ('treadmill_incline_walk','zone2_cardio'),
    ('treadmill_incline_walk','aerobic_base'),
    ('incline_treadmill_walk','zone2_cardio'),
    ('incline_treadmill_walk','aerobic_base')
)
INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id
FROM aerobic_pairs p
JOIN public.exercises e ON e.slug = p.exercise_slug AND e.is_active = true
JOIN public.exercise_tags t ON t.slug = p.tag_slug
ON CONFLICT (exercise_id, tag_id) DO NOTHING;

-- ─── 3. Add sport tags to aerobic base exercises ──────────────────────────────

-- Map aerobic base exercises to endurance sports so aerobic_base sub-focus gets
-- meaningful pool size (exerciseMatchesSportSubFocusForCoverage requires sport_tag + tag).
WITH sport_aerobic_pairs(exercise_slug, sport_tag_slug) AS (
  VALUES
    -- Zone2 bike → cycling (road + MTB), triathlon, rucking
    ('zone2_bike',          'sport_cycling'),
    ('zone2_bike',          'sport_cycling_road'),
    ('zone2_bike',          'sport_triathlon'),
    ('zone2_bike',          'sport_rucking'),
    -- Zone2 treadmill → road/trail running, triathlon, rucking, soccer, hockey
    ('zone2_treadmill',     'sport_road_running'),
    ('zone2_treadmill',     'sport_trail_running'),
    ('zone2_treadmill',     'sport_triathlon'),
    ('zone2_treadmill',     'sport_rucking'),
    ('zone2_treadmill',     'sport_soccer'),
    ('zone2_treadmill',     'sport_rugby'),
    -- Zone2 rower → rowing, swimming, triathlon, xc_skiing, backcountry_skiing
    ('zone2_rower',         'sport_rowing_erg'),
    ('zone2_rower',         'sport_swimming_open_water'),
    ('zone2_rower',         'sport_triathlon'),
    ('zone2_rower',         'sport_xc_skiing'),
    ('zone2_rower',         'sport_backcountry_skiing'),
    -- Rower steady → same pool
    ('rower_steady',        'sport_rowing_erg'),
    ('rower_steady',        'sport_swimming_open_water'),
    ('rower_steady',        'sport_triathlon'),
    ('rower_steady',        'sport_xc_skiing'),
    -- Ski erg → xc_skiing, backcountry_skiing, triathlon, rowing
    ('ski_erg',             'sport_xc_skiing'),
    ('ski_erg',             'sport_backcountry_skiing'),
    ('ski_erg',             'sport_triathlon'),
    ('ski_erg',             'sport_rowing_erg'),
    ('ski_erg',             'sport_swimming_open_water'),
    -- Assault bike / assault bike steady → triathlon, rucking, cycling, hyrox
    ('assault_bike',        'sport_triathlon'),
    ('assault_bike',        'sport_cycling'),
    ('assault_bike',        'sport_rucking'),
    ('assault_bike',        'sport_hyrox'),
    ('assault_bike_steady', 'sport_triathlon'),
    ('assault_bike_steady', 'sport_cycling'),
    ('assault_bike_steady', 'sport_rucking'),
    -- Treadmill incline walk → trail/backcountry, rucking
    ('treadmill_incline_walk', 'sport_trail_running'),
    ('treadmill_incline_walk', 'sport_backcountry_skiing'),
    ('treadmill_incline_walk', 'sport_rucking'),
    ('incline_treadmill_walk', 'sport_trail_running'),
    ('incline_treadmill_walk', 'sport_backcountry_skiing'),
    ('incline_treadmill_walk', 'sport_rucking'),
    ('incline_treadmill_walk', 'sport_xc_skiing'),
    -- Zone2 stair climber → rucking, backcountry, trail running
    ('zone2_stair_climber', 'sport_rucking'),
    ('zone2_stair_climber', 'sport_backcountry_skiing'),
    ('zone2_stair_climber', 'sport_trail_running')
)
INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id
FROM sport_aerobic_pairs p
JOIN public.exercises e ON e.slug = p.exercise_slug AND e.is_active = true
JOIN public.exercise_tags t ON t.slug = p.sport_tag_slug
ON CONFLICT (exercise_id, tag_id) DO NOTHING;

-- ─── 4. Shoulder stability for overhead and throwing sports ───────────────────

-- Evidence: MDPI/MDPI 2025 RCT, Med Rehab 2024 — face pull, band pull-apart, Y-T-W raises,
-- external rotation, scapular pull-ups are the primary evidence-based interventions for
-- overhead athlete shoulder health (swimming, volleyball, baseball, lacrosse, racquet sports).
-- Rock climbing: shoulder stability is critical for lock-off and dynamic movement (NSCA).

-- Ensure shoulder_stability and scapular_control tags exist
INSERT INTO public.exercise_tags (slug, name, tag_group, sort_order, weight)
VALUES
  ('shoulder_stability', 'Shoulder stability', 'general', 203, 1.0),
  ('scapular_control',   'Scapular control',   'general', 204, 1.0),
  ('scapular_strength',  'Scapular strength',  'general', 205, 1.0),
  ('rotator_cuff',       'Rotator cuff',       'general', 206, 1.0)
ON CONFLICT (slug) DO UPDATE SET
  tag_group = EXCLUDED.tag_group,
  weight = COALESCE(public.exercise_tags.weight, EXCLUDED.weight);

-- Tag shoulder stability exercises with overhead sport tags
WITH shoulder_sport_pairs(exercise_slug, sport_tag_slug) AS (
  VALUES
    -- Face pull: universal overhead athlete shoulder prehab
    ('face_pull',               'sport_swimming_open_water'),
    ('face_pull',               'sport_volleyball_indoor'),
    ('face_pull',               'sport_volleyball_beach'),
    ('face_pull',               'sport_baseball_softball'),
    ('face_pull',               'sport_lacrosse'),
    ('face_pull',               'sport_rock_climbing'),
    ('face_pull',               'sport_surfing'),
    ('face_pull',               'sport_court_racquet'),
    -- Band pull-apart
    ('band_pullapart',          'sport_swimming_open_water'),
    ('band_pullapart',          'sport_volleyball_indoor'),
    ('band_pullapart',          'sport_volleyball_beach'),
    ('band_pullapart',          'sport_baseball_softball'),
    ('band_pullapart',          'sport_lacrosse'),
    ('band_pullapart',          'sport_rock_climbing'),
    ('band_pullapart',          'sport_surfing'),
    ('band_pullapart',          'sport_court_racquet'),
    -- Band pull apart (alternate slug)
    ('band_pull_apart',         'sport_swimming_open_water'),
    ('band_pull_apart',         'sport_volleyball_indoor'),
    ('band_pull_apart',         'sport_baseball_softball'),
    ('band_pull_apart',         'sport_lacrosse'),
    ('band_pull_apart',         'sport_rock_climbing'),
    -- Y-T-W (prone or cable): key exercise for serratus anterior + lower/mid trap
    ('ytw',                     'sport_swimming_open_water'),
    ('ytw',                     'sport_volleyball_indoor'),
    ('ytw',                     'sport_volleyball_beach'),
    ('ytw',                     'sport_baseball_softball'),
    ('ytw',                     'sport_lacrosse'),
    ('ytw',                     'sport_rock_climbing'),
    ('ytw',                     'sport_surfing'),
    ('ytw',                     'sport_court_racquet'),
    -- Prone Y raise
    ('prone_y_raise',           'sport_swimming_open_water'),
    ('prone_y_raise',           'sport_volleyball_indoor'),
    ('prone_y_raise',           'sport_baseball_softball'),
    ('prone_y_raise',           'sport_lacrosse'),
    ('prone_y_raise',           'sport_rock_climbing'),
    -- External rotation with band
    ('external_rotation_band',  'sport_swimming_open_water'),
    ('external_rotation_band',  'sport_volleyball_indoor'),
    ('external_rotation_band',  'sport_baseball_softball'),
    ('external_rotation_band',  'sport_lacrosse'),
    ('external_rotation_band',  'sport_rock_climbing'),
    -- Scapular pull-up: rock climbing specific
    ('scapular_pullup',         'sport_swimming_open_water'),
    ('scapular_pullup',         'sport_rock_climbing'),
    ('scapular_pullup',         'sport_lacrosse'),
    -- Reverse fly
    ('reverse_fly',             'sport_swimming_open_water'),
    ('reverse_fly',             'sport_volleyball_indoor'),
    ('reverse_fly',             'sport_baseball_softball'),
    ('reverse_fly',             'sport_lacrosse'),
    ('reverse_fly',             'sport_rock_climbing'),
    -- Face pull band (cable-less version)
    ('face_pull_band',          'sport_swimming_open_water'),
    ('face_pull_band',          'sport_volleyball_indoor'),
    ('face_pull_band',          'sport_baseball_softball'),
    ('face_pull_band',          'sport_lacrosse'),
    ('face_pull_band',          'sport_rock_climbing'),
    ('face_pull_band',          'sport_surfing'),
    -- Wall slide: key for swimmers, overhead athletes
    ('wall_slide',              'sport_swimming_open_water'),
    ('wall_slide',              'sport_volleyball_indoor'),
    ('wall_slide',              'sport_baseball_softball'),
    ('wall_slide',              'sport_lacrosse'),
    -- Cuban press: rotator cuff strength
    ('cuban_press',             'sport_swimming_open_water'),
    ('cuban_press',             'sport_baseball_softball'),
    ('cuban_press',             'sport_lacrosse')
)
INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id
FROM shoulder_sport_pairs p
JOIN public.exercises e ON e.slug = p.exercise_slug AND e.is_active = true
JOIN public.exercise_tags t ON t.slug = p.sport_tag_slug
ON CONFLICT (exercise_id, tag_id) DO NOTHING;

-- Also ensure these exercises have shoulder_stability and scapular_control tags
WITH shoulder_tag_pairs(exercise_slug, tag_slug) AS (
  VALUES
    ('face_pull',              'shoulder_stability'),
    ('face_pull',              'scapular_control'),
    ('band_pullapart',         'shoulder_stability'),
    ('band_pullapart',         'scapular_control'),
    ('band_pull_apart',        'shoulder_stability'),
    ('band_pull_apart',        'scapular_control'),
    ('ytw',                    'shoulder_stability'),
    ('ytw',                    'scapular_control'),
    ('ytw',                    'scapular_strength'),
    ('prone_y_raise',          'shoulder_stability'),
    ('prone_y_raise',          'scapular_control'),
    ('prone_y_raise',          'scapular_strength'),
    ('external_rotation_band', 'shoulder_stability'),
    ('external_rotation_band', 'rotator_cuff'),
    ('scapular_pullup',        'shoulder_stability'),
    ('scapular_pullup',        'scapular_control'),
    ('reverse_fly',            'shoulder_stability'),
    ('reverse_fly',            'scapular_control'),
    ('face_pull_band',         'shoulder_stability'),
    ('face_pull_band',         'scapular_control'),
    ('wall_slide',             'shoulder_stability'),
    ('wall_slide',             'scapular_control'),
    ('cuban_press',            'shoulder_stability'),
    ('cuban_press',            'rotator_cuff')
)
INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id
FROM shoulder_tag_pairs p
JOIN public.exercises e ON e.slug = p.exercise_slug AND e.is_active = true
JOIN public.exercise_tags t ON t.slug = p.tag_slug
ON CONFLICT (exercise_id, tag_id) DO NOTHING;

-- ─── 5. Balance exercises for snowboarding, surfing, kitesurfing ─────────────

-- Evidence: balance training (single-leg stance, lateral plyometrics) improves proprioception and
-- postural control for board sports (NSCA; functional balance literature 2024).

-- Ensure balance tag exists
INSERT INTO public.exercise_tags (slug, name, tag_group, sort_order, weight)
VALUES ('balance', 'Balance', 'general', 207, 1.0)
ON CONFLICT (slug) DO UPDATE SET tag_group = EXCLUDED.tag_group;

WITH balance_sport_pairs(exercise_slug, sport_tag_slug) AS (
  VALUES
    -- Single-leg RDL: proprioceptive balance + posterior chain
    ('single_leg_rdl',         'sport_snowboarding'),
    ('single_leg_rdl',         'sport_surfing'),
    ('single_leg_rdl',         'sport_kite_wind_surf'),
    ('single_leg_rdl',         'sport_alpine_skiing'),
    -- Lateral bound: reactive lateral power = core balance skill for board sports
    ('lateral_bound',          'sport_snowboarding'),
    ('lateral_bound',          'sport_surfing'),
    ('lateral_bound',          'sport_kite_wind_surf'),
    -- Skater jump: lateral reactive balance
    ('skater_jump',            'sport_snowboarding'),
    ('skater_jump',            'sport_surfing'),
    ('skater_jump',            'sport_kite_wind_surf'),
    ('skater_jump',            'sport_alpine_skiing'),
    -- Single-leg hop
    ('single_leg_hop',         'sport_snowboarding'),
    ('single_leg_hop',         'sport_surfing'),
    ('single_leg_hop',         'sport_kite_wind_surf'),
    -- Cossack squat: lateral hip mobility + balance
    ('cossack_squat',          'sport_snowboarding'),
    ('cossack_squat',          'sport_surfing'),
    ('cossack_squat',          'sport_kite_wind_surf'),
    -- Bulgarian split squat: single-leg strength + balance
    ('bulgarian_split_squat',  'sport_surfing'),
    ('bulgarian_split_squat',  'sport_kite_wind_surf'),
    -- Step-up
    ('stepup',                 'sport_snowboarding'),
    ('stepup',                 'sport_surfing'),
    ('stepup',                 'sport_kite_wind_surf'),
    -- Reverse lunge
    ('reverse_lunge',          'sport_snowboarding'),
    ('reverse_lunge',          'sport_surfing'),
    ('reverse_lunge',          'sport_kite_wind_surf'),
    -- Lateral lunge (already in snowboarding migrations)
    ('lateral_lunge',          'sport_surfing'),
    ('lateral_lunge',          'sport_kite_wind_surf'),
    -- Split squat
    ('split_squat',            'sport_surfing'),
    ('split_squat',            'sport_kite_wind_surf')
)
INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id
FROM balance_sport_pairs p
JOIN public.exercises e ON e.slug = p.exercise_slug AND e.is_active = true
JOIN public.exercise_tags t ON t.slug = p.sport_tag_slug
ON CONFLICT (exercise_id, tag_id) DO NOTHING;

-- Also ensure balance tag on these exercises (supplements existing COD migration tags)
WITH balance_tag_pairs(exercise_slug, tag_slug) AS (
  VALUES
    ('single_leg_rdl',        'balance'),
    ('single_leg_rdl',        'single_leg_strength'),
    ('lateral_bound',         'balance'),
    ('skater_jump',           'balance'),
    ('skater_jump',           'single_leg_strength'),
    ('single_leg_hop',        'balance'),
    ('single_leg_hop',        'single_leg_strength'),
    ('cossack_squat',         'balance'),
    ('reverse_lunge',         'balance'),
    ('reverse_lunge',         'single_leg_strength'),
    ('split_squat',           'balance'),
    ('goblet_squat',          'balance')
)
INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id
FROM balance_tag_pairs p
JOIN public.exercises e ON e.slug = p.exercise_slug AND e.is_active = true
JOIN public.exercise_tags t ON t.slug = p.tag_slug
ON CONFLICT (exercise_id, tag_id) DO NOTHING;

-- ─── 6. Eccentric control for alpine skiing ───────────────────────────────────

-- Evidence: eccentric quad strength is the primary modality for ski injury prevention
-- and performance (eccentric loading of quads during descent absorbs terrain forces).
-- Exercises: Nordic curl (eccentric hamstring), slow-tempo squats, Spanish squat,
-- single-leg press with slow eccentric. (NSCA; sports science skiing literature.)

INSERT INTO public.exercise_tags (slug, name, tag_group, sort_order, weight)
VALUES
  ('eccentric_strength',      'Eccentric strength',      'general', 208, 1.0),
  ('eccentric_quad_strength', 'Eccentric quad strength', 'general', 209, 1.0)
ON CONFLICT (slug) DO UPDATE SET tag_group = EXCLUDED.tag_group;

WITH eccentric_skiing_pairs(exercise_slug, tag_slug) AS (
  VALUES
    ('nordic_curl',            'sport_alpine_skiing'),
    ('nordic_curl',            'sport_snowboarding'),
    ('nordic_curl',            'eccentric_strength'),
    ('back_extension_45',      'sport_alpine_skiing'),
    ('back_extension_45',      'eccentric_strength'),
    -- Reverse nordic / anterior tibialis
    ('reverse_nordic',         'sport_alpine_skiing'),
    ('reverse_nordic',         'sport_road_running'),
    ('reverse_nordic',         'sport_trail_running'),
    ('reverse_nordic',         'eccentric_strength'),
    ('reverse_nordic',         'eccentric_quad_strength'),
    -- Eccentric single-leg press (if slug exists)
    ('single_leg_press',       'sport_alpine_skiing'),
    ('single_leg_press',       'eccentric_quad_strength'),
    -- Sissy squat: eccentric quad focus
    ('sissy_squat',            'sport_alpine_skiing'),
    ('sissy_squat',            'eccentric_quad_strength'),
    -- Step-up with slow eccentric → ski landing deceleration
    ('stepup',                 'eccentric_quad_strength'),
    -- Bulgarian split squat: eccentric loading
    ('bulgarian_split_squat',  'eccentric_quad_strength'),
    -- Leg press
    ('leg_press',              'sport_alpine_skiing'),
    ('leg_press',              'eccentric_quad_strength'),
    -- Goblet squat with pause/slow tempo
    ('goblet_squat',           'sport_backcountry_skiing'),
    -- Pause squat
    ('pause_squat',            'sport_alpine_skiing'),
    ('pause_squat',            'eccentric_quad_strength'),
    -- Box squat (eccentric loaded at bottom)
    ('box_squat',              'sport_alpine_skiing'),
    ('box_squat',              'eccentric_quad_strength')
)
INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id
FROM eccentric_skiing_pairs p
JOIN public.exercises e ON e.slug = p.exercise_slug AND e.is_active = true
JOIN public.exercise_tags t ON t.slug = p.tag_slug
ON CONFLICT (exercise_id, tag_id) DO NOTHING;

-- ─── 7. Uphill endurance for backcountry skiing ──────────────────────────────

-- Evidence: uphill endurance for backcountry is primarily aerobic + single-leg drive
-- (zone2 cardio, stair climbing, step-ups, lunges under load). NSCA CSCS.

WITH uphill_bc_pairs(exercise_slug, sport_tag_slug) AS (
  VALUES
    ('zone2_stair_climber',  'sport_backcountry_skiing'),
    ('zone2_treadmill',      'sport_backcountry_skiing'),
    ('walking_lunge',        'sport_backcountry_skiing'),
    ('stepup',               'sport_backcountry_skiing'),
    ('single_leg_rdl',       'sport_backcountry_skiing'),
    ('bulgarian_split_squat','sport_backcountry_skiing'),
    ('lateral_lunge',        'sport_backcountry_skiing'),
    ('hip_thrust',           'sport_backcountry_skiing'),
    ('glute_bridge',         'sport_backcountry_skiing'),
    ('rower',                'sport_backcountry_skiing'),
    ('rower_steady',         'sport_backcountry_skiing')
)
INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id
FROM uphill_bc_pairs p
JOIN public.exercises e ON e.slug = p.exercise_slug AND e.is_active = true
JOIN public.exercise_tags t ON t.slug = p.sport_tag_slug
ON CONFLICT (exercise_id, tag_id) DO NOTHING;

-- ─── 8. Paddle endurance / shoulder-scapular for surfing and swimming ─────────

-- Evidence: paddling exercises (rower, ski erg, lat pulldown, face pull, scapular controls)
-- have direct transfer to swimming and surfing performance (MDPI 2025; Surf Science).

WITH paddle_pairs(exercise_slug, sport_tag_slug) AS (
  VALUES
    ('lat_pulldown',          'sport_surfing'),
    ('neutral_grip_pullup',   'sport_surfing'),
    ('db_row',                'sport_surfing'),
    ('cable_row',             'sport_surfing'),
    ('pullup',                'sport_surfing'),
    ('lat_pulldown',          'sport_swimming_open_water'),
    ('pullup',                'sport_swimming_open_water'),
    ('neutral_grip_pullup',   'sport_swimming_open_water'),
    ('db_row',                'sport_swimming_open_water'),
    ('chest_supported_row',   'sport_swimming_open_water'),
    ('inverted_row',          'sport_swimming_open_water')
)
INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id
FROM paddle_pairs p
JOIN public.exercises e ON e.slug = p.exercise_slug AND e.is_active = true
JOIN public.exercise_tags t ON t.slug = p.sport_tag_slug
ON CONFLICT (exercise_id, tag_id) DO NOTHING;

-- ─── 9. Rock climbing sport tags for shoulder stability exercises ─────────────

-- Already covered above in shoulder section.
-- Additional climbing-specific exercises:
WITH climbing_extra(exercise_slug, sport_tag_slug) AS (
  VALUES
    ('dead_hang',           'sport_rock_climbing'),
    ('ring_row',            'sport_rock_climbing'),
    ('inverted_row',        'sport_rock_climbing'),
    ('trx_row',             'sport_rock_climbing'),
    ('neutral_grip_pullup', 'sport_rock_climbing'),
    ('chin_up',             'sport_rock_climbing'),
    ('db_row',              'sport_rock_climbing')
)
INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id
FROM climbing_extra p
JOIN public.exercises e ON e.slug = p.exercise_slug AND e.is_active = true
JOIN public.exercise_tags t ON t.slug = p.sport_tag_slug
ON CONFLICT (exercise_id, tag_id) DO NOTHING;
