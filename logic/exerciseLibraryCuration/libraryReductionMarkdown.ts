/**
 * Markdown for `artifacts/exercise-library-reduction-summary.md`.
 */

import type { DuplicateClustersArtifact, NearMissesArtifact } from "./duplicateClusterTypes";

export function formatLibraryReductionSummaryMarkdown(
  clustersArtifact: DuplicateClustersArtifact,
  nearMisses: NearMissesArtifact
): string {
  const s = clustersArtifact.stats;
  const c = clustersArtifact.config;
  const lines: string[] = [];

  lines.push("# Library reduction summary (redundancy clustering)");
  lines.push("");
  lines.push(`Generated: \`${clustersArtifact.generated_at}\``);
  lines.push("");
  lines.push("## Product framing");
  lines.push("");
  lines.push(
    "TodayFit is a **sport cross-training** decision engine. The clustering objective is **library reduction**: " +
      "surface redundancy so marginal variants can be removed or held back, not preserve every technically distinct exercise."
  );
  lines.push("");
  lines.push("## Aggressiveness mode");
  lines.push("");
  lines.push(`- **Selected:** \`${clustersArtifact.aggressiveness}\``);
  lines.push("- **Default:** `aggressive` — lower merge thresholds, broader candidate neighborhoods, movement/equipment-weighted similarity.");
  lines.push("");
  lines.push("### How this differs from the previous conservative duplicate detector");
  lines.push("");
  lines.push("| Aspect | Before (conservative) | Now (aggressive default) |");
  lines.push("| --- | --- | --- |");
  lines.push("| Edge threshold | ~0.78 | ~0.52 |");
  lines.push("| Min internal pairwise | ~0.62 | ~0.42 |");
  lines.push("| Bulgarian vs RFESS | Often blocked | Normalized to same family for matching |");
  lines.push("| Step-up vs split squat | Broad blocks | Narrow: step-up **without** split squat vs split family |");
  lines.push("| Candidate pairs | Name window + tokens | + movement×equipment buckets, role×equipment, muscle overlap |");
  lines.push("| Output | Single “confidence” band | **exact_duplicate / near_duplicate / practical_merge_candidate** + related-but-separate |");
  lines.push("");

  lines.push("## Thresholds (this run)");
  lines.push("");
  lines.push("| Parameter | Value |");
  lines.push("| --- | ---: |");
  lines.push(`| edge_threshold | ${c.edge_threshold} |`);
  lines.push(`| min_internal_pair_score | ${c.min_internal_pair_score} |`);
  lines.push(`| max_cluster_size | ${c.max_cluster_size} |`);
  lines.push(`| tier exact_duplicate | ≥ ${c.redundancy_tiers.exact_duplicate} |`);
  lines.push(`| tier near_duplicate | ≥ ${c.redundancy_tiers.near_duplicate} |`);
  lines.push(`| tier practical_merge_candidate | ≥ ${c.redundancy_tiers.practical_merge_candidate} |`);
  lines.push("");

  lines.push("## Expected impact (row reduction if collapsed to canonical per cluster)");
  lines.push("");
  lines.push("| Scenario | Clusters | Rows removable (non-canonical) |");
  lines.push("| --- | ---: | ---: |");
  lines.push(`| Exact duplicates only | ${s.clusters_exact_duplicate} | ${s.cumulative_rows_removable_if_exact_only} |`);
  lines.push(`| Exact + near duplicates | ${s.clusters_exact_duplicate + s.clusters_near_duplicate} | ${s.cumulative_rows_removable_if_exact_and_near} |`);
  lines.push(`| All merge tiers (incl. practical) | ${s.clusters_exact_duplicate + s.clusters_near_duplicate + s.clusters_practical_merge_candidate} | ${s.cumulative_rows_removable_if_all_merge_tiers} |`);
  lines.push("");
  lines.push(
    `_“Rows removable”_ = sum of (member_count − 1) per cluster in that tier set; assumes one canonical per cluster. No rows were deleted in this phase.`
  );
  lines.push("");

  lines.push("## Exercises affected");
  lines.push("");
  lines.push(`- **In at least one merge cluster:** ${s.exercises_clustered_unique}`);
  lines.push(`- **In no merge cluster:** ${s.exercises_not_clustered}`);
  lines.push("");

  lines.push("## Biggest redundancy families (movement + equipment)");
  lines.push("");
  lines.push("| Key (movement patterns @@ equipment) | Member slots in clusters |");
  lines.push("| --- | ---: |");
  for (const row of s.redundancy_family_top_movement_equipment.slice(0, 20)) {
    lines.push(`| \`${row.key}\` | ${row.member_slots} |`);
  }
  lines.push("");

  lines.push("## Biggest redundancy families (primary_role + equipment)");
  lines.push("");
  lines.push("| Key | Member slots |");
  lines.push("| --- | ---: |");
  for (const row of s.redundancy_family_top_primary_role.slice(0, 15)) {
    lines.push(`| \`${row.key}\` | ${row.member_slots} |`);
  }
  lines.push("");

  lines.push("## Near-misses artifact");
  lines.push("");
  lines.push(`- File: \`artifacts/exercise-duplicate-near-misses.json\``);
  lines.push(`- Pairs sampled: ${nearMisses.near_misses.length} (limit ${nearMisses.sample_limit})`);
  lines.push("");

  lines.push("## How to inspect outputs");
  lines.push("");
  lines.push("1. **Exact / near:** `clusters_exact_duplicate`, `clusters_near_duplicate` in `exercise-duplicate-clusters.json`.");
  lines.push("2. **Broader merge candidates (noisier):** `clusters_practical_merge_candidate`.");
  lines.push("3. **Must stay separate (programming distinction):** `related_but_keep_separate` — uses hard-distinction codes (e.g. pulldown vs pull-up).");
  lines.push("4. **Borderline:** `exercise-duplicate-near-misses.json` — just below merge edge or blocked despite high hypothetical score.");
  lines.push("");

  lines.push("## Mergeable trivia (intentionally downweighted)");
  lines.push("");
  lines.push("- Alternating vs non-alternating, basic/standard, filler words (exercise, drill, variation), many grip/setup synonyms.");
  lines.push("- Bulgarian split squat ↔ rear-foot-elevated split squat phrasing (normalized for redundancy).");
  lines.push("");

  lines.push("## Protected distinctions (hard block — not merged)");
  lines.push("");
  lines.push("- Pulldown vs bar pull-up/chin-up; goblet vs front squat; hip thrust vs RDL family; step-up-only vs split-squat family; pallof vs plank; horizontal vs vertical pull when patterns diverge.");
  lines.push("");

  return lines.join("\n");
}
