/**
 * Exercise library curation — canonical enums (phase 1 schema).
 * Isolated from production generator types; used by audits and future pipeline steps.
 */

export const EXERCISE_LIBRARY_CURATION_SCHEMA_VERSION = 1 as const;

/** High-level training role for transfer-focused library design. */
export type CurationPrimaryRole =
  | "compound_strength"
  | "accessory_strength"
  | "unilateral_strength"
  | "power_explosive"
  | "conditioning"
  | "mobility"
  | "stability_core"
  | "injury_prevention";

/** Movement pattern tags for curation (may overlap generator ontology; kept separate for library design). */
export type CurationMovementPattern =
  | "squat"
  | "hinge"
  | "lunge"
  | "horizontal_push"
  | "vertical_push"
  | "horizontal_pull"
  | "vertical_pull"
  | "rotation"
  | "anti_rotation"
  | "carry"
  | "locomotion"
  | "isometric";

export type CurationEquipmentClass =
  | "barbell"
  | "dumbbell"
  | "kettlebell"
  | "cable"
  | "machine"
  | "bodyweight"
  | "band"
  | "mixed"
  | "cardio_machine"
  | "specialty";

export type CurationComplexity = "beginner_friendly" | "intermediate" | "advanced";

/** Library maintenance / dedup stance. */
export type CurationKeepCategory = "core" | "niche" | "merge_candidate" | "remove_candidate" | "review";

/** Generator eligibility after curation (does not change production behavior until wired). */
export type CurationGeneratorState =
  | "core_eligible"
  | "niche_eligible"
  | "review_hold"
  | "merged_hold"
  | "removed_hold";

/** Optional cross-sport transfer hints for library design (prefill / review). */
export type CurationSportTransferTag =
  | "climbing"
  | "skiing"
  | "running"
  | "general_athletic"
  | "rehab_friendly";
