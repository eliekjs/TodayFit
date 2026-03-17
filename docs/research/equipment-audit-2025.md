# Exercise equipment audit: canonical slugs and verbiage alignment

**Date:** 2025-03-17  
**Category:** Exercise DB enrichment — equipment (required equipment per exercise; alignment with app options and external sources)  
**Scope:** Audit equipment required for every exercise; ensure verbiage matches or has multiple options that match our equipment options; each exercise mapped to at least one piece of equipment (or bodyweight) from our database.

---

## 1. Research question

What equipment do reputable sources assign to common exercises, and how should we name equipment so that (1) every exercise has at least one required equipment (or bodyweight) from our canonical list, and (2) our slugs/labels align with ExRx, NSCA, ACE, and user-facing gym profile options?

---

## 2. Sources

| Source | Type (Tier) | Key claim(s) |
|--------|-------------|--------------|
| **ExRx.net** | Tier 2 | Equipment categories: Dumbbells, Exercise Benches, Barbells and Racks, Power Racks, Accessories (suspension trainers, resistance bands). Cardio: Climbers, Cycling, Ellipticals, Rowing, Ski machines, Steppers, Treadmills. Standard names: barbell, dumbbell, kettlebell, cable, machine, bodyweight, band. |
| **NSCA** | Tier 1 | Resistance equipment: free weights (barbells, dumbbells, kettlebells), machines (selectorized, plate-loaded), alternative (bands, TRX, etc.). Essentials of Personal Training — Types of Resistance Training Equipment. |
| **ACE** | Tier 2 | Exercise library filters by equipment: weight machines, dumbbells, TRX, BOSU, agility ladder, etc. Reinforces machine vs free-weight vs alternative-equipment distinction. |
| **Project** | Internal | docs/EXERCISE_ONTOLOGY_DESIGN.md § C.6 (equipment slugs); lib/types.ts EquipmentKey; data/gymProfiles.ts EQUIPMENT_BY_CATEGORY; logic/workoutIntelligence/constraints/eligibilityHelpers.ts (matchesEquipmentConstraints). |

---

## 3. Canonical equipment list (app: EquipmentKey)

These are the slugs stored in the DB and used for **filtering** (user’s gym profile). Every exercise’s `equipment` array must contain only slugs from this list (or the adapter normalizes to these). Each slug has one or more **display/verbiage** options for UI and matching.

| Slug | Display / verbiage options | Notes |
|------|----------------------------|--------|
| `bodyweight` | Bodyweight, Body weight, No equipment, Calisthenics | Default when no external equipment required. |
| `barbell` | Barbell, Bar, Olympic bar | ExRx/NSCA standard. |
| `ez_bar` | EZ Bar, EZ bar, Curl bar | Common for curls, skull crushers; added to app options. |
| `dumbbells` | Dumbbells, Dumbbell, DB | Singular/plural both map to same slug. |
| `kettlebells` | Kettlebells, Kettlebell, KB | Same as above. |
| `bands` | Bands, Resistance band, Resistance bands, Loop band, Miniband (when used for band work) | Normalized: we use `bands` only; `resistance_band` → `bands` in DB. |
| `cable_machine` | Cable machine, Cable, Cable station | ExRx: cable. |
| `bench` | Bench, Exercise bench, Flat bench, Adjustable bench (when not separate) | Often paired with barbell/dumbbells. |
| `adjustable_bench` | Adjustable bench, Incline bench | Separate option in gym profile for home setups. |
| `squat_rack` | Squat rack, Power rack, Rack, Cage | ExRx/NSCA: racks. |
| `trap_bar` | Trap bar, Hex bar, Deadlift bar | Common name: trap bar. |
| `pullup_bar` | Pull-up bar, Pullup bar, Bar (for pull-ups) | |
| `leg_press` | Leg press, Leg press machine | Machine type. |
| `leg_extension` | Leg extension, Leg extension machine | Machine type. |
| `machine` | Machine, Other machine, Hack squat machine, Pec deck, GHD, etc. | Generic when exercise needs “any” dedicated machine (hack squat, pec deck, leg curl, reverse hyper). |
| `lat_pulldown` | Lat pulldown, Lat pull-down, Pulldown | Specific machine. |
| `chest_press` | Chest press machine, Chest press | Specific machine. |
| `hamstring_curl` | Hamstring curl, Leg curl machine | Specific machine. |
| `treadmill` | Treadmill | Cardio. |
| `rower` | Rower, Rowing machine, Erg, Concept2 | Cardio. |
| `assault_bike` | Assault bike, Air bike, Bike (assault) | Cardio. |
| `ski_erg` | Ski erg, Ski Erg | Cardio. |
| `stair_climber` | Stair climber, Stepper, Stairs | Cardio; ExRx: steppers. |
| `elliptical` | Elliptical, Elliptical trainer | Cardio; added to app options. |
| `trx` | TRX, Suspension trainer, Rings (when used like TRX) | ACE/ExRx: suspension. |
| `plyo_box` | Plyo box, Box, Jump box | |
| `sled` | Sled, Prowler, Sled push/pull | |
| `plates` | Plates, Weight plates, Olympic plates | For loading barbell/trap bar; often implied with barbell. |

