/**
 * Deterministic prefill over the merged workout exercise catalog (read-only; staging artifacts only).
 *
 * Run: npx tsx scripts/exerciseLibraryCuration/runPrefillRules.ts
 * Optional: PREFILL_CATALOG_PATH=/abs/path/catalog.json
 * Optional: PREFILL_MIN_CONFIDENCE=0.75 PREFILL_HIGH_CONFIDENCE=0.88
 * Optional: CURATION_PREFILL_WRITE_EXTRA=1 writes artifacts/exercise-curation-staging-catalog.json (merged extra.curation; does not touch data/).
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import { join, resolve } from "path";
import { EXERCISE_LIBRARY_CURATION_SCHEMA_VERSION } from "../../logic/exerciseLibraryCuration/enums";
import {
  buildEquipmentPrefillAudit,
  type EquipmentLockRefinementEvent,
  type EquipmentPrefillEquipmentAudit,
} from "../../logic/exerciseLibraryCuration/prefillEquipmentLockRefinement";
import {
  computePrefillStats,
  formatPrefillMarkdown,
  mergeCatalogRowWithPrefillCuration,
  runPrefillForCatalog,
  DEFAULT_OPTIONS,
} from "../../logic/exerciseLibraryCuration/prefillRules";
import {
  computePrefillDiagnostics,
  computeTrustTierFieldSummary,
  formatPrefillDiagnosticsMarkdown,
  formatTrustTierSummaryMarkdown,
} from "../../logic/exerciseLibraryCuration/prefillDiagnostics";
import type { PrefillRunArtifact, WorkoutExerciseCatalogFile } from "../../logic/exerciseLibraryCuration/types";

const DEFAULT_RELATIVE_CATALOG = join("data", "workout-exercise-catalog.json");

function envFloat(name: string, fallback: number): number {
  const v = process.env[name]?.trim();
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function logSection(title: string) {
  console.log("");
  console.log(`── ${title} ──`);
}

function main() {
  const repoRoot = join(__dirname, "..", "..");
  const catalogPath = process.env.PREFILL_CATALOG_PATH?.trim()
    ? resolve(process.env.PREFILL_CATALOG_PATH!.trim())
    : join(repoRoot, DEFAULT_RELATIVE_CATALOG);

  if (!existsSync(catalogPath)) {
    console.error(`Catalog not found: ${catalogPath}`);
    console.error("Export it first: npx tsx scripts/exportWorkoutExerciseCatalog.ts");
    process.exit(1);
  }

  const minConfidence = envFloat("PREFILL_MIN_CONFIDENCE", DEFAULT_OPTIONS.min_confidence);
  const highThreshold = envFloat("PREFILL_HIGH_CONFIDENCE", DEFAULT_OPTIONS.high_confidence_threshold);
  const persistStaging = process.env.CURATION_PREFILL_WRITE_EXTRA === "1" || process.env.CURATION_PREFILL_WRITE_EXTRA === "true";

  const raw = readFileSync(catalogPath, "utf8");
  const parsed = JSON.parse(raw) as WorkoutExerciseCatalogFile;
  if (!parsed.exercises?.length) {
    console.error("Invalid catalog: expected non-empty exercises[]");
    process.exit(1);
  }

  const options = { min_confidence: minConfidence, high_confidence_threshold: highThreshold };
  const equipmentEvents: EquipmentLockRefinementEvent[] = [];
  const records = runPrefillForCatalog(parsed.exercises, options, (e) => equipmentEvents.push(e));
  const stats = computePrefillStats(records, options);
  const diagnostics = computePrefillDiagnostics(records);
  const trustSummary = computeTrustTierFieldSummary(records);

  const artifact: PrefillRunArtifact = {
    schema_version: EXERCISE_LIBRARY_CURATION_SCHEMA_VERSION,
    generated_at: new Date().toISOString(),
    catalog_path: catalogPath,
    options: { ...options, persist_extra_curation_staging: persistStaging },
    exercise_count: parsed.exercises.length,
    records,
    stats,
    diagnostics,
  };

  const artifactsDir = join(repoRoot, "artifacts");
  mkdirSync(artifactsDir, { recursive: true });
  const jsonPath = join(artifactsDir, "exercise-curation-prefill.json");
  const mdPath = join(artifactsDir, "exercise-curation-prefill.md");
  const diagJsonPath = join(artifactsDir, "exercise-curation-prefill-diagnostics.json");
  const diagMdPath = join(artifactsDir, "exercise-curation-prefill-diagnostics.md");
  const rowById = new Map(parsed.exercises.map((r) => [r.id, r]));
  const equipmentAudit = buildEquipmentPrefillAudit(records, rowById, equipmentEvents);
  const equipmentAuditJsonPath = join(artifactsDir, "exercise-curation-prefill-equipment-audit.json");
  const equipmentAuditMdPath = join(artifactsDir, "exercise-curation-prefill-equipment-audit.md");
  writeFileSync(jsonPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  writeFileSync(
    mdPath,
    `${formatPrefillMarkdown(catalogPath, options, stats, persistStaging)}\n${formatTrustTierSummaryMarkdown(trustSummary)}\nSee **\`exercise-curation-prefill-diagnostics.md\`** for movement/equipment breakdowns.\n`,
    "utf8"
  );
  writeFileSync(diagJsonPath, `${JSON.stringify(diagnostics, null, 2)}\n`, "utf8");
  writeFileSync(diagMdPath, formatPrefillDiagnosticsMarkdown(diagnostics), "utf8");
  writeFileSync(equipmentAuditJsonPath, `${JSON.stringify(equipmentAudit, null, 2)}\n`, "utf8");
  writeFileSync(
    equipmentAuditMdPath,
    `${formatEquipmentPrefillAuditMarkdown(equipmentAudit)}\n`,
    "utf8"
  );

  if (persistStaging) {
    const stagingPath = join(artifactsDir, "exercise-curation-staging-catalog.json");
    const stagedExercises = parsed.exercises.map((row, i) => mergeCatalogRowWithPrefillCuration(row, records[i]!.prefill));
    const staged: WorkoutExerciseCatalogFile = { exercises: stagedExercises };
    writeFileSync(stagingPath, `${JSON.stringify(staged, null, 2)}\n`, "utf8");
    console.log(`Wrote staging catalog (extra.curation merge): ${stagingPath}`);
  }

  console.log("Exercise curation prefill (deterministic)");
  console.log(`Catalog: ${catalogPath}`);
  console.log(`Exercises: ${stats.total_exercises}`);
  console.log(`Wrote ${jsonPath}`);
  console.log(`Wrote ${mdPath}`);
  console.log(`Wrote ${diagJsonPath}`);
  console.log(`Wrote ${diagMdPath}`);
  console.log(`Wrote ${equipmentAuditJsonPath}`);
  console.log(`Wrote ${equipmentAuditMdPath}`);

  logSection("Coverage (fraction with field assigned)");
  for (const [k, v] of Object.entries(stats.coverage_fraction)) {
    console.log(`  ${k}: ${(v * 100).toFixed(1)}%`);
  }

  logSection("Assignment counts (high vs low confidence)");
  const keys = [
    "primary_role",
    "movement_patterns",
    "equipment_class",
    "complexity",
    "sport_transfer_tags",
  ] as const;
  for (const k of keys) {
    console.log(
      `  ${k}: total ${stats.assigned_counts[k]} | high ${stats.high_confidence_counts[k]} | low ${stats.low_confidence_counts[k]}`
    );
  }

  logSection("Top reason codes");
  for (const { code, count } of stats.top_reason_codes.slice(0, 20)) {
    console.log(`  ${code}: ${count}`);
  }

  logSection("Trust tiers (per field)");
  console.log(
    `  movement_patterns: locked ${trustSummary.movement_patterns.locked} | strong ${trustSummary.movement_patterns.strong_prior} | weak ${trustSummary.movement_patterns.weak_prior}`
  );
  console.log(
    `  primary_role: locked ${trustSummary.primary_role.locked} | strong ${trustSummary.primary_role.strong_prior} | weak ${trustSummary.primary_role.weak_prior}`
  );
  console.log(
    `  equipment_class: locked ${trustSummary.equipment_class.locked} | strong ${trustSummary.equipment_class.strong_prior} | weak ${trustSummary.equipment_class.weak_prior}`
  );
  console.log(`  mixed equipment rows: ${diagnostics.mixed_equipment.count}`);

  logSection("Equipment lock refinement (phase 2)");
  console.log(
    `  replaced bodyweight with name/slug hint: ${equipmentAudit.counts.replaced_bodyweight_with_hint}`
  );
  console.log(`  downgraded lock (hint vs structured): ${equipmentAudit.counts.downgraded_lock_tier_mismatch}`);
  console.log(
    `  downgraded lock (bodyweight text vs loaded): ${equipmentAudit.counts.downgraded_lock_bodyweight_text_vs_loaded}`
  );
  const lockDowngrades =
    equipmentAudit.counts.downgraded_lock_tier_mismatch +
    equipmentAudit.counts.downgraded_lock_bodyweight_text_vs_loaded;
  console.log(`  total lock tier downgrades: ${lockDowngrades}`);
}

function formatEquipmentPrefillAuditMarkdown(a: EquipmentPrefillEquipmentAudit): string {
  const lines: string[] = [];
  lines.push(`# Exercise curation — equipment prefill audit`);
  lines.push(``);
  lines.push(`- **Generated:** ${a.generated_at}`);
  lines.push(`- **Exercises:** ${a.exercise_count}`);
  lines.push(`- **Replaced bodyweight → implement hint:** ${a.counts.replaced_bodyweight_with_hint}`);
  lines.push(`- **Downgraded lock (structured vs name/slug):** ${a.counts.downgraded_lock_tier_mismatch}`);
  lines.push(`- **Downgraded lock (bodyweight text vs loaded implement):** ${a.counts.downgraded_lock_bodyweight_text_vs_loaded}`);
  lines.push(
    `- **Total lock tier downgrades:** ${a.counts.downgraded_lock_tier_mismatch + a.counts.downgraded_lock_bodyweight_text_vs_loaded}`
  );
  lines.push(``);
  lines.push(`## Locked equipment_class by primary reason_code (after refinement)`);
  for (const { reason, count } of a.locked_equipment_by_primary_reason.slice(0, 40)) {
    lines.push(`- **${reason}:** ${count}`);
  }
  lines.push(``);
  lines.push(`## Sample refinement events (up to 40)`);
  for (const row of a.sample_resolved_rows.slice(0, 15)) {
    lines.push(`- **${row.exercise_id}** (${row.name ?? "?"}) — \`${row.event.kind}\``);
    lines.push(`  - after: \`${JSON.stringify(row.equipment_after?.value ?? null)}\` tier=${row.equipment_after?.trust_tier ?? "?"}`);
  }
  lines.push(``);
  return lines.join("\n");
}

main();
