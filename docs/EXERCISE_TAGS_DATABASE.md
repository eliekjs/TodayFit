# Exercise Tags Database Reference

This document describes the **exercise tags** schema and lists all tag definitions as seeded in Supabase migrations. The live catalog is in Supabase: tables `exercise_tags` and `exercise_tag_map`.

---

## Schema

### `exercise_tags`

| Column      | Type   | Description |
|------------|--------|-------------|
| `id`       | uuid   | Primary key (default `gen_random_uuid()`) |
| `slug`     | text   | Unique tag identifier (e.g. `squat`, `energy_low`) |
| `name`     | text   | Display name |
| `tag_group`| text   | Category: see tag groups below |
| `sort_order` | int | For ordering (default 0) |
| `weight`   | real   | Optional ranking weight (default 1.0); added in `20250302100000` |

**Tag groups:** `movement_pattern`, `modality`, `energy`, `muscle`, `equipment`, `joint_stress`, `contraindication`, `sport`, `general`, `exercise_role`, `pairing_category`, `stretch_target`.

### `exercise_tag_map`

Links exercises to tags (many-to-many).

| Column            | Type  | Description |
|-------------------|-------|-------------|
| `exercise_id`     | uuid  | FK → `exercises(id)` |
| `tag_id`          | uuid  | FK → `exercise_tags(id)` |
| `relevance_weight`| real  | Per (exercise, tag) relevance for goal/sport scoring (default 1.0); added in `20250305100000` |

Primary key: `(exercise_id, tag_id)`.

---

## All Exercise Tags (by group)

Tags are listed as `slug` → `name` (and `weight` when set in migrations). Order follows migration order; duplicates across migrations are merged by slug.

### movement_pattern

| slug | name | weight |
|------|------|--------|
| squat | Squat | 1.2 |
| hinge | Hinge | 1.2 |
| push | Push | 1.2 |
| pull | Pull | 1.2 |
| carry | Carry | 1.2 |
| rotate | Rotate | 1.2 |
| locomotion | Locomotion | 1.2 |
| horizontal_push | Horizontal push | 1.2 |
| vertical_push | Vertical push | 1.2 |
| horizontal_pull | Horizontal pull | 1.2 |
| vertical_pull | Vertical pull | 1.2 |
| lunge | Lunge | 1.2 |
| anti_rotation | Anti-rotation | 1.0 |
| shoulder_stability | Shoulder stability | 1.0 |
| thoracic_mobility | Thoracic mobility | 1.0 |

### modality

| slug | name | weight |
|------|------|--------|
| strength | Strength | 1.0 |
| hypertrophy | Hypertrophy | 1.0 |
| conditioning | Conditioning | 1.0 |
| mobility | Mobility | 1.0 |
| power | Power | 1.0 |
| recovery | Recovery | 1.0 |
| endurance | Endurance | 1.0 |
| prehab | Prehab | 1.0 |

### energy

| slug | name | weight |
|------|------|--------|
| energy_low | Low energy | 1.0 |
| energy_medium | Medium energy | 1.0 |
| energy_high | High energy | 1.0 |

### muscle

| slug | name | weight |
|------|------|--------|
| legs | Legs | 1.0 |
| core | Core | 1.0 |
| glutes | Glutes | 1.0 |
| quads | Quads | 1.0 |
| hamstrings | Hamstrings | 1.0 |
| chest | Chest | 1.0 |
| back | Back | 1.0 |
| shoulders | Shoulders | 1.0 |
| lats | Lats | 1.0 |
| triceps | Triceps | 1.0 |
| biceps | Biceps | 1.0 |
| upper_back | Upper back | 1.0 |
| calves | Calves | 1.0 |
| lat-focused | Lat focused | 1.0 |

### equipment

