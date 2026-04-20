/**
 * Deterministic mock LLM output for offline pipeline tests (no API key).
 */

import type { LlmClassificationValidated, LlmExerciseClassificationPayload } from "./llmClassificationTypes";

/**
 * Build a valid classification object; respects locked_do_not_override by copying deterministic values.
 */
export function buildMockLlmClassification(payload: LlmExerciseClassificationPayload): LlmClassificationValidated {
  const d = payload.deterministic_prefill;

  let primary_role = d.primary_role?.value ?? "accessory_strength";
  if (d.primary_role?.prior_policy === "locked_do_not_override") {
    primary_role = d.primary_role.value;
  }

  let movement_patterns = (d.movement_patterns?.value ?? ["horizontal_push"]).slice(0, 2);
  if (d.movement_patterns?.prior_policy === "locked_do_not_override") {
    movement_patterns = [...d.movement_patterns.value].slice(0, 2);
  }

  let equipment_class = d.equipment_class?.value ?? "bodyweight";
  if (d.equipment_class?.prior_policy === "locked_do_not_override") {
    equipment_class = d.equipment_class.value;
  }

  const complexity = d.complexity?.value ?? "intermediate";
  const sport_transfer_tags = d.sport_transfer_tags?.value ?? [];

  return {
    primary_role,
    movement_patterns,
    equipment_class,
    complexity,
    keep_category: "niche",
    sport_transfer_tags,
    llm_confidence: 0.77,
    ambiguity_flags: [],
  };
}

export function mockLlmResponseJson(payload: LlmExerciseClassificationPayload): string {
  return JSON.stringify(mockLlmBatchResponseJson([payload]));
}

/** Deterministic batched JSON matching parseBatchedLlmClassificationRaw. */
export function mockLlmBatchResponseJson(payloads: LlmExerciseClassificationPayload[]): string {
  const results = payloads.map((p) => ({
    exercise_id: p.exercise_id,
    ...buildMockLlmClassification(p),
  }));
  return JSON.stringify({ results });
}
