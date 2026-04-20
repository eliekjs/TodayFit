/**
 * Markdown reports for phase 5 library pruning.
 */

import type { LibraryPruningDecisionArtifact, LibraryPruningDecisionRecord } from "./valueFilterTypes";
import { inferExerciseFamilyKey } from "./buildLibraryPruningDecision";

function pct(part: number, total: number): string {
  if (total <= 0) return "0.0%";
  return `${((100 * part) / total).toFixed(1)}%`;
}

function tableRow(cells: string[]): string {
  return `| ${cells.join(" | ")} |`;
}

export function formatLibraryPruningDecisionMarkdown(artifact: LibraryPruningDecisionArtifact): string {
  const s = artifact.summary;
  const lines: string[] = [];
  lines.push("# Exercise library pruning decisions (phase 5)");
  lines.push("");
  lines.push(`- **Generated:** ${artifact.generated_at}`);
  lines.push(`- **Catalog:** \`${artifact.catalog_path}\``);
  lines.push(`- **Prefill:** \`${artifact.prefill_path || "(none)"}\``);
  lines.push(`- **LLM validated:** \`${artifact.llm_validated_path}\``);
  lines.push(`- **Duplicate clusters:** \`${artifact.duplicate_clusters_path || "(inline)"}\``);
  lines.push(`- **Duplicate aggressiveness:** ${artifact.duplicate_aggressiveness}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(tableRow(["Metric", "Count"]));
  lines.push("| --- | ---: |");
  lines.push(tableRow(["Total exercises", String(s.total_exercises)]));
  for (const k of ["keep_core", "keep_niche", "merge_into_canonical", "remove_niche_or_low_value", "review"] as const) {
    lines.push(tableRow([`Recommendation: ${k}`, String(s.counts_by_recommendation[k])]));
  }
  lines.push(tableRow(["Projected rows retained (keep_core + keep_niche + review)", String(s.projected_rows_retained)]));
  lines.push(tableRow(["Projected rows merged into canonical", String(s.projected_rows_merged_into_canonical)]));
  lines.push(tableRow(["Projected rows removed", String(s.projected_rows_removed)]));
  lines.push("");
  lines.push(
    `- **Retained share:** ${pct(s.projected_rows_retained, s.total_exercises)} · **Merged share:** ${pct(s.projected_rows_merged_into_canonical, s.total_exercises)} · **Removed share:** ${pct(s.projected_rows_removed, s.total_exercises)}`
  );
  lines.push("");
  lines.push(
    `- **Intrinsic score quantiles (p10 / p50 / p90):** ${s.intrinsic_overall_score_quantiles.p10.toFixed(3)} / ${s.intrinsic_overall_score_quantiles.p50.toFixed(3)} / ${s.intrinsic_overall_score_quantiles.p90.toFixed(3)}`
  );
  lines.push("");
  lines.push("### Top removal drivers (by `reason_code` frequency)");
  lines.push("");
  for (const x of s.top_removal_drivers.slice(0, 22)) {
    lines.push(`- \`${x.code}\` — ${x.count}`);
  }
  lines.push("");
  lines.push("### Top reason codes — merge");
  lines.push("");
  for (const x of s.top_merge_reason_codes.slice(0, 15)) {
    lines.push(`- \`${x.code}\` — ${x.count}`);
  }
  lines.push("");
  lines.push("### Canonical selections (largest clusters)");
  lines.push("");
  lines.push(tableRow(["Cluster", "Phase 5 canonical", "Members", "Phase 4 canonical", "Changed?"]));
  lines.push("| --- | --- | ---: | --- | :---: |");
  for (const c of s.top_canonical_selections.slice(0, 25)) {
    lines.push(
      tableRow([
        `\`${c.cluster_id}\``,
        `\`${c.canonical_exercise_id}\``,
        String(c.member_count),
        c.phase4_canonical_exercise_id ? `\`${c.phase4_canonical_exercise_id}\`` : "—",
        c.changed_from_phase4 ? "yes" : "no",
      ])
    );
  }
  lines.push("");
  lines.push("### Family rollups (heuristic)");
  lines.push("");
  lines.push(tableRow(["Family", "Exercises", "Kept (proj.)", "Removed/merged (proj.)", "Examples"]));
  lines.push("| --- | ---: | ---: | ---: | --- |");
  for (const f of s.family_rollups.slice(0, 22)) {
    lines.push(
      tableRow([
        `${f.label} (\`${f.family_key}\`)`,
        String(f.exercise_count),
        String(f.projected_kept),
        String(f.projected_removed_or_merged),
        f.example_exercise_ids.slice(0, 5).map((id) => `\`${id}\``).join(", "),
      ])
    );
  }
  lines.push("");
  lines.push("### Examples — low-value unique exercises (removed, not merged)");
  lines.push("");
  const removedUnique = artifact.records.filter((r) => r.pruning_recommendation === "remove_niche_or_low_value" && !r.cluster_id);
  for (const r of removedUnique.sort((a, b) => a.value_profile.intrinsic_overall_value_score - b.value_profile.intrinsic_overall_value_score).slice(0, 18)) {
    lines.push(
      `- \`${r.exercise_id}\` — ${r.exercise_name} (intrinsic ${r.value_profile.intrinsic_overall_value_score.toFixed(3)})`
    );
  }
  lines.push("");
  lines.push("### Examples — merged exercises (by heuristic family)");
  lines.push("");
  const merged = artifact.records.filter((r) => r.pruning_recommendation === "merge_into_canonical");
  const byFam = new Map<string, LibraryPruningDecisionRecord[]>();
  for (const r of merged) {
    const { key } = inferExerciseFamilyKey(r.exercise_name, r.exercise_id);
    const arr = byFam.get(key) ?? [];
    arr.push(r);
    byFam.set(key, arr);
  }
  const famKeys = [...byFam.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 10);
  for (const [key, arr] of famKeys) {
    lines.push(`- **${key}** (${arr.length} merged)`);
    for (const r of arr.slice(0, 4)) {
      lines.push(`  - \`${r.exercise_id}\` → \`${r.canonical_exercise_id}\` (${r.redundancy_tier ?? "?"})`);
    }
  }
  lines.push("");
  return lines.join("\n");
}

