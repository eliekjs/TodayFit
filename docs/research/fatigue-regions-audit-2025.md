# Fatigue regions audit: evidence-based canonical list and enrichment

**Date:** 2025-03-16  
**Category:** Exercise DB enrichment — fatigue_regions  
**Scope:** Audit fatigue_regions using NSCA, ACSM, ExRx, NCSF; confirm canonical list and derivation rules; enrich hybrid/compound and grip-heavy exercises where evidence supports.

---

## 1. Research question

Which body regions are meaningfully fatigued by each exercise, and how should we represent them for superset pairing and fatigue awareness? What is the evidence for grouping (e.g. chest+triceps, lats+biceps, quads+glutes, grip+forearms)?

---

## 2. Sources

| Source | Type (Tier) | Key claim(s) |
|--------|-------------|--------------|
| **NSCA** — Program Design Essentials, Sequencing and Integrating Training | Tier 1 | Avoid sequencing same muscle group back-to-back; alternate push/pull or upper/lower to manage fatigue and allow recovery. Agonist–synergist relationships determine which regions fatigue together. |
| **NSCA** — Foundations of Fitness Programming | Tier 1 | Exercise order: large muscle groups / multi-joint first; fatigue in one region (e.g. grip) can limit performance in compound lifts (deadlift, pull-up). |
| **ACSM** — Resistance training guidelines | Tier 1 | Multi-joint before single-joint; same muscle group not trained consecutively without recovery; muscle groups that act as synergists fatigue together (e.g. triceps in pressing). |
| **ExRx.net** — Exercise directory, muscle involvement | Tier 2 | Primary movers and synergists per exercise (e.g. bench: pectorals primary, triceps/shoulders synergists; squat: quads/glutes; deadlift: posterior chain + grip). Maps directly to “regions that get fatigued”. |
| **ExRx.net** — Grip / forearm involvement | Tier 2 | Deadlift, pull-up, hang, farmer carry, row: grip/forearms often limiting; distinguish “grip” as a fatigue region for superset logic (no double grip). |
| **NCSF** — Program design, exercise selection | Tier 2 | Reinforces agonist/synergist fatigue; superset design should avoid same muscle group consecutively. |
| **Project** | Internal | docs/EXERCISE_ONTOLOGY_DESIGN.md § C.12, lib/ontology/vocabularies.ts (FATIGUE_REGIONS), exercise-fatigue-regions-audit.md, ontologyNormalization.ts (getCanonicalFatigueRegions, hasGripFatigueDemand). |

---

## 3. Classification of findings

### High-confidence rules (implemented)

- **Upper push (bench, push-up, dip, OH press):** Regions fatigued = pecs, triceps, shoulders (ExRx primary + synergists; NSCA/ACSM same-muscle-group sequencing). Order in array is not required for overlap logic; set membership is sufficient. **Implemented:** pairing_category → chest/shoulders/triceps maps to pecs+triceps or shoulders+triceps; upper_push family → pecs, triceps, shoulders.
- **Upper pull (row, pulldown, pull-up):** Regions = lats, biceps (and grip when hanging/barbell). **Implemented:** back → lats+biceps; grip → forearms+grip+core when pairing_category = grip or grip_demand high.
- **Lower body — squat/lunge:** Regions = quads, glutes, core (hamstrings to a lesser extent in squat). **Implemented:** quads pairing → quads+core (squat) or glutes+hamstrings+core (hinge).
- **Lower body — hinge (deadlift, RDL, hip thrust):** Regions = hamstrings, glutes, core; heavy pulls also grip/forearms. **Implemented:** posterior_chain → hamstrings, glutes, core; grip exercises get forearms, grip.
- **Grip as limiter:** Deadlift, pull-up, hang, farmer carry, Olympic pulls (clean, snatch) — grip/forearms fatigue limits performance (NSCA, ExRx). **Implemented:** pairing_category = grip or grip_demand high → fatigue_regions include forearms, grip; hasGripFatigueDemand() adds grip in getCanonicalFatigueRegions when not in ontology.
- **Canonical list only:** quads, glutes, hamstrings, pecs, triceps, shoulders, lats, biceps, forearms, grip, core, calves. No “legs”, “chest”, “back” (normalize to canonical). **Implemented:** 20250325000006 normalizes and backfills; vocabularies.ts FATIGUE_REGIONS.

### Context-dependent heuristics (implemented)

- **Hybrid/compound (thruster, devils press, wall ball):** Lower-body drive (quads/glutes) plus upper push (shoulders/triceps) and core. Evidence: ExRx/NSCA — thruster fatigues quads, shoulders, core. **Implemented:** Enrichment migration sets explicit fatigue_regions for thruster, devils_press, wall_ball: quads, glutes, shoulders, core (so superset logic avoids stacking with another quad- or shoulder-dominant exercise).
- **Calves:** Calf raise, jump rope, running, bounding — calves are a fatigue region. **Implemented:** Backfill from primary_muscles (calves) and slug (calf_raise, jump_*, running); conditioning may have quads+core; add calves where movement is calf-dominant.
- **Mobility:** No meaningful fatigue regions for programming; empty array. **Implemented:** pairing_category = mobility → [].

### Speculative / deferred

- Ordering fatigue regions by “primary vs secondary” fatigue (e.g. quads first, then glutes for squat) — not required for current superset overlap penalty; set membership is sufficient. Defer ordering unless we add “primary fatigue region” scoring.

---

## 4. Comparison to implementation

- **Before:** fatigue_regions backfilled from pairing_category, primary_movement_family, primary_muscles (20250325000006); grip got forearms+grip when pairing_category = grip; 20250331000000 added forearms+grip when grip_demand high.
- **After (this audit):** (1) Research note ties canonical list and derivation to NSCA, ACSM, ExRx, NCSF. (2) Explicit fatigue_regions for hybrid compounds (thruster, devils_press, wall_ball) so overlap penalty reflects both lower and upper fatigue. (3) Calves added for calf-dominant and high-impact conditioning where appropriate. (4) No schema change; no new canonical slugs.

---

## 5. Generator use

- **getCanonicalFatigueRegions(ex):** Uses ontology fatigue_regions first; normalizes forearms → grip in output; adds grip when hasGripFatigueDemand(ex). Used by superset scoring and fatigue tracking.
- **Superset pairing:** Overlap penalty when two exercises share ≥1 fatigue region; “no double grip” when both have grip demand.
- **Validation:** Only canonical slugs; empty array allowed for mobility.

---

## 6. References

- NSCA: Program Design Essentials, Sequencing and Integrating Training, Foundations of Fitness Programming.
- ACSM: Resistance training guidelines (exercise order, same muscle group recovery).
- ExRx.net: Exercise directory, muscle involvement, grip/forearm role in pulls and carries.
- NCSF: Program design, agonist/synergist fatigue.
- Project: EXERCISE_ONTOLOGY_DESIGN.md § C.12, exercise-fatigue-regions-audit.md, exercise-ontology-enrichment-2025.md, 20250325000006_exercise_fatigue_regions_audit.sql, 20250331000000_exercise_ontology_enrichment_consolidated.sql.
