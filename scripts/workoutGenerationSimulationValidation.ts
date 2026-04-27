import { EXERCISES } from "../data/exercisesMerged";
import { exerciseDefinitionToGeneratorExercise } from "../lib/dailyGeneratorAdapter";
import { exerciseMatchesWorkoutTier } from "../lib/workoutLevel";
import { generateWorkoutSession } from "../logic/workoutGeneration/dailyGenerator";
import { resolveWorkoutConstraints } from "../logic/workoutIntelligence/constraints/resolveWorkoutConstraints";
import { matchesBodyPartFocus } from "../logic/workoutIntelligence/constraints/eligibilityHelpers";
import { validateWorkoutAgainstConstraints } from "../logic/workoutIntelligence/validation/workoutValidator";
import type { Exercise, GenerateWorkoutInput, WorkoutSession } from "../logic/workoutGeneration/types";

type Scenario = {
  id: "sport_mode" | "goal_mode";
  label: string;
  input: GenerateWorkoutInput;
};

type ExerciseReasoning = {
  exercise_id: string;
  exercise_name: string;
  block_type: string;
  assigned_goal: string;
  assigned_sub_goal?: string;
  reasons: string[];
};

type CheckResult = {
  id: string;
  pass: boolean;
  detail: string;
  weight: number;
};

const FULL_GYM = [
  "barbell",
  "dumbbells",
  "kettlebells",
  "bench",
  "squat_rack",
  "bodyweight",
  "treadmill",
  "stair_climber",
  "assault_bike",
  "rowing_machine",
  "cable_machine",
  "pull_up_bar",
];

function pool(): Exercise[] {
  return EXERCISES.map(exerciseDefinitionToGeneratorExercise);
}

function isWarmCooldown(blockType: string): boolean {
  return blockType === "warmup" || blockType === "cooldown" || blockType === "mobility" || blockType === "recovery";
}

function flattenItems(session: WorkoutSession) {
  const out: Array<{ block_type: string; exercise_id: string; exercise_name: string }> = [];
  for (const b of session.blocks) {
    for (const it of b.items) {
      out.push({
        block_type: b.block_type,
        exercise_id: it.exercise_id,
        exercise_name: it.exercise_name ?? it.exercise_id,
      });
    }
  }
  return out;
}

function chooseAssignedGoal(
  input: GenerateWorkoutInput,
  ex: Exercise,
  blockType: string,
  sportMatched: boolean
): { goal: string; subGoal?: string } {
  const primarySport = input.sport_slugs?.[0];
  if (primarySport && (blockType === "conditioning" || sportMatched)) {
    return { goal: "sport", subGoal: `sport:${primarySport}` };
  }

  const allGoals = [input.primary_goal, ...(input.secondary_goals ?? [])];
  const goalTags = new Set(ex.tags?.goal_tags ?? []);
  for (const g of allGoals) {
    if (goalTags.has(g === "athletic_performance" ? "athleticism" : (g as any))) {
      return { goal: g };
    }
  }

  if (blockType === "conditioning") return { goal: "conditioning" };
  return { goal: input.primary_goal };
}

