# Movement pattern(s) audit — NSCA-style, ontology alignment

**Date:** 2025-03-25  
**Scope:** Ensure every exercise has correct `movement_pattern` (legacy single) and `movement_patterns` (fine array) per NSCA and project ontology.  
**Run type:** Exercise DB enrichment (one category: movement patterns).

---

## 1. Purpose

- **Legacy `movement_pattern`:** Single value for balance and session logic (squat | hinge | push | pull | carry | rotate | locomotion). Used by dailyGenerator for pattern counts and variety.
- **Fine `movement_patterns`:** Array of engine-facing patterns for superset logic, variety caps, and ontology scoring. When set, legacy is derived via `getLegacyMovementPattern()`.

Both columns must be consistent: legacy = mapping of first fine pattern (or explicit legacy when no fine set).

---

## 2. Canonical values

### 2.1 Legacy (single) — `movement_pattern`

From `lib/workoutRules.ts` and `lib/ontology/vocabularies.ts`:

| Value      | Use |
|-----------|-----|
| `squat`   | Knee-dominant lower (squat, leg press, lunge variants) |
| `hinge`   | Hip-dominant lower (deadlift, RDL, hip thrust, KB swing) |
| `push`    | Upper-body push (horizontal + vertical) |
| `pull`    | Upper-body pull (horizontal + vertical) |
| `carry`   | Loaded carry |
| `rotate`  | Rotation, anti-rotation, thoracic mobility, core rotation |
| `locomotion` | Gait, step-up, conditioning (run, row, bike) |

### 2.2 Fine (array) — `movement_patterns`

From `docs/EXERCISE_ONTOLOGY_DESIGN.md` § C.3 and `lib/ontology/vocabularies.ts`:

| Slug                 | Definition | Maps to legacy |
|----------------------|------------|----------------|
| `squat`              | Knee-dominant lower | squat |
| `hinge`              | Hip-dominant lower | hinge |
| `lunge`              | Unilateral/split lower | squat |
| `horizontal_push`    | Chest emphasis (bench, push-up, dip) | push |
| `vertical_push`      | Shoulder emphasis (OH press) | push |
| `horizontal_pull`    | Row, face pull | pull |
| `vertical_pull`      | Pull-up, lat pulldown | pull |
| `carry`              | Loaded carry | carry |
| `rotation`           | Trunk rotation | rotate |
| `anti_rotation`      | Resisting rotation (Pallof) | rotate |
| `locomotion`         | Gait, cyclical | locomotion |
| `shoulder_stability` | Band work, CARs | pull |
| `thoracic_mobility`  | Cat cow, T-spine | rotate |

---

## 3. Research basis

| Source | Use |
|--------|-----|
| **NSCA** — movement patterns (squat, hinge, push, pull, carry, locomotion) | Alignment of legacy and fine patterns. |
| **Project** — EXERCISE_ONTOLOGY_DESIGN.md, lib/ontology/legacyMapping.ts | Fine ↔ legacy mapping; storage rules. |

---

## 4. Implementation

### 4.1 Backfill `movement_patterns` where missing

- **From `movement_pattern` + slug:**
  - push + (bench | press | push_up | fly | floor_press | pec_deck | chest_press | dip) → `horizontal_push`
  - push + (ohp | overhead | shoulder_press | raise | pike_push | z_press | push_press | landmine_press | cuban) → `vertical_push`
  - push + (tricep | skull | extension | kickback) → `horizontal_push` or `vertical_push` by context (tricep pushdown = vertical_push; close-grip bench = horizontal_push)
  - pull + (row | face_pull | inverted_row | renegade | seal_row) → `horizontal_pull`
  - pull + (pullup | chinup | pulldown | pull_up | toes_to_bar) → `vertical_pull`
  - pull + (curl | shrug | reverse_fly | ytw) → horizontal_pull (or vertical for curl — bicep curl is horizontal pull in plane)
  - squat + (lunge | split | stepup | step_up) → `lunge`
  - squat + (squat | leg_press | hack | goblet | front_squat | back_squat) → `squat`
  - rotate → `rotation` or `thoracic_mobility` or `anti_rotation` by slug (cat_camel, t_spine → thoracic_mobility; pallof → anti_rotation; russian_twist → rotation)
  - carry → `carry`
  - locomotion → `locomotion`
  - hinge → `hinge`

### 4.2 Sync `movement_pattern` from `movement_patterns`

When `movement_patterns` is set, set `movement_pattern` = legacy mapping of first element so both columns stay in sync and generator/balance logic use correct legacy value.

### 4.3 Normalize invalid legacy values

Ensure `movement_pattern` is exactly one of: squat, hinge, push, pull, carry, rotate, locomotion (lowercase). Fix any typo or wrong value.

---

## 5. Validation

- Every active exercise has at least one of: valid legacy `movement_pattern` or non-empty `movement_patterns`.
- When `movement_patterns` is non-empty, `movement_pattern` equals the legacy equivalent of `movement_patterns[0]`.
- Balance and redundancy logic in dailyGenerator see correct pattern counts.

---

## 6. References

- NSCA: The 8 Main Movement Patterns; Programming Essential Movement Patterns.
- Project: docs/EXERCISE_ONTOLOGY_DESIGN.md § C.3, lib/ontology/vocabularies.ts, lib/ontology/legacyMapping.ts, lib/workoutRules.ts.
