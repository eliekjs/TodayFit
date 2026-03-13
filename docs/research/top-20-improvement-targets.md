# Top 20 autonomous improvement targets

Ranked by **product impact**, **exercise-science leverage**, **implementation safety**, **testability**, and **dependency on database enrichment**. Use this to pick the next narrow subsystem for the workout-logic-research-integration agent or to prioritize DB enrichment for the exercise-db-enrichment agent.

**Scoring (1–5):** Impact, Science, Safety, Testability, DB-dep (1 = low dependency on DB enrichment, 5 = high). **Composite** = weighted (Impact + Science + Safety + Testability − 0.5×DB-dep) to favor high impact/science/safety/testability and slightly favor targets that can proceed with current or minimal DB work.

---

## 1. Superset pairing: grip + grip and pairing_category coverage

**Subsystem:** Superset pairing (`logic/workoutIntelligence/supersetPairing.ts`).  
**What:** Enforce “no double grip” and improve pairing_category / fatigue_regions usage; evidence for non-competing pairs (push/pull, different fatigue regions).

| Impact | Science | Safety | Testability | DB-dep | Composite |
|--------|---------|--------|-------------|--------|-----------|
| 5      | 5       | 4      | 5           | 3      | 21.5      |

**Why:** Directly affects workout quality; strong evidence (NSCA, programming guidelines). Logic already uses pairing_category and fatigue_regions; gaps are coverage and edge cases. **DB:** Backfill pairing_category and fatigue_regions where missing.

---

## 2. Movement balance: hinge cap and same-pattern caps

**Subsystem:** Movement balance / guardrails (`movementBalanceGuardrails.ts`, `lib/generation/movementBalance.ts`, dailyGenerator scoring).  
**What:** Evidence-based caps on hinge, squat, grip, shoulder-dominant exercises per session; align constants with literature.

| Impact | Science | Safety | Testability | DB-dep | Composite |
|--------|---------|--------|-------------|--------|-----------|
| 5      | 5       | 4      | 5           | 1      | 22.5      |

**Why:** Prevents junk volume and overuse; well-established. Mostly config and scoring. **DB:** Low; uses existing movement_pattern and quality weights.

---

## 3. Prescription: rep ranges and rest for hypertrophy vs strength

**Subsystem:** Prescription (`prescriptionResolver`, `setRepResolver`, `lib/generation/prescriptionRules.ts`).  
**What:** Align sets/reps/rest with ACSM/NSCA guidelines (e.g. hypertrophy 6–12, strength 3–6, rest 60–90s vs 2–5 min).

| Impact | Science | Safety | Testability | DB-dep | Composite |
|--------|---------|--------|-------------|--------|-----------|
| 5      | 5       | 5      | 5           | 1      | 23        |

**Why:** Core product value; very strong evidence. Pure logic; easy to unit test. **DB:** Minimal.

---

## 4. Injury exclusion: joint_stress and contraindication consistency

**Subsystem:** Constraints and filtering (`resolveWorkoutConstraints`, `getInjuryAvoidTags`, `candidateFilters`).  
**What:** Canonical joint_stress_tags and contraindication_tags; consistent mapping injury keys → exclusions; optional soft caution.

| Impact | Science | Safety | Testability | DB-dep | Composite |
|--------|---------|--------|-------------|--------|-----------|
| 5      | 4       | 5      | 4           | 3      | 20.5      |

**Why:** Safety-critical. Evidence on exercise contraindications exists. **DB:** Enrich joint_stress_tags and contraindication_tags on exercises.

---

## 5. Cooldown selection: mobility_targets and stretch_targets

**Subsystem:** Cooldown block (`cooldownSelection.ts`, dailyGenerator `buildCooldown`).  
**What:** Prefer exercises that match session focus (e.g. lower-body day → hamstring/hip stretch); use mobility_targets and stretch_targets when present.

| Impact | Science | Safety | Testability | DB-dep | Composite |
|--------|---------|--------|-------------|--------|-----------|
| 4      | 4       | 5      | 4           | 4      | 18        |

**Why:** Improves cooldown relevance; moderate evidence. **DB:** Enrich mobility_targets and stretch_targets.

---

## 6. Warmup selection: exercise_role and prep relevance

**Subsystem:** Warmup block (dailyGenerator `buildWarmup`).  
**What:** Prefer exercises with exercise_role warmup/prep; align warmup length and content with main work (activation, not fatigue).

| Impact | Science | Safety | Testability | DB-dep | Composite |
|--------|---------|--------|-------------|--------|-----------|
| 4      | 4       | 5      | 4           | 4      | 18        |

**Why:** Better session structure; RAMP and activation evidence. **DB:** Enrich exercise_role (warmup/prep).

---

