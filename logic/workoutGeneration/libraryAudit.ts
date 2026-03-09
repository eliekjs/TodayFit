/**
 * Phase 10: Developer-facing library audit utility.
 * Scans the exercise library and reports missing or weak ontology fields.
 * Output is deterministic and easy to review in console or tests.
 */

import type { ExerciseForNormalization } from "./ontologyNormalization";
import {
  getCanonicalExerciseRole,
  getCanonicalMovementFamilies,
  getCanonicalMovementPatterns,
  getCanonicalFatigueRegions,
  getCanonicalJointStressTags,
  getCanonicalMobilityTargets,
  getCanonicalStretchTargets,
  isCanonicalCompound,
  isCanonicalIsolation,
} from "./ontologyNormalization";

export interface AuditFinding {
  exercise_id: string;
  field: string;
  severity: "missing" | "weak" | "suspicious";
  message: string;
}

export interface LibraryAuditReport {
  total_exercises: number;
  findings: AuditFinding[];
  by_field: Record<string, AuditFinding[]>;
  summary: Record<string, number>;
}

function norm(s: string | undefined): string {
  if (!s) return "";
  return s.toLowerCase().replace(/\s/g, "_");
}

/**
 * Run ontology audit on a list of exercises. Deterministic; safe for tests.
 */
