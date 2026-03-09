# Phase 10: Ontology Normalization, Grip Fatigue, and Library Audit

## 1. Canonical ontology helpers

Use **logic/workoutGeneration/ontologyNormalization.ts** for a single canonical shape from ontology + legacy:

- **getCanonicalExerciseRole(ex)** — role (ontology first; no derivation).
- **getCanonicalMovementFamilies(ex)** — `{ primary, secondary }` (ontology first, else derived).
- **getCanonicalMovementPatterns(ex)** — array of patterns (ontology first; legacy push/pull mapped).
- **getCanonicalFatigueRegions(ex)** — includes **grip** when `hasGripFatigueDemand(ex)`.
- **getCanonicalJointStressTags(ex)** — ontology or legacy tags.
- **getCanonicalMobilityTargets(ex)** / **getCanonicalStretchTargets(ex)** — ontology only.
- **isCanonicalCompound(ex)** / **isCanonicalIsolation(ex)** / **isCanonicalUnilateral(ex)** — role/pattern heuristics.
- **hasGripFatigueDemand(ex)** — pairing_category grip, joint_stress grip_hanging, stimulus grip, or fatigue_regions grip/forearms.

Scoring and selection should use these (or the ontologyScoring/fatigueTracking wrappers) instead of reading raw fields.

## 2. Library audit utility

**logic/workoutGeneration/libraryAudit.ts**:

- **auditExerciseLibrary(exercises)** — returns `{ total_exercises, findings, by_field, summary }`.
- **formatAuditReport(report)** — deterministic console-friendly text.

Findings include: missing exercise_role, primary_movement_family, movement_patterns, fatigue_regions, pairing_category, joint_stress_tags; warmup/cooldown without mobility/stretch targets; legacy-only exercises; suspicious role vs compound/isolation.

Example:

```ts
import { auditExerciseLibrary, formatAuditReport } from "./libraryAudit";
const report = auditExerciseLibrary(myExercises);
console.log(formatAuditReport(report));
```

## 3. Grip as first-class fatigue region

- **lib/ontology/vocabularies.ts**: `FATIGUE_REGIONS` includes `"grip"`.
- **ontologyNormalization**: `getCanonicalFatigueRegions` adds `"grip"` when `hasGripFatigueDemand(ex)` (ontology or heuristics: grip_hanging, pairing_category grip, stimulus grip, pull/vertical_pull + forearms/lats/back).
- **ontologyScoring**, **fatigueTracking**, **supersetPairing**: use canonical fatigue regions (so grip is included in session fatigue balance and pairing).

Grip remains a **tunable soft signal** (no hard exclusions beyond existing double-grip superset penalty).

## 4. Unilateral and movement-pattern signals

- **scoreUnilateralVariety(ex, sessionHasBilateralLowerBody)** — small bonus when session has bilateral lower and candidate is unilateral lower-body.
- **scoreMovementPatternRedundancy(ex, sessionPatternCounts, cap)** — small penalty when the session already has many exercises in the same pattern.

Both are additive and appear in the ontology score breakdown (debug).

## 5. Seed/annotation ergonomics

- Annotate new exercises with the same fields as in **docs/PHASE4_ANNOTATION_CONVENTIONS.md** (including **fatigue_regions** with **grip** where appropriate).
- Run **auditExerciseLibrary** on your list to find missing or weak fields before committing seeds.
- Unannotated exercises still work: normalization falls back to legacy movement_pattern, muscle_groups, and pairing_category/fatigue derivation.
