-- 1) Add optional tag weight for ranking (default 1.0)
ALTER TABLE public.exercise_tags
  ADD COLUMN IF NOT EXISTS weight real NOT NULL DEFAULT 1.0;

COMMENT ON COLUMN public.exercise_tags.weight IS 'Optional weight for tag-based ranking; higher = more important when matching.';

-- 2) Tag group for energy (so we can soft/hard filter)
--    Ensure we have tag_group so energy tags can be identified; no schema change if tags use e.g. tag_group = ''energy''.

-- 3) RPC: ranked exercise search by tags; energy is soft preference unless energy_is_hard_filter = true
CREATE OR REPLACE FUNCTION public.get_exercises_by_tags_ranked(
  selected_tag_slugs text[] DEFAULT '{}',
  excluded_tag_slugs text[] DEFAULT '{}',
  user_energy text DEFAULT NULL,
  energy_is_hard_filter boolean DEFAULT false,
  result_limit int DEFAULT 50,
  result_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  slug text,
  name text,
  primary_muscles text[],
  secondary_muscles text[],
  equipment text[],
  modalities text[],
  movement_pattern text,
  match_score double precision,
  matched_tag_count int
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH selected_tags AS (
    SELECT t.id AS tag_id, t.slug, COALESCE(t.weight, 1.0) AS tag_weight
    FROM public.exercise_tags t
    WHERE t.slug = ANY(selected_tag_slugs)
  ),
  -- Base set: active exercises, optionally exclude any that have an excluded tag
  base AS (
    SELECT e.id, e.slug, e.name, e.primary_muscles, e.secondary_muscles, e.equipment, e.modalities, e.movement_pattern
    FROM public.exercises e
    WHERE e.is_active = true
      AND (cardinality(excluded_tag_slugs) = 0 OR e.id NOT IN (
        SELECT m.exercise_id FROM public.exercise_tag_map m
        JOIN public.exercise_tags t ON t.id = m.tag_id
        WHERE t.slug = ANY(excluded_tag_slugs)
      ))
  ),
  -- When energy_is_hard_filter = true: keep only exercises that have a tag matching user_energy (e.g. energy_low, energy_medium, energy_high)
  energy_filtered AS (
    SELECT b.* FROM base b
    WHERE NOT energy_is_hard_filter
       OR user_energy IS NULL
       OR EXISTS (
         SELECT 1 FROM public.exercise_tag_map m
         JOIN public.exercise_tags t ON t.id = m.tag_id
         WHERE m.exercise_id = b.id AND t.slug = ('energy_' || user_energy)
       )
  ),
  -- Match score: sum of tag weights for selected tags that the exercise has, plus raw matched count for tie-break
  match_scores AS (
    SELECT
      ef.id,
      ef.slug,
      ef.name,
      ef.primary_muscles,
      ef.secondary_muscles,
      ef.equipment,
      ef.modalities,
      ef.movement_pattern,
      COALESCE(SUM(st.tag_weight), 0)::double precision AS weighted_score,
      COUNT(st.tag_id)::int AS matched_count
    FROM energy_filtered ef
    LEFT JOIN public.exercise_tag_map m ON m.exercise_id = ef.id
    LEFT JOIN selected_tags st ON st.tag_id = m.tag_id
    GROUP BY ef.id, ef.slug, ef.name, ef.primary_muscles, ef.secondary_muscles, ef.equipment, ef.modalities, ef.movement_pattern
  ),
  -- Energy soft adjustment: boost if exercise has matching energy tag, slight penalty if it has only opposite energy
  energy_tags AS (
    SELECT
      m.exercise_id,
      MAX(CASE WHEN t.slug = 'energy_low'    THEN 1 ELSE 0 END) AS has_low,
      MAX(CASE WHEN t.slug = 'energy_medium' THEN 1 ELSE 0 END) AS has_medium,
      MAX(CASE WHEN t.slug = 'energy_high'   THEN 1 ELSE 0 END) AS has_high
    FROM public.exercise_tag_map m
    JOIN public.exercise_tags t ON t.id = m.tag_id
    WHERE t.slug IN ('energy_low', 'energy_medium', 'energy_high')
    GROUP BY m.exercise_id
  ),
  final_score AS (
    SELECT
      ms.id,
      ms.slug,
      ms.name,
      ms.primary_muscles,
      ms.secondary_muscles,
      ms.equipment,
      ms.modalities,
      ms.movement_pattern,
      ms.matched_count,
      ms.weighted_score AS base_score,
      (SELECT
        CASE WHEN user_energy IS NULL OR energy_is_hard_filter THEN 0
             WHEN user_energy = 'low'    THEN (CASE WHEN COALESCE(et.has_low, 0) = 1 THEN 0.5 ELSE CASE WHEN et.has_high = 1 AND COALESCE(et.has_low, 0) = 0 THEN -0.3 ELSE 0 END END)
             WHEN user_energy = 'medium' THEN (CASE WHEN COALESCE(et.has_medium, 0) = 1 THEN 0.3 ELSE 0 END)
             WHEN user_energy = 'high'   THEN (CASE WHEN COALESCE(et.has_high, 0) = 1 THEN 0.5 ELSE CASE WHEN et.has_low = 1 AND COALESCE(et.has_high, 0) = 0 THEN -0.2 ELSE 0 END END)
             ELSE 0
        END
       FROM energy_tags et WHERE et.exercise_id = ms.id
      ) AS energy_bonus
    FROM match_scores ms
  )
  SELECT
    fs.id,
    fs.slug,
    fs.name,
    fs.primary_muscles,
    fs.secondary_muscles,
    fs.equipment,
    fs.modalities,
    fs.movement_pattern,
    (fs.base_score + fs.energy_bonus) AS match_score,
    fs.matched_count AS matched_tag_count
  FROM final_score fs
  ORDER BY (fs.base_score + fs.energy_bonus) DESC, fs.matched_count DESC, fs.slug
  LIMIT result_limit
  OFFSET result_offset;
END;
$$;

COMMENT ON FUNCTION public.get_exercises_by_tags_ranked IS
  'Returns exercises ranked by tag match. selected_tag_slugs: boost score for each match (weighted). excluded_tag_slugs: hard exclude. user_energy + energy_is_hard_filter: by default energy only adjusts score (soft); set energy_is_hard_filter=true to exclude non-matching.';

-- Grant execute to anon and authenticated (catalog read)
GRANT EXECUTE ON FUNCTION public.get_exercises_by_tags_ranked TO anon;
GRANT EXECUTE ON FUNCTION public.get_exercises_by_tags_ranked TO authenticated;
