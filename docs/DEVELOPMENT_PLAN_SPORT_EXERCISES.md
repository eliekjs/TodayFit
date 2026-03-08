# Development Plan: Sport Prep, Sub-Focus & Exercise Library

A phased plan to keep developing research-backed sport support: more tags, more exercises, and a stronger sub-sport / sub-goal layer.

---

## Current state (summary)

| Layer | What exists |
|-------|-------------|
| **Sports** | Canonical list in DB (`sports`); sport_quality_map (4 qualities, no transfer); sport_tag_profile (tag vectors per sport). |
| **Exercise → sport** | `exercise_tag_map` links `public.exercises` to `sport_<slug>` tags (research-backed migration). |
| **Sub-focus** | TypeScript: `SPORTS_WITH_SUB_FOCUSES` (many sports, 3–6 sub-focuses each) and `SUB_FOCUS_TAG_MAP` (sub-focus → exercise tag slugs + weights). DB: `sports_sub_focus` and `sub_focus_tag_map` seeded for 3 sports only. |
| **Sub-focus ranking** | `getPreferredExerciseNamesForSportAndGoals()` uses `starter_exercises.tags` (jsonb) and matches against tag slugs from `getExerciseTagsForSubFocuses()`. |
| **Gap** | Sub-focus tag slugs (e.g. `zone2_cardio`, `single_leg_strength`, `finger_strength`) live in TS; many are not in `public.exercise_tags` or in `starter_exercises.tags`, so sub-focus biasing only works where tags overlap. |

---

## Phase 1: Make sub-focus tags real and wired (high impact)

**Goal:** Sub-focus selection actually changes exercise ranking.

1. **Add missing sub-focus tags to `public.exercise_tags`**
   - Use `data/sportSubFocus/exerciseTagTaxonomy.ts` → `NEW_TAGS_TO_ADD` (and any other slugs referenced in `SUB_FOCUS_TAG_MAP` that aren’t in the DB).
   - Add a migration that inserts these into `exercise_tags` with a sensible `tag_group` (e.g. `general`, `energy_system`, `joint_stability`).
   - Ensures one source of truth; later you can also tag `public.exercises` with these for non–starter-exercise flows.

2. **Enrich `starter_exercises.tags` with sub-focus tag slugs**
   - For each starter exercise, add every sub-focus tag slug that meaningfully applies (e.g. `treadmill_incline_walk` → add `zone2_cardio`, `aerobic_base`; `step_up` → add `single_leg_strength`, `glute_strength`; `scapular_pullup` / `face_pull` → add `shoulder_stability`, `scapular_control`).
   - Do this in a migration (UPDATE … SET tags = tags || new_tags::jsonb) or via a script that updates seed/migration.
   - Sub-focus ranking in `getPreferredExerciseNamesForSportAndGoals` will then score these exercises when the user picks e.g. “Uphill Endurance” or “Finger Strength”.

3. **Optional: sync sub-focus from TypeScript to DB**
   - Either a migration that seeds `sports_sub_focus` and `sub_focus_tag_map` from the same data as `SPORTS_WITH_SUB_FOCUSES` and `SUB_FOCUS_TAG_MAP`, or a small script that runs on deploy.
   - Lets server/RPC use sub-focus without importing TS (e.g. for an API or future mobile app).

**Outcome:** Picking “Finger Strength” for climbing or “Uphill Endurance” for backcountry skiing meaningfully boosts the right exercises.

---

## Phase 2: More sub-focus coverage (more sports, more sub-goals)

**Goal:** Every major sport has sub-focuses and tag mappings; optional “sub-goals” for goals.

1. **Align sports in `SPORTS_WITH_SUB_FOCUSES` with canonical `sports`**
   - Ensure every slug in `SPORTS_WITH_SUB_FOCUSES` exists in `public.sports` (e.g. map `marathon_running` → `road_running` or add a marathon-specific sport if you want it).
   - Add any canonical sports that don’t yet have sub-focuses (e.g. rugby, volleyball_indoor/beach, swimming_open_water, BJJ, boxing, lacrosse, golf, american_football).

2. **Define sub-focuses and tag maps for new sports**
   - For each new sport, add 3–5 sub-focuses (e.g. rugby: strength, work capacity, tackle resilience, speed; swimming: pull strength, core, shoulder health, kick).
   - Extend `SUB_FOCUS_TAG_MAP` (and DB if synced) with (sport, sub_focus) → tag slugs + weights.
   - Reuse tags from `exerciseTagTaxonomy` / `NEW_TAGS_TO_ADD` where possible; add new tags only when needed.

3. **Optional: sub-goals under `goals`**
   - If you want “sub-goals” (e.g. under goal “climbing”: “finger strength”, “endurance”), either:
     - Add a `parent_goal_id` (or `goal_slug`) to a new `goal_sub_focus` table and map sub-goals to the same tag slugs you use for sport sub-focus, or
     - Reuse the same sub-focus UX for “sport goals” by treating the goal’s sport as the sport and the selected “focus” as sub-focus (no schema change).

