/**
 * Aggregate reporting for LLM classification runs.
 */

import { incrementCount, sortedCountEntries } from "./summaryStats";
import type { ExercisePrefillBlock } from "./types";
import type { FieldChangeKind, LlmClassificationRunMetrics, LlmRunSummary, LlmStagingItem, LlmValidatedRecord } from "./llmClassificationTypes";
import { compareLlmToDeterministicForField } from "./mergeDeterministicAndLlmOutputs";
import type { LlmClassificationValidated } from "./llmClassificationTypes";

function sortJoin<T extends string>(arr: readonly T[]): string {
  return [...arr].sort().join(",");
}

function emptyFieldBuckets(): Record<FieldChangeKind, number> {
  return { preserved: 0, replaced: 0, filled_no_prior: 0, locked_unchanged: 0 };
}

function bump(
  m: Record<FieldChangeKind, number>,
  k: FieldChangeKind
): void {
  m[k] = (m[k] ?? 0) + 1;
}

const PARSE_LEVEL_CODES = new Set<string>(["parse_json_failed", "batch_root_invalid", "batch_results_not_array"]);

/**
 * Build summary from staging validation failures + validated records + prefill map.
 */
export function computeLlmRunSummary(params: {
  total_processed: number;
  staging_items: LlmStagingItem[];
  validated_records: LlmValidatedRecord[];
  prefill_by_id: Map<string, ExercisePrefillBlock>;
  ambiguous_confidence_threshold: number;
  run_metrics?: LlmClassificationRunMetrics;
}): LlmRunSummary {
  const { total_processed, staging_items, validated_records, prefill_by_id, ambiguous_confidence_threshold, run_metrics } =
    params;

  const validation_failure_reasons: Record<string, number> = {};
  let rejected = 0;
  let parse_json_failed_count = 0;
  let malformed_record_count = 0;

  for (const it of staging_items) {
    if (it.validation.ok) continue;
    rejected += 1;
    const errs = it.validation.errors;
    const isParse = errs.some((e) => PARSE_LEVEL_CODES.has(e.code));
    if (isParse) parse_json_failed_count += 1;
    else malformed_record_count += 1;
    for (const e of errs) {
      incrementCount(validation_failure_reasons, e.code, 1);
    }
  }

  const by_keep_category: Record<string, number> = {};
  const by_primary_role: Record<string, number> = {};
  const by_complexity: Record<string, number> = {};
  const sport_transfer_tag_counts: Record<string, number> = {};
  const ambiguity_flag_counts: Record<string, number> = {};

  const fields = {
    primary_role: emptyFieldBuckets(),
    movement_patterns: emptyFieldBuckets(),
    equipment_class: emptyFieldBuckets(),
    complexity: emptyFieldBuckets(),
    sport_transfer_tags: emptyFieldBuckets(),
  };

  const locked_prefill_overrides_llm = {
    primary_role: 0,
    movement_patterns: 0,
    equipment_class: 0,
  };

  let ambiguous = 0;

  for (const rec of validated_records) {
    const llm = rec.llm;
    const merged = rec.merged_with_locked_prefill;
    const prefill = prefill_by_id.get(rec.exercise_id) ?? {};

    incrementCount(by_keep_category, merged.keep_category, 1);
    incrementCount(by_primary_role, merged.primary_role, 1);
    incrementCount(by_complexity, merged.complexity, 1);
    for (const t of merged.sport_transfer_tags) incrementCount(sport_transfer_tag_counts, t, 1);
    for (const f of merged.ambiguity_flags) incrementCount(ambiguity_flag_counts, f, 1);

    if (merged.ambiguity_flags.length > 0 || merged.llm_confidence < ambiguous_confidence_threshold) {
      ambiguous += 1;
    }

    function llmDisagreesWithLockedPrefill(
      key: "primary_role" | "movement_patterns" | "equipment_class",
      p: ExercisePrefillBlock,
      l: LlmClassificationValidated
    ): boolean {
      if (key === "primary_role" && p.primary_role) {
        return p.primary_role.value !== l.primary_role;
      }
      if (key === "movement_patterns" && p.movement_patterns) {
        return sortJoin(p.movement_patterns.value) !== sortJoin(l.movement_patterns);
      }
      if (key === "equipment_class" && p.equipment_class) {
        return p.equipment_class.value !== l.equipment_class;
      }
      return false;
    }

    const tally = (key: keyof typeof fields) => {
      const tier = prefill[key] as { trust_tier?: string } | undefined;
      const isLocked = tier?.trust_tier === "locked";
      if (isLocked) {
        bump(fields[key], "locked_unchanged");
        if (
          key === "primary_role" ||
          key === "movement_patterns" ||
          key === "equipment_class"
        ) {
          if (llmDisagreesWithLockedPrefill(key, prefill, llm)) {
            locked_prefill_overrides_llm[key] += 1;
          }
        }
        return;
      }
      const cmp = compareLlmToDeterministicForField(key, prefill, llm);
      if (cmp === "filled_no_prior") bump(fields[key], "filled_no_prior");
      else if (cmp === "preserved") bump(fields[key], "preserved");
      else bump(fields[key], "replaced");
    };

    tally("primary_role");
    tally("movement_patterns");
    tally("equipment_class");
    tally("complexity");
    tally("sport_transfer_tags");
  }

  const top_ambiguity_flags = sortedCountEntries(ambiguity_flag_counts).map(({ key, count }) => ({
    flag: key,
    count,
  }));

  return {
    total_processed,
    validated_count: validated_records.length,
    rejected_count: rejected,
    ambiguous_count: ambiguous,
    malformed_record_count,
    parse_json_failed_count,
    run_metrics,
    by_keep_category,
    by_primary_role,
    by_complexity,
    sport_transfer_tag_counts,
    deterministic_vs_llm: fields,
    locked_prefill_overrides_llm,
    top_ambiguity_flags: top_ambiguity_flags.slice(0, 40),
    validation_failure_reasons: sortedCountEntries(validation_failure_reasons).map(({ key, count }) => ({
      code: key,
      count,
    })),
  };
}
