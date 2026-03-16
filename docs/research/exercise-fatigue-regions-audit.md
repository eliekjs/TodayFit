# Exercise fatigue_regions audit — ontology alignment

**Date:** 2025-03-25  
**Scope:** Ensure every active exercise has correct `fatigue_regions` (regions that get fatigued) per ontology; backfill where null/empty, normalize invalid values to canonical slugs only.  
**Run type:** Exercise DB enrichment (one category: fatigue_regions).

---

## 1. Purpose

- **fatigue_regions** = array of canonical slugs for body regions that are meaningfully fatigued by the exercise. Used for superset pairing (overlap penalty: avoid stacking same region) and future fatigue-aware programming (e.g. back-to-back day awareness).
- Drives: `getCanonicalFatigueRegions()` in ontology normalization, superset overlap penalty in `getSupersetPairingScore()`, and grip handling (forearms/grip when pairing_category = grip or grip_demand high).
- When set, generator uses it; when null/empty, code derives from pairing_category, then muscle_groups, then movement_pattern (see `logic/workoutGeneration/ontologyNormalization.ts`).

---

## 2. Canonical values (ontology § C.12 + lib/ontology/vocabularies.ts)

| Slug | Definition | When to use |
|------|------------|-------------|
| `quads` | Quadriceps | Squat, lunge, leg ext |
| `glutes` | Glutes | Hinge, hip thrust, bridge |
| `hamstrings` | Hamstrings | RDL, leg curl |
| `pecs` | Pectorals | Bench, push-up, dip |
| `triceps` | Triceps | Push, dip, ext |
| `shoulders` | Delts | OH press, raise, upright row |
| `lats` | Lats | Pull-up, row, pulldown |
| `biceps` | Biceps | Curl, row (arm) |
| `forearms` | Forearms / grip | Deadlift, hang, farmer (often paired with `grip`) |
| `grip` | Grip limited | Pull-up, hang, farmer, heavy pulls |
| `core` | Trunk / abs | Plank, carry, anti-rotation |
| `calves` | Calves | Calf raise, jump |

**Cardinality:** Multi (array). **Storage:** DB `fatigue_regions` (text[]). Optional on Exercise. Only these 12 slugs are canonical; any other value (e.g. `legs`, `chest`, `back`) must be normalized or removed.

**Generator:** `getCanonicalFatigueRegions()` prefers ontology array; normalizes `forearms` → `grip` in output when present; adds `grip` when `hasGripFatigueDemand()`. Superset scoring applies overlap penalty when two exercises share ≥1 fatigue region.

---

## 3. Derivation rules

- **From pairing_category (primary):** chest→pecs+triceps; shoulders→shoulders+triceps; triceps→triceps+pecs; back→lats+biceps; biceps→biceps+lats; quads→quads+core (or glutes+hamstrings+core if hinge); posterior_chain→hamstrings+glutes+core; core→core; grip→forearms+grip+core; mobility→[].
- **From primary_movement_family (when pairing_category null):** upper_push→pecs+triceps+shoulders; upper_pull→lats+biceps; lower_body→by movement_pattern (hinge→hamstrings+glutes+core, else quads+glutes+core); core→core; mobility→[]; conditioning→quads+core.
- **From primary_muscles (when both null):** Map via MUSCLE_TO_FATIGUE (chest/pecs→pecs, back→lats, push→pecs, pull→lats, quads/glutes/hamstrings/core/calves/triceps/shoulders/biceps→same; forearms→grip). Deduplicate and use only canonical slugs.
- **Normalize existing:** legs→quads+glutes (or glutes+hamstrings if movement_pattern=hinge); chest→pecs; back→lats. Remove any slug not in the 12.
- **Grip-heavy:** When pairing_category = grip (or grip_demand high), ensure `forearms` and `grip` are in the array (append if missing).

---

## 4. Implementation

- Normalize every active exercise’s fatigue_regions: replace non-canonical members (legs, chest, back) with canonical equivalents; drop any other invalid slug.
- Backfill NULL or empty in order: (1) from pairing_category, (2) from primary_movement_family, (3) from primary_muscles + movement_pattern (push→pecs, pull→lats).
- For exercises with pairing_category = grip, append forearms and grip if not already present.
- Mobility exercises may have empty array [].

---

## 5. Validation

- Every non-empty fatigue_regions array contains only slugs from: quads, glutes, hamstrings, pecs, triceps, shoulders, lats, biceps, forearms, grip, core, calves.
- Superset and scoring logic use getCanonicalFatigueRegions(); overlap penalty applies when regions overlap.

---

## 6. References

- **Evidence-based audit (same sources):** docs/research/fatigue-regions-audit-2025.md (NSCA, ACSM, ExRx, NCSF; hybrid compounds, calves, generator use).
- Project: docs/EXERCISE_ONTOLOGY_DESIGN.md § C.12, lib/ontology/vocabularies.ts (FATIGUE_REGIONS), logic/workoutGeneration/ontologyNormalization.ts (getCanonicalFatigueRegions, hasGripFatigueDemand), logic/workoutIntelligence/supersetPairing.ts (getSupersetPairingScore), supabase/migrations/20250325000006_exercise_fatigue_regions_audit.sql, 20250331000001_fatigue_regions_evidence_enrichment.sql.
