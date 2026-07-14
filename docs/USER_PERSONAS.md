# User personas (canonical)

**Audience:** product, QA, agents, and contributors who need a shared vocabulary for *who* uses TodayFit and *what good output looks like* for each user type.

**Related docs:** [WORKOUT_INTENT.md](./WORKOUT_INTENT.md) (product scope), [PRODUCT_PRIORITIES.md](./PRODUCT_PRIORITIES.md) (feature maturity & test priority), [workout-simulation-validation-rules.md](./workout-simulation-validation-rules.md) (scoring rubric).

**Source:** Derived from the original product spec (Feb 2026 base document), updated for the **shipped app** as of mid-2026: Goal-Oriented Training, Sport-Focused Training, gym profiles, presets, week planning, and the `dailyGenerator` path.

---

## How to use these personas

1. **Pick one persona** before reviewing generation output or running a simulation.
2. **Load the fixture** (inputs below) into `runUserSimulation.ts`, `runWeeklyGoalSimulation.ts`, or the in-app flow.
3. **Score output** against that persona's *Success criteria* and the global rubric in `workout-simulation-validation-rules.md`.
4. **File bugs** with persona ID (e.g. `P01`) so regressions map back to user expectations.

Personas are **not** stored in the app binary today. They are **reference profiles** for testing and design decisions. Users can approximate them via gym profiles + goal/sport presets.

---

## Anti-personas (explicitly out of scope)

Do **not** use these as acceptance targets. Failures for anti-personas are acceptable.

| ID | Who | Why out of scope |
|----|-----|------------------|
| **X01** | Competitive powerlifter peaking for a meet | Not in [WORKOUT_INTENT.md](./WORKOUT_INTENT.md); no meet-prep periodization |
| **X02** | Complete training beginner needing education | App assumes baseline gym literacy |
| **X03** | "Help me decide: climb vs run vs gym" user | Original spec fork **not built**; app is gym-workout-first |
| **X04** | Bodybuilder-only bro-split maximalist | Sport-cross-training tone is core; pure isolation splits are a mismatch |

---

## Persona summary

| ID | Name | Primary mode | Defining constraint | Test priority |
|----|------|--------------|---------------------|---------------|
| **P01** | Maya — In-season court athlete | Sport · one day | Vertical jump / repeat sprint | P0 |
| **P02** | Morgan — Multi-sport blend | Sport · one day | 2 sports + sub-focus blend | P0 |
| **P03** | Riley — Outdoor endurance prep | Sport · week | Ski / trail / climb sub-focus | P0 |
| **P04** | Sam — Climber cross-training | Sport · one day | Pull / finger / shoulder health | P1 |
| **P05** | Jordan — Multi-goal week planner | Goal · week | 3 ranked goals, dedicated days | P0 |
| **P06** | Casey — Physique + performance | Goal · one day | Hypertrophy + athletic sub-goals | P1 |
| **P07** | Alex — Traveling athlete | Either · one day | Hotel gym equipment | P0 |
| **P08** | Taylor — Joint-health focus | Goal · one day | Joint-health sub-goal | P1 |
| **P09** | Chris — Train-today habitual | Goal · one day | Default preset, one-tap home | P1 |
| **P10** | Drew — Managing injury | Sport · one day | Injury status + types | P0 |

---

## P01 — Maya (in-season court athlete)

**Story:** Plays basketball in season. Wants gym work that transfers to jumping and change of direction—not a bodybuilding pump day.

**Typical path:** Home → Sport-Focused Training → One day → sport + sub-focus → workout → execute.

### Inputs (fixture)

| Dimension | Value |
|-----------|--------|
| Mode | `sport_day` |
| Sport | `basketball` |
| Sub-focus | `vertical_jump` |
| Body bias | Lower |
| Duration | 45 min |
| Energy | Medium |
| Injuries | No restrictions |
| Gym | Full Commercial Gym (`your_gym` template) |
| Workout tier | intermediate |

### Success criteria

