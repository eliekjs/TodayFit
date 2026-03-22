# Phase 7 — Warmup / cooldown relevance (demand levels)

**Subsystem:** Ontology fields `warmup_relevance` and `cooldown_relevance` (`none` | `low` | `medium` | `high`) used in `scoreWarmupCooldownRelevance` in `logic/workoutGeneration/ontologyScoring.ts`, together with Phase 5 mobility and stretch targets.

**Date:** 2025-03-21

## Sources (ranked)

| Source | Tier | Use in this phase |
|--------|------|-------------------|
| ACSM physical activity guidance on warm-up and cool-down for adults | 1–2 | High-confidence general: gradual warm-up and cool-down around activity; supports tagging dynamic prep as warmup-appropriate and static stretch or breathing as cooldown-appropriate without a single optimal dose. |
| ACSM resistance training guidance (prep before loading) | 1–2 | Context-dependent: movement prep before heavier work is standard; maps to higher warmup_relevance for activation and dynamic mobility. |
| TodayFit Phase 5 research note (mobility vs stretch targets) | internal | Targets inform prep versus stretch-dominant cooldown use. |
| TodayFit `cooldownSelection.ts` | internal | Cooldown pool is stretch-target or stretch or breathing role; relevance is soft scoring for ordering. |

## Classification

### High-confidence (implemented as rules)

1. Only values in `DEMAND_LEVELS` in `lib/ontology/vocabularies.ts` are written.
2. Inference uses the same exercise universe as Phase 5 via `shouldRunPhase5MobilityStretchInference`.
3. Do not overwrite curated DB values: fill only when a field is still undefined.

### Context-dependent heuristics

- Diaphragmatic or box breathing: cooldown high, warmup low.
- Static-stretch-biased names (pigeon, frog stretch, seated hamstring, etc.): cooldown high, warmup low, even when Phase 5 added minor mobility slugs.
- Mobility-only: warmup high, cooldown low.
- Both mobility and stretch targets: warmup high, cooldown high.
- Prep or warmup role: warmup high; stretch role or stretch targets only: cooldown high.
- Name fallbacks (arm circles, leg swings, jumping jacks) when Phase 5 left targets empty.

### Speculative / not implemented

- Sport-specific RAMP templates.
- Heart-rate-based warm-up dose.

## Application policy (TodayFit)

- Order: merge after Phase 5 (targets) and Phase 6.
- Implementation: `lib/exerciseMetadata/phase7WarmupCooldownRelevanceInference.ts`
- Tests: `lib/exerciseMetadata/phase7WarmupCooldownRelevanceInference.test.ts`
