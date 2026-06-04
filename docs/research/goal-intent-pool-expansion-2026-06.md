# Goal intent pool expansion (June 2026)

## Subsystem

Manual goal sub-focus coverage — calisthenics, mobility, recovery/resilience, power, endurance durability, and conditioning/endurance hills/threshold on default gym profiles.

## Evidence summary

| Sub-focus | Representative exercises | Sources |
|-----------|-------------------------|---------|
| **Mobility hips / T-spine / ankle** | World's greatest stretch, 90/90 hip switch, cat-cow, quadruped T-spine rotation, wall calf stretch, ankle CARs | [NSCA Foundations warm-up](https://www.nsca.com/contentassets/8323553f698a466a98220b21d9eb9a65/foundationsoffitnessprogramming%5F201508.pdf); [NSCA LBP mobility-stability continuum](https://www.nsca.com/education/articles/ptq/low-back-painthe-mobility-stability-continuum/) |
| **Recovery lower back** | Bird dog, cat-cow, child’s pose, Pallof press, anti-rotation work | NSCA PTQ; mobility-stability continuum |
| **Calisthenics pistol / shrimp** | Pistol squat progressions, Bulgarian split squat, assisted pistol, shrimp squat | [MPCalisthenics pistol guide](https://www.mpcalisthenics.com/tutorial/pistol-squat-the-ultimate-progression-guide); [Calisthenics Association progressions](https://calisthenicsassociation.org/blog/pistol-squat-progressions-beginners) |
| **Front lever** | Tuck → advanced tuck → straddle progressions on bar/rings | Gymnastic strength coaching consensus |
| **Olympic / triple extension** | Power clean, hang power clean, KB clean/snatch | NSCA Essentials — Olympic derivatives for power |
| **Threshold / hills / durability** | Tempo run, cruise intervals, erg threshold, incline walk, zone 2 steady | Endurance coaching consensus; see conditioning-intent-pool-expansion-2026-06.md |

**Classification:** High-confidence for exercise *categories*; context-dependent for exact catalog slug assignment on multi-use ergs.

## Gap analysis (before)

Goal sub-focus audit (default gym, 219 exercises after filters): **20/65 critical**, including 0-pool slugs for mobility ankles/lower_back, calisthenics pistol/front lever, power olympic triple extension, resilience regional, and `balanced` hypertrophy.

Root causes:
1. Mobility staples were `eligible_niche` / `excluded_review` — excluded from default pruning gate pool.
2. Sub-focus matching relied on generic tag-map overlap (e.g. generic `mobility` matching all regions).
3. No direct `attribute_tags` intent slugs on exercises (except partial conditioning work).

## Implementation

1. **`data/goalIntentEnrichment.ts`** — direct intent slugs (`hips`, `legs_pistol`, `olympic_triple_extension`, etc.) on curated in-pool and promoted exercises.
2. **`scripts/promoteGoalCoverageEligibility.ts`** — promotes mobility/recovery/calisthenics staples to `eligible_core`.
3. **`data/exercises.ts`** — bird dog, ankle circles, Pallof press, front lever tuck progressions.
4. **`lib/goalRegistry.ts`** — canonical label ↔ slug ↔ PrimaryGoal helpers.
5. **`subFocusSlugMatch.ts`** — direct intent slug matching; balanced hypertrophy matcher; tightened mobility regional rules (prior PR).
6. Wired in **`lib/dailyGeneratorAdapter.ts`** alongside conditioning intent enrichment.

## Validation

- `npx vitest run logic/workoutGeneration/subFocusResilienceThreshold.test.ts lib/subFocusWeights.test.ts`
- `npx tsx scripts/auditSubFocusPoolCoverage.ts` — re-check goal sub-focus critical counts after promotion + enrichment.

## Risks / rollback

- Promoting niche mobility drills to `eligible_core` may surface less familiar names in default sessions — mitigated by goal-specific filtering and regional intent tags.
- Rollback: revert `goalIntentEnrichment.ts`, eligibility promotions, and adapter wiring.
