# Exercise tag-based search (V1)

## Schema (existing + extensions)

- **exercises** – `id`, `slug`, `name`, `primary_muscles`, `secondary_muscles`, `equipment`, `modalities`, `movement_pattern`, `is_active`, etc.
- **exercise_tags** – `id`, `slug`, `name`, `tag_group`, `sort_order`, **`weight`** (real, default 1.0). Tag groups: `movement_pattern`, `modality`, `muscle`, `equipment`, `energy`, `joint_stress`, `contraindication`, `sport`, `general`.
- **exercise_tag_map** – `(exercise_id, tag_id)` many-to-many.
- **exercise_contraindications** – `(exercise_id, contraindication, joint)`.

Indexes on `exercises(slug, is_active)`, `exercise_tags(slug, tag_group)`, `exercise_tag_map(exercise_id, tag_id)` support the ranked RPC.

## RPC: `get_exercises_by_tags_ranked`

| Parameter | Type | Description |
|-----------|------|--------------|
| `selected_tag_slugs` | text[] | Tags to match; more matches = higher score. Weights apply when set on `exercise_tags.weight`. |
| `excluded_tag_slugs` | text[] | Hard exclude: exercises with any of these tags are removed. |
| `user_energy` | text | `'low'` \| `'medium'` \| `'high'`. |
| `energy_is_hard_filter` | boolean | **Default false**: energy only adjusts score (soft). **True**: exclude exercises that don’t have the matching `energy_*` tag. |
| `result_limit` | int | Default 50. |
| `result_offset` | int | Default 0. |

Ranking: weighted sum of selected-tag matches, then energy soft bonus/penalty (when not hard filter), then `matched_tag_count` tie-breaker.

## App call (Supabase client)

```ts
import { getExercisesByTagsRanked } from "../lib/db/exerciseRepository";

// Example: Build flow – user picked tags and energy
const results = await getExercisesByTagsRanked({
  selectedTagSlugs: ["squat", "strength", "legs", "equipment_barbell"],
  excludedTagSlugs: ["contra_knee"],
  userEnergy: "medium",
  energyIsHardFilter: false,
  limit: 30,
  offset: 0,
});

// results are sorted by match_score desc, then matched_tag_count desc
results.forEach((ex) => {
  console.log(ex.name, ex.match_score, ex.matched_tag_count);
});
```

## Recommended UI → params

| UI | Parameter |
|----|-----------|
| Selected “focus” tags (e.g. movement, goal, muscle) | `selectedTagSlugs` |
| “Exclude” / injury / avoid tags | `excludedTagSlugs` |
| Energy level (Low / Medium / High) | `userEnergy` |
| “Strict energy” checkbox (only show exercises that match my energy) | `energyIsHardFilter: true` when checked |
| Pagination | `limit`, `offset` |

Keep **energy as soft** by default so users still see options when energy is “low” or “high”; use **hard filter** only when the user explicitly asks for “only low-energy exercises” or similar.
