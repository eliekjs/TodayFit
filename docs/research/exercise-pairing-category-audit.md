# Exercise pairing_category audit — ontology alignment

**Date:** 2025-03-25  
**Scope:** Ensure every active exercise has correct `pairing_category` (primary fatigue/region for superset logic) per ontology; backfill where null, normalize invalid values.  
**Run type:** Exercise DB enrichment (one category: pairing_category).

---

## 1. Purpose

- **pairing_category** = single slug for the **primary limiting factor** when pairing exercises in supersets (e.g. “no double grip”, “chest + triceps OK”, “avoid same category twice”).
- Drives: `getEffectivePairingCategory()` in superset logic, same-category penalty, complementary pairs (chest+triceps, back+biceps, quads+posterior_chain), and grip-heavy detection (`hasGripDemand` → forbid double grip).
- When set, generator uses it; when null, code derives from movement_pattern + muscle_groups in `logic/workoutIntelligence/supersetPairing.ts` (`getEffectivePairingCategory()`).

---

## 2. Canonical values (ontology § C.13 + lib/ontology/vocabularies.ts)

| Slug | Definition | When to use |
|------|------------|-------------|
| `chest` | Chest dominant | Bench, push-up, dip, fly |
| `shoulders` | Shoulder dominant | OH press, raise, face pull |
| `triceps` | Triceps dominant | Extensions, close-grip, dip |
| `back` | Back (lats/rhomboids) | Row, pulldown |
| `biceps` | Biceps dominant | Curl, chin-up (arm emphasis) |
| `quads` | Quad dominant | Squat, leg press, lunge |
| `posterior_chain` | Glutes/hamstrings | Hinge, RDL, hip thrust |
| `core` | Core dominant | Plank, carry (core focus), rotation |
| `grip` | Grip limited | Deadlift (when grip is limiter), hang, farmer carry, pull-up/chin-up |
| `mobility` | Mobility / prep | Band, CARs, flow |

**Cardinality:** Single. **Rule:** Pick the **primary** limiting factor for pairing (e.g. deadlift → `grip` or `posterior_chain`; bench → `chest`).

**Generator:** `logic/workoutIntelligence/supersetPairing.ts` uses pairing_category for complementary scoring (chest+triceps, back+biceps, quads+posterior_chain), same-category penalty within family, and `hasGripDemand()` (pairing_category === 'grip' → no double grip).

---

## 3. Derivation rules

- **grip:** Exercises where grip is the primary limiter: pull-up, chin-up, hang, farmer carry, suitcase carry, renegade row. Optional: conventional deadlift can be `grip` or `posterior_chain` per ontology; existing phase4 uses posterior_chain for deadlifts and grip for hang/pull-up–style — we set grip for pull_up, chin_up, hang, farmer, suitcase, renegade.
- **mobility:** primary_movement_family = mobility or modalities include mobility/recovery (and not already stretch/cooldown).
- **core:** primary_movement_family = core; or slug in plank, dead_bug, pallof, rotation, carry (core-only).
- **chest / shoulders / triceps:** upper_push by primary_muscles and slug (bench/fly/press → chest; raise/ohp → shoulders; tricep/pushdown/dip → triceps).
- **back / biceps:** upper_pull by primary_muscles and slug (row/pulldown/pull → back; curl → biceps).
- **quads / posterior_chain:** lower_body by slug (squat/lunge/leg extension → quads; deadlift/rdl/hinge/hip thrust/leg curl → posterior_chain).
- **Default:** COALESCE by primary_movement_family (upper_push→chest, upper_pull→back, lower_body→quads, core→core, mobility→mobility; conditioning→leave null).

---

## 4. Implementation

- Backfill `pairing_category` for every active exercise where it is NULL or empty, using primary_movement_family, primary_muscles, slug, and movement_pattern.
- Normalize any value not in the canonical list to an allowed slug (or clear and re-derive).
- Preserve existing phase4 and 20250312000002 assignments where they already match canonical slugs; overwrite only invalid or missing.

---

## 5. Validation

- Every active exercise has pairing_category either NULL (conditioning allowed) or one of: chest, shoulders, triceps, back, biceps, quads, posterior_chain, core, grip, mobility.
- Superset logic: getEffectivePairingCategory() prefers DB value when in PAIRING_CATEGORIES; hasGripDemand() true when pairing_category = grip.

---

## 6. References

- Project: docs/EXERCISE_ONTOLOGY_DESIGN.md § C.13, lib/ontology/vocabularies.ts (PAIRING_CATEGORIES), logic/workoutIntelligence/supersetPairing.ts (getEffectivePairingCategory, hasGripDemand, getSupersetPairingScore), supabase/migrations/20250312000002_exercise_structured_backfill.sql, 20250315100000_phase4_ontology_representative_subset.sql.