- **Intent:** Plyometric / power / jump-transfer work; not 4×12 isolation body-part filler.
- **Tone:** Athletic cross-training, not competitive bodybuilding.
- **Body region:** Lower-body emphasis respected in main blocks.
- **Prescription:** Power-appropriate reps/rest in main work (not 15-rep squats in power blocks).
- **Equipment:** All exercises feasible in full gym.

### Failure signals

- Med-ball-only session with no jump/plyo pattern.
- Heavy upper-body hypertrophy on a lower day.
- Exercise names that look like ontology labels ("Posterior chain", "Unilateral strength").

### Reproduce

```bash
npx tsx .cursor/skills/workout-user-simulation-agent/scripts/runUserSimulation.ts 88042 basketball
```

---

## P02 — Morgan (multi-sport blend)

**Story:** Plays basketball and soccer in overlapping seasons. Needs the generator to honor **both** sports and multiple sub-focuses without collapsing to one sport's defaults.

**Typical path:** Sport mode → max picks (2 sports, multiple sub-focuses) → one day.

### Inputs (fixture)

| Dimension | Value |
|-----------|--------|
| Mode | `sport_day` |
| Sports | `basketball`, `soccer` |
| Sub-focus | `vertical_jump`, `change_of_direction` (basketball); `speed` (soccer) |
| Sport focus split | 60% / 40% |
| Body bias | Lower |
| Duration | 45 min |
| Gym | Full Commercial Gym |

### Success criteria

- Both sports influence exercise selection (not 100% basketball).
- COD / sprint / jump patterns present; no single-sport drowning unless split is extreme.
- `filter_transfer_sport_or_goal_context` passes.

### Reproduce

```bash
npx tsx .cursor/skills/workout-user-simulation-agent/scripts/runUserSimulation.ts 99002 sport_max
```

---

## P03 — Riley (outdoor endurance prep)

**Story:** Trains for trail running, skiing, or hiking. Gym supports eccentric strength, durability, and sport-specific energy systems—not generic hypertrophy.

**Typical path:** Sport-Focused Training → This week → schedule → per-day recommendations.

### Inputs (fixture)

| Dimension | Value |
|-----------|--------|
| Mode | `sport_week` |
| Sport (pick one per run) | `trail_running`, `alpine_skiing`, or `backcountry_skiing` |
| Sub-focus (examples) | `eccentric_control` + `knee_resilience` (ski); `uphill_endurance` (trail) |
| Duration | 45–60 min |
| Gym | Full Commercial Gym or Home Setup |

### Success criteria

- Week structure rotates sensibly; day titles reflect sport prep intent.
- Ski/trail: eccentric quad, stability, durability patterns where sub-focus demands it.
- No leg-press / machine-isolation dominance for climbing-oriented prep (see sport profile bans).

### Reproduce

- UI: Sport mode week flow (`/sport-mode` → schedule).
- Logic examples: `logic/workoutIntelligence/weekly/weeklyPlanExamples.ts` (climbing, skiing).

---

## P04 — Sam (climber cross-training)

**Story:** Climber using the gym for pull strength, finger work, antagonist balance, and shoulder health—**not** leg hypertrophy.

**Typical path:** Sport · one day → `rock_climbing` + pull / finger / shoulder sub-focus.

### Inputs (fixture)

| Dimension | Value |
|-----------|--------|
| Mode | `sport_day` |
| Sport | `rock_climbing` |
| Sub-focus | `pull_strength`, `finger_strength`, or `shoulder_stability` |
| Body bias | Upper or Full |
| Gym | Full Commercial Gym (pull-up bar required) |

### Success criteria

- Vertical pull, scapular control, core tension, antagonist push balance.
- **Avoid:** leg-press family, heavy lower-only hypertrophy (hard/soft bans per sport profile).
- Grip-heavy work capped appropriately when finger sub-focus is selected.

### Reproduce

```bash
npx tsx scripts/blockCategoryReview.ts [seed] climbing
```

---

## P05 — Jordan (multi-goal week planner)

