# Evidence review: Cycling (mountain) – per-sport exercise selection

**Date:** 2025-03-16  
**Subsystem:** Per-sport logic for exercise selection (cycling mountain / MTB goal and sub-focuses)  
**Agent run:** workout-logic-research-integration-agent

---

## 1. Research question

What dryland/gym exercises best support mountain biking (MTB) performance, and how should the app select exercises when the user chooses “Cycling (Mountain)” as a sport?

---

## 2. Sources

| Source | Type (Tier) | Link / DOI | Key claim(s) |
|--------|-------------|------------|--------------|
| Effects of core strength training on female mountain bikers (PMC) | Primary study | PMC12972400 | Trunk muscle strength training improved maximal trunk flexor/extensor strength and reduced lateral bike displacement (mechanical efficiency). |
| Strength exercises every mountain biker should do (MTB Strength Coach) | Practitioner | mtbstrengthcoach.ca | Single-leg squat variations, deadlifts/RDL, pull/row, anti-movement core; 2–3×/week off-season. |
| Get stronger, ride harder (Canadian Cycling Magazine) | Practitioner | cyclingmagazine.ca | Lower body (single-leg, posterior chain), upper body (pull > push), core anti-rotation/extension. |

---

## 3. Classification of findings

### High-confidence rules (implemented)

- **Leg strength** (single-leg, posterior chain, squat/hinge) supports pedaling power and stability on trail.  
  Implemented: `cycling_mtb` in `SPORT_QUALITY_WEIGHTS` (unilateral_strength, max_strength, posterior_chain_endurance); `leg_strength` sub-focus with tag map favoring single_leg_strength, glute_strength, hinge_pattern, squat_pattern.

- **Core stability** (anti-extension, anti-rotation) improves bike-body separation and handling.  
  Implemented: Core strength training evidence (PMC12972400); `core_stability` sub-focus with same tag map as road; migration appends core_stability / core_anti_rotation + cycling_mtb to relevant starter_exercises.

### Context-dependent heuristics (implemented)

- **Default sub-focus for cycling_mtb** when no sub-focus selected: leg_strength, core_stability so tag-based ranking runs.  
  Implemented: `getPreferredExerciseNamesForSportAndGoals` sets `subSlugs = ["leg_strength", "core_stability"]` when `primarySlug === "cycling_mtb"`.

- **Body bias Lower** for MTB sport days (same as road cycling).  
  Implemented: `sessionIntentForSport` sets `bodyRegionBias: { targetBody: "Lower", targetModifier: [] }` when `sportSlug === "cycling_mtb"`.

- **Power endurance** sub-focus for repeated efforts (climbs, punchy terrain).  
  Implemented: `power_endurance` sub-focus with tag map (strength_endurance, anaerobic_capacity, single_leg_strength).

### Speculative / deferred

- Upper-body pull (rows, pull-ups) for braking/cornering: practitioner consensus; not yet wired as separate sub-focus; lower + core default covers main gym focus.
- Exact periodization (in-season vs off-season) for MTB: current scope is exercise selection only.

---

## 4. Comparison to previous implementation

- **Before:** “Cycling (Mountain)” (slug `cycling_mtb`) had no entry in `SPORTS_WITH_SUB_FOCUSES` or `SUB_FOCUS_TAG_MAP`; no default sub-focus; no body bias; `cycling_mtb` was missing from `SportSlug` and `SPORT_QUALITY_WEIGHTS`; only a few exercises linked via `sport_cycling_mtb` in earlier migrations.

- **Evidence suggests:** Prioritize single-leg and posterior chain leg strength, core anti-movement, aerobic base, and power endurance for repeated efforts.

- **Gap closed:** (1) Added `cycling_mtb` to `SportSlug` and `SPORT_QUALITY_WEIGHTS` (with balance and slightly higher unilateral/power than road). (2) Added `cycling_mtb` to `SPORTS_WITH_SUB_FOCUSES` with sub-focuses aerobic_base, threshold, power_endurance, leg_strength, core_stability. (3) Added `SUB_FOCUS_TAG_MAP` for all five. (4) Default sub-focus when none selected. (5) Session intent with Lower body bias. (6) Migration appends cycling_mtb-relevant tags to starter_exercises (leg, core, conditioning).

---

## 5. Metadata / ontology impact

- **Sport quality weights:** `cycling_mtb` in `sportQualityWeights.ts` (aerobic_base, aerobic_power, posterior_chain_endurance, trunk_endurance, core_tension, unilateral_strength, max_strength, balance, recovery).
- **Tag map:** `SUB_FOCUS_TAG_MAP` for `cycling_mtb` with aerobic_base, threshold, power_endurance, leg_strength, core_stability.
- **Starter_exercises:** Migration `20250316100009_cycling_mtb_starter_exercises_tags.sql` appends glute_strength, single_leg_strength, core_stability, zone2_cardio, aerobic_base, cycling_mtb to relevant rows.
- **Session intent:** Lower body bias when `sportSlug === "cycling_mtb"`.

---

## 6. Open questions / follow-ups

- Consider adding an upper-body pull sub-focus or modifier for MTB (braking/cornering).
- Revisit balance/instability exercises for technical trail when balance tagging is richer.
