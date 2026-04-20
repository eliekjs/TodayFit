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

Output: JSON ONLY, no markdown fences, no commentary.

You will receive an array of exercises. Respond with a single JSON object of the form:
{ "results": [ { "exercise_id": "<id>", "primary_role": "...", "movement_patterns": ["..."], "equipment_class": "...", "complexity": "...", "keep_category": "...", "sport_transfer_tags": ["..."], "llm_confidence": 0.75, "ambiguity_flags": [] }, ... ] }

There must be exactly one object in results per input exercise_id. Each object must include exercise_id and exactly these classification keys:
primary_role, movement_patterns (array, max 2 items), equipment_class, complexity, keep_category, sport_transfer_tags, llm_confidence, ambiguity_flags (string array).

llm_confidence MUST be a number strictly greater than 0 and at most 1 (e.g. 0.35–0.95 for normal cases). Never use 0 — that reads as "omitted" and fails validation. If you are very uncertain, use a low positive value (e.g. 0.15–0.35) and explain in ambiguity_flags.

equipment_class must match the actual implement used: use the catalog equipment list, exercise name, and deterministic_prefill.equipment_class (note trust_tier and prior_policy locked_do_not_override). Do not label barbell/dumbbell/kettlebell/cable work as bodyweight unless it is truly unloaded bodyweight.

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

function formatEquipmentPriorsForBatch(payloads: LlmExerciseClassificationPayload[]): string {
  const lines: string[] = [];
  for (const p of payloads) {
    const eq = p.deterministic_prefill.equipment_class;
    const tier = eq?.trust_tier ?? "(none)";
    const policy = eq?.prior_policy ?? "(none)";
    const val = eq?.value ?? "(no prefill)";
    lines.push(
      `- ${p.exercise_id}: catalog_equipment_slugs=${JSON.stringify(p.equipment)} | equipment_class prefill=${val} trust_tier=${tier} prior_policy=${policy}`
    );
  }
  return lines.join("\n");
}

/**
 * Batch user message: array of exercise payloads (JSON) for a single API call.
 */
export function buildLlmClassificationUserPromptBatch(payloads: LlmExerciseClassificationPayload[]): string {
  return `Classify ALL of the following exercises. Return one JSON object with a "results" array.

Each results[i] must:
- include "exercise_id" matching the input exercise_id exactly
- include: primary_role, movement_patterns (max 2), equipment_class, complexity, keep_category, sport_transfer_tags, llm_confidence (must be > 0 and ≤ 1), ambiguity_flags

Equipment (critical): For each exercise, use the catalog equipment slugs, the exercise name/slug, and the phase-2 equipment_class prefill line below. If prior_policy is locked_do_not_override for equipment_class, your equipment_class MUST equal that deterministic value. If the name clearly names an implement (dumbbell/db, barbell, kettlebell, cable, etc.), equipment_class must reflect it — not bodyweight.

llm_confidence: strictly between 0 and 1 (never 0). Typical range 0.35–0.92.

Deterministic equipment_class summary (read with exercises JSON):
${formatEquipmentPriorsForBatch(payloads)}

If prior_policy is locked_do_not_override for any field, that field MUST match the deterministic value exactly for that exercise.

Exercises (full JSON, includes deterministic_prefill per exercise):
${JSON.stringify(payloads, null, 2)}

Allowed enums (same for every exercise):
- primary_role: compound_strength | accessory_strength | unilateral_strength | power_explosive | conditioning | mobility | stability_core | injury_prevention
- movement_patterns: up to 2 from: squat | hinge | lunge | horizontal_push | vertical_push | horizontal_pull | vertical_pull | rotation | anti_rotation | carry | locomotion | isometric
- equipment_class: barbell | dumbbell | kettlebell | cable | machine | bodyweight | band | mixed | cardio_machine | specialty
- complexity: beginner_friendly | intermediate | advanced
- keep_category: core | niche | merge_candidate | remove_candidate | review
- sport_transfer_tags: climbing | skiing | running | general_athletic | rehab_friendly

Respond with JSON only: { "results": [ ... ] } with one entry per exercise above, in any order.`;
}