**Story:** Knowledgeable lifter with three simultaneous goals (e.g. hypertrophy + athletic + power). Expects **dedicated days** and sub-focus coverage across the week—not everything crammed into each session.

**Typical path:** Goal-Oriented Training → This week → pick days → per-day focus → week view.

### Inputs (fixture)

Use weekly simulation scenarios **A**, **B**, or **C**:

| Scenario | Goals | Sub-goals |
|----------|-------|-----------|
| **A** | Hypertrophy, Athletic Performance, Power & Explosiveness | Glutes; Speed/Sprint; Vertical jump |
| **B** | Build Strength, Sport Conditioning, Mobility & Joint Health | Squat; Intervals/HIIT; Hips |
| **C** | Calisthenics, Hypertrophy, Athletic Performance | Handstand; Back; Agility/COD |

Common settings: `goalDistributionStyle: dedicate_days`, 4 training days (Mon/Tue/Thu/Fri), 45 min, full gym.

### Success criteria

- Each sub-goal appears across the week (coverage target ≥ 3 matches per sub-focus where implemented).
- Day titles and block labels reflect the dedicated goal for that day.
- Primary sub-goal dominates **within** each day; weekly mix matches ranked goals.
- No duplicate main compound lifts across the week where avoidance is wired.

### Reproduce

```bash
npx tsx .cursor/skills/workout-user-simulation-agent/scripts/runWeeklyGoalSimulation.ts A
npx tsx .cursor/skills/workout-user-simulation-agent/scripts/runWeeklyGoalSimulation.ts all
```

---

## P06 — Casey (physique + performance)

**Story:** Wants muscle in specific areas **and** athletic transfer. Represents the spec's "balancing multiple goals" user—without sport mode.

**Typical path:** Goal · one day → multiple goals or hypertrophy lower + glutes/legs sub-focus.

### Inputs (fixture)

| Dimension | Value |
|-----------|--------|
| Mode | `goal_day` |
| Goals | `Build Muscle (Hypertrophy)` |
| Sub-focus | `Glutes`, `Legs` |
| Body | Lower |
| Duration | 45 min |
| Gym | Full Commercial Gym |

### Success criteria

- Hypertrophy-appropriate volume (6–12 rep main work, reasonable rest).
- Lower-body region honored; compounds + isolation mix—not random upper fill.
- Still **practical** session structure (warmup → main → accessory/cooldown), not junk volume.

### Reproduce

```bash
npx tsx .cursor/skills/workout-user-simulation-agent/scripts/runUserSimulation.ts 92008 hypertrophy_lower
```

---

## P07 — Alex (traveling athlete)

**Story:** On the road with a hotel gym. Any mode; equipment is the binding constraint.

**Typical path:** Profiles → switch to Hotel Gym → generate from saved sport or goal preset.

### Inputs (fixture)

| Dimension | Value |
|-----------|--------|
| Gym template | `hotel_gym` (dumbbells, treadmill, bands, bodyweight) |
| Mode | Any (sport or goal) |
| Duration | 30–45 min |

### Success criteria

- **Zero** exercises requiring barbell, squat rack, cables, or machines not in hotel profile.
- Sensible substitutions (DB, band, bodyweight)—not empty or repetitive 3-exercise sessions.
- `filter_transfer_equipment` always passes.

### Reproduce

- Set `gym.equipment` to `getDefaultEquipmentForTemplate("hotel_gym")` in any simulation script.

---

## P08 — Taylor (joint-health focus)

**Story:** Uses gym for durable joints (knee, shoulder, hip, etc.)—activation → controlled strength → stability → mobility. Not maximal loading.

**Typical path:** Goal · one day → `Strength Training for Joint Health` + one sub-focus.

### Inputs (fixture)

| Dimension | Value |
|-----------|--------|
| Mode | `goal_day` |
| Goal | `Strength Training for Joint Health` |
| Sub-focus | One of: Knee Health, Shoulder Health, Hip Health, Ankle & Foot Health, Back & Spine Health, Elbow/Wrist Health |
| Duration | 45 min |
| Energy | Medium |
| Gym | Full Commercial Gym |

