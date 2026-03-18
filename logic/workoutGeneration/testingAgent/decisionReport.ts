/**
 * Builds a structured "decision report" explaining why the algorithm produced a given workout.
 * Used by the testing agent to document constraint resolution, block choices, and validation.
 */

import type { ResolvedWorkoutConstraints, WorkoutConstraint } from "../../workoutIntelligence/constraints/constraintTypes";
import type { GenerateWorkoutInput, WorkoutSession, WorkoutBlock, WorkoutItem, Exercise } from "../types";
import type { ValidationResult } from "../../workoutIntelligence/validation/workoutValidator";
import { getSupersetPairsForBlock } from "../../../lib/types";

/** Optional: look up exercise by id to include body parts, movement types, and filter ties in the report. */
export type ExerciseLookup = (id: string) => Exercise | undefined;

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
  /** Exact equipment list as inputted (for test output). */
  available_equipment?: string[];
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
    available_equipment: input.available_equipment ? [...input.available_equipment] : undefined,
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
  // Scoring breakdown was removed from session; use a separate helper if needed for tests/tooling.
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

/** Human-readable labels for user-facing input display. */
const GOAL_LABELS: Record<string, string> = {
  strength: "Strength",
  hypertrophy: "Hypertrophy",
  power: "Power",
  body_recomp: "Body recomp",
  endurance: "Endurance",
  conditioning: "Conditioning",
  mobility: "Mobility",
  recovery: "Recovery",
  athletic_performance: "Athletic performance",
  calisthenics: "Calisthenics",
};
const FOCUS_LABELS: Record<string, string> = {
  upper_push: "Upper push",
  upper_pull: "Upper pull",
  lower: "Lower",
  core: "Core",
  full_body: "Full body",
};
const ENERGY_LABELS: Record<string, string> = { low: "Low", medium: "Medium", high: "High" };

/**
 * Format "what the user would have put in" for the test output.
 */
function formatUserInputs(report: DecisionReport): string[] {
  const i = report.inputSummary;
  const goal = GOAL_LABELS[i.primary_goal] ?? i.primary_goal;
  const secondary =
    i.secondary_goals?.length ? i.secondary_goals.map((g) => GOAL_LABELS[g] ?? g).join(", ") : null;
  const focus =
    i.focus_body_parts?.length ?
      i.focus_body_parts.map((f) => FOCUS_LABELS[f] ?? f).join(", ")
    : "Any";
  const energy = ENERGY_LABELS[i.energy_level] ?? i.energy_level;
  const injuries = i.injuries_or_constraints.length ? i.injuries_or_constraints.join(", ") : "None";
  const equipmentExact =
    i.available_equipment?.length ?
      i.available_equipment.join(", ")
    : "None specified";
  const lines: string[] = [
    "  Duration: " + i.duration_minutes + " min",
    "  Primary goal: " + goal,
    ...(secondary ? ["  Secondary goal(s): " + secondary] : []),
    "  Body focus: " + focus,
    "  Energy level: " + energy,
    "  Injuries / restrictions: " + injuries,
    "  Equipment (exact): " + equipmentExact,
  ];
  if (i.style_prefs?.wants_supersets !== undefined) {
    lines.push("  Supersets: " + (i.style_prefs.wants_supersets ? "Yes" : "No"));
  }
  if (i.style_prefs?.conditioning_minutes) {
    lines.push("  Conditioning minutes: " + i.style_prefs.conditioning_minutes);
  }
  if (i.style_prefs?.avoid_tags?.length) {
    lines.push("  Avoid: " + i.style_prefs.avoid_tags.join(", "));
  }
  return lines;
}

/**
 * Format reasoning (why the algorithm produced this workout) from constraints.
 */