**Not in EquipmentKey (no exercise should require only these for filtering):**  
`resistance_band` (normalized to `bands`), `foam_roller`, `miniband` — used in warmup/cooldown rules (lib/workoutRules) but not as user-selectable gym equipment; exercises use `bands` for band work. Medicine ball, stability ball, sandbag: not in app options; exercises that could use them are mapped to `bodyweight` or the closest option (e.g. wall ball / medball slam → bodyweight for filtering) so they still show when user has minimal equipment.

---

## 4. Classification of findings

### High-confidence rules (implemented)

- **One slug per “concept” in the app:** User selects from EquipmentKey; exercise `equipment` must be a subset of that list so that `matchesEquipmentConstraints` works. So: `resistance_band` → `bands`; add `machine`, `elliptical`, `ez_bar` to EquipmentKey and gym profile.
- **Every exercise has at least one equipment:** If an exercise has no equipment (null or empty array), set to `ARRAY['bodyweight']`. Implemented in migration 20250317100000.
- **Verbiage:** Labels in UI (EQUIPMENT_BY_CATEGORY) and any search/display should accept the “Display / verbiage options” above; our slugs are canonical and not shown raw to users in filters.

### Context-dependent heuristics

- **Medicine ball / stability ball / sandbag:** We do not add these to EquipmentKey in this audit. Exercises that traditionally use them (e.g. wall ball, medball slam, sandbag carry) currently have `bodyweight` or a single option so they remain selectable with “bodyweight only”; we can add equipment types later if we add them to gym profile.
- **Rings:** Ring rows / ring pull-ups mapped to `bodyweight` (or user can have TRX for similar); no separate “rings” slug.

### Speculative / deferred

- Equipment “alternatives” (e.g. “can use dumbbells OR kettlebells”) already modeled by multiple slugs in the exercise’s `equipment` array; no change.
- Localization of equipment labels.

---

## 5. Comparison to implementation

- **Before:** Some exercises used `resistance_band` (not in EquipmentKey); some exercises used `machine`, `elliptical`, `ez_bar` (not in EquipmentKey), so users with “Other Machine” or “Elliptical” or “EZ Bar” could not select them and filtering would exclude those exercises incorrectly. Schema allows empty equipment.
- **After:**  
  - **lib/types.ts:** EquipmentKey extended with `machine`, `elliptical`, `ez_bar`.  
  - **data/gymProfiles.ts:** EQUIPMENT_BY_CATEGORY adds EZ Bar (Barbell & Strength), Other Machine (Machines), Elliptical (Conditioning).  
  - **Migration 20250317100000:** (1) Normalize `resistance_band` → `bands` in all exercises. (2) Set `equipment = ARRAY['bodyweight']` where equipment is null or empty.  
  - **docs/research/equipment-audit-2025.md:** This note; verbiage table for future search/display and validation.

---

## 6. Generator / app use

- **Constraint resolution:** `allowed_equipment` comes from gym profile (EquipmentKey). `matchesEquipmentConstraints` requires every element of `exercise.equipment_required` to be in `available_equipment` (and not in excluded). So exercise equipment slugs must be in EquipmentKey.
- **Warmup/cooldown:** lib/workoutRules WARMUP_ALLOWED_EQUIPMENT and COOLDOWN_ALLOWED_EQUIPMENT include `bands`, `resistance_band`, `foam_roller`, `miniband` for block eligibility; equipment filter still uses EquipmentKey for user selection.
- **Adapter:** normalizeEquipmentSlug (lib/ontology/legacyMapping) only lowercases and snake_cases; it does not map resistance_band→bands. Migration handles that in DB so adapter sees `bands` from DB.

---

## 7. Validation

- No exercise has `equipment` null or empty (migration backfill).
- No exercise uses `resistance_band` after migration (all normalized to `bands`).
- Every slug in any exercise’s `equipment` array is in EquipmentKey (lib/types.ts).
- Gym profile UI (EQUIPMENT_BY_CATEGORY) includes all EquipmentKey values used by at least one exercise (machine, elliptical, ez_bar added).

---

## 8. References

- ExRx.net: Home Exercise Equipment, Exercise Directory, Cardio & Conditioning (equipment categories).
- NSCA: Types of Resistance Training Equipment (free weights, machines, alternative).
- ACE: Exercise library equipment filters (weight machines, dumbbells, TRX, etc.).
- Project: EXERCISE_ONTOLOGY_DESIGN.md § C.6, lib/types.ts, data/gymProfiles.ts, eligibilityHelpers.ts, 20250317100000_exercise_equipment_audit.sql.
