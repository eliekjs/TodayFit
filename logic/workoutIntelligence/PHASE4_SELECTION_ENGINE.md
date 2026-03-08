# Phase 4: Exercise Selection + Scoring Engine

This document describes the **selection and scoring engine** that fills workout blocks with exercises. It builds on Phase 1–3 (training qualities, exercise intelligence, session architecture) and does **not** include final prescriptions, weekly planning, or UI.

---

## Data flow

1. **Input**: `WorkoutSelectionInput` (goals, sports, equipment, duration, energy, injuries, etc.) + resolved `SessionTemplateV2` + exercise pool.
2. **Resolve context**: Session and per-block desired qualities via `resolveSessionContext`.
3. **Create state**: `SessionSelectionState` (fatigue, pattern counts, used IDs, grip/shoulder/compound counts).
4. **For each block** (in order):
   - Resolve block qualities.
   - **Filter** candidates (equipment, movement, quality relevance, skill/energy, injury, block type).
   - **Score** candidates (quality alignment, stimulus fit, movement fit, fatigue fit, energy fit, injury fit, novelty, equipment, balance).
   - **Guardrails**: Skip if would violate movement balance or fatigue budget.
   - **Fill block**: Straight sets → take top N respecting caps. Superset/alternating → `assembleSupersetPairs`.
   - **Update state** (used IDs, fatigue, pattern counts, grip/shoulder/compound).
5. **Output**: `GeneratedWorkout` (blocks with exercise slots; prescriptions are placeholders).

---

## User context input

`WorkoutSelectionInput` in `scoring/scoreTypes.ts`:

- `primary_goal`, `secondary_goals`, `tertiary_goals`, `sports`
- `target_training_qualities` (optional override)
- `available_equipment`, `excluded_equipment`, `duration_minutes`, `energy_level`
- `injuries_or_limitations`, `preferred_session_type`, `preferred_stimulus_profile`
- `body_region_focus`, `avoid_movement_patterns`
- `recent_fatigue_state`, `recent_exercise_ids`, `recent_history`

Works for both Build My Workout (daily) and Adaptive/Sports Prep (weekly planner can pass the same shape).

---

## Candidate filtering

`selection/candidateFilters.ts`: one function per concern, composed in `filterCandidates`.

- **Equipment**: only exercises that use available equipment and none excluded.
- **Movement pattern**: exclude avoid patterns.
- **Quality relevance**: exercise has some overlap with block/session qualities.
- **Skill/energy**: low energy → exclude very high-skill.
- **Injury**: exclude by injury avoid tags and avoid exercise IDs.
- **Block type**: e.g. power block excludes high-fatigue/conditioning; main_strength excludes conditioning/mobility.
- **Body region**: optional focus (e.g. upper_push).

---

## Scoring framework

`scoring/exerciseScoring.ts`: `scoreExerciseForSelection`, `scoreAndRankCandidatesForSelection`.

Factors (weights in `scoring/scoringConfig.ts`):

- **Target quality alignment**: dot product with block desired qualities.
- **Stimulus fit**: power_speed prefers low-fatigue/power; max_strength prefers compounds; mobility_recovery prefers low cost.
- **Movement pattern fit**: bonus if exercise pattern is in block target patterns.
- **Fatigue fit**: penalty if adding would exceed session (or block) budget.
- **Energy fit**: bonus if exercise matches energy_fit; penalty for high-skill in low energy.
- **Injury fit**: strong penalty if conflicts with limitations.
- **Novelty**: penalty for recent use and for repeating same pattern.
- **Equipment fit**: small bonus for simple equipment.
- **Balance**: bonus from `balanceBonusForExercise` (missing categories, underrepresented).

---

## Target quality resolution

`scoring/qualityResolution.ts`:

- **Session**: from goals + sports via `mergeTargetVector`, or from `target_training_qualities` override.
- **Per-block**: merge session weights with block `quality_focus` (or block template `target_qualities`), boost block targets.

---

## Movement balance and anti-redundancy

- **Guardrails** (`scoring/movementBalanceGuardrails.ts`): `wouldViolateGuardrail` (pattern cap, grip cap, shoulder cap, heavy compound cap). `guardrailApproachPenalty` for soft demotion.
- **Redundancy** (`scoring/redundancy.ts`): penalty for same pattern at cap, for already-used ID, for recent use.