| slug | name | weight |
|------|------|--------|
| equipment_barbell | Barbell | 0.8 |
| equipment_dumbbell | Dumbbell | 0.8 |
| equipment_kettlebell | Kettlebell | 0.8 |
| equipment_cable | Cable | 0.8 |
| equipment_bodyweight | Bodyweight | 0.8 |
| equipment_band | Band | 0.8 |
| equipment_machine | Machine | 0.8 |
| equipment_bench | Bench | 0.6 |
| equipment_pullup_bar | Pull-up bar | 0.6 |
| equipment_treadmill | Treadmill | 0.6 |
| equipment_bike | Bike | 0.6 |
| equipment_rower | Rower | 0.6 |
| equipment_trx | TRX | 0.6 |
| equipment_plyo_box | Plyo box | 0.6 |
| equipment_ski_erg | Ski Erg | 0.6 |
| equipment_sled | Sled | 0.6 |
| equipment_ez_bar | EZ Bar | 0.6 |

### joint_stress

| slug | name | weight |
|------|------|--------|
| joint_shoulder_overhead | Shoulder overhead | 1.0 |
| joint_knee_flexion | Knee flexion | 1.0 |
| joint_lumbar | Lumbar | 1.0 |
| joint_shoulder_extension | Shoulder extension | 1.0 |
| shoulder_overhead | Shoulder overhead | 1.0 |
| shoulder_extension | Shoulder extension | 1.0 |
| grip_hanging | Grip / hanging | 1.0 |
| knee_flexion | Knee flexion | 1.0 |
| deep_knee_flexion | Deep knee flexion | 1.0 |
| lumbar_shear | Lumbar shear | 1.0 |
| spinal_axial_load | Spinal axial load | 1.0 |
| elbow_stress | Elbow stress | 1.0 |
| wrist_stress | Wrist stress | 1.0 |
| hip_stress | Hip stress | 1.0 |
| ankle_stress | Ankle stress | 1.0 |

### contraindication

| slug | name | weight |
|------|------|--------|
| contra_knee | Knee concern | 1.0 |
| contra_lower_back | Lower back concern | 1.0 |
| contra_shoulder | Shoulder concern | 1.0 |
| knee_friendly | Knee friendly | 1.0 |
| shoulder_friendly | Shoulder friendly | 1.0 |
| shoulder-friendly | Shoulder friendly | 1.0 |
| low_back_friendly | Lower back friendly | 1.0 |

### sport

| slug | name | weight |
|------|------|--------|
| sport_climbing | Climbing | 1.0 |
| sport_running | Running | 1.0 |
| sport_skiing | Skiing | 1.0 |
| sport_hyrox | Hyrox | 1.0 |
| sport_general | General fitness | 0.5 |
| sport_triathlon | Triathlon | 0.8 |
| sport_trail | Trail / Hiking | 0.8 |
| sport_ocr | OCR / Hyrox | 0.8 |
| sport_basketball | (from sports table) | 0.9 |
| sport_volleyball_indoor | (from sports table) | 0.9 |
| … | Additional `sport_<slug>` from `public.sports` | 0.9 |

### general

| slug | name | weight |
|------|------|--------|
| quad-focused | Quad focused | 1.0 |
| posterior chain | Posterior chain | 1.0 |
| posterior_chain | Posterior chain | 1.0 |
| single-leg | Single leg | 1.0 |
| single_leg | Single leg | 1.0 |
| core stability | Core stability | 1.0 |
| core_stability | Core stability | 1.0 |
| spine-friendly | Spine friendly | 1.0 |
| lat-focused | (see muscle) | — |
| uphill conditioning | Uphill conditioning | 0.8 |
| posture | Posture | 0.8 |
| shoulder stability | Shoulder stability | 1.0 |
| grip strength | Grip strength | 1.0 |
| unilateral | Unilateral | 0.9 |
| bilateral | Bilateral | 0.9 |
| compound | Compound | 1.0 |
| isolation | Isolation | 0.9 |
| grip | Grip | 0.8 |
| scapular_control | Scapular control | 1.0 |
| anti_rotation | Anti-rotation | 1.0 |
| low_impact | Low impact | 0.9 |
| plyometric | Plyometric | 1.0 |
| thoracic_mobility | Thoracic mobility | 1.0 |
| hip_mobility | Hip mobility | 1.0 |
| balance | Balance | 0.8 |
| zone2 | Zone 2 | 0.8 / 1.0 |
| intervals | Intervals | 0.9 |
| single_joint | Single joint | 0.8 |
| quad-focused | Quad focused | 1.0 |
| chest | Chest | (also muscle) |
| triceps | Triceps | (also muscle) |
| shoulders | Shoulders | (also muscle) |
| knee-friendly | Knee friendly | (also contraindication) |
| endurance | Endurance | (also modality) |
| low impact | Low impact | 0.9 |

