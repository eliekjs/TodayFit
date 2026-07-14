# Sub-goal generation fidelity (all Manual intents)

**Date:** 2026-07-11  
**Subsystem:** Manual goal sub-focus → generated session intent fidelity  
**Scope:** Every active `PRIMARY_FOCUS_OPTIONS` sub-goal; research-backed contracts; generation audit + fixes.

---

## 1. Research question

When a user selects a single sub-goal (e.g. Olympic / Triple extension), does the generated workout maintain that intent — not a near-neighbor substitute (e.g. jump squats for Olympic lifts)?

---

## 2. Sources

| Source | Type | Key claim |
|--------|------|-----------|
| NSCA Position Statement on Weightlifting for Sports Performance (2023) | Tier 1 | Olympic derivatives train loaded triple extension (clean/snatch/jerk/high-pull); distinct from plyometric jump training alone. |
| NSCA Essentials — power / plyometric taxonomy | Tier 1 | Lower-body plyos, upper-body throws, sprint mechanics are separate power qualities. |
| ACSM Guidelines — endurance | Tier 1 | Zone 2 / threshold / intervals are distinct energy-system intents. |
| ExRx / NSCA — strength patterns | Tier 2 | Squat, hinge, horizontal press, vertical press, pull are distinct movement-pattern intents. |
| NCSF — athletic qualities | Tier 2 | Speed, COD, vertical jump, agility as separable athletic emphases. |
| Prior project notes | Internal | `docs/research/goal-sub-goals-audit-2025.md`, olympic triple-extension pool expansion. |

**Classification:** High-confidence for category definitions; context-dependent for exact catalog IDs and intermediate skill gates.

---

## 3. Method

1. **Contracts** — `data/goalSubFocus/subGoalIntentContracts.ts` defines intent summary + matchers (+ weak-proxy anti-patterns) per sub-goal under active primaries.
2. **Harness** — `scripts/auditSubGoalGenerationFidelity.ts` generates one Full-body / 45-min / intermediate / Your Gym session per contract and scores working exercises.
3. **Vitest** — `logic/workoutGeneration/subGoalGenerationFidelity.test.ts` fails CI if any contract fails.

---

## 4. Gaps found and fixes

| Failure | Root cause | Fix |
|---------|------------|-----|
| Olympic starved by plyos / jump proxies | Hard filters + strength modality + OR coverage | Prior PR: olympic shared helpers, intermediate bypass, power-block guarantee, tag cleanup |
| Recovery & Mobility → only 2 stretches | Pattern cap relaxed only for `primary_goal === "recovery"`, adapter uses `recovery_mobility` | Relax pattern cap via `isRecoveryMobilityPrimaryGoal` |
| Lower back recovery → 0 matches | `isRecoveryPrimaryFriendlyExercise` excluded high-warmup spinal mobility (cat-camel, child's pose) | Skip warmup-primary exclusion for mobility/recovery modalities on recovery-primary days |
| OHP matched bench / push-ups | Strength `overhead_press` inferred from any push+shoulders | Tighten to vertical-press identity; exclude bench/floor/push-up |
| Pull matched hinges | `muscles.has("back")` without pull pattern | Exclude hinge/squat/deadlift IDs; require pull pattern for back muscle |

---

## 5. Validation

```bash
npx tsx scripts/auditSubGoalGenerationFidelity.ts
npx vitest run logic/workoutGeneration/subGoalGenerationFidelity.test.ts
npx vitest run logic/workoutGeneration/olympicTripleExtensionGeneration.test.ts
npx vitest run logic/workoutGeneration/cooldownWarmupExclusion.test.ts
```

Expect **65/65** contracts pass on default gym profile (seeded static catalog).

---

## 6. Risks / follow-ups

- Hypertrophy regional matchers remain relatively broad (scoring-oriented); contracts currently require ≥1 regional match, not majority dominance. Tighten to majority/strong-region gates if product wants stricter body-part fidelity.
- T-spine / elbows recovery can still surface multi-region stretches that also touch those areas; optional next pass: prefer exclusive regional targets.
- Advanced-only Olympic snatches remain gated by workout tier (intentional).

## Rollback

Revert `subGoalIntentContracts.ts`, fidelity harness/test, recovery pattern-cap + friendly-gate changes, and strength OHP/pull matcher tightenings.
