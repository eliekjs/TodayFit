# Evidence review: Swimming (lap / open water) – per-sport exercise selection

**Date:** 2025-03-16  
**Subsystem:** Per-sport logic for exercise selection (swimming goal and sub-focuses)  
**Agent run:** workout-logic-research-integration-agent

---

## 1. Research question

What dryland exercises and training modalities best support swimming (lap / open water) performance, and how should the app select exercises when the user chooses “Swimming” as a sport?

---

## 2. Sources

| Source | Type (Tier) | Link / DOI | Key claim(s) |
|--------|-------------|------------|--------------|
| Dry-land training and swimming turn performance (MDPI / PMC) | Systematic review | PMC8431432, PubMed 34501929 | Strength, ballistic, plyometric (neural focus) improve turn performance; leg-extensor focus for turns. |
| Transfer of dry-land resistance training to swimming (PMC) | Review | PMC7706652 | Transfer occurs when dryland programs are swim-specific. |
| Triathlon / swim-specific (existing) | Heuristic | — | Scapular control, shoulder stability, core anti-extension are standard swim-support targets. |

---

## 3. Classification of findings

### High-confidence rules (implemented)

- **Pull strength and scapular/shoulder stability** are central for swim-specific dryland (stroke mechanics, injury resilience).  
  Implemented: `swimming_open_water` in `SPORT_QUALITY_WEIGHTS` (pulling_strength, scapular_stability, core_tension); sub-focuses pull_strength and shoulder_scapular with tag maps; session intent uses Upper + Pull bias.

- **Core stability** supports body position and transfer.  
  Implemented: core_stability sub-focus and tag map; default sub-focus includes core_stability; migration appends core tags to relevant starter_exercises.

### Context-dependent heuristics (implemented)

- **Default sub-focus for swimming_open_water** when no sub-focus selected: pull_strength, shoulder_scapular, core_stability so tag-based ranking runs.  
  Implemented: `getPreferredExerciseNamesForSportAndGoals` sets `subSlugs = ["pull_strength", "shoulder_scapular", "core_stability"]` when `primarySlug === "swimming_open_water"` and no sub-focus provided.

- **Body bias Upper + Pull** for swimming sport days so generator prefers pull and shoulder/scapular work.  
  Implemented: `sessionIntentForSport` sets `bodyRegionBias: { targetBody: "Upper", targetModifier: ["Pull"] }` when `sportSlug === "swimming_open_water"`.

- **Leg/turn power** as optional sub-focus (turns contribute to race time; leg extensors).  
  Implemented: leg_turn_power sub-focus with explosive_power, squat_pattern, quads, glute_strength in tag map.

### Speculative / deferred

- Core training evidence for swimming was not conclusive in the turn-focused review; we retain core as heuristic from triathlon/swim practice.
- Optimal periodization (in-water vs dryland emphasis): current scope is exercise selection only.

---

## 4. Comparison to previous implementation

- **Before:** “Swimming (Lap / Open Water)” had no entry in `SPORTS_WITH_SUB_FOCUSES` or `SUB_FOCUS_TAG_MAP`; no default sub-focus; no body bias; `swimming_open_water` was missing from `SPORT_QUALITY_WEIGHTS`; users could get generic full-body workouts.

- **Evidence suggests:** Prioritize pull strength, scapular/shoulder stability, core; optional leg power for turns; aerobic base for endurance.

- **Gap closed:** (1) Added `swimming_open_water` to `SportSlug` and `SPORT_QUALITY_WEIGHTS`. (2) Added `swimming_open_water` to `SPORTS_WITH_SUB_FOCUSES` with sub-focuses pull_strength, shoulder_scapular, core_stability, aerobic_base, leg_turn_power. (3) Added `SUB_FOCUS_TAG_MAP` entries for all five. (4) Default sub-focus when none selected. (5) Session intent with Upper + Pull bias. (6) Migration appends swimming-relevant tags to starter_exercises.

---

## 5. Metadata / ontology impact

- **Sport quality weights:** `swimming_open_water` in `sportQualityWeights.ts` (pulling_strength, scapular_stability, core_tension, trunk_endurance, aerobic_base, pushing_strength, power, recovery).
- **Tag map:** `SUB_FOCUS_TAG_MAP` for swimming_open_water: pull_strength, shoulder_scapular, core_stability, aerobic_base, leg_turn_power.
- **Starter_exercises:** Migration `20250316100005_swimming_open_water_starter_exercises_tags.sql` appends pulling_strength, vertical_pull, horizontal_pull, scapular_control, shoulder_stability, core_stability, core_anti_extension, swimming to relevant rows.
- **Session intent:** Upper body + Pull modifier when `sportSlug === "swimming_open_water"`.
- **Selection flow:** Default sub-focus in `getPreferredExerciseNamesForSportAndGoals`; generator +10 bonus for preferred names.

---

## 6. Open questions / follow-ups

- Consider rower or swim-specific conditioning block when session is swimming sport day (e.g. optional rower for upper-body endurance).
- Revisit leg/turn power prescription (plyometric vs heavy strength) when prescription subsystem is in scope.
