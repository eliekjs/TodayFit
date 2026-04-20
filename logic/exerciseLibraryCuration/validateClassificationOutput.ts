/**
 * Strict validation for LLM JSON classification output (phase 3).
 */

import type {
  CurationComplexity,
  CurationEquipmentClass,
  CurationKeepCategory,
  CurationMovementPattern,
  CurationPrimaryRole,
  CurationSportTransferTag,
} from "./enums";
import type { LlmClassificationValidated, LlmValidationResult, ValidationFailureCode } from "./llmClassificationTypes";

const PRIMARY_ROLES: CurationPrimaryRole[] = [
  "compound_strength",
  "accessory_strength",
  "unilateral_strength",
  "power_explosive",
  "conditioning",
  "mobility",
  "stability_core",
  "injury_prevention",
];

const MOVEMENT_PATTERNS: CurationMovementPattern[] = [
  "squat",
  "hinge",
  "lunge",
  "horizontal_push",
  "vertical_push",
  "horizontal_pull",
  "vertical_pull",
  "rotation",
  "anti_rotation",
  "carry",
  "locomotion",
  "isometric",
];

const EQUIPMENT: CurationEquipmentClass[] = [
  "barbell",
  "dumbbell",
  "kettlebell",
  "cable",
  "machine",
  "bodyweight",
  "band",
  "mixed",
  "cardio_machine",
  "specialty",
];

const COMPLEXITY: CurationComplexity[] = ["beginner_friendly", "intermediate", "advanced"];

const KEEP: CurationKeepCategory[] = ["core", "niche", "merge_candidate", "remove_candidate", "review"];

const SPORT_TAGS: CurationSportTransferTag[] = [
  "climbing",
  "skiing",
  "running",
  "general_athletic",
  "rehab_friendly",
];

const REQUIRED_KEYS = [
  "primary_role",
  "movement_patterns",
  "equipment_class",
  "complexity",
  "keep_category",
  "sport_transfer_tags",
  "llm_confidence",
  "ambiguity_flags",
] as const;

function err(code: ValidationFailureCode, message: string): LlmValidationResult {
  return { ok: false, errors: [{ code, message }] };
}

function isStr(v: unknown): v is string {
  return typeof v === "string";
}

function isNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/**
 * Extract a JSON object from model output (raw JSON or fenced markdown).
 */
export function extractJsonObject(raw: string): unknown {
  const t = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(t);
  const body = fence ? fence[1]!.trim() : t;
  return JSON.parse(body);
}

/**
 * Validate parsed LLM output shape and enums.
 */
export function validateLlmClassificationOutput(parsed: unknown): LlmValidationResult {
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return err("not_object", "Root must be a JSON object");
  }
  const o = parsed as Record<string, unknown>;

  for (const k of REQUIRED_KEYS) {
    if (!(k in o)) return err("missing_field", `Missing required field: ${k}`);
  }

  for (const k of Object.keys(o)) {
    if (!([...REQUIRED_KEYS] as string[]).includes(k)) {
      return err("unknown_field", `Unknown field: ${k}`);
    }
  }

  if (!isStr(o.primary_role) || !PRIMARY_ROLES.includes(o.primary_role as CurationPrimaryRole)) {
    return err("invalid_enum", `Invalid primary_role: ${String(o.primary_role)}`);
  }

  if (!Array.isArray(o.movement_patterns)) {
    return err("movement_patterns_invalid", "movement_patterns must be an array");
  }
  if (o.movement_patterns.length > 2) {
    return err("movement_patterns_too_many", "movement_patterns must have at most 2 entries");
  }
  for (const m of o.movement_patterns) {
    if (!isStr(m) || !MOVEMENT_PATTERNS.includes(m as CurationMovementPattern)) {
      return err("invalid_enum", `Invalid movement_pattern: ${String(m)}`);
    }
  }

  if (!isStr(o.equipment_class) || !EQUIPMENT.includes(o.equipment_class as CurationEquipmentClass)) {
    return err("invalid_enum", `Invalid equipment_class: ${String(o.equipment_class)}`);
  }

  if (!isStr(o.complexity) || !COMPLEXITY.includes(o.complexity as CurationComplexity)) {
    return err("invalid_enum", `Invalid complexity: ${String(o.complexity)}`);
  }

  if (!isStr(o.keep_category) || !KEEP.includes(o.keep_category as CurationKeepCategory)) {
    return err("invalid_enum", `Invalid keep_category: ${String(o.keep_category)}`);
  }

  if (!Array.isArray(o.sport_transfer_tags)) {
    return err("invalid_enum", "sport_transfer_tags must be an array");
  }
  for (const s of o.sport_transfer_tags) {
    if (!isStr(s) || !SPORT_TAGS.includes(s as CurationSportTransferTag)) {
      return err("invalid_enum", `Invalid sport_transfer_tags entry: ${String(s)}`);
    }
  }

  if (!isNum(o.llm_confidence) || o.llm_confidence <= 0 || o.llm_confidence > 1) {
    return err(
      "llm_confidence_invalid",
      "llm_confidence must be a number strictly between 0 and 1 (e.g. 0.2–0.95). Do not output 0; use ambiguity_flags if truly unknowable."
    );
  }

  if (!Array.isArray(o.ambiguity_flags)) {
    return err("ambiguity_flags_invalid", "ambiguity_flags must be an array of strings");
  }
  for (const f of o.ambiguity_flags) {
    if (!isStr(f)) return err("ambiguity_flags_invalid", "ambiguity_flags must contain only strings");
  }

  const value: LlmClassificationValidated = {
    primary_role: o.primary_role as CurationPrimaryRole,
    movement_patterns: o.movement_patterns as CurationMovementPattern[],
    equipment_class: o.equipment_class as CurationEquipmentClass,
    complexity: o.complexity as CurationComplexity,
    keep_category: o.keep_category as CurationKeepCategory,
    sport_transfer_tags: o.sport_transfer_tags as CurationSportTransferTag[],
    llm_confidence: o.llm_confidence,
    ambiguity_flags: o.ambiguity_flags as string[],
  };

  return { ok: true, value };
}

