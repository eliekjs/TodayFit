# Phase 4 — Conditioning intent slugs

**Subsystem:** `CONDITIONING_INTENT_SLUGS` in `tags.attribute_tags` plus `tags.stimulus` bridge (`data/goalSubFocus/conditioningSubFocus.ts`, `logic/workoutGeneration/dailyGenerator.ts`).

**Date:** 2025-03-21

## Sources

| Source | Use |
|--------|-----|
| [ACSM physical activity guidelines](https://www.acsm.org/education-resources/trending-topics-resources/physical-activity-guidelines) | Moderate continuous vs vigorous activity framing → `zone2_aerobic_base` vs `intervals_hiit` / `threshold_tempo`. |
| [ACSM HIIT overview PDF](https://www.acsm.org/docs/default-source/files-for-resource-library/high-intensity-interval-training.pdf) | Repeated high effort + recovery → `intervals_hiit`. |
| NSCA-style coaching buckets | Sprint, plyometric, Olympic lifts → `sprint`, `lower_body_power_plyos`, `vertical_jump`, `olympic_triple_extension` (existing slugs only). |

## Policy

- Emit only slugs from `CONDITIONING_INTENT_SLUGS`.
- Inference runs for `conditioning` / `power` modality, `conditioning` movement family, or Olympic-lift name patterns on strength/hypertrophy/skill.
- Union inferred slugs into `attribute_tags`; backfill `aerobic_zone2` / `anaerobic` / `plyometric` stimulus when missing for legacy `exerciseHasSubFocusSlug` paths.

## Code

- `lib/exerciseMetadata/phase4ConditioningIntentInference.ts`
- Matching: `data/goalSubFocus/conditioningSubFocus.ts`