function buildReasoning(
  input: GenerateWorkoutInput,
  session: WorkoutSession,
  exercisePool: Exercise[]
): ExerciseReasoning[] {
  const constraints = resolveWorkoutConstraints(input);
  const byId = new Map(exercisePool.map((e) => [e.id, e]));
  const sportItems = new Map(
    (session.debug?.sport_pattern_transfer?.items ?? []).map((x) => [x.exercise_id, x])
  );

  const rows: ExerciseReasoning[] = [];
  for (const item of flattenItems(session)) {
    const ex = byId.get(item.exercise_id);
    if (!ex) continue;
    const reasons: string[] = [];

    reasons.push(`Placed in ${item.block_type} block to satisfy block intent.`);

    const focusMatch = matchesBodyPartFocus(ex, constraints, item.block_type);
    if (focusMatch) reasons.push("Matches selected body focus constraints.");

    if ((ex.tags?.goal_tags ?? []).length) {
      reasons.push(`Goal tags: ${(ex.tags?.goal_tags ?? []).join(", ")}.`);
    }

    if (input.available_equipment.length > 0) {
      const okEquip = ex.equipment_required.every((eq) => input.available_equipment.includes(eq));
      if (okEquip) reasons.push("Equipment requirements fit available equipment.");
    }

    if (input.style_prefs?.user_level) {
      const levelOk = exerciseMatchesWorkoutTier(ex.workout_level_tags, input.style_prefs.user_level);
      reasons.push(
        levelOk
          ? `Compatible with user level (${input.style_prefs.user_level}).`
          : `Potential mismatch to user level (${input.style_prefs.user_level}).`
      );
    }

    const sportRow = sportItems.get(item.exercise_id);
    if (sportRow) {
      if (sportRow.categories_matched?.length) {
        reasons.push(`Sport transfer categories matched: ${sportRow.categories_matched.join(", ")}.`);
      }
      reasons.push(`Sport transfer tier: ${sportRow.tier}.`);
    }

    const assigned = chooseAssignedGoal(input, ex, item.block_type, !!sportRow?.categories_matched?.length);
    rows.push({
      exercise_id: item.exercise_id,
      exercise_name: item.exercise_name,
      block_type: item.block_type,
      assigned_goal: assigned.goal,
      assigned_sub_goal: assigned.subGoal,
      reasons,
    });
  }
  return rows;
}

function normalizedTargetWeights(input: GenerateWorkoutInput): Record<string, number> {
  const out: Record<string, number> = {};

  if (input.sport_slugs?.length) {
    const sportW = input.sport_weight ?? 0.55;
    out.sport = sportW;
    const goals = [input.primary_goal, ...(input.secondary_goals ?? [])];
    const remain = 1 - sportW;
    if (goals.length > 0) {
      const per = remain / goals.length;
      for (const g of goals) out[g] = (out[g] ?? 0) + per;
    }
  } else {
    const weights = input.goal_weights;
    const goals = [input.primary_goal, ...(input.secondary_goals ?? [])];
    if (weights && weights.length >= goals.length) {
      goals.forEach((g, i) => {
        out[g] = weights[i] ?? 0;
      });
    } else {
      out[input.primary_goal] = 0.6;
      const secondaries = input.secondary_goals ?? [];
      const rem = secondaries.length > 0 ? 0.4 / secondaries.length : 0;
      for (const g of secondaries) out[g] = rem;
    }
  }

  const sum = Object.values(out).reduce((a, b) => a + b, 0);
  if (sum <= 0) return out;
  for (const k of Object.keys(out)) out[k] = out[k]! / sum;
  return out;
}

function actualShares(reasoning: ExerciseReasoning[]): Record<string, number> {
  const work = reasoning.filter((r) => !isWarmCooldown(r.block_type));
  const counts: Record<string, number> = {};
  for (const r of work) counts[r.assigned_goal] = (counts[r.assigned_goal] ?? 0) + 1;
  const total = Math.max(1, work.length);
  for (const k of Object.keys(counts)) counts[k] = counts[k]! / total;
  return counts;
}

