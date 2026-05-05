# Exercise Coverage Enrichment — May 2026

**Type:** Exercise DB Enrichment (sport_tags, goal_tags, attribute_tags)  
**Category:** Sport sub-focus coverage + goal direct tag coverage  
**PR:** see migration files `20260503120000_sport_subfocus_coverage_enrichment.sql` and `20260503130000_goal_coverage_endurance_recovery.sql`  
**Logic changes:** `data/goalSubFocus/strengthSubFocus.ts`, `data/goalSubFocus/conditioningSubFocus.ts`  
**Audit source:** `/Users/ellie/.cursor/projects/Users-ellie-todayfit/canvases/exercise-coverage-audit.canvas.tsx`

---

## Problem

The exercise coverage audit canvas identified several critical low-coverage areas:

| Category | Before | Root Cause |
|----------|--------|------------|
| Strength → Agility/COD | 0 exercises | `exerciseHasStrengthSubFocusSlug()` had no cases for `agility_cod`, `power_explosive`, `speed_sprint` |
| Strength → Power/Explosive | 0 exercises | Same logic gap |
| Strength → Speed/Sprint | 0 exercises | Same logic gap |
| Conditioning → Full Body / Lower / Upper | 0 exercises each | `exerciseHasSubFocusSlug()` only checked `attribute_tags` for overlay slugs |
| Conditioning → Sprint | 1 exercise | Too narrow tag set |
| Aerobic Base (all endurance sports) | 4 exercises | Zone2 exercises not tagged with sport_tags; `zone2_cardio`/`aerobic_base` attribute tags missing from main catalog |
| Volleyball → Shoulder Stability | 4 exercises | Face pull, YTW, band pull-apart not tagged `sport_volleyball` |
| Snowboarding/Surfing/Kitesurfing → Balance | 8 exercises each | Balance exercises missing sport tags |
| Alpine Skiing → Eccentric Control | 13 exercises | Nordic curl, pause squat, etc. not tagged `sport_alpine_skiing` |
| Endurance goal (direct tag) | 5 exercises | Zone2/cardio exercises lack `endurance` goal_tag |
| Recovery goal (direct tag) | 1 exercise | Mobility/stretch exercises lack `recovery` goal_tag |

---

## Evidence Summary

### Agility / COD / Power / Speed (Strength → Athletic Performance)

**Sources:**
1. **NSCA Transfer of Training for Agility (2024)** — Jump training (loaded jump squats, lateral bounds, horizontal jumps) provides the strongest transfer to COD performance. Traditional lower-body resistance alone is insufficient. Plyometric training combined with agility drills yields consistent improvements. [nsca.com/education/articles/kinetic-select/transfer-of-training-for-agility/]
2. **Springer Sport Sciences for Health (2024)** — Plyometric training (6–9 weeks, 2×/week, multi-plane bilateral + unilateral, 60–200 contacts) significantly improves COD speed in team sport athletes. [doi.org/10.1007/s11332-024-01230-8]
3. **NSCA Basics of Strength & Conditioning Manual (2024)** — Olympic lifts (clean, high pull), plyometrics, speed drills are the primary programming tools for power/speed development.

**Confidence:** High — multiple peer-reviewed sources, NSCA consensus.

**Implementation:** Extended `exerciseHasStrengthSubFocusSlug()` to infer `agility_cod` from `agility`/`lateral_power`/`single_leg_strength` attribute tags (already applied by COD migration) and plyometric stimulus + lower-body movement. Similarly for `power_explosive` (explosive_power/plyometric attrs or stimulus) and `speed_sprint` (speed/agility attrs or plyometric stimulus).

---

### Conditioning Overlay Matching (Upper / Lower / Core / Full Body)

**Root cause:** `exerciseHasSubFocusSlug()` only checked `attribute_tags` for overlay slugs. No exercises had `upper`, `lower`, `full_body` in their attribute_tags, so these returned 0.

**Fix:** Added `exerciseMatchesConditioningOverlay()` which mirrors the existing `filterPoolByOverlay()` logic (uses `primary_movement_family` + `muscle_groups` — the same signals already used for pool filtering). This makes session-intent annotation agree with what the generator already selects.

**Confidence:** High — the logic was already sound in `filterPoolByOverlay`; this is purely a consistency fix.

---

### Aerobic Base (Endurance Sports)

**Source:** ACSM (2023–2024 position stand), NSCA Essentials of Strength and Conditioning — Zone 2 steady-state cardio (rowing ergometer, stationary bike, treadmill, ski erg) is the canonical aerobic base training modality. These exercises build the aerobic engine that underlies all endurance sport performance.

**What was wrong:** Zone2 exercises (`zone2_bike`, `zone2_treadmill`, `zone2_rower`, `rower`, `ski_erg`, etc.) were in the main catalog but lacked:
1. `zone2_cardio`/`aerobic_base` attribute tags (searched by sport sub-focus tag map)
2. Sport-specific tags for swimming, XC skiing, backcountry skiing, road/trail running, triathlon, rucking, cycling

**Fix:** Added `zone2_cardio` and `aerobic_base` attribute tags, then cross-tagged zone2 exercises to their most relevant sports.

**Confidence:** High — direct evidence-based sport transfers.

---

### Shoulder Stability for Overhead Sports (Volleyball, Baseball, Lacrosse, Swimming, Rock Climbing)

