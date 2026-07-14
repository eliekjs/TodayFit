# Workout intent (product scope)

**Audience:** autonomous agents and contributors who need a shared picture of who TodayFit is for and what “good” output means in this codebase.

This doc is the **canonical product intent** for workout generation and related exercise data. When research, logic, or enrichment work could go in more than one direction, align with this file unless a human run brief says otherwise.

**Companion docs (testing & design):**

- [USER_PERSONAS.md](./USER_PERSONAS.md) — ten reference personas with fixtures, success criteria, and reproduce commands
- [PRODUCT_PRIORITIES.md](./PRODUCT_PRIORITIES.md) — shipped vs spec, P0–P3 test priorities, feature matrix
- [workout-simulation-validation-rules.md](./workout-simulation-validation-rules.md) — quantitative scoring rubric

---

## Product in one sentence

TodayFit builds **gym workouts** that match the user’s sport and/or goals, equipment, body focus, energy, and injuries—so sport-focused athletes can cross-train efficiently without inventing every session from scratch.

---

## Who the app is for

- **Sport-focused athletes cross-training in the gym** — gym work supports their sport; the app is not only “general fitness.”
- **People who want less decision burden at the gym** — they do not want to show up and invent the session from scratch every time, and they are not necessarily following a huge, rigid external protocol.
- **People who already know a fair amount about training** — they are not complete beginners, but they want **more structure and fewer decisions** made for them (exercise selection, ordering, volume cues within reason).
- **People balancing multiple goals** — e.g. sport performance plus muscular or body-composition goals, or several priorities at once.
- **People managing real-world constraints** — including **injuries or nagging issues** alongside their goals, and **changing context** (different gyms, equipment, travel, schedule). The product should tolerate **variable inputs** without requiring a perfect static setup.

**Canonical personas:** See [USER_PERSONAS.md](./USER_PERSONAS.md) (P01–P10). Use persona IDs in bug reports and simulation notes.

---

## Who the app is not for

- **Competitive powerlifting** or a primary focus on **maximizing specific competition lifts** (squat, bench, deadlift as sport) with meet-style progression.
- **Highly technical, coach-grade periodization** as the main experience — this is **not** positioned as a lab-style or elite technical training system.
- **Users who only want "should I climb, run, or rest today?"** without a gym workout — the original spec’s activity-decision fork is **not shipped**; both primary flows produce gym sessions.

**Anti-personas:** X01–X04 in [USER_PERSONAS.md](./USER_PERSONAS.md).

---

## Current product surfaces (what exists today)

The Feb 2026 spec described a fork: *"Help me decide what activity to do"* vs *"Build me a gym workout."* The shipped app is **gym-workout-first** with two parallel builders:

| Surface | User question | Scope | Route |
|---------|---------------|-------|-------|
| **Goal-Oriented Training** | What gym work fits my strength/physique/endurance/mobility goals? | One day · This week | `/manual/preferences` |
| **Sport-Focused Training** | What gym work supports my sport(s)? | One day · This week | `/sport-mode` |
| **Train today** | Same as last time, fast (default preset) | One day | Home (`/`) |
| **Presets** | Save / switch / manage setups; set Train today default | Day or week | `/presets` |
| **Gym profiles** | What equipment do I have here? | Persistent | Profiles tab |

Week planning dedicates days to goals or spreads sport prep across the week. Sub-goals (per goal or per sport) are the **primary semantic target** for generation when present.

---

## What “good output” means

Judge generated workouts on these dimensions. Each maps to checks in [workout-simulation-validation-rules.md](./workout-simulation-validation-rules.md) and qualitative notes in the user-simulation skill.

| Dimension | Question | Bad signal |
|-----------|----------|------------|
| **Intent fidelity** | Does the session match selected sport sub-focus / goal sub-goals? | Jump day with no plyo/power; soccer sprint day filled with arm isolation |
| **Exercise validity** | Real exercises with valid catalog IDs? | Ontology labels as names; missing pool entries |
| **Modality & body region** | Movement matches body focus and block type? | Rows on lower day; isolation on power day |
| **Sport vs bodybuilding tone** | Cross-training for sport, not bro-split? | 4×12 pump work for `vertical_jump` |
| **Prescription fit** | Reps/rest match block and goal? | 15-rep squats in power block; 30s rest on heavy strength |
| **Constraints honored** | Equipment, injuries, duration, energy? | Barbell moves in hotel gym; knee-flagged exercises with knee injury |
| **Weighted alignment** | Multi-goal: does priority match workout share? | Tertiary goal dominates session |

**Hard rule:** Any P0 failure in [PRODUCT_PRIORITIES.md](./PRODUCT_PRIORITIES.md) overrides a high qualitative score.

---

## Implications for agents

- Prefer **practical, adaptable** prescriptions and exercise choices over **lift-specific peaking** or meet-prep framing.
- Favor **constraint-aware** behavior (equipment variance, injuries, mixed goals) over optimizing for a single abstract strength number on a fixed lift.
- Keep tone and complexity **accessible** — structured and evidence-informed where the codebase requires it, without presenting the product as a specialist technical coaching platform.
- When validating changes, **name the persona** (P01–P10) and run the linked reproduce command from [USER_PERSONAS.md](./USER_PERSONAS.md).
- Sub-goals outrank parent goal labels for evaluation when both exist ([SUB_FOCUS_ARCHITECTURE.md](./SUB_FOCUS_ARCHITECTURE.md)).

---

## Repository map (onboarding)

**App shell (Expo Router):** `app/` — root `app/_layout.tsx` wraps providers; `app/(tabs)/_layout.tsx` registers tabs and hidden manual/adaptive flow routes; header chrome lives in `app/navigation/tabFlowChrome.tsx`.

**Global UI state:** `context/AppStateContext.tsx` (hydration from Supabase via `context/loadRemoteAppState.ts`); adaptive setup shape and manual defaults in `context/appStateModel.ts`.

**Generation (manual):** Screens call `lib/loadGeneratorModule()` → `lib/generator.ts` → `logic/workoutGeneration/dailyGenerator.ts`. Shared DB exercise-name bias: `lib/manualPreferredExerciseNames.ts`. Sport prep: `services/workoutBuilder/index.ts` with the same dynamic import.

**Heavy domain logic:** `logic/workoutIntelligence/` and `logic/workoutGeneration/` — change only with tests per `AGENTS.md`. Historical snapshots live under `archive/` (TypeScript excludes them; `.cursorignore` hides them from Cursor).

**Persona / QA harnesses:**

- `.cursor/skills/workout-user-simulation-agent/scripts/runUserSimulation.ts`
- `.cursor/skills/workout-user-simulation-agent/scripts/runWeeklyGoalSimulation.ts`
- `scripts/jointHealthUserSim.ts`
- `scripts/workoutGenerationSimulationValidation.ts`

---

## Baseline checks (performance and regressions)

- **Web load:** Chrome DevTools → Performance or Lighthouse on a production export (`npx expo export --platform web`) after meaningful bundle changes; compare JS parse and LCP when possible.
- **Native:** Expo dev client + Hermes sampling for cold start after navigation-heavy changes.
- **Manual smoke (no automated substitute):** Welcome → Today; Build workout one-day → workout → execute; week flow; Sport Mode → schedule → recommendation; Library save/remove; Gym profile switch. See [qa/ui-flow-pass-checklist.md](./qa/ui-flow-pass-checklist.md).
- **Persona regression bundle (P0):** See commands in [PRODUCT_PRIORITIES.md](./PRODUCT_PRIORITIES.md) § P0.
