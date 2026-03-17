# Change of Direction (COD) — Exercise Tagging Audit

**Goal sub-focus:** "Agility / Change of direction" (`agility_cod`) under **Athletic Performance** (Manual mode).

**Tag map** (`data/goalSubFocus/goalSubFocusTagMap.ts`): When user selects this sub-goal, exercise selection is biased by:

| Tag slug             | Weight | Purpose |
|----------------------|--------|--------|
| agility              | 1.3    | Primary COD/agility quality |
| plyometric           | 1.2    | Dynamic, reactive, direction change |
| lateral_power        | 1.2    | Lateral bounds, skaters, shuffles |
| single_leg_strength  | 1.1    | Cutting, deceleration, single-leg control |
| balance              | 1.0    | Stability in direction change |
| single_leg           | 1.0    | Unilateral work |
| legs                 | 1.0    | Lower body |

---

## Current state (pre-enrichment)

### 1. Goal sub-focus (Manual mode)

- **Source of exercises:** `listExercises()` from Supabase when DB is configured; otherwise `EXERCISES` from `data/exercises.ts`.
- **Scoring:** `getUserSelectedTagSlugs()` builds a set of tag slugs (agility, plyometric, lateral_power, single_leg_strength, balance, single_leg, legs). `scoreExerciseByTagMatch()` counts how many of an exercise’s tags (and muscles) match; more matches → higher chance of selection.
- **Gap:** In the DB, `exercise_tags` had **plyometric**, **balance**, **single_leg** but **not** **agility**, **lateral_power**, or **single_leg_strength**. The main catalog’s `exercise_tag_map` was built from movement_pattern, modalities, muscles, energy, equipment — so **no rows** linked exercises to plyometric/agility/lateral_power/single_leg_strength. Result: COD selection in Manual mode was weak and often fell back to generic “legs”/“single_leg”/“balance” matches (e.g. static squats/lunges) instead of true COD exercises.

### 2. Sport sub-focus (sport mode)

- **Source:** `starter_exercises` (tags in jsonb). Sports like soccer, flag_football, lacrosse, hockey, basketball use sub-focus `change_of_direction` with tag map: agility, single_leg_strength, balance (and sport migrations append agility/plyometric/speed to specific starters).
- **Already tagged in starter_exercises:** lateral_lunge, banded_walk, box_jump, jump_squat, jump_lunge, lateral_bound, step_up, single_leg_rdl, reverse_lunge, bulgarian_split_squat (via various sport migrations). So sport mode COD was already better served than Manual mode.

### 3. Static fallback (`data/exercises.ts`)

- **Tagged with COD-relevant tags:** split_squat (single-leg, balance), box_jump (plyometric, explosive), jump_squat (plyometric, explosive), jump_lunge (plyometric, single-leg), lateral_bound (plyometric, lateral power). No exercise in the static list had **agility** or **single_leg_strength** explicitly.

---

## Exercises that should be tagged for COD

Aligned with `docs/research/goal-sub-goals-audit-2025.md` and sport sub-focus logic:

| Exercise slug           | Agility | Plyometric | Lateral power | Single-leg strength | Balance | Notes |
|-------------------------|---------|------------|---------------|----------------------|---------|-------|
| lateral_bound           | ✓       | ✓          | ✓             | ✓                    | ✓       | Core COD plyo |
| box_jump                | ✓       | ✓          | —             | —                    | —       | Vertical + reactive |
| jump_squat              | ✓       | ✓          | —             | —                    | —       | Triple extension |
| jump_lunge              | ✓       | ✓          | —             | ✓                    | ✓       | Single-leg plyo |
| lateral_lunge           | ✓       | —          | ✓             | ✓                    | ✓       | Lateral + single-leg |
| banded_walk             | ✓       | —          | ✓             | —                    | ✓       | Lateral/hip stability |
| stepup / step_up        | ✓       | —          | —             | ✓                    | ✓       | Step-up (slug: stepup in DB) |
| single_leg_rdl          | —       | —          | —             | ✓                    | ✓       | Single-leg stability |
| reverse_lunge           | ✓       | —          | —             | ✓                    | ✓       | Single-leg, decel |
| bulgarian_split_squat   | ✓       | —          | —             | ✓                    | ✓       | Single-leg strength |
| goblet_lateral_lunge   | ✓       | —          | ✓             | ✓                    | ✓       | Lateral lunge variant |
| single_leg_hop          | ✓       | ✓          | ✓             | ✓                    | ✓       | Reactive, single-leg |

---

## Enrichment applied

- **Migration `20250331000011_change_of_direction_exercise_tags.sql`:**
  1. Inserts **agility**, **lateral_power**, **single_leg_strength** into `public.exercise_tags` (if missing).
  2. Inserts `exercise_tag_map` rows linking the exercises above (and any other COD-relevant slugs present in `public.exercises`) to the appropriate tags so that:
     - Manual mode “Agility / Change of direction” surfaces lateral_bound, box_jump, jump_squat, jump_lunge, lateral_lunge, banded_walk, stepup, single_leg_rdl, reverse_lunge, bulgarian_split_squat, goblet_lateral_lunge, single_leg_hop.
     - Tag-based ranking (e.g. `buildPreferredSlugsFromSubFocus`) can score these exercises higher when agility_cod is selected.

---

## Future enrichment (not in this migration)

- Add or tag: **skater jump**, **ladder drills**, **shuffle-to-sprint**, **rotational jumps** if/when they exist in the exercise DB (see goal-sub-goals-audit-2025.md).
- Consider adding **crossover/curtsy lunge** and **lateral box step** to COD tagging in a follow-up.