export function auditExerciseLibrary(exercises: ExerciseForNormalization[]): LibraryAuditReport {
  const findings: AuditFinding[] = [];
  const by_field: Record<string, AuditFinding[]> = {};

  for (const ex of exercises) {
    const id = ex.id;

    if (!ex.exercise_role && getCanonicalExerciseRole(ex) === undefined) {
      const f: AuditFinding = { exercise_id: id, field: "exercise_role", severity: "missing", message: "missing exercise_role" };
      findings.push(f);
      (by_field["exercise_role"] = by_field["exercise_role"] ?? []).push(f);
    }

    const { primary } = getCanonicalMovementFamilies(ex);
    if (!primary && !ex.primary_movement_family) {
      const f: AuditFinding = { exercise_id: id, field: "primary_movement_family", severity: "missing", message: "missing primary_movement_family" };
      findings.push(f);
      (by_field["primary_movement_family"] = by_field["primary_movement_family"] ?? []).push(f);
    }

    const patterns = getCanonicalMovementPatterns(ex);
    if (!patterns.length && !ex.movement_patterns?.length) {
      const f: AuditFinding = { exercise_id: id, field: "movement_patterns", severity: "weak", message: "missing movement_patterns (relying on legacy movement_pattern only)" };
      findings.push(f);
      (by_field["movement_patterns"] = by_field["movement_patterns"] ?? []).push(f);
    }

    const regions = getCanonicalFatigueRegions(ex);
    if (!ex.fatigue_regions?.length && regions.length === 0) {
      const f: AuditFinding = { exercise_id: id, field: "fatigue_regions", severity: "missing", message: "missing fatigue_regions" };
      findings.push(f);
      (by_field["fatigue_regions"] = by_field["fatigue_regions"] ?? []).push(f);
    }

    if (!ex.pairing_category) {
      const f: AuditFinding = { exercise_id: id, field: "pairing_category", severity: "weak", message: "missing pairing_category" };
      findings.push(f);
      (by_field["pairing_category"] = by_field["pairing_category"] ?? []).push(f);
    }

    const jointStress = getCanonicalJointStressTags(ex);
    if (!ex.joint_stress_tags?.length && !(ex.tags?.joint_stress?.length) && jointStress.length === 0) {
      const f: AuditFinding = { exercise_id: id, field: "joint_stress_tags", severity: "weak", message: "missing joint_stress_tags (and no legacy joint_stress)" };
      findings.push(f);
      (by_field["joint_stress_tags"] = by_field["joint_stress_tags"] ?? []).push(f);
    }

    const role = getCanonicalExerciseRole(ex) ?? (ex.exercise_role && norm(ex.exercise_role));
    const isWarmupCooldown = role && ["warmup", "prep", "cooldown", "mobility"].includes(role);
    if (isWarmupCooldown) {
      const mobility = getCanonicalMobilityTargets(ex);
      const stretch = getCanonicalStretchTargets(ex);
      if (!mobility.length && !stretch.length && !ex.mobility_targets?.length && !ex.stretch_targets?.length) {
        const f: AuditFinding = {
          exercise_id: id,
          field: "mobility_targets_or_stretch_targets",
          severity: "weak",
          message: "warmup/cooldown role but no mobility_targets or stretch_targets",
        };
        findings.push(f);
        (by_field["mobility_targets_or_stretch_targets"] = by_field["mobility_targets_or_stretch_targets"] ?? []).push(f);
      }
    }

    const legacyOnly =
      !ex.primary_movement_family &&
      !ex.movement_patterns?.length &&
      !ex.exercise_role &&
      !ex.pairing_category &&
      !ex.fatigue_regions?.length &&
      !ex.joint_stress_tags?.length;
    if (legacyOnly && (ex.movement_pattern || ex.muscle_groups?.length)) {
      const f: AuditFinding = {
        exercise_id: id,
        field: "ontology",
        severity: "weak",
        message: "relying only on legacy movement_pattern / muscle_groups",
      };
      findings.push(f);
      (by_field["legacy_only"] = by_field["legacy_only"] ?? []).push(f);
    }

    if (role === "main_compound" && isCanonicalIsolation(ex)) {
      const f: AuditFinding = {
        exercise_id: id,
        field: "exercise_role",
        severity: "suspicious",
        message: "marked main_compound but appears isolation",
      };
      findings.push(f);
      (by_field["suspicious_role"] = by_field["suspicious_role"] ?? []).push(f);
    }
    if (role === "isolation" && isCanonicalCompound(ex)) {
      const f: AuditFinding = {
        exercise_id: id,
        field: "exercise_role",
        severity: "suspicious",
        message: "marked isolation but appears compound",
      };
      findings.push(f);
      (by_field["suspicious_role"] = by_field["suspicious_role"] ?? []).push(f);
    }
  }

  const summary: Record<string, number> = {
    missing_exercise_role: by_field["exercise_role"]?.filter((f) => f.severity === "missing").length ?? 0,
    missing_primary_movement_family: by_field["primary_movement_family"]?.length ?? 0,
    missing_movement_patterns: by_field["movement_patterns"]?.length ?? 0,
    missing_fatigue_regions: by_field["fatigue_regions"]?.length ?? 0,
    missing_pairing_category: by_field["pairing_category"]?.length ?? 0,
    missing_joint_stress: by_field["joint_stress_tags"]?.length ?? 0,
    warmup_cooldown_no_targets: by_field["mobility_targets_or_stretch_targets"]?.length ?? 0,
    legacy_only: by_field["legacy_only"]?.length ?? 0,
    suspicious_combos: by_field["suspicious_role"]?.length ?? 0,
  };

  return {
    total_exercises: exercises.length,
    findings,
    by_field,
    summary,
  };
}

/**
 * Format audit report as console-friendly text (deterministic).
 */
export function formatAuditReport(report: LibraryAuditReport): string {
  const lines: string[] = [
    `Library audit: ${report.total_exercises} exercises`,
    `Findings: ${report.findings.length}`,
    "",
    "Summary:",
    ...Object.entries(report.summary).map(([k, v]) => `  ${k}: ${v}`),
    "",
    "By field:",
  ];
  for (const [field, list] of Object.entries(report.by_field)) {
    lines.push(`  ${field}: ${list.length}`);
    for (const f of list.slice(0, 5)) {
      lines.push(`    - ${f.exercise_id} [${f.severity}] ${f.message}`);
    }
    if (list.length > 5) lines.push(`    ... and ${list.length - 5} more`);
  }
  return lines.join("\n");
}
