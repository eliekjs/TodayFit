# Exercise rep ranges audit: evidence-based standards and enrichment

**Date:** 2025-03-16  
**Category:** Exercise DB enrichment — rep_range_min / rep_range_max  
**Scope:** Audit exercise-specific rep ranges using NSCA, ACSM, ExRx, NCSF and existing evidence; document goal-driven vs exercise-specific bands; ensure normalization and backfill align with sources. Generator blends exercise range with goal via getEffectiveRepRange.

---

## 1. Research question

When should an exercise have explicit rep_range_min/max vs leave null (goal-only)? What rep bands do evidence and convention support for strength, hypertrophy, isolation, calves, and power/mobility/conditioning?

---

## 2. Sources

| Source | Type (Tier) | Key claim(s) |
|--------|-------------|--------------|
| **ACSM** — Position stand, resistance training progression | Tier 1 | Strength: **1–6 RM** (heavy loading); hypertrophy: **6–12 RM** zone, 1–2 min rest; muscular endurance: **15–25+** at 50–65% 1RM. |
| **NSCA** — Program design, Essentials of Strength Training | Tier 1 | Strength: low reps (1–6); hypertrophy: moderate reps (6–12); endurance: higher reps. Exercise order and muscle-group sequencing; single-joint/isolation often programmed in higher rep ranges (10–20) for pump and safety. |
| **ExRx.net** — Exercise pages, prescription notes | Tier 2 | Many isolation/small-muscle exercises listed with typical rep suggestions (e.g. lateral raise, curl, leg curl 10–20); calves commonly 15–25; compounds often “goal-dependent”. |
| **NCSF** — Program design | Tier 2 | Reinforces strength = low reps, hypertrophy = moderate, endurance = high; isolation work often 10–15+ reps. |
| **Schoenfeld et al.** — Hypertrophy meta-analyses | Tier 1 | Hypertrophy similar across **6–20 reps** when near failure; 8–15 favors efficiency. Calves/small muscles: higher rep ranges (15–25) commonly used in practice (volume, fiber type). |
| **Project** | Internal | docs/REP_RANGE_AND_SUPERSET_DURATION.md, lib/generation/prescriptionRules.ts (goal rep ranges), logic/workoutGeneration/dailyGenerator.ts (getEffectiveRepRange), 20250325000008_exercise_rep_ranges_audit.sql, evidence-review-prescription-rep-rest.md. |

---

## 3. Classification of findings

### High-confidence rules (implemented)

- **Goal rep ranges (prescription rules):** Strength 3–6, hypertrophy 8–15, body recomp 10–15, endurance 15–25, power 1–5 (ACSM/NSCA). **Implemented:** prescriptionRules.ts GOAL_TRAINING_RULES; generator uses these when exercise has no override.
- **Exercise override when both set:** Generator blends: effective = [max(goal.min, ex.min), min(goal.max, ex.max)]; if effective empty, fall back to goal range (getEffectiveRepRange). **Implemented:** dailyGenerator.ts getEffectiveRepRange.
- **Calves / small muscles:** 15–25 (Schoenfeld, ExRx, convention — volume and fiber-type rationale). **Implemented:** 20250325000008 backfill for calf raises by slug/name.
- **Isolation / single-joint:** 10–20 (NSCA, ACSM, ExRx — pump, safety, typical programming). **Implemented:** exercise_role = isolation → 10–20; high-rep slugs (lateral raise, face pull, curl, leg curl, leg extension, fly, pushdown, etc.) → 12–20.
- **Main compounds:** Leave **null** so goal fully dictates (strength 3–6, hypertrophy 8–15). Optional: set 6–12 as a ceiling that still blends with goal (e.g. hypertrophy 8–12, strength 6–6). **Implemented:** 20250331000000 sets main_compound 6–12 where null (blend); alternative is leave null — both valid.
- **Mobility / conditioning:** **Null** (time-based or 1 rep/hold). **Implemented:** 20250325000008 clears rep_range for mobility, conditioning, cooldown, stretch, breathing.
- **Power / Olympic:** **Null** so power goal uses 1–5 from goal only (ACSM/NSCA: power = low reps, high intent). **Implemented:** Migration 20250331000003 clears rep_range for exercise_role in ('power','olympic').
- **Constraints:** Both min and max set together; min ≤ max; 0 ≤ min, max ≤ 100. **Implemented:** 20250325000008 normalizes invalid.

### Context-dependent heuristics (implemented)

- **Accessory (non-isolation):** Optional 8–20 or null; prefer null unless exercise clearly benefits from higher band (e.g. goblet squat 8–12 when DB-only). Generator already uses accessoryRepRange when isAccessory; exercise override can narrow.
- **Wrist/forearm isolation:** 10–15 or 12–20 when added to slug list (ExRx/NCSF). **Implemented:** reverse_curl in 20250325000008; wrist_curl can be added in enrichment if needed.

### Speculative / deferred

- Periodization (varying rep ranges by week) — out of scope; single prescription per session.
- Per-muscle-group rep bands (e.g. “lats 8–12, biceps 10–15”) — currently one band per exercise; defer.

---

## 4. Comparison to implementation

- **Before:** Calves 15–25, isolation 10–20, high-rep slugs 12–20; mobility/conditioning cleared; main_compound sometimes null, sometimes 6–12 (20250331000000).
- **After (this audit):** (1) Research note ties all bands to ACSM, NSCA, ExRx, NCSF, Schoenfeld. (2) Power/Olympic exercises have rep_range cleared so power goal 1–5 is used. (3) No schema change; validation and comments reference evidence doc.

---

## 5. Generator use

- **getEffectiveRepRange(exercise, goalRange):** If exercise.rep_range_min and rep_range_max both set, return intersection with goal; else return goal. Used in getPrescription for main_strength, main_hypertrophy, accessory, power.
- **prescriptionRules.ts:** Goal rep ranges (strength 3–6, hypertrophy 8–15, etc.) are evidence-based; exercise overrides only narrow or shift within valid band.

---

## 6. Validation

- For every active exercise: (rep_range_min IS NULL AND rep_range_max IS NULL) OR (both set, min ≤ max, 0 ≤ min,max ≤ 100).
- Calves, isolation, high-rep slugs: have 10–25 bands where backfilled.
- Mobility, conditioning, power, olympic: rep_range null.
- getEffectiveRepRange returns goal when exercise range null or when intersection empty.

---

## 7. References

- ACSM: Position stand, resistance training progression (1–6 RM strength, 6–12 hypertrophy, 15–25+ endurance).
- NSCA: Essentials of Strength Training, program design (low/moderate/high rep by goal; isolation 10–20).
- ExRx.net: Exercise pages, typical rep suggestions for isolation and calves.
- NCSF: Program design (strength/hypertrophy/endurance rep bands).
- Schoenfeld et al.: Hypertrophy 6–20 reps near failure; calves/small-muscle higher reps.
- Project: REP_RANGE_AND_SUPERSET_DURATION.md, prescriptionRules.ts, dailyGenerator.ts getEffectiveRepRange, exercise-rep-ranges-audit.md, 20250325000008, evidence-review-prescription-rep-rest.md.