---

## Fatigue accumulation

`scoring/fatigueTracking.ts`:

- **State**: `accumulated_fatigue`, `session_fatigue_budget`, `block_fatigue_used`, pattern counts, grip/shoulder/heavy compound counts.
- **Contribution**: `exerciseFatigueContribution(ex)` from fatigue_cost (low/medium/high → 1/2/4).
- **Checks**: `wouldExceedSessionFatigue`, `wouldExceedBlockFatigue`.
- **Update**: `applyExerciseToState` after each selection.

---

## Superset pairing

`scoring/pairing.ts` + existing `supersetPairing.ts`:

- **Compatibility**: good (push+pull, lower+upper, etc.), bad (grip+grip, hinge+hinge), neutral.
- **Pairing score**: numeric from config (good bonus, bad penalty).
- **Assembly**: `assembleSupersetPairs` builds 2-exercise pairs from scored list, preferring good pairs, up to max_items.

---

## Block filling

`selection/blockFiller.ts`: `fillBlock`.

- Input: block spec, block index, pool, block qualities, user input, state, stimulus profile, config.
- Filter → score → if superset/alternating and max ≥ 2 → `assembleSupersetPairs`; else take top N respecting guardrails and fatigue.
- Update state; return `BlockSelectionResult` (exercises + `GeneratedBlock` + fatigue contribution).

---

## Session assembly

`selection/sessionAssembler.ts`: `assembleSession`.

- Resolve context (session + block qualities).
- Create selection state (fatigue budget from template + energy).
- For each block: `fillBlock`; append generated block.
- Return `GeneratedWorkout` (id, session_type, stimulus_profile, title, blocks, duration_minutes, fatigue_budget, meta).

---

## Configurability

`scoring/scoringConfig.ts`: `DEFAULT_SELECTION_CONFIG` and `FATIGUE_COST_TO_NUMBER`.

Tunable:

- Score weights (target_quality_alignment, stimulus_fit, movement_pattern_fit, fatigue_fit, energy_fit, injury_fit, novelty_penalty, equipment_fit, balance_bonus).
- `max_same_pattern_per_session`, `redundancy_penalty`, `low_energy_high_skill_penalty`.
- `max_grip_exercises_per_session`, `max_shoulder_exercises_per_session`, `max_heavy_compounds_per_session`.
- `pairing_good_bonus`, `pairing_bad_penalty`.

---

## File organization

```
logic/workoutIntelligence/
  scoring/
    scoreTypes.ts           # WorkoutSelectionInput, DesiredQualityProfile, ScoreBreakdown, SessionSelectionState, etc.
    scoringConfig.ts        # DEFAULT_SELECTION_CONFIG, FATIGUE_COST_TO_NUMBER
    qualityResolution.ts    # resolveSessionQualities, resolveBlockQualities, resolveSessionContext
    exerciseScoring.ts      # scoreExerciseForSelection, scoreAndRankCandidatesForSelection
    pairing.ts              # pairingScore, assembleSupersetPairs
    redundancy.ts           # noveltyScore, redundancy penalties
    fatigueTracking.ts      # createSessionSelectionState, exerciseFatigueContribution, applyExerciseToState
    movementBalanceGuardrails.ts  # wouldViolateGuardrail, guardrailApproachPenalty
  selection/
    candidateFilters.ts    # filterEquipment, filterMovementPattern, ... filterCandidates
    blockFiller.ts         # fillBlock
    sessionAssembler.ts    # assembleSession
```

---

## Assumptions and fallbacks

- **Missing metadata**: Missing `training_quality_weights`, `fatigue_cost`, or `skill_level` use safe defaults (e.g. medium fatigue, no bonus/penalty).
- **Empty block**: If no candidates pass filters or all violate guardrails, the block returns 0 exercises (caller can handle empty blocks).
- **Template**: Uses Phase 3 `SessionTemplateV2` and block specs; fatigue budget from template, optionally adjusted by energy in `sessionShaping`.
- **Backward compatibility**: Existing `scoreExercise` (pipeline) and `buildPipelineContext` remain; Phase 4 adds the new scoring and assembly path.
