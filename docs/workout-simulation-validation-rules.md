# Workout Simulation Validation Rules

This file defines how we judge generated workout quality for both:
- sport-mode simulations
- regular goal-oriented simulations

## Purpose

- Validate that user inputs and filters actually transfer into generated workouts.
- Validate structure fit to goal and sub-goal intent.
- Validate weighted alignment: higher-priority goals/sub-goals get proportionally more workout coverage.
- Produce a short summary statement per simulation for fast human review.

## Input-Transfer Validation (filters -> workout)

Every simulation review must explicitly score transfer for each selected filter.

Required checks:

1. `filter_transfer_equipment`
   - Every selected exercise is compatible with available equipment.
2. `filter_transfer_injuries_constraints`
   - No exercise violates injury/contraindication constraints.
3. `filter_transfer_body_focus`
   - Main blocks reflect selected body focus.
4. `filter_transfer_energy`
   - Session intensity/modality mix matches energy selection.
5. `filter_transfer_duration`
   - Estimated duration remains within allowed tolerance.
6. `filter_transfer_user_level`
   - Complexity/exercise tier matches user level.
7. `filter_transfer_style_prefs`
   - Style preferences (supersets, creative variations, preferred cardio modality) are honored when selected.
8. `filter_transfer_sport_or_goal_context`
   - Sport transfer checks pass for sport mode; goal intent checks pass for non-sport mode.

Any failed transfer check must be listed in the summary.

## Goal/Sub-Goal Structure Validation

Sub-goals are the primary semantic target when present.

Rule:
- If sub-goals exist, evaluation is done against sub-goals first.
- Parent goals are fallback labels only for uncovered blocks/items.

Required structure checks:

1. `structure_matches_primary_intent`
   - Main blocks are clearly tied to primary sub-goal/goal intent.
2. `structure_includes_secondary_intent`
   - Secondary intent appears in dedicated block(s) or meaningful item share.
3. `structure_block_order_quality`
   - Block order follows sensible training flow (main work before high-fatigue conditioning; cooldown/mobility at end where expected).
4. `structure_minimum_density`
   - Session has adequate block/item density to be practically useful.
5. `structure_sport_specificity` (sport mode only)
   - Sport pattern transfer coverage and violation checks pass.

## Goal/Sub-Goal Tagging Requirement

Each generated block and each exercise must be tagged for validation with:
- `assigned_sub_goal` (preferred; required when sub-goals exist)
- `assigned_goal` (fallback when no sub-goal is available)
- `assignment_confidence` (0-1 recommended)

Validation policy:
- Sub-goal tags replace goal tags for coverage/accounting when sub-goals are present.
- Untagged items count as alignment failures unless explicitly marked as neutral support (warmup/cooldown).
- A workout cannot receive `high` quality if more than 10% of non-warmup/cooldown items are untagged.

## Weighted Alignment Validation (priority -> workout share)

Goal/sub-goal weighting must map to workout share.

Definitions:
- `target_weight`: normalized priority from selected goals/sub-goals.
- `actual_share`: observed share of workout assigned to that target.
  - Prefer time-based share; fallback to item-count share.

Required checks:

1. `weighted_alignment_primary`
   - Primary sub-goal/goal has the largest actual share.
2. `weighted_alignment_order`
   - Actual share ordering matches target weight ordering.
3. `weighted_alignment_tolerance`
   - Absolute difference `|actual_share - target_weight|` is within tolerance (default 0.15 per target).
4. `weighted_alignment_minimum_presence`
   - Any target with weight >= 0.20 must have non-trivial presence (default >= 0.10 actual share).

If these checks fail, the summary must include:
- expected weights
- actual shares
- mismatch explanation

## Scoring Framework (0-100)

Use weighted pass/fail scoring:

- `hard_constraints` (20)
- `filter_transfer_*` bundle (25)
- `goal_sub_goal_tagging` (15)
- `structure_*` bundle (20)
- `weighted_alignment_*` bundle (20)

Banding:
- `high`: 85-100
- `medium`: 65-84
- `low`: 0-64

Guardrail:
- Any hard constraint failure caps score at `64` (`low`).

## Summary Statement Template (required per simulation)

Use this format:

`Simulation result: <HIGH|MEDIUM|LOW> quality (<score>/100). Transfer checks: <pass/fail summary>. Structure checks: <pass/fail summary>. Weighted alignment: <pass/fail summary with expected vs actual>. Key failures: <ids>.`

## Manual Review Checklist

- Do the assigned sub-goal tags on blocks/exercises look correct?
- Does primary intent visibly dominate the session as expected?
- Are secondary intents present in the right amount (not zero, not overpowering)?
- Do any exercises look mis-assigned to the wrong intent bucket?
- Does the workout still make coaching sense after strict weighting checks?

## Latest Single-Simulation Review

- Status: `pending refresh after new tagging + weighted checks are wired into simulation script`
- Reviewer decision: `pending`
- Rule change notes:
  - `pending`