function formatReasoning(report: DecisionReport): string[] {
  const c = report.constraintsSummary;
  const lines: string[] = [];
  if (c.excluded_exercise_id_count > 0 || c.excluded_joint_stress_tags.length || c.excluded_contraindication_keys.length) {
    const parts: string[] = [];
    if (c.excluded_contraindication_keys.length) parts.push("contraindications: " + c.excluded_contraindication_keys.join(", "));
    if (c.excluded_joint_stress_tags.length) parts.push("joint stress: " + c.excluded_joint_stress_tags.join(", "));
    if (c.excluded_exercise_id_count > 0) parts.push(c.excluded_exercise_id_count + " specific exercises excluded");
    lines.push("  • Injuries/restrictions → hard exclude: " + parts.join("; ") + ". Only exercises that do not match these appear.");
  }
  lines.push("  • Equipment filter: only exercises that use the user’s selected equipment were considered.");
  if (c.allowed_movement_families != null && c.allowed_movement_families.length > 0) {
    lines.push("  • Body focus → hard include: working exercises must be from movement family/families: " + c.allowed_movement_families.join(", ") + ".");
  } else {
    lines.push("  • Body focus: none (full body or any); no movement-family restriction on working exercises.");
  }
  if (c.min_cooldown_mobility_exercises > 0) {
    lines.push("  • Secondary goal (mobility/recovery) → cooldown must include at least " + c.min_cooldown_mobility_exercises + " mobility/stretch exercises.");
  }
  if (c.has_superset_pairing_rules) {
    lines.push("  • Superset pairing rules applied (e.g. avoid same pattern or double grip when pairing exercises).");
  }
  lines.push("  • Superset pairs never combine two barbell movements that need different setups (e.g. squat rack vs bench vs floor).");
  lines.push("  • Block template and prescription (sets/reps/rest) come from primary goal and duration.");
  if (!report.validation.valid && report.validation.violationCount > 0) {
    lines.push("  • Post-assembly validation reported issues (see Validation section).");
  }
  return lines;
}

/** Crisp 1-line bullets for reasoning (compact output). */
function formatReasoningShort(report: DecisionReport): string[] {
  const c = report.constraintsSummary;
  const lines: string[] = [];
  if (c.excluded_contraindication_keys.length || c.excluded_joint_stress_tags.length) {
    lines.push("  • Exclude: " + [...c.excluded_contraindication_keys, ...c.excluded_joint_stress_tags].filter(Boolean).join(", ") || "—");
  }
  lines.push("  • Equipment: user list only. Body focus: " + (c.allowed_movement_families?.join(", ") ?? "any") + ".");
  if (c.min_cooldown_mobility_exercises > 0) lines.push("  • Cooldown: ≥" + c.min_cooldown_mobility_exercises + " mobility/stretch.");
  if (c.has_superset_pairing_rules) lines.push("  • Superset pairing rules on.");
  return lines;
}

/**
 * Format reasoning behind session and block timing (why durations are what they are).
 */
function formatTimingReasoning(report: DecisionReport, session: WorkoutSession): string[] {
  const duration = report.inputSummary.duration_minutes;
  const blocks = session.blocks ?? [];
  const lines: string[] = [];
  lines.push("  • User-selected duration: " + duration + " min. The generator targets this total; estimated session time is the sum of block estimated minutes.");
  const warmupBlock = blocks.find((b) => b.block_type === "warmup");
  if (warmupBlock) {
    lines.push("  • Warmup: " + warmupBlock.items.length + " item(s) (rule: ≤25 min → 1, ≤40 min → 2, else 3). Block time ≤ 1/10 of session, max min(10, 5 + items×2) min.");
    if (warmupBlock.estimated_minutes != null) {
      lines.push("    → This session: warmup ~" + warmupBlock.estimated_minutes + " min.");
    }
  }
  const mainBlocks = blocks.filter(
    (b) =>
      b.block_type === "main_strength" ||
      b.block_type === "main_hypertrophy" ||
      b.block_type === "power" ||
      b.block_type === "accessory"
  );
  if (mainBlocks.length > 0) {
    lines.push("  • Main work: block count and exercise count depend on goal and duration. Each block’s estimated minutes = sets × (work time + rest/60) (goal and energy set sets/reps/rest).");
    mainBlocks.forEach((b, i) => {
      if (b.estimated_minutes != null) {
        lines.push("    → " + (b.title ?? b.block_type) + ": ~" + b.estimated_minutes + " min.");
      }
    });
  }
  const condBlock = blocks.find((b) => b.block_type === "conditioning");
  if (condBlock && condBlock.estimated_minutes != null) {
    lines.push("  • Conditioning: added when goal or style_prefs request it; duration from conditioning_minutes or goal default. This session: ~" + condBlock.estimated_minutes + " min.");
  }
  const cooldownBlock = blocks.find((b) => b.block_type === "cooldown");
  if (cooldownBlock) {
    lines.push("  • Cooldown: block time ≤ 1/10 of session, max min(8, 2 + items×2) min; mobility secondary goal requires at least 2 mobility/stretch exercises.");
    if (cooldownBlock.estimated_minutes != null) {
      lines.push("    → This session: cooldown ~" + cooldownBlock.estimated_minutes + " min.");
    }
  }
  const total = session.estimated_duration_minutes ?? 0;
  lines.push("  • Total estimated duration: " + total + " min (sum of block estimated minutes).");
  return lines;
}

