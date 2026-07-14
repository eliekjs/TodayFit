# Phase 3 PROOF — Generation fidelity

**Date:** 2026-07-12  
**Ship exit (SHIP_SPEC.md Phase 3):** P05 in fixtures; Manual fidelity green; sport stratified gate green; weighted-alignment wired; pressure top-issues clear.

---

## G3.1 — P05 persona fixtures

**Pass:** `P05` in `PERSONA_FIXTURES` (`mode: "goal_week"`) + `PERSONA_WEEKLY_FIXTURES` day representatives; wired to `personaExpectationContracts`, `singleDayPrefsForPersona` → persona loop / deep analysis.

```bash
rg -n 'id: "P05"|PERSONA_WEEKLY_FIXTURES|goal_week' logic/workoutGeneration/personaSimulationFixtures.ts
npx vitest run logic/workoutGeneration/personaFixtures.test.ts
```

**Result:** 4/4 tests passed. Fixture includes Hypertrophy + Athletic Performance (Speed/Sprint + Vertical jump for power-related intent).

---

## G3.5 — Manual sub-goal fidelity

```bash
npx tsx scripts/auditSubGoalGenerationFidelity.ts
npx vitest run logic/workoutGeneration/subGoalGenerationFidelity.test.ts
```

**Result:**
- Audit: `Contracts: 65 | pass: 65 | fail: 0` — All sub-goal fidelity checks passed.
- Vitest: 2/2 passed (~47s).

---

## G3.2 — Deep-loop top issues non-recurring

Known issues: `leg_press_in_athletic_block`, `zone2_on_power_day`.

**Generator hardening:** leg-press family excluded from `main_strength` / `main_hypertrophy` repair candidates (parallel to existing power-block ban) in `workoutValidator.ts`. Explosive conditioning already prefers non–Zone-2 via `inputPrefersExplosiveConditioningOverSteadyState`.

```bash
npx vitest run logic/workoutGeneration/personaDeepLoopRepro.test.ts
```

**Result:** 1/1 passed (~55s). Across 32 seeds for P01 + P02:
- `p01_any_zoneish: 0`
- `p02_any_leg_press: 0`

---

## G3.4 — Weighted alignment wired

Shared module: `logic/workoutGeneration/weightedAlignmentScoring.ts`  
Consumers: `scripts/personaLoopSimulation.ts`, `logic/workoutGeneration/personaOutputAnalysis.ts` (deep user-flow).  
Docs: `docs/workout-simulation-validation-rules.md` latest review updated.

```bash
npx vitest run logic/workoutGeneration/weightedAlignmentScoring.test.ts
```

**Result:** 3/3 passed. Checks: `weighted_alignment_primary|order|tolerance|minimum_presence`.

---

## G3.3 — Sport stratified FAMILY fidelity

Contracts: `data/sportSubFocus/sportFamilyIntentContracts.ts` (6 families).  
Research note: `docs/research/sport-family-generation-fidelity-2026-07.md`.

```bash
npx tsx scripts/auditSportSubGoalGenerationFidelity.ts
npx vitest run logic/workoutGeneration/sportSubGoalGenerationFidelity.test.ts
```

**Result:**
- Audit: `Families: 6 | cells: 52 | pass: 52 | fail: 0`
- Vitest: 2/2 passed (~36s)
- Stratification: category × flagship sub-focus × {your_gym, hotel_gym} × seeds `{88042, 99002}`

Families: jump_power, change_of_direction, speed_sprint, pull_grip, endurance_prep, stability_prehab.

---

## Aggregate vitest (Phase 3 gate)

```bash
npx vitest run \
  logic/workoutGeneration/personaFixtures.test.ts \
  logic/workoutGeneration/weightedAlignmentScoring.test.ts \
  logic/workoutGeneration/personaDeepLoopRepro.test.ts \
  logic/workoutGeneration/sportSubGoalGenerationFidelity.test.ts \
  logic/workoutGeneration/subGoalGenerationFidelity.test.ts
```

**Result:** `Test Files  5 passed (5)` · `Tests  12 passed (12)`

---

## Gap register

`docs/SHIP_GAP_REGISTER.md` — G3.1–G3.5 marked **done**.
