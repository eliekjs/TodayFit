/**
 * Summary and aggregation helpers for exercise library curation audits.
 */

import { EXERCISE_LIBRARY_CURATION_SCHEMA_VERSION } from "./enums";
import type {
  CatalogExerciseRow,
  ExerciseAuditFlag,
  ExerciseCurationProfile,
  ExerciseLibraryAuditReport,
  FieldCoverageStat,
} from "./types";

const SUSPICIOUS_NAME_PATTERNS: RegExp[] = [
  /\[test\]/i,
  /\btest\b/i,
  /\bdeprecated\b/i,
  /\bplaceholder\b/i,
  /\blorem\b/i,
  /\bxxx\b/i,
  /\btodo\b/i,
];

function nonEmptyArray<T>(a: T[] | null | undefined): boolean {
  return Array.isArray(a) && a.length > 0;
}

function filledString(s: string | null | undefined): boolean {
  return typeof s === "string" && s.trim().length > 0;
}

/** Increment a string-key counter map (deterministic aggregation). */
export function incrementCount(map: Record<string, number>, key: string, delta = 1): void {
  const k = key.trim() || "(empty)";
  map[k] = (map[k] ?? 0) + delta;
}

/** Increment counts for each token in a list (e.g. equipment slugs). */
export function countTokens(map: Record<string, number>, tokens: string[] | null | undefined): void {
  if (!nonEmptyArray(tokens)) return;
  for (const t of tokens!) {
    incrementCount(map, t.toLowerCase(), 1);
  }
}

/** Sort count map entries by count desc, then key asc. */
export function sortedCountEntries(map: Record<string, number>): { key: string; count: number }[] {
  return Object.entries(map)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => (b.count !== a.count ? b.count - a.count : a.key.localeCompare(b.key)));
}

export function distinctKeyCount(map: Record<string, number>): number {
  return Object.keys(map).length;
}

function readCurationFromExtra(extra: Record<string, unknown>): Partial<ExerciseCurationProfile> | null {
  const raw = extra.curation;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as Partial<ExerciseCurationProfile>;
}

function isPresentCurationField(
  profile: Partial<ExerciseCurationProfile> | null,
  key: keyof ExerciseCurationProfile
): boolean {
  if (!profile) return false;
  const v = profile[key];
  if (v === undefined || v === null) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "string") return v.trim().length > 0;
  return true;
}

const CURATION_FIELD_KEYS: (keyof ExerciseCurationProfile)[] = [
  "primary_role",
  "movement_patterns",
  "equipment_class",
  "complexity",
  "keep_category",
  "generator_state",
];

type CoverageRow = { present: number; missing: number };

function bumpCoverage(m: Map<string, CoverageRow>, fieldKey: string, present: boolean): void {
  const row = m.get(fieldKey) ?? { present: 0, missing: 0 };
  if (present) row.present += 1;
  else row.missing += 1;
  m.set(fieldKey, row);
}

/**
 * Build a full audit report for the merged workout exercise catalog (read-only).
 */
