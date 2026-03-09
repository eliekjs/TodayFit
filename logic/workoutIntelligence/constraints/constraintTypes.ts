/**
 * Filter-to-workout rules engine — constraint and rule types.
 * Used by resolveWorkoutConstraints and by filtering/validation.
 * MovementFamily and JointStressTag are canonical from lib/ontology.
 */

import type { BlockType } from "../types";
import type { MovementFamily, JointStressTag } from "../../../lib/ontology";

export type { MovementFamily, JointStressTag };

/** Severity for injury/restriction: hard exclude vs soft caution. */
export type RestrictionSeverity = "hard" | "soft";

/** Hard exclude: exercise must not appear (by id or by joint_stress/contraindication match). */
export interface HardExcludeRule {
  kind: "hard_exclude";
  /** Exercise IDs to exclude. */
  exercise_ids?: string[];
  /** Joint stress tags that disqualify an exercise when user has matching restriction. */
  joint_stress_tags?: string[];
  /** Contraindication keys (e.g. shoulder, knee) that match exercise contraindications. */
  contraindication_keys?: string[];
}

/** Soft caution: prefer to avoid; reduces score but does not remove. */
export interface SoftCautionRule {
  kind: "soft_caution";
  joint_stress_tags?: string[];
  contraindication_keys?: string[];
  /** Score penalty when matched. */
  score_penalty?: number;
}

/** Hard include: working exercises (main/accessory) must belong to one of these movement families. */
export interface HardIncludeRule {
  kind: "hard_include";
  /** Only exercises whose primary (or secondary) movement family is in this set. */
  movement_families: MovementFamily[];
  /** Block types this applies to (default: main_strength, main_hypertrophy, accessory, power). */
  block_types?: BlockType[];
}

/** Preferred: boost score when exercise matches. */
export interface PreferredRule {
  kind: "preferred";
  /** Training quality slugs to prefer. */
  quality_slugs?: string[];
  /** Movement patterns to prefer. */
  movement_patterns?: string[];
  modality?: string;
}

/** Session must include a block of this type (e.g. cooldown with mobility). */
export interface RequiredBlockRule {
  kind: "required_block";
  block_type: BlockType;
  /** Optional: block must contain mobility/stretch when true. */
  must_include_mobility_or_stretch?: boolean;
}

/** At least one block of given type must exist (e.g. mobility or recovery in cooldown). */
export interface RequiredBlockTypeRule {
  kind: "required_block_type";
  block_types: BlockType[];
  /** Minimum count. */
  min_count?: number;
}

/** Cooldown (or specific block) must include N mobility/stretch exercises. */
export interface RequiredFinishersRule {
  kind: "required_finishers";
  /** Minimum number of mobility/stretch exercises in cooldown. */
  min_mobility_or_stretch_exercises: number;
  block_type?: BlockType;
}

/** Allowed movement-family pairs for supersets (e.g. ["upper_push", "upper_push"] for chest+triceps). */
export type SupersetPairingRule = {
  kind: "superset_pairing_rules";
  /** Pairs that are allowed and preferred. */
  preferred_pairs?: [MovementFamily | string, MovementFamily | string][];
  /** Pairs that are forbidden (e.g. grip + grip). */
  forbidden_pairs?: [string, string][];
  /** Movement patterns: forbidden to pair same (e.g. hinge+hinge). */
  forbidden_same_pattern?: boolean;
  /** Forbid pairing when both exercises have high grip demand. */
  forbid_double_grip?: boolean;
};

/** How to distribute volume across movement families in a session. */
export interface MovementDistributionRule {
  kind: "movement_distribution_rules";
  /** Families that must be represented. */
  families: MovementFamily[];
  /** Optional: prefer rotating emphasis (e.g. chest, then shoulders, then triceps). */
  rotation_hint?: MovementFamily[];
}

export type WorkoutConstraint =
  | HardExcludeRule
  | SoftCautionRule
  | HardIncludeRule
  | PreferredRule
  | RequiredBlockRule
  | RequiredBlockTypeRule
  | RequiredFinishersRule
  | SupersetPairingRule
  | MovementDistributionRule;

/** Resolved constraints for a single session (output of resolveWorkoutConstraints). */
export interface ResolvedWorkoutConstraints {
  /** Ordered by precedence: injuries, equipment, body-part, primary goal, secondary goal, preferences. */
  rules: WorkoutConstraint[];
  /** Quick lookup: all exercise IDs that are hard-excluded. */
  excluded_exercise_ids: Set<string>;
  /** Quick lookup: all joint_stress tags to exclude when any injury matches (canonical slugs). */
  excluded_joint_stress_tags: Set<string>;
  /** Quick lookup: contraindication keys (body regions) to exclude when user has matching injury (e.g. shoulder, knee). */
  excluded_contraindication_keys: Set<string>;
  /** When body-part is strict: only these movement families allowed for working blocks. */
  allowed_movement_families: MovementFamily[] | null;
  /** Secondary goal mobility: min mobility/stretch exercises in cooldown. */
  min_cooldown_mobility_exercises: number;
  /** Superset pairing rules (forbidden pairs, preferred pairs). */
  superset_pairing: SupersetPairingRule | null;
}
