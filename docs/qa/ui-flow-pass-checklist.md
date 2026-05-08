# Scripted UI flow pass — TodayFit (Expo Router)

Manual / automated-adjacent checklist for exercising the **web** (`npm run web:dev`) and **native** shells. Duplicate each row with **Notes** during a session.

---

## Preparation (every run)

- [ ] **Environment:** Supabase env vars loaded; sports/exercises data available (or note offline behavior).
- [ ] **Web:** `CI=false npx expo start --web` (use a free port if 8081 is taken, e.g. `--port 8082`).
- [ ] **First-run:** Clear `todayfit_has_entered` in storage—or use guest profile—to hit `/welcome` again.
- [ ] **Console:** Open devtools; scan for reds after each phase (Deprecation: `pointerEvents` on TextInput props should live on **style** on web.)

---

## Phase A — Landing and entry

| Step | Action | Pass? | Notes |
|------|--------|:-----:|-------|
| A1 | Open `/welcome` | ☐ | Copy: preview hint + “Continue to app”; social rows still shortcuts |
| A2 | Tap primary CTA → lands on `/` (Today hub) | ☐ | AsyncStorage persists `hasEntered` |
| A3 | Reload `/` → should skip welcome if persisted | ☐ | |

---

## Phase B — Today hub (`/`)

| Step | Action | Pass? | Notes |
|------|--------|:-----:|-------|
| B1 | Read headline + Goal-Oriented / Sport-Focused cards | ☐ | |
| B2 | **One day** → `/manual/preferences` (no query) | ☐ | Bottom bar: **Today** should read selected on flow routes |
| B3 | **This week** (manual card) → `?scope=week` | ☐ | Verify nav **title**: “Plan your week” vs “Build workout” (native header) |
| B4 | If in-progress workout state exists → continue rows appear and route correctly | ☐ | Synthetic: partial plan + regenerate |

---

## Phase C — Manual preferences (goal-oriented)

Base URL: `/manual/preferences`  
Week URL: `/manual/preferences?scope=week`

| Step | Action | Pass? | Notes |
|------|--------|:-----:|-------|
| C1 | Expand **Session length**, change duration, collapse | ☐ | |
| C2 | Expand **Training goal**, pick primary + sub-focus if used | ☐ | Conflict banner if contradictory selections |
| C3 | Expand **Where you train** / gym profile affordance | ☐ | Switch profile from header if present |
| C4 | Expand **Body emphasis** (day flow) | ☐ | Week flow may omit—match product spec |
| C5 | Tap **Build workout** / **Next: Choose training days** | ☐ | Loading overlay; generator errors surfaced |
| C6 | **Web layout:** header vs **Reset** / **Save preset** / hero—no overlap (z-index) | ☐ | Critical on narrow web viewports |
| C7 | Back chevron returns to expected parent (not Library) | ☐ | |

---

## Phase D — Week plan, editor, execute

| Step | Action | Pass? | Notes |
|------|--------|:-----:|-------|
| D1 | From week generation → `/manual/week` list | ☐ | |
| D2 | Open a day → `/manual/workout` | ☐ | Blocks list, regenerate, swaps |
| D3 | **Start / Continue** execution → `/manual/execute` | ☐ | Back: week vs single-day rules |
| D4 | Complete flow → history/saved if wired | ☐ | |

---

## Phase E — Library and stack redirects

| Step | Action | Pass? | Notes |
|------|--------|:-----:|-------|
| E1 | Tab **Library** → `/library` | ☐ | |
| E2 | Hit `/history` directly | ☐ | Should **replace** to `/library` (stack shim) |
| E3 | Deep link `/history/weeks/[id]` or `/history/[id]` with fixture id | ☐ | Error vs content |
| E4 | Snapshot **DOM/a11y:** extra static headings (“Library”, “Today”) on non-tab screens | ☐ | Screen reader noise—log if reproducible |

---

## Phase F — Sport mode funnel

