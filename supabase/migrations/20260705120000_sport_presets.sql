-- sport_presets (user-owned): named snapshot of the Sport-Focused Training setup form.
-- Mirrors preference_presets (see 20250301000002_app_entities_schema.sql) but stores the
-- sport-mode form (sports, sport sub-focuses, fitness goals, intensity, injury, one-day
-- duration/body bias) instead of ManualPreferences, since Sport Mode has its own filter
-- shape that isn't representable as ManualPreferences alone.
CREATE TABLE IF NOT EXISTS public.sport_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  saved_at timestamptz NOT NULL DEFAULT now(),
  sport_form jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sport_presets_user_id ON public.sport_presets(user_id);

DROP TRIGGER IF EXISTS set_sport_presets_updated_at ON public.sport_presets;
CREATE TRIGGER set_sport_presets_updated_at
  BEFORE UPDATE ON public.sport_presets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.sport_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sport_presets_select_own" ON public.sport_presets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "sport_presets_insert_own" ON public.sport_presets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sport_presets_update_own" ON public.sport_presets FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sport_presets_delete_own" ON public.sport_presets FOR DELETE TO authenticated USING (auth.uid() = user_id);
