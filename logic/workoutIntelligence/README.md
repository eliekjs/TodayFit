# Workout Intelligence

Quality-based workout intelligence for TodayFit: goal modeling, sport demand, exercise capability, scoring, and session composition. Shared by **Build My Workout** and **Adaptive / Sports Prep**; the difference between modes is the **type of filters** (session-focused vs sport/plan-focused), not day vs week—both can generate a single day or a full week.

## Layout

| Module | Purpose |
|--------|--------|
| **ARCHITECTURE.md** | Full design: layers, data model, scoring, fatigue, pipeline, phases |
| **trainingQualities.ts** | Canonical taxonomy of training qualities (slugs + groups) |
| **goalQualityWeights.ts** | Goal slug → weighted training qualities |
| **sportQualityWeights.ts** | Sport slug → weighted training qualities |
| **targetVector.ts** | Merge goal + sport into session target vector; alignment score |
| **tagToQualityMap.ts** | Tag → quality map; used to derive capability when an exercise has no exercise_training_quality rows |
| **types.ts** | SessionTargetVector, ExerciseWithQualities, BlockSpec, SessionTemplate, etc. |
| **scoring/scoreExercise.ts** | Phase 4 **`pipelineScoreExercise`** only — **not** app daily generation (see `logic/workoutGeneration/SCORING_RUNTIME.md`) |
| **sessionTemplates.ts** | Block specs per session type (strength 45/60, hypertrophy, sport-mixed, etc.) |
| **supersetPairing.ts** | Good/bad superset pairing heuristics |
| **adapters.ts** | Generator Exercise → ExerciseWithQualities (DB weights or tag-derived + overrides) |
| **pipeline.ts** | Build context (target, template, fatigue), scoreAndRankCandidates, consumeExerciseInContext |

## Usage

```ts
import {
  mergeTargetVector,
  getTemplateForGoalAndDuration,
  toExerciseWithQualities,
  buildPipelineContext,
  scoreAndRankCandidates,
  consumeExerciseInContext,
} from "./logic/workoutIntelligence";

// 1. Target vector from goals + sports
const target = mergeTargetVector({
  primary_goal: "hypertrophy",
  secondary_goals: ["climbing"],
  sport_slugs: ["rock_bouldering"],
  sport_weight: 0.4,
});

// 2. Session template
const template = getTemplateForGoalAndDuration("hypertrophy", 60);

// 3. Convert generator exercises to ExerciseWithQualities
const pool = generatorExercises.map(toExerciseWithQualities);

// 4. Build context (includes fatigue from recent history)
const context = buildPipelineContext(
  {
    primary_goal: "hypertrophy",
    sport_slugs: ["rock_bouldering"],
    duration_minutes: 60,
    energy_level: "medium",
    recent_history: [...],
  },
  pool
);

// 5. Score and rank for a block
const ranked = scoreAndRankCandidates(
  filteredCandidates,
  context,
  { blockType: "main_hypertrophy", durationMinutes: 60, energyLevel: "medium" }
);

// 6. After selecting an exercise, update context
consumeExerciseInContext(context, selectedExercise, usedIds);
```

## Integration

- **Session generator** (`logic/workoutGeneration/dailyGenerator.ts`): **Production** scoring is **`dailyGenerator.scoreExercise`** (see **`logic/workoutGeneration/SCORING_RUNTIME.md`**). The repo also exposes **`mergeTargetVector`**, **`toExerciseWithQualities`**, and **`supersetPairing`** for use inside that path. The Phase 4 **`pipelineScoreExercise`** / **`scoreAndRankCandidates`** stack is for `assembleSession` and experiments — it does not run inside `generateWorkoutSession`.
- **Weekly distribution** (e.g. in `services/sportPrepPlanner/` when generating a week): Optional step that assigns per-day intent/quality emphasis; then each day’s session is generated with that day’s target vector. Same idea can apply when Build mode is used to generate a week.

## Implementation phases

See **ARCHITECTURE.md** § F. Phases 1–5. Current code covers Phase 1 (qualities, goal/sport weights, target merge, alignment) and scaffolding for Phase 2 (scoring, templates, superset, pipeline).
