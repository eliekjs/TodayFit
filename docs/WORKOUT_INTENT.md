# Workout intent (product scope)

**Audience:** autonomous agents and contributors who need a shared picture of who TodayFit is for and what “good” output means in this codebase.

This doc is the **canonical product intent** for workout generation and related exercise data. When research, logic, or enrichment work could go in more than one direction, align with this file unless a human run brief says otherwise.

---

## Who the app is for

- **Sport-focused athletes cross-training in the gym** — gym work supports their sport; the app is not only “general fitness.”
- **People who want less decision burden at the gym** — they do not want to show up and invent the session from scratch every time, and they are not necessarily following a huge, rigid external protocol.
- **People who already know a fair amount about training** — they are not complete beginners, but they want **more structure and fewer decisions** made for them (exercise selection, ordering, volume cues within reason).
- **People balancing multiple goals** — e.g. sport performance plus muscular or body-composition goals, or several priorities at once.
- **People managing real-world constraints** — including **injuries or nagging issues** alongside their goals, and **changing context** (different gyms, equipment, travel, schedule). The product should tolerate **variable inputs** without requiring a perfect static setup.

---

## Who the app is not for

- **Competitive powerlifting** or a primary focus on **maximizing specific competition lifts** (squat, bench, deadlift as sport) with meet-style progression.
- **Highly technical, coach-grade periodization** as the main experience — this is **not** positioned as a lab-style or elite technical training system.

---

## Implications for agents

- Prefer **practical, adaptable** prescriptions and exercise choices over **lift-specific peaking** or meet-prep framing.
- Favor **constraint-aware** behavior (equipment variance, injuries, mixed goals) over optimizing for a single abstract strength number on a fixed lift.
- Keep tone and complexity **accessible** — structured and evidence-informed where the codebase requires it, without presenting the product as a specialist technical coaching platform.

---

## Repository map (onboarding)

**App shell (Expo Router):** `app/` — root `app/_layout.tsx` wraps providers; `app/(tabs)/_layout.tsx` registers tabs and hidden manual/adaptive flow routes; header chrome lives in `app/navigation/tabFlowChrome.tsx`.

**Global UI state:** `context/AppStateContext.tsx` (hydration from Supabase via `context/loadRemoteAppState.ts`); adaptive setup shape and manual defaults in `context/appStateModel.ts`.

**Generation (manual):** Screens call `lib/loadGeneratorModule()` → `lib/generator.ts` → `logic/workoutGeneration/dailyGenerator.ts`. Shared DB exercise-name bias: `lib/manualPreferredExerciseNames.ts`. Sport prep: `services/workoutBuilder/index.ts` with the same dynamic import.

**Heavy domain logic:** `logic/workoutIntelligence/` and `logic/workoutGeneration/` — change only with tests per `AGENTS.md`. Historical snapshots live under `archive/` (TypeScript excludes them; `.cursorignore` hides them from Cursor).

---

## Baseline checks (performance and regressions)

- **Web load:** Chrome DevTools → Performance or Lighthouse on a production export (`npx expo export --platform web`) after meaningful bundle changes; compare JS parse and LCP when possible.
- **Native:** Expo dev client + Hermes sampling for cold start after navigation-heavy changes.
- **Manual smoke (no automated substitute):** Welcome → Today; Build workout one-day → workout → execute; week flow; Sport Mode → schedule → recommendation; Library save/remove; Gym profile switch.
