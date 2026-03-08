# Phase 3: Workout Session Architecture

This document describes the **session architecture** layer: stimulus profiles, session types, block templates, prescription styles, fatigue budgeting, and duration/energy shaping. No exercise scoring or full generator logic—this phase only defines the structure that later phases will use.

---

## A. Stimulus Profile System

**Purpose:** Classify each session by **intended adaptation** (what type of training effect), not just body part or sport.

**Slugs:** `max_strength`, `hypertrophy_accumulation`, `power_speed`, `muscular_endurance`, `aerobic_base`, `anaerobic_conditioning`, `sport_support_strength`, `resilience_stability`, `mobility_recovery`, `mixed_performance`.

Each profile defines:
- **Adaptation target** — e.g. peak force, muscle size, explosiveness
- **Expected fatigue** — low / moderate / high
- **Exercise style** — e.g. low exercise count + compound priority (max_strength), supersets (hypertrophy)
- **Prescription style** — e.g. heavy_strength, moderate_hypertrophy
- **Appropriate block sequence** — ordered list of block types (warmup → main_strength → accessory → cooldown, etc.)

**File:** `stimulusProfiles.ts`

---

## B. Session Type Model

**Session type** = general identity of the session (what is being trained).  
**Stimulus profile** = intended training effect (how / what adaptation).

**Session type slugs:** `full_body_strength`, `upper_hypertrophy`, `lower_hypertrophy`, `pull_strength`, `push_strength`, `lower_power`, `mixed_sport_support`, `conditioning_only`, `resilience_recovery`, `core_and_mobility`, `aerobic_builder`.

Each session type has:
- **default_stimulus_profile** — e.g. `full_body_strength` → `max_strength`
- **valid_stimulus_profiles** — allowed overrides (e.g. full_body_strength can also be hypertrophy_accumulation)

**File:** `sessionTypes.ts`

---

## C. Workout Block Model

**Block types:** `warmup`, `prep`, `skill`, `power`, `main_strength`, `main_hypertrophy`, `accessory`, `conditioning`, `core`, `carry`, `cooldown`, `mobility`, `recovery`.

**Formats:** `straight_sets`, `superset`, `alternating_sets`, `circuit`, `emom`, `amrap`, `interval`, `flow`.

**WorkoutBlockTemplate** (per block) includes:
- block_type, format, title, purpose
- target_qualities, target_movement_patterns
- exercise_count_min / max
- fatigue_budget_share (contribution to session total)
- prescription_style

**Block rules by stimulus:** The block sequence for each stimulus is defined in `STIMULUS_PROFILES[slug].appropriate_block_sequence`. Block templates (defaults per block type) live in `blockTemplates.ts`; `blockSpecsFromStimulus(stimulus)` returns `BlockSpec[]`.

**File:** `blockTemplates.ts`, types in `types.ts`

---

## D. Prescription Style Framework

Template-level defaults only (no exercise-level logic yet).

**Slugs:** `heavy_strength`, `moderate_hypertrophy`, `explosive_power`, `density_accessory`, `aerobic_steady`, `anaerobic_intervals`, `controlled_resilience`, `mobility_flow`.

Each style specifies: rep_range_min/max, set_range_min/max, rest_seconds_min/max (optional), intent_guidance, rpe_target (optional).

**File:** `prescriptionStyles.ts`

---

## E. Session Fatigue Budget (MVP)

- **Level:** `low` | `moderate` | `high` (maps to numeric 6 / 12 / 18 for later use).
- **Numeric option:** `{ kind: "numeric", value: number }` for explicit budget.

Stimulus profile drives default level; **energy level** adjusts it (e.g. low energy → cap at moderate). No weekly accumulation in this phase.

**File:** `sessionShaping.ts` — `getFatigueBudgetForStimulus(stimulus, energyLevel)`, `getNumericFatigueBudget(budget)`

---

## F. Duration and Energy Adaptation

**Duration tiers:** 20, 30, 45, 60, 75 minutes.

- **Blocks:** Max blocks per tier (e.g. 20 min → 3 blocks).
- **Exercises:** Max total exercises per duration; block specs can be trimmed via `shapeBlockSpecsForDuration()`.
- **Conditioning/accessory:** Allowed only for 45+ min (`canAddConditioningOrAccessory()`).
- **Supersets:** Prefer for efficiency when duration ≤ 45 min.

