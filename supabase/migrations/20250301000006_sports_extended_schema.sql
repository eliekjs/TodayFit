-- Extend sports schema for Sports Prep engine
-- - Add description
-- - Add popularity_tier (for ordering)
-- - Keep existing slug UNIQUE and is_active default true

ALTER TABLE public.sports
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS popularity_tier int NOT NULL DEFAULT 10;

-- Helpful composite index for common Sports Prep sort/filter pattern
CREATE INDEX IF NOT EXISTS idx_sports_active_popularity_name
  ON public.sports(is_active, popularity_tier, name);

