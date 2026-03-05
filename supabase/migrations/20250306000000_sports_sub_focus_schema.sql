-- Sports sub-focus schema for Sports Prep exercise-tag biasing.
-- Canonical data lives in data/sportSubFocus (TypeScript). This migration adds
-- optional DB tables for server-side or RPC use; the app can also use the TS
-- data via getExerciseTagsForSubFocuses().

-- sports_sub_focus: one row per (sport_slug, sub_focus_slug).
CREATE TABLE IF NOT EXISTS public.sports_sub_focus (
  sport_slug text NOT NULL,
  sub_focus_slug text NOT NULL,
  name text NOT NULL,
  description text,
  priority_weight smallint NOT NULL DEFAULT 1,
  PRIMARY KEY (sport_slug, sub_focus_slug)
);

COMMENT ON TABLE public.sports_sub_focus IS 'Sub-focus options per sport (e.g. Finger Strength for Rock Climbing). Canonical source: data/sportSubFocus/sportsWithSubFocuses.ts';

-- sub_focus_tag_map: (sport, sub_focus) -> exercise tag slug with weight for scoring.
CREATE TABLE IF NOT EXISTS public.sub_focus_tag_map (
  sport_slug text NOT NULL,
  sub_focus_slug text NOT NULL,
  exercise_tag_slug text NOT NULL,
  weight real NOT NULL DEFAULT 1.0,
  PRIMARY KEY (sport_slug, sub_focus_slug, exercise_tag_slug)
);

COMMENT ON TABLE public.sub_focus_tag_map IS 'Maps sport sub-focus to exercise tags for workout generator biasing. Canonical source: data/sportSubFocus/subFocusTagMap.ts';

CREATE INDEX IF NOT EXISTS idx_sub_focus_tag_map_lookup
  ON public.sub_focus_tag_map (sport_slug, sub_focus_slug);

-- RLS
ALTER TABLE public.sports_sub_focus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_focus_tag_map ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sports_sub_focus' AND policyname = 'sports_sub_focus_select_anon') THEN
    CREATE POLICY "sports_sub_focus_select_anon" ON public.sports_sub_focus FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sports_sub_focus' AND policyname = 'sports_sub_focus_select_authenticated') THEN
    CREATE POLICY "sports_sub_focus_select_authenticated" ON public.sports_sub_focus FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sub_focus_tag_map' AND policyname = 'sub_focus_tag_map_select_anon') THEN
    CREATE POLICY "sub_focus_tag_map_select_anon" ON public.sub_focus_tag_map FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sub_focus_tag_map' AND policyname = 'sub_focus_tag_map_select_authenticated') THEN
    CREATE POLICY "sub_focus_tag_map_select_authenticated" ON public.sub_focus_tag_map FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- Seed: backcountry_skiing + rock_sport_lead + hyrox (sample). Full seed from data/sportSubFocus.
INSERT INTO public.sports_sub_focus (sport_slug, sub_focus_slug, name, priority_weight)
VALUES
  ('backcountry_skiing', 'uphill_endurance', 'Uphill Endurance', 1),
  ('backcountry_skiing', 'leg_strength', 'Leg Strength', 2),
  ('backcountry_skiing', 'downhill_stability', 'Downhill Stability', 3),
  ('backcountry_skiing', 'core_stability', 'Core Stability', 4),
  ('backcountry_skiing', 'knee_resilience', 'Knee Resilience', 5),
  ('rock_sport_lead', 'finger_strength', 'Finger Strength', 1),
  ('rock_sport_lead', 'pull_strength', 'Pull Strength', 2),
  ('rock_sport_lead', 'lockoff_strength', 'Lock-off Strength', 3),
  ('rock_sport_lead', 'core_tension', 'Core Tension', 4),
  ('rock_sport_lead', 'shoulder_stability', 'Shoulder Stability', 5),
  ('rock_sport_lead', 'power_dynamic', 'Power / Dynamic Movement', 6),
  ('hyrox', 'work_capacity', 'Work Capacity', 1),
  ('hyrox', 'running_endurance', 'Running Endurance', 2),
  ('hyrox', 'lower_body_power', 'Lower Body Power', 3),
  ('hyrox', 'grip_endurance', 'Grip Endurance', 4),
  ('hyrox', 'core_stability', 'Core Stability', 5)
ON CONFLICT (sport_slug, sub_focus_slug) DO UPDATE SET
  name = EXCLUDED.name,
  priority_weight = EXCLUDED.priority_weight;

INSERT INTO public.sub_focus_tag_map (sport_slug, sub_focus_slug, exercise_tag_slug, weight)
VALUES
  ('backcountry_skiing', 'uphill_endurance', 'zone2_cardio', 1.2),
  ('backcountry_skiing', 'uphill_endurance', 'aerobic_base', 1.2),
  ('backcountry_skiing', 'leg_strength', 'single_leg_strength', 1.2),
  ('backcountry_skiing', 'leg_strength', 'eccentric_quad_strength', 1.2),
  ('backcountry_skiing', 'downhill_stability', 'knee_stability', 1.2),
  ('backcountry_skiing', 'core_stability', 'core_anti_rotation', 1.2),
  ('backcountry_skiing', 'knee_resilience', 'knee_stability', 1.2),
  ('rock_sport_lead', 'finger_strength', 'finger_strength', 1.3),
  ('rock_sport_lead', 'finger_strength', 'grip', 1),
  ('rock_sport_lead', 'pull_strength', 'pulling_strength', 1.2),
  ('rock_sport_lead', 'shoulder_stability', 'shoulder_stability', 1.2),
  ('rock_sport_lead', 'shoulder_stability', 'scapular_control', 1.2),
  ('hyrox', 'work_capacity', 'work_capacity', 1.3),
  ('hyrox', 'grip_endurance', 'grip_endurance', 1.3),
  ('hyrox', 'core_stability', 'core_bracing', 1.2)
ON CONFLICT (sport_slug, sub_focus_slug, exercise_tag_slug) DO UPDATE SET weight = EXCLUDED.weight;