## 7. Body-part strictness: hard_include and primary_movement_family

**Subsystem:** Constraints (`resolveWorkoutConstraints` hard_include), eligibilityHelpers, dailyGenerator body filter.  
**What:** Strict “Upper Push only” etc. using primary_movement_family (and secondary when needed); fallback derivation consistent.

| Impact | Science | Safety | Testability | DB-dep | Composite |
|--------|---------|--------|-------------|--------|-----------|
| 5      | 3       | 4      | 5           | 4      | 19        |

**Why:** User expectation; logic exists, coverage and edge cases. **DB:** Backfill primary_movement_family.

---

## 8. Duration scaling: block count and exercise count

**Subsystem:** Session structure and prescription (`durationScaling`, session templates, build* counts).  
**What:** Evidence-based scaling: shorter sessions = fewer blocks/exercises, not only shorter rest; minimum effective volume per goal.

| Impact | Science | Safety | Testability | DB-dep | Composite |
|--------|---------|--------|-------------|--------|-----------|
| 5      | 4       | 5      | 5           | 1      | 22        |

**Why:** UX and sustainability. **DB:** None.

---

## 9. Weekly day intent and naming

**Subsystem:** Weekly planning (`weeklyPlanner`, `weeklyRationale`, day titles).  
**What:** Clear day labels (e.g. “Lower strength”, “Pull + mobility”) and rationale text aligned with session_type and stimulus_profile.

| Impact | Science | Safety | Testability | DB-dep | Composite |
|--------|---------|--------|-------------|--------|-----------|
| 4      | 2       | 5      | 4           | 1      | 18.5      |

**Why:** Clarity for users; low risk. **DB:** Minimal.

---

## 10. Fatigue awareness: fatigue_regions and back-to-back days

**Subsystem:** Fatigue (`fatigueRules`, `fatigueTracking`), weekly load balancing.  
**What:** Penalize or avoid same fatigue_region on consecutive days; use fatigue_regions when present.

| Impact | Science | Safety | Testability | DB-dep | Composite |
|--------|---------|--------|-------------|--------|-----------|
| 4      | 4       | 4      | 4           | 4      | 18        |

**Why:** Recovery and adherence. **DB:** Enrich fatigue_regions.

---

## 11. Goal–modality alignment: strength vs hypertrophy vs conditioning blocks

**Subsystem:** Block type choice and template selection (sessionTemplates, dailyGenerator build*).  
**What:** Ensure block types and formats match primary goal (e.g. strength → main_strength straight sets; hypertrophy → supersets).

| Impact | Science | Safety | Testability | DB-dep | Composite |
|--------|---------|--------|-------------|--------|-----------|
| 5      | 5       | 4      | 5           | 1      | 22.5      |

**Why:** Core programming quality. **DB:** Low.

---

## 12. Conditioning block: modality and duration by goal

**Subsystem:** Conditioning block (dailyGenerator, getConditioningDurationMinutes).  
**What:** Zone 2 vs HIIT by goal; duration and equipment (rower, bike, etc.) from preferences.

| Impact | Science | Safety | Testability | DB-dep | Composite |
|--------|---------|--------|-------------|--------|-----------|
| 4      | 4       | 4      | 4           | 2      | 19        |

**Why:** Goal fidelity. **DB:** Optional sport_tags / energy_fit.

---

## 13. Variety and novelty: recent-use penalty and rotation

**Subsystem:** Scoring (dailyGenerator scoreExercise, historyScoring).  
**What:** Evidence-based decay for “last N sessions” and pattern rotation; avoid overuse of same exercise.

| Impact | Science | Safety | Testability | DB-dep | Composite |
|--------|---------|--------|-------------|--------|-----------|
| 4      | 3       | 5      | 5           | 1      | 20.5      |

**Why:** Adherence and stimulus. **DB:** Low.

---

## 14. Required blocks: cooldown mobility minimum

**Subsystem:** Constraints (required_finishers), cooldown build.  
**What:** Enforce “at least N mobility/stretch” when secondary goal is mobility or required_finishers rule; match targets to session.

| Impact | Science | Safety | Testability | DB-dep | Composite |
|--------|---------|--------|-------------|--------|-----------|
| 4      | 4       | 5      | 4           | 3      | 19.5      |

**Why:** Filter fidelity. **DB:** mobility_targets, stretch_targets.

---

## 15. Sport-specific quality weights and scoring

**Subsystem:** goalQualityWeights, sportQualityWeights, target vector merge, scoring.  
**What:** Align sport slugs (e.g. climbing) with qualities (grip, pulling, scapular) and ensure they affect exercise selection.

| Impact | Science | Safety | Testability | DB-dep | Composite |
|--------|---------|--------|-------------|--------|-----------|
| 5      | 4       | 3      | 4           | 3      | 19.5      |