function buildChecks(
  input: GenerateWorkoutInput,
  session: WorkoutSession,
  reasoning: ExerciseReasoning[],
  exercisePool: Exercise[]
): CheckResult[] {
  const checks: CheckResult[] = [];
  const constraints = resolveWorkoutConstraints(input);
  const validation = validateWorkoutAgainstConstraints(
    { title: session.title, blocks: session.blocks },
    constraints,
    exercisePool
  );
  const byId = new Map(exercisePool.map((e) => [e.id, e]));

  checks.push({
    id: "hard_constraints",
    pass: validation.violations.length === 0,
    detail: validation.violations.length ? validation.violations.map((v) => v.type).join(", ") : "pass",
    weight: 20,
  });

  const allItems = flattenItems(session);
  const equipFail = allItems.filter((it) => {
    const ex = byId.get(it.exercise_id);
    return ex ? ex.equipment_required.some((eq) => !input.available_equipment.includes(eq)) : false;
  });
  checks.push({
    id: "filter_transfer_equipment",
    pass: equipFail.length === 0,
    detail: equipFail.length ? `${equipFail.length} exercises require unavailable equipment` : "pass",
    weight: 6,
  });

  checks.push({
    id: "filter_transfer_injuries_constraints",
    pass: !validation.violations.some((v) => v.type === "injury_restriction"),
    detail: "Uses validator injury gate outcome.",
    weight: 5,
  });

  const mainRows = reasoning.filter((r) => r.block_type === "main_strength" || r.block_type === "main_hypertrophy");
  const mainFocusMatch = mainRows.filter((r) => {
    const ex = byId.get(r.exercise_id);
    return ex ? matchesBodyPartFocus(ex, constraints, r.block_type) : false;
  });
  checks.push({
    id: "filter_transfer_body_focus",
    pass: mainRows.length === 0 || mainFocusMatch.length / mainRows.length >= 0.7,
    detail: `main focus match ${mainFocusMatch.length}/${Math.max(1, mainRows.length)}`,
    weight: 5,
  });

  const est = session.estimated_duration_minutes ?? 0;
  const margin = input.duration_minutes <= 30 ? 8 : input.duration_minutes <= 45 ? 12 : 14;
  checks.push({
    id: "filter_transfer_duration",
    pass: est <= input.duration_minutes + margin,
    detail: `target=${input.duration_minutes} est=${est} max=${input.duration_minutes + margin}`,
    weight: 4,
  });

  const level = input.style_prefs?.user_level;
  const levelMatches = level
    ? reasoning.filter((r) => {
        const ex = byId.get(r.exercise_id);
        return ex ? exerciseMatchesWorkoutTier(ex.workout_level_tags, level) : true;
      }).length
    : reasoning.length;
  checks.push({
    id: "filter_transfer_user_level",
    pass: !level || levelMatches / Math.max(1, reasoning.length) >= 0.75,
    detail: level ? `level match ${levelMatches}/${Math.max(1, reasoning.length)}` : "not requested",
    weight: 3,
  });

  const sportMode = !!input.sport_slugs?.length;
  checks.push({
    id: "filter_transfer_sport_or_goal_context",
    pass: sportMode
      ? session.debug?.sport_pattern_transfer?.coverage_ok !== false
      : reasoning.some((r) => r.assigned_goal === input.primary_goal),
    detail: sportMode
      ? `sport coverage_ok=${String(session.debug?.sport_pattern_transfer?.coverage_ok ?? "undefined")}`
      : "primary goal present in assignments",
    weight: 2,
  });

  const untagged = reasoning.filter((r) => !r.assigned_goal && !isWarmCooldown(r.block_type));
  checks.push({
    id: "goal_sub_goal_tagging",
    pass: untagged.length === 0,
    detail: untagged.length ? `${untagged.length} untagged non-support items` : "all items assigned",
    weight: 15,
  });

  const blockCount = session.blocks.length;
  const totalItems = reasoning.length;
  checks.push({
    id: "structure_minimum_density",
    pass: blockCount >= 3 && totalItems >= 5,
    detail: `blocks=${blockCount} items=${totalItems}`,
    weight: 8,
  });

  checks.push({
    id: "structure_matches_primary_intent",
    pass: reasoning.filter((r) => r.assigned_goal === input.primary_goal).length / Math.max(1, reasoning.length) >= 0.35,
    detail: `primary-intent share=${(
      reasoning.filter((r) => r.assigned_goal === input.primary_goal).length / Math.max(1, reasoning.length)
    ).toFixed(2)}`,
    weight: 6,
  });

  checks.push({
    id: "structure_includes_secondary_intent",
    pass:
      (input.secondary_goals ?? []).length === 0 ||
      (input.secondary_goals ?? []).every((g) => reasoning.some((r) => r.assigned_goal === g)),
    detail: `secondaries=${(input.secondary_goals ?? []).join(",") || "none"}`,
    weight: 6,
  });

  const targets = normalizedTargetWeights(input);
  const actual = actualShares(reasoning);
  const orderedTarget = Object.entries(targets).sort((a, b) => b[1] - a[1]).map(([k]) => k);
  const orderedActual = Object.entries(actual).sort((a, b) => b[1] - a[1]).map(([k]) => k);
  checks.push({
    id: "weighted_alignment_order",
    pass: orderedTarget.length === 0 || orderedTarget[0] === orderedActual[0],
    detail: `target_order=${orderedTarget.join(">")} actual_order=${orderedActual.join(">")}`,
    weight: 8,
  });

  const tolFailures = Object.entries(targets).filter(([k, v]) => Math.abs((actual[k] ?? 0) - v) > 0.15);
  checks.push({
    id: "weighted_alignment_tolerance",
    pass: tolFailures.length === 0,
    detail:
      tolFailures.length === 0
        ? "all within +/-0.15"
        : tolFailures.map(([k, v]) => `${k}:target=${v.toFixed(2)} actual=${(actual[k] ?? 0).toFixed(2)}`).join("; "),
    weight: 12,
  });

  return checks;
}

