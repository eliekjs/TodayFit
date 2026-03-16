# Demand levels audit: warmup, cooldown, stability, grip, impact (evidence-based)

**Date:** 2025-03-16  
**Category:** Exercise DB enrichment — warmup_relevance, cooldown_relevance, stability_demand, grip_demand, impact_level  
**Scope:** Audit the five demand/relevance columns using NSCA, ACSM, ExRx, NCSF; document purpose and derivation; ensure normalization and backfill align with evidence. Generator uses them for block selection, superset grip logic, and injury-aware scoring.

---

## 1. Research question

When should an exercise be tagged as high warmup or cooldown relevance? What defines stability demand, grip demand, and impact level, and how should the generator use these for block selection and injury-aware filtering?

---

## 2. Sources

| Source | Type (Tier) | Key claim(s) |
|--------|-------------|--------------|
| **NSCA** — Program design, warm-up, cool-down | Tier 1 | Warm-up: general then specific; dynamic mobility, activation, light movement prep (not heavy loading). Cool-down: gradual reduction, static stretching, breathing. Balance and single-leg progressions increase stability demand; grip is a limiter in pulls and carries. |
| **ACSM** — Resistance training, flexibility guidelines | Tier 1 | Warm-up 5–10 min (aerobic + dynamic); cool-down with static stretch. Joint impact (plyometric, running) relevant for injury risk; musculoskeletal considerations for knee, low back, ankle. |
| **ExRx.net** — Exercise directory, grip/movement | Tier 2 | Pull-up, deadlift, row, carry: grip/forearm often limiting; distinguishes exercises by primary constraint. Unilateral and unstable variants increase balance demand. |
| **NCSF** — Program design, contraindications | Tier 2 | Warm-up and cool-down best practices; stability progressions (single-leg, balance); impact considerations for contraindicated populations. |
| **Project** | Internal | docs/EXERCISE_ONTOLOGY_DESIGN.md § C.16, lib/ontology/vocabularies.ts (DEMAND_LEVELS), 20250325000011, ontologyScoring.ts, cooldownSelection.ts, dailyGenerator.ts (impact_level), supersetPairing.ts (grip_demand). |

---

## 3. Classification of findings

### High-confidence rules (implemented)

- **Canonical values (all five):** `none` | `low` | `medium` | `high`. **Implemented:** DEMAND_LEVELS; normalize trim/lowercase; invalid → NULL.
- **warmup_relevance:** How suitable as **warm-up** (activation, light mobility, prep). **High:** classic prep/mobility exercises (cat/cow, band pull-apart, dead bug, world’s greatest stretch, hip 90/90, thread the needle, inchworm, YTW, breathing, etc.). **Medium:** exercise_role mobility/prep or modalities mobility/recovery. **Low:** main_compound, accessory, isolation, finisher, conditioning, power, olympic (so they are not preferred as warmup). **Generator:** Warmup block prefers high/medium when scoring candidates (ontologyScoring warmup_cooldown_relevance). **Implemented:** 20250325000011, 20250331000000.
- **cooldown_relevance:** How suitable as **cooldown/stretch**. **High:** dedicated stretch/mobility slugs (standing hamstring stretch, figure four, calf stretch, child’s pose, supine twist, etc.) or stretch_targets present. **Medium:** mobility/cooldown/stretch role. **Low:** main work roles. **Generator:** Cooldown selection sorts by this after role. **Implemented:** 20250325000011, 20250331000000.
- **stability_demand:** Balance / single-leg / anti-rotation demand. **High:** single-leg or unstable (pistol squat, shrimp squat, single-leg RDL, Bulgarian split squat, stability ball curl, bottoms-up press). **Medium:** unilateral or single-arm (db_row, renegade row, suitcase carry, walking lunge). **Low:** machine/supported (leg extension, leg press, pec deck, lat pulldown, cable row, etc.). **Generator:** Optional down-rank high when user_level is beginner. **Implemented:** 20250325000011.
- **grip_demand:** Forearm/grip fatigue; **high/medium** → hasGripFatigueDemand, adds "grip" to fatigue regions for superset logic (no double grip). **High:** pull-up, chin-up, deadlift variants, farmer/suitcase/waiter carry, toes-to-bar, hanging leg raise, heavy rows, rack pull, KB swing. **Medium:** barbell bench, OH press, front squat, back squat, good morning, barbell curl, etc. **Implemented:** 20250325000011, 20250331000000.
- **impact_level:** Joint impact (plyometric, running). **High:** jump squat, box jump, burpee, jump rope, jump lunge, mountain climber, running, sprint, bounding, skater jump, tuck jump, broad jump. **Medium:** step-up, walking lunge, assault bike, ski erg, conditioning. **Low:** strength/hypertrophy/power movement_pattern (squat, hinge, push, pull, carry, rotate). **Generator:** Down-rank high when user has knee/lower_back/ankle limitations (dailyGenerator impact_penalty). **Implemented:** 20250325000011, 20250331000000.

### Context-dependent heuristics (implemented)

- **Power/Olympic:** warmup_relevance and cooldown_relevance = low (main work). **Implemented:** 20250331000000.
- **Double unders, battle ropes:** impact or conditioning; can set impact_level medium if not already high. Optional in enrichment.
- **Stability:** More unilateral exercises (e.g. step-back lunge, split squat) can get medium; only clear high-demand cases get high.

### Speculative / deferred

- Finer ordinal scales (e.g. 1–5) — stay with none/low/medium/high.
- Per-joint impact (knee vs ankle vs spine) — single impact_level for now; injury keys filter which injuries care.

---

## 4. Comparison to implementation

- **Before:** 20250325000011 normalized and backfilled all five columns by slug, role, modalities, movement_pattern, equipment, unilateral; 20250331000000 added power/olympic low warmup/cooldown, impact high for jump/bound/burpee/running/sprint/jump_rope, grip high for Olympic and toes_to_bar/l_sit/hanging_leg_raise.
- **After (this audit):** (1) Research note ties each dimension to NSCA, ACSM, ExRx, NCSF. (2) Optional enrichment for stragglers (e.g. more warmup high slugs, double_unders impact, stability medium for step_back_lunge). (3) No schema change; column comments reference evidence doc.

---

## 5. Generator use

- **Warmup block:** ontologyScoring scores candidates; warmup_relevance high/medium preferred.
- **Cooldown block:** cooldownSelection sorts by cooldown_relevance after role.
- **Superset:** hasGripFatigueDemand (grip_demand high/medium or pairing_category grip) → add grip to fatigue regions; no double grip.
- **Injury-aware:** impact_level === "high" and user has knee/lower_back/ankle → score penalty (dailyGenerator).
- **Stability:** Can down-rank high stability_demand when user is beginner (optional in scoring).

---

## 6. Validation

- Every non-null value is one of: none, low, medium, high (lowercase).
- Warmup/cooldown high only on prep/mobility/stretch-appropriate exercises; low on main work.
- Grip high on pulls, carries, hangs; impact high on plyometric/jump/run.

---

## 7. References

- NSCA: Program design (warm-up, cool-down, stability progressions, grip as limiter).
- ACSM: Resistance training, flexibility (warm-up, cool-down); musculoskeletal considerations (impact).
- ExRx.net: Grip/forearm role; unilateral and balance demand.
- NCSF: Program design, contraindications, impact.
- Project: EXERCISE_ONTOLOGY_DESIGN.md § C.16, exercise-demand-levels-audit.md, 20250325000011, 20250331000000, 20250331000006, ontologyScoring.ts, cooldownSelection.ts, dailyGenerator.ts, supersetPairing.ts.