**Outcome:** Users can pick not only a sport but what they want to get better at within that sport (and optionally within a goal).

---

## Phase 3: More exercises and tags (library depth)

**Goal:** Richer exercise library and more precise tagging for both sport and sub-focus.

1. **Add exercises that sub-focus and sport tags demand**
   - Examples: fingerboard/hangboard (finger_strength), more zone-2 / aerobic options (rower steady, bike steady, incline walk already exist; add names to starter_exercises if needed), more rotation/anti-rotation (e.g. rotational med ball), lock-off style pulls if not present.
   - Add to `public.exercises` (and optionally to `starter_exercises` with tags) so both the main generator and sport-prep flows can use them.

2. **Tag new and existing exercises with sub-focus tags**
   - For `public.exercises`: add `exercise_tag_map` rows for the new tags from Phase 1 (e.g. `zone2_cardio`, `single_leg_strength`, `core_anti_rotation`).
   - For `starter_exercises`: keep extending `tags` so sub-focus and sport_tag_profile overlaps are accurate.

3. **Add any new tags that keep coming up**
   - As you add sports/sub-focuses, you may need tags like `lactate_threshold`, `reactive_power`, `eccentric_quad_strength` in the DB and on exercises; add them in small migrations so the taxonomy and DB stay in sync.

**Outcome:** No “obvious” exercise missing for a given sport or sub-focus; exercises are findable by both sport and sub-focus tags.

---

## Phase 4: Quality and consistency (maintenance)

**Goal:** One taxonomy, no drift, easy to extend.

1. **Single source of truth for “tag slug”**
   - Prefer `public.exercise_tags.slug` as canonical. TypeScript `SPORT_SUBFOCUS_EXERCISE_TAGS` / `NEW_TAGS_TO_ADD` should either be generated from the DB or updated whenever you add tags in a migration.
   - Document that sub-focus tag slugs in `SUB_FOCUS_TAG_MAP` must exist in `exercise_tags` (and in `starter_exercises.tags` or `exercise_tag_map` where you want matching).

2. **Starter vs main library**
   - Decide long term: do you want one pool (`public.exercises`) for everything and retire `starter_exercises`, or keep both and sync “sport-prep preferred” exercises by name/slug? If both, keep starter_exercises.tags and exercise_tag_map in sync for shared tag slugs so sport and sub-focus logic behave consistently.

3. **Research-backed updates**
   - When you add a new sport or sub-focus, do a quick pass (or use the same research approach as before) to assign qualities and exercise→sport tags; update `sport_quality_map`, `sport_tag_profile`, and `exercise_tag_map` in one migration.

**Outcome:** New sports/sub-focuses are addable without tech debt; tag and exercise data stay consistent.

---

## Suggested order (next steps)

1. **Phase 1.1** – Migration: insert `NEW_TAGS_TO_ADD` (and any other SUB_FOCUS_TAG_MAP slugs) into `public.exercise_tags`.
2. **Phase 1.2** – Enrich `starter_exercises.tags` with those slugs for relevant rows (e.g. zone2/aerobic for cardio starters, single_leg/glute for step-up/lunge/RDL, shoulder/scapular for climbing prehab).
3. **Phase 2.1** – Add 1–2 more sports to `SPORTS_WITH_SUB_FOCUSES` and `SUB_FOCUS_TAG_MAP` (e.g. swimming_open_water, rugby), then test sub-focus ranking.
4. **Phase 3** – Add 2–3 high-value exercises (e.g. fingerboard, extra rotation/anti-rotation) and tag them for sport + sub-focus.
5. **Phase 4** – Document “adding a new sport/sub-focus” and optionally sync TS → DB for sub-focus.

---

## Files to touch (reference)

| Area | Files |
|------|--------|
| Sub-focus data | `data/sportSubFocus/sportsWithSubFocuses.ts`, `subFocusTagMap.ts`, `exerciseTagTaxonomy.ts`, `index.ts` |
| Sub-focus types | `data/sportSubFocus/types.ts` |
| Ranking | `lib/db/starterExerciseRepository.ts` (getPreferredExerciseNamesForSportAndGoals) |
| Planner | `services/sportPrepPlanner/index.ts` (sportSubFocusSlugs) |
| DB | Migrations: `exercise_tags`, `exercise_tag_map`, `sports_sub_focus`, `sub_focus_tag_map`, `starter_exercises` (tags jsonb) |
| Sport tags / profiles | `supabase/migrations/20250301000008_sports_tags_and_starter_exercises.sql`, `20250310100000_research_backed_sport_exercises.sql` |

This plan keeps development focused on sub-sport goals (sub-focus), more tags and exercises, and a clear path to add new sports and sub-goals without duplicating logic.