function scoreFromChecks(checks: CheckResult[]): { score: number; band: "high" | "medium" | "low" } {
  const total = checks.reduce((a, c) => a + c.weight, 0);
  const earned = checks.reduce((a, c) => a + (c.pass ? c.weight : 0), 0);
  const hardFail = checks.find((c) => c.id === "hard_constraints" && !c.pass);
  let score = Math.round((earned / Math.max(1, total)) * 100);
  if (hardFail) score = Math.min(score, 64);
  const band = score >= 85 ? "high" : score >= 65 ? "medium" : "low";
  return { score, band };
}

function scenarios(): Scenario[] {
  return [
    {
      id: "sport_mode",
      label: "Sport mode simulation",
      input: {
        duration_minutes: 45,
        primary_goal: "strength",
        secondary_goals: ["conditioning"],
        focus_body_parts: ["lower"],
        energy_level: "medium",
        available_equipment: [...FULL_GYM],
        injuries_or_constraints: [],
        sport_slugs: ["trail_running"],
        sport_weight: 0.55,
        seed: 43117,
        include_intent_survival_report: true,
        style_prefs: { user_level: "intermediate", preferred_zone2_cardio: ["treadmill"], wants_supersets: false },
      },
    },
    {
      id: "goal_mode",
      label: "Goal mode simulation",
      input: {
        duration_minutes: 60,
        primary_goal: "hypertrophy",
        secondary_goals: ["strength", "conditioning"],
        goal_weights: [0.5, 0.3, 0.2],
        focus_body_parts: ["upper_push", "upper_pull"],
        energy_level: "high",
        available_equipment: [...FULL_GYM],
        injuries_or_constraints: [],
        seed: 91237,
        include_intent_survival_report: true,
        style_prefs: { user_level: "intermediate", wants_supersets: true, preferred_zone2_cardio: ["bike"] },
      },
    },
  ];
}

function main() {
  const exercisePool = pool();
  const results = scenarios().map((sc) => {
    const session = generateWorkoutSession(sc.input, exercisePool);
    const reasoning = buildReasoning(sc.input, session, exercisePool);
    const checks = buildChecks(sc.input, session, reasoning, exercisePool);
    const { score, band } = scoreFromChecks(checks);
    const failed = checks.filter((c) => !c.pass).map((c) => c.id);

    const targets = normalizedTargetWeights(sc.input);
    const actual = actualShares(reasoning);
    const summary = `Simulation result: ${band.toUpperCase()} quality (${score}/100). Transfer checks: ${checks
      .filter((c) => c.id.startsWith("filter_transfer"))
      .map((c) => `${c.id}:${c.pass ? "pass" : "fail"}`)
      .join(", ")}. Structure checks: ${checks
      .filter((c) => c.id.startsWith("structure_"))
      .map((c) => `${c.id}:${c.pass ? "pass" : "fail"}`)
      .join(", ")}. Weighted alignment: ${checks
      .filter((c) => c.id.startsWith("weighted_alignment"))
      .map((c) => `${c.id}:${c.pass ? "pass" : "fail"}`)
      .join(", ")}. Expected vs actual: ${JSON.stringify(targets)} vs ${JSON.stringify(actual)}. Key failures: ${
      failed.length ? failed.join(", ") : "none"
    }.`;

    return {
      scenario_id: sc.id,
      label: sc.label,
      input: sc.input,
      output_session: session,
      per_exercise_reasoning: reasoning,
      evaluation: {
        score_0_to_100: score,
        band,
        checks,
        target_weights: targets,
        actual_shares: actual,
        failed_check_ids: failed,
        summary_statement: summary,
      },
    };
  });

  console.log(JSON.stringify({ script: "workoutGenerationSimulationValidation", results }, null, 2));
}

main();