| Step | Action | Pass? | Notes |
|------|--------|:-----:|-------|
| F1 | Today card **Sport** week → `/sport-mode` | ☐ | |
| F2 | One-day variant → `/sport-mode?scope=day` | ☐ | |
| F3 | Pick sports, goals, gym; advance to schedule/recommendation as designed | ☐ | Console: sports fetch count OK |
| F4 | **Recommended Session** back button (one-day vs week) | ☐ | Adaptive back behavior |

---

## Phase G — Profile / gym switching

| Step | Action | Pass? | Notes |
|------|--------|:-----:|-------|
| G1 | Tab **Profile** → `/profiles` | ☐ | |
| G2 | Create/switch/delete profile if flows exist | ☐ | Preference screens pick up active profile |
| G3 | Flow header gym chip opens profile from manual/sport flows | ☐ | Duplicate chrome vs Today-only header intentional—confirm |

---

## Phase H — Resilience & regression

| Step | Action | Pass? | Notes |
|------|--------|:-----:|-------|
| H1 | **Start over** on a flow clears state + lands `/` | ☐ | |
| H2 | Refresh mid-flow (web) recovery | ☐ | |
| H3 | Run `npm run lint` | ☐ | CI gate |
| H4 | Run targeted generator tests after logic changes | ☐ | Vitest subsets |

---

## Last run log (paste session notes)

| Field | Value |
|--------|--------|
| Date | 2026-05-08 (continuation pass) |
| Branch | `ux/product-flow-pass-2026-05-08` |
| Platform | Web, `http://localhost:8082`, mobile-width canvas |

**Completed this session**

- **B1** Today hub (`/`) — headline present (`Customize` in DOM).
- **C1–C4** Manual preferences — collapsible **buttons** visible in a11y tree; **clicks intercepted** by a full-width overlay `<div>` at top of viewport (same on `sport-mode?scope=day`) so sections could not be toggled via automation on this canvas.
- **C5** Not re-run (blocked by overlay); prior session: generate path works when CTA reachable.
- **D1** `/manual/week` — loads with title **This week’s workouts** (had persisted week state).
- **D2** `/manual/workout` — **Today’s Workout** (persisted generated workout).
- **D3** `/manual/execute` — **Execute** title; route OK.
- **D4** Not exercised (complete → history).
- **E1** `/library` — OK.
- **E3** `/history/weeks/test-id` — dev-style route label in tree; screen requires auth/DB for real data (see `history/weeks/[id].tsx`).
- **F2** `sport-mode?scope=day` — extra sections vs week-only sport (session length, body emphasis) visible in tree.
- **F3** `/sport-mode/schedule`, `/sport-mode/recommendation` — direct navigation OK (titles present).
- **G1** `/profiles` — **Gym Profile**; no stray Library/Today **headings** in this snapshot (improved vs earlier pass).
- **H2** Hard navigation to `/manual/workout` after other routes — persisted workout still loads.
- **H3** `npm run lint` — **0 errors**, 19 warnings (unchanged class).

---

## Issues discovered (2026-05-08 web pass, sample)

1. **Build workout (web):** Visual overlap between native-style header chrome and inline actions (“Reset”, “Save preset”, hero)—treat as **web stacking / safe-area** issue; verify with responsive widths.
2. **A11y tree:** Routes like `/profiles` sometimes still expose headings for **Library** and **Today** in addition to **Gym Profile**—possible hidden tab scaffold on web worth auditing.
3. **Week prefs document title:** `navigation.setOptions` updates OS header; DOM-level `heading`/`title` may lag—confirm with manual visual check after load.
4. **Web automation / hit-testing (2026-05-08 follow-up):** Flow screens (`manual/preferences`, `sport-mode?scope=day`) report **click target intercepted** by a non-interactive top `<div>` (~372×64 or larger strip). Likely stacked header / safe-area / ornament; blocks Playwright-style ref clicks until z-index or pointer-events fixed.
