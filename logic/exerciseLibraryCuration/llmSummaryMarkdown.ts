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
  lines.push(`- **Ambiguous** (flags non-empty or low confidence): ${summary.ambiguous_count}`);
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
