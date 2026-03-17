# Evidence review: Vertical jump / dunk training – per-sport exercise selection

**Date:** 2025-03-16  
**Subsystem:** Per-sport logic for exercise selection (vertical jump / dunk training goal and sub-focuses)  
**Agent run:** workout-logic-research-integration-agent

---

## 1. Research question

What exercises and training modalities best support vertical jump and dunk performance, and how should the app select exercises when the user chooses “Vertical Jump / Dunk training” as a sport?

---

## 2. Sources

| Source | Type (Tier) | Link / DOI | Key claim(s) |
|--------|-------------|------------|-------------|
| Plyometric Jump Training Optimization (MDPI Sports) | Systematic scoping review | https://www.mdpi.com/journal/sports | PJT is evidence-based for vertical jump; exercise types and parameters matter. |
| Combined resistance + plyometric training on vertical jump (PMC) | Systematic review & network meta-analysis | PMC12903741 | Combined RT + plyometric improves CMJ; complex training (RT + plyos) shows largest improvements. |
| Plyometric training and vertical jump height (BJSM) | Meta-analytical review | bjsm.bmj.com/content/41/6/349 | Plyometric training improves vertical jump height. |
| Diverse resistance training modalities (Frontiers) | Network meta-analysis | frontiersin.org/articles/10.3389/fphys.2024.1302610 | Squat jumps: complex training (high-intensity intervals + plyometrics) highly effective; standing long jump: weightlifting training effective. |
| Dunk / vertical jump exercise lists (practitioner) | Practitioner / A1 Athlete | a1athlete.com, dunkcalculator.ca | Key exercises: back/front/box squats, deadlifts, trap bar deadlift, Bulgarian split squats, calf raises, jump squats, box jumps, depth jumps, power cleans. |

---

## 3. Classification of findings

### High-confidence rules (implemented)

- **Combined resistance + plyometric training** improves vertical jump more than either alone.  
  Source: systematic reviews / network meta-analyses (e.g. PMC12903741).  
  Implemented: session intent for sport `vertical_jump` uses focus “Power & Explosiveness” and “Sport Conditioning” and body bias “Lower” so selection includes both strength (squat/hinge) and power/plyometric exercises.

- **Plyometric and explosive lower-body exercises** (jump squats, box jumps, reactive/landing work) are central to vertical jump improvement.  
  Source: meta-analyses and practitioner consensus.  
  Implemented: `SUB_FOCUS_TAG_MAP` for `vertical_jump:vertical_jump` and `vertical_jump:reactive_landing` emphasizes `explosive_power`, `plyometric`, `power`, `reactive_power`; starter_exercises and migration add/update tags so box jump, jump squat, jump lunge, back squat, Bulgarian split squat, calf raise, trap bar deadlift rank highly.

- **Strength foundation** (squat, hinge, single-leg) supports jump performance.  
  Source: reviews and practitioner guidance.  
  Implemented: `vertical_jump:strength_foundation` sub-focus maps to `squat_pattern`, `hinge_pattern`, `max_strength`, `posterior_chain`, `single_leg_strength`; existing strength exercises get these tags where appropriate.

### Context-dependent heuristics (implemented)

- **Default sub-focus when sport is vertical_jump and user selects no sub-focus:** treat as “explosive jump & plyometrics” so tag-based ranking still runs.  
  Implemented: `getPreferredExerciseNamesForSportAndGoals` in `lib/db/starterExerciseRepository.ts` defaults `subSlugs = ["vertical_jump"]` when `primarySlug === "vertical_jump"` and no sub-focus is provided.

- **Standalone sport “vertical_jump”** (Vertical Jump / Dunk) gets its own sub-focus options and tag map so it is not dependent on basketball.  
  Implemented: `SPORTS_WITH_SUB_FOCUSES` includes `vertical_jump` with sub-focuses “Explosive jump & plyometrics”, “Strength foundation”, “Reactive & landing”; `SUB_FOCUS_TAG_MAP` has entries for `vertical_jump:*`.

### Speculative / deferred

- Depth jumps and exact plyometric progressions (box height, volume) for programming.  
  Reason deferred: implementation scope limited to selection and tagging; prescription (sets/reps/rest for plyos) can be revisited in a prescription-focused run.

- Sport-specific periodization (e.g. in-season vs off-season for vertical_jump).  
  Reason deferred: current scope is exercise selection only; time horizon is already in adaptive setup.

---

## 4. Comparison to previous implementation

- **Before:** User selecting “Vertical Jump / Dunk training” could receive a generic full-body strength workout because (1) the standalone sport `vertical_jump` was not in `SPORTS_WITH_SUB_FOCUSES`, so no sub-focus tag map was used; (2) session intent used generic “Improve Endurance” / “Sport Conditioning” with no lower-body or power bias; (3) starter_exercises lacked plyometric/explosive tags for key exercises, so sport-based ranking did not surface jump squats, box jumps, etc. first.

- **Evidence suggests:** Prioritize lower-body power and plyometrics, with a strength base (squat, hinge, single-leg, calves); combine resistance and plyometric stimuli.

- **Gap closed:** (1) Added `vertical_jump` to `SPORTS_WITH_SUB_FOCUSES` and `SUB_FOCUS_TAG_MAP` with sub-focuses and tag weights. (2) Default sub-focus for `vertical_jump` when none selected so tag ranking always runs. (3) Session intent for `vertical_jump` uses Power & Explosiveness focus and Lower body bias. (4) Migration adds/updates starter_exercises (box jump, jump squat, jump lunge, barbell back squat) and appends tags (explosive_power, plyometric, power, squat_pattern, etc.) to existing rows so they rank highly for vertical_jump.

---

## 5. Metadata / ontology impact

- **Sport sub-focus:** `vertical_jump` sport in `SPORTS_WITH_SUB_FOCUSES` with sub_focuses `vertical_jump`, `strength_foundation`, `reactive_landing`.
- **Tag map:** `SUB_FOCUS_TAG_MAP` keys `vertical_jump:vertical_jump`, `vertical_jump:strength_foundation`, `vertical_jump:reactive_landing` with slugs: `explosive_power`, `plyometric`, `power`, `reactive_power`, `squat_pattern`, `hinge_pattern`, `single_leg_strength`, `knee_stability`, `max_strength`, `posterior_chain`, `eccentric_strength`.
- **Starter_exercises:** New rows for box_jump, jump_squat, jump_lunge, barbell_back_squat when missing; existing rows (back_squat, bulgarian_split_squat, trap_bar_deadlift, romanian_deadlift, standing_calf_raise) get vertical-jump tags appended via migration `20250316100002_vertical_jump_starter_exercises_tags.sql`.
- **Session intent:** `sessionIntentForSport` in `services/sportPrepPlanner/index.ts` uses Power & Explosiveness focus and Lower body bias when `sportSlug === "vertical_jump"`.
- **Selection flow:** `getPreferredExerciseNamesForSportAndGoals` (starterExerciseRepository) uses `getExerciseTagsForSubFocuses` with default `["vertical_jump"]` for sport vertical_jump when no sub-focus selected; generator gives +10 score bonus to preferred exercise names/slugs.

---

## 6. Open questions / follow-ups

- Add depth jump (or depth-drop) to exercise library and tag for reactive_landing when appropriate.
- Consider power clean / squat clean in starter_exercises with vertical_jump tags if not already linked.
- Revisit prescription (reps/sets/rest) for plyometric blocks when power/sport-prescription subsystem is in scope.
