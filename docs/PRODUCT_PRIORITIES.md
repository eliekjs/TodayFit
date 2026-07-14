# Product priorities & spec alignment

**Audience:** product, QA, and agents deciding *what to test first*, *what "done" means*, and *how the shipped app differs from the original spec*.

**Related docs:** [USER_PERSONAS.md](./USER_PERSONAS.md), [WORKOUT_INTENT.md](./WORKOUT_INTENT.md), [workout-simulation-validation-rules.md](./workout-simulation-validation-rules.md).

**Source:** TodayFit base document (Feb 2026), reconciled with the codebase as of mid-2026.

**Ship bar:** [SHIP_SPEC.md](./SHIP_SPEC.md) · **Gap register:** [SHIP_GAP_REGISTER.md](./SHIP_GAP_REGISTER.md)

---

## Product thesis (unchanged)

TodayFit is a **training decision engine**: reduce cognitive load while aligning gym work to goals, sport, equipment, energy, and injuries. The best session is the one that fits **today's** constraints—not a rigid annual plan.

**Positioning (from spec, still valid):**

- For athletic, thoughtful users balancing sport and gym
- For people who want structure without rigidity or analysis paralysis
- **Not** for meet-prep powerlifting or lab-grade periodization ([WORKOUT_INTENT.md](./WORKOUT_INTENT.md))

---

## Shipped vs original spec

### Built and in active use

| Area | Spec vision | Current implementation | Code / UI anchor |
|------|-------------|------------------------|------------------|
| **Entry** | Two top-level intents | **Two gym flows** on Today hub: Goal-Oriented Training, Sport-Focused Training | `app/(tabs)/index.tsx` |
| **Scopes** | Daily focus | **One day** + **This week** per flow | `SessionFlow`: `goal_day`, `goal_week`, `sport_day`, `sport_week` |
| **Goals** | Primary + secondary + sub-goals | Up to **3 ranked goals**, sub-goals per goal (cap 5 total sub-goals; shared with Sport Mode) | `ManualPreferences`, `PRIMARY_FOCUS_OPTIONS`, `lib/selectionCaps.ts` |
| **Sport prep** | Sport-specific training | **Sport-Focused Training** with sport slugs, sub-focuses, optional additional goals, sport vs goal blend | `app/(tabs)/sport-mode/`, `data/sportSubFocus/` |
| **Equipment** | Multiple equipment profiles | **Gym profiles** (6 space types), active profile drives generation | `data/gymProfiles.ts`, Profiles tab |
| **Constraints** | Injuries, duration, energy | Joint injury chips, duration 20–75, energy Low/Medium/High, body focus Upper/Lower/Full + modifiers | `lib/preferencesConstants.ts` |
| **Workout structure** | Warmup → main → conditioning → cooldown | Block types via `dailyGenerator` (warmup, main_strength, main_hypertrophy, conditioning, cooldown) | `logic/workoutGeneration/dailyGenerator.ts` |
| **Scoring engine** | Filter → score → assemble | Constraint resolution, sub-focus profiles, sport profiles, tag scoring | `logic/workoutGeneration/`, `docs/SUB_FOCUS_ARCHITECTURE.md` |
| **Regeneration** | Full / block / exercise swap | Workout regenerate, per-exercise swap in execute | `app/(tabs)/manual/workout.tsx`, `execute.tsx` |
| **Presets** | Saved preferences | Goal presets + Sport presets; home quick-apply | `PreferencePreset`, `SportPreset` |
| **Train today** | Quick daily session | One-tap from home using **default preset** + active gym | `runTrainToday` in `index.tsx` |
| **History** | — | Workout history, saved workouts, execution progress feed personalization | `docs/PHASE11_HISTORY_AND_PERSONALIZATION.md` |

### Partially built

