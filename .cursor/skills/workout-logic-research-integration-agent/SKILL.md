---
name: workout-logic-research-integration-agent
description: Owns the full chain from exercise-science research to implemented workout and weekly plan generation. Chooses one narrow subsystem per run, researches evidence, classifies findings, compares to implementation, implements smallest justified end-to-end change (metadata, constraints, scoring, blocks, prescription, daily and weekly output), adds tests and a research note, and opens a PR. Use when autonomously improving workout logic with evidence.
---

# Workout Logic Research Integration Agent

You own the **full chain** from research to generated workout and week output. Each run must be **narrow** (one subsystem) and **end-to-end** (changes must reach daily and weekly generation, not stop at research or metadata).

## When to use this skill

- Autonomous improvement of workout logic (scheduled or on-demand).
- Implementing exercise-science-backed changes that touch constraints, scoring, prescription, blocks, or weekly planning.
- Adding or using new ontology/DB fields so they actually influence workout generation.

## Per-run workflow (mandatory)

### 1. Choose exactly one narrow subsystem

Pick **one** per run, e.g.:

- Superset pairing rules (pairing category, fatigue regions, grip)
- Movement balance (hinge cap, push/pull balance, pattern caps)
- Prescription (reps/sets/rest) for one goal (e.g. hypertrophy, strength)
- Cooldown/mobility selection (mobility_targets, stretch_targets)
- Warmup/prep selection (exercise_role, warmup relevance)
- Injury exclusion (joint_stress_tags, contraindication_tags usage)
- Weekly day intent or day naming
- Duration scaling (block count, exercise count)
- Fatigue awareness (fatigue_regions, pattern stacking)

Do **not** combine multiple unrelated subsystems in one run.

### 2. Research current exercise science

- Use web search for the chosen subsystem.
- Prefer: systematic reviews, meta-analyses, consensus statements (e.g. ACSM, NSCA), reputable sports science sources.
- Avoid: single blog posts or unvetted opinions as sole evidence.

### 3. Classify findings

| Class | Meaning | Action |
|-------|---------|--------|
| **High-confidence rules** | Strong evidence, broad agreement | Implement as code/constraints |
| **Context-dependent heuristics** | Depends on population, goal, context | Implement with comments; optional toggles if useful |
| **Speculative ideas** | Interesting but not established | Document in research note only; do not implement unless explicitly allowed |

### 4. Compare to current implementation

- Trace code: `resolveWorkoutConstraints`, scoring (`scoreExercise`, `sessionAssembler`), prescription (`prescriptionResolver`, `setRepResolver`), block assembly (`dailyGenerator`), weekly (`weeklyPlanner`, `weeklyRationale`).
- Identify: what the code does today vs what evidence suggests.
- Note: what new or improved **metadata** (ontology/DB) is required for the change.

### 5. Implement smallest justified end-to-end change

Implement across as many of these as needed, but no more:

- **Exercise metadata / ontology usage** — Use or add fields per `docs/EXERCISE_ONTOLOGY_DESIGN.md`; wire through adapters.
- **Filtering and constraint resolution** — `logic/workoutIntelligence/constraints/`, `resolveWorkoutConstraints.ts`.
- **Scoring and ranking** — `logic/workoutIntelligence/scoring/`, `ontologyScoring.ts`, `movementBalanceGuardrails.ts`.
- **Block assembly and prescription** — `sessionAssembler`, `prescriptionResolver`, `setRepResolver`, `durationScaling`.
- **Daily workout output** — `dailyGenerator.ts`, `generateWorkout.ts`.
- **Weekly plan output and naming** — `weeklyPlanner.ts`, `weeklyRationale.ts`, `weeklyLoadBalancing.ts`, `dayTitle`/titles.

Ensure **new DB/ontology fields actually influence generation** when the PR claims behavior change (traceable in code).

### 6. Tests, fixtures, snapshots

- Add or update tests in `logic/workoutGeneration/*.test.ts`, `logic/workoutIntelligence/**/*.test.ts`.
- Update fixtures/snapshots if output shape or behavior changes.
- Run: `npm run test:generator`, `npm run test:phase5`, and any other relevant test commands.

### 7. Research note

- Create or update a note in `/docs/research/` using `evidence-review-template.md`.
- Include: subsystem, sources, classification (high-confidence / heuristic / speculative), what was implemented and what was deferred.

### 8. Open a PR

PR must include:

- **Summary** — What subsystem, what changed, what evidence.
- **Evidence** — Links to sources (systematic reviews, consensus, etc.).
- **Risks** — What could regress or surprise users.
- **Rollback** — How to revert (e.g. revert commit, feature flag if added).

## Codebase map (quick reference)

| Concern | Location |
|--------|----------|
| Constraints | `logic/workoutIntelligence/constraints/resolveWorkoutConstraints.ts`, `constraintTypes.ts` |
| Scoring | `logic/workoutIntelligence/scoring/scoreExercise.ts`, `ontologyScoring.ts`, `movementBalanceGuardrails.ts` |
| Selection & blocks | `logic/workoutIntelligence/selection/sessionAssembler.ts`, `candidateFilters.ts` |
| Prescription | `logic/workoutIntelligence/prescription/prescriptionResolver.ts`, `setRepResolver.ts`, `durationScaling.ts` |
| Superset | `logic/workoutIntelligence/supersetPairing.ts` |
| Daily generator | `logic/workoutGeneration/dailyGenerator.ts` |
| Weekly | `logic/workoutIntelligence/weekly/weeklyPlanner.ts`, `weeklyRationale.ts`, `weeklyDailyGeneratorBridge.ts` |
| Ontology & types | `docs/EXERCISE_ONTOLOGY_DESIGN.md`, `lib/types.ts`, `logic/workoutIntelligence/types.ts`, `lib/ontology/` |

## Policy

- Repo policy: root `AGENTS.md`.
- Validation: logic changes require tests; autonomous logic PRs require a research note; metadata that claims behavior change must be wired into generation. See `scripts/validate-autonomous-pr.js`.
