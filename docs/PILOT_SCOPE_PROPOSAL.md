# Pilot Scope Proposal — Sports, Goals, Exercises (D1–D3)

**For:** Ellie · **Updated:** 2026-08-13 · **Status:** D1–D3 decided; remaining pilot decisions D4–D9  
**Companion to:** `docs/PILOT_LAUNCH_PLAN.md`

Part 1 = evidence. Part 2 = decisions. Part 3 = how we implement. Part 4 = your checkboxes.

---

## Part 1 — Evidence

### Sports: all active sports and real exercise-pool volume

**How to read this.** The DB's `sport_*` exercise tags are nearly empty (0–13 tagged core rows per sport) and are **not** what generation uses. Generation matches exercises to a sport via **sub-focus / quality matching** inside the filtered session pool (~298 exercises after equipment + pruning gate on the default "Your Gym" profile).

| Sport | Sub-focuses | Unique matching exercises | Avg per sub-focus | Weakest sub-focus | Weak / critical subs* |
|-------|------------:|--------------------------:|------------------:|------------------:|----------------------|
| bodybuilding | 5 | 243 | 130 | 99 | 0 / 0 |
| golf | 5 | 200 | 61 | 19 | 0 / 0 |
| american_football | 6 | 190 | 49 | 5 | 1 / 1 |
| rugby | 6 | 190 | 49 | 5 | 1 / 1 |
| cycling | 6 | 170 | 37 | 2 | 3 / 1 |
| swimming_open_water | 5 | 169 | 40 | 2 | 2 / 1 |
| baseball | 5 | 167 | 57 | 12 | 1 / 0 |
| rucking | 5 | 165 | 43 | 2 | 2 / 1 |
| powerbuilding | 5 | 156 | 53 | 1 | 2 / 2 |
| rock_climbing | 9 | 149 | 35 | 8 | 3 / 0 |
| track_sprinting | 5 | 144 | 49 | 6 | 1 / 0 |
| grappling | 5 | 137 | 37 | 5 | 1 / 1 |
| muay_thai | 5 | 134 | 42 | 19 | 0 / 0 |
| lacrosse | 5 | 123 | 46 | 12 | 1 / 0 |
| boxing | 5 | 122 | 38 | 12 | 1 / 0 |
| court_racquet | 5 | 120 | 42 | 12 | 1 / 0 |
| volleyball | 5 | 105 | 25 | 9 | 3 / 0 |
| basketball | 5 | 99 | 31 | 7 | 2 / 0 |
| hockey | 5 | 97 | 41 | 19 | 0 / 0 |
| hyrox | 5 | 95 | 24 | 5 | 2 / 1 |
| road_running | 9 | 94 | 22 | 2 | 3 / 1 |
| kite_wind_surf | 5 | 91 | 29 | 10 | 1 / 0 |
| xc_skiing | 6 | 85 | 25 | 2 | 2 / 1 |
| triathlon | 6 | 84 | 21 | 2 | 4 / 1 |
| surfing | 5 | 74 | 20 | 9 | 2 / 0 |
| rowing_erg | 6 | 59 | 13 | 2 | 4 / 2 |
| soccer | 5 | 53 | 27 | 2 | 2 / 2 |
| trail_running | 6 | 34 | 15 | 2 | 3 / 1 |
| alpine_skiing | 5 | 33 | 10 | 4 | 3 / 1 |
| backcountry_skiing | 6 | 24 | 12 | 8 | 5 / 0 |
| snowboarding | 5 | 21 | 12 | 6 | 3 / 0 |

\*Weak = ≤12 direct matches for that sub-focus; critical = ≤5. Measured 2026-08-12 via the same matcher the generator uses (`auditSubFocusPoolCoverage` / `exerciseMatchesSportSubFocusSlug`).

**Takeaway for D1:** pool volume and "generation maturity" are not the same thing. Golf/bodybuilding have huge match counts but weak sport-specific programming; alpine/trail/soccer have thinner unique pools but stronger intent profiles + audit history. Prefer maturity + your testers over raw volume.

### Goals — and the Recovery & Mobility honesty check

You were right to push on this. Earlier I said Recovery & Mobility was "covered" because the **65-contract fidelity audit** passed (structure / intent contracts). That is **not** the same as "deep recovery exercise library."

Live DB, `eligible_core` only:

| Slice | Count |
|-------|------:|
| modality = `recovery` | **8** |
| modality = `mobility` | 132 |
| Broader recovery-ish (mobility/stretch/cooldown/prep roles + stretch/mobility targets + warmup/cooldown relevance) | ~192 |

What the Recovery & Mobility **goal** actually draws on (Your Gym filtered pool, 2026-08-12):