/**
 * Parse raw model text and validate; returns validation result (never throws from JSON).
 */
export function parseAndValidateLlmClassificationRaw(raw: string): LlmValidationResult {
  try {
    const parsed = extractJsonObject(raw);
    return validateLlmClassificationOutput(parsed);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return err("parse_json_failed", msg);
  }
}

/**
 * Validate one object from `results[]`: must include matching exercise_id, then same rules as single-object output.
 */
export function validateLlmClassificationResultRecord(parsed: unknown, expectedExerciseId: string): LlmValidationResult {
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return err("not_object", "Result row must be a JSON object");
  }
  const o = parsed as Record<string, unknown>;
  if (!("exercise_id" in o) || typeof o.exercise_id !== "string") {
    return err("missing_field", "Missing required field: exercise_id");
  }
  if (o.exercise_id !== expectedExerciseId) {
    return err("exercise_id_mismatch", `Expected exercise_id ${expectedExerciseId}, got ${String(o.exercise_id)}`);
  }
  const { exercise_id: _eid, ...rest } = o;
  return validateLlmClassificationOutput(rest);
}

function failAllIds(
  expectedExerciseIds: readonly string[],
  code: ValidationFailureCode,
  message: string
): Map<string, LlmValidationResult> {
  const r = err(code, message);
  return new Map(expectedExerciseIds.map((id) => [id, r]));
}

/**
 * Parse batched JSON `{ "results": [ { "exercise_id", ...fields } ] }` and validate each expected id independently.
 * Whole-batch JSON parse failure or missing `results` array marks every expected id with a provider/parse failure.
 */
export function parseBatchedLlmClassificationRaw(
  raw: string,
  expectedExerciseIds: readonly string[]
): Map<string, LlmValidationResult> {
  let parsed: unknown;
  try {
    parsed = extractJsonObject(raw);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return failAllIds(expectedExerciseIds, "parse_json_failed", msg);
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return failAllIds(expectedExerciseIds, "batch_root_invalid", "Root must be a JSON object");
  }
  const root = parsed as Record<string, unknown>;
  if (!Array.isArray(root.results)) {
    return failAllIds(expectedExerciseIds, "batch_results_not_array", "Missing or invalid results array");
  }

  const results = root.results;
  const byIdFirst = new Map<string, unknown>();
  for (const row of results) {
    if (row === null || typeof row !== "object" || Array.isArray(row)) continue;
    const id = (row as Record<string, unknown>).exercise_id;
    if (typeof id !== "string" || !id) continue;
    if (!byIdFirst.has(id)) byIdFirst.set(id, row);
  }

  const out = new Map<string, LlmValidationResult>();
  for (const id of expectedExerciseIds) {
    const row = byIdFirst.get(id);
    if (row === undefined) {
      out.set(id, err("missing_batch_result", `No result object for exercise_id ${id}`));
      continue;
    }
    out.set(id, validateLlmClassificationResultRecord(row, id));
  }
  return out;
}