**Sources:**
1. **MDPI Healthcare 2025 (RCT)** — 12-week program of Y/T/W raises, internal/external rotation, scapular punches (with bands or weights) prevents progressive rotator cuff imbalance in competitive swimmers. Twice-weekly is sufficient. [mdpi.com/2227-9032/13/5/538]
2. **Med Rehab 2024** — Corrective exercises (serratus anterior + trapezius strengthening via scapular stabilization protocol) improve scapulohumeral rhythm and functional stability in volleyball players with scapular dyskinesia.
3. **J Rehabilitation Sciences (2024)** — 8-week scapular stabilization exercise program reduces shoulder pain and improves scapular position in volleyball players.
4. **Am J Phys Med Rehab 2025** — Targeted scapular stabilization (type-specific to SD) outperforms conventional exercise for shoulder function and pain.

**Exercises added to overhead sport pools:** face_pull, band_pull_apart, ytw, prone_y_raise, external_rotation_band, scapular_pullup, reverse_fly, wall_slide, cuban_press.

**Confidence:** High — multiple RCTs, MDPI/NSCA consensus for overhead athlete shoulder prehab.

---

### Balance for Board Sports (Snowboarding, Surfing, Kitesurfing)

**Source:** NSCA (functional balance training literature 2024) — Single-leg stance exercises and lateral plyometrics improve proprioception and postural control, directly transferable to board sport balance demands.

**Exercises added:** single_leg_rdl, lateral_bound, skater_jump, single_leg_hop, cossack_squat, reverse_lunge, split_squat.

**Confidence:** Moderate-High — general balance training evidence is strong; sport-specific transfer is plausible given movement similarity.

---

### Eccentric Control for Alpine Skiing

**Source:** Sports science skiing literature (NSCA, Haaland et al.) — Eccentric quad strength is the primary physical quality for absorbing terrain forces during skiing descent. Nordic curl, pause squat, sissy squat, leg press with slow eccentric are the recommended exercises.

**Exercises added to alpine_skiing pool:** nordic_curl, sissy_squat, pause_squat, box_squat, leg_press, plus `eccentric_quad_strength` attribute tags.

**Confidence:** High — ski-specific eccentric training is well-established in sports medicine literature.

---

### Endurance Goal Direct Tag Coverage

**Source:** ACSM (2023–2024 position stand on aerobic exercise programming).

**What was wrong:** The adapter sets `endurance` goal_tag only when an exercise has `endurance` in its raw `exercise_tags`. Zone2 and cardio exercises had `conditioning` modality (which infers `conditioning` goal_tag) but not `endurance` tag. The `exerciseMatchesDeclaredGoal()` for `endurance` also has an inference path (via `conditioning` modality OR `aerobic_zone2` stimulus), but direct tag coverage was only 5 exercises.

**Fix:** Added `endurance` goal_tag to 18 aerobic/conditioning exercises.

---

### Recovery Goal Direct Tag Coverage

**Source:** NSCA Essentials of Strength and Conditioning — Recovery sessions use low-load movement: static stretching, foam rolling, breathing exercises, gentle mobility drills.

**What was wrong:** Only 1 exercise had `recovery` goal_tag directly. Most mobility/stretch exercises had `mobility` modality but not `recovery` goal_tag.

**Fix:** Added `recovery` goal_tag to ~40 mobility/stretch/foam roll exercises. Updated modalities for recovery exercises to include `recovery` modality.

---

## Implementation

### Logic changes (TypeScript)

| File | Change |
|------|--------|
| `data/goalSubFocus/strengthSubFocus.ts` | Added `stimulus` to `ExerciseForStrengthSubFocus` type; added inference cases for `agility_cod`, `power_explosive`, `speed_sprint` |
| `data/goalSubFocus/conditioningSubFocus.ts` | Added `exerciseMatchesConditioningOverlay()` to handle `upper`/`lower`/`core`/`full_body` overlay slug matching via movement family + muscle groups |

### DB migrations (SQL)

| Migration | Purpose |
|-----------|---------|
| `20260503120000_sport_subfocus_coverage_enrichment.sql` | Add `zone2_cardio`/`aerobic_base` tags, sport tags for aerobic base; shoulder stability sport tags; balance sport tags; eccentric/skiing tags; paddle/climbing tags |
| `20260503130000_goal_coverage_endurance_recovery.sql` | Add `endurance` and `recovery` goal_tags to appropriate exercises; update modalities |

---

## Risks and Rollback

- **Broadening risk (minor):** Adding sport tags to exercises may slightly broaden the pool for some sports. This is intentional — the sub-focus tag map scores these exercises more highly for their specific quality, so pool quality improves.
- **Goal tag broadening:** Adding `endurance` to cardio exercises is additive and correct. Adding `recovery` to 40 mobility exercises may cause some of those to appear in Recovery goal sessions; this is desired behavior.
- **No schema changes:** All changes use existing `exercise_tag_map` rows and `exercise_tags` slugs.
- **Rollback:** `DELETE FROM exercise_tag_map WHERE exercise_id IN (...) AND tag_id IN (...)` per migration.

---

## Expected Coverage After Enrichment

| Area | Before | Expected After |
|------|--------|----------------|
| Strength → Agility/COD | 0 | ~50–100 (plyometric + lateral exercises) |
| Strength → Power/Explosive | 0 | ~150–300 (power modality + plyometric + explosive_power tagged) |
| Strength → Speed/Sprint | 0 | ~100–200 (plyometric + speed tagged) |
| Conditioning → Full Body | 0 | ~200+ (any exercise with both upper + lower muscles) |
| Conditioning → Lower | 0 | ~500+ (lower body family / leg muscles) |
| Conditioning → Upper | 0 | ~400+ (upper push/pull family) |
| Aerobic Base (per sport) | 4 | ~8–20 per sport |
| Volleyball → Shoulder Stability | 4 | ~20–30 |
| Snowboarding/Surfing → Balance | 8 | ~20–30 each |
| Alpine Skiing → Eccentric Control | 13 | ~25–35 |
| Endurance goal (direct) | 5 | ~20 |
| Recovery goal (direct) | 1 | ~40 |