| Area | Spec vision | Gap | Priority to close |
|------|-------------|-----|-------------------|
| **Auth / sync** | User profile + cloud save | Email/password auth + session storage + RLS verified. Account wipe deletion in-app; apply `delete_own_account` SQL for hard auth.users delete. See [SHIP_SPEC.md](./SHIP_SPEC.md) / [docs/ship/phase1-PROOF.md](./ship/phase1-PROOF.md). | P1 — dashboard SQL apply residual |
| **Upcoming events** | Region + demand type + days-away buckets | Simple chips: Long Run, Ski Day, Climbing Day, etc. | P2 — deepen event→body-region load management |
| **Onboarding** | Multi-step goals → equipment → constraints | Welcome screen only; setup happens in-flow | P2 — optional first-run wizard |
| **Superset preference** | Yes / Neutral / Minimal explicit toggle | Influenced via workout style, block format logic | P2 |
| **Workout style** | Functional, compound, CF-style, etc. | `WORKOUT_STYLE_OPTIONS` — wiring varies by goal | P1 — verify transfer per persona |
| **Upcoming + sport week** | Event-aware weekly plan | Sport week exists; event modifier lighter than spec | P2 |

### Not built (defer or reject)

| Area | Spec vision | Decision |
|------|-------------|----------|
| **"Help me decide activity"** | Climb vs run vs yoga vs gym | **Deferred** — app is gym-workout-first; see anti-persona X03 |
| **Activity decision engine** | Recommend best non-gym activity | **Deferred** |
| **Full onboarding fork** | Default home = activity vs gym | **Deferred** — both cards are gym paths |
| **Meet-prep powerlifting** | Max S/B/D | **Rejected** per WORKOUT_INTENT |
| **Coach-grade periodization UI** | Lab-style blocks/macrocycles | **Rejected** as primary UX |

---

## Priority tiers for testing

Use these tiers when planning QA, simulations, or agent validation runs. **P0 failures block release judgment** for the affected flow.

### P0 — Core promise (must pass every release)

**User expectation:** "The workout matches what I selected and I can do it with my gym."

| # | Capability | Personas | Validation |
|---|------------|----------|------------|
| 1 | Equipment filter hard-excludes infeasible exercises | P07, all | `filter_transfer_equipment` |
| 2 | Injury / constraint filter | P10, all | `filter_transfer_injuries_constraints` |
| 3 | Body focus (Upper/Lower/Full + modifiers) | P01, P06 | `filter_transfer_body_focus` |
| 4 | Sport sub-focus → athletic exercise selection | P01, P02, P04 | Intent fidelity rubric; sport profile tests |
| 5 | Goal + sub-goal structure in manual mode | P05, P06, P08 | `structure_matches_primary_intent`, weekly coverage |
| 6 | Duration & energy sanity | P09, all | `filter_transfer_duration`, `filter_transfer_energy` |
| 7 | Exercise catalog validity (real names, valid IDs) | all | User-simulation harness catalog check |
| 8 | End-to-end smoke | all | [qa/ui-flow-pass-checklist.md](./qa/ui-flow-pass-checklist.md) |

**Commands (regression bundle):**

```bash
npx tsx .cursor/skills/workout-user-simulation-agent/scripts/runUserSimulation.ts 88042 basketball
npx tsx .cursor/skills/workout-user-simulation-agent/scripts/runWeeklyGoalSimulation.ts A
npx tsx scripts/jointHealthUserSim.ts
npx tsx scripts/workoutGenerationSimulationValidation.ts
```

### P1 — Differentiation (should pass; regressions are high severity)

**User expectation:** "This feels like cross-training for my sport/life, not a generic template."

| # | Capability | Personas | Notes |
|---|------------|----------|-------|
| 1 | Sport vs bodybuilding tone | P01, P04 | No pure bro-split for athletic sub-focus |
| 2 | Multi-sport blend | P02 | `sport_focus_pct` honored |
| 3 | Weekly goal dedication & sub-focus coverage | P05 | Day titles, `weeklySubFocusCoverage` |
| 4 | Prescription fit (reps/rest vs block type) | P01, P06 | Power vs hypertrophy vs conditioning |
| 5 | Weighted goal alignment (multi-goal days) | P05, P06 | `weighted_alignment_*` checks |
| 6 | Train today parity with full flow | P09 | Same inputs → comparable quality |
| 7 | Gym profile switch actually changes output | P07 | Hotel vs full gym diff |
| 8 | Presets round-trip | P05, P09 | Save → apply → generate |
| 9 | Workout tier / experience filter | all | `filter_transfer_user_level` |

### P2 — Polish & spec carryover (important but not blocking)

