/**
 * Builds a structured "decision report" explaining why the algorithm produced a given workout.
 * Used by the testing agent to document constraint resolution, block choices, and validation.
 */

import type { ResolvedWorkoutConstraints, WorkoutConstraint } from "../../workoutIntelligence/constraints/constraintTypes";
import type { GenerateWorkoutInput, WorkoutSession, WorkoutBlock, WorkoutItem } from "../types";
import type { ValidationResult } from "../../workoutIntelligence/validation/workoutValidator";

export type DecisionReport = {
  /** Summary of user input (for readability). */
  inputSummary: InputSummary;
  /** Resolved constraints that drove filtering and block rules. */
  constraintsSummary: ConstraintsSummary;
  /** What the generator produced: block layout and prescription. */
  sessionSummary: SessionSummary;
  /** Post-assembly validation result. */
  validation: ValidationSummary;
  /** Optional: first few exercises' scoring breakdown when debug was included. */
  scoringSample?: ScoringSampleEntry[];
};

export type InputSummary = {
  duration_minutes: number;
  primary_goal: string;
  secondary_goals?: string[];
  focus_body_parts?: string[];
  energy_level: string;
  equipment_count: number;
  injuries_or_constraints: string[];
  style_prefs?: { wants_supersets?: boolean; conditioning_minutes?: number; avoid_tags?: string[] };
};

export type ConstraintsSummary = {
  /** Human-readable rule descriptions in precedence order. */
  ruleDescriptions: string[];
  allowed_movement_families: string[] | null;
  min_cooldown_mobility_exercises: number;
  excluded_exercise_id_count: number;
  excluded_joint_stress_tags: string[];
  excluded_contraindication_keys: string[];
  has_superset_pairing_rules: boolean;
};

export type SessionSummary = {
  title: string;
  estimated_duration_minutes: number;
  blockCount: number;
  blocks: BlockSummary[];
  /** Main work block prescription (rep range, rest) when applicable. */
  mainWorkPrescription?: { repsMin?: number; repsMax?: number; restSeconds?: number };
};

export type BlockSummary = {
  block_type: string;
  format?: string;
  title?: string;
  item_count: number;
  estimated_minutes?: number;
  /** First item's prescription as sample. */
  samplePrescription?: string;
};

export type ValidationSummary = {
  valid: boolean;
  violationCount: number;
  violations: { type: string; description: string }[];
};

export type ScoringSampleEntry = {
  exercise_id: string;
  total: number;
  goal_alignment?: number;
  body_part?: number;
  variety_penalty?: number;
};

function describeRule(rule: WorkoutConstraint): string {
  switch (rule.kind) {
    case "hard_exclude":
      return `Hard exclude: exercise_ids=${rule.exercise_ids?.length ?? 0}, joint_stress=${(rule.joint_stress_tags ?? []).join(", ") || "none"}, contraindication_keys=${(rule.contraindication_keys ?? []).join(", ") || "none"}`;
    case "soft_caution":
      return `Soft caution: joint_stress=${(rule.joint_stress_tags ?? []).join(", ") || "none"}`;
    case "hard_include":
      return `Hard include (body-part): movement_families=[${(rule.movement_families ?? []).join(", ")}]`;
    case "required_finishers":
      return `Required finishers: min ${rule.min_mobility_or_stretch_exercises} mobility/stretch in cooldown`;
    case "superset_pairing_rules":
      return `Superset pairing: forbidden_same_pattern=${rule.forbidden_same_pattern ?? false}, forbid_double_grip=${rule.forbid_double_grip ?? false}`;
    case "movement_distribution_rules":
      return `Movement distribution: families=[${(rule.families ?? []).join(", ")}]`;
    default:
      return `${(rule as WorkoutConstraint).kind}`;
  }
}

export function buildInputSummary(input: GenerateWorkoutInput): InputSummary {
  return {
    duration_minutes: input.duration_minutes,
    primary_goal: input.primary_goal,
    secondary_goals: input.secondary_goals,
    focus_body_parts: input.focus_body_parts,
    energy_level: input.energy_level,
    equipment_count: input.available_equipment?.length ?? 0,
    injuries_or_constraints: input.injuries_or_constraints ?? [],
    style_prefs: input.style_prefs,
  };
}

export function buildConstraintsSummary(constraints: ResolvedWorkoutConstraints): ConstraintsSummary {
  return {
    ruleDescriptions: constraints.rules.map(describeRule),
    allowed_movement_families: constraints.allowed_movement_families ? [...constraints.allowed_movement_families] : null,
    min_cooldown_mobility_exercises: constraints.min_cooldown_mobility_exercises ?? 0,
    excluded_exercise_id_count: constraints.excluded_exercise_ids?.size ?? 0,
    excluded_joint_stress_tags: constraints.excluded_joint_stress_tags ? [...constraints.excluded_joint_stress_tags] : [],
    excluded_contraindication_keys: constraints.excluded_contraindication_keys ? [...constraints.excluded_contraindication_keys] : [],
    has_superset_pairing_rules: constraints.superset_pairing != null,
  };
}

