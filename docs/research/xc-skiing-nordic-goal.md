# Evidence review: Cross-country skiing (Nordic) – per-sport exercise selection

**Date:** 2025-03-16  
**Subsystem:** Per-sport logic for exercise selection (XC / Nordic skiing goal and sub-focuses)  
**Agent run:** workout-logic-research-integration-agent

---

## 1. Research question

What dryland/gym exercises best support cross-country (Nordic) skiing performance, and how should the app select exercises when the user chooses “Cross-Country Skiing (Nordic)” as a sport?

---

## 2. Sources

| Source | Type (Tier) | Link / DOI | Key claim(s) |
|--------|-------------|------------|--------------|
| Strength training and XC skiing performance (MDPI IJERPH) | Systematic review | ijerph-19-06522 | Maximal strength training may improve performance, double-poling economy, and maximal strength. |
| Strength and power training in XC skiers (PMC) | Systematic review | PMC9741725 | Strength and power training positively affect physiological and biomechanical characteristics. |
| Double-poling and strength (Springer / PubMed) | Primary study | PubMed 29024041 | Strength training improves double-poling performance after prolonged submaximal exercise. |
| Dryland training 101 (Nordic Racers) | Practitioner | nordicracers.ca | Endurance (bike, run, ski erg), strength (upper, lower, core), coordination. |

---

## 3. Classification of findings

### High-confidence rules (implemented)

- **Double-pole / upper body** strength (pulling, trunk, core) improves double-poling economy and performance.  
  Implemented: `double_pole_upper` sub-focus with tag map (pulling_strength, trunk_endurance, core_anti_extension, lats, back); default sub-focus includes double_pole_upper.

- **Leg drive** (single-leg, glutes, posterior chain, squat/hinge) supports kick and overall skiing.  
  Implemented: `leg_drive` sub-focus with single_leg_strength, glute_strength, posterior_chain, squat_pattern, hinge_pattern; migration appends these tags to relevant starter_exercises.

- **Core stability** and **aerobic base** support sustained XC skiing.  
  Implemented: core_stability and aerobic_base sub-focuses with tag maps; durability sub-focus (strength_endurance, posterior_chain, core_stability).

### Context-dependent heuristics (implemented)

- **Default sub-focus for xc_skiing** when no sub-focus selected: double_pole_upper, leg_drive, core_stability so tag-based ranking runs.  
  Implemented: `getPreferredExerciseNamesForSportAndGoals` sets `subSlugs = ["double_pole_upper", "leg_drive", "core_stability"]` when `primarySlug === "xc_skiing"` and no sub-focus provided.

- **Body bias Full** for XC skiing sport days so generator can select both upper (pull, core) and lower (leg drive) work.  
  Implemented: `sessionIntentForSport` sets `bodyRegionBias: { targetBody: "Full", targetModifier: [] }` when `sportSlug === "xc_skiing"`.

### Speculative / deferred

- Ski-ergometer-specific prescription and technique work: current scope is gym exercise selection; ski erg remains in exercise–sport tagging for conditioning.

---

## 4. Comparison to previous implementation

- **Before:** “Cross-Country Skiing (Nordic)” (slug `xc_skiing`) had no entry in `SPORTS_WITH_SUB_FOCUSES` or `SUB_FOCUS_TAG_MAP`; no default sub-focus; no body bias; xc_skiing was missing from `SPORT_QUALITY_WEIGHTS`; only a few exercises (ski_erg, rower, incline_treadmill_walk) were linked via sport_xc_skiing in migrations.

- **Evidence suggests:** Prioritize upper-body pull and trunk/core (double pole), leg drive (single-leg, posterior chain), core stability, and aerobic base.

- **Gap closed:** (1) Added `xc_skiing` to `SportSlug` and `SPORT_QUALITY_WEIGHTS`. (2) Added `xc_skiing` to `SPORTS_WITH_SUB_FOCUSES` with sub-focuses aerobic_base, double_pole_upper, leg_drive, core_stability, durability. (3) Added `SUB_FOCUS_TAG_MAP` entries for all five. (4) Default sub-focus when none selected. (5) Session intent with Full body bias. (6) Migration appends xc_skiing-relevant tags to starter_exercises (pull, leg, core, conditioning).

---

## 5. Metadata / ontology impact

- **Sport quality weights:** `xc_skiing` in `sportQualityWeights.ts` (aerobic_base, aerobic_power, pulling_strength, core_tension, trunk_endurance, posterior_chain_endurance, unilateral_strength, max_strength, recovery).
- **Tag map:** `SUB_FOCUS_TAG_MAP` for xc_skiing: aerobic_base, double_pole_upper, leg_drive, core_stability, durability.
- **Starter_exercises:** Migration `20250316100008_xc_skiing_starter_exercises_tags.sql` appends pulling_strength, single_leg_strength, glute_strength, posterior_chain, core_stability, core_anti_extension, zone2_cardio, aerobic_base, xc_skiing to relevant rows.
- **Session intent:** Full body bias when `sportSlug === "xc_skiing"`.
- **Selection flow:** Default sub-focus for xc_skiing in `getPreferredExerciseNamesForSportAndGoals`; generator +10 bonus for preferred names.

---

## 6. Open questions / follow-ups

- Add or link ski_erg / ski_erg_steady / ski_erg_intervals in starter_exercises with xc_skiing tags when those rows exist.
- Revisit concurrent endurance + maximal strength prescription when goal-specific prescription is in scope.
