-- Equipment data backfill: correct common mis-tagged bodyweight rows using slug/name patterns.
-- Runtime adapters also apply resolveExerciseEquipmentRequired; this aligns stored DB rows with filtering.
-- See lib/equipmentResolution.ts and docs/research/equipment-audit-2025.md.

-- Clubbell / mace / indian club / landmine / smith
UPDATE public.exercises
SET equipment = ARRAY['clubbell']
WHERE equipment = ARRAY['bodyweight']
  AND (slug ILIKE '%clubbell%' OR name ILIKE '%clubbell%');

UPDATE public.exercises
SET equipment = ARRAY['macebell']
WHERE equipment = ARRAY['bodyweight']
  AND (slug ILIKE '%macebell%' OR name ILIKE '%macebell%');

UPDATE public.exercises
SET equipment = ARRAY['steel_mace']
WHERE equipment = ARRAY['bodyweight']
  AND (slug ILIKE '%steel_mace%' OR name ILIKE '%steel mace%');

UPDATE public.exercises
SET equipment = ARRAY['indian_club']
WHERE equipment = ARRAY['bodyweight']
  AND (slug ILIKE '%indian_club%' OR name ILIKE '%indian club%');

UPDATE public.exercises
SET equipment = ARRAY['barbell', 'plates']
WHERE equipment = ARRAY['bodyweight']
  AND (slug ILIKE '%landmine%' OR name ILIKE '%landmine%');

UPDATE public.exercises
SET equipment = ARRAY['smith_machine']
WHERE equipment = ARRAY['bodyweight']
  AND (slug ILIKE '%smith%machine%' OR name ILIKE '%smith machine%');

-- Free weights / cables / trap bar / ez bar
UPDATE public.exercises
SET equipment = ARRAY['kettlebells']
WHERE equipment = ARRAY['bodyweight']
  AND (slug ILIKE '%kettlebell%' OR name ILIKE '%kettlebell%' OR slug ~ '(^|_)kb(_|$)');

UPDATE public.exercises
SET equipment = ARRAY['dumbbells']
WHERE equipment = ARRAY['bodyweight']
  AND (slug ILIKE '%dumbbell%' OR name ILIKE '%dumbbell%' OR slug ~ '(^|_)db(_|$)');

UPDATE public.exercises
SET equipment = ARRAY['barbell']
WHERE equipment = ARRAY['bodyweight']
  AND (slug ILIKE '%barbell%' OR name ILIKE '%barbell%' OR slug ~ '(^|_)bb(_|$)');

UPDATE public.exercises
SET equipment = ARRAY['cable_machine']
WHERE equipment = ARRAY['bodyweight']
  AND (slug ILIKE '%cable%' OR name ILIKE '%cable%');

UPDATE public.exercises
SET equipment = ARRAY['trap_bar']
WHERE equipment = ARRAY['bodyweight']
  AND (slug ILIKE '%trap_bar%' OR slug ILIKE '%hex_bar%' OR name ILIKE '%trap bar%' OR name ILIKE '%hex bar%');

UPDATE public.exercises
SET equipment = ARRAY['ez_bar']
WHERE equipment = ARRAY['bodyweight']
  AND (slug ILIKE '%ez_bar%' OR name ILIKE '%ez bar%');

-- Bench press variants
UPDATE public.exercises
SET equipment = ARRAY['dumbbells', 'bench']
WHERE equipment = ARRAY['bodyweight']
  AND (slug ILIKE '%dumbbell%bench%press%' OR name ILIKE '%dumbbell%bench press%');

UPDATE public.exercises
SET equipment = ARRAY['barbell', 'bench']
WHERE equipment = ARRAY['bodyweight']
  AND (slug ILIKE '%bench%press%' OR name ILIKE '%bench press%');

-- Lat pulldown: tag cable + lat station slug
UPDATE public.exercises
SET equipment = ARRAY['cable_machine', 'lat_pulldown']
WHERE equipment = ARRAY['bodyweight']
  AND (slug ILIKE '%lat%pulldown%' OR name ILIKE '%lat pulldown%');

-- Cardio machine hints from slug/name
UPDATE public.exercises
SET equipment = ARRAY['rower']
WHERE equipment = ARRAY['bodyweight']
  AND (slug ILIKE '%rower%' OR slug ILIKE '%rowing%' OR name ILIKE '%rower%' OR name ILIKE '%rowing machine%');

UPDATE public.exercises
SET equipment = ARRAY['treadmill']
WHERE equipment = ARRAY['bodyweight']
  AND (slug ILIKE '%treadmill%' OR name ILIKE '%treadmill%');

UPDATE public.exercises
SET equipment = ARRAY['assault_bike']
WHERE equipment = ARRAY['bodyweight']
  AND (slug ILIKE '%assault%bike%' OR slug ILIKE '%air%bike%' OR name ILIKE '%assault bike%' OR name ILIKE '%air bike%');

UPDATE public.exercises
SET equipment = ARRAY['ski_erg']
WHERE equipment = ARRAY['bodyweight']
  AND (slug ILIKE '%ski%erg%' OR name ILIKE '%ski erg%');

UPDATE public.exercises
SET equipment = ARRAY['stair_climber']
WHERE equipment = ARRAY['bodyweight']
  AND (slug ILIKE '%stair%climber%' OR slug ILIKE '%stepper%' OR name ILIKE '%stair climber%');

UPDATE public.exercises
SET equipment = ARRAY['elliptical']
WHERE equipment = ARRAY['bodyweight']
  AND (slug ILIKE '%elliptical%' OR name ILIKE '%elliptical%');

-- Drop redundant bodyweight when specialty implement is present (clubbell + bodyweight -> clubbell)
UPDATE public.exercises
SET equipment = ARRAY['clubbell']
WHERE equipment @> ARRAY['bodyweight', 'clubbell']::text[];

UPDATE public.exercises
SET equipment = ARRAY['macebell']
WHERE equipment @> ARRAY['bodyweight', 'macebell']::text[];

UPDATE public.exercises
SET equipment = ARRAY['steel_mace']
WHERE equipment @> ARRAY['bodyweight', 'steel_mace']::text[];
