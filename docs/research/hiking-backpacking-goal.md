# Evidence review: Hiking / Backpacking – per-sport exercise selection

**Date:** 2025-03-16  
**Subsystem:** Per-sport logic for exercise selection (hiking / backpacking goal and sub-focuses)

---

## 1. Research question

What dryland/gym exercises best support hiking and backpacking performance (including load carriage), and how should the app select exercises when the user chooses "Hiking / Backpacking" as a sport?

---

## 2. Sources

| Source | Type | Key claim(s) |
|--------|------|--------------|
| Progressive loaded hike conditioning (ACSM-MSSE 2022) | Primary | 6-week progressive load carriage improved run times and fitness, reduced injuries in Marine recruits. |
| Systematic review load carriage (NSCA-JSCR 2012) | Systematic review | Largest effects: resistance + aerobic; including progressive load-carriage (≈1.7 SD). |
| Long duration load carriage & ACFT (NSCA-JSCR 2024) | Primary | Load carriage performance associated with fat-free mass; +1 kg FFM → +24% odds completing loaded march. |
| Squat workout for steep hikes (Backpacker) | Practitioner | Back/side/Bulgarian split squats; glute/quad for climbing, core for load. |
| Hip work in backpack loads and slopes (PubMed 38219556) | Primary | Hip musculotendon work depends on pack load and slope—supports leg/hip strength for loaded uphill. |

---

## 3. Classification of findings

### High-confidence (implemented)

- **Progressive resistance + aerobic + load carriage** produces largest improvements. Implemented: hiking_backpacking in SPORT_QUALITY_WEIGHTS; sub-focuses aerobic_base, uphill_endurance, load_carriage_durability, leg_strength, ankle_stability.
- **Leg strength** (squat, single-leg, glutes, posterior chain) supports climbing and load. Implemented: leg_strength and uphill_endurance tag maps; migration appends tags to step-up, squats, single_leg_rdl, etc.
- **Load carriage and durability**: carries, strength endurance, core. Implemented: load_carriage_durability sub-focus with carry, strength_endurance; migration tags farmer_carry, suitcase_carry.
- **Ankle stability and balance** for uneven terrain. Implemented: ankle_stability sub-focus; migration appends to calf and single-leg exercises.

### Context-dependent (implemented)

- **Default sub-focus** when none selected: uphill_endurance, leg_strength, ankle_stability.
- **Body bias Lower** for hiking_backpacking sport days in sessionIntentForSport.

---

## 4. Before vs after

- **Before:** No SPORTS_WITH_SUB_FOCUSES, SUB_FOCUS_TAG_MAP, default sub-focus, or body bias; hiking_backpacking missing from SportSlug and SPORT_QUALITY_WEIGHTS.
- **Gap closed:** Added hiking_backpacking to SportSlug and SPORT_QUALITY_WEIGHTS; SPORTS_WITH_SUB_FOCUSES with five sub-focuses; SUB_FOCUS_TAG_MAP for all; default sub-focus; Lower body bias; migration 20250316100010 for starter_exercises tags.

---

## 5. Metadata / ontology

- Sport quality weights: aerobic_base, unilateral_strength, posterior_chain_endurance, trunk_endurance, core_tension, balance, max_strength, recovery.
- Tag map: aerobic_base, uphill_endurance, load_carriage_durability, leg_strength, ankle_stability.
- Migration: 20250316100010_hiking_backpacking_starter_exercises_tags.sql.

---

## 6. Open questions

- Optional "loaded hike" / ruck session type with duration/load progression.
- Trunk and core prescription for heavy pack when goal-specific prescription is in scope.
