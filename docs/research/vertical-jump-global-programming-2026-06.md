# Evidence review: Vertical jump sub-focus programming (global)

**Date:** 2026-06-05  
**Subsystem:** Vertical jump sub-focus / goal programming globally (sport-agnostic selection, scoring, block assembly)  
**Agent run:** workout-logic-research-integration-agent

---

## 1. Research question

When a user selects **Vertical jump** as a sport sub-focus (basketball, volleyball, etc.) or goal sub-focus (Athletic Performance), what exercises should dominate the session, and why was the generator surfacing med-ball throws instead of lower-body plyometrics?

---

## 2. Sources

| Source | Type (Tier) | Link / DOI | Key claim(s) |
|--------|-------------|------------|--------------|
| Plyometric Jump Training Optimization (MDPI Sports) | Systematic scoping review (Tier 2) | https://www.mdpi.com/journal/sports | PJT improves vertical jump; exercise type and ground-contact parameters matter. |
| Combined resistance + plyometric training on vertical jump (PMC) | Systematic review & network meta-analysis (Tier 1) | PMC12903741 | Combined RT + plyometric improves CMJ more than either alone. |
| Plyometric training and vertical jump height (BJSM) | Meta-analytical review (Tier 1) | bjsm.bmj.com/content/41/6/349 | Plyometric training improves vertical jump height. |
| NSCA Essentials / practitioner consensus | Consensus (Tier 2) | NSCA Essentials of Strength & Conditioning | Squats, trap-bar deadlifts, split squats support force production; depth/box jumps and reactive hops develop stretch-shortening cycle. |

Use `docs/research/source-ranking.md` for tier definitions.

---

## 3. Classification of findings

### High-confidence rules (implemented)

- **Lower-body plyometrics** (box jumps, depth drops, pogo/reactive hops, jump squats) are primary vertical-jump training modalities.  
  Source: BJSM meta-analysis; MDPI PJT scoping review.  
  Implemented: `verticalJumpSubFocusShared.ts` — `exerciseHasLowerBodyPlyoJumpSignal`, shared tag weights, scoring bonus (+12), power-block filter requiring lower-body plyo signal when vertical-jump intent is active.

- **Combined strength + plyometric work** supports jump performance.  
  Source: PMC12903741.  
  Implemented: shared tag map includes `squat_pattern`, `hinge_pattern`, `single_leg_strength` at secondary weights; main-strength scoring nudge (+2) when vertical-jump intent is active.

- **Med-ball throws are not vertical-jump plyometrics** despite sharing generic `explosive_power` tags.  
  Source: practitioner taxonomy / movement specificity (Tier 2 heuristic aligned with user research).  
  Implemented: `exerciseIsMedBallPowerThrow` excluded from vertical-jump dynamic gate, slug matching, main-work candidates, power-block pool, and coverage scoring (−12).

### Context-dependent heuristics (implemented)

- **Sport-agnostic parity:** basketball, volleyball, standalone `vertical_jump` sport, and goal-level `vertical_jump` sub-focuses share `SHARED_TAG_WEIGHTS_VERTICAL_JUMP` instead of per-sport drift.  
  Implemented: `subFocusTagMap.ts`, `goalSubFocusTagMap.ts` import shared weights.

- **Coverage threshold:** vertical-jump coverage picks use `verticalJumpExerciseSelectionScore` (plyo +12, med-ball −12) so med balls fail the ≥10 archetype bar.  
  Implemented: `dailyGenerator.ts` `scoreCoverageCandidate`.

### Speculative / deferred

- Prescription tuning (sets/reps/rest) specifically for depth-jump progressions — out of scope for this subsystem run.  
- Adding missing catalog exercises (e.g. hanging leg raises as dedicated vertical-jump core work) — see §6 DB gaps.

---

## 4. Comparison to previous implementation

- **Before:** Med-ball slams/tosses received `explosive_power` + `plyometric` tags via Phase 9 inference and matched sparse sport tag maps (`explosive_power`, `plyometric` only for basketball). Generic dynamic-power gates treated med balls like box jumps. Sessions could fill power slots with Vertical Toss, Seated Med Ball Toss, and Med Ball Slam while under-selecting box/depth/pogo jumps.
- **Evidence suggests:** Prioritize lower-body reactive jumps and force-production lifts; med balls are accessory upper-body power, not primary VJ training.
- **Gap closed:** Global shared vertical-jump helpers gate selection/scoring/coverage; unified tag weights across sports and goals; power block filtered when vertical-jump intent is declared.

---

## 5. Metadata / ontology impact

- **No new DB columns.** Logic uses id/name/stimulus/muscle signals plus existing attribute tags.
- **Tag map:** `SHARED_TAG_WEIGHTS_VERTICAL_JUMP` applied to `basketball:vertical_jump`, `volleyball:vertical_jump`, `vertical_jump:*`, and all goal `*:vertical_jump` entries.
- **Selection flow:** `subFocusSlugMatch` → stricter `exercisePassesVerticalJumpDynamicGate`; `intentSlotAllocator` → lower-body plyo required; `dailyGenerator.scoreExercise` / `buildPowerBlock` / coverage post-pass wired to shared helpers; `selectExercises` and `enforceSportIntentExerciseProportions` exclude med-ball throws when vertical-jump intent is active (fixes sport-weight proportion repair injecting med balls into accessory blocks).

---

## 6. Open questions / follow-ups

- **DB gaps:** Confirm catalog has `depth_jump` (distinct from `depth_drop`), `pogo_jump`, `hanging_leg_raise` with `vertical_jump` / plyometric tags on default gym profiles; enrich starter_exercises if absent.
- Revisit Phase 9 med-ball `plyometric` stimulus tagging for non-vertical-jump contexts (boxing, golf rotation) — intentionally unchanged in this run.
- Prescription subsystem: depth-jump volume caps and landing-mechanics pairing when `reactive_landing` sub-focus is selected.
