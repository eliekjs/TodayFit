# Pilot launch plan (living doc)

**Status:** Active — update as items close. Created 2026-08-02.
**Goal:** Closed, invite-only pilot (6–12 sport-literate testers, 10–14 days, signed-in required).
**Related:** [SHIP_SPEC.md](./SHIP_SPEC.md), [SHIP_GAP_REGISTER.md](./SHIP_GAP_REGISTER.md), [AUTH_UX_IMPROVEMENT_PLAN.md](./AUTH_UX_IMPROVEMENT_PLAN.md), [PRODUCT_PRIORITIES.md](./PRODUCT_PRIORITIES.md)

**Status values:** `open` · `in_progress` · `decided` · `blocked` · `done` · `out_of_scope`

---

## How to use this doc

- Each phase has a table of items with owner and status. Update status as we work.
- **Decisions** (Phase 0) must be `decided` before their dependent build items start.
- Nothing ships to testers until every **Gate** row in Phase 7 is `done`.

---

## Phase 0 — Decisions (with Ellie; blocks other phases)

None of the catalog pools are chosen yet. We prepare evidence; Ellie decides.

| # | Decision | Input we prepare | Status |
|---|----------|------------------|--------|
| D1 | **Pilot sports pool** | Per-sport maturity + pool volumes | **decided (2026-08-12):** 19 sports live (original 12 + 7 priority after pool gates) |
| D2 | **Pilot goals pool** | Per-goal maturity report: sub-goal fidelity (65-contract audit results by goal), weekly coverage | **decided (2026-08-13):** 6 goals incl. Recovery & Mobility; drop Calisthenics + Joint Health |
| D3 | **Pilot exercise pool** | Catalog breakdown + trim to ~1000 core | **decided + applied (2026-08-12):** 1000 core / 1540 phase2 / niche+review gated off |
| D4 | Week mode required for pilot (manual week vs sport week vs both) | Week-flow gap list (below) with per-mode fix cost | open |
| D5 | Platforms (iOS only vs + Android vs + web) | Who the testers are and what they carry | open |
| D6 | Build distribution (TestFlight vs Expo dev build vs web link) | Effort estimate per option | open |
| D7 | Guest entry in pilot build (hide vs keep with honest copy) | — | open |
| D8 | Pilot Supabase environment (current project vs separate pilot project) | Risk notes: test data mixing, migration drift | open |
| D9 | Crash reporting in pilot build (Sentry yes/no) | Half-day wiring estimate | open |
| D10 | App name | — | **decided (2026-08-12): SeshLogic** — see Phase 2.5 |

**Process for D1–D3 (catalog workshop):**

1. Agent runs existing audits (`auditSubGoalGenerationFidelity`, `auditSportSubGoalGenerationFidelity`, pool-depth spot checks) and produces a one-page maturity matrix per sport/goal.
2. Ellie picks the pools from that matrix.
3. Agent wires allowlists (Phase 3) only after D1–D3 are `decided`.

### D1–D3 evidence: maturity matrix (audits run 2026-08-02, all green)

**Sports** (31 in picker; audit = `auditSportSubGoalGenerationFidelity` 52/52 cells, tested at full gym + hotel gym × 2 seeds):

| Tier | Sports | Evidence |
|------|--------|----------|
| **A — strongest** (deep sport profile + directly audit-tested; most have persona anchors) | basketball (P01), soccer (P02/P10), rock_climbing (P04), trail_running (P03), alpine_skiing (P03), road_running, grappling | Deep profile in `sportDefinitions.ts` **and** stratified audit pass |
| **A− — audit-tested, no deep profile** | volleyball, lacrosse, american_football | Passed family audit via shared sub-focus machinery; generation leans on generic sub-focus tags |
| **B — deep profile, not directly audit-tested** | backcountry_skiing, xc_skiing, cycling, triathlon, rucking, hyrox, rowing_erg, swimming_open_water, surfing, boxing, muay_thai, rugby | Deep profile exists; family contracts cover *parallel* sports only |
| **C — chips only** (no deep profile, not audit-tested) | snowboarding, kite_wind_surf, track_sprinting, baseball, hockey, court_racquet, golf, bodybuilding, powerbuilding | Sub-focus chips + tag map only; weakest generation guarantees |

**Goals** (`auditSubGoalGenerationFidelity` 65/65 contracts): all 8 primary goals pass — Build Strength (6 sub-goals), Build Muscle (8), Body Recomp (8), Improve Endurance (5), Recovery & Mobility (9), Athletic Performance (15), Calisthenics (8), Joint Health (6). **No goal is disqualified on evidence; D2 is a product-scope choice, not a quality one.**