| # | Capability | Notes |
|---|------------|-------|
| 1 | Upcoming event chips affect session load | Ski Day, Long Run, etc. |
| 2 | Zone 2 cardio preference | `preferredZone2Cardio` for recomp/endurance |
| 3 | Workout style preferences | Compound Strength, CF-style, etc. |
| 4 | History-based personalization | Exposure caps, name bias |
| 5 | Sport week schedule + recommendations | Full week UI path |
| 6 | Block/exercise regeneration quality | Swap pool relevance |
| 7 | Creative variations toggle | `includeCreativeVariations` |

### P3 — Future / spec backlog

- Activity-type decision fork (climb vs run vs gym)
- Rich upcoming-event model (region + demand + days-away scoring from spec §4–5)
- Explicit superset preference (Yes / Neutral / Minimal)
- First-run onboarding wizard mirroring spec steps 1–5

---

## Feature → output expectations matrix

When judging whether a **feature is working**, use this matrix with the linked persona.

| Feature | User-facing surface | If working, user sees… | Primary persona | Test hook |
|---------|---------------------|-------------------------|-----------------|-----------|
| Sport sub-focus | Sport mode chips | Exercises match jump/sprint/COD/etc. | P01 | `runUserSimulation.ts basketball` |
| Multi-sport | 2 sport picks + % split | Blend of both sports' patterns | P02 | `sport_max` scenario |
| Goal sub-focus | Manual preferences | Blocks biased to squat, glutes, HIIT, etc. | P05, P06 | `runWeeklyGoalSimulation.ts` |
| Dedicated week days | Week flow | Different goal emphasis per day | P05 | Weekly scenario A/B/C |
| Gym profile | Profiles tab | Different exercises when switching gym | P07 | `hotel_gym` template |
| Injury filter | Constraints / sport injuries | No flagged joint stress | P10 | Manual + sport injury chips |
| Joint health goal | Primary focus | Activation → strength → mobility arc | P08 | `jointHealthUserSim.ts` |
| Climbing profile | `rock_climbing` | Pull/grip/scap; no leg-press dominance | P04 | `sportProfileEngine.test.ts` |
| Train today | Home CTA | Fast session from default preset | P09 | UI checklist Phase B |
| Presets | Presets screen | One-tap restore of complex setup | P05 | Save/apply preset E2E |

---

## Goal catalog (current vs spec)

### Active primary goals (`PRIMARY_FOCUS_OPTIONS`)

| Goal | Spec equivalent | Notes |
|------|-----------------|-------|
| Build Strength | Build Strength | Sub-goals in `data/goalSubFocus/` |
| Build Muscle (Hypertrophy) | Build Muscle | |
| Body Recomp (fat loss & muscle gain) | Physique / body comp | Added post-spec |
| Improve Endurance | Improve Endurance | |
| Recovery & Mobility | Recovery / Mobility & Joint Health | Consolidated label |
| Athletic Performance | Athletic Performance + parts of Sport Conditioning / Power | Absorbed legacy goals |
| Calisthenics | Calisthenics Mastery | |
| Strength Training for Joint Health | Mobility & Joint Health (subset) | Distinct goal with joint sub-goals |

### Legacy (presets / slug aliases only)

- `Sport Conditioning` → use Athletic Performance or Sport mode
- `Power & Explosiveness` → Athletic Performance sub-focus or sport sub-focus

### Sport catalog

Sports with sub-focus UI: see `data/sportSubFocus/sportsWithSubFocuses.ts` (mountain/snow, climbing, endurance, field/court, combat, hybrid, etc.). Spec examples like "ski prep" and "climbing" map directly to **P03** and **P04**.

---

## Decision guide for contributors

When choosing between implementations, prefer the option that:

1. **Passes P0** for the affected persona(s)
2. **Improves P1 differentiation** (sport tone, sub-focus fidelity, constraint respect)
3. **Generalizes** across parallel sports/goals (see `.cursor/rules/narrow-scope-generalization.mdc`)
4. Does **not** optimize for anti-personas X01–X04

When a spec feature is **not built** (activity fork, rich upcoming events), do not fail generation QA for lacking it—track under P3 instead.

---

## Document maintenance

Update this file when:

- A deferred spec item ships (move row from "Not built" → "Built")
- A new persona is added to [USER_PERSONAS.md](./USER_PERSONAS.md)
- Priority tier changes based on user feedback or launch goals
