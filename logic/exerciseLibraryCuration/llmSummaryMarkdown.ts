/**
 * Markdown report for LLM classification runs.
 */

import type { LlmRunSummary } from "./llmClassificationTypes";

export function formatLlmClassificationSummaryMarkdown(summary: LlmRunSummary, catalogPath: string): string {
  const lines: string[] = [];
  lines.push(`# Exercise curation — LLM classification summary`);
  lines.push(``);
  lines.push(`- **Catalog:** \`${catalogPath}\``);
  lines.push(`- **Total processed:** ${summary.total_processed}`);
  lines.push(`- **Validated:** ${summary.validated_count}`);
  lines.push(`- **Rejected (validation failed):** ${summary.rejected_count}`);
  lines.push(
    `- **Ambiguous** (merged profile: ambiguity_flags non-empty or llm_confidence below threshold): ${summary.ambiguous_count}`
  );
  lines.push(`- **Parse / batch JSON failures (staging rows):** ${summary.parse_json_failed_count}`);
  lines.push(`- **Malformed record failures (enum/shape, staging rows):** ${summary.malformed_record_count}`);
  if (summary.run_metrics) {
    const m = summary.run_metrics;
    lines.push(``);
    lines.push(`## This run (invocation)`);
    lines.push(`- **Exercises attempted:** ${m.exercises_attempted}`);
    lines.push(`- **API requests made:** ${m.api_requests_made}`);
    lines.push(
      `- **Average exercises per request:** ${
        m.api_requests_made > 0 ? m.average_exercises_per_request.toFixed(2) : "0.00"
      }`
    );
    lines.push(`- **Provider errors (rate limit, after retries):** ${m.provider_error_rate_limit}`);
    lines.push(`- **Provider errors (other, after retries):** ${m.provider_error_other}`);
    lines.push(`- **Partial batch successes** (mixed pass/fail in one API response): ${m.partial_batch_success_count}`);
  }
  lines.push(``);
  lines.push(`## keep_category`);
  for (const k of Object.keys(summary.by_keep_category).sort()) {
    lines.push(`- **${k}:** ${summary.by_keep_category[k]}`);
  }
  lines.push(``);
  lines.push(`## primary_role (merged output)`);
  for (const k of Object.keys(summary.by_primary_role).sort()) {
    lines.push(`- **${k}:** ${summary.by_primary_role[k]}`);
  }
  lines.push(``);
  lines.push(`## complexity`);
  for (const k of Object.keys(summary.by_complexity).sort()) {
    lines.push(`- **${k}:** ${summary.by_complexity[k]}`);
  }
  lines.push(``);
  lines.push(`## sport_transfer_tags`);
  for (const k of Object.keys(summary.sport_transfer_tag_counts).sort()) {
    lines.push(`- **${k}:** ${summary.sport_transfer_tag_counts[k]}`);
  }
  lines.push(``);
  lines.push(`## Locked prefill overrode raw LLM (LLM disagreed with locked deterministic field)`);
  lines.push(
    `- primary_role: ${summary.locked_prefill_overrides_llm.primary_role}, movement_patterns: ${summary.locked_prefill_overrides_llm.movement_patterns}, equipment_class: ${summary.locked_prefill_overrides_llm.equipment_class}`
  );
  lines.push(``);
  lines.push(`## Deterministic vs raw LLM (non-locked fields)`);
  for (const field of [
    "primary_role",
    "movement_patterns",
    "equipment_class",
    "complexity",
    "sport_transfer_tags",
  ] as const) {
    const b = summary.deterministic_vs_llm[field];
    lines.push(`### ${field}`);
    lines.push(`- preserved: ${b.preserved}, replaced: ${b.replaced}, filled_no_prior: ${b.filled_no_prior}, locked_unchanged: ${b.locked_unchanged}`);
  }
  lines.push(``);
  lines.push(`## Top ambiguity flags`);
  for (const { flag, count } of summary.top_ambiguity_flags.slice(0, 30)) {
    lines.push(`- ${flag}: ${count}`);
  }
  lines.push(``);
  lines.push(`## Validation failure codes`);
  for (const { code, count } of summary.validation_failure_reasons) {
    lines.push(`- **${code}:** ${count}`);
  }
  lines.push(``);
  return lines.join("\n");
}
