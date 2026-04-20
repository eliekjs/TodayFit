/**
 * Markdown report for generator eligibility preview (phase 6).
 */

import type { GeneratorEligibilityPreviewArtifact } from "./generatorEligibilityTypes";

function pct(part: number, total: number): string {
  if (total <= 0) return "0.0%";
  return `${((100 * part) / total).toFixed(1)}%`;
}

function row(cells: (string | number)[]): string {
  return `| ${cells.map(String).join(" | ")} |`;
}

export function formatGeneratorEligibilityPreviewMarkdown(artifact: GeneratorEligibilityPreviewArtifact): string {
  const s = artifact.preview_stats;
  const lines: string[] = [];
  lines.push("# Generator eligibility preview (phase 6)");
  lines.push("");
  lines.push(`- **Generated:** ${artifact.generated_at}`);
  lines.push(`- **Catalog:** \`${artifact.catalog_path}\``);
  lines.push(`- **Pruning artifact:** \`${artifact.pruning_artifact_path}\``);
  if (artifact.llm_validated_path) {
    lines.push(`- **LLM validated (for breakdowns):** \`${artifact.llm_validated_path}\``);
  }
  lines.push("");
  lines.push("## Feature flags (preview defaults)");
  lines.push("");
  lines.push("```json");
  lines.push(JSON.stringify(artifact.feature_flags, null, 2));
  lines.push("```");
  lines.push("");
  lines.push("## Mapping rules");
  lines.push("");
  for (const r of artifact.mapping_rules) {
    lines.push(`- ${r}`);
  }
  lines.push("");
  lines.push("## Pool size");
  lines.push("");
  lines.push(row(["Metric", "Count", "Share of catalog"]));
  lines.push("| --- | ---: | ---: |");
  lines.push(row(["Catalog total", s.catalog_total, "100%"]));
  lines.push(row(["Baseline pool (gating off)", s.pool_size_baseline, pct(s.pool_size_baseline, s.catalog_total)]));
  lines.push(
    row([
      "Gated default (core + niche; review off)",
      s.pool_size_gated_default,
      pct(s.pool_size_gated_default, s.catalog_total),
    ])
  );
  lines.push(
    row([
      "Gated permissive (core + niche + review)",
      s.pool_size_gated_permissive,
      pct(s.pool_size_gated_permissive, s.catalog_total),
    ])
  );
  lines.push("");
  lines.push(
    `**Projected reduction (default gate vs baseline):** ${s.pool_size_baseline - s.pool_size_gated_default} exercises (${pct(s.pool_size_baseline - s.pool_size_gated_default, s.catalog_total)} of catalog).`
  );
  lines.push("");
  lines.push("## Counts by eligibility state");
  lines.push("");
  lines.push(row(["State", "Count"]));
  lines.push("| --- | ---: |");
  for (const k of [
    "eligible_core",
    "eligible_niche",
    "excluded_merged",
    "excluded_removed",
    "excluded_review",
    "excluded_unknown",
  ] as const) {
    lines.push(row([k, s.counts_by_state[k]]));
  }
  lines.push("");
  lines.push("## Canonical survivors");
  lines.push("");
  lines.push(
    `- **Clusters with a canonical row:** ${s.canonical_survivors_count} · **Canonicals retained as eligible (core or niche):** ${s.canonicals_retained_eligible_count}`
  );
  lines.push("");
  lines.push("## Excluded counts by pruning recommendation");
  lines.push("");
  lines.push(row(["Pruning recommendation / reason", "Count"]));
  lines.push("| --- | ---: |");
  for (const x of s.excluded_by_pruning_reason) {
    lines.push(row([String(x.pruning_recommendation), x.count]));
  }
  lines.push("");
  lines.push("## Gated pool — movement pattern (top)");
  lines.push("");
  lines.push(row(["Pattern", "Count"]));
  lines.push("| --- | ---: |");
  for (const x of s.pool_by_movement_pattern.slice(0, 30)) {
    lines.push(row([x.key, x.count]));
  }
  lines.push("");
  lines.push("## Gated pool — equipment class");
  lines.push("");
  lines.push(row(["Equipment class", "Count"]));
  lines.push("| --- | ---: |");
  for (const x of s.pool_by_equipment_class) {
    lines.push(row([x.key, x.count]));
  }
  lines.push("");
  lines.push("## Gated pool — primary role");
  lines.push("");
  lines.push(row(["Primary role", "Count"]));
  lines.push("| --- | ---: |");
  for (const x of s.pool_by_primary_role) {
    lines.push(row([x.key, x.count]));
  }
  lines.push("");
  lines.push("## Examples — excluded merged");
  lines.push("");
  for (const x of s.example_excluded_merged.slice(0, 15)) {
    lines.push(`- \`${x.exercise_id}\` → canonical \`${x.merge_target_exercise_id ?? "?"}\` — ${x.exercise_name}`);
  }
  lines.push("");
  lines.push("## Examples — excluded removed");
  lines.push("");
  for (const x of s.example_excluded_removed.slice(0, 15)) {
    lines.push(`- \`${x.exercise_id}\` — ${x.exercise_name}`);
  }
  lines.push("");
  lines.push("## Examples — excluded review");
  lines.push("");
  for (const x of s.example_excluded_review.slice(0, 15)) {
    lines.push(`- \`${x.exercise_id}\` — ${x.exercise_name}`);
  }
  lines.push("");
  if (artifact.conflicts.length) {
    lines.push("## Conflicts / edge cases");
    lines.push("");
    for (const c of artifact.conflicts) {
      lines.push(`- **${c.kind}** (\`${c.exercise_id}\`): ${c.message}`);
    }
    lines.push("");
  }
  if (artifact.unknown_exercise_ids.length) {
    lines.push("## Unknown (not in pruning artifact)");
    lines.push("");
    lines.push(
      `**Count:** ${artifact.unknown_exercise_ids.length} — listed as \`excluded_unknown\` when gating is on.`
    );
    lines.push("");
  }
  return lines.join("\n");
}
