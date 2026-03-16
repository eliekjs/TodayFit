# Sport sub-goals (sub-focus) audit: evidence-based design and tag mapping

**Date:** 2025-03-16  
**Category:** Sport prep — sport sub-goals (sub-focus), sub-focus → exercise tag mapping  
**Scope:** Audit sport sub-goals/sub-focus design and sub-focus–to–exercise-tag mapping using NSCA, ACSM, ExRx, NCSF and sport-specific literature; document rationale for sub-focus options and tag weights. Generator uses getExerciseTagsForSubFocuses and getPreferredExerciseNamesForSportAndGoals to bias exercise selection.

---

## 1. Research question

What training priorities (sub-goals) should users be able to select within a sport, and how should each sub-goal map to exercise tags so the generator can bias toward the right exercises?

---

## 2. Sources

| Source | Type (Tier) | Key claim(s) |
|--------|-------------|--------------|
| **NSCA** — Essentials of Strength & Conditioning, sport-specific programming | Tier 1 | Within-sport training priorities: strength/power vs conditioning vs durability; periodization (general → specific); exercise selection for transfer (e.g. posterior chain for running, grip for climbing). |
| **ACSM** — Guidelines, endurance and resistance | Tier 1 | Aerobic base, threshold, VO2; strength as support for endurance; joint stability and injury resilience. |
| **ExRx.net** — Exercise directory, movement patterns | Tier 2 | Movement patterns (squat, hinge, pull, push) and muscle groups; supports mapping sub-goals to tag slugs (e.g. pulling_strength, core_anti_rotation). |
| **NCSF** — Program design, athletic performance | Tier 2 | Sport-specific qualities (speed, power, work capacity, stability); exercise selection for carryover. |
| **Sport-specific literature** | Tier 2 | Running: aerobic base, threshold, economy, leg resilience. Climbing: finger strength, pull strength, lock-off, shoulder stability. Skiing: uphill endurance, eccentric control, knee stability. Court sports: speed, change of direction, hamstring resilience. |
| **Project** | Internal | data/sportSubFocus/ (SPORTS_WITH_SUB_FOCUSES, SUB_FOCUS_TAG_MAP, exerciseTagTaxonomy), 20250306000000_sports_sub_focus_schema.sql, starterExerciseRepository (getPreferredExerciseNamesForSportAndGoals), DEVELOPMENT_PLAN_SPORT_EXERCISES.md, docs/research/sports-audit-2025.md. |

---

## 3. Classification of findings

### High-confidence rules (implemented)

- **Sub-goals = sub-focus:** Within a sport, 3–6 **sub-focuses** represent the main physical attributes to improve (e.g. Finger Strength, Uphill Endurance, Work Capacity). User selection biases exercise ranking toward exercises tagged with the corresponding tags. **Implemented:** SPORTS_WITH_SUB_FOCUSES; sports_sub_focus (DB); priority_weight orders options.
- **Sub-focus → exercise tag mapping:** Each (sport_slug, sub_focus_slug) maps to a list of **exercise_tag_slug** with optional **weight** (default 1; e.g. 1.2 for primary tag). Generator uses these to boost exercises that have matching tags in exercise_tag_map or starter_exercises.tags. **Implemented:** SUB_FOCUS_TAG_MAP; sub_focus_tag_map (DB); getExerciseTagsForSubFocuses(sportSlug, subFocusSlugs).
- **Evidence-aligned examples:**  
  - **Aerobic base** → zone2_cardio, aerobic_base (ACSM/NSCA endurance).  
  - **Finger strength (climbing)** → finger_strength, grip (sport-specific).  
  - **Uphill endurance (skiing/trail)** → zone2_cardio, single_leg_strength, glute_strength.  
  - **Downhill control / knee resilience** → eccentric_quad_strength, knee_stability (NSCA/NCSF injury resilience).  
  - **Work capacity (Hyrox/CrossFit)** → work_capacity, lactate_threshold, zone3_cardio.  
  - **Shoulder stability** → shoulder_stability, scapular_control (ExRx/NCSF).  
  - **Vertical jump (basketball)** → explosive_power, plyometric.  
