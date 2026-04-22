/**
 * Optional columns on `public.exercises` populated by curation pipeline sync (see mergeCurationArtifacts).
 */

export type ExerciseCurationDbColumns = {
  curation_primary_role?: string | null;
  curation_equipment_class?: string | null;
  curation_complexity?: string | null;
  curation_keep_category?: string | null;
  curation_generator_eligibility_state?: string | null;
  curation_canonical_exercise_id?: string | null;
  curation_cluster_id?: string | null;
  curation_sport_transfer_tags?: string[] | null;
  curation_movement_patterns?: string[] | null;
  curation_llm_confidence?: number | null;
  curation_pruning_recommendation?: string | null;
  curation_updated_at?: string | null;
  curation_is_canonical?: boolean | null;
  curation_merge_target_exercise_id?: string | null;
  curation_review_notes?: Record<string, unknown> | null;
  curation_reason_codes?: string[] | null;
};
