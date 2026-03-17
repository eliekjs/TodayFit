# Evidence review: Road running – per-sport exercise selection

**Date:** 2025-03-16  
**Subsystem:** Per-sport logic for exercise selection (road running goal and sub-focuses)  
**Agent run:** workout-logic-research-integration-agent

---

## 1. Research question

What exercises and training modalities best support road running performance (5K–marathon), and how should the app select exercises when the user chooses “Road Running” as a sport?

---

## 2. Sources

| Source | Type (Tier) | Link / DOI | Key claim(s) |
|--------|-------------|------------|--------------|
| Strength training for runners (systematic reviews) | Meta-analysis / review | Multiple (e.g. BJSM, Sports Med) | Strength training improves running economy and performance; single-leg and posterior chain work reduce injury risk. |
| Running economy and strength | Review / primary | — | Single-leg strength, glute strength, core stability, and eccentric control support running economy and durability. |
| Leg resilience / injury prevention | Consensus | — | Eccentric quad strength, knee stability, calf and ankle work support leg resilience for high-mileage running. |

---

## 3. Classification of findings

### High-confidence rules (implemented)

- **Running economy** is supported by single-leg strength, glute strength, and core stability (sub-focuses already present).  
  Implemented: default sub-focus when none selected includes `running_economy` and `leg_resilience`; `SUB_FOCUS_TAG_MAP` for these enriched with squat_pattern, hinge_pattern, posterior_chain, ankle_stability.

- **Leg resilience** (eccentric, knee stability, calves, ankle) supports durability and injury risk reduction.  
  Implemented: `leg_resilience` tag map includes eccentric_quad_strength, knee_stability, calves, single_leg_strength, ankle_stability; migration appends these tags to relevant starter_exercises.

### Context-dependent heuristics (implemented)

- **Default sub-focus for road_running** when no sub-focus selected: use running_economy + leg_resilience so tag-based ranking runs and yields running-support exercises.  
  Implemented: `getPreferredExerciseNamesForSportAndGoals` sets `subSlugs = ["running_economy", "leg_resilience"]` when `primarySlug === "road_running"` and no sub-focus provided.

- **Body bias Lower** for road running sport days so generator prefers lower-body and core over generic full-body.  
  Implemented: `sessionIntentForSport` sets `bodyRegionBias: { targetBody: "Lower", targetModifier: [] }` when `sportSlug === "road_running"`.

### Speculative / deferred

- Exact periodization (base vs sharpening) and run-specific workout types: current scope is gym exercise selection only.

---

## 4. Comparison to previous implementation

- **Before:** User selecting “Road Running” could receive generic full-body workouts; no default sub-focus when none selected; no Lower body bias for sport days; tag map for running_economy and leg_resilience was minimal.

- **Evidence suggests:** Prioritize single-leg and glute strength, core stability, eccentric and knee/ankle work for running economy and leg resilience.

- **Gap closed:** (1) Default sub-focus `["running_economy", "leg_resilience"]` when sport is road_running and no sub-focus selected. (2) Session intent for road_running includes Lower body bias. (3) Enriched `SUB_FOCUS_TAG_MAP` for running_economy (squat_pattern, hinge_pattern, posterior_chain) and leg_resilience (single_leg_strength, ankle_stability). (4) Migration appends running-relevant tags to starter_exercises so they rank highly for road_running.

---

## 5. Metadata / ontology impact

- **Sport quality weights:** road_running already in `sportQualityWeights.ts` (aerobic_base, aerobic_power, posterior_chain_endurance, tendon_resilience, recovery); no change.
- **Tag map:** `SUB_FOCUS_TAG_MAP` for `road_running:running_economy` and `road_running:leg_resilience` expanded with additional tag slugs.
- **Starter_exercises:** Migration `20250316100004_road_running_starter_exercises_tags.sql` appends single_leg_strength, glute_strength, core_stability, eccentric_quad_strength, knee_stability, calves, ankle_stability, zone2_cardio, aerobic_base, running to relevant rows.
- **Session intent:** Lower body bias when `sportSlug === "road_running"`.
- **Selection flow:** Default sub-focus for road_running in `getPreferredExerciseNamesForSportAndGoals`; generator +10 bonus for preferred names.

---

## 6. Open questions / follow-ups

- Consider treadmill/run-specific conditioning block when session is road running sport day (e.g. prefer treadmill incline walk / zone 2 run).
- Revisit prescription (e.g. heavy vs moderate leg strength for runners) when goal-specific prescription is in scope.
