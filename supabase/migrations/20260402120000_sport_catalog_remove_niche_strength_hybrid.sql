-- Remove niche/hybrid sport options from the active picker (strongman, OCR, tactical, CrossFit,
-- powerlifting-as-sport, Olympic WL, mountaineering, vertical-jump sport, legacy track_field).
-- Local app catalog matches `data/sportSubFocus/sportsWithSubFocuses.ts`; legacy slugs remap in
-- `data/sportSubFocus/canonicalSportSlug.ts`.

UPDATE public.sports
SET is_active = false
WHERE slug IN (
  'strongman',
  'ocr_spartan',
  'tactical_fitness',
  'crossfit',
  'general_strength',
  'olympic_weightlifting',
  'mountaineering',
  'vertical_jump',
  'track_field'
);

-- Align display name with in-app "Sprinting" (combined track + sprinting).
UPDATE public.sports
SET
  name = 'Sprinting',
  description = 'Short sprints, acceleration, max velocity, and jump/power development for track and field.'
WHERE slug = 'track_sprinting';
