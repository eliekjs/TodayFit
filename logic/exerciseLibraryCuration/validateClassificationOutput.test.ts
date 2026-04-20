/**
 * Run: npx tsx logic/exerciseLibraryCuration/validateClassificationOutput.test.ts
 */

import assert from "node:assert";
import {
  parseBatchedLlmClassificationRaw,
  validateLlmClassificationResultRecord,
} from "./validateClassificationOutput";

const validRow = (id: string) => ({
  exercise_id: id,
  primary_role: "accessory_strength",
  movement_patterns: ["horizontal_push"],
  equipment_class: "bodyweight",
  complexity: "intermediate",
  keep_category: "niche",
  sport_transfer_tags: [] as string[],
  llm_confidence: 0.8,
  ambiguity_flags: [] as string[],
});

const ids = ["ex-a", "ex-b"] as const;

// Valid batch
{
  const raw = JSON.stringify({
    results: [validRow("ex-a"), validRow("ex-b")],
  });
  const m = parseBatchedLlmClassificationRaw(raw, ids);
  assert.strictEqual(m.get("ex-a")?.ok, true);
  assert.strictEqual(m.get("ex-b")?.ok, true);
}

// Whole response not JSON
{
  const m = parseBatchedLlmClassificationRaw("not json", ids);
  for (const id of ids) {
    assert.strictEqual(m.get(id)?.ok, false);
    assert(m.get(id)?.ok === false && m.get(id)!.errors.some((e) => e.code === "parse_json_failed"));
  }
}

// Missing results array
{
  const raw = JSON.stringify({ foo: [] });
  const m = parseBatchedLlmClassificationRaw(raw, ids);
  for (const id of ids) {
    assert.strictEqual(m.get(id)?.ok, false);
    assert(m.get(id)?.ok === false && m.get(id)!.errors.some((e) => e.code === "batch_results_not_array"));
  }
}

// Partial batch: one missing result
{
  const raw = JSON.stringify({ results: [validRow("ex-a")] });
  const m = parseBatchedLlmClassificationRaw(raw, ids);
  assert.strictEqual(m.get("ex-a")?.ok, true);
  assert.strictEqual(m.get("ex-b")?.ok, false);
  assert(
    m.get("ex-b")?.ok === false && m.get("ex-b")!.errors.some((e) => e.code === "missing_batch_result")
  );
}

// Per-record invalid enum
{
  const bad = { ...validRow("ex-a"), primary_role: "nope" };
  const raw = JSON.stringify({ results: [bad, validRow("ex-b")] });
  const m = parseBatchedLlmClassificationRaw(raw, ids);
  assert.strictEqual(m.get("ex-a")?.ok, false);
  assert.strictEqual(m.get("ex-b")?.ok, true);
}

// exercise_id mismatch in row
{
  const r = validateLlmClassificationResultRecord(validRow("wrong-id"), "ex-a");
  assert.strictEqual(r.ok, false);
  assert(r.ok === false && r.errors.some((e) => e.code === "exercise_id_mismatch"));
}

// llm_confidence 0 is invalid (prompt must use > 0)
{
  const bad = { ...validRow("ex-a"), llm_confidence: 0 };
  const raw = JSON.stringify({ results: [bad] });
  const m = parseBatchedLlmClassificationRaw(raw, ["ex-a"]);
  assert.strictEqual(m.get("ex-a")?.ok, false);
  assert(m.get("ex-a")?.ok === false && m.get("ex-a")!.errors.some((e) => e.code === "llm_confidence_invalid"));
}

console.log("validateClassificationOutput.test.ts: ok");