(Some slugs appear in both `general` and other groups in different migrations.)

### exercise_role

| slug | name | weight |
|------|------|--------|
| role_warmup | Warmup | 1.0 |
| role_prep | Prep | 1.0 |
| role_main_compound | Main compound | 1.0 |
| role_accessory | Accessory | 1.0 |
| role_isolation | Isolation | 1.0 |
| role_finisher | Finisher | 1.0 |
| role_cooldown | Cooldown | 1.0 |
| role_mobility | Mobility | 1.0 |
| role_conditioning | Conditioning | 1.0 |

### pairing_category

| slug | name | weight |
|------|------|--------|
| pair_chest | Chest | 1.0 |
| pair_shoulders | Shoulders | 1.0 |
| pair_triceps | Triceps | 1.0 |
| pair_back | Back | 1.0 |
| pair_biceps | Biceps | 1.0 |
| pair_quads | Quads | 1.0 |
| pair_posterior_chain | Posterior chain | 1.0 |
| pair_core | Core | 1.0 |
| pair_mobility | Mobility | 1.0 |

### stretch_target

| slug | name | weight |
|------|------|--------|
| stretch_hamstrings | Hamstrings | 1.0 |
| stretch_hip_flexors | Hip flexors | 1.0 |
| stretch_thoracic_spine | Thoracic spine | 1.0 |
| stretch_shoulders | Shoulders | 1.0 |
| stretch_calves | Calves | 1.0 |
| stretch_glutes | Glutes | 1.0 |
| stretch_quadriceps | Quadriceps | 1.0 |
| stretch_lats | Lats | 1.0 |
| stretch_pecs | Pecs | 1.0 |
| stretch_hip_mobility | Hip mobility | 1.0 |

---

## How to read the live database

- **List all tags (app):** `listTags()` in `lib/db/exerciseRepository.ts` → `exercise_tags` with `slug, name, tag_group, weight`.
- **List tags for an exercise:** query `exercise_tag_map` by `exercise_id` and join `exercise_tags` for slug/name, or use `getExercise(slug)` and the returned `tags` array.
- **Supabase:** tables `public.exercise_tags`, `public.exercise_tag_map` (RLS allows read for authenticated users).

---

## Migration sources

- `20250301000003_app_entities_seed.sql` — initial tags + map
- `20250302100000_exercise_tags_weight_and_search.sql` — `weight` column, RPC
- `20250302100001_exercise_tag_universe_and_library_seed.sql` — tag universe + legacy slugs
- `20250304100000_exercise_library_expansion.sql` — equipment + sport + general
- `20250305100000_exercise_tag_relevance_weight.sql` — `relevance_weight` on map
- `20250307000000_zone2_rower_stair_climber.sql` — zone2 tag
- `20250310100000_research_backed_sport_exercises.sql` — sport_* from sports table
- `20250312000001_exercise_tags_generation.sql` — joint_stress, movement_detail, exercise_role, pairing_category, stretch_target

Note: the initial seed references tag slug `spine mobility` in `exercise_tag_map` for `cat_camel`; that slug may need to exist in `exercise_tags` (e.g. added in a later migration or backfill) for the map to resolve.
