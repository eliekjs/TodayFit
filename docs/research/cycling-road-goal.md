# Evidence review: Cycling (road) – per-sport exercise selection

**Date:** 2025-03-16  
**Subsystem:** Per-sport logic for exercise selection (cycling road goal and sub-focuses)  
**Agent run:** workout-logic-research-integration-agent

---

## 1. Research question

What exercises and training modalities best support road cycling performance, and how should the app select exercises when the user chooses “Cycling (Road)” as a sport?

---

## 2. Sources

| Source | Type (Tier) | Link / DOI | Key claim(s) |
|--------|-------------|------------|--------------|
| Heavy strength training on endurance cyclist performance (Springer / PubMed) | Systematic review & meta-analysis | PMC40632222, Springer 10.1007/s00421-025-05883-2 | Heavy strength (≥80% 1RM) improves cycling performance, efficiency, anaerobic power; gains via cycling economy and anaerobic power. |
| Resistance training on road cycling performance (NSCA-JSCR / PubMed) | Systematic review | PubMed 20072042 | Explosive-type resistance exercises beneficial; strength should replace some endurance volume rather than add on top. |
| Maximal strength training and cycling economy (NSCA-JSCR) | Primary study | LWW NSCA-JSCR | Half-squats (4×4 at max) 3×/week for 8 weeks improved cycling economy in competitive cyclists. |

---

## 3. Classification of findings

### High-confidence rules (implemented)

- **Heavy strength training** (squat, hinge, leg strength) improves cycling economy and performance in road cyclists.  
  Source: systematic reviews and meta-analyses.  
  Implemented: `cycling_road` added to `SPORT_QUALITY_WEIGHTS` (aerobic_base, posterior_chain_endurance, trunk_endurance, core_tension, unilateral_strength, max_strength); session intent uses Lower body bias so leg and core work are prioritized.

- **Leg strength and core stability** are the main gym-relevant supports for road cycling (sub-focuses already present: leg_strength, core_stability).  
  Implemented: default sub-focus when none selected is `["leg_strength", "core_stability"]`; `SUB_FOCUS_TAG_MAP` for `cycling_road:leg_strength` enriched with squat_pattern, single_leg_strength, posterior_chain; core_stability with core_anti_rotation.

### Context-dependent heuristics (implemented)

- **Default sub-focus for cycling_road** when user selects no sub-focus: use leg_strength + core_stability so tag-based ranking runs and yields cycling-support exercises.  
  Implemented: `getPreferredExerciseNamesForSportAndGoals` in `lib/db/starterExerciseRepository.ts` sets `subSlugs = ["leg_strength", "core_stability"]` when `primarySlug === "cycling_road"` and no sub-focus provided.

- **Body bias Lower** for cycling sport days so generator prefers lower-body and core over generic full-body.  
  Implemented: `sessionIntentForSport` in `services/sportPrepPlanner/index.ts` sets `bodyRegionBias: { targetBody: "Lower", targetModifier: [] }` when `sportSlug === "cycling_road"`.

### Speculative / deferred

- Substituting strength for endurance volume (vs adding on top): not implemented as automatic prescription; left to user programming.  
- Exact periodization (in-season vs off-season) for cycling: current scope is exercise selection only.

---

## 4. Comparison to previous implementation

- **Before:** User selecting “Cycling (Road)” could receive generic full-body workouts; no default sub-focus when none selected, so tag-based ranking might not run; no Lower body bias for sport days; cycling_road was missing from `SPORT_QUALITY_WEIGHTS`.

- **Evidence suggests:** Prioritize leg strength (squat, hinge, single-leg) and core stability; aerobic/zone 2 and threshold are already in sub-focuses; quality weights should reflect aerobic base, posterior chain endurance, trunk/core, and some max strength.

- **Gap closed:** (1) Added `cycling_road` to `SportSlug` and `SPORT_QUALITY_WEIGHTS`. (2) Default sub-focus `["leg_strength", "core_stability"]` when sport is cycling_road and no sub-focus selected. (3) Session intent for cycling_road includes Lower body bias. (4) Enriched `SUB_FOCUS_TAG_MAP` for leg_strength (squat_pattern, single_leg_strength, posterior_chain) and core_stability (core_anti_rotation). (5) Migration appends cycling-relevant tags (glute_strength, core_stability, zone2_cardio, aerobic_base, cycling) to starter_exercises so they rank highly for cycling_road.

---

## 5. Metadata / ontology impact

- **Sport quality weights:** `cycling_road` in `sportQualityWeights.ts` (aerobic_base, aerobic_power, posterior_chain_endurance, trunk_endurance, core_tension, unilateral_strength, max_strength, recovery).
- **Tag map:** `SUB_FOCUS_TAG_MAP` for `cycling_road:leg_strength` and `cycling_road:core_stability` expanded with additional tag slugs.
- **Starter_exercises:** Migration `20250316100003_cycling_road_starter_exercises_tags.sql` appends glute_strength, core_stability, zone2_cardio, aerobic_base, cycling to relevant rows.
- **Session intent:** Lower body bias when `sportSlug === "cycling_road"`.
- **Selection flow:** Default sub-focus for cycling_road in `getPreferredExerciseNamesForSportAndGoals`; generator +10 bonus for preferred names.

---

## 6. Open questions / follow-ups

- Consider zone2/bike-specific conditioning block when session is cycling sport day (e.g. prefer assault bike / bike intervals).
- Revisit prescription (heavy, low-rep leg strength vs moderate) when goal-specific prescription subsystem is in scope.
