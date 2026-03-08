# Phase 1: Training Qualities System — Foundation

This document describes the **Phase 1** implementation: the data models and infrastructure for the training qualities system. No workout generation logic is included; this is the backbone that later phases will use.

---

## A. Training Qualities Taxonomy

Canonical list of **38 training qualities** in 6 categories:

| Category        | Qualities |
|----------------|-----------|
| **strength**   | max_strength, hypertrophy, muscular_endurance, unilateral_strength, eccentric_strength, pulling_strength, pushing_strength, lockoff_strength |
| **power**      | power, rate_of_force_development, plyometric_ability |
| **energy_system** | aerobic_base, aerobic_power, anaerobic_capacity, lactate_tolerance, work_capacity |
| **movement**   | mobility, thoracic_mobility, balance, coordination, rotational_power, rotational_control |
| **resilience** | joint_stability, tendon_resilience, recovery |
| **sport_support** | grip_strength, forearm_endurance, scapular_stability, core_tension, trunk_anti_flexion, trunk_anti_rotation, trunk_endurance, hip_stability, posterior_chain_endurance, lat_hypertrophy, quad_hypertrophy, paddling_endurance, pop_up_power |

- **Slug**: lowercase, snake_case (e.g. `rate_of_force_development`).
- **Name**: Display label.
- **Category**: One of the six above; used for grouping in UI and filters.
- **Description**: Short explanation (optional in code, stored in DB).

---

## B. TypeScript Interfaces

Defined in:

- **`logic/workoutIntelligence/trainingQualities.ts`**
  - `TrainingQualityCategory` — union of the six categories.
  - `TrainingQualitySlug` — union of all quality slugs.
  - `TrainingQuality` — `{ slug, name, category, description, sort_order }` (optional `id` when from DB).
  - `TrainingQualityDef` — same as `TrainingQuality` without `id` (static config).
  - `TRAINING_QUALITIES` — array of definitions (single source of truth for slugs and metadata).

- **`logic/workoutIntelligence/dataModels.ts`**
  - `SportTrainingDemandRow` — `{ sport_slug, training_quality_slug, weight }`.
  - `SportTrainingDemandMap` — `Record<sport_slug, Partial<Record<quality_slug, weight>>>`.
  - `GoalTrainingDemandRow` — `{ goal_slug, training_quality_slug, weight }`.
  - `GoalTrainingDemandMap` — `Record<goal_slug, Partial<Record<quality_slug, weight>>>`.
  - `ExerciseQualityScoreRow` — `{ exercise_id, training_quality_slug, weight }`.
  - `ExerciseQualityScoreMap` — `Record<exercise_id_or_slug, Partial<Record<quality_slug, weight>>>`.

Weights are **0–1** (1 = highest demand / best match).

---

## C. Database Schema

**Recommendation: both static config and database.**

- **Static config (TypeScript)**: Single source of truth for the **taxonomy** (slug, name, category, description, sort_order). The app can run without DB for development and tests; slugs are fixed in code.
- **Database**: Stores the same taxonomy and all mappings so that:
  - Admin/UI can edit or extend mappings without a deploy.
  - RLS and Supabase APIs can serve catalog and mappings.
  - Exercise/sport/goal mappings can be bulk-loaded and updated via migrations or admin.

### Tables

| Table | Purpose |
|-------|--------|
| **training_qualities** | Canonical list. PK = `slug` (text). Columns: slug, name, category, description, sort_order. |
| **sport_training_demand** | Sport → quality weights. PK = (sport_slug, training_quality_slug). FK to training_qualities(slug). |
| **goal_training_demand** | Goal → quality weights. PK = (goal_slug, training_quality_slug). FK to training_qualities(slug). |
| **exercise_training_quality** | Exercise → quality weights. PK = (exercise_id, training_quality_slug). FK to exercises(id), training_qualities(slug). |

All weight columns: `real CHECK (weight >= 0 AND weight <= 1)`.

Migrations:

- `supabase/migrations/20250311000000_training_qualities.sql` — creates the four tables and RLS (read-only for anon/authenticated).
- `supabase/migrations/20250311000001_training_qualities_seed.sql` — seeds taxonomy, plus example rows for sport, goal, and exercise mappings.

---

## D. Example Seed Data

### Sport → training demand (excerpt)

