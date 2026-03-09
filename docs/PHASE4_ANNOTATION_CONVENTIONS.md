# Phase 4: Annotation Conventions and Decision Rules

Used when annotating exercises with ontology fields. Keeps classifications consistent across the representative subset and future library expansion.

## 1. Movement family

- **primary_movement_family**: Single value. User-facing body/emphasis. Use for strict body-part filter.
- **secondary_movement_families**: Only when the exercise clearly contributes to another family (e.g. thruster = lower_body + upper_push).

**Rules:**
- Incline press → `upper_push` (chest/shoulder emphasis; not a separate family).
- Flat vs incline vs decline: all `upper_push`; distinguish with movement_patterns (horizontal_push) and muscles.
- Split squat / Bulgarian split squat / lunges → `lower_body` only; no secondary. Unilateral is captured by `unilateral = true` and pattern `lunge`.
- Carries: Farmer/suitcase → `core` primary, `lower_body` secondary (loaded carry). Waiter → `core` + upper push emphasis; primary = `core`.

## 2. Movement patterns (engine-facing)

- **movement_patterns**: Array. Finer than legacy single movement_pattern. First element drives legacy derivation.

**Rules:**
- Horizontal pressing (bench, push-up, incline press, dip) → `horizontal_push`.
- Vertical pressing (OHP, pike push-up, lateral raise) → `vertical_push`.
- Rows, chest-supported row, face pull, reverse fly → `horizontal_pull`.
- Pull-up, lat pulldown, chin-up → `vertical_pull`.
- Split squat, Bulgarian split squat, step-up, walking lunge, lateral lunge → `lunge` (and optionally `locomotion` for walking lunge).
- Squat, leg press, goblet squat, front/back squat → `squat`.
- RDL, deadlift, hip thrust, good morning, leg curl → `hinge`.
- Band pull-apart, YTW, wall slide → `shoulder_stability`.
- Cat-camel, T-spine rotation, thread the needle → `thoracic_mobility`.
- Plank, dead bug, pallof, side plank, hollow hold → `anti_rotation` (anti-rotation / anti-extension).
- Ab wheel, rollout → `horizontal_push` (arm motion) with lumbar_flexion_load.
- Russian twist → `rotation`.
- Carries → `carry`.

## 3. Joint stress vs contraindication

- **joint_stress_tags**: Biomechanical loads the movement creates (what gets loaded). Use canonical slugs from vocabularies.
- **contraindication_tags**: Body regions to avoid when injured (user-facing). Use sparingly; prefer mapping from joint_stress.

**Rules:**
- If an exercise loads a structure (e.g. knee flexion), add the corresponding joint_stress tag. Add the matching contraindication (e.g. `knee`) when that body region is commonly problematic for that movement.
- Don’t over-tag: e.g. not every hinge needs `lower_back` if load is light and form-dependent; RDL, deadlift, good morning do.
- Chest-supported row: no lumbar_shear (supported); no lower_back contraindication. Bent-over row / cable row: lumbar_shear + lower_back.
- Use **joint_stress** for “this movement exposes X”; use **contraindication** when we’d typically exclude for “avoid when X is injured/irritated.”

## 4. Exercise role

- **exercise_role**: Where the exercise is typically used in a session (warmup, prep, main_compound, accessory, isolation, finisher, cooldown, mobility, conditioning).

**Rules:**
- **prep**: Activation / light work before main (e.g. glute bridge, band pull-apart).
- **mobility**: ROM / control drills (cat-camel, CARs, T-spine rotation).
- **cooldown**: Static stretch, breathing, gentle mobility at end of session. If a drill is used in both mobility block and cooldown, pick the more common (e.g. cat-camel → cooldown).
- **main_compound**: Primary multi-joint lift (squat, deadlift, bench, OHP, pull-up, row as primary).
- **accessory**: Secondary compound or support (RDL, split squat, face pull, chest-supported row).
- **isolation**: Single-joint (leg curl, lateral raise, curl, tricep pushdown).

## 5. Pairing category

- **pairing_category**: Primary fatigue/region for superset logic. Single value.

**Rules:**
- Bench, push-up, fly → `chest`. OHP, lateral raise → `shoulders`. Dips, tricep extension → `triceps`.
- Rows, pulldown, pull-up → `back`. Curl → `biceps`.
- Squat, leg press, lunge → `quads`. RDL, hip thrust, leg curl → `posterior_chain`.
- Deadlift: use `grip` when grip is the limiting factor for pairing; otherwise `posterior_chain`.
- Carries: Farmer/suitcase → `grip` or `core` (we use `grip` for farmer, `core` for suitcase).
- Mobility/prep drills → `mobility`.

## 6. Mobility vs stretch targets

- **mobility_targets**: Areas addressed for mobility (ROM, control, dynamic).
- **stretch_targets**: Areas stretched (static or dynamic stretch).

**Rules:**
- Same drill can have both (e.g. world’s greatest stretch: mobility_targets and stretch_targets for hip flexors, hamstrings, T-spine).
- Use for cooldown/prep selection; don’t tag every exercise, only those used for mobility or stretch.

## 7. Unilateral

- **unilateral**: true if the movement is single-limb or asymmetric (split squat, single-arm row, suitcase carry, single-leg RDL).

## 8. Fatigue regions

