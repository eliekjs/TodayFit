# Superset pairing: does the exercise data match the rules?

## What the rules need

Superset pairing uses two layers:

### 1. Eligibility (hard restrictions) — `canPairInSuperset`

- **`forbidden_same_pattern`** (when body focus is upper push/pull): pair is **disallowed** if `a.movement_pattern === b.movement_pattern` (e.g. both `"push"`).
- **`forbid_double_grip`**: pair is **disallowed** if both exercises have high grip demand.
- **`forbidden_pairs`**: pair is disallowed if their effective movement families match a forbidden pair.

So for restrictions we need:

- **`movement_pattern`** (single) — for same-pattern check. **Required.**
- **Grip signal** — for double-grip check. Can come from:
  - `grip_demand` (none | low | medium | high), or
  - fallbacks: `pairing_category === "grip"`, `tags.stimulus` (e.g. `"grip"`), `training_quality_weights`, or `fatigue_regions` containing `"forearms"` / `"grip"`.
- **Movement families** — for forbidden_pairs; from `primary_movement_family` (+ fallback from pattern + muscles).

### 2. Scoring (good vs bad pairs) — `getSupersetPairingScore`

- **Pairing category** (chest, shoulders, triceps, back, biceps, quads, posterior_chain, core, grip, mobility): from `pairing_category` or derived from `movement_pattern` + `muscle_groups`.
- **Movement families** (upper_push, upper_pull, lower_body, core): from `primary_movement_family` or derived.
- **Fatigue regions**: from `fatigue_regions` or derived (overlap → penalty).
- **Grip**: same as above (double grip → big penalty).
- **Same pattern**: when **not** complementary by category, same `movement_pattern` gets a penalty.

So for scoring we need:

- **`pairing_category`** — best for “chest + triceps OK”, “chest + chest avoid”.
- **`fatigue_regions`** — overlap penalty.
- **`grip_demand`** (or fallbacks) — double-grip penalty.
- **`movement_pattern`** and **`muscle_groups`** — fallbacks for category/family and same-pattern penalty.
- **`primary_movement_family`** — best for family; otherwise derived.

---

## What the data has

### Generator type (`logic/workoutGeneration/types.ts`)

- **Required / common:** `id`, `name`, `movement_pattern`, `muscle_groups`, `equipment_required`, `modality`, `tags`.
- **Ontology (optional):** `primary_movement_family`, `secondary_movement_families`, `movement_patterns`, `pairing_category`, `fatigue_regions`, `grip_demand`, `joint_stress_tags`, `contraindication_tags`, etc.

So the **type** supports everything the rules and scoring need.

### DB (Supabase)

- **Columns:** `primary_movement_family`, `pairing_category`, `fatigue_regions`, `grip_demand`, `movement_patterns`, etc. (see migrations `20250312000000_exercise_structured_columns.sql`, `20250320000000_exercise_ontology_enrichment_columns.sql`).
- **Backfills:** pairing_category and fatigue_regions backfilled for many exercises; grip_demand for grip-heavy ones.
- **Adapter** (`lib/db/generatorExerciseAdapter.ts`): maps these columns into the generator `Exercise` when present.

So the **DB and adapter** provide the fields needed for restrictions and scoring when rows are filled.

### Stub (`logic/workoutGeneration/exerciseStub.ts`)

- **Has:** `movement_pattern`, `muscle_groups`, `primary_movement_family` on many; `pairing_category` and `fatigue_regions` on some (e.g. bench = chest, OHP = shoulders, deadlift = posterior_chain + grip_demand).
- **Missing on some:** `pairing_category` or `fatigue_regions` on a number of exercises (e.g. Standing Overhead Press has `pairing_category: "shoulders"` but no `fatigue_regions` in stub). Fallbacks (pattern + muscles, canonical fatigue regions) still allow scoring and basic restrictions.

So for **tests that use the stub**, behavior is correct in principle; a few stub entries are less precise (e.g. no fatigue_regions) and rely on derivation.

---

## Do the data and rules align?

- **For the restrictions:** Yes. Eligibility only needs `movement_pattern` (always present), grip (present or derived), and movement family (present or derived). The data supports that.
- **For the scoring:** Yes, with fallbacks. When `pairing_category` / `fatigue_regions` / `grip_demand` are set (DB or stub), scoring uses them. When missing, it falls back to `movement_pattern` + `muscle_groups` and canonical fatigue/grip logic.

So **the exercise data does match what we need for the restrictions and for the scoring**, as long as we accept derivation where ontology fields are missing.

---

## Why “Bench Press + Overhead Press” still fails validation

The validator can report a **superset_pairing** violation for pairs like Barbell Bench Press and Standing Overhead Press even though:

- Both have **pairing_category** (chest vs shoulders) and the **scoring** treats them as complementary (good pair).
- The **eligibility** rule does **not** use pairing_category for the same-pattern check. When body focus is upper push (or upper pull), the constraint sets **`forbidden_same_pattern: true`**, and `canPairInSuperset` does:

  - if `forbidden_same_pattern && a.movement_pattern === b.movement_pattern` → **false** (disallow).

So both are `movement_pattern: "push"` → the pair is **disallowed by rule** even though the **data** (pairing_category) says they are a good pair. The rule is stricter than the score: it forbids any same movement_pattern under that focus, and does not yet allow “same pattern but complementary category.”

So:

- The **exercise data is sufficient** for the current rules and for scoring.
- The **design choice** is whether to keep “forbid all same pattern” or to relax it to “forbid same pattern only when not complementary by pairing_category (or movement_patterns).” That would be a **rule/logic change**, not a data fix.

---

## Gaps to fix if you want stricter data–rule alignment

1. **Stub:** Add `pairing_category` and `fatigue_regions` (and `grip_demand` where relevant) to any stub exercise used in superset tests, so tests don’t rely only on fallbacks.
2. **Rule vs score:** If you want “chest + shoulders” to be **allowed** in supersets when body focus is upper push, the constraint has to be updated to use pairing (e.g. allow same `movement_pattern` when pairing categories are complementary), or to use `movement_patterns` (e.g. allow horizontal_push + vertical_push) instead of a single `movement_pattern`.
3. **DB coverage:** Ensure all exercises that can appear in supersets have at least `pairing_category` (and preferably `fatigue_regions`, `grip_demand`) populated so behavior is consistent with the ontology design.
