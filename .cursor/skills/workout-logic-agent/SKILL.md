---
name: workout-logic-agent
description: Improves workout and exercise logic and algorithm design so workouts and exercises best fit all user filters and buttons (per workout/week). Uses exercise science principles per goal. Use when improving generation, scoring, prescription, filtering, constraints, or ensuring filter fidelity and goal-appropriate programming.
---

# Workout Logic & Algorithm Agent

You are responsible for improving the logic and algorithm design of the app so that **workouts and exercises best fit all filters and buttons** the user selects for each workout and week. Logic must be grounded in **exercise science** for each goal.

## When to use this skill

- User asks to improve workout logic, algorithm design, or filter matching.
- User reports workouts not respecting body focus, injuries, equipment, goals, or duration.
- User wants exercise science applied correctly (reps, rest, volume, balance) per goal.
- Changes touch: generation pipeline, scoring, prescription, constraints, supersets, weekly distribution.

## Codebase map

| Concern | Location |
|--------|----------|
| **Constraints** (injuries, equipment, body, goal) | `logic/workoutIntelligence/constraints/resolveWorkoutConstraints.ts`, `constraintTypes.ts`, `eligibilityHelpers.ts` |
| **Filters** (legacy / manual flow) | `lib/generator.ts` (`filterByGymProfile`, `filterByInjuries`, `filterByBodyPartFocus`, etc.) |
| **Goal → qualities** | `logic/workoutIntelligence/goalQualityWeights.ts` |
| **Training qualities** | `logic/workoutIntelligence/trainingQualities.ts` |
| **Scoring** | `logic/workoutIntelligence/scoring/scoreExercise.ts`, `targetVector.ts`, `qualityResolution.ts` |
| **Selection & blocks** | `logic/workoutIntelligence/selection/blockFiller.ts`, `sessionAssembler.ts`, `candidateFilters.ts` |
| **Prescription** (reps/sets/rest) | `logic/workoutIntelligence/prescription/prescriptionResolver.ts`, `setRepResolver.ts`, `intentGuidance.ts`, `durationScaling.ts` |
| **Superset pairing** | `logic/workoutIntelligence/supersetPairing.ts`, `scoring/pairing.ts` |
| **Session generator** | `logic/workoutGeneration/dailyGenerator.ts` |
| **Weekly planning** | `logic/workoutIntelligence/weekly/weeklyPlanner.ts`, `weeklyDemandResolution.ts`, `weeklyBalanceRules.ts` |
| **Ontology & types** | `docs/EXERCISE_ONTOLOGY_DESIGN.md`, `lib/types.ts`, `logic/workoutIntelligence/types.ts` |
| **User preferences** | `lib/types.ts` (`ManualPreferences`, `DailyWorkoutPreferences`), `lib/preferencesConstants.ts` |

## Workflow for improvements

1. **Clarify which filters/goals are involved** — body focus, injuries, equipment, energy, duration, primary/secondary/tertiary goal, workout style, upcoming events, Zone 2 preference.
2. **Trace the data path** — From UI/preferences → `GenerateWorkoutInput` / `WorkoutSelectionInput` → constraints → scoring/selection → prescription. Ensure the relevant preference is read and passed through; fix any drop-off.
3. **Apply constraint precedence** — Injuries → equipment → body-part → primary goal → secondary goal → preferences. Add or adjust rules in `resolveWorkoutConstraints` (or legacy filters in `lib/generator.ts`) so new behavior fits this order.
4. **Align with exercise science** — For the goal(s) in scope, apply rep ranges, rest, volume, and balance per [reference.md](reference.md). Update prescription or scoring weights if needed.
5. **Respect ontology** — Use movement family, movement patterns, joint stress, pairing category, and fatigue regions from the ontology design. Prefer canonical slugs; keep fallbacks consistent.
6. **Test impact** — Run existing tests (`logic/workoutGeneration/*.test.ts`, `logic/workoutIntelligence/constraints/eligibility.test.ts`); add or update tests for new behavior.

## Checklist before finishing

- [ ] Every user-facing filter/button that should affect the workout is reflected in constraints or selection.
- [ ] Prescription (sets/reps/rest/tempo) matches the session goal and block type.
- [ ] Injury and equipment restrictions are hard constraints (no violations).
- [ ] Body-part focus is strict (Upper/Lower/Full + modifiers); scoring favors goal-aligned qualities.
- [ ] Balance (push/pull, movement patterns, fatigue regions) is respected; superset pairing follows pairing rules.
- [ ] Changes are consistent with `docs/EXERCISE_ONTOLOGY_DESIGN.md` and existing types.

## Additional resources

- Exercise science per goal: [reference.md](reference.md)
- Architecture: `logic/workoutIntelligence/ARCHITECTURE.md`
- Rule that always applies when editing these files: `.cursor/rules/workout-logic-algorithm.mdc`
