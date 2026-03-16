# Goal sub-goals (goal sub-focus) audit: evidence-based design and tag mapping

**Date:** 2025-03-16  
**Category:** Goals — sub-goals per goal (goal sub-focus), sub-focus → exercise tag mapping  
**Scope:** Audit sub-goal options per primary goal and sub-focus–to–exercise-tag mapping using NSCA, ACSM, ExRx, NCSF; document rationale for each goal’s sub-focus list and tag weights. Generator uses getExerciseTagsForGoalSubFocuses to bias exercise selection in Manual mode. Parent goals catalog: docs/research/goals-audit-2025.md.

---

## 1. Research question

What sub-goals (sub-focus options) should users be able to select within each primary goal, and how should each sub-goal map to exercise tags so the generator can bias toward the right exercises?

---

## 2. Sources

| Source | Type (Tier) | Key claim(s) |
|--------|-------------|--------------|
| **NSCA** — Essentials of Strength & Conditioning, program design | Tier 1 | Strength: movement-pattern emphasis (squat, hinge, push, pull); hypertrophy: body-part/region emphasis; power: lower/upper/plyometric; conditioning: energy-system emphasis (aerobic base, intervals, threshold); mobility: joint/region (hip, shoulder, spine). |
| **ACSM** — Guidelines, resistance and endurance | Tier 1 | Movement patterns (compound squat/hinge/push/pull); muscular endurance and aerobic base (zone 2, threshold, intervals); joint mobility by region. |
| **ExRx.net** — Exercise directory, movement patterns and muscles | Tier 2 | Squat, hinge, push, pull, and body-part tags (quads, glutes, back, chest, shoulders, arms, core); supports mapping sub-focus to tag slugs. |
| **NCSF** — Program design, athletic performance | Tier 2 | Power/plyometric, speed/agility, Olympic/triple extension; mobility and recovery by region (hips, T-spine, shoulders, lower back, ankles). |
| **Project** | Internal | data/goalSubFocus/ (GOAL_SUB_FOCUS_OPTIONS, GOAL_SUB_FOCUS_TAG_MAP), goal_sub_focus + goal_sub_focus_tag_map (20250318000000), lib/generator.ts (getExerciseTagsForGoalSubFocuses), docs/research/goals-audit-2025.md. |

---

## 3. Classification of findings

### High-confidence rules (implemented)

- **Sub-goals = goal sub-focus:** Within each primary goal (Build Strength, Build Muscle, Body Recomposition, Sport Conditioning, Improve Endurance, Mobility & Joint Health, Athletic Performance, Calisthenics, Power & Explosiveness, Recovery), 4–8 **sub-focus** options let users narrow focus. Selection biases exercise ranking via tag weights. **Implemented:** GOAL_SUB_FOCUS_OPTIONS keyed by primary focus label; each entry has goalSlug + subFocuses (slug, name). DB: goal_sub_focus (goal_slug, sub_focus_slug, display_name, sort_order).
- **Sub-focus → exercise tag mapping:** Each (goal_slug, sub_focus_slug) maps to a list of **tag_slug** with optional **weight** (default 1; 1.1–1.4 for primary emphasis). Generator merges weights when multiple sub-focuses selected. **Implemented:** GOAL_SUB_FOCUS_TAG_MAP (key `goalSlug:subFocusSlug`); goal_sub_focus_tag_map (DB); getExerciseTagsForGoalSubFocuses(goalSlug, subFocusSlugs, subFocusWeights?).
- **Evidence-aligned sub-focus design:**  
  - **Strength:** Squat, Deadlift/Hinge, Bench/Press, Overhead Press, Pull, Full-body (NSCA/ExRx movement patterns).  
  - **Muscle / Physique:** Glutes, Back, Chest, Arms, Shoulders, Legs, Core, Balanced (body-part/region; ExRx/NSCA hypertrophy emphasis).  
  - **Conditioning:** Zone 2 / Aerobic base, Intervals / HIIT, Threshold / Tempo, Hills, Full-body, Upper, Lower, Core (ACSM/NSCA energy systems and regional work).  
  - **Power & Explosiveness:** Lower body power/plyos, Olympic/triple extension, Upper body power, Vertical jump, Sprint, Full-body (NSCA/NCSF power taxonomy).  
  - **Endurance:** Zone 2 / Long steady, Threshold / Tempo, Intervals, Hills, Durability (ACSM aerobic base and durability).  
  - **Mobility / Recovery:** Hips, Shoulders, T-spine, Lower back, Ankles, Full-body (NCSF/ACSM joint-by-region).  
  - **Athletic Performance:** Speed/Sprint, Vertical jump, Power/Explosive, Agility/COD, Core, Upper, Lower, Full-body (NSCA athletic qualities).  
  - **Calisthenics:** Pull-ups, Push-ups, Dips, Handstand, Core, Front lever/Advanced (movement-family emphasis).
