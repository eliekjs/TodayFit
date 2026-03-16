# Primary movement family audit — ontology alignment

**Date:** 2025-03-25  
**Scope:** Ensure every active exercise has correct `primary_movement_family` per ontology (user-facing body-part / emphasis for strict body-part focus and “what did we train today”).  
**Run type:** Exercise DB enrichment (one category: primary_movement_family).

---

## 1. Purpose

- **primary_movement_family** = single slug for strict body-part filter (hard_include) and session summary.
- **Allowed values:** `upper_push` | `upper_pull` | `lower_body` | `core` | `mobility` | `conditioning`.
- When set, generator and eligibility use it; when null, code derives from movement_pattern + muscle_groups (see `eligibilityHelpers.deriveMovementFamily()`).

---

## 2. Canonical values (ontology § C.2)

| Slug | Definition | When to use |
|------|------------|-------------|
| `upper_push` | Upper-body pressing (chest, shoulders, triceps) | Bench, OH press, push-ups, dips |
| `upper_pull` | Upper-body pulling (back, biceps, rear delt) | Rows, pull-ups, lat pulldown, face pull |
| `lower_body` | Lower-body dominant (quads, glutes, hamstrings, calves) | Squat, hinge, lunge, leg press, loaded carry |
| `core` | Trunk / anti-movement / rotation | Plank, dead bug, pallof, rotation, carry (core focus) |
| `mobility` | Mobility / ROM / activation (not conditioning) | T-spine rotation, hip mobility, band work |
| `conditioning` | Cardio / work capacity (not strength-dominant) | Run, bike, row, ski erg, circuits as cardio |

**Hybrids:** Use primary for dominant emphasis; set `secondary_movement_families` when exercise clearly contributes to another family (e.g. thruster: primary `lower_body`, secondary `['upper_push']`).

---

## 3. Derivation rules (from existing backfill + eligibilityHelpers)

- **mobility** if modalities include mobility or recovery.
- **conditioning** if modalities include conditioning and movement_pattern = locomotion (or movement_patterns includes locomotion).
- **upper_push** if movement_pattern = push and primary_muscles overlap chest, triceps, shoulders.
- **upper_pull** if movement_pattern = pull and primary_muscles overlap lats, biceps, upper_back, back.
- **lower_body** if movement_pattern in (squat, hinge, locomotion) and primary_muscles overlap legs, quads, glutes, hamstrings.
- **core** if movement_pattern = carry and primary_muscles include core (and not lower-dominant); or movement_pattern = rotate; or primary_muscles are core-only (no legs).
- **lower_body** for squat/hinge when in doubt (default for lower-body patterns).
- **core** for rotate and core-dominant work.

---

## 4. Implementation

- Backfill `primary_movement_family` for every active exercise where it is NULL or empty, using movement_pattern + primary_muscles + modalities (and slug where helpful).
- Normalize any invalid value to one of the six slugs (or derive from movement_pattern/muscles).
- Optionally set `secondary_movement_families` for clear hybrids (thruster, clean and press, etc.) in a follow-up if desired.

---

## 5. Validation

- Every active exercise has primary_movement_family in (upper_push, upper_pull, lower_body, core, mobility, conditioning).
- Body-part focus (hard_include) in generator correctly includes/excludes exercises by family.

---

## 6. References

- Project: docs/EXERCISE_ONTOLOGY_DESIGN.md § C.2, lib/ontology/vocabularies.ts (MOVEMENT_FAMILIES), logic/workoutIntelligence/constraints/eligibilityHelpers.ts (deriveMovementFamily), supabase/migrations/20250312000002_exercise_structured_backfill.sql.
