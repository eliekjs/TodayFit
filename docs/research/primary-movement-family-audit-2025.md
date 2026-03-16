# Primary movement family audit: NSCA/ACSM-style, enrichment and priority

**Date:** 2025-03-16  
**Category:** Exercise DB enrichment — primary_movement_family / secondary_movement_families  
**Scope:** Audit and enrich primary_movement_family using same sources (NSCA, ACSM, ExRx, NCSF); add secondary_movement_families where exercises clearly contribute to another family; document and use family priority in workout generation.

---

## 1. Research question

Which movement family (user-facing body-part / emphasis) is primary for each exercise, and which secondaries apply? How should the generator use primary vs secondary for body-part focus and scoring?

---

## 2. Sources

| Source | Type (Tier) | Link / key claim(s) |
|--------|-------------|----------------------|
| **NSCA** — The 8 Main Movement Patterns | Tier 1 | [NSCA TSAC Report](https://www.nsca.com/education/articles/tsac-report/the-8-main-movement-patterns/): Squat, hinge, push, pull, carry, etc. as programming framework; balance across movement categories. |
| **NSCA** — Program Design Essentials, Foundations of Fitness Programming | Tier 1 | Select exercises across movement categories; core integrates across patterns; upper/lower/rotational balance. |
| **NSCA** — Teaching Resistance Training Movement Patterns | Tier 1 | [NSCA PTQ](https://www.nsca.com/education/articles/ptq/teaching-resistance-training-movement-patterns/): Progressive strategies; pattern classification. |
| **ACSM** — Resistance training guidelines | Tier 1 | Multi-joint exercises; sequencing (large before small); movement categories. |
| **ExRx.net** — Exercise Directory by body region | Tier 2 | Upper/lower by region; push/pull by plane. |
| **NCSF** — Movement patterns (same audit context) | Tier 2 | Reinforces push/pull/lower/core/conditioning. |
| **Project** — docs/EXERCISE_ONTOLOGY_DESIGN.md § C.2, lib/ontology/vocabularies.ts (MOVEMENT_FAMILIES), eligibilityHelpers.deriveMovementFamily() | Internal | upper_push, upper_pull, lower_body, core, mobility, conditioning. |

---

## 3. Classification of findings

### High-confidence rules (implemented)

- **Primary = dominant emphasis:** primary_movement_family is the single slug that best describes “what we train” for that exercise (user-facing). Strict body-part filter uses primary OR secondary; scoring prefers primary match (scoreMovementFamilyFit: 1.5 primary, 0.8 secondary).
- **Secondaries for hybrids:** When an exercise clearly contributes to another family, set secondary_movement_families (e.g. thruster: primary lower_body, secondary upper_push; clean and press: primary lower_body, secondary upper_pull and upper_push; rows: primary upper_pull, secondary core for bracing).
- **Canonical slugs only:** upper_push | upper_pull | lower_body | core | mobility | conditioning (MOVEMENT_FAMILIES).
- **Conditioning:** Ergs, runs, bike, ski erg, rower, zone2 variants, battle ropes, etc. → primary_movement_family = conditioning.
- **Mobility/recovery:** Modalities mobility/recovery → primary = mobility.

### Context-dependent heuristics (implemented)

- **Loaded carry:** Core-dominant (farmer/suitcase with core focus) → core; legs heavily involved → lower_body. Overhead/waiter → core, shoulders.
- **Compound Olympic derivatives:** Jerks (push/split/squat jerk): primary upper_push (press dominant), secondary lower_body (leg drive). Snatch, clean: primary lower_body or hinge-dominant, secondary upper_pull/upper_push as appropriate.
- **Rows:** Primary upper_pull; add secondary core where heavy bracing is required (barbell row, pendlay, t-bar).

### Speculative / deferred

- Finer “emphasis” levels within a family (e.g. chest-dominant vs shoulder-dominant push) stay in pairing_category / movement_patterns; no new family slug.

---

## 4. Comparison to previous implementation

- **Before:** primary_movement_family backfilled in 20250325000003; hybrids (thruster, clean_and_press, push_press, push_jerk) had secondary_movement_families; scoreMovementFamilyFit already gave 1.5 for primary and 0.8 for secondary.
- **After:** (1) Enrich secondary_movement_families for more exercises (db_snatch, split_jerk, squat_jerk, sled_push, rows with core, hanging leg raise / toes to bar with upper_pull where appropriate). (2) Set primary_movement_family for any conditioning/mobility stragglers. (3) Document in ontology that generator uses primary for strict filter and primary > secondary in scoring (already implemented). (4) Normalize any invalid values.

---

## 5. Metadata / ontology impact

- **DB:** primary_movement_family (text), secondary_movement_families (text[]). No new slugs.
- **Ontology:** C.2 updated to state that generator uses primary for strict body-part include; scoring gives higher weight to primary family match than secondary (scoreMovementFamilyFit).
- **Generation:** filterByHardConstraints uses getEffectiveFamiliesForExercise (primary + secondary); scoreMovementFamilyFit in ontology scoring gives 1.5 for primary match, 0.8 for secondary.

---

## 6. Validation

- Every active exercise has primary_movement_family in allowed set.
- Body-part focus (hard_include) includes exercise if allowed family is in primary or secondary.
- When focus is set, exercises whose primary_movement_family matches focus score higher than those with only secondary match.
