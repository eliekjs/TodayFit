# Conditioning Gold-Set Enrichment

This document describes the conditioning gold-set enrichment pass for Sport Conditioning sub-focuses. The design uses **sub-focus slugs as first-class exercise tags** (no hidden ontology).

## Intent sub-focuses (direct-match)

- **zone2_aerobic_base** — steady aerobic (bike, treadmill, rower, ski erg, incline walk)
- **intervals_hiit** — high-intensity intervals (rower, ski erg, KB swing, jump rope, box jump, burpee, mountain climbers, stairs, sled, walking lunge)
- **threshold_tempo** — sustained tempo effort (rower, ski erg)
- **hills** — incline / uphill repeats (treadmill incline walk, stair climber, sled push, walking lunge)

## Overlay (body-region)

Overlays use `primary_movement_family` and `muscle_groups`:

- **lower** — `lower_body`, or muscle_groups including legs/quads/glutes/hamstrings/calves
- **core** — `core` family or muscle_groups including core
- **upper** — `upper_push` / `upper_pull` or push/pull muscles (rower, ski erg qualify via pull/lats)
- **full_body** — no filter

## Files

| File | Purpose |
|------|--------|
| `data/conditioningGoldSet.ts` | Gold-set IDs, recommended direct tags, overlay family (reference) |
| `logic/workoutGeneration/exerciseStub.ts` | Source of truth: conditioning exercises with `attribute_tags`, `muscle_groups`, `primary_movement_family` |
| `scripts/auditConditioningCoverage.ts` | Audit: direct-match and overlay-compatible counts per intent/overlay |

## Reversibility

- Gold-set and tags are confined to `data/conditioningGoldSet.ts` and conditioning entries in `exerciseStub.ts`.
- To roll back: revert stub changes for modality === "conditioning" and remove or trim `conditioningGoldSet.ts` and the audit script.

## Audit

Run:

```bash
npx tsx scripts/auditConditioningCoverage.ts
```

Interpretation: intent or overlay with ≤1 exercise is reported as weak; aim for ≥2 per intent and per overlay where applicable.
