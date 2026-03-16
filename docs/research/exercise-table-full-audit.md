# Exercise table full audit — methodology and research

**Date:** 2025-03-25  
**Scope:** Full audit of `public.exercises` (and related `exercise_contraindications`, `exercise_tag_map`) — confirm, add, or edit data per column using high-quality research.  
**Run type:** Exercise DB enrichment (audit + research-backed corrections).

---

## 1. Purpose

Audit every column of the exercise table and related tables; align data with evidence-based exercise science (NSCA movement patterns, ExRx-style muscle roles, injury/contraindication guidelines) and with the project’s ontology (`docs/EXERCISE_ONTOLOGY_DESIGN.md`, `lib/workoutRules.ts`).

---

## 2. Schema and columns audited

### 2.1 Core columns (exercises table)

| Column | Purpose | Canonical / research basis |
|--------|---------|----------------------------|
| **slug** | Unique id | snake_case, stable. |
| **name** | Display name | Human-readable; no change unless typo. |
| **description** | Optional text | Can be added from reputable sources (ExRx, NSCA). |
| **movement_pattern** | Coarse pattern (legacy) | One of: squat, hinge, push, pull, carry, rotate, locomotion. NSCA: squat, hinge, push (horizontal/vertical), pull (horizontal/vertical), carry, locomotion. |
| **primary_muscles** | Main muscles | Canonical slugs: legs, quads, glutes, hamstrings, calves, core, chest, back, lats, upper_back, shoulders, triceps, biceps, forearms. ExRx: primary movers. |
| **secondary_muscles** | Assisting muscles | Same canonical slugs. ExRx: secondary/assistive. |
| **equipment** | Required equipment | Canonical: bodyweight, barbell, dumbbells, kettlebells, bands, cable_machine, bench, squat_rack, pullup_bar, leg_press, leg_extension, machine, trap_bar, plyo_box, treadmill, rower, assault_bike, trx, foam_roller, miniband, etc. |
| **modalities** | Training type | strength, hypertrophy, conditioning, mobility, power, recovery, endurance. |
| **level** | Difficulty | beginner, intermediate, advanced. |
| **is_active** | In use | boolean. |

### 2.2 Ontology columns (exercises table)

| Column | Purpose | Canonical / research basis |
|--------|---------|----------------------------|
| **primary_movement_family** | Body-part / filter | upper_push, upper_pull, lower_body, core, mobility, conditioning. From NSCA + ontology. |
| **secondary_movement_families** | Hybrid exercises | Array of same slugs. |
| **movement_patterns** | Finer patterns | squat, hinge, lunge, horizontal_push, vertical_push, horizontal_pull, vertical_pull, carry, rotation, anti_rotation, locomotion, shoulder_stability, thoracic_mobility. |
| **joint_stress_tags** | Biomechanical load (injury exclusion) | Must match `INJURY_AVOID_TAGS` in `lib/workoutRules.ts`: shoulder_overhead, shoulder_extension, grip_hanging, knee_flexion, deep_knee_flexion, lumbar_shear, spinal_axial_load, elbow_stress, wrist_stress, hip_stress, ankle_stress. |
| **contraindication_tags** | “Avoid when injured” (body region) | shoulder, knee, lower_back, elbow, wrist, hip, ankle. User-facing; maps from joint_stress. |
| **exercise_role** | Session placement | warmup, prep, main_compound, accessory, isolation, finisher, cooldown, mobility, conditioning. |
| **pairing_category** | Superset logic | quads, posterior_chain, chest, shoulders, triceps, back, biceps, core, mobility. |
| **fatigue_regions** | Regions fatigued | quads, glutes, hamstrings, pecs, triceps, lats, biceps, forearms, core. |
| **unilateral** | Single-limb | boolean. |
| **mobility_targets** | Areas addressed (mobility) | thoracic_spine, hip_flexors, hamstrings, shoulders, calves, etc. |
| **stretch_targets** | Areas stretched | hamstrings, hip_flexors, quadriceps, calves, glutes, thoracic_spine, shoulders, lats, low_back. |
| **rep_range_min / rep_range_max** | Suggested rep range | Optional; goal-dependent. |

### 2.3 Enrichment columns (exercises table)

| Column | Purpose | Values |
|--------|---------|--------|
| **aliases** | Search / display | Array of alternate names. |
| **swap_candidates** | Substitute exercises | Array of exercise slugs. |
| **warmup_relevance** | Suitability as warm-up | none, low, medium, high. |
| **cooldown_relevance** | Suitability as cooldown | none, low, medium, high. |
| **stability_demand** | Balance / stability | none, low, medium, high. |
| **grip_demand** | Grip / forearm | none, low, medium, high. |
| **impact_level** | Joint impact | none, low, medium, high. |

