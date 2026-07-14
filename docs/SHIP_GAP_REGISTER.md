# Ship gap register

Track assess → pass for v1. Update status as phases close.  
**Ship bar:** [SHIP_SPEC.md](./SHIP_SPEC.md)

**Status values:** `open` · `in_progress` · `blocked` · `done` · `wont_fix_v1`

---

## Phase 0 — Ship bar

| ID | Gap | Assess | Pass | Status |
|----|-----|--------|------|--------|
| G0.1 | Shared ship definition | Spec reviewed by eng+product | SHIP_SPEC.md frozen | done |
| G0.2 | Auth listed as “built” in PRODUCT_PRIORITIES | Compare welcome.tsx vs table | Auth moved to Partially built | done |
| G0.3 | MIGRATION.md inventory stale | Compare to AsyncStorage usage | Phase 0 inventory updated | done |
| G0.4 | Living gap register | This file exists with owners | Register maintained | done |

---

## Phase 1 — Auth & security

| ID | Gap | Assess | Pass | Status | Owner |
|----|-----|--------|------|--------|-------|
| G1.1 | Email signup/login not wired | welcome fields `editable={false}`; no signIn/signUp | Signup + login create Supabase session | done | platform |
| G1.2 | Native session storage missing | lib/db/client.ts has no auth.storage | Session survives kill/relaunch | done | platform |
| G1.3 | Sign-out incomplete | Profiles signOut only | Clears session + AppState to guest defaults | done | platform |
| G1.4 | Password reset missing | Welcome copy says unavailable | resetPasswordForEmail + deep link works | done | platform |
| G1.5 | Fake OAuth buttons | Google/Apple = enterApp | Removed or real OAuth; no fake CTAs | done | platform |
| G1.6 | RLS not penetration-tested | MIGRATION checklist unchecked | Scripted two-user denial on user tables | done | platform |
| G1.7 | Account deletion missing | No delete-account flow | Auth user + cascade user rows | done | platform |

---

## Phase 2 — Storage & sync (no guest durability)

| ID | Gap | Assess | Pass | Status | Owner |
|----|-----|--------|------|--------|-------|
| G2.1 | applyPreferencePreset skips upsert | Code path memory-only | Apply preset persists prefs when signed in | done | platform |
| G2.2 | History local id vs server UUID | addCompletedWorkout keeps hist_* | Rename/delete works post-reload | done | platform |
| G2.3 | updateWorkoutHistoryItem not persisted | Explicit comment in AppState | Persist or remove implying UI | done | platform |
| G2.4 | Train-today default pointer device-only | AsyncStorage only | Document as device-local **or** sync | done | platform |
| G2.5 | Guest durability | N/A | **wont_fix_v1** — ephemeral guest OK; honest copy | wont_fix_v1 | — |
| G2.6 | Guest→sign-in merge policy | Undefined | Documented + tested (keep draft vs discard) | done | platform |
| G2.7 | Offline signed-in edits | No write queue | Alert on failure; no silent loss claim | done | platform |

---

## Phase 3 — Generation fidelity (parallel)

| ID | Gap | Assess | Pass | Status | Owner |
|----|-----|--------|------|--------|-------|
| G3.1 | P05 missing from PERSONA_FIXTURES | Grep fixtures | P05 fixture + weekly gate | done | logic |
| G3.2 | Recurring deep-loop issues | persona-loop aggregate | leg_press / zone2_on_power non-recurring | done | logic |
| G3.3 | No sport stratified fidelity matrix | Only Manual 65/65 exhaustive | Family contracts + stratified sample green | done | logic |
| G3.4 | Weighted-alignment rubric unwired | simulation validation rules | Wired into persona/deep scripts | done | logic |
| G3.5 | Manual fidelity regression | auditSubGoalGenerationFidelity | 65/65 (or current catalog count) green | done | logic |

---

## Phase 4 — UI polish

| ID | Gap | Assess | Pass | Status | Owner |
|----|-----|--------|------|--------|-------|
| G4.1 | Preview welcome/auth | welcome.tsx copy | Real auth or honest guest entry | done | product |
| G4.2 | Profile stubs | No Sign in CTA; membership tease | Honest Profile for signed-in/out | done | product |
| G4.3 | QA checklist open rows | ui-flow-pass-checklist.md | A–H green × 3 platforms | done | QA |
| G4.4 | Theme / a11y hygiene | Multiple theme sources; thin labels | cleanFlow only; primary CTA labels | done | product |

---

## Phase 5 — Launch ops

| ID | Gap | Assess | Pass | Status | Owner |
|----|-----|--------|------|--------|-------|
| G5.1 | Store privacy / deletion | Forms + in-app deletion | Submitted + deletion works | done | lead |
| G5.2 | Crash reporting | None wired | Sentry (or equiv) on release builds | wont_fix_v1 | platform |
| G5.3 | CI ship gates | Many tsx harnesses not in Vitest | CI runs fidelity + auth RLS + smoke | done | lead |
| G5.4 | Perf caps | Untimed generate on mid devices | Measured; loading UX acceptable | done | platform |

---

## Change log

| Date | Change |
|------|--------|
| 2026-07-12 | Register created; guest durability marked wont_fix_v1; Phase 0 items marked done after ship spec landing |
| 2026-07-12 | Phase 4–5 proofs: web UI smoke, privacy doc, CI shipGates; Sentry deferred wont_fix_v1 |
