# Phase 5 — Mobility & stretch targets (warmup / cooldown selection)

**Subsystem:** Ontology fields `mobility_targets` and `stretch_targets` (`lib/ontology/vocabularies.ts`) so `buildWarmup`, `selectCooldownMobilityExercises`, and `ontologyScoring` can match exercises to **focus-derived preferred targets** (`FOCUS_TO_WARMUP_TARGETS`, `FAMILY_TO_COOLDOWN_TARGETS`).

**Date:** 2025-03-21

## Sources (ranked)

| Source | Tier | Use in this phase |
|--------|------|-------------------|
| [ACSM — Physical Activity Guidelines (adults, warm-up / cool-down)](https://www.acsm.org/education-resources/trending-topics-resources/physical-activity-guidelines) | 1–2 | **High-confidence (general):** sessions commonly include **gradual warm-up** and **cool-down** components; supports treating **mobility / activation** and **static stretching** as distinct selection buckets aligned with engine rules (`cooldownSelection.ts`: cooldown pool is **stretch-target or stretch/breathing role**). |
| Cochrane / systematic reviews on static stretching for DOMS or warm-up (e.g. PubMed-indexed reviews) | 2 | **Context-dependent:** evidence on **acute performance** and **DOMS** is mixed; we still tag **stretch_targets** for **selection / UX** (cool-down menus), not to claim a physiological outcome per exercise. |
| NSCA *Essentials of Strength Training and Conditioning* — exercise order, warm-up / movement prep | 1–2 (textbook consensus) | **High-confidence heuristic:** **dynamic / movement-prep** work vs **end-range or static stretch** are different menu items; maps to **`mobility_targets`** vs **`stretch_targets`** per `docs/PHASE4_ANNOTATION_CONVENTIONS.md` §6. |
| TodayFit `docs/PHASE4_ANNOTATION_CONVENTIONS.md` §6 | internal | **Canonical slugs** and “same drill can have both” rule (e.g. multi-segment flows). |

## Classification

### High-confidence (implemented as rules)

1. Only slugs in **`MOBILITY_TARGETS`** / **`STRETCH_TARGETS`** are emitted.
2. Inference runs when **`modalities`** include `mobility` or `recovery`, **`primary_movement_family === mobility`**, or **`exercise_role`** is one of `warmup`, `prep`, `mobility`, `stretch`, `cooldown`, `breathing` (after Phase 3 merge).
3. **Do not overwrite** non-empty `mobility_targets` / `stretch_targets` from DB curation (merge only fills empty arrays).

### Context-dependent heuristics

- **Blob (id + name)** keywords map to regions (e.g. thoracic / T-spine drills → `thoracic_spine`; pigeon / figure-4 → `glutes` + `hip_flexors` stretch).
- **`movement_patterns`** fallback: `thoracic_mobility` → `thoracic_spine` mobility; `shoulder_stability` → `shoulders` mobility.
- **Breathing-only** drills: no targets (merge no-op).

### Speculative / not implemented

- Individualized stretch dose or hold times.
- Auto-deriving targets from video or kinematics.

## Application policy (TodayFit)

- **Adapter path:** `mergePhase5MobilityStretchOntologyIntoExercise` runs **after** Phase 3 so `exercise_role` informs eligibility.
- **Implementation:** [`lib/exerciseMetadata/phase5MobilityStretchInference.ts`](../../lib/exerciseMetadata/phase5MobilityStretchInference.ts)
- **Tests:** [`lib/exerciseMetadata/phase5MobilityStretchInference.test.ts`](../../lib/exerciseMetadata/phase5MobilityStretchInference.test.ts)