### 2.4 Related tables

- **exercise_contraindications** (exercise_id, contraindication, joint): source of truth for “avoid when injured”; app merges this with `exercises.contraindication_tags` for filtering.
- **exercise_tag_map** (exercise_id, tag_id, relevance_weight): many-to-many to `exercise_tags` for goal/sport/modality/equipment tagging.

---

## 3. Research sources

| Source | Type | Use |
|--------|------|-----|
| NSCA — movement patterns | Tier 1 (professional body) | Squat, hinge, push (horizontal/vertical), pull (horizontal/vertical), carry, locomotion. |
| NSCA — knee movement and exercise guidelines | Tier 1 | Knee stress, leg extension/curl considerations. |
| ExRx.net — muscle directory / exercise directory | Tier 2 (reference) | Primary vs secondary muscles per exercise. |
| NCSF — contraindicated exercises | Tier 2 | General contraindication patterns. |
| Project docs: EXERCISE_ONTOLOGY_DESIGN.md, CONTRAINDICATIONS_AUDIT.md, lib/workoutRules.ts | Internal | Canonical slugs, INJURY_AVOID_TAGS, checklist. |

---

## 4. Findings and actions (this run)

### 4.1 Contraindications (research-backed)

- **Knee:** Leg extension and leg curl place significant stress on the knee (patellofemoral compression, shear); contraindicated for knee pain / ACL/patella issues (NSCA, NCSF, tibialist/cristchiropractic). **Action:** Ensure `leg_extension`, `leg_curl` (and similar) have `knee` in contraindications.
- **Shoulder:** Overhead pressing, dips, lateral raises, and repetitive arm work (e.g. battle ropes) stress the shoulder; pull-ups and dips also stress elbow/wrist. **Action:** Add missing `exercise_contraindications` for dips, tricep_dip_bench, lateral_raise, front_raise, leg_extension, leg_curl, good_morning, back_extension, and other high-confidence gaps; then sync `contraindication_tags` from `exercise_contraindications`.
- **Lower back:** Deadlift variants, RDLs, good mornings, back extensions, rower, prone extension. Many already present; add where missing.
- **Wrist/elbow:** Push-ups, planks, bench, dips, pull-ups, heavy pulling. Add where missing.

### 4.2 Implemented in migration

- **Migration `20250325000000_exercise_audit_contraindications_and_sync.sql`:**
  - Inserts missing rows into `exercise_contraindications` for exercises that clearly load shoulder, knee, lower_back, elbow, or wrist (research + CONTRAINDICATIONS_AUDIT checklist).
  - Rebuilds `exercises.contraindication_tags` from `exercise_contraindications` so the denormalized column stays in sync for all exercises.

### 4.3 Deferred (future runs)

- **Primary/secondary muscles:** Systematic pass using ExRx-style primary vs secondary; normalize to canonical muscle slugs (e.g. avoid "push"/"pull" as muscle, use chest, shoulders, triceps, etc.).
- **Movement pattern(s):** Ensure every exercise has correct `movement_pattern` and, where used, `movement_patterns[]` per NSCA and ontology.
- **primary_movement_family:** Derive or set for any exercise still null; keep consistent with movement_pattern and muscles.
- **exercise_role, pairing_category, fatigue_regions:** Extend to full library (phase4 only annotated a subset).
- **Descriptions, rep ranges, aliases, swap_candidates, warmup/cooldown/stability/grip/impact:** Enrich in later, category-focused runs.

---

## 5. Validation

- Injury filter: With “Shoulder” or “Knee” or “Lower back” etc. selected, exercises with those contraindications must be excluded (listExercisesForGenerator uses both exercise_contraindications and contraindication_tags).
- No schema drift: Only existing columns and tables used; no new columns added in this audit.
- Ontology alignment: joint_stress and contraindication slugs match `lib/workoutRules.ts` and `docs/EXERCISE_ONTOLOGY_DESIGN.md`.

---

## 6. References

- NSCA: The 8 Main Movement Patterns (TSAC Report); Knee Movement and Exercise Guidelines (Kinetic Select).
- ExRx.net: Muscle Directory, Exercise Directory, Exercise/Muscle/Program Notes.
- NCSF: Contraindicated Exercises (PDF).
- Project: docs/EXERCISE_ONTOLOGY_DESIGN.md, docs/CONTRAINDICATIONS_AUDIT.md, lib/workoutRules.ts (INJURY_AVOID_TAGS).
