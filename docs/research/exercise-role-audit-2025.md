# Exercise role audit: NSCA/ACSM-style session structure and priority

**Date:** 2025-03-16  
**Category:** Exercise DB enrichment — exercise_role  
**Scope:** Audit and enrich exercise_role using same sources (NSCA, ACSM, ACE, ExRx); ensure block placement (warmup, main, accessory, cooldown) reflects exercise science; document role priority in workout generation.

---

## 1. Research question

Which session role (warmup, prep, main compound, accessory, cooldown, etc.) is each exercise best suited for? How does the generator use role for block placement and scoring?

---

## 2. Sources

| Source | Type (Tier) | Link / key claim(s) |
|--------|-------------|----------------------|
| **NSCA** — Program Design Essentials, Sequencing and Integrating Training | Tier 1 | [NSCA](https://www.nsca.com/education/articles/kinetic-select/sequencing-and-integrating-training/): Session structure; sequencing and integrating training factors; manage accumulated fatigue. |
| **NSCA** — Foundations of Fitness Programming | Tier 1 | Warm-up (mobility, movement prep, flexibility); main component; cool-down. Periodized phases (endurance → strength → power). |
| **ACSM** — Resistance training guidelines | Tier 1 | Multi-joint before single-joint; exercise order for safety and effectiveness. |
| **ACE** — Right Kind of Exercise at the Right Time | Tier 2 | [ACE](https://www.acefitness.org/certifiednewsarticle/1183/are-your-clients-performing-the-right-kind-of-exercise-at-the-right-time/): Exercise order; warm-up, main, cool-down; sequencing. |
| **ExRx.net** — Exercise Directory, session structure | Tier 2 | Exercise by type and body region; compound vs isolation. |
| **Project** — docs/EXERCISE_ONTOLOGY_DESIGN.md § C.5, lib/ontology/vocabularies.ts (EXERCISE_ROLES), scoreRoleFit, MAIN_WORK_EXCLUDED_ROLES | Internal | warmup, prep, main_compound, accessory, isolation, finisher, cooldown, stretch, mobility, breathing, conditioning. |

---

## 3. Classification of findings

### High-confidence rules (implemented)

- **Session structure:** Warm-up (prep/mobility/warmup) → main work (main_compound, accessory, isolation) → cool-down (cooldown/stretch/breathing/mobility). NSCA/ACSM/ACE.
- **Main compound:** Multi-joint, primary lifts (squat, deadlift, bench, OH press, pull-up, row, hip thrust, goblet squat, etc.). Used as anchors in main_strength/main_hypertrophy blocks.
- **Accessory:** Secondary compounds and supporting work (rows, RDL, split squat, step-up, raises, curls). Acceptable in main blocks; preferred in accessory slot when block type is accessory.
- **Isolation:** Single-joint (leg curl, leg ext, fly, curl, lateral raise, tricep pushdown). Preferred for hypertrophy blocks; lower priority as main anchor.
- **Prep/warmup:** Activation and movement prep (hip circles, glute bridge, band pull-apart, shoulder CARs, wall slide). Preferred in warmup block.
- **Cooldown/stretch/mobility/breathing:** Excluded from main work pool (MAIN_WORK_EXCLUDED_ROLES); preferred in cooldown block.
- **Conditioning:** Run, row, bike, circuit → role conditioning for conditioning block.
- **Role priority in generator:** scoreRoleFit gives +2 for main_compound in main blocks, +0.5 for accessory/isolation/finisher, -3 for cooldown/stretch/mobility/breathing/warmup; warmup block prefers prep/warmup/mobility; cooldown block prefers cooldown/stretch/breathing/mobility.

### Context-dependent heuristics (implemented)

- **Power/Olympic derivatives:** Thruster, clean, jerk, snatch can be main_compound when used as primary strength/power work; or conditioning when in circuit. Assign main_compound for standalone use.
- **Finisher:** Core finishers (plank, hollow hold) and burnout-style → finisher role.
- **Single role per exercise:** Cardinality is single; use the **most common** placement (e.g. glute bridge → prep).

### Speculative / deferred

- "Secondary compound" as a distinct role (e.g. incline bench) — currently folded into main_compound or accessory; no schema change.

---

## 4. Comparison to previous implementation

- **Before:** exercise_role backfilled in 20250325000004; scoreRoleFit and MAIN_WORK_EXCLUDED_ROLES already implement role-based block placement and scoring.
- **After:** (1) Enrich exercise_role for power/Olympic derivatives (thruster, clean, jerk, snatch → main_compound), conditioning (ergs, intervals), and any stragglers. (2) Normalize invalid roles to allowed slug. (3) Document in ontology C.5 that generator uses role for block-type fit and role priority (scoreRoleFit).

---

## 5. Metadata / ontology impact

- **DB:** exercise_role (text). Single value per exercise. Allowed: warmup, prep, main_compound, accessory, isolation, finisher, cooldown, stretch, mobility, breathing, conditioning.
- **Ontology:** C.5 updated to state generator use (block-type fit, role priority in scoreRoleFit).
- **Generation:** MAIN_WORK_EXCLUDED_ROLES excludes cooldown, stretch, mobility, breathing from main-strength/hypertrophy pools; scoreRoleFit prefers main_compound in main blocks, prep/warmup in warmup, cooldown/stretch in cooldown.

---

## 6. Validation

- Every active exercise has exercise_role in EXERCISE_ROLES.
- Main work pool excludes cooldown, stretch, mobility, breathing.
- Warmup and cooldown block selection prefer roles that match block type.