export function computeExerciseLibraryAudit(
  catalogPath: string,
  exercises: CatalogExerciseRow[]
): ExerciseLibraryAuditReport {
  const total = exercises.length;
  const coverage = new Map<string, CoverageRow>();
  const equipmentCounts: Record<string, number> = {};
  const tagCounts: Record<string, number> = {};
  const legacyMovementPatternCounts: Record<string, number> = {};
  const ontologyMovementPatternCounts: Record<string, number> = {};
  const modalityCounts: Record<string, number> = {};

  const flags: ExerciseAuditFlag[] = [];
  const idOccurrences = new Map<string, number>();
  let curationProfileRows = 0;

  for (const row of exercises) {
    const id = row.id ?? "";
    idOccurrences.set(id, (idOccurrences.get(id) ?? 0) + 1);

    bumpCoverage(coverage, "inventory.id", filledString(id));
    bumpCoverage(coverage, "inventory.name", filledString(row.name));
    bumpCoverage(coverage, "inventory.description", filledString(row.description));
    bumpCoverage(coverage, "inventory.equipment", nonEmptyArray(row.equipment));
    bumpCoverage(coverage, "inventory.tags", nonEmptyArray(row.tags));
    bumpCoverage(coverage, "inventory.modalities", nonEmptyArray(row.modalities));
    bumpCoverage(coverage, "inventory.muscles", nonEmptyArray(row.muscles));
    bumpCoverage(coverage, "inventory.movement_pattern_legacy", filledString(row.movement_pattern));
    bumpCoverage(coverage, "inventory.ontology_blob", row.ontology != null);
    bumpCoverage(coverage, "ontology.primary_movement_family", filledString(row.ontology?.primary_movement_family));
    bumpCoverage(
      coverage,
      "ontology.movement_patterns",
      nonEmptyArray(row.ontology?.movement_patterns ?? undefined)
    );
    bumpCoverage(coverage, "ontology.exercise_role", filledString(row.ontology?.exercise_role));
    bumpCoverage(coverage, "ontology.pairing_category", filledString(row.ontology?.pairing_category));
    bumpCoverage(coverage, "ontology.fatigue_regions", nonEmptyArray(row.ontology?.fatigue_regions ?? undefined));
    bumpCoverage(coverage, "ontology.joint_stress_tags", nonEmptyArray(row.ontology?.joint_stress_tags ?? undefined));

    const curation = readCurationFromExtra(row.extra);
    if (curation && Object.keys(curation).length > 0) curationProfileRows += 1;

    for (const k of CURATION_FIELD_KEYS) {
      bumpCoverage(coverage, `curation.${String(k)}`, isPresentCurationField(curation, k));
    }

    countTokens(equipmentCounts, row.equipment);
    countTokens(tagCounts, row.tags);
    countTokens(modalityCounts, row.modalities);

    if (filledString(row.movement_pattern)) {
      incrementCount(legacyMovementPatternCounts, row.movement_pattern!.toLowerCase(), 1);
    }

    const omp = row.ontology?.movement_patterns;
    if (nonEmptyArray(omp)) {
      for (const p of omp!) {
        incrementCount(ontologyMovementPatternCounts, String(p).toLowerCase(), 1);
      }
    }

    if (!filledString(id)) {
      flags.push({
        exercise_id: id || "(empty)",
        code: "malformed_missing_id",
        severity: "error",
        message: "Exercise row is missing a non-empty id.",
      });
    }

    if (filledString(row.name) && SUSPICIOUS_NAME_PATTERNS.some((re) => re.test(row.name))) {
      flags.push({
        exercise_id: id,
        code: "suspicious_name",
        severity: "warn",
        message: `Name may be a placeholder or test content: "${row.name}"`,
      });
    }

    const sparseSignals = [
      nonEmptyArray(row.equipment),
      nonEmptyArray(row.tags),
      row.ontology != null,
      filledString(row.movement_pattern),
      filledString(row.description),
    ];
    const filledSignals = sparseSignals.filter(Boolean).length;
    if (filledSignals < 2) {
      flags.push({
        exercise_id: id,
        code: "sparse_metadata",
        severity: "warn",
        message:
          "Few catalog signals present (equipment, tags, ontology, legacy movement_pattern, description). Review enrichment.",
      });
    }
  }

  const duplicateIds: string[] = [];
  for (const [eid, n] of idOccurrences.entries()) {
    if (n > 1) duplicateIds.push(eid);
  }
  duplicateIds.sort((a, b) => a.localeCompare(b));
  for (const eid of duplicateIds) {
    flags.push({
      exercise_id: eid,
      code: "duplicate_id",
      severity: "error",
      message: `Duplicate exercise id appears ${idOccurrences.get(eid)} times in catalog.`,
    });
  }

  const field_coverage: FieldCoverageStat[] = [...coverage.entries()]
    .map(([field_key, v]) => ({
      field_key,
      present_count: v.present,
      missing_count: v.missing,
    }))
    .sort((a, b) => a.field_key.localeCompare(b.field_key));

  const summary_line = `Exercises: ${total}; flags: ${flags.length}; duplicate ids: ${duplicateIds.length}; curation profiles in extra: ${curationProfileRows}`;

  return {
    schema_version: EXERCISE_LIBRARY_CURATION_SCHEMA_VERSION,
    generated_at: new Date().toISOString(),
    catalog_path: catalogPath,
    total_exercises: total,
    curation_profile_rows: curationProfileRows,
    field_coverage,
    equipment_counts: equipmentCounts,
    tag_counts: tagCounts,
    legacy_movement_pattern_counts: legacyMovementPatternCounts,
    ontology_movement_pattern_counts: ontologyMovementPatternCounts,
    modality_counts: modalityCounts,
    unique_counts: {
      distinct_equipment_slugs: distinctKeyCount(equipmentCounts),
      distinct_tags: distinctKeyCount(tagCounts),
      distinct_legacy_movement_patterns: distinctKeyCount(legacyMovementPatternCounts),
      distinct_ontology_movement_pattern_slugs: distinctKeyCount(ontologyMovementPatternCounts),
      distinct_modalities: distinctKeyCount(modalityCounts),
    },
    flags,
    duplicate_ids: duplicateIds.sort(),
    summary_line,
  };
}

