# Exercise ontology enrichment: pairing, fatigue, descriptions, rep ranges, aliases, swap candidates, demand levels

**Date:** 2025-03-16  
**Scope:** Audit and enrich pairing_category, fatigue_regions, descriptions, rep ranges, aliases, swap_candidates, and warmup/cooldown/stability/grip/impact (demand levels) using same evidence sources. Document generator use and priority where applicable.  
**Run type:** Exercise DB enrichment (multi-category run per user request).

---

## 1. Sources (NSCA, ACSM, ExRx, NCSF)

| Source | Use |
|--------|-----|
| **NSCA** — Program Design Essentials, Sequencing and Integrating Training, Foundations of Fitness Programming | Superset pairing (avoid same muscle group back-to-back); exercise order; fatigue management; rep ranges by goal (strength vs hypertrophy). |
| **ACSM** — Resistance training guidelines | Multi-joint before single-joint; sequencing; rep ranges and set recommendations by goal. |
| **ExRx.net** — Exercise directory, muscle involvement, substitutions | Primary muscles and fatigue regions; common exercise names and alternatives (aliases, swap candidates); rep range norms. |
| **NCSF** — Contraindicated exercises, program design | Reinforces pairing and fatigue logic; description/cue alignment. |
| **Project** | docs/EXERCISE_ONTOLOGY_DESIGN.md § C.12–C.17, lib/ontology/vocabularies.ts, existing audits (pairing, fatigue, descriptions, rep ranges, aliases, swap, demand levels). |

---

## 2. Pairing category

**Purpose:** Primary limiting factor for superset logic (“no double grip”, “chest + triceps OK”, “avoid same category twice”).  
**Canonical:** chest, shoulders, triceps, back, biceps, quads, posterior_chain, core, grip, mobility.  
**Generator:** getEffectivePairingCategory(); same-category penalty; complementary pairs (chest+triceps, back+biceps); hasGripDemand() when pairing_category = grip.  
**Enrichment:** Set for power/Olympic derivatives (thruster → quads or posterior_chain; clean/snatch → grip or posterior_chain; jerk → shoulders). Conditioning may stay null.

---

## 3. Fatigue regions

**Purpose:** Regions that get fatigued; superset overlap penalty; avoid stacking same region.  
**Canonical:** quads, glutes, hamstrings, pecs, triceps, shoulders, lats, biceps, forearms, grip, core, calves.  
**Generator:** getCanonicalFatigueRegions(); hasGripFatigueDemand adds grip; superset scoring overlap penalty.  
**Enrichment:** Ensure grip-heavy exercises have forearms and grip in fatigue_regions when pairing_category = grip or grip_demand high. Backfill any still null from pairing_category or primary_muscles.

---

## 4. Descriptions

**Purpose:** User-facing text for display and accessibility. Not used by generator.  
**Standards:** 1–3 sentences; include movement family, primary muscles, equipment. Sources: ExRx, NSCA, ACSM, NCSF. See **docs/research/descriptions-audit-2025.md**.  
**Enrichment:** Backfill stub where description IS NULL: “[Name] is a [family] exercise. Primarily targets [primary_muscles]. Equipment: [list].” (20250325000007, 20250331000000, 20250331000002.)

---

## 5. Rep ranges

**Purpose:** Exercise-specific rep floor/ceiling; generator blends with goal (strength vs hypertrophy) for prescription.  
**Evidence:** See **docs/research/rep-ranges-audit-2025.md** (NSCA, ACSM, ExRx, NCSF, Schoenfeld). Strength 3–6, hypertrophy 8–15, calves 15–25, isolation 10–20; power/Olympic and mobility/conditioning null.  
**Generator:** getEffectiveRepRange(); prescription resolver uses when set.  
**Enrichment:** 20250325000008 (calves, isolation, high-rep slugs); 20250331000000 (main_compound 6–12 where null); 20250331000003 (power/Olympic cleared, shrug/wrist 10–20).

---

## 6. Aliases

**Purpose:** Search and discovery; alternate names and abbreviations (OHP, RDL, BP, DL).  
**Evidence:** See **docs/research/aliases-audit-2025.md** (NSCA, ACSM, ExRx, NCSF — common names and programming shorthand).  
**Standards:** Trim, dedupe, exclude canonical name; include abbreviations, alternate spellings (pull-up/pull up), colloquial names.  
**Enrichment:** 20250325000009, 20250331000000 (OHP, BP, RDL, DL, BSS, WGS, lat pulldown, leg press, goblet, hip thrust, KB swing), 20250331000004 (pull-up, chin-up, leg curl/ext, sumo/trap bar DL, incline press, push-up, rows, face pull, lateral raise, etc.).

---

## 7. Swap candidates

**Purpose:** Exercise slugs that are good substitutes in the same block/slot (equipment missing, user wants alternative).  
**Evidence:** See **docs/research/swap-candidates-audit-2025.md** (NSCA, ACSM, ExRx, NCSF — same movement pattern, same muscle focus, equipment alternatives).  
**Standards:** No self-reference; only active slugs; same pattern/family preferred; bidirectional where appropriate.  
**Generator:** getSubstitutes (pattern/muscles/regressions); adapter passes swap_candidates to Exercise; UI can prefer these when suggesting swaps.  
**Enrichment:** 20250325000010, 20250331000000, 20250331000005 (oh_press, incline_bench, pullup/chinup/lat_pulldown, sumo_deadlift, good_morning, back_extension, ab_wheel, pallof, reverse_fly, arnold_press, pike_push_up, cable_fly, nordic_curl).

---

## 8. Warmup / cooldown / stability / grip / impact (demand levels)

**Purpose:** warmup_relevance, cooldown_relevance → block selection (prefer high/medium in warmup/cooldown). stability_demand → optional down-rank for beginners. grip_demand → hasGripFatigueDemand, superset no double grip. impact_level → down-rank high when user has knee/lower_back/ankle limitations.  
**Evidence:** See **docs/research/demand-levels-audit-2025.md** (NSCA, ACSM, ExRx, NCSF; warmup/cooldown for block selection, stability for beginners, grip for superset no-double-grip, impact for injury-aware).  
**Canonical values:** none | low | medium | high.  
**Generator:** cooldownSelection, ontologyScoring (warmup/cooldown relevance); dailyGenerator (impact_level penalty); supersetPairing (grip).  
**Enrichment:** 20250325000011, 20250331000000, 20250331000006 (warmup/cooldown high for prep/stretch, low for main work; stability medium for unilateral; impact high for plyo/jump/run; grip high for pulls/carries).

---

## 9. Validation

- pairing_category: only canonical slugs or null (conditioning).
- fatigue_regions: only canonical slugs; grip-heavy have forearms+grip when appropriate.
- descriptions: non-empty or stub where null.
- rep_range_min/max: both set together, 0–100, min ≤ max; null for mobility/conditioning.
- aliases: no empty strings; no canonical name in aliases.
- swap_candidates: no self; only active slugs; deduped.
- demand levels: only none/low/medium/high when set.

---

## 10. References

- NSCA: Program Design Essentials, Sequencing and Integrating Training.
- ACSM: Resistance training guidelines, rep/set recommendations.
- ExRx.net: Exercise directory, muscle involvement, common names.
- Project: EXERCISE_ONTOLOGY_DESIGN.md § C.12–C.17, vocabularies.ts, exercise-pairing-category-audit.md, exercise-fatigue-regions-audit.md, exercise-descriptions-audit.md, exercise-rep-ranges-audit.md, exercise-aliases-audit.md, exercise-swap-candidates-audit.md, exercise-demand-levels-audit.md.
