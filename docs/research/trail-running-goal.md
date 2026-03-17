# Evidence review: Trail running – per-sport exercise selection

**Date:** 2025-03-16  
**Subsystem:** Per-sport logic for exercise selection (trail running goal and sub-focuses)  
**Agent run:** workout-logic-research-integration-agent

---

## 1. Research question

What exercises and training modalities best support trail running (off-road, uneven terrain, hills, descents), and how should the app select exercises when the user chooses “Trail Running” as a sport?

---

## 2. Sources

| Source | Type (Tier) | Link / DOI | Key claim(s) |
|--------|-------------|------------|--------------|
| Trail / mountain running and strength (consensus) | Practitioner / review | — | Single-leg strength, glute strength, eccentric control, and ankle stability support uphill and downhill performance and injury resilience. |
| Running economy and leg resilience | Same as road running | — | Single-leg and posterior chain work support economy and durability; eccentric and knee/ankle work reduce injury risk. |
| Existing goal_tag_profile (trail_running) | Codebase | 20250305100001 | sport_trail, single_leg, unilateral, calves, balance, posterior_chain, quads, conditioning, low_impact. |

---

## 3. Classification of findings

### High-confidence rules (implemented)

- **Uphill endurance** is supported by single-leg strength, glute strength, and aerobic base (sub-focuses already present).  
  Implemented: default sub-focus when none selected includes uphill_endurance, downhill_control, ankle_stability; `SUB_FOCUS_TAG_MAP` for uphill_endurance enriched with squat_pattern, posterior_chain.

- **Downhill control** depends on eccentric quad strength and knee stability.  
  Implemented: downhill_control tag map includes eccentric_quad_strength, knee_stability, single_leg_strength, balance; migration appends these tags to relevant starter_exercises.

- **Ankle stability and balance** support uneven terrain and terrain adaptability.  
  Implemented: ankle_stability and terrain_adaptability tag maps; default sub-focus includes ankle_stability; migration appends ankle_stability, balance, trail to calf/tibialis/single-leg rows.

### Context-dependent heuristics (implemented)

- **Default sub-focus for trail_running** when no sub-focus selected: use uphill_endurance, downhill_control, ankle_stability so tag-based ranking runs.  
  Implemented: `getPreferredExerciseNamesForSportAndGoals` sets `subSlugs = ["uphill_endurance", "downhill_control", "ankle_stability"]` when `primarySlug === "trail_running"` and no sub-focus provided.

- **Body bias Lower** for trail running sport days so generator prefers lower-body and single-leg work.  
  Implemented: `sessionIntentForSport` sets `bodyRegionBias: { targetBody: "Lower", targetModifier: [] }` when `sportSlug === "trail_running"`.

### Speculative / deferred

- Exact periodization and trail-specific workout types: current scope is gym exercise selection only.

---

## 4. Comparison to previous implementation

- **Before:** User selecting “Trail Running” had no default sub-focus when none selected; no Lower body bias for sport days; tag map for uphill/downhill/ankle was minimal (no squat_pattern, posterior_chain, or richer weights).

- **Evidence suggests:** Prioritize single-leg and glute strength, eccentric and knee stability, ankle stability and balance for uphill, downhill, and terrain adaptability.

- **Gap closed:** (1) Default sub-focus `["uphill_endurance", "downhill_control", "ankle_stability"]` when sport is trail_running and no sub-focus selected. (2) Session intent for trail_running includes Lower body bias. (3) Enriched `SUB_FOCUS_TAG_MAP` for uphill_endurance (squat_pattern, posterior_chain), downhill_control (single_leg_strength, balance), ankle_stability (single_leg_strength, calves), terrain_adaptability (glute_strength). (4) Migration appends trail-running-relevant tags to starter_exercises so they rank highly for trail_running.

---

## 5. Metadata / ontology impact

- **Sport quality weights:** trail_running already in `sportQualityWeights.ts` (aerobic_base, unilateral_strength, balance, eccentric_strength, hip_stability); no change.
- **Tag map:** `SUB_FOCUS_TAG_MAP` for trail_running sub-focuses expanded with additional tag slugs and weights.
- **Starter_exercises:** Migration `20250316100006_trail_running_starter_exercises_tags.sql` appends single_leg_strength, glute_strength, eccentric_quad_strength, knee_stability, ankle_stability, balance, zone2_cardio, aerobic_base, trail to relevant rows.
- **Session intent:** Lower body bias when `sportSlug === "trail_running"`.
- **Selection flow:** Default sub-focus for trail_running in `getPreferredExerciseNamesForSportAndGoals`; generator +10 bonus for preferred names.

---

## 6. Open questions / follow-ups

- Consider treadmill incline / hike-specific conditioning when session is trail running sport day (e.g. prefer incline walk, step-up).
- Revisit prescription (eccentric emphasis for downhill) when goal-specific prescription is in scope.
