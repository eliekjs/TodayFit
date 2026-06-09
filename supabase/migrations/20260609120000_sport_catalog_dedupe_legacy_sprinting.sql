-- Deactivate legacy sport_mode row that duplicates canonical track_sprinting.
-- Original seed (20250301000001) inserted `sprinting` alongside canonical `track_sprinting`
-- from 20250301000007; both displayed as "Sprinting" in the picker until this migration.
-- Stored user slugs still resolve via data/sportSubFocus/canonicalSportSlug.ts.

UPDATE public.sports
SET is_active = false
WHERE slug IN ('sprinting');