/** Render a compact markdown report for humans (pairs with JSON artifact). */
export function formatExerciseLibraryAuditMarkdown(report: ExerciseLibraryAuditReport): string {
  const lines: string[] = [];
  lines.push(`# Exercise library audit`);
  lines.push(``);
  lines.push(`- **Generated:** ${report.generated_at}`);
  lines.push(`- **Catalog:** \`${report.catalog_path}\``);
  lines.push(`- **Schema version:** ${report.schema_version}`);
  lines.push(`- **${report.summary_line}**`);
  lines.push(``);
  lines.push(`## Coverage (inventory + ontology)`);
  lines.push(`| Field | Present | Missing |`);
  lines.push(`| --- | ---: | ---: |`);
  for (const row of report.field_coverage.filter((f) => f.field_key.startsWith("inventory.") || f.field_key.startsWith("ontology."))) {
    lines.push(`| ${row.field_key} | ${row.present_count} | ${row.missing_count} |`);
  }
  lines.push(``);
  lines.push(`## Target curation schema (from \`extra.curation\` when present)`);
  lines.push(`| Field | Present | Missing |`);
  lines.push(`| --- | ---: | ---: |`);
  for (const row of report.field_coverage.filter((f) => f.field_key.startsWith("curation."))) {
    lines.push(`| ${row.field_key} | ${row.present_count} | ${row.missing_count} |`);
  }
  lines.push(``);
  lines.push(`## Uniques`);
  lines.push(`- Distinct equipment slugs: **${report.unique_counts.distinct_equipment_slugs}**`);
  lines.push(`- Distinct tags: **${report.unique_counts.distinct_tags}**`);
  lines.push(`- Distinct legacy movement_pattern: **${report.unique_counts.distinct_legacy_movement_patterns}**`);
  lines.push(`- Distinct ontology movement_pattern slugs: **${report.unique_counts.distinct_ontology_movement_pattern_slugs}**`);
  lines.push(`- Distinct modalities: **${report.unique_counts.distinct_modalities}**`);
  lines.push(``);
  lines.push(`## Top equipment (up to 25)`);
  for (const { key, count } of sortedCountEntries(report.equipment_counts).slice(0, 25)) {
    lines.push(`- ${key}: ${count}`);
  }
  lines.push(``);
  lines.push(`## Top tags (up to 25)`);
  for (const { key, count } of sortedCountEntries(report.tag_counts).slice(0, 25)) {
    lines.push(`- ${key}: ${count}`);
  }
  lines.push(``);
  lines.push(`## Legacy movement_pattern (top 25)`);
  for (const { key, count } of sortedCountEntries(report.legacy_movement_pattern_counts).slice(0, 25)) {
    lines.push(`- ${key}: ${count}`);
  }
  lines.push(``);
  lines.push(`## Ontology movement_patterns (top 25)`);
  for (const { key, count } of sortedCountEntries(report.ontology_movement_pattern_counts).slice(0, 25)) {
    lines.push(`- ${key}: ${count}`);
  }
  lines.push(``);
  lines.push(`## Flags (${report.flags.length})`);
  const bySev = { error: 0, warn: 0, info: 0 };
  for (const f of report.flags) bySev[f.severity] += 1;
  lines.push(`- errors: ${bySev.error}, warnings: ${bySev.warn}, info: ${bySev.info}`);
  lines.push(``);
  const show = report.flags.slice(0, 200);
  for (const f of show) {
    lines.push(`- **${f.exercise_id}** [${f.severity}] \`${f.code}\`: ${f.message}`);
  }
  if (report.flags.length > show.length) {
    lines.push(`- … ${report.flags.length - show.length} more (see JSON)`);
  }
  lines.push(``);
  return lines.join("\n");
}