export function formatLibraryPruningSummaryOnlyMarkdown(artifact: LibraryPruningDecisionArtifact): string {
  const s = artifact.summary;
  const lines: string[] = [];
  lines.push("# Exercise library pruning — executive summary");
  lines.push("");
  lines.push(`Generated **${artifact.generated_at}** · exercises **${s.total_exercises}**`);
  lines.push("");
  lines.push("## Headline projections");
  lines.push("");
  lines.push(`- **Stay in library (keep_core + keep_niche + review):** ${s.projected_rows_retained} (${pct(s.projected_rows_retained, s.total_exercises)})`);
  lines.push(`- **Collapse as non-canonical duplicates:** ${s.projected_rows_merged_into_canonical} (${pct(s.projected_rows_merged_into_canonical, s.total_exercises)})`);
  lines.push(`- **Drop as low-value / niche:** ${s.projected_rows_removed} (${pct(s.projected_rows_removed, s.total_exercises)})`);
  lines.push("");
  lines.push("## Recommendation mix");
  lines.push("");
  for (const k of ["keep_core", "keep_niche", "merge_into_canonical", "remove_niche_or_low_value", "review"] as const) {
    lines.push(`- **${k}:** ${s.counts_by_recommendation[k]} (${pct(s.counts_by_recommendation[k], s.total_exercises)})`);
  }
  lines.push("");
  lines.push("## Top removal drivers");
  lines.push("");
  for (const x of s.top_removal_drivers.slice(0, 15)) {
    lines.push(`- \`${x.code}\` — ${x.count}`);
  }
  lines.push("");
  lines.push("## Score distribution (intrinsic overall)");
  lines.push("");
  lines.push(
    `p10 **${s.intrinsic_overall_score_quantiles.p10.toFixed(3)}** · p50 **${s.intrinsic_overall_score_quantiles.p50.toFixed(3)}** · p90 **${s.intrinsic_overall_score_quantiles.p90.toFixed(3)}**`
  );
  lines.push("");
  return lines.join("\n");
}
