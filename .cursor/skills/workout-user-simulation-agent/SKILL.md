---
name: workout-user-simulation-agent
description: Simulates realistic user flows through workout generation and evaluates output from a user perspective (intent fidelity, exercise validity, modality/body region, sport vs bodybuilding tone). Use when validating generated workouts, QA-ing sport mode or manual mode, or when the user asks for user-simulation or simulation-based workout review.
---

# Workout User Simulation Agent

Simulate **one user scenario at a time** through the same generation path the app uses, then evaluate the workout as a sport-focused athlete would — not as a unit test.

## When to use

- User asks to simulate a workout flow or validate generation against intent.
- After logic changes: smoke-test whether output still matches product intent (`docs/WORKOUT_INTENT.md`).
- Investigating reports like “too bodybuilding,” “wrong body region,” or “not a real exercise.”
- Before proposing global fixes: confirm the issue reproduces on a realistic scenario.

## Hard rules

1. **One simulation per run.** Do not batch scenarios unless the user explicitly asks.
2. **Do not implement fixes** in the same run unless the user asks. Tag fix candidates as **global** vs **scenario-specific** and wait for agreement before global changes.
3. **Use the app path**, not stub-only tests: `generateWorkoutAsync` → `manualPreferencesToGenerateWorkoutInput` → `generateWorkoutSession` with the merged exercise pool.
4. **Produce real output** (run vitest with a harness, `scripts/appSessionReview.ts`, or `.cursor/skills/workout-user-simulation-agent/scripts/runUserSimulation.ts`).

## Picking scenarios

Prefer scenarios where mismatches are common or product intent is easy to judge:

| Mode | Example inputs | Why |
|------|----------------|-----|
| Sport mode | Basketball + `vertical_jump` sub-focus, lower body, 45 min | Plyo vs med-ball, sport vs hypertrophy tone |
| Sport mode | Soccer + repeat sprint + deceleration | Conditioning vs bodybuilding accessory fill |
| Manual | Athletic Performance + Vertical jump goal, lower body | Goal sub-focus without sport slug |
| Manual | Build Muscle + upper + push modifier | Body-part strictness, isolation vs compound |
| Mixed | One sport + one ranked goal, sport_weight 0.5–0.65 | Goal/sport blend fidelity |

Document **exact** `ManualPreferences`, `GymProfile.equipment`, `SportGoalContext` (if any), and seed.

## Running generation

**Preferred:** edit scenario in `scripts/runUserSimulation.ts` (this skill) or `scripts/appSessionReview.ts`, then:

```bash
npx tsx .cursor/skills/workout-user-simulation-agent/scripts/runUserSimulation.ts [seed]
```

**Also valid:**

```bash
npx tsx scripts/blockCategoryReview.ts [seed] [volleyball|basketball|soccer|strength|hypertrophy]
npx tsx scripts/appSessionReview.ts [seed]
npx tsx scripts/appParityRandomizedReview.ts [seed]
npx vitest run logic/workoutGeneration/blockCategoryBehavior.test.ts
npx vitest run logic/workoutGeneration/blockCategoryGeneration.test.ts
```

See `logic/workoutGeneration/BLOCK_CATEGORY_TESTS.md` for block-category test docs (conditioning / accessory / cooldown eligibility and generation scenarios).

Load `.env` via `loadDotEnvFromRepoRoot()` when Supabase catalog is needed; offline static merge is acceptable and matches dev fallback.

## Evaluation rubric (user perspective)

Score each dimension **Good / Mixed / Bad** with 1–2 sentences of evidence.

| Dimension | User question | Red flags |
|-----------|---------------|-----------|
| **Intent fidelity** | Does this session match what I selected (sport, sub-focus, goals)? | Med-ball throws for vertical jump; hypertrophy pump work for repeat-sprint soccer |
| **Exercise validity** | Are these real, do-able exercises? | Names like “Unilateral strength,” “Posterior chain,” intent slugs as `exercise_name` |
| **Modality & body region** | Does movement match body focus and session type? | Rows on lower-body day; heavy isolation on power day |
| **Sport vs bodybuilding tone** | Does it feel like cross-training for my sport? | 4×12 body-part splits, minimal plyo/skill transfer for athletic sub-focus |
| **Prescription appropriateness** | Reps/rest fit the block and goal? | 15-rep squats in power block; 30s rest on heavy strength |
| **Constraints honored** | Injuries, equipment, duration respected? | Knee-sensitive user gets depth jumps; 30 min session runs 75 min of work |

Cross-check every `exercise_id` against the loaded pool. Flag ids **not in catalog** or names that look like ontology/intent labels.

## Output format (mandatory)

```markdown
## Simulation report

### Scenario
[Who this user is, mode, why this scenario was chosen]

### Inputs
- ManualPreferences: ...
- SportGoalContext: ... (or none)
- Gym equipment: ...
- Seed: ...

### Generated workout
[Full blocks: type, exercises, sets×reps/rest]

### User-perspective analysis
- **Good:** ...
- **Bad:** ... (severity: critical / moderate / minor)
- **Overall:** Good | Mixed | Bad

### Issues & fix scope
| Issue | Severity | Suggested fix scope |
|-------|----------|---------------------|
| ... | critical | **global** — affects all vertical_jump |
| ... | minor | **narrow** — basketball-only config |

### Reproduce
`npx tsx ... [seed]`
```

## Codebase map

| Concern | Location |
|---------|----------|
| App entry | `lib/generator.ts` (`generateWorkoutAsync`, `getExercisePoolForManualGeneration`) |
| Adapter | `lib/dailyGeneratorAdapter.ts` (`manualPreferencesToGenerateWorkoutInput`, `SportGoalContext`) |
| Generator | `logic/workoutGeneration/dailyGenerator.ts` |
| Product intent | `docs/WORKOUT_INTENT.md` |
| Session review scripts | `scripts/appSessionReview.ts`, `scripts/appParityRandomizedReview.ts` |
| Research notes | `docs/research/` |

## After the simulation

- If **global** issues: propose one shared helper/config change (see `.cursor/rules/narrow-scope-generalization.mdc`).
- If **narrow**: note rationale per `AGENTS.md`.
- Do **not** open a PR or commit unless the user asks.