function formatItemPrescription(it: WorkoutItem): string {
  let presc: string;
  if (it.time_seconds != null && it.time_seconds > 0) {
    presc = (it.sets ?? 1) + " × " + Math.round(it.time_seconds / 60) + " min";
  } else {
    presc = (it.sets ?? 1) + " × " + (it.reps != null ? it.reps + " reps" : "—");
  }
  const unilateral = it.unilateral ? " (each leg/arm)" : "";
  return presc + unilateral;
}

/** Short phrase for why an exercise was chosen (from reasoning_tags). */
function formatExerciseReasoning(item: WorkoutItem, block: WorkoutBlock): string {
  const tags = item.reasoning_tags ?? [];
  if (tags.length === 0) return block.reasoning ?? "block fit";
  const t = new Set(tags);
  if (t.has("main_lift")) return "main compound";
  if (t.has("warmup")) return "warmup";
  if (t.has("cooldown") || t.has("mobility") || t.has("recovery")) return "cooldown/mobility";
  if (t.has("hypertrophy")) return "hypertrophy";
  if (t.has("superset")) return "superset pair";
  if (t.has("accessory")) return "accessory";
  if (t.has("conditioning") || t.has("endurance")) return "conditioning";
  if (t.has("strength")) return "strength";
  return tags.slice(0, 2).join(",").replace(/_/g, " ");
}

/** Build body parts, movement types, and filter-tie lines for one exercise (when exercise metadata is available). */
function formatExerciseDetailLines(
  ex: Exercise,
  report: DecisionReport
): string[] {
  const lines: string[] = [];
  const i = report.inputSummary;
  const c = report.constraintsSummary;

  // Body parts
  const bodyParts = [
    ...(ex.muscle_groups ?? []),
    ...(ex.primary_movement_family ? [ex.primary_movement_family.replace(/_/g, " ")] : []),
  ];
  if (bodyParts.length) {
    lines.push("      Body parts: " + [...new Set(bodyParts)].join(", "));
  }

  // Movement types
  const movementTypes = [
    ex.movement_pattern,
    ...(ex.movement_patterns ?? []),
  ].filter(Boolean);
  if (movementTypes.length) {
    lines.push("      Movement types: " + movementTypes.join(", "));
  }

  // Filter ties
  lines.push("      Filter ties:");
  const allowedFamilies = c.allowed_movement_families;
  const focusMatch =
    allowedFamilies == null ||
    allowedFamilies.length === 0 ||
    (ex.primary_movement_family && allowedFamilies.includes(ex.primary_movement_family)) ||
    (ex.secondary_movement_families?.some((f) => allowedFamilies.includes(f)));
  lines.push(
    "        • Body focus: " +
      (i.focus_body_parts?.length
        ? focusMatch
          ? "matches (exercise in allowed families: " + (ex.primary_movement_family ?? "—") + ")"
          : "allowed " + allowedFamilies.join(", ") + "; exercise family: " + (ex.primary_movement_family ?? "none")
        : "any (no focus filter)")
  );

  const goalTags = ex.tags?.goal_tags ?? [];
  const modalityMatch =
    i.primary_goal === ex.modality ||
    goalTags.includes(i.primary_goal as "strength" | "hypertrophy" | "endurance" | "power" | "mobility" | "recovery");
  lines.push(
    "        • Goal: " +
      (modalityMatch ? "matches primary goal (" + i.primary_goal + ")" : "modality " + ex.modality + ", goal_tags " + (goalTags.join(", ") || "—"))
  );

  const equipment = ex.equipment_required ?? [];
  const available = i.available_equipment ?? [];
  const equipmentOk = equipment.length === 0 || equipment.every((e) => available.includes(e));
  lines.push(
    "        • Equipment: uses " + (equipment.join(", ") || "none") + "; all in user list: " + (equipmentOk ? "yes" : "no")
  );

  const contra = ex.contraindication_tags ?? ex.tags?.contraindications ?? [];
  const jointStress = ex.joint_stress_tags ?? ex.tags?.joint_stress ?? [];
  const excludedContra = new Set(c.excluded_contraindication_keys);
  const excludedStress = new Set(c.excluded_joint_stress_tags);
  const contraClear = contra.length === 0 || !contra.some((k) => excludedContra.has(k));
  const stressClear = jointStress.length === 0 || !jointStress.some((t) => excludedStress.has(t));
  lines.push(
    "        • Injuries: " +
      (contraClear && stressClear
        ? "clear (no overlap with excluded contraindications/joint stress)"
        : "excluded: " +
          [...excludedContra, ...excludedStress].filter(Boolean).join(", ") +
          "; exercise has: " +
          [...contra, ...jointStress].filter(Boolean).join(", ") || "—")
  );

  const energyFit = ex.tags?.energy_fit ?? [];
  const energyMatch = energyFit.length === 0 || energyFit.includes(i.energy_level as "low" | "medium" | "high");
  lines.push(
    "        • Energy level: " +
      (energyMatch ? "fits " + i.energy_level : "exercise fit " + energyFit.join(", ") + "; user: " + i.energy_level)
  );

  return lines;
}