**Energy level:** low / medium / high.

- **Low:** Lower fatigue budget scale, prefer lower-skill options, avoid high density/neural work.
- **High:** Allow extra volume; no reduction.

**File:** `sessionShaping.ts`

---

## G. Weekly Planning Compatibility

Session types and stimulus profiles are **reusable at the weekly level**. Example week:

- Day 1: lower_power (power_speed)
- Day 2: pull_hypertrophy (hypertrophy_accumulation)
- Day 3: aerobic_builder (aerobic_base)
- Day 4: mixed_sport_support (sport_support_strength)
- Day 5: resilience_recovery (mobility_recovery)

The same `SessionTemplateV2` and block architecture apply; the generator (later phase) will receive per-day session_type + stimulus_profile + duration + energy.

---

## H. TypeScript Interfaces (summary)

- **StimulusProfile** — slug, name, adaptation_target, expected_fatigue, exercise_style, prescription_style_primary, appropriate_block_sequence, format_hints
- **SessionType** — slug, name, default_stimulus_profile, valid_stimulus_profiles
- **WorkoutBlockTemplate** — block_type, format, title, purpose, target_qualities, target_movement_patterns, exercise_count_min/max, fatigue_budget_share, prescription_style
- **PrescriptionStyle** — slug, name, rep/set/rest ranges, intent_guidance, rpe_target
- **SessionTemplateV2** — id, session_type, stimulus_profile, block_specs, duration_minutes_min/max, fatigue_budget, prescription_styles_by_block
- **GeneratedWorkout** (skeleton) — id, session_type, stimulus_profile, title, blocks (GeneratedBlock[]), duration_minutes, fatigue_budget, meta

**Files:** `types.ts`, `workoutTypes.ts`

---

## I. Example Session Templates (V2)

| Template ID                         | Session type          | Stimulus profile      | Duration  | Fatigue |
|------------------------------------|-----------------------|------------------------|-----------|---------|
| full_body_strength_max_strength    | full_body_strength    | max_strength           | 45–75 min | high    |
| upper_hypertrophy_accumulation      | upper_hypertrophy     | hypertrophy_accumulation | 45–60 min | high  |
| lower_power_speed                   | lower_power           | power_speed            | 30–50 min | low     |
| mixed_sport_support_strength       | mixed_sport_support   | sport_support_strength | 45–65 min | moderate |
| aerobic_builder_base                | aerobic_builder       | aerobic_base           | 30–60 min | moderate |
| resilience_recovery_mobility        | resilience_recovery   | mobility_recovery      | 20–45 min | low     |

**File:** `sessionTemplatesV2.ts`

---

## J. File Organization

```
logic/workoutIntelligence/
├── trainingQualities.ts      # Phase 1: quality taxonomy
├── stimulusProfiles.ts        # Phase 3: stimulus taxonomy + block sequences
├── prescriptionStyles.ts     # Phase 3: prescription style defaults
├── sessionTypes.ts            # Phase 3: session type ↔ stimulus relationship
├── blockTemplates.ts          # Phase 3: block template defaults + blockSpecsFromStimulus
├── sessionShaping.ts          # Phase 3: duration tiers, fatigue budget, energy adaptation
├── sessionTemplates.ts        # Legacy templates (goal + duration)
├── sessionTemplatesV2.ts      # Phase 3: SessionTemplateV2 examples
├── workoutTypes.ts           # Phase 3: GeneratedWorkout skeleton
├── types.ts                  # Shared types (BlockSpec, StimulusProfile, etc.)
├── ...
```

Training-related primitives (qualities, stimulus, prescription) and session-structure primitives (session type, blocks, templates) live in the same module for cohesion; subfolders can be introduced later if the module grows.

---

## Summary

Phase 3 defines **how workouts are structured** before exercises are chosen: stimulus profile → session type → block sequence → block specs (shaped by duration and energy). Prescription styles and fatigue budget are session/block-level only. The **GeneratedWorkout** skeleton and **SessionTemplateV2** are ready for the next phase (exercise scoring and generator integration).