**Exercises** (live Supabase after pilot scope apply 2026-08-12): **1000** `eligible_core` · 1540 `eligible_phase2` · 967 `eligible_niche` · 758 excluded (all `is_active=false`). Offline bundle regenerated and matches DB. Pilot gate = core-only. See `docs/PILOT_SCOPE_PROPOSAL.md`.

➡ **Full D1–D3 analysis: `docs/PILOT_SCOPE_PROPOSAL.md`** (D3 applied; D1/D2 still need your picks).

---

## Phase 1 — Repo hygiene & stabilization (prerequisite for everything)

The working tree has a large uncommitted batch and **typecheck is currently red** (pre-existing errors in `lib/dailyGeneratorAdapter.ts`, `lib/daySessionFocusConflict.ts`, test fixtures). We can't freeze or trust CI until this is clean.

| # | Item | Owner | Status |
|---|------|-------|--------|
| 1.1 | Fix `tsc --noEmit` errors (adapter `bodyPartFocus`, `DayBodyRegion` union, test fixture types; excluded Deno edge functions from app tsconfig) | eng | done (2026-08-02) |
| 1.1b | Fix vitest infra: react-native / expo-secure-store stubs (`test/stubs/`), `__DEV__` define — 6 test files could not load | eng | done (2026-08-02) |
| 1.1c | Fix generator bug: validator cooldown repairs could inject prehab/activation work (e.g. hip_cars) — repairs now use the same recovery gate as block assembly (`workoutValidator.ts`). Pre-existing on main, caught by `blockCategoryGeneration.test.ts` | eng | done (2026-08-02) |
| 1.2 | Land / commit current WIP in reviewable chunks (auth copy, volume preference, week body-focus, prescription edit) | eng | open |
| 1.3 | Typecheck + full vitest green locally (106 files / 813 tests, incl. ship-gate fidelity suites); CI re-run after 1.2 lands | eng | local done (2026-08-02) |
| 1.4 | `npm run ship:gates` green on main after landing | eng | open (fidelity suites green locally) |
| 1.5 | Decide fate of half-built features that won't be pilot-ready (finish, flag off, or revert) | Ellie + eng | open |

---

## Phase 2 — Finalize auth

### App work (eng)

| # | Item | Status |
|---|------|--------|
| 2.1 | Voice-aligned auth copy wired (authCopy map, welcome, forgot-password) | in_progress |
| 2.2 | Delete account = simple confirm dialog ("Are you sure… This cannot be undone") — type-DELETE removed | done (2026-08-02) |
| 2.3 | Full signup → confirm → login → resend path verified on device | open |
| 2.4 | Forgot password → 6-digit code → new password → login verified on device | open |
| 2.5 | No raw Supabase/vendor strings anywhere in user-facing UI | open |
| 2.10 | **Sign in with Apple** (added 2026-08-12): Supabase Apple provider + `expo-apple-authentication`; requires Apple Developer account and a native iOS build (not Expo Go / web). Effectively pins D5 = iOS and D6 = TestFlight | open |

### Ops work (Ellie — dashboard/provider)

| # | Item | Status |
|---|------|--------|
| 2.6 | Custom SMTP + verified sending domain (From: SeshLogic — pending R4 domain) | open |
| 2.7 | Confirm + reset email templates applied (script or dashboard paste) | open |
| 2.8 | Password-reset redirect URL in Supabase Auth allowlist | open |
| 2.9 | Apply `delete_own_account` migration (`npm run ship:apply-delete-account`) | open |

