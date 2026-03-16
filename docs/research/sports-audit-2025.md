# Sports audit: evidence-based qualities, categories, and exercise–sport alignment

**Date:** 2025-03-16  
**Category:** Sport prep — sports catalog, sport_qualities, sport_quality_map, exercise–sport tagging  
**Scope:** Audit sports design and sport–quality–exercise alignment using NSCA, ACSM, ExRx, NCSF and sport-science sources; document quality definitions, relevance scale, and how exercise tagging supports sport-prep recommendations. Generator uses sport qualities and exercise–sport tags for target vector and ranking.

---

## 1. Research question

What physical qualities matter for different sports, and how should we map sports to qualities (relevance) and exercises to sports for complementary training and transfer?

---

## 2. Sources

| Source | Type (Tier) | Key claim(s) |
|--------|-------------|--------------|
| **NSCA** — Essentials of Strength & Conditioning, sport-specific programming | Tier 1 | Sport classification by metabolic and neuromuscular demands; strength/power/conditioning/speed as general qualities; periodization (off-season vs in-season); exercise selection for transfer and injury resilience. |
| **ACSM** — Guidelines, position stands | Tier 1 | Endurance vs resistance vs flexibility; sport-specific conditioning (aerobic, anaerobic); complementary training for athletes. |
| **ExRx.net** — Exercise directory, movement patterns | Tier 2 | Exercise classification by movement and muscles; supports mapping exercises to sport needs (e.g. pull strength for climbing, posterior chain for running). |
| **NCSF** — Program design, athletic performance | Tier 2 | Qualities (strength, power, speed, agility, endurance); sport-specific demands; exercise selection for carryover. |
| **Sport science / S&C literature** | Tier 1/2 | Endurance sports: conditioning + durability; court/field: speed-agility + power + conditioning; combat: power + conditioning + durability; climbing: power + durability + grip; strength sports: power + durability. |
| **Project** | Internal | 20250301000000–00008 (schema, seed), 20250310100000 (research-backed sport_quality_map and exercise–sport tags), DEVELOPMENT_PLAN_SPORT_EXERCISES.md, sportQualityWeights.ts, targetVector.ts. |

---

## 3. Classification of findings

### High-confidence rules (implemented)

- **Sport qualities (four used in map):** **speed_agility** (acceleration, change of direction, reaction); **power** (explosive strength, jumping, throwing); **conditioning** (work capacity, repeat efforts, aerobic/anaerobic); **durability_resilience** (injury resilience, load tolerance, recovery). **Transfer** omitted from sport_quality_map by design (handled via exercise selection and tags). **Implemented:** sport_qualities seed; sport_quality_map relevance 1=high, 2=medium, 3=low per sport (20250310100000).
- **Relevance scale:** 1 = primary quality for that sport; 2 = important; 3 = secondary/low. **Implemented:** sport_quality_map.relevance 1–3; generator and target vector use weights derived from these.
- **Sport categories:** Endurance, Strength/Power, Mountain/Snow/Board, Court/Field, Combat/Grappling, Water/Wind, Climbing. Align with NSCA/ACSM sport classification (metabolic and movement demands). **Implemented:** sports.category in 20250301000007.
- **Quality–sport mapping (examples):** Endurance (road/trail/ultra, triathlon, cycling, swimming): conditioning + durability high; power/speed lower. Court/field (soccer, basketball, tennis): speed_agility + power + conditioning. Combat (boxing, BJJ, wrestling, MMA): power + conditioning + durability. Climbing: power + durability; sport/lead also conditioning. **Implemented:** 20250310100000 sport_quality_map for all canonical sports.
- **Exercise–sport tagging:** Exercises linked to sport slugs (e.g. sport_road_running, sport_bjj) so recommendations can prefer exercises that support that sport. Evidence: same movement patterns and energy systems as sport demands; injury resilience (durability); transfer (e.g. posterior chain for running, grip for climbing). **Implemented:** exercise_tag_map / starter_exercises in 20250310100000; getPreferredExerciseNamesForSportAndGoals, target vector blend.

### Context-dependent heuristics (implemented)

- **Sub-focus (sport sub-goals):** Within a sport, user can select sub-focuses (e.g. finger strength for climbing, uphill endurance for backcountry). Tag slugs (zone2_cardio, single_leg_strength, etc.) map to exercises; SUB_FOCUS_TAG_MAP and sports_sub_focus extend quality-based ranking. **Implemented:** SPORTS_WITH_SUB_FOCUSES, sub_focus_tag_map; getExerciseTagsForSubFocuses, getPreferredExerciseNamesForSportAndGoals. **Evidence:** See docs/research/sport-sub-goals-audit-2025.md; DEVELOPMENT_PLAN_SPORT_EXERCISES.md.
- **Season phase:** user_sport_profiles.season_phase (off-season, in-season, etc.) can adjust emphasis (e.g. more strength off-season, more maintenance in-season); not yet wired to quality weights in audit scope.

### Speculative / deferred

- Formal periodization (phase-specific quality weights) — deferred to season_phase wiring.
- Sport-specific injury risk tags (e.g. “runner’s knee”) — partially covered by durability_resilience and existing contraindications.

---

## 4. Comparison to implementation

- **Before:** sport_mode_schema (sports, sport_qualities, sport_quality_map); initial seed with transfer; canonical sports list with categories and descriptions (20250301000007); exercise library expansion.
- **After (20250310100000):** sport_quality_map filled for all canonical sports with four qualities (no transfer); relevance 1–3; exercise–sport tagging (exercise_tag_map, starter_exercises) for sport-specific recommendations.
- **This audit:** (1) Research note ties qualities and mapping to NSCA, ACSM, ExRx, NCSF. (2) Table comments reference evidence doc. (3) No schema or data change; documentation only.

---

## 5. Generator / app use

- **Target vector:** getSportQualityWeights(sportSlug) returns quality weights; blended with goal weights (targetVector.ts) for session targeting.
- **Exercise ranking:** Exercise–sport tags and (where used) starter_exercises.tags + sub-focus tag map bias exercise selection when user has a sport (and optional sub-focus) selected.
- **Sport list:** Canonical sports from public.sports (category, description, popularity_tier) for UI and filters.

---

## 6. Validation

- Every sport in canonical list has sport_quality_map rows for speed_agility, power, conditioning, durability_resilience (relevance 1, 2, or 3).
- Exercise–sport links use tags of form sport_<slug>; only active exercises and active sports.
- Categories align with sport type (endurance, strength/power, court/field, combat, climbing, etc.).

---

## 7. References

- NSCA: Essentials of Strength & Conditioning (sport classification, qualities, periodization).
- ACSM: Guidelines (endurance, resistance, sport-specific conditioning).
- ExRx.net: Exercise directory (movement patterns, muscles).
- NCSF: Program design (qualities, athletic performance).
- Project: 20250301000000_sport_mode_schema.sql, 20250301000007_sports_canonical_seed.sql, 20250310100000_research_backed_sport_exercises.sql, DEVELOPMENT_PLAN_SPORT_EXERCISES.md, logic/workoutIntelligence/sportQualityWeights.ts, targetVector.ts, data/sportSubFocus/.
