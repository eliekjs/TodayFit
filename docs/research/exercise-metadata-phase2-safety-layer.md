# Phase 2 — Safety layer: joint stress, contraindications, impact

**Subsystem:** Exercise ontology fields `joint_stress_tags`, `contraindication_tags`, `impact_level` for injury-aware filtering and impact-sensitive scoring.

**Date:** 2025-03-21

## Sources (ranked)

| Source | Tier | Use in this phase |
|--------|------|-------------------|
| [NSCA — Plyometric implementation / landing positions](https://www.nsca.com/education/videos/plyometric-implementation-setup-and-execution-of-jump-landing-positions-to-decrease-likelihood-of-injuries/) | 2 (professional org education) | **High-confidence heuristic:** plyometric and jump-landing work imposes meaningful **knee/ankle** demand and warrants **progressive** exposure; supports tagging **high impact** for jump/hop/bound-style drills vs lower-amplitude locomotion. |
| [NSCA — Plyometric exercises (Kinetic Select)](https://www.nsca.com/education/articles/kinetic-select/plyometric-exercises/) | 2 | Reinforces volume/progression framing; supports separating **high-impact** plyometric patterns from general conditioning. |
| [ACSM — Updated resistance training guidelines (2026 announcement)](https://acsm.org/resistance-training-guidelines-update-2026/) | 1–2 | **High-confidence rule (general):** resistance training should be **regular**, **multi-joint / major-muscle** oriented, and **individualized**; supports using **movement-pattern + load-posture** cues (squat, hinge, overhead, locomotion) as the backbone for **conservative** joint-load tags—not per-exercise biomechanics studies. |
| [NATA — ACL injury prevention position statement](https://www.nata.org/sites/default/files/2025-08/prevention_of_anterior_cruciate_ligament_acl_injury_position_statement.pdf) | 1–2 | **Context-dependent:** multicomponent programs (strength, plyometrics, agility, balance, etc.) reduce injury risk; we **do not** claim tag accuracy per exercise—only that **knee/ankle** loading is **higher** for jump/landing/agility/sprint-like drills than for unloaded mobility. |

## Classification

### High-confidence (implemented as rules)

1. **Separate impact severity** for **jump/plyometric** patterns vs **steady locomotion** (NSCA plyometric progression; ACL multicomponent emphasis).
2. **Tag major load categories** aligned with existing engine slugs: **knee flexion**, **shoulder overhead**, **spinal axial / shear**, **hanging grip**, etc. (`lib/ontology/vocabularies.ts`, `INJURY_AVOID_TAGS` in `lib/workoutRules.ts`).
3. **`contraindication_tags`** are **user-facing regions** derived from `joint_stress_tags` plus explicit exercise contraindications (`docs/EXERCISE_ONTOLOGY_DESIGN.md` F.6).

### Context-dependent heuristics

- **Horizontal pressing** → `shoulder_abduction_load` (horizontal abduction in pressing); **shoulder** injury filter includes this slug so horizontal pressing can be excluded when the user reports shoulder issues.
- **Battle ropes / waves** → shoulder extension + abduction load (high-velocity shoulder/elbow demand; conservative tagging).
- **“Deep” knee patterns** (ATG, pistol, deep split squat, etc.) → add `deep_knee_flexion` on top of `knee_flexion`.

### Speculative / not implemented

- Per-exercise peak **joint reaction forces** from inverse dynamics.
- Population-specific (post-op, OA staging) branching.

## Application policy (TodayFit)

- **Canonical slugs only** from `JOINT_STRESS_TAGS` / `CONTRAINDICATION_TAGS`.
- **Unknown / ambiguous → omit joint_stress tags** for **mobility/recovery-only** entries to limit false hard-excludes.
- **Legacy tag lift:** `tags.joint_stress` strings (including `shoulder_extension`, `joint_*` prefixes) normalize into `joint_stress_tags` before inference.
- **Do not overwrite** curated DB ontology when arrays are already populated on the row.
- **`impact_level`:** `high` for clear jump/plyometric cues; `medium` for run/sprint/agility/skipping; `none` for mobility/recovery-only; otherwise default **`low`** so scoring distinguishes **high** when injuries are impact-sensitive (`logic/workoutGeneration/dailyGenerator.ts`).

## UI injury keys → joint stress (reference)

See `INJURY_AVOID_TAGS` in `lib/workoutRules.ts` (updated in Phase 2 to include `shoulder_abduction_load`, `shoulder_external_rotation_load`, `lumbar_flexion_load` where applicable).

## What we deferred

- Full catalog human review / confidence scores per row.
- Optional generator PR to align `filterTagRules` upcoming avoid tags with hard filters (plan follow-up).