### Success criteria

- Session structure: activation warmup → controlled strength → stability/unilateral → mobility cooldown.
- No high-impact plyometrics or heavy spinal loading for joint-health sessions.
- Exercises tagged / reasoned for joint-health intent.

### Reproduce

```bash
npx tsx scripts/jointHealthUserSim.ts
```

---

## P09 — Chris (train-today habitual)

**Story:** Same goals and gym most days. Saves that setup as a **default preset** and uses **Train today** on the home screen for speed; expects output consistent with that preset.

**Typical path:** Home → Train today (default preset) → workout (no re-entry through full preferences). Switch default from the home block or Presets when the habit changes.

### Inputs (fixture)

| Dimension | Value |
|-----------|--------|
| Mode | `goal_day` (implicit via default goal preset) |
| Default preset | Goal preset whose `preferences` match saved intent; duration defaults to 45 if unset |
| Gym | Active gym profile |
| History | Optional—personalization may bias exercise names |

### Success criteria

- Generation completes without requiring preference re-entry.
- Output reflects the default preset’s primary (and secondary) goals.
- Duration within tolerance of preset or default 45 min.
- No regression vs full preferences flow for the same inputs.

### Reproduce

- UI smoke: [qa/ui-flow-pass-checklist.md](./qa/ui-flow-pass-checklist.md) Phase B (Train today).
- Code path: `app/(tabs)/index.tsx` → default preset → `runTrainToday` → `generateWorkoutAsync`.

---

## P10 — Drew (managing injury)

**Story:** Sport-focused but training around a nagging shoulder, knee, or back. Expects **hard exclusion** of contraindicated patterns.

**Typical path:** Sport mode → injury status **Managing** or **Rebuilding** → injury types → generate.

### Inputs (fixture)

| Dimension | Value |
|-----------|--------|
| Mode | `sport_day` |
| Sport | Any (e.g. `soccer`) |
| Injury status | Managing |
| Injury types | e.g. `Knee`, `Shoulder` |
| Gym | Full Commercial Gym |

### Success criteria

- `filter_transfer_injuries_constraints` passes.
- No exercises with matching `joint_stress_tags` / contraindications for selected areas.
- Session still usable (not empty)—alternatives within pool.

### Reproduce

- UI: Sport mode injury chips + `CONSTRAINT_OPTIONS` in manual mode.
- Adapter: `injurySlugsFromManualPreferences` → pool filter.

---

## Spec → persona mapping (what changed)

| Original spec (Feb 2026) | Current app | Persona impact |
|--------------------------|-------------|----------------|
| Fork: "Help me decide activity" vs "Build gym workout" | **Gym only:** Goal-Oriented + Sport-Focused cards | X03 removed; all personas are gym-workout paths |
| Onboarding wizard (goals → equipment → constraints) | Welcome + in-flow setup; gym on Profiles tab | Personas assume user **can** configure gym; no dedicated onboarding persona |
| Primary goals: Sport Conditioning, Power & Explosiveness standalone | Legacy labels; merged into Athletic Performance / sport sub-focus | P05/P06 use current `PRIMARY_FOCUS_OPTIONS` |
| Upcoming event: region + demand + days bucket | Simpler `UPCOMING_OPTIONS` (Ski Day, Long Run, …) | Not a dedicated persona yet—fold into P03 when upcoming wiring deepens |
| Activity decision output (climb vs run vs rest) | Not built | X03 |
| Regenerate block / exercise with 3 swaps | Built in manual workout + execute | All personas benefit; P01/P06 most sensitive |

---

## Adding a new persona

1. Confirm the user fits [WORKOUT_INTENT.md](./WORKOUT_INTENT.md) (not an anti-persona).
2. Assign ID `P11+`, mode, fixture table, success criteria, failure signals.
3. Add a reproducible script or seed to `runUserSimulation.ts` / weekly harness if automated.
4. Set test priority in [PRODUCT_PRIORITIES.md](./PRODUCT_PRIORITIES.md).
