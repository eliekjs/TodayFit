/**
 * Human-readable summary for `artifacts/exercise-duplicate-clusters.md`.
 */

import type { DuplicateClustersArtifact } from "./duplicateClusterTypes";

function bulletList(items: string[]): string {
  if (!items.length) return "_None._\n";
  return items.map((x) => `- ${x}`).join("\n") + "\n";
}

/**
 * Build markdown documenting duplicate clustering output, thresholds, and QA sections.
 */
export function formatDuplicateClusterSummaryMarkdown(artifact: DuplicateClustersArtifact): string {
  const { stats, config, clusters, blocked_pair_sample, generated_at } = artifact;
  const lines: string[] = [];

  lines.push("# Exercise duplicate clusters (phase 4)");
  lines.push("");
  lines.push(`Generated: \`${generated_at}\``);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("| --- | ---: |");
  lines.push(`| Total clusters (multi-member) | ${stats.total_clusters} |`);
  lines.push(`| Input exercises | ${stats.input_exercise_count} |`);
  lines.push(`| Exercises in at least one cluster | ${stats.exercises_clustered_unique} |`);
  lines.push(`| Exercises not in any cluster | ${stats.exercises_not_clustered} |`);
  lines.push(`| High-confidence clusters | ${stats.by_band.high} |`);
  lines.push(`| Medium-confidence clusters | ${stats.by_band.medium} |`);
  lines.push(`| Low-confidence clusters | ${stats.by_band.low} |`);
  lines.push(`| Clusters with ≥2 \`core\` members | ${stats.clusters_with_multiple_core} |`);
  lines.push(`| Dropped (oversized > ${config.max_cluster_size}) | ${stats.dropped_oversized} |`);
  lines.push(`| Dropped (low internal pairwise) | ${stats.dropped_low_internal} |`);
  lines.push("");

  lines.push("## Thresholds and config");
  lines.push("");
  lines.push("```json");
  lines.push(JSON.stringify(config, null, 2));
  lines.push("```");
  lines.push("");

  lines.push("### Factor weights (relative emphasis)");
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
  lines.push(
    `**Edge threshold:** pairwise score ≥ **${config.edge_threshold}** to merge. ` +
      `**Internal minimum:** **${config.min_internal_pair_score}** (complete-linkage style check). ` +
      `**Bands:** high ≥ **${config.bands.high}**, medium ≥ **${config.bands.medium}**.`
  );
  lines.push("");

  lines.push("## Largest clusters");
  lines.push("");
  for (const row of stats.largest_clusters) {
    lines.push(
      `- **${row.duplicate_cluster_id}** — ${row.member_count} members — canonical \`${row.canonical_exercise_id}\``
    );
  }
  lines.push("");

  lines.push("## Top canonical selections (by cluster size)");
  lines.push("");
  const topCanon = [...clusters].sort((a, b) => b.member_count - a.member_count).slice(0, 25);
  for (const c of topCanon) {
    lines.push(
      `- **${c.duplicate_cluster_id}** (${c.cluster_confidence}, score ${c.cluster_score.toFixed(3)}): ` +
        `\`${c.canonical_exercise_id}\` ← ${c.member_count} members`
    );
  }
  lines.push("");

  lines.push("## Likely merge groups (high + medium confidence)");
  lines.push("");
  const mergeGroups = clusters
    .filter((c) => c.cluster_confidence === "high" || c.cluster_confidence === "medium")
    .sort((a, b) => b.member_count - a.member_count)
    .slice(0, 40);
  for (const c of mergeGroups) {
    lines.push(`- **${c.duplicate_cluster_id}** [${c.cluster_confidence}]: ${c.member_exercise_ids.join(", ")}`);
  }
  if (!mergeGroups.length) lines.push("_None._\n");
  lines.push("");

  lines.push("## Related-but-distinct neighbors (low confidence)");
  lines.push("");
  const lowOnly = clusters.filter((c) => c.cluster_confidence === "low").sort((a, b) => b.member_count - a.member_count).slice(0, 25);
  for (const c of lowOnly) {
    lines.push(`- **${c.duplicate_cluster_id}** (${c.member_count}): ${c.member_exercise_ids.join(", ")}`);
  }
  if (!lowOnly.length) lines.push("_None._\n");
  lines.push("");

  lines.push("## Suspicious over-clustering (skipped components)");
  lines.push("");
  lines.push("### Oversized (exceeded max cluster size)");
  lines.push(bulletList(stats.suspicious_oversized_sample.map((s) => `${s.member_count} members`)));
  lines.push("### Low internal pairwise score");
  lines.push(
    bulletList(
      stats.suspicious_low_internal_sample.map(
        (s) => `${s.member_count} members (min internal ${s.min_internal_score.toFixed(3)})`
      )
    )
  );
  lines.push("");

  lines.push("## Member keep_category distribution (cluster memberships)");
  lines.push("");
  const kc = stats.member_keep_category_distribution;
  const kcKeys = Object.keys(kc).sort((a, b) => (kc[b] ?? 0) - (kc[a] ?? 0));
  lines.push("| keep_category | member slots |");
  lines.push("| --- | ---: |");
  for (const key of kcKeys) {
    lines.push(`| ${key} | ${kc[key]} |`);
  }
  lines.push("");

  lines.push("## Anti-distinct blocked pairs (sample)");
  lines.push("");
  lines.push("_Pairs blocked by redundancy heuristics (e.g. pulldown vs pull-up); see `blocked_pair_sample` in JSON._");
  lines.push("");
  for (const b of blocked_pair_sample.slice(0, 30)) {
    lines.push(`- \`${b.a}\` / \`${b.b}\` — ${b.reason}`);
  }
  lines.push("");

  lines.push("## Notes");
  lines.push("");
  lines.push(
    "- Clustering is **deterministic**; tune `edge_threshold`, `min_internal_pair_score`, and `max_cluster_size` via env / config JSON."
  );
  lines.push("- Canonical choice uses metadata completeness, `keep_category`, LLM confidence, and ambiguity — not usage data (pluggable later).");
  lines.push("");

  return lines.join("\n");
}
