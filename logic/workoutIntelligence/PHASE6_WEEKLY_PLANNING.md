# Phase 6: Adaptive Weekly Planning Engine

Phase 6 sits **above** the session generator (Phases 1–5). It decides **which** sessions to create, **how** they are distributed across the week, and **how** weekly emphasis is balanced. It does **not** rewrite the single-session generator or exercise scoring/prescription logic.

## Architecture

```
WeeklyPlanningInput
  → resolveWeeklyDemand()     → WeeklyDemandProfile (quality weights)
  → allocateWeeklySessions() → WeeklySessionIntent[] (session mix)
  → orderSessionsAcrossWeek() → ordered sessions with day_index
  → rationale + downstream_generation_input
  → WeeklyPlan
  → (optional) for each session: generateWorkoutWithPrescriptions(downstream_generation_input)
```

## Data flow

1. **Input**: `WeeklyPlanningInput` — primary/secondary/tertiary goals, sports, days available, durations, energy profile, equipment, injuries, optional variation seed.
2. **Demand resolution**: Goals + sports → normalized `WeeklyDemandProfile` (training quality weights 0–1). Uses existing `mergeTargetVector` (goal + sport weights).
3. **Allocation**: Demand + days → list of `WeeklySessionIntent` (session_type, stimulus_profile, priority, target_qualities, duration, fatigue_tier, load_hints). Recipe-based by scenario (e.g. climbing+hypertrophy 5 days, skiing+hypertrophy 4 days, general hypertrophy 4–5 days).
4. **Load balancing**: `WeeklyLoadState` tracks exposure to grip_intensive, shoulder_load, lumbar_load, knee_dominant_high, heavy_compound, plyometric_impact. Rules: no back-to-back grip-heavy, min days between high lower-body sessions.
5. **Stimulus distribution**: Max high-fatigue sessions per week; no two high-fatigue days back-to-back; optional bridge (low-fatigue) day when density is high.
6. **Ordering**: Greedy assignment of intents to days using placement score (preferred days, energy match, duration match, load rules). Optional swap to separate consecutive high-fatigue days.
7. **Rationale**: Per-session short rationale + weekly summary for explainability.
8. **Output**: `WeeklyPlan` with `WeeklyPlannedSession[]`, each with `downstream_generation_input` for the daily generator.

## Types

- **WeeklyPlanningInput**: MVP input (goals, sports, days_available_per_week, default_session_duration, available_equipment, optional preferred_training_days, session_duration_by_day, energy_profile_by_day, equipment_by_day, injuries_or_limitations, variation_seed, etc.).
- **WeeklyDemandProfile**: `Partial<Record<TrainingQualitySlug, number>>` (normalized).
- **WeeklySessionIntent**: session_type, stimulus_profile, priority, target_qualities, suggested_duration_minutes, suggested_fatigue_tier, label, load_hints.
- **WeeklyLoadState**: exposure counts and last_high_day per structural category.
- **WeeklyPlan**: id, primary_goal, sports, total_days, sessions, summary, notes.
- **WeeklyPlannedSession**: day_index, label, session_type, stimulus_profile, priority, target_qualities, planned_duration_minutes, expected_fatigue, rationale, downstream_generation_input.
- **DownstreamGenerationInput**: Same shape as `WorkoutSelectionInput` with required preferred_session_type and preferred_stimulus_profile; passed to `resolveSessionTemplateV2` + `generateWorkoutWithPrescriptions`.

## Handoff to daily generator

Each `WeeklyPlannedSession.downstream_generation_input` is a `WorkoutSelectionInput`-compatible object. To generate actual workouts:

1. Resolve template: `resolveSessionTemplateV2(session_type, stimulus_profile, duration_minutes)`.
2. Call `generateWorkoutWithPrescriptions({ input: downstream_generation_input, template, exercisePool, title })`.

Or use **generateWeeklyPlanWithWorkouts(input, { exercisePool, resolveSessionTemplate, generateWorkout })** to get both the plan and a `Map<day_index, GeneratedWorkout>`.

## Variation

- **variation_seed** (e.g. week index) is hashed and used in allocation to:
  - Alternate lower_hypertrophy vs lower_power for climbing+hypertrophy.
  - Alternate aerobic_builder vs resilience_recovery for bridge day.
  - Rotate third session in general hypertrophy (full_body vs push vs pull).
- Kept light and explainable; no full periodization.

## File layout

```
logic/workoutIntelligence/weekly/
  weeklyTypes.ts           # Input, demand, intent, load state, plan, config types
  weeklyDemandResolution.ts # resolveWeeklyDemand, demandLevel, hasClimbingDemand, etc.
  weeklyAllocation.ts      # allocateWeeklySessions (recipes by scenario)
  weeklyLoadBalancing.ts   # createEmptyLoadState, applySessionToLoadState, wouldViolateLoadRule, satisfiesStimulusDistribution
  weeklyOrdering.ts        # orderSessionsAcrossWeek, buildDownstreamInput
  weeklyRationale.ts       # generateSessionRationale, generateWeeklySummary
  weeklyPlanner.ts         # generateAdaptiveWeeklyPlan, generateWeeklyPlanWithWorkouts
  weeklyPlanExamples.ts    # exampleClimbingHypertrophy5Days, exampleSkiingHypertrophy4Days, exampleGeneralHypertrophy4Days
  index.ts                 # Public exports
```

## Example plans

- **Climbing + hypertrophy, 5 days**: Pull/sport support, lower hypertrophy or lower power, upper hypertrophy, aerobic or conditioning, resilience/mobility.
- **Skiing + hypertrophy, 4 days**: Lower-body strength, lower power/eccentric, upper hypertrophy, aerobic base.
- **General hypertrophy + athleticism, 4 days**: Upper hypertrophy, lower hypertrophy, full body or push or pull (rotated), aerobic or resilience.

## Assumptions and fallbacks

- If no scenario matches (e.g. pure endurance, 3 days), allocation falls back to a balanced mix (full body, upper, lower, aerobic, resilience) up to days_available.
- Preferred_training_days and energy_profile_by_day are best-effort; ordering tries to place high-priority/high-fatigue on high-energy days when possible.
- Structural load rules are MVP (grip spacing, high lower-body spacing); can be extended with more categories or sport-specific rules.