| Sub-focus | Matching exercises | Samples |
|-----------|-------------------:|---------|
| hips | 18 | Hip Thrust, World's Greatest Stretch, 90/90 Hip Switch |
| shoulders | 60 | Band Pull-Apart, Thread the Needle, Sleeper Stretch |
| t_spine | 70 | Dead Bug, Cat Cow, … |
| full_body | 70 | Dead Bug, Band Pull-Apart, Cat Cow |
| elbows | 21 | Sleeper Stretch, Cross-Body Shoulder Stretch, … |
| knees | 17 | Hamstring/Quad/Calf stretches |
| wrists | 13 | Wrist Circles, Banded Finger Extensions |
| lower_back | **12** (weak) | Dead Bug, Cat Cow, Child's Pose |
| ankles | **9** (weak) | Wall Calf Stretch, Ankle Circles, … |
| **Unique across all Recovery subs** | **107** | |

So: the goal is not empty — it mostly rides **mobility / stretch / prep** work, not the 8 `recovery`-modality rows. But ankles and lower_back are thin, and the library is nowhere near as rich as strength/hypertrophy. **If pilot testers care about Recovery & Mobility as a primary goal, keep it but expect thinner variety; if they mostly want strength/sport, drop it for pilot and avoid that weak surface.**

### Exercises inventory (unchanged facts)

| Label | Count | Meaning |
|-------|------:|---------|
| `eligible_core` | 2,292 | Current "quality" pool |
| `eligible_niche` | 966 | Specialized |
| excluded | 758 | Dead / merged — still `is_active=true` (bug) |
| unlabeled | 249 | Never classified |

Also still true: offline eligibility snapshot (563 core) ≠ live DB (2,292 core). Must sync before pilot.

---

## Part 2 — Decisions

### D1 — Sports — **decided 2026-08-12**

**Pilot picker (12):** golf · american football · cycling · swimming · rock climbing · lacrosse · boxing · volleyball · court/racquet · basketball · hockey · road running

**Priority build-up (7) — cleared 2026-08-12 and merged into the pilot allowlist (now 19 sports):** surfing · xc skiing · soccer · trail running · alpine skiing · backcountry skiing · snowboarding

**Status:** Sub-focus pool gates passed (Your Gym: 0 critical / 0 weak on those sports). See `docs/PRIORITY_SPORT_MAPPING_PLAN.md` and `docs/research/priority-sports-mapping-2026-08.md`.

**Plan:** [`docs/PRIORITY_SPORT_MAPPING_PLAN.md`](./PRIORITY_SPORT_MAPPING_PLAN.md) — Phase 0 shared aerobic fix, then snow → trail/xc/soccer → surfing, then flip sports on when pool audits clear.

**Applied:** DB `is_active` allowlist + swimming renamed to “Swimming”; app filter in `lib/pilotCatalog.ts`.

### D2 — Goals — **decided 2026-08-13**

**Pilot goals (6):** Build Strength · Build Muscle · Body Recomp · Improve Endurance · Athletic Performance · **Recovery & Mobility**

**Dropped for pilot:** Calisthenics · Strength Training for Joint Health

**Recovery pairing rule:** When Recovery is selected **with** another training goal, Recovery is demoted to secondary (cooldown stretch/holds). The other goal owns session structure (supersets, sets/reps). Recovery alone stays a full stretch session. See `lib/recoveryGoalRanking.ts`.

**Applied:** `PILOT_PRIMARY_FOCUS_LABELS` in `lib/pilotCatalog.ts`; preferences chips filtered.

### D3 — Exercises: trim core to ~1,000; rest → Phase 2 pool — **APPLIED 2026-08-12**

Live DB after apply:

| State | Count | Active |
|-------|------:|-------:|
| `eligible_core` | **1,000** | 1,000 |
| `eligible_phase2` | 1,540 | 1,540 (gated off in pilot) |
| `eligible_niche` | 967 | 967 (gated off in pilot) |
| excluded_* | 758 | **0** (deactivated) |

Scripts: `npx tsx scripts/pilotCatalog/applyPilotExerciseScope.ts --apply` · drift check `verifyEligibilityBundleDrift.ts`. Artifact: `artifacts/pilot-exercise-scope-decisions.json`. Bundled snapshot regenerated.

---

## Part 3 — Implementation mechanism — **done for exercises (2026-08-12)**

| # | Change | Status |
|---|--------|--------|
| 1 | Classify 249 unlabeled rows | done (248 → core protect path then trim; 1 → niche) |
| 2 | `is_active = false` on excluded | done (758 deactivated) |
| 3 | Regenerate offline eligibility snapshot + drift gate | done (`data/generator-eligibility-by-id.json` + `verifyEligibilityBundleDrift.ts`) |
| 4 | Near-dupe trim → 1000 core / 1540 phase2 | done |
| 5 | Pilot gate: core only | done (`lib/generationPruningGateConfig.ts`) |
| 6 | Sports `is_active` + goals allowlist | **done** (D1 sports + D2 goals 2026-08-13) |

---

## Part 4 — Your answers

- **D1 sports** — ☑ 19 pilot sports (original 12 + surfing, xc/alpine/backcountry ski, snowboarding, soccer, trail running)
- **D2 goals** — ☑ B-style: 6 goals including Recovery & Mobility (drop Calisthenics + Joint Health)
- **D3 exercises** — ☑ trim to ~1000 core + phase2 for the rest (**applied 2026-08-12**)
