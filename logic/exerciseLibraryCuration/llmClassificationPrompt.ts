/**
 * System + user prompts for exercise curation LLM classification (phase 3).
 * Philosophy and keep-category rubric are encoded here — provider calls stay elsewhere.
 */

import type { LlmExerciseClassificationPayload } from "./llmClassificationTypes";

export const LLM_CLASSIFICATION_SYSTEM_PROMPT = `You are a metadata classifier for TodayFit, a gym training app for people who cross-train for sports.

Product philosophy:
- Users want low decision burden: clear, substitutable exercises that work across gyms and equipment changes.
- Users balance sport goals, physique goals, injuries, limited time, and changing equipment or gyms.
- This is NOT a powerlifting app, NOT a bodybuilding encyclopedia, and NOT highly technical lift-specific programming.
- Prefer transferable patterns, broad usefulness, and maintainability over niche or overly technical movements.

Deterministic priors may be attached per field with prior_policy:
- locked_do_not_override: MUST copy these values exactly in your JSON output. Do not change them.
- recommendation: strong suggestion; you may replace if you have a clear reason (note in ambiguity_flags).
- low_confidence_hint: weak hint; you may ignore.
- soft_strong / soft_weak: always soft suggestions for complexity and sport tags; never treated as locked.

Keep category rubric (you assign exactly one):
- core: Broadly useful, transferable, easy to substitute, strong fit for a sport cross-training decision engine. Be conservative — do not label "core" unless it clearly fits.
- niche: Useful but sport-specific, rehab/prehab, unusual equipment, or edge contexts.
- merge_candidate: Mostly redundant with a more canonical exercise variation.
- remove_candidate: Gimmicky, excessively niche, overly technical, poor fit for the app, or not worth maintaining.
- review: Truly ambiguous cases only — do not overuse.

Output: JSON ONLY, no markdown fences, no commentary. One object per exercise with exactly these keys:
primary_role, movement_patterns (array, max 2 items), equipment_class, complexity, keep_category, sport_transfer_tags, llm_confidence (0-1 number), ambiguity_flags (string array).

Use only allowed enum values provided in the user message schema reference.`;

export function buildLlmClassificationUserPrompt(payload: LlmExerciseClassificationPayload): string {
  const d = payload.deterministic_prefill;
  return `Classify this exercise.

exercise_id: ${payload.exercise_id}
name: ${payload.name}
description: ${payload.description ?? ""}
equipment: ${JSON.stringify(payload.equipment)}
tags: ${JSON.stringify(payload.tags)}
muscles: ${JSON.stringify(payload.muscles)}
modalities: ${JSON.stringify(payload.modalities)}
legacy_movement_pattern: ${payload.legacy_movement_pattern ?? "null"}
ontology_movement_patterns: ${JSON.stringify(payload.ontology_movement_patterns)}

Deterministic prefill (phase 2) with prior_policy:
${JSON.stringify(d, null, 2)}

Allowed enums:
- primary_role: compound_strength | accessory_strength | unilateral_strength | power_explosive | conditioning | mobility | stability_core | injury_prevention
- movement_patterns: up to 2 from: squat | hinge | lunge | horizontal_push | vertical_push | horizontal_pull | vertical_pull | rotation | anti_rotation | carry | locomotion | isometric
- equipment_class: barbell | dumbbell | kettlebell | cable | machine | bodyweight | band | mixed | cardio_machine | specialty
- complexity: beginner_friendly | intermediate | advanced
- keep_category: core | niche | merge_candidate | remove_candidate | review
- sport_transfer_tags: array of zero or more from: climbing | skiing | running | general_athletic | rehab_friendly

Return a single JSON object for this exercise with all required keys. If prior_policy is locked_do_not_override for a field, your output for that field MUST match the deterministic value exactly.`;
}
