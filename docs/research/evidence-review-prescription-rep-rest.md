# Evidence review: Prescription rep ranges and rest (strength vs hypertrophy)

**Date:** 2025-03-13  
**Subsystem:** Prescription (reps/sets/rest) for strength and hypertrophy  
**Agent run:** workout-logic-research-integration-agent

---

## 1. Research question

Do our prescription rules for **rest periods** and **rep ranges** for strength and hypertrophy align with ACSM/NSCA and systematic reviews?

---

## 2. Sources

| Source | Type (Tier) | Link / DOI | Key claim(s) |
|--------|-------------|------------|--------------|
| ACSM position stand (resistance training progression) | Tier 1 | ACSM Progression Models (2002/2009); UpToDate summary | Strength: 1–6 RM, **3–5 min rest**. Hypertrophy: 6–12 RM zone, **1–2 min rest**. |
| Grgic et al., rest intervals and strength | Tier 1 | Sports Med 2018 (systematic review) | Rest >2 min superior for strength in trained individuals; shorter rest can limit strength gains. |
| Schoenfeld et al., rest and hypertrophy | Tier 1 | Frontiers 2024 (Bayesian meta-analysis) | Rest >60 s has small hypertrophic benefit vs shorter; 60–90 s and longer show negligible difference for hypertrophy. |
| 2017 systematic review (short vs long rest, hypertrophy) | Tier 1 | Eur J Sport Sci / PubMed 28641044 | Both short (≤60 s) and long (>60 s) rest useful for hypertrophy; trained participants may benefit from longer rest. |

---

## 3. Classification of findings

### High-confidence rules (implemented)

- **Strength: rest 3–5 min** (ACSM). Implemented: `restRange: { min: 150, max: 300 }` (2.5–5 min) in `lib/generation/prescriptionRules.ts` and `rest_seconds_min/max: 150–300` in `prescriptionStyles.ts` (heavy_strength).
- **Hypertrophy: rest 1–2 min or 60–90 s** (ACSM; meta-analysis ≥60 s). Implemented: `restRange: { min: 60, max: 90 }` in goal rules and 60–90 in moderate_hypertrophy style.

### Context-dependent heuristics (implemented)

- Rep ranges left as-is: strength 3–6, hypertrophy 8–15 (already within evidence bands). No change.
- Accessory rest for strength day left at 60–90 s (moderate; not main work).

### Speculative / deferred

- Very short rest (<60 s) for hypertrophy “metabolic stress”: documented as possible but not clearly superior; deferred.
- Periodization (varying rep/rest across weeks): out of scope for this run.

---

## 4. Comparison to previous implementation

- **Before:** Strength rest 120–180 s (2–3 min); hypertrophy rest 45–90 s.
- **Evidence:** Strength benefits from 3–5 min; hypertrophy 1–2 min or 60–90 s; ≥60 s for hypertrophy is better supported than 45 s.
- **Gap closed:** Strength rest extended to 150–300 s; hypertrophy rest floor raised to 60 s. Both paths updated: daily generator uses `prescriptionRules.ts`; workoutIntelligence uses `prescriptionStyles.ts`.

---

## 5. Metadata / ontology impact

- None. Change is prescription constants only; no new exercise or ontology fields.

---

## 6. Open questions / follow-ups

- Consider exposing rest as a range in the UI (e.g. “Rest 2–3 min”) rather than a single value.
- Future run could add power/explosive prescription (rest 2–5 min) consistency check.
