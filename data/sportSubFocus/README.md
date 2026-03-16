# Sports Sub-Focus Framework

This folder defines **sport sub-focuses** and their **mapping to exercise tags** for the Sports Prep engine. The weekly training generator can use this to bias exercise selection toward tags that match the user’s chosen sport and sub-focuses.

Sub-focus options and tag mappings are intended to reflect **research-backed priorities for progression** in each sport (e.g. finger strength and pull strength for climbing; uphill endurance and leg strength for backcountry skiing). When in doubt, prefer evidence-based training literature and sport-specific periodization norms. **Evidence and audit:** See `docs/research/sport-sub-goals-audit-2025.md` (NSCA, ACSM, ExRx, NCSF; sub-goal design and tag mapping).

## Structure

- **Sport** → has 3–6 **Sub-focuses** (e.g. “Finger Strength”, “Uphill Endurance”).
- **Sub-focus** → maps to **exercise tags** (with optional weight for scoring).

## Files

| File | Purpose |
|------|--------|
| `types.ts` | Types: `SportSubFocus`, `SportWithSubFocuses`, `SubFocusTagMap`, `ExerciseTagTaxonomyEntry`. |
| `sportsWithSubFocuses.ts` | Full list of sports and their sub-focus options (slug, name, priority). |
| `subFocusTagMap.ts` | Mapping key `sport_slug:sub_focus_slug` → `{ tag_slug, weight }[]`. |
| `exerciseTagTaxonomy.ts` | Expanded tag taxonomy and list of **new tags to add** to `exercise_tags`. |
| `index.ts` | Exports + `getExerciseTagsForSubFocuses(sportSlug, subFocusSlugs)`. |

## Usage (future scoring engine)

```ts
import { getExerciseTagsForSubFocuses } from "../data/sportSubFocus";

const tags = getExerciseTagsForSubFocuses("rock_sport_lead", ["finger_strength", "pull_strength"]);
// → [{ tag_slug: "finger_strength", weight: 1.3 }, { tag_slug: "pulling_strength", weight: 1.2 }, ...]
```

Use `tags` to increase the probability (or score) of exercises that have matching tags in `exercise_tag_map`.

## Sport slugs

Slugs align with `public.sports` (migration `20250301000007_sports_canonical_seed.sql`) where possible. Exceptions:

- **marathon_running** – may be added to `sports` or mapped to `road_running`.
- **powerbuilding** – may be added or mapped to `general_strength`.

## New exercise tags

See `exerciseTagTaxonomy.ts` and `NEW_TAGS_TO_ADD`. Add these to `public.exercise_tags` (and tag exercises accordingly) so the generator can match them. Examples: `zone2_cardio`, `finger_strength`, `grip_endurance`, `work_capacity`, `core_bracing`, `knee_stability`, `ankle_stability`, `sled_strength`, etc.
