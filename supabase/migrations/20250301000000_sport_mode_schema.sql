-- Sport Mode schema: sports, sport_qualities, sport_quality_map, user_sport_profiles, sport_events
-- Supabase-compatible; run via Supabase CLI or Dashboard SQL editor.

-- sports: catalog of sports by category
CREATE TABLE IF NOT EXISTS public.sports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sports_slug ON public.sports(slug);
CREATE INDEX IF NOT EXISTS idx_sports_category ON public.sports(category);
CREATE INDEX IF NOT EXISTS idx_sports_is_active_sort ON public.sports(is_active, sort_order);

-- sport_qualities: qualities (speed, power, conditioning, etc.)
CREATE TABLE IF NOT EXISTS public.sport_qualities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  quality_group text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sport_qualities_slug ON public.sport_qualities(slug);
CREATE INDEX IF NOT EXISTS idx_sport_qualities_group_sort ON public.sport_qualities(quality_group, sort_order);

-- sport_quality_map: many-to-many with relevance 1-3
CREATE TABLE IF NOT EXISTS public.sport_quality_map (
  sport_id uuid NOT NULL REFERENCES public.sports(id) ON DELETE CASCADE,
  quality_id uuid NOT NULL REFERENCES public.sport_qualities(id) ON DELETE CASCADE,
  relevance int NOT NULL CHECK (relevance >= 1 AND relevance <= 3),
  PRIMARY KEY (sport_id, quality_id)
);

CREATE INDEX IF NOT EXISTS idx_sport_quality_map_sport ON public.sport_quality_map(sport_id);
CREATE INDEX IF NOT EXISTS idx_sport_quality_map_quality ON public.sport_quality_map(quality_id);

-- user_sport_profiles: user's selected sport and phase
CREATE TABLE IF NOT EXISTS public.user_sport_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sport_id uuid REFERENCES public.sports(id) ON DELETE SET NULL,
  season_phase text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_sport_profiles_user_id ON public.user_sport_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sport_profiles_sport_id ON public.user_sport_profiles(sport_id);
CREATE INDEX IF NOT EXISTS idx_user_sport_profiles_updated ON public.user_sport_profiles(updated_at DESC);

-- user_sport_profile_qualities: 1-3 qualities per profile with priority
CREATE TABLE IF NOT EXISTS public.user_sport_profile_qualities (
  user_sport_profile_id uuid NOT NULL REFERENCES public.user_sport_profiles(id) ON DELETE CASCADE,
  quality_id uuid NOT NULL REFERENCES public.sport_qualities(id) ON DELETE CASCADE,
  priority int NOT NULL CHECK (priority >= 1 AND priority <= 3),
  PRIMARY KEY (user_sport_profile_id, quality_id)
);

CREATE INDEX IF NOT EXISTS idx_user_sport_profile_qualities_profile ON public.user_sport_profile_qualities(user_sport_profile_id);

-- sport_events: user's upcoming events
CREATE TABLE IF NOT EXISTS public.sport_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sport_id uuid REFERENCES public.sports(id) ON DELETE SET NULL,
  name text NOT NULL,
  event_date date NOT NULL,
  importance text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sport_events_user_id ON public.sport_events(user_id);
CREATE INDEX IF NOT EXISTS idx_sport_events_sport_id ON public.sport_events(sport_id);
CREATE INDEX IF NOT EXISTS idx_sport_events_event_date ON public.sport_events(event_date);

-- updated_at trigger helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS set_user_sport_profiles_updated_at ON public.user_sport_profiles;
CREATE TRIGGER set_user_sport_profiles_updated_at
  BEFORE UPDATE ON public.user_sport_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_sport_events_updated_at ON public.sport_events;
CREATE TRIGGER set_sport_events_updated_at
  BEFORE UPDATE ON public.sport_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.sports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sport_qualities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sport_quality_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sport_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sport_profile_qualities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sport_events ENABLE ROW LEVEL SECURITY;

-- Read-only for catalog tables (authenticated users)
CREATE POLICY "sports_select_authenticated" ON public.sports
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "sport_qualities_select_authenticated" ON public.sport_qualities
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "sport_quality_map_select_authenticated" ON public.sport_quality_map
  FOR SELECT TO authenticated USING (true);

-- user_sport_profiles: CRUD own rows only
CREATE POLICY "user_sport_profiles_select_own" ON public.user_sport_profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_sport_profiles_insert_own" ON public.user_sport_profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_sport_profiles_update_own" ON public.user_sport_profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_sport_profiles_delete_own" ON public.user_sport_profiles
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- user_sport_profile_qualities: CRUD only for own profile
CREATE POLICY "user_sport_profile_qualities_select_own" ON public.user_sport_profile_qualities
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.user_sport_profiles p
      WHERE p.id = user_sport_profile_id AND p.user_id = auth.uid()
    )
  );
CREATE POLICY "user_sport_profile_qualities_insert_own" ON public.user_sport_profile_qualities
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_sport_profiles p
      WHERE p.id = user_sport_profile_id AND p.user_id = auth.uid()
    )
  );
CREATE POLICY "user_sport_profile_qualities_update_own" ON public.user_sport_profile_qualities
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.user_sport_profiles p
      WHERE p.id = user_sport_profile_id AND p.user_id = auth.uid()
    )
  );
CREATE POLICY "user_sport_profile_qualities_delete_own" ON public.user_sport_profile_qualities
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.user_sport_profiles p
      WHERE p.id = user_sport_profile_id AND p.user_id = auth.uid()
    )
  );

-- sport_events: CRUD own rows only
CREATE POLICY "sport_events_select_own" ON public.sport_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "sport_events_insert_own" ON public.sport_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sport_events_update_own" ON public.sport_events
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sport_events_delete_own" ON public.sport_events
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