- **fatigue_regions**: Regions that get fatigued (from vocabularies: quads, glutes, hamstrings, pecs, triceps, shoulders, lats, biceps, forearms, core, calves).

**Rules:**
- Use for superset distribution. Don’t list every possible muscle; list the main regions that limit performance or recovery.

## 9. Primary / secondary muscles

- Keep **primary_muscles** and **secondary_muscles** consistent with the ontology. Prefer canonical slugs (chest, back, lats, shoulders, triceps, biceps, quads, glutes, hamstrings, core, etc.).
- Seed data sometimes uses "push"/"pull"; when annotating the same row, consider normalizing to canonical muscles (e.g. bench → chest, triceps, shoulders). Phase 4 did not change muscle columns; that can be a follow-up.

## 10. Ambiguities resolved

| Topic | Decision |
|-------|----------|
| Incline vs flat press | Both upper_push, horizontal_push. Differentiate by name/slug and muscles. |
| Split squat family | lower_body only; pattern = lunge; unilateral = true. No secondary movement_family. |
| Carries | Farmer/suitcase: core primary, lower_body secondary, pairing_category core or grip. |
| Activation vs mobility vs cooldown | prep = activation; mobility = ROM drill; cooldown = end-of-session stretch/breathing. One primary role per exercise. |
| Chest-supported row | horizontal_pull; no lumbar_shear; no lower_back contraindication. |
| Joint_stress vs contraindication | joint_stress = what’s loaded; contraindication = body region to avoid when injured. Both set when movement is commonly problematic for that region. |

## 11. Representative subset (Phase 4)

- **Lower body squat**: goblet_squat, barbell_back_squat, front_squat, leg_press_machine, split_squat, bulgarian_split_squat, stepup, hack_squat, leg_extension, wall_sit, cossack_squat, lateral_lunge, goblet_lateral_lunge.
- **Lower body hinge**: rdl_dumbbell, barbell_rdl, barbell_deadlift, hip_thrust, glute_bridge, good_morning, single_leg_rdl, back_extension, leg_curl, trap_bar_deadlift, kb_swing.
- **Lower body locomotion**: walking_lunge.
- **Upper push**: bench_press_barbell, db_bench, oh_press, push_up, dips, incline_db_press, db_shoulder_press, lateral_raise, tricep_pushdown, close_grip_bench, skull_crusher, chest_press_machine, pike_push_up, seated_ohp.
- **Upper pull**: pullup, lat_pulldown, db_row, cable_row, barbell_row, chinup, face_pull, band_pullapart, reverse_fly, barbell_curl, chest_supported_row, ytw.
- **Core**: plank, dead_bug, pallof_hold, ab_wheel, hanging_leg_raise, russian_twist, side_plank, bird_dog, pallof_press, hollow_hold, farmer_carry, suitcase_carry.
- **Mobility/cooldown**: cat_camel, t_spine_rotation, worlds_greatest_stretch, hip_90_90, inchworm, frog_stretch, thread_the_needle, quadruped_rockback, wall_slide, breathing_diaphragmatic.
- **Conditioning**: zone2_bike, rower.
- **Hybrid**: thruster.

Total: 62 exercises.

---

## 12. Verification

- **Adapter**: `mapDbExerciseToGeneratorExercise` uses ontology columns when present; legacy `movement_pattern` is derived from `movement_patterns` via `getLegacyMovementPattern`; `tags.joint_stress` and `tags.contraindications` are filled from `joint_stress_tags` / `contraindication_tags` via merge helpers. Non-annotated rows still use legacy movement_pattern and tag/contraindication tables.
- **Run**: `npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/verify-phase4-adapter.ts` to sanity-check the adapter (no DB required).

---

## 13. Ontology gaps / awkward values (Phase 4 notes)

- **wrist**: INJURY_AVOID_TAGS used `wrist_stress`; vocabularies use `wrist_extension_load`. Added `wrist_extension_load` to wrist injury rule so canonical slug is excluded.
- **Pairing category**: "upper_back" is not in PAIRING_CATEGORIES; used `back` for rows and `shoulders` for face pull / rear-delt work.
- **Fatigue regions**: Vocabulary has no "legs"; use quads, glutes, hamstrings, calves. Rower annotated as quads, hamstrings, core.

## 14. Data quality (current library)

- Some seed rows use **primary_muscles** `push` / `pull` instead of canonical muscle slugs (chest, lats, etc.). Phase 4 did not change muscle columns; normalization can be a follow-up.
- **exercise_contraindications** table and ontology **contraindication_tags** can both exist; adapter prefers ontology when present. Migration only sets ontology columns; existing contra table rows remain for non-annotated exercises.

## 15. Ontology sufficiency for generator refactor

- **Movement family + patterns**: Sufficient for strict body-part focus and pattern balance.
- **Joint stress + contraindications**: Sufficient for injury-based exclusion when constraints resolve to excluded_joint_stress_tags and contraindication_keys.
- **Exercise role / pairing category / fatigue regions**: Sufficient for block-type filters and superset pairing rules in the next phase.
- **Mobility/stretch targets**: Sufficient for cooldown selection when secondary goal is mobility.
- No schema changes needed for Phase 5 (generator refactor); only generator logic should start using these fields when present, with fallback to derivation/tags for unannotated exercises.