**Exit:** Real-inbox smoke test passes: signup, confirm, wrong password, reset, resend, delete (account fully gone, can't log back in). Plus Apple sign-in round trip on device (2.10).

---

## Phase 2.5 — Rebrand to SeshLogic (D10, decided 2026-08-12)

Rename the user-visible brand only. **Do not rename** the Expo `slug`, URL `scheme`, Supabase project, or local storage keys for the pilot — changing those breaks the EAS project link, deep links (password reset), and would sign testers out / lose local drafts. Internal rename can happen post-pilot if ever.

| # | Item | Owner | Status |
|---|------|-------|--------|
| R1 | `app.json` display `name` → SeshLogic (keep `slug: todayfit`, `scheme: todayfit`) | eng | done (2026-08-12) |
| R2 | In-app strings: welcome screen, profiles sign-in copy (auth copy map had no brand strings) | eng | done (2026-08-12) |
| R3 | Auth email branding in `scripts/configureSupabaseAuth.ts` (subjects + bodies) — **must re-run the script / re-apply templates with 2.7 to take effect on Supabase** | eng | script updated (2026-08-12); apply pending 2.7 |
| R4 | Pick + register domain / sender address for auth emails (feeds 2.6) | Ellie | open |
| R5 | Docs sweep (PRODUCT_VOICE, tester brief) — non-blocking | eng | open |

---

## Phase 3 — Security verification

| # | Item | How | Status |
|---|------|-----|--------|
| 3.1 | RLS isolation green including delete RPC | `npx tsx scripts/verifyRlsIsolation.ts` | open (last run: pass except delete RPC pending 2.9) |
| 3.2 | No service_role / admin keys in client env or bundle | Review `.env`, app config, build output | open |
| 3.3 | Session survives app kill; sign-out fully resets to guest defaults | Manual device check | open |
| 3.4 | Anon (guest) cannot write user tables | Covered by RLS script | open |
| 3.5 | Rotate any access tokens used by management scripts | Ellie | open |

---

## Phase 4 — Pilot catalog (after D1–D3 decided)

| # | Item | Status |
|---|------|--------|
| 4.1 | Add single pilot allowlist config (e.g. `lib/pilotCatalog.ts`): sports, goals | **done** (sports + `PILOT_PRIMARY_FOCUS_LABELS`) |
| 4.2 | Wire sport picker (DB path **and** offline bundled list) through allowlist | **done** (DB `is_active` + `filterPilotSports`) |
| 4.3 | Wire goal chips (`PRIMARY_FOCUS_OPTIONS` filter) through allowlist | **done (2026-08-13)** — `filterPilotPrimaryFocusLabels` in manual preferences |
| 4.4 | Exercise pool posture per D3 (pruning-gate env flags and/or `is_active` in DB) | **done (2026-08-12):** 1000 core, phase2+niche off, excluded deactivated, bundle synced |
| 4.5 | Handle presets/saved data referencing out-of-pilot sports/goals gracefully (no crashes, honest message) | blocked (4.1) |
| 4.6 | Pool-depth re-check: every pilot sport/goal × {full gym, hotel gym} × {no injury, one injury} generates full-length sessions | blocked (4.4) |
| 4.7 | Re-run ship gates + targeted sims on narrowed catalog | blocked (4.6) |

**Risk watch:** UI allowlist and generator/DB must shrink together; presets and offline bundled sport list are the two known bypass paths.

---

## Phase 5 — Week workout & week-in-progress fixes

Core finding: week generation works in-session, but the **active week lives in memory only** — kill the app and "continue this week" is gone. Status writes are inconsistent between paths.

| # | Item | Status |
|---|------|--------|
| W1 | Persist active week (workouts + per-day status) for signed-in users; rehydrate after login/relaunch | open |
| W2 | Single status write path: execute finish and skip both persist day status (sport `updateDayStatus` used everywhere; define manual equivalent) | open |
| W3 | One "continue" surface: unify top Active Session banner + bottom Week Progress banner (prefer `/week/progress`) | open |
| W4 | Week complete → clean end: clear/archive plan + draft, no sticky banners into next week | open |
| W5 | Bug: sport-week execute Back goes to `/manual/workout` instead of week review/progress | open |
| W6 | Library stale-week parity: sport week archive matches manual behavior | open |
| W7 | QA script: build week → day 1 → kill app → reopen → continue → day 2 → skip rest → complete clean; both modes (or the D4-chosen mode) | open |

**Scope note:** if D4 picks one week mode, W1–W5 land for that mode first; second mode is stretch.

---

## Phase 6 — Pilot build packaging

| # | Item | Status |
|---|------|--------|
| 6.1 | Distribution set up per D6 (e.g. EAS build + TestFlight invite flow) — testers can actually install | open |
| 6.2 | Crash reporting wired per D9 (release build only) | open |
| 6.3 | Feature freeze: tag `pilot-rc1`; only pilot-blocker fixes after tag | open |
| 6.4 | Device performance spot check: generate day + week on a mid-tier phone; loading UX acceptable | open |
| 6.5 | Native smoke on pilot paths (auth, goal day, sport day, gym switch, train today, week continue incl. kill-app, delete on test account) | open |
| 6.6 | Private privacy note for testers (what we store, how to delete) — store-grade hosting not required for closed pilot | open |

---

## Phase 7 — Pilot ops & launch gates

### Prep

| # | Item | Status |
|---|------|--------|
| 7.1 | Tester list (6–12, sport-literate, matching pilot sports) | open |
| 7.2 | One-page tester brief: how to install, what to try, what's out of scope, how to report (screenshot + mode + sport/goal + what felt wrong) | open |
| 7.3 | Feedback channel (group chat / form) + triage cadence (check daily, fix only blockers) | open |
| 7.4 | Success metrics defined: e.g. usable session < 3 min, zero equipment/injury violations reported, data survives reinstall, ≥ N sessions per tester per week | open |
| 7.5 | Exit plan: end date, wrap-up questions, criteria for "extend vs stop vs widen" | open |

### Launch gates (all must be `done` before invites)

| Gate | Check |
|------|-------|
| G-A | Phase 1 fully green (typecheck, CI, ship gates on frozen commit) |
| G-B | Auth smoke on real inbox + device passes (Phase 2 exit) |
| G-C | RLS + deletion verified (3.1, 2.9) |
| G-D | Catalog allowlists live; pool-depth checks pass (4.6, 4.7) |
| G-E | Week continue survives app kill for the D4 mode (W7) |
| G-F | Ellie completes the full pilot path herself on the tagged build |

---

## Explicitly out of scope for pilot

OAuth (Google — Apple moved into Phase 2 on 2026-08-12) · billing/membership · dark mode · activity-decision fork · rich upcoming-events model · onboarding wizard · full sport catalog polish · public store submission (privacy URL, store forms) · guest data durability.

---

## Change log

| Date | Change |
|------|--------|
| 2026-08-02 | Doc created. Delete-account modal simplified to plain confirm (2.2 done). Catalog pools moved to explicit Ellie decisions (D1–D3). Added gaps vs earlier chat plan: repo hygiene/typecheck red (Phase 1), build distribution (6.1), pilot Supabase env decision (D8), preset bypass handling (4.5), perf spot check (6.4), tester ops + launch gates (Phase 7). |
| 2026-08-02 (pm) | Phase 1 stabilization: typecheck green (1.1), vitest infra stubs (1.1b), cooldown-repair generator bug fixed with regression coverage (1.1c); full suite 813/813 green. Ran D1–D3 audits (goals 65/65, sport families 52/52); maturity matrix added above. |
| 2026-08-02 (late) | Queried live Supabase for D1–D3: corrected exercise counts (DB has 2292 core, not 482 — bundled snapshot is stale), found 758 excluded rows still active + offline/online pool drift. Wrote `docs/PILOT_SCOPE_PROPOSAL.md` with recommendations and proposed DB cleanup; awaiting Ellie's D1–D3 answers. |
| 2026-08-12 | Status re-check: typecheck green on current tree; 6 commits landed since 08-02 (login/logout backend, swappable exercises, splits, UI) but a new large uncommitted batch exists (1.2 still open). New decisions: **D10 name = SeshLogic** (Phase 2.5 added), **Apple sign-in moved into scope** (2.10; pins D5 iOS / D6 TestFlight). D1–D3 still awaiting answers in `PILOT_SCOPE_PROPOSAL.md` Part 4 — blocking Phase 4. |
| 2026-08-12 (pm) | **D3 applied:** unlabeled classified; 758 excluded deactivated; core trimmed to 1000 with 1540 → `eligible_phase2`; eligibility bundle regenerated + drift verifier; pilot gate core-only. Scripts under `scripts/pilotCatalog/`. D1/D2 still open. |
| 2026-08-12 (eve) | **D1 decided + applied:** 12 pilot sports active in DB; swimming renamed; app allowlist in `lib/pilotCatalog.ts`. Priority build-up list (surfing, xc/alpine/backcountry ski, snowboard, soccer, trail) — recommend enrich *before* those persona invites, not after the whole pilot. |
| 2026-08-12 (eve+) | Wrote `docs/PRIORITY_SPORT_MAPPING_PLAN.md`: Phase 0 shared aerobic fix → Wave A snow → Wave B trail/xc/soccer → Wave C surfing → flip on when pools clear. |
| 2026-08-12 (late) | **Priority 7 flipped on:** enrichment + Zone-2 staples + snowboard/xc/surfing engines; Your Gym pools clear; research note `docs/research/priority-sports-mapping-2026-08.md`; DB + `PILOT_SPORT_SLUGS` now 19 sports. |
| 2026-08-13 | **D2 decided:** 6 pilot goals incl. Recovery & Mobility (drop Calisthenics + Joint Health). Recovery+training combo demotes Recovery to secondary cooldown (`lib/recoveryGoalRanking.ts`). Goal chips filtered via `PILOT_PRIMARY_FOCUS_LABELS`. |
