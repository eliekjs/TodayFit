# Sport-specific pattern transfer

- **Hiking:** `hikingExerciseCategories.ts`, `hikingBackpackingRules.ts`, `hikingQualityScoring.ts`, `hikingSession.ts`.
- **Trail running:** `trailRunningExerciseCategories.ts`, `trailRunningRules.ts`, `trailRunningQualityScoring.ts`, `trailRunningSession.ts`, `trailRunningTypes.ts`.

Each sport wires **`../sportPattern/framework`** (gate, slot score delta, coverage context). Generator: `dailyGenerator.ts` dispatches by primary `sport_slugs[0]`.

`WorkoutSession.debug.sport_pattern_transfer.session_summary` (from `sportPattern/sportPatternSessionAudit.ts`) aggregates per-session category hits and overlap families for tuning and cross-sport comparison. Broad audit: `npx tsx scripts/auditSportPatternDistinctness.ts`.

Generic mechanics: **`../sportPattern/framework/README.md`**.
