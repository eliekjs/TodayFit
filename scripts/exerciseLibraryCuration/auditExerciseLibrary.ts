/**
 * Read-only audit of the merged workout exercise catalog for library curation.
 * Does not modify production generator behavior or exercise records.
 *
 * Source of truth: data/workout-exercise-catalog.json (run scripts/exportWorkoutExerciseCatalog.ts to refresh).
 *
 * Run: npx tsx scripts/exerciseLibraryCuration/auditExerciseLibrary.ts
 * Optional: AUDIT_CATALOG_PATH=/abs/path/to/catalog.json npx tsx scripts/exerciseLibraryCuration/auditExerciseLibrary.ts
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import { join, resolve } from "path";
import type { WorkoutExerciseCatalogFile } from "../../logic/exerciseLibraryCuration/types";
import {
  computeExerciseLibraryAudit,
  formatExerciseLibraryAuditMarkdown,
  sortedCountEntries,
} from "../../logic/exerciseLibraryCuration/summaryStats";

const DEFAULT_RELATIVE_CATALOG = join("data", "workout-exercise-catalog.json");

function logSection(title: string) {
  console.log("");
  console.log(`── ${title} ──`);
}

function main() {
  const repoRoot = join(__dirname, "..", "..");
  const envPath = process.env.AUDIT_CATALOG_PATH?.trim();
  const catalogPath = envPath ? resolve(envPath) : join(repoRoot, DEFAULT_RELATIVE_CATALOG);

  if (!existsSync(catalogPath)) {
    console.error(`Catalog not found: ${catalogPath}`);
    console.error("Export it first: npx tsx scripts/exportWorkoutExerciseCatalog.ts");
    process.exit(1);
  }

  const raw = readFileSync(catalogPath, "utf8");
  const parsed = JSON.parse(raw) as WorkoutExerciseCatalogFile;
  if (!parsed.exercises || !Array.isArray(parsed.exercises)) {
    console.error("Invalid catalog: expected { exercises: [...] }");
    process.exit(1);
  }

  const report = computeExerciseLibraryAudit(catalogPath, parsed.exercises);
  const markdown = formatExerciseLibraryAuditMarkdown(report);

  const artifactsDir = join(repoRoot, "artifacts");
  mkdirSync(artifactsDir, { recursive: true });
  const jsonOut = join(artifactsDir, "exercise-library-audit.json");
  const mdOut = join(artifactsDir, "exercise-library-audit.md");
  writeFileSync(jsonOut, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(mdOut, markdown, "utf8");

  console.log("Exercise library audit");
  console.log(report.summary_line);
  console.log(`Wrote ${jsonOut}`);
  console.log(`Wrote ${mdOut}`);

  logSection("Coverage highlights");
  const inv = report.field_coverage.filter((f) => f.field_key.startsWith("inventory."));
  for (const row of inv.slice(0, 12)) {
    console.log(`  ${row.field_key}: present ${row.present_count} / ${report.total_exercises}`);
  }
  if (inv.length > 12) console.log(`  … ${inv.length - 12} more inventory fields (see JSON)`);

  logSection("Ontology highlights");
  const ont = report.field_coverage.filter((f) => f.field_key.startsWith("ontology."));
  for (const row of ont) {
    console.log(`  ${row.field_key}: present ${row.present_count} / ${report.total_exercises}`);
  }

  logSection("Target curation schema (extra.curation)");
  const cur = report.field_coverage.filter((f) => f.field_key.startsWith("curation."));
  for (const row of cur) {
    console.log(`  ${row.field_key}: present ${row.present_count} / ${report.total_exercises}`);
  }

  logSection("Uniques");
  console.log(`  equipment slugs: ${report.unique_counts.distinct_equipment_slugs}`);
  console.log(`  tags: ${report.unique_counts.distinct_tags}`);
  console.log(`  legacy movement_pattern: ${report.unique_counts.distinct_legacy_movement_patterns}`);
  console.log(`  ontology movement_patterns: ${report.unique_counts.distinct_ontology_movement_pattern_slugs}`);
  console.log(`  modalities: ${report.unique_counts.distinct_modalities}`);

  logSection("Top equipment");
  for (const { key, count } of sortedCountEntries(report.equipment_counts).slice(0, 15)) {
    console.log(`  ${key}: ${count}`);
  }

  logSection("Flags");
  const errors = report.flags.filter((f) => f.severity === "error").length;
  const warns = report.flags.filter((f) => f.severity === "warn").length;
  console.log(`  errors: ${errors}, warnings: ${warns}, total: ${report.flags.length}`);
}

main();
