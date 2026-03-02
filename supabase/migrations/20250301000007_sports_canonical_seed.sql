-- Canonical Sports Prep catalog
-- Idempotent UPSERT of full sports list used by Adaptive / Sports Prep mode.
-- Run after:
--   - 20250301000000_sport_mode_schema.sql
--   - 20250301000006_sports_extended_schema.sql

INSERT INTO public.sports (slug, name, category, description, is_active, popularity_tier)
VALUES
  -- Endurance
  ('road_running', 'Road Running (5K/10K/Half/Marathon)', 'Endurance', 'Paved road races from 5K through marathon distance.', true, 1),
  ('trail_running', 'Trail Running', 'Endurance', 'Off-road running on trails and mixed terrain.', true, 1),
  ('ultra_running', 'Ultra Running', 'Endurance', 'Races longer than marathon distance on road or trail.', true, 2),
  ('hiking_backpacking', 'Hiking / Backpacking', 'Endurance', 'Day hikes and multi-day backpacking trips.', true, 2),
  ('rucking', 'Rucking', 'Endurance', 'Loaded walking with a pack for fitness or events.', true, 2),
  ('cycling_road', 'Cycling (Road)', 'Endurance', 'Road cycling for fitness, group rides, or racing.', true, 1),
  ('cycling_mtb', 'Cycling (Mountain)', 'Endurance', 'Cross-country and trail mountain biking.', true, 2),
  ('swimming_open_water', 'Swimming (Lap / Open Water)', 'Endurance', 'Pool laps and open water swim training.', true, 1),
  ('triathlon', 'Triathlon', 'Endurance', 'Swim-bike-run triathlon events across all distances.', true, 1),
  ('rowing_erg', 'Rowing / Erg', 'Endurance', 'Indoor rowing (erg) and rowing conditioning.', true, 2),
  ('xc_skiing', 'Cross-Country Skiing (Nordic)', 'Endurance', 'Classic and skate Nordic skiing.', true, 2),
  ('ocr_spartan', 'Spartan / Obstacle Course Racing (OCR)', 'Endurance', 'Obstacle course races like Spartan and Tough Mudder.', true, 2),
  ('hyrox', 'Hyrox', 'Endurance', 'Hyrox-style hybrid endurance events.', true, 2),
  ('tactical_fitness', 'Tactical Fitness / Military PT test prep', 'Endurance', 'Military, law enforcement, and tactical fitness tests.', true, 3),

  -- Strength / Power / Mixed Modal
  ('general_strength', 'General Strength (Powerlifting)', 'Strength/Power', 'Powerlifting-style strength training (squat, bench, deadlift).', true, 1),
  ('olympic_weightlifting', 'Olympic Weightlifting', 'Strength/Power', 'Snatch and clean & jerk with accessory work.', true, 2),
  ('crossfit', 'CrossFit / Functional Fitness', 'Strength/Power', 'Mixed modal strength and conditioning (WOD-style).', true, 1),
  ('bodybuilding', 'Bodybuilding (physique prep)', 'Strength/Power', 'Physique-focused hypertrophy and show prep.', true, 2),
  ('strongman', 'Strongman', 'Strength/Power', 'Strongman-style events and lifts.', true, 3),
  ('track_sprinting', 'Track Sprinting (100–400m)', 'Strength/Power', 'Short sprints and speed development on the track.', true, 2),
  ('vertical_jump', 'Vertical Jump / Dunk training', 'Strength/Power', 'Jump and dunk performance training.', true, 2),

  -- Mountain / Snow / Board
  ('alpine_skiing', 'Alpine Skiing', 'Mountain/Snow/Board', 'Resort downhill skiing.', true, 1),
  ('backcountry_skiing', 'Backcountry Skiing / Ski Touring', 'Mountain/Snow/Board', 'Human-powered ski touring and backcountry descents.', true, 2),
  ('snowboarding', 'Snowboarding', 'Mountain/Snow/Board', 'Resort and freeride snowboarding.', true, 1),
  ('splitboarding', 'Splitboarding', 'Mountain/Snow/Board', 'Backcountry splitboarding for touring and descents.', true, 2),
  ('mountaineering', 'Mountaineering (Alpine objectives)', 'Mountain/Snow/Board', 'Alpine mountaineering and mixed objectives.', true, 3),
  ('ice_climbing', 'Ice Climbing', 'Mountain/Snow/Board', 'Waterfall ice and mixed climbing.', true, 3),

  -- Court / Field
  ('soccer', 'Soccer', 'Court/Field', 'Field sport with high endurance and change of direction demands.', true, 1),
  ('basketball', 'Basketball', 'Court/Field', 'Court sport with jumping, cutting, and repeat sprints.', true, 1),
  ('tennis', 'Tennis', 'Court/Field', 'Racquet sport on hard or clay courts.', true, 1),
  ('pickleball', 'Pickleball', 'Court/Field', 'Smaller-court paddle sport.', true, 2),
  ('volleyball_indoor', 'Volleyball (Indoor)', 'Court/Field', 'Indoor team volleyball.', true, 2),
  ('volleyball_beach', 'Beach Volleyball', 'Court/Field', 'Beach doubles volleyball.', true, 2),
  ('flag_football', 'Flag Football', 'Court/Field', 'Non-contact flag football.', true, 3),
  ('american_football', 'American Football', 'Court/Field', 'Full-contact American football.', true, 2),
  ('rugby', 'Rugby', 'Court/Field', 'Field rugby codes (union / league / sevens).', true, 2),
  ('lacrosse', 'Lacrosse', 'Court/Field', 'Field lacrosse and box variants.', true, 3),
  ('baseball_softball', 'Baseball / Softball', 'Court/Field', 'Diamond sports including baseball and softball.', true, 2),
  ('golf', 'Golf', 'Court/Field', 'Recreational and competitive golf.', true, 2),

  -- Combat / Grappling
  ('boxing', 'Boxing', 'Combat/Grappling', 'Boxing for fitness or competition.', true, 1),
  ('muay_thai', 'Muay Thai / Kickboxing', 'Combat/Grappling', 'Muay Thai and kickboxing.', true, 2),
  ('mma', 'MMA', 'Combat/Grappling', 'Mixed martial arts.', true, 2),
  ('bjj', 'Brazilian Jiu-Jitsu', 'Combat/Grappling', 'Brazilian Jiu-Jitsu (gi and no-gi).', true, 1),
  ('wrestling', 'Wrestling', 'Combat/Grappling', 'Folkstyle, freestyle, and Greco-Roman wrestling.', true, 2),
  ('judo', 'Judo', 'Combat/Grappling', 'Judo throws and groundwork.', true, 2),

  -- Water / Wind
  ('surfing', 'Surfing', 'Water/Wind', 'Surfing shortboard and longboard.', true, 2),
  ('sup', 'Stand-Up Paddleboard', 'Water/Wind', 'Stand-up paddleboarding on flat water or surf.', true, 3),
  ('kite_wind_surf', 'Kitesurfing / Windsurfing', 'Water/Wind', 'Kitesurfing and windsurfing.', true, 3),

  -- Climbing
  ('rock_bouldering', 'Rock Climbing (Bouldering)', 'Climbing', 'Short, powerful bouldering on rock or gym walls.', true, 1),
  ('rock_sport_lead', 'Rock Climbing (Sport/Lead)', 'Climbing', 'Single- and multi-pitch sport climbing.', true, 1),
  ('rock_trad', 'Rock Climbing (Trad)', 'Climbing', 'Traditional gear-protected rock climbing.', true, 2)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  popularity_tier = EXCLUDED.popularity_tier;

