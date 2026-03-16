-- Contraindications: add sort_order (priority), enrich tags, and sync contraindication_tags
-- in order most→least relevant. See docs/research/contraindications-audit-2025.md.
-- Runs after 20250325000000 so this sync overwrites with ordered tags.

-- 1) Add sort_order to exercise_contraindications (1 = most relevant for that exercise)
ALTER TABLE public.exercise_contraindications
  ADD COLUMN IF NOT EXISTS sort_order smallint NOT NULL DEFAULT 1;

-- 2) Set priority for multi-contraindication exercises (evidence-based: primary concern first)
-- Dips: shoulder primary (impingement), then elbow, wrist (NCSF, shoulder-impingement sources)
-- Push-up: shoulder primary, wrist secondary
-- Battle ropes / devils press / wall ball / rows / etc.: primary then secondary
UPDATE public.exercise_contraindications c
SET sort_order = v.sort_order
FROM public.exercises e,
     (VALUES
       ('dips', 'shoulder', 1), ('dips', 'elbow', 2), ('dips', 'wrist', 3),
       ('tricep_dip_bench', 'shoulder', 1), ('tricep_dip_bench', 'elbow', 2), ('tricep_dip_bench', 'wrist', 3),
       ('dip_assisted', 'shoulder', 1), ('dip_assisted', 'elbow', 2), ('dip_assisted', 'wrist', 3),
       ('push_up', 'shoulder', 1), ('push_up', 'wrist', 2),
       ('close_grip_push_up', 'wrist', 1), ('close_grip_push_up', 'shoulder', 2),
       ('battle_rope_waves', 'shoulder', 1), ('battle_rope_waves', 'wrist', 2),
       ('devils_press', 'shoulder', 1), ('devils_press', 'lower_back', 2),
       ('wall_ball', 'shoulder', 1), ('wall_ball', 'knee', 2),
       ('hanging_leg_raise', 'shoulder', 1), ('hanging_leg_raise', 'elbow', 2),
       ('double_unders', 'knee', 1), ('double_unders', 'wrist', 2),
       ('ski_erg_intervals', 'shoulder', 1), ('ski_erg_intervals', 'lower_back', 2),
       ('ski_erg_steady', 'shoulder', 1), ('ski_erg_steady', 'lower_back', 2),
       ('incline_db_press', 'shoulder', 1),
       ('decline_bench', 'shoulder', 1), ('decline_bench', 'wrist', 2),
       ('inverted_row_feet_elevated', 'shoulder', 1),
       ('trx_row', 'shoulder', 1),
       ('barbell_row', 'lower_back', 1),
       ('cable_row', 'lower_back', 1),
       ('pendlay_row', 'lower_back', 1),
       ('yates_row', 'lower_back', 1),
       ('t_bar_row', 'lower_back', 1)
     ) AS v(exercise_slug, contraindication, sort_order)
WHERE e.id = c.exercise_id AND e.slug = v.exercise_slug AND c.contraindication = v.contraindication;

-- 3) Add missing contraindications (upright row: shoulder impingement — Les Mills, Barbend, NCSF-style)
INSERT INTO public.exercise_contraindications (exercise_id, contraindication, joint, sort_order)
SELECT e.id, 'shoulder', 'shoulder', 1
FROM public.exercises e
WHERE e.slug = 'upright_row' AND e.is_active = true
ON CONFLICT (exercise_id, contraindication) DO UPDATE SET sort_order = EXCLUDED.sort_order;

-- 4) Sync contraindication_tags from exercise_contraindications ordered by sort_order (most→least relevant)
UPDATE public.exercises e
SET contraindication_tags = (
  SELECT COALESCE(array_agg(c.contraindication ORDER BY c.sort_order ASC, c.contraindication), '{}')
  FROM public.exercise_contraindications c
  WHERE c.exercise_id = e.id
)
WHERE e.is_active = true;
