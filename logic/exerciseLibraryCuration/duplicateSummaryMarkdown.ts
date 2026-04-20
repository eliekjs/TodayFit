/**
 * Human-readable summary for `artifacts/exercise-duplicate-clusters.md`.
 */

import type { DuplicateClustersArtifact } from "./duplicateClusterTypes";

function bulletList(items: string[]): string {
  if (!items.length) return "_None._\n";
  return items.map((x) => `- ${x}`).join("\n") + "\n";
}

export function formatDuplicateClusterSummaryMarkdown(artifact: DuplicateClustersArtifact): string {
  const { stats, config, blocked_pair_sample, generated_at, aggressiveness } = artifact;
  const lines: string[] = [];

  lines.push("# Exercise redundancy clusters (library reduction)");
  lines.push("");
  lines.push(`Generated: \`${generated_at}\``);
  lines.push(`**Aggressiveness:** \`${aggressiveness}\` (default: aggressive — surfaces merge candidates for review)`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("| --- | ---: |");
  lines.push(`| Total merge clusters | ${stats.clusters_exact_duplicate + stats.clusters_near_duplicate + stats.clusters_practical_merge_candidate} |`);
  lines.push(`| — exact_duplicate | ${stats.clusters_exact_duplicate} |`);
  lines.push(`| — near_duplicate | ${stats.clusters_near_duplicate} |`);
  lines.push(`| — practical_merge_candidate | ${stats.clusters_practical_merge_candidate} |`);
  lines.push(`| Input exercises | ${stats.input_exercise_count} |`);
  lines.push(`| Exercises in ≥1 cluster | ${stats.exercises_clustered_unique} |`);
  lines.push(`| Not in any cluster | ${stats.exercises_not_clustered} |`);
  lines.push(`| Rows removable (exact only) | ${stats.cumulative_rows_removable_if_exact_only} |`);
  lines.push(`| Rows removable (exact + near) | ${stats.cumulative_rows_removable_if_exact_and_near} |`);
  lines.push(`| Rows removable (all merge tiers) | ${stats.cumulative_rows_removable_if_all_merge_tiers} |`);
  lines.push(`| Clusters with ≥2 \`core\` members | ${stats.clusters_with_multiple_core} |`);
  lines.push(`| Dropped (oversized > ${config.max_cluster_size}) | ${stats.dropped_oversized} |`);
  lines.push(`| Dropped (low internal pairwise) | ${stats.dropped_low_internal} |`);
  lines.push(`| Related-but-separate pairs recorded | ${artifact.related_but_keep_separate.length} |`);
  lines.push("");

  lines.push("## Thresholds and config");
  lines.push("");
  lines.push("```json");
  lines.push(JSON.stringify(config, null, 2));
  lines.push("```");
  lines.push("");

  lines.push("### Redundancy tier cutoffs (min internal pairwise score)");
  lines.push("");
  lines.push(
    `- **exact_duplicate** ≥ ${config.redundancy_tiers.exact_duplicate}\n` +
      `- **near_duplicate** ≥ ${config.redundancy_tiers.near_duplicate}\n` +
      `- **practical_merge_candidate** ≥ ${config.redundancy_tiers.practical_merge_candidate}`
  );
  lines.push("");

  lines.push("### Factor weights");
  lines.push("");
  const w = config.weights;
  const weightRows = Object.entries(w)
    .map(([k, v]) => ({ k, v }))
    .sort((a, b) => b.v - a.v);
  lines.push("| Factor | Weight |");
  lines.push("| --- | ---: |");
  for (const { k, v } of weightRows) {
    lines.push(`| \`${k}\` | ${v} |`);
  }
  lines.push("");

  lines.push("## Largest clusters");
  lines.push("");
  for (const row of stats.largest_clusters) {
    lines.push(
      `- **${row.duplicate_cluster_id}** [${row.redundancy_tier}] — ${row.member_count} members — canonical \`${row.canonical_exercise_id}\``
    );
  }
  lines.push("");

  lines.push("## Sample: exact_duplicate");
  lines.push("");
  for (const c of artifact.clusters_exact_duplicate.slice(0, 20)) {
    lines.push(`- **${c.duplicate_cluster_id}**: ${c.member_exercise_ids.join(", ")}`);
  }
  if (!artifact.clusters_exact_duplicate.length) lines.push("_None._\n");
  lines.push("");

  lines.push("## Sample: practical_merge_candidate");
  lines.push("");
  for (const c of artifact.clusters_practical_merge_candidate.sort((a, b) => b.member_count - a.member_count).slice(0, 25)) {
    lines.push(`- **${c.duplicate_cluster_id}** (score ${c.cluster_score.toFixed(3)}): ${c.member_exercise_ids.join(", ")}`);
  }
  if (!artifact.clusters_practical_merge_candidate.length) lines.push("_None._\n");
  lines.push("");

  lines.push("## Suspicious skipped components");
  lines.push("");
  lines.push("### Oversized");
  lines.push(bulletList(stats.suspicious_oversized_sample.map((s) => `${s.member_count} members`)));
  lines.push("### Low internal pairwise");
  lines.push(
    bulletList(
      stats.suspicious_low_internal_sample.map(
        (s) => `${s.member_count} members (min ${s.min_internal_score.toFixed(3)})`
      )
    )
  );
  lines.push("");

  lines.push("## Member keep_category (cluster slots)");
  lines.push("");
  const kc = stats.member_keep_category_distribution;
  const kcKeys = Object.keys(kc).sort((a, b) => (kc[b] ?? 0) - (kc[a] ?? 0));
  lines.push("| keep_category | slots |");
  lines.push("| --- | ---: |");
  for (const key of kcKeys) {
    lines.push(`| ${key} | ${kc[key]} |`);
  }
  lines.push("");

  lines.push("## Clearly distinct pairs (sample of evaluated low-redundancy)");
  lines.push("");
  for (const b of artifact.clearly_distinct_pair_sample.slice(0, 20)) {
    lines.push(`- \`${b.a}\` / \`${b.b}\` — score ${b.score.toFixed(3)} — ${b.note}`);
  }
  if (!artifact.clearly_distinct_pair_sample.length) lines.push("_None in sample._\n");
  lines.push("");

  lines.push("## Blocked pairs (hard distinction — sample)");
  lines.push("");
  for (const b of blocked_pair_sample.slice(0, 25)) {
    lines.push(`- \`${b.a}\` / \`${b.b}\` — ${b.reason}`);
  }
  lines.push("");

  lines.push("## Notes");
  lines.push("");
  lines.push(
    "- Relationship question: **Should both survive as separate exercises in TodayFit?** — not biomechanical identity."
  );
  lines.push("- See also: `artifacts/exercise-library-reduction-summary.md`, `artifacts/exercise-duplicate-near-misses.json`.");
  lines.push("");

  return lines.join("\n");
}
