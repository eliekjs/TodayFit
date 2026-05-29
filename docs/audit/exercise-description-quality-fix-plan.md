# Exercise description quality fix plan

**Date:** 2026-05-28 (updated 2026-05-28)  
**Related audit:** `docs/audit/setup-description-fallback-audit.md`

## Batch status

| Batch | Slugs | Status |
|-------|-------|--------|
| **P0** Ankle pack | ankle_dorsiflexion_stretch, ankle_circles, banded_ankle_mob | **Complete** |
| **P1** Remaining mobility | 12 slugs (see below) | **Complete** |
| **P2 chunk 1** generic/low-quality cleanup | 59 slugs (see below) | **Complete** |
| **P2** remaining generic_template | **0** (2026-05-28 audit) | Low-slug-specificity / dup clusters remain |
| **P3** Resolver persistence | Load-time re-attach / persist `exercise_description` | Pending |

### P1 slugs (complete)

seated_hip_internal_rotation, lying_hip_rotation, quadruped_hip_circle, prone_extension, sphinx_stretch, band_ir_er, wrist_circles, finger_extensions, foam_roll_quad, foam_roll_glute, foam_roll_t_spine, breathing_box

### P2 chunk 1 slugs (complete — 59)

**P0+P1 (15):** ankle_dorsiflexion_stretch, ankle_circles, banded_ankle_mob, seated_hip_internal_rotation, lying_hip_rotation, quadruped_hip_circle, prone_extension, sphinx_stretch, band_ir_er, wrist_circles, finger_extensions, foam_roll_quad, foam_roll_glute, foam_roll_t_spine, breathing_box

**Sport-mode staple stretches (21):** t_spine_rotation, worlds_greatest_stretch, hip_90_90, frog_stretch, pigeon_stretch, childs_pose, thread_needle, open_book_ts, sleeper_stretch, cross_body_stretch, lat_stretch_door, standing_hamstring_stretch, figure_four_stretch, standing_quad_stretch, calf_stretch_wall, chest_stretch_doorway, breathing_diaphragmatic, inchworm, standing_hip_circle, 90_90_hip_switch

**Generic/duplicate template fixes (21):** ff_bodyweight_kneeling_side_plank, ff_ring_circle_front_lever, ff_cable_prone_bench_hamstring_curl, ff_cable_standing_single_leg_hamstring_curl, ff_stability_ball_hamstring_curl, ff_slider_hamstring_curl, ff_stability_ball_single_leg_hamstring_curl, ff_single_arm_barbell_kneeling_rollout, ff_single_arm_barbell_standing_rollout, ff_slider_double_kettlebell_overhead_lateral_lunge, ff_slider_double_kettlebell_suitcase_lateral_lunge, ff_slider_kettlebell_horn_grip_lateral_lunge, ff_double_kettlebell_incline_bench_prone_row, ff_single_arm_dumbbell_incline_bench_prone_row, ff_single_arm_kettlebell_incline_bench_prone_row, ff_single_arm_kettlebell_front_rack_carry, ff_single_arm_kettlebell_bottoms_up_front_rack_carry, ff_double_kettlebell_bottoms_up_front_rack_carry, ff_double_kettlebell_prone_row, ff_single_arm_kettlebell_prone_row, ff_single_arm_dumbbell_prone_row

**Band mobility / prehab (3):** banded_hip_flexor_stretch, half_kneeling_thoracic_opener, wall_slide

---

## P2 — Remaining quality cleanup (next)

**2026-05-28 audit after chunk 1:** `generic_template` = **0** across all batches. Next targets: `low_slug_specificity` (~377 total), duplicate-description clusters in batch 201–800 (~79).

Re-run audit after each chunk:

```bash
npx tsx scripts/auditExerciseDescriptions.ts
npx tsx scripts/auditExerciseDescriptions.ts --json > artifacts/auditExerciseDescriptions.json
```

**Strategy**

1. Triage: `fallback_template` + `generic_template` + `low_slug_specificity` first
2. Chunks of **50–100 slugs** by movement family or equipment class
3. Prefer hand-written copy for high-traffic / sport-tagged exercises
4. Do **not** mass-edit all remaining offenders in one PR

**Acceptance criteria per chunk**

- `generic_template` count drops for edited slugs
- `validateCuratedDescriptionsFile()` passes
- No new duplicate-description clusters (3+ slugs sharing exact text)

---

## P3 — Persistence

- `exercise_description` not stored in workout DB rows today
- Re-attach on load via `attachExerciseDescriptionsToWorkout` or persist in prescription JSON

---

## Tracking progress

**Validate curated file after edits**

```bash
npx vitest run lib/workoutUtils.exerciseDescription.test.ts
npx tsx scripts/applyDescriptionQualityP0P1P2chunk1.ts  # idempotent re-apply if needed
```

**Sync to Supabase after enrichment**

```bash
DESCRIPTION_SYNC_ONLY_SLUGS=slug1,slug2 npx tsx scripts/syncExerciseDescriptionsToSupabase.ts
```

## Acceptance criteria (P0/P1/P2 chunk 1)

- Each slug has 2–4 sentences, passes `validateExerciseDescriptionCopy()`
- `formatExerciseDisplayCue` returns curated text when `exercise_description` is attached
- Generic prescription strings do not surface as setup text when description is absent
- `isGenericPrescriptionCoachingCue` guard in `lib/exerciseDisplayCue.ts`
