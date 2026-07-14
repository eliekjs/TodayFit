# TodayFit — Ship Spec (v1)

**Audience:** eng, product, QA. Single definition of “shipped” for the first public release.  
**Living gaps:** [SHIP_GAP_REGISTER.md](./SHIP_GAP_REGISTER.md)  
**Product priorities:** [PRODUCT_PRIORITIES.md](./PRODUCT_PRIORITIES.md)

**Last frozen:** 2026-07-12

---

## Ship bar (in)

| Area | Required for v1 |
|------|-----------------|
| **Auth** | Working email/password signup + login via Supabase; session survives app restart on native/web; sign-out clears session and resets cloud-shaped local state |
| **Security** | RLS verified (two-user denial); anon key only in client; account deletion path for store compliance; password reset with deep-link return |
| **Storage / sync** | Signed-in users: gyms, prefs, presets, history, saved workouts/weeks round-trip to Supabase and survive relaunch. Guest may try the app; **guest durability is explicitly out of scope** (ephemeral is OK; copy must say sign-in keeps data) |
| **Generation** | P0 personas + Manual sub-goal fidelity gate + stratified sport sample + deep-pressure top issues non-recurring |
| **UI** | No preview/placeholder auth; [qa/ui-flow-pass-checklist.md](./qa/ui-flow-pass-checklist.md) green on iOS, Android, and web for primary paths |
| **Launch ops** | Privacy/store forms, crash reporting, CI ship-gate scripts, account deletion |

## Ship bar (out / defer)

- Activity-decision fork (“climb vs run vs gym”)
- Rich upcoming-events model (region + days-away scoring)
- Dark mode
- Membership / billing
- Coach-grade periodization UI
- Meet-prep powerlifting
- Guest local persistence of presets/history/gyms
- OAuth (Google/Apple) — **defer unless email auth is green early**; do not ship fake social buttons

## Phase exit proofs

| Phase | Proven finished when |
|-------|----------------------|
| **0** | This spec + gap register exist; PRODUCT_PRIORITIES / MIGRATION auth & inventory drift corrected |
| **1** | Real email auth E2E; SecureStore/AsyncStorage session; RLS two-user test script pass; account deletion path |
| **2** | Signed-in sync matrix pass (preset apply persists, history IDs, history updates); guest copy honest; **no** guest durability work |
| **3** | P05 in fixtures; Manual fidelity green; sport stratified gate green; weighted-alignment wired; pressure top-issues clear |
| **4** | Welcome/Profile non-preview; checklist A–H green × 3 platforms; primary a11y labels |
| **5** | Store privacy + deletion; crash reporter; CI runs ship gates |

## Parallelism

Phase **3 (generation)** runs in parallel with Phases 1–2. Phases 4–5 wait until auth/storage surfaces are real.