/**
 * Format "why each exercise was chosen" for audit: block → exercise name → reasoning (from reasoning_tags).
 * When exerciseLookup is provided and not compact, adds body parts, movement types, and ties to each filter.
 */
function formatExerciseChoiceReasoning(
  session: WorkoutSession,
  report: DecisionReport,
  exerciseLookup?: ExerciseLookup,
  compact?: boolean
): string[] {
  if (compact) {
    const lines: string[] = [];
    for (const block of session.blocks ?? []) {
      const title = block.title ?? block.block_type;
      const pairs = block.format === "superset" ? getSupersetPairsForBlock(block) : undefined;
      const itemsToExplain: WorkoutItem[] =
        pairs && pairs.length > 0
          ? pairs.flatMap(([a, b]) => (b ? [a, b] : [a]))
          : (block.items ?? []).map((it) => it as WorkoutItem);
      for (const it of itemsToExplain) {
        const name = it.exercise_name ?? it.exercise_id;
        const reason = formatExerciseReasoning(it, block);
        const tagSuffix = (it.reasoning_tags?.length ?? 0) > 0 ? " [" + (it.reasoning_tags ?? []).slice(0, 3).join(",") + "]" : "";
        lines.push("    • " + name + ": " + reason + tagSuffix);
      }
    }
    return lines;
  }
  const lines: string[] = [
    "  (Reasoning comes from generator-assigned reasoning_tags and block context.)",
    exerciseLookup
      ? "  (Body parts, movement types, and filter ties below come from exercise metadata and user inputs.)"
      : "  (Pass exerciseLookup to include body parts, movement types, and filter ties for each exercise.)",
    "",
  ];
  if (report.scoringSample?.length) {
    lines.push("  (First " + report.scoringSample.length + " main-work exercises have scoring breakdown.)");
    lines.push("");
  }
  for (const block of session.blocks ?? []) {
    const title = block.title ?? block.block_type;
    lines.push("  " + title + ":");
    const pairs = block.format === "superset" ? getSupersetPairsForBlock(block) : undefined;
    const itemsToExplain: WorkoutItem[] =
      pairs && pairs.length > 0
        ? pairs.flatMap(([a, b]) => (b ? [a, b] : [a]))
        : (block.items ?? []).map((it) => it as WorkoutItem);
    for (const it of itemsToExplain) {
      const name = it.exercise_name ?? it.exercise_id;
      const reason = formatExerciseReasoning(it, block);
      lines.push("    • " + name + ": " + reason);
      const ex = exerciseLookup?.(it.exercise_id);
      if (ex) {
        lines.push(...formatExerciseDetailLines(ex, report));
      }
    }
    lines.push("");
  }
  return lines;
}

/**
 * Format full workout output: every block and every exercise with structure.
 * Superset blocks show A1/A2 pairs and "Rest X s after each pair" instead of per-exercise rest.
 * (Single-session only; week plan is not generated in the current test runner.)
 */