function summarizeBlock(block: WorkoutBlock): BlockSummary {
  const first = block.items?.[0];
  let samplePrescription: string | undefined;
  if (first) {
    const item = first as WorkoutItem;
    if (item.reps != null) samplePrescription = `${item.sets ?? "?"}×${item.reps} reps, rest ${item.rest_seconds ?? "?"}s`;
    else if (item.time_seconds != null) samplePrescription = `${item.sets ?? "?"}×${item.time_seconds}s`;
  }
  return {
    block_type: block.block_type,
    format: block.format,
    title: block.title,
    item_count: block.items?.length ?? 0,
    estimated_minutes: block.estimated_minutes,
    samplePrescription,
  };
}

export function buildSessionSummary(session: WorkoutSession): SessionSummary {
  const blocks = (session.blocks ?? []).map(summarizeBlock);
  let mainWorkPrescription: SessionSummary["mainWorkPrescription"] | undefined;
  const mainBlock = session.blocks?.find((b) => b.block_type === "main_strength" || b.block_type === "main_hypertrophy" || b.block_type === "power");
  if (mainBlock?.items?.[0]) {
    const item = mainBlock.items[0] as WorkoutItem;
    mainWorkPrescription = {
      repsMin: item.reps,
      repsMax: item.reps,
      restSeconds: item.rest_seconds,
    };
  }
  return {
    title: session.title,
    estimated_duration_minutes: session.estimated_duration_minutes ?? 0,
    blockCount: session.blocks?.length ?? 0,
    blocks,
    mainWorkPrescription,
  };
}

export function buildValidationSummary(result: ValidationResult): ValidationSummary {
  return {
    valid: result.valid,
    violationCount: result.violations?.length ?? 0,
    violations: (result.violations ?? []).map((v) => ({
      type: (v as { type?: string }).type ?? "unknown",
      description: (v as { description?: string }).description ?? String(v),
    })),
  };
}

/**
 * Build a full decision report from input, resolved constraints, session, and validation result.
 */
export function buildDecisionReport(
  input: GenerateWorkoutInput,
  constraints: ResolvedWorkoutConstraints,
  session: WorkoutSession,
  validation: ValidationResult
): DecisionReport {
  const report: DecisionReport = {
    inputSummary: buildInputSummary(input),
    constraintsSummary: buildConstraintsSummary(constraints),
    sessionSummary: buildSessionSummary(session),
    validation: buildValidationSummary(validation),
  };
  if (session.debug?.scoring_breakdown?.length) {
    report.scoringSample = session.debug.scoring_breakdown.slice(0, 5).map((s) => ({
      exercise_id: s.exercise_id,
      total: s.total,
      goal_alignment: s.goal_alignment,
      body_part: s.body_part,
      variety_penalty: s.variety_penalty,
    }));
  }
  return report;
}

/**
 * Format a decision report as readable text (for CLI describe mode).
 */
export function formatDecisionReport(report: DecisionReport, scenarioName: string): string {
  const lines: string[] = [
    `## ${scenarioName}`,
    "",
    "### Input",
    `  Duration: ${report.inputSummary.duration_minutes} min | Goal: ${report.inputSummary.primary_goal} | Energy: ${report.inputSummary.energy_level}`,
    `  Focus: ${report.inputSummary.focus_body_parts?.join(", ") ?? "any"} | Equipment: ${report.inputSummary.equipment_count} | Injuries: ${report.inputSummary.injuries_or_constraints.join(", ") || "none"}`,
    "",
    "### Decisioning (constraints)",
    ...report.constraintsSummary.ruleDescriptions.map((r) => `  - ${r}`),
    `  Allowed movement families: ${report.constraintsSummary.allowed_movement_families?.join(", ") ?? "any"}`,
    `  Min cooldown mobility exercises: ${report.constraintsSummary.min_cooldown_mobility_exercises}`,
    "",
    "### Output (session)",
    `  Title: ${report.sessionSummary.title}`,
    `  Blocks: ${report.sessionSummary.blocks.map((b) => `${b.block_type}(${b.item_count})`).join(" → ")}`,
    "",
    "### Validation",
    `  Valid: ${report.validation.valid} | Violations: ${report.validation.violationCount}`,
  ];
  if (report.validation.violations.length > 0) {
    report.validation.violations.forEach((v) => lines.push(`  - [${v.type}] ${v.description}`));
  }
  return lines.join("\n");
}