| sport_slug          | training_quality_slug | weight |
|---------------------|------------------------|--------|
| rock_bouldering     | pulling_strength       | 0.9    |
| rock_bouldering     | grip_strength          | 1.0    |
| rock_bouldering     | forearm_endurance      | 0.7    |
| rock_bouldering     | scapular_stability     | 0.8    |
| rock_bouldering     | core_tension           | 0.6    |
| backcountry_skiing  | aerobic_base           | 0.9    |
| backcountry_skiing  | eccentric_strength     | 0.8    |
| backcountry_skiing  | unilateral_strength    | 0.8    |
| backcountry_skiing  | hip_stability          | 0.7    |
| surfing             | paddling_endurance     | 0.85   |
| surfing             | pop_up_power           | 0.8    |
| surfing             | balance                | 0.8    |
| hyrox               | aerobic_power          | 0.85   |
| hyrox               | lactate_tolerance      | 0.8    |
| hyrox               | work_capacity          | 0.9    |

### Goal → training demand (excerpt)

| goal_slug            | training_quality_slug | weight |
|----------------------|------------------------|--------|
| hypertrophy          | hypertrophy            | 0.9    |
| hypertrophy          | muscular_endurance     | 0.4    |
| hypertrophy          | joint_stability        | 0.3    |
| strength             | max_strength           | 0.95   |
| athletic_performance | power                  | 0.7    |
| athletic_performance | rate_of_force_development | 0.6  |
| climbing_performance | pulling_strength       | 0.9    |
| climbing_performance | grip_strength         | 0.85   |
| climbing_performance | scapular_stability    | 0.8    |
| climbing_performance | core_tension          | 0.7    |

### Exercise → training quality (excerpt)

| exercise_slug        | training_quality_slug | weight |
|----------------------|------------------------|--------|
| pullup               | pulling_strength       | 1.0    |
| pullup               | grip_strength         | 0.6    |
| pullup               | core_tension          | 0.4    |
| pullup               | hypertrophy           | 0.7    |
| bulgarian_split_squat| unilateral_strength   | 1.0    |
| bulgarian_split_squat| quad_hypertrophy      | 0.8    |
| bulgarian_split_squat| hip_stability         | 0.5    |
| weighted_pullup      | pulling_strength      | 1.0    |
| weighted_pullup      | grip_strength         | 0.6    |
| weighted_pullup      | hypertrophy           | 0.7    |

(Seed file uses `exercise_id` resolved from `public.exercises` by slug; only exercises that exist are inserted.)

---

## E. Recommended File Organization

```
logic/workoutIntelligence/
├── trainingQualities.ts      # Taxonomy: slugs, categories, TRAINING_QUALITIES array
├── dataModels.ts             # TS interfaces: SportTrainingDemandRow, GoalTrainingDemandRow, ExerciseQualityScoreRow, *Map types
├── goalQualityWeights.ts     # Static goal → quality weights (optional; can load from DB instead)
├── sportQualityWeights.ts    # Static sport → quality weights (optional; can load from DB instead)
├── tagToQualityMap.ts        # Tag slug → quality map (for deriving exercise qualities from tags)
├── types.ts                  # SessionTargetVector, ExerciseWithQualities, BlockSpec, etc.
├── PHASE1_FOUNDATION.md      # This doc
├── ARCHITECTURE.md           # Full system design
└── README.md                 # How to use the module

lib/
├── db/
│   └── trainingQualitiesRepository.ts   # (Optional) Load training_qualities, sport_training_demand, goal_training_demand, exercise_training_quality from Supabase
└── ...

supabase/migrations/
├── 20250311000000_training_qualities.sql   # Schema: 4 tables + RLS
└── 20250311000001_training_qualities_seed.sql  # Seed: taxonomy + example mappings
```

- **Taxonomy**: Always defined in `trainingQualities.ts`; DB seed mirrors it so FKs and admin UI stay valid.
- **Mappings**: Can live in **static config** (goalQualityWeights.ts, sportQualityWeights.ts) for speed and offline, or be **loaded from DB** (trainingQualitiesRepository) when you need admin-editable or user-specific mappings. Phase 1 provides both: static config for development, DB for persistence and future admin.

---

## Summary

- **38 training qualities** in 6 categories, with TypeScript types and DB table `training_qualities`.
- **Sport, goal, and exercise** mappings defined as row types and map types in TS, and as tables `sport_training_demand`, `goal_training_demand`, `exercise_training_quality` in the DB with example seed data.
- **Single source of truth** for the taxonomy is the static list in `trainingQualities.ts`; DB and seeds stay in sync with it.
- **No generator logic** in Phase 1; this foundation is ready for Phase 2 (scoring and session composition).
