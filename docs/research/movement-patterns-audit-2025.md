# Movement pattern(s) audit: NSCA/ACSM-style, order and priority

**Date:** 2025-03-16  
**Category:** Exercise DB enrichment — movement_patterns (and legacy movement_pattern)  
**Scope:** Audit and enrich movement_patterns using same sources (NSCA, ACSM, ExRx, NCSF); order by relevance (primary first); add pattern priority logic to workout generation for better matching.

---

## 1. Research question

Which movement pattern(s) apply to each exercise, in what order of relevance (primary vs secondary)? How should the generator use primary pattern for balance and selection?

---

## 2. Sources

| Source | Type (Tier) | Link / key claim(s) |
|--------|-------------|----------------------|
| **NSCA** — The 8 Main Movement Patterns | Tier 1 | [NSCA TSAC Report](https://www.nsca.com/education/articles/tsac-report/the-8-main-movement-patterns/): Squat, hinge, push, pull, carry, locomotion, and related patterns as programming framework. |
| **NSCA** — Teaching Resistance Training Movement Patterns | Tier 1 | [NSCA PTQ](https://www.nsca.com/education/articles/ptq/teaching-resistance-training-movement-patterns/): Progressive strategies; pattern classification. |
| **ACSM** — Resistance training guidelines | Tier 1 | Multi-joint exercises, bilateral/unilateral; sequencing (large before small, multi-joint before single-joint). |
| **ACE** — Squat, Hinge, Pull and Push-Up Regressions and Progressions | Tier 2 | [ACE](https://www.acefitness.org/resources/pros/expert-articles/7076/progressions-and-regressions-what-do-they-look-like/): Five essential patterns — squat, hinge, push, pull, carry. |
| **ExRx.net** — Exercise Directory, movement plane | Tier 2 | Horizontal vs vertical push/pull; knee-dominant (squat) vs hip-dominant (hinge). |
| **NCSF** — Movement patterns (contraindications audit) | Tier 2 | Same audit sources; reinforces squat/hinge/push/pull/carry/locomotion. |
| **Project** — docs/EXERCISE_ONTOLOGY_DESIGN.md § C.3, lib/ontology/vocabularies.ts, lib/ontology/legacyMapping.ts | Internal | Fine patterns: squat, hinge, lunge, horizontal_push, vertical_push, horizontal_pull, vertical_pull, carry, rotation, anti_rotation, locomotion, shoulder_stability, thoracic_mobility. Legacy: squat, hinge, push, pull, carry, rotate, locomotion. |

---

## 3. Classification of findings

### High-confidence rules (implemented)

- **Primary pattern first:** movement_patterns[] is ordered **most→least relevant** (first = primary pattern for that exercise). Legacy movement_pattern is derived from first element via getLegacyMovementPattern().
- **Compound exercises:** Multi-pattern exercises (e.g. thruster, clean) have multiple movement_patterns in order: primary first, then secondary. E.g. thruster → [squat, vertical_push]; clean → [hinge, vertical_pull] or [hinge, squat] per variant.
- **Fine vs legacy:** Fine patterns (horizontal_push, vertical_push, lunge, etc.) map to legacy (push, pull, squat, etc.) for balance and caps; generator uses legacy for session pattern counts; when filling a target legacy pattern, prefer exercises whose **primary** (first) fine pattern maps to that legacy.
- **Canonical values only:** All movement_patterns and movement_pattern from ontology (MOVEMENT_PATTERNS, LEGACY_MOVEMENT_PATTERNS in lib/ontology/vocabularies.ts).

### Context-dependent heuristics (implemented)

- **Lunge:** Unilateral/split lower; maps to legacy squat for balance (NSCA, project). Primary pattern for split squat, step-up, walking lunge.
- **Locomotion:** Gait, cyclical; conditioning (rower, bike, run) and step-up. Primary for ergs and treadmill.
- **Rotation / anti_rotation / thoracic_mobility:** All map to legacy rotate; fine patterns distinguish for cooldown/mobility selection.

### Speculative / deferred

- Finer plane-based tags (e.g. sagittal vs frontal) not added; ontology stays as-is.

---

## 4. Comparison to previous implementation

- **Before:** movement_patterns backfilled from movement_pattern + slug in 20250325000002; single primary pattern per exercise; category-fill used first match on legacy pattern.
- **After:** (1) movement_patterns enriched with secondary patterns for compounds (thruster, clean, etc.), order primary→secondary. (2) Sync movement_pattern from first movement_patterns element. (3) Category-fill pass: when multiple exercises match target legacy pattern, prefer the one whose **primary** (movement_patterns[0]) maps to that legacy (better pattern match). (4) Ontology doc states order = most→least relevant.

---

## 5. Metadata / ontology impact

- **DB:** movement_patterns (text[]); order = most→least relevant. movement_pattern (legacy) synced from first element.
- **Ontology:** No new slugs; existing C.3 fine and legacy patterns. Doc updated: order and generator use of primary pattern.
- **Generation:** pickMainWorkExercises prefers exercises whose primary fine pattern maps to the target legacy pattern when filling for balance.

---

## 6. Validation

- Every active exercise has valid movement_pattern and, where set, movement_patterns ordered with primary first.
- Legacy movement_pattern equals getLegacyMovementPattern({ movement_patterns: [movement_patterns[0]], movement_pattern }).
- Balance and category-fill produce better variety (primary-pattern preference).