**Why:** Differentiator for sport prep. **DB:** sport_tags, exercise_training_quality.

---

## 16. Progressions and regressions: substitution and scaling

**Subsystem:** exerciseSubstitution, progressions/regressions in types.  
**What:** When an exercise is excluded (injury, equipment), prefer progression/regression links; evidence for scaling.

| Impact | Science | Safety | Testability | DB-dep | Composite |
|--------|---------|--------|-------------|--------|-----------|
| 4      | 3       | 4      | 4           | 5      | 16        |

**Why:** UX and inclusivity. **DB:** Enrich progressions/regressions.

---

## 17. Equipment filter: strict availability and alternatives

**Subsystem:** Filtering (filterByHardConstraints, candidateFilters).  
**What:** Hard exclude missing equipment; optional “suggest alternative” when one piece is missing.

| Impact | Science | Safety | Testability | DB-dep | Composite |
|--------|---------|--------|-------------|--------|-----------|
| 5      | 2       | 5      | 5           | 2      | 20        |

**Why:** User trust. **DB:** Equipment already on exercises.

---

## 18. Power and velocity: prescription and block placement

**Subsystem:** Prescription and block type (power goal, skill block).  
**What:** Low reps, high intent, adequate rest; power work before fatigue; optional velocity/quality cue.

| Impact | Science | Safety | Testability | DB-dep | Composite |
|--------|---------|--------|-------------|--------|-----------|
| 4      | 5       | 4      | 4           | 2      | 20        |

**Why:** Goal fidelity for power. **DB:** Low.

---

## 19. Ontology scoring: alignment with target vector

**Subsystem:** ontologyScoring, scoreExercise, target vector merge.  
**What:** Improve alignment formula (e.g. normalization, quality weights) and ensure ontology fields (movement_patterns, primary_movement_family) contribute.

| Impact | Science | Safety | Testability | DB-dep | Composite |
|--------|---------|--------|-------------|--------|-----------|
| 5      | 4       | 4      | 5           | 3      | 20.5      |

**Why:** Core selection quality. **DB:** training_quality_weights, ontology backfill.

---

## 20. Validation: post-assembly constraint check

**Subsystem:** validateWorkoutAgainstConstraints, dailyGenerator output.  
**What:** Run workoutIntelligence validation after dailyGenerator assembly; fail or fix when hard_include/hard_exclude/required_finishers violated.

| Impact | Science | Safety | Testability | DB-dep | Composite |
|--------|---------|--------|-------------|--------|-----------|
| 4      | 2       | 5      | 5           | 1      | 19.5      |

**Why:** Catches regressions; already partially wired. **DB:** None.

---

## Summary table (by composite)

| Rank | Target | Composite | DB-dep |
|------|--------|-----------|--------|
| 1    | Prescription: rep ranges and rest (hypertrophy vs strength) | 23 | 1 |
| 2    | Movement balance: hinge cap and same-pattern caps | 22.5 | 1 |
| 3    | Goal–modality alignment (block types) | 22.5 | 1 |
| 4    | Duration scaling | 22 | 1 |
| 5    | Superset pairing (grip, pairing_category) | 21.5 | 3 |
| 6    | Injury exclusion consistency | 20.5 | 3 |
| 7    | Variety and novelty | 20.5 | 1 |
| 8    | Ontology scoring alignment | 20.5 | 3 |
| 9    | Equipment filter | 20 | 2 |
| 10   | Power and velocity prescription | 20 | 2 |
| 11   | Body-part strictness (hard_include) | 19 | 4 |
| 12   | Conditioning block modality/duration | 19 | 2 |
| 13   | Required blocks (cooldown mobility min) | 19.5 | 3 |
| 14   | Sport-specific quality weights | 19.5 | 3 |
| 15   | Validation post-assembly | 19.5 | 1 |
| 16   | Weekly day intent and naming | 18.5 | 1 |
| 17   | Cooldown selection (mobility/stretch targets) | 18 | 4 |
| 18   | Warmup selection (exercise_role) | 18 | 4 |
| 19   | Fatigue awareness (fatigue_regions) | 18 | 4 |
| 20   | Progressions/regressions substitution | 16 | 5 |

**Suggested order for logic agent (minimizing DB dependency first):** 1 → 2 → 3 → 4 → 9 → 13 → 15 → 20 (validation) → 17 → 18 → 5 → 6 → 7 → 4 (injury) → 10 → …  

**Suggested order for DB enrichment agent:** pairing_category + fatigue_regions → joint_stress_tags + contraindication_tags → mobility_targets + stretch_targets → exercise_role (warmup/prep) → primary_movement_family → progressions/regressions → sport_tags.
