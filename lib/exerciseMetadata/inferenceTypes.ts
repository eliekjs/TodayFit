/**
 * Minimal exercise shape for rule-based ontology inference (static + DB rows).
 * Used by inferExerciseOntology and catalog export.
 */

export type ExerciseInferenceInput = {
  id: string;
  name: string;
  muscles: string[];
  modalities: string[];
  equipment: string[];
  tags: string[];
  /** Legacy contraindication keys (shoulder, knee, …) */
  contraindications?: string[];
};
