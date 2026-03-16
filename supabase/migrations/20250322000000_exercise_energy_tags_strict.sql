-- Ensure high-intensity conditioning (battle ropes, HIIT) is tagged energy_high so they are
-- excluded for low-energy sessions and never suggested as swaps when user has low energy.
-- Ensure mobility/stretch exercises are tagged energy_low so they are not suggested as swaps
-- for conditioning exercises and are preferred for mobility + low energy.

-- Add energy_high to battle ropes and other high-intensity conditioning that may lack it
INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id FROM public.exercises e
JOIN public.exercise_tags t ON t.slug = 'energy_high'
WHERE e.is_active = true
  AND e.slug IN (
    'battle_ropes',
    'battle_rope_waves',
    'burpee_box_jump',
    'devils_press',
    'double_unders',
    'air_bike_sprint',
    'row_calorie_burn',
    'jump_squat_light'
  )
ON CONFLICT (exercise_id, tag_id) DO NOTHING;

-- Ensure mobility/stretch exercises have energy_low (so they are not suggested as swaps for conditioning)
INSERT INTO public.exercise_tag_map (exercise_id, tag_id)
SELECT e.id, t.id FROM public.exercises e
JOIN public.exercise_tags t ON t.slug = 'energy_low'
WHERE e.is_active = true
  AND e.slug IN (
    'hip_flexor_stretch',
    '90_90_hip_switch',
    'hip_90_90',
    'pigeon_stretch',
    'open_book_ts',
    'thread_the_needle',
    'thread_needle',
    'childs_pose',
    'sphinx_stretch',
    'lat_stretch_door',
    'sleeper_stretch',
    'cross_body_stretch',
    'cat_camel',
    'cat_cow',
    't_spine_rotation',
    'worlds_greatest_stretch',
    'frog_stretch',
    'standing_hamstring_stretch',
    'figure_four_stretch',
    'standing_quad_stretch',
    'calf_stretch_wall',
    'chest_stretch_doorway'
  )
ON CONFLICT (exercise_id, tag_id) DO NOTHING;