- **Tag slug alignment:** Sub-focus tag slugs should match public.exercise_tags and exercise_tag_map (e.g. squat, hinge, push, pull, glutes, quads, power, plyometric, zone2, conditioning, hip_mobility, thoracic_mobility, core_stability, recovery). **Implemented:** GOAL_SUB_FOCUS_TAG_MAP reuses slugs from sport sub-focus taxonomy and ontology; one known variant is "shoulder stability" (space) in goal map vs "shoulder_stability" elsewhere — align if matching fails.

### Context-dependent heuristics (implemented)

- **Primary focus label → goal slug:** Multiple UI labels can map to the same goal_slug (e.g. "Build Strength", "Athletic Performance", "Calisthenics" → strength; "Power & Explosiveness" → conditioning) so one tag map covers several primary-focus variants. **Implemented:** GOAL_SUB_FOCUS_OPTIONS; resolveGoalSubFocusSlugs(primaryFocusLabel, subFocusLabels).
- **Weight scale:** 1.0 = baseline; 1.1–1.4 = stronger bias for that sub-focus; empty array = no tag boost (e.g. "balanced" for muscle/physique). **Implemented:** GOAL_SUB_FOCUS_TAG_MAP weights; getExerciseTagsForGoalSubFocuses aggregates and returns { tag_slug, weight }[].
- **Max selectable:** UI limits sub-focus selection (e.g. max 3 per goal) to keep ranking interpretable. **Implemented:** preferences and Manual flow.

### Speculative / deferred

- Sub-focus–specific rep ranges or block templates (e.g. "Zone 2" → longer steady block) — generator uses primary goal prescription; sub-focus only biases exercise choice.
- Localized sub-focus names — single language for now.

---

## 4. Comparison to implementation

- **Before:** GOAL_SUB_FOCUS_OPTIONS and GOAL_SUB_FOCUS_TAG_MAP in data/goalSubFocus/; goal_sub_focus and goal_sub_focus_tag_map in DB (20250318000000); getExerciseTagsForGoalSubFocuses used in lib/generator.ts for Manual mode.
- **After (this audit):** (1) Research note ties goal sub-goal concept and tag mapping to NSCA, ACSM, ExRx, NCSF. (2) Table comments reference this evidence doc (migration 20250331000010). (3) No change to sub-focus lists or tag map; documentation only.

---

## 5. Generator / app use

- **getExerciseTagsForGoalSubFocuses(goalSlug, subFocusSlugs, subFocusWeights?):** Returns aggregated { tag_slug, weight }[] for the selected sub-focuses. Used to bias exercise selection in Manual workout generation.
- **lib/generator.ts:** Calls getExerciseTagsForGoalSubFocuses(goalSlug, subFocusSlugs) and uses the returned weights to rank/select exercises (e.g. when building main and secondary blocks).
- **resolveGoalSubFocusSlugs(primaryFocusLabel, subFocusLabels):** Converts UI primary focus + sub-focus labels to goalSlug and subFocusSlugs for tag lookup.
- **Canonical source:** TypeScript (data/goalSubFocus/) is canonical; DB (goal_sub_focus, goal_sub_focus_tag_map) seeded for server/RPC; app uses TS for generation.

---

## 6. Validation

- Every sub-focus in GOAL_SUB_FOCUS_OPTIONS (per goal slug) has a corresponding entry in GOAL_SUB_FOCUS_TAG_MAP when tag biasing is intended (optional empty array for "balanced").
- Tag slugs in GOAL_SUB_FOCUS_TAG_MAP align with public.exercise_tags or documented variants (e.g. shoulder stability).
- Goal slugs in GOAL_SUB_FOCUS_OPTIONS match DB goals and PrimaryGoal mapping (strength, muscle, physique, conditioning, endurance, mobility, resilience).

---

## 7. References

- NSCA: Movement patterns, body-part emphasis, power/plyometric, energy systems, mobility by region.
- ACSM: Aerobic base, threshold, intervals; resistance by pattern and region; joint mobility.
- ExRx.net: Movement patterns and muscle groups (tag mapping).
- NCSF: Athletic performance sub-qualities; mobility and recovery by region.
- Project: data/goalSubFocus/, 20250318000000_goal_sub_focus.sql, lib/generator.ts, docs/research/goals-audit-2025.md.