- **Tag taxonomy:** Movement patterns (squat_pattern, hinge_pattern, vertical_pull, etc.), strength qualities (max_strength, explosive_power, eccentric_strength), energy systems (zone2_cardio, lactate_threshold), joint/stability (knee_stability, core_anti_rotation, shoulder_stability), climbing-specific (finger_strength, lockoff_strength). **Implemented:** exerciseTagTaxonomy.ts; NEW_TAGS_TO_ADD for tags that must exist in exercise_tags.
- **Canonical source:** TypeScript (data/sportSubFocus) is canonical; DB (sports_sub_focus, sub_focus_tag_map) can be seeded from it for server/RPC. **Implemented:** 20250306000000 seeds a sample; full sync optional per DEVELOPMENT_PLAN.

### Context-dependent heuristics (implemented)

- **Weight scale:** Tag weight 1.0 = baseline; 1.2–1.3 = stronger bias for that sub-focus; &lt;1 (e.g. 0.8) = slight down-rank (e.g. low_impact for speed work). **Implemented:** SUB_FOCUS_TAG_MAP and sub_focus_tag_map.weight.
- **Multiple sub-focuses:** User can select more than one; getExerciseTagsForSubFocuses merges tag weights (and optional rank weights). **Implemented:** starterExerciseRepository, getPreferredExerciseNamesForSportAndGoals.
- **Sport slug alignment:** Sub-focus sports align with public.sports where possible; marathon_running and powerbuilding may be aliased to road_running / general_strength until added to sports table. **Implemented:** README and DEVELOPMENT_PLAN.

### Speculative / deferred

- Sub-focus–specific rep ranges or block emphasis (e.g. “aerobic base” → longer zone-2 blocks) — future generator wiring.
- Localized sub-focus names — single language for now.

---

## 4. Comparison to implementation

- **Before:** sports_sub_focus schema and sample seed (backcountry_skiing, rock_sport_lead, hyrox); SUB_FOCUS_TAG_MAP in TypeScript; getExerciseTagsForSubFocuses; starter_exercises.tags used for ranking when sub-focus selected.
- **After (this audit):** (1) Research note ties sub-goal concept and tag mapping to NSCA, ACSM, ExRx, NCSF and sport-specific priorities. (2) Table comments reference evidence doc. (3) No change to sub-focus list or tag map; documentation only.

---

## 5. Generator / app use

- **getExerciseTagsForSubFocuses(sportSlug, subFocusSlugs, subFocusWeights?):** Returns aggregated { tag_slug, weight }[] for the selected sub-focuses. Used to bias exercise selection.
- **getPreferredExerciseNamesForSportAndGoals:** Uses sport slug + sub-focus slugs (and optional weights) to get tag weights, then ranks starter exercises (or exercise pool) by overlap with those tags. **Implemented:** lib/db/starterExerciseRepository.ts; called from services/workoutBuilder.
- **Exercise tagging:** For sub-focus ranking to work, exercises must be tagged with the slugs in SUB_FOCUS_TAG_MAP (via exercise_tag_map or starter_exercises.tags). NEW_TAGS_TO_ADD lists tags to add to public.exercise_tags if missing (see DEVELOPMENT_PLAN Phase 1).

---

## 6. Validation

- Every sub-focus in SPORTS_WITH_SUB_FOCUSES has at least one entry in SUB_FOCUS_TAG_MAP (sport:sub_focus key).
- Every tag_slug in SUB_FOCUS_TAG_MAP exists in exerciseTagTaxonomy or NEW_TAGS_TO_ADD; add to public.exercise_tags if missing.
- Sport slugs in SPORTS_WITH_SUB_FOCUSES align with public.sports or documented aliases (marathon_running, powerbuilding).

---

## 7. References

- NSCA: Sport-specific programming, within-sport priorities, transfer.
- ACSM: Aerobic base, threshold, strength for endurance, stability.
- ExRx.net: Movement patterns, muscles (tag mapping).
- NCSF: Athletic performance, stability, work capacity.
- Project: data/sportSubFocus/, 20250306000000_sports_sub_focus_schema.sql, starterExerciseRepository.ts, DEVELOPMENT_PLAN_SPORT_EXERCISES.md, docs/research/sports-audit-2025.md.