function formatWorkoutOutput(session: WorkoutSession, compact?: boolean): string[] {
  const lines: string[] = [
    "  " + session.title + " · " + (session.estimated_duration_minutes ?? 0) + " min",
    "",
  ];
  for (const block of session.blocks ?? []) {
    const title = block.title ?? block.block_type;
    const formatLabel = block.format ? ` [${block.format}]` : "";
    const reason = compact && block.reasoning ? " — " + block.reasoning : "";
    lines.push("  --- " + title + formatLabel + (block.estimated_minutes != null ? " ~" + block.estimated_minutes + "min" : "") + reason + " ---");
    const pairs = block.format === "superset" ? getSupersetPairsForBlock(block) : undefined;
    if (pairs && pairs.length > 0) {
      const labels = "ABCDEFGH".split("");
      let restAfterPair: number | null = null;
      for (let i = 0; i < pairs.length; i++) {
        const [a, b] = pairs[i];
        const label = labels[i] ?? String(i + 1);
        if (restAfterPair == null && (a.rest_seconds != null || (b && b.rest_seconds != null)))
          restAfterPair = a.rest_seconds ?? (b && b.rest_seconds) ?? null;
        const tagA = compact && (a.reasoning_tags?.length ?? 0) > 0 ? " [" + (a.reasoning_tags ?? []).slice(0, 2).join(",") + "]" : "";
        lines.push("    " + label + "1. " + (a.exercise_name ?? a.exercise_id) + ": " + formatItemPrescription(a) + tagA);
        if (!compact && a.coaching_cues) lines.push("      Cues: " + a.coaching_cues);
        if (b) {
          const tagB = compact && (b.reasoning_tags?.length ?? 0) > 0 ? " [" + (b.reasoning_tags ?? []).slice(0, 2).join(",") + "]" : "";
          lines.push("    " + label + "2. " + (b.exercise_name ?? b.exercise_id) + ": " + formatItemPrescription(b) + tagB);
          if (!compact && b.coaching_cues) lines.push("      Cues: " + b.coaching_cues);
        }
      }
      if (restAfterPair != null && restAfterPair > 0) {
        lines.push("    Rest " + restAfterPair + " s after each pair.");
      }
    } else {
      for (const item of block.items ?? []) {
        const it = item as WorkoutItem;
        const presc = formatItemPrescription(it);
        const rest = it.rest_seconds != null && it.rest_seconds > 0 ? ", rest " + it.rest_seconds + " s" : "";
        const tagSuffix = compact && (it.reasoning_tags?.length ?? 0) > 0 ? " [" + (it.reasoning_tags ?? []).slice(0, 2).join(",") + "]" : "";
        lines.push("    • " + (it.exercise_name ?? it.exercise_id) + ": " + presc + rest + tagSuffix);
        if (!compact && it.coaching_cues) lines.push("      Cues: " + it.coaching_cues);
      }
    }
    lines.push("");
  }
  return lines;
}

export type FormatFullTestReportOptions = {
  /** When provided, each exercise in "Why each exercise was chosen" includes body parts, movement types, and filter ties (full format only). */
  exerciseLookup?: ExerciseLookup;
  /** Shorter output: crisp reasoning bullets, inline tags, no cues, no timing subsection, one line per exercise for "why chosen". */
  compact?: boolean;
};

/**
 * Format a full test report: user inputs, reasoning, workout structure, validation.
 * Use compact: true for shorter, crisper output (tags inline, brief reasoning, isolated test runs).
 */
export function formatFullTestReport(
  report: DecisionReport,
  session: WorkoutSession,
  scenarioName: string,
  options?: FormatFullTestReportOptions
): string {
  const exerciseLookup = options?.exerciseLookup;
  const compact = options?.compact ?? false;
  const sections: string[] = [
    "## " + scenarioName,
    "",
    "### 1. Inputs",
    ...(compact ? [`  ${report.inputSummary.duration_minutes} min · ${report.inputSummary.primary_goal} · ${report.inputSummary.energy_level} · focus: ${report.inputSummary.focus_body_parts?.join(", ") ?? "any"} · injuries: ${report.inputSummary.injuries_or_constraints.join(", ") || "none"}`] : formatUserInputs(report)),
    "",
    "### 2. Reasoning",
    ...(compact ? formatReasoningShort(report) : formatReasoning(report)),
    "",
  ];
  if (!compact) {
    sections.push("### 2b. Timing");
    sections.push(...formatTimingReasoning(report, session));
    sections.push("");
  }
  sections.push("### 3. Workout", ...formatWorkoutOutput(session, compact), "");
  sections.push("### 4. Why chosen", ...formatExerciseChoiceReasoning(session, report, compact ? undefined : exerciseLookup, compact), "");
  sections.push("### 5. Validation", "  Valid: " + report.validation.valid + (report.validation.violationCount > 0 ? " | Violations: " + report.validation.violationCount : ""));
  if (report.validation.violations.length > 0) {
    report.validation.violations.forEach((v) => sections.push("  - [" + v.type + "] " + v.description));
  }
  return sections.join("\n");
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
