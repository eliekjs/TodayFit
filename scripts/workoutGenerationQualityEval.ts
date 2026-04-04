/**
 * Autonomous evaluation loop for session generation quality (level fit, goals, novelty, progression heuristics).
 *
 * Usage:
 *   npx tsx scripts/workoutGenerationQualityEval.ts [--stub] [--out path.json] [--auto-tune]
 *
 * Env (optional, for manual reruns or auto-tune):
 *   WORKOUT_LEVEL_TIER_PREF_SCALE=1     (0.7–1.3; multiplies tier preference breakdown in lib/workoutLevel.ts)
 *   WORKOUT_LEVEL_CREATIVE_BONUS_SCALE=1 (0.7–1.3; multiplies creative bonus breakdown)
 *   WORKOUT_LEVEL_SCORE_DEBUG=1        (optional: richer breakdown fields when generator attaches traces)
 *
 * `--auto-tune` sweeps env scales on a small grid to maximize aggregate composite score (does not edit source files; validate before adopting).
 */

import { writeFileSync } from "fs";

import { EXERCISES } from "../data/exercisesMerged";
import { exerciseDefinitionToGeneratorExercise } from "../lib/dailyGeneratorAdapter";
import { getFatigueState } from "../lib/generation/fatigueRules";
import { BLOCKED_EXERCISE_IDS } from "../lib/workoutRules";
import {
  exerciseMatchesWorkoutTier,
  getWorkoutLevelScoringEnvScales,
  isComplexSkillLiftForNonAdvanced,
  isHardBlockedForBeginnerTier,
} from "../lib/workoutLevel";
import { generateWorkoutSession, scoreExercise } from "../logic/workoutGeneration/dailyGenerator";
import { STUB_EXERCISES } from "../logic/workoutGeneration/exerciseStub";
import type {
  Exercise,
  GenerateWorkoutInput,
  PrimaryGoal,
  ScoringDebug,
  UserLevel,
  WorkoutSession,
} from "../logic/workoutGeneration/types";

const FULL_GYM: string[] = [
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

function goalToTags(goal: string): string[] {
  const g = goal.toLowerCase().replace(/\s/g, "_");
  const map: Record<string, string[]> = {
    strength: ["strength"],
    power: ["power"],
    hypertrophy: ["hypertrophy"],
    body_recomp: ["hypertrophy", "strength"],
    endurance: ["endurance"],
    conditioning: ["conditioning"],
    mobility: ["mobility"],
    recovery: ["recovery"],
    athletic_performance: ["athleticism", "power"],
    calisthenics: ["calisthenics", "strength"],
  };
  return map[g] ?? [g];
}

function baseInput(partial: Partial<GenerateWorkoutInput>): GenerateWorkoutInput {
  return {
    duration_minutes: 45,
    primary_goal: "strength",
    focus_body_parts: ["full_body"],
    energy_level: "medium",
    available_equipment: [...FULL_GYM],
    injuries_or_constraints: [],
    seed: 42,
    sport_weight: 0.55,
    style_prefs: { user_level: "intermediate" },
    ...partial,
  };
}

type EvalScenario = {
  id: string;
  label: string;
  input: GenerateWorkoutInput;
  /** For cross-scenario analysis */
  tags?: string[];
};

function scenarios(): EvalScenario[] {
  return [
    {
      id: "beginner_strength",
      label: "Beginner strength | full body | 45m",
      tags: ["level_ladder", "strength"],
      input: baseInput({
        primary_goal: "strength",
        style_prefs: { user_level: "beginner" },
        seed: 1001,
      }),
    },
    {
      id: "beginner_cardio",
      label: "Beginner conditioning | lower | 45m",
      tags: ["cardio"],
      input: baseInput({
        primary_goal: "conditioning",
        focus_body_parts: ["lower"],
        style_prefs: { user_level: "beginner" },
        seed: 1002,
      }),
    },
    {
      id: "intermediate_hypertrophy",
      label: "Intermediate hypertrophy | balanced muscle",
      tags: ["hypertrophy"],
      input: baseInput({
        primary_goal: "hypertrophy",
        goal_sub_focus: { hypertrophy: ["balanced"] },
        style_prefs: { user_level: "intermediate" },
        seed: 2001,
      }),
    },
    {
      id: "advanced_strength",
      label: "Advanced strength | full body",
      tags: ["level_ladder", "strength"],
      input: baseInput({
        primary_goal: "strength",
        style_prefs: { user_level: "advanced" },
        seed: 3001,
      }),
    },
    {
      id: "advanced_climbing",
      label: "Advanced rock climbing prep | strength",
      tags: ["sport", "climbing"],
      input: baseInput({
        primary_goal: "strength",
        sport_slugs: ["rock_climbing"],
        sport_weight: 0.65,
        focus_body_parts: ["upper_pull", "core"],
        style_prefs: { user_level: "advanced" },
        seed: 4001,
      }),
    },
    {
      id: "advanced_skiing",
      label: "Advanced alpine skiing | strength",
      tags: ["sport", "skiing"],
      input: baseInput({
        primary_goal: "strength",
        sport_slugs: ["alpine_skiing"],
        sport_weight: 0.65,
        focus_body_parts: ["lower"],
        style_prefs: { user_level: "advanced" },
        seed: 4002,
      }),
    },
    {
      id: "beginner_creative",
      label: "Beginner strength + creative variations",
      tags: ["creative", "strength"],
      input: baseInput({
        primary_goal: "strength",
        style_prefs: { user_level: "beginner", include_creative_variations: true },
        seed: 5001,
      }),
    },
    {
      id: "advanced_creative",
      label: "Advanced strength + creative variations",
      tags: ["creative", "strength"],
      input: baseInput({
        primary_goal: "strength",
        style_prefs: { user_level: "advanced", include_creative_variations: true },
        seed: 5002,
      }),
    },
    {
      id: "beginner_strength_baseline_no_creative",
      label: "Beginner strength baseline (creative off) — paired with beginner_creative",
      tags: ["creative_paired", "strength"],
      input: baseInput({
        primary_goal: "strength",
        style_prefs: { user_level: "beginner", include_creative_variations: false },
        seed: 5001,
      }),
    },
    {
      id: "advanced_strength_baseline_no_creative",
      label: "Advanced strength baseline (creative off) — paired with advanced_creative",
      tags: ["creative_paired", "strength"],
      input: baseInput({
        primary_goal: "strength",
        style_prefs: { user_level: "advanced", include_creative_variations: false },
        seed: 5002,
      }),
    },
    {
      id: "intermediate_strength_ladder",
      label: "Intermediate strength (level ladder mid)",
      tags: ["level_ladder", "strength"],
      input: baseInput({
        primary_goal: "strength",
        style_prefs: { user_level: "intermediate" },
        seed: 1001,
      }),
    },
  ];
}

const WORK_BLOCK = new Set([
  "main_strength",
  "main_hypertrophy",
  "accessory",
  "power",
  "conditioning",
  "skill",
]);

type SessionExerciseRow = {
  exercise_id: string;
  name: string;
  block_type: string;
  scoring?: { total_score: number; breakdown?: ScoringDebug };
};

function attachScoringForSession(
  session: WorkoutSession,
  input: GenerateWorkoutInput,
  poolById: Map<string, Exercise>
): SessionExerciseRow[] {
  const fatigueState = getFatigueState(input.recent_history, { energy_level: input.energy_level });
  const rows: SessionExerciseRow[] = [];

  for (const block of session.blocks) {
    const bt = block.block_type ?? "";
    if (!WORK_BLOCK.has(bt)) continue;
    const movementCounts = new Map<string, number>();
    const seenBefore = new Set<string>();

    for (const item of block.items) {
      const ex = poolById.get(item.exercise_id);
      if (!ex) {
        rows.push({ exercise_id: item.exercise_id, name: item.exercise_name, block_type: bt });
        continue;
      }
      const scored = scoreExercise(ex, input, seenBefore, movementCounts, fatigueState, {
        blockType: bt,
        include_scoring_breakdown: true,
      });
      rows.push({
        exercise_id: item.exercise_id,
        name: ex.name,
        block_type: bt,
        scoring: { total_score: scored.score, breakdown: scored.breakdown },
      });
      seenBefore.add(ex.id);
      const pat = ex.movement_pattern ?? "";
      movementCounts.set(pat, (movementCounts.get(pat) ?? 0) + 1);
    }
  }
  return rows;
}

function primaryGoalTagOverlap(ex: Exercise, primary: PrimaryGoal): boolean {
  const want = new Set(goalToTags(primary));
  const tags = ex.tags?.goal_tags ?? [];
  return tags.some((t) => want.has(t));
}

function metricsForScenario(
  input: GenerateWorkoutInput,
  _session: WorkoutSession,
  exercisesWithScoring: SessionExerciseRow[],
  poolById: Map<string, Exercise>
) {
  const userLevel: UserLevel | undefined = input.style_prefs?.user_level;
  const creative = input.style_prefs?.include_creative_variations === true;
  const workEx = exercisesWithScoring.filter((r) => poolById.has(r.exercise_id));

  let levelViolations = 0;
  let goalHits = 0;
  let redFlags: string[] = [];
  let progressionHints = 0;
  let progressionChecks = 0;

  const patterns: string[] = [];
  let creativeOrUncommon = 0;

  for (const row of workEx) {
    const ex = poolById.get(row.exercise_id)!;
    patterns.push(ex.movement_pattern ?? "unknown");

    if (primaryGoalTagOverlap(ex, input.primary_goal)) goalHits += 1;

    if (userLevel === "beginner") {
      if (isHardBlockedForBeginnerTier(ex)) {
        levelViolations += 1;
        redFlags.push(`beginner_hard_block:${ex.id}`);
      }
      if (!exerciseMatchesWorkoutTier(ex.workout_level_tags, "beginner")) {
        levelViolations += 1;
      }
    } else if (userLevel === "advanced") {
      progressionChecks += 1;
      if ((ex.difficulty ?? 3) <= 2 && (ex.regressions?.length ?? 0) === 0) {
        progressionHints += 1;
      }
    }

    if (userLevel !== "advanced" && isComplexSkillLiftForNonAdvanced({
      id: ex.id,
      name: ex.name,
      tags: ex.tags?.attribute_tags,
      movementPattern: ex.movement_pattern,
      modality: ex.modality,
    })) {
      redFlags.push(`complex_skill_for_non_advanced:${ex.id}`);
    }

    if (creative) {
      const isCreative =
        ex.creative_variation === true ||
        (ex.tags?.attribute_tags ?? []).some((t) => t === "creative" || t === "complex_variation");
      const pat = (ex.movement_pattern ?? "").toLowerCase();
      if (isCreative || pat === "carry" || pat === "rotate" || ex.modality === "skill") creativeOrUncommon += 1;
    }
  }

  const n = Math.max(1, workEx.length);
  const levelAppropriateness = Math.max(0, 100 - (levelViolations / n) * 100);
  const movementQuality = (goalHits / n) * 100;

  const uniq = new Set(workEx.map((r) => r.exercise_id)).size;
  const varietyScore = (uniq / n) * 100;

  const patternEntropy = (() => {
    const counts = new Map<string, number>();
    for (const p of patterns) counts.set(p, (counts.get(p) ?? 0) + 1);
    let h = 0;
    for (const c of counts.values()) {
      const p = c / patterns.length;
      h -= p * Math.log2(p);
    }
    return patterns.length > 0 ? (h / Math.log2(Math.max(2, counts.size || 2))) * 100 : 0;
  })();

  const noveltyBlend = creative ? 0.55 * varietyScore + 0.45 * Math.min(100, creativeOrUncommon * 28) : varietyScore;

  const progressionLogic =
    userLevel === "advanced"
      ? Math.max(0, 100 - (progressionHints / Math.max(1, progressionChecks)) * 40)
      : 85;

  const redFlagPenalty = Math.min(100, redFlags.length * 18);

  const composite =
    levelAppropriateness * 0.32 +
    movementQuality * 0.26 +
    noveltyBlend * 0.18 +
    progressionLogic * 0.14 +
    (100 - redFlagPenalty) * 0.1;

  return {
    level_appropriateness: Math.round(levelAppropriateness * 10) / 10,
    movement_quality: Math.round(movementQuality * 10) / 10,
    variety_novelty: Math.round(noveltyBlend * 10) / 10,
    variety_diversity_index: Math.round(patternEntropy * 10) / 10,
    progression_logic: Math.round(progressionLogic * 10) / 10,
    red_flags: redFlags,
    red_flag_penalty: Math.round(redFlagPenalty * 10) / 10,
    composite: Math.round(composite * 10) / 10,
  };
}

function jaccard(a: string[], b: string[]): number {
  const A = new Set(a);
  const B = new Set(b);
  let inter = 0;
  for (const x of A) if (B.has(x)) inter += 1;
  const u = A.size + B.size - inter;
  return u === 0 ? 1 : inter / u;
}

function parseArgs(argv: string[]) {
  let stub = false;
  let autoTune = false;
  let out: string | undefined;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--stub") stub = true;
    else if (a === "--auto-tune") autoTune = true;
    else if (a === "--out") out = argv[++i];
  }
  return { stub, autoTune, out };
}

type ScenarioReport = {
  scenario_id: string;
  label: string;
  tags?: string[];
  title: string;
  metrics: ReturnType<typeof metricsForScenario>;
  exercises: SessionExerciseRow[];
};

function runOnce(pool: Exercise[]): {
  run_id: string;
  env_scales: ReturnType<typeof getWorkoutLevelScoringEnvScales>;
  scenarios: ScenarioReport[];
  aggregate_composite: number;
} {
  const poolById = new Map(pool.map((e) => [e.id, e]));
  const list = scenarios();
  const scenarioReports: ScenarioReport[] = [];
  let compositeSum = 0;

  for (const sc of list) {
    const session = generateWorkoutSession(sc.input, pool);
    const exercises = attachScoringForSession(session, sc.input, poolById);
    const m = metricsForScenario(sc.input, session, exercises, poolById);
    compositeSum += m.composite;
    scenarioReports.push({
      scenario_id: sc.id,
      label: sc.label,
      tags: sc.tags,
      title: session.title,
      metrics: m,
      exercises,
    });
  }

  return {
    run_id: `eval_${Date.now()}`,
    env_scales: getWorkoutLevelScoringEnvScales(),
    scenarios: scenarioReports,
    aggregate_composite: Math.round((compositeSum / list.length) * 10) / 10,
  };
}

function detectIssues(reports: ScenarioReport[]) {
  const issues: string[] = [];
  const byId = new Map(reports.map((r) => [r.scenario_id, r]));

  const mainIdsFromReport = (rep: ScenarioReport | undefined) => {
    if (!rep) return [] as string[];
    return rep.exercises
      .filter((e) => e.block_type === "main_strength" || e.block_type === "main_hypertrophy" || e.block_type === "power")
      .map((e) => e.exercise_id);
  };

  const beg = byId.get("beginner_strength");
  const mid = byId.get("intermediate_strength_ladder");
  const adv = byId.get("advanced_strength");
  if (beg && mid && adv) {
    const jbM = jaccard(mainIdsFromReport(beg), mainIdsFromReport(mid));
    const jmA = jaccard(mainIdsFromReport(mid), mainIdsFromReport(adv));
    const jba = jaccard(mainIdsFromReport(beg), mainIdsFromReport(adv));
    if (jbM > 0.55) issues.push(`weak_level_differentiation: beginner_vs_intermediate_main_jaccard=${jbM.toFixed(2)}`);
    if (jmA > 0.55) issues.push(`weak_level_differentiation: intermediate_vs_advanced_main_jaccard=${jmA.toFixed(2)}`);
    if (jba > 0.45) issues.push(`weak_level_differentiation: beginner_vs_advanced_main_jaccard=${jba.toFixed(2)}`);
  }

  const bc = byId.get("beginner_creative");
  const bb = byId.get("beginner_strength_baseline_no_creative");
  if (bc && bb) {
    const uC = new Set(bc.exercises.map((e) => e.exercise_id)).size;
    const uB = new Set(bb.exercises.map((e) => e.exercise_id)).size;
    if (uC <= uB) issues.push("creative_novelty_low: beginner creative unique count did not exceed baseline");
    const novC = bc.metrics.variety_novelty;
    const novB = bb.metrics.variety_novelty;
    if (novC < novB + 3) issues.push(`creative_novelty_low: variety_novelty creative=${novC} baseline=${novB}`);
  }

  const ac = byId.get("advanced_creative");
  const ab = byId.get("advanced_strength_baseline_no_creative");
  if (ac && ab) {
    const uC = new Set(ac.exercises.map((e) => e.exercise_id)).size;
    const uB = new Set(ab.exercises.map((e) => e.exercise_id)).size;
    if (uC <= uB) issues.push("creative_novelty_low: advanced creative unique count did not exceed baseline");
  }

  const freq = new Map<string, number>();
  for (const r of reports) {
    for (const e of r.exercises) {
      freq.set(e.exercise_id, (freq.get(e.exercise_id) ?? 0) + 1);
    }
  }
  const threshold = Math.ceil(reports.length * 0.55);
  for (const [id, c] of freq) {
    if (c >= threshold) issues.push(`overused_exercise:${id}:${c}:${reports.length}`);
  }

  return issues;
}

function buildSuggestions(reports: ScenarioReport[], issues: string[]): Array<{ kind: string; detail: string }> {
  const sug: Array<{ kind: string; detail: string }> = [];
  const seen = new Set<string>();

  function add(kind: string, detail: string) {
    const key = `${kind}:${detail}`;
    if (seen.has(key)) return;
    seen.add(key);
    sug.push({ kind, detail });
  }

  for (const msg of issues) {
    if (msg.startsWith("weak_level_differentiation")) {
      add(
        "scoring_weight",
        "Increase spread in computeWorkoutLevelPreferenceScoreBreakdown between tiers (e.g. beginner demand_penalty vs advanced demand_bonus) or raise WORKOUT_LEVEL_TIER_PREF_SCALE slightly after validating goal alignment."
      );
    }
    if (msg.startsWith("creative_novelty")) {
      add(
        "scoring_weight",
        "Raise WORKOUT_LEVEL_CREATIVE_BONUS_SCALE (bounded) or bump creative_variation_flag / uncommon_pattern weights in computeCreativeSelectionBonusBreakdown."
      );
    }
    if (msg.startsWith("overused_exercise")) {
      const parts = msg.split(":");
      const id = parts[1];
      add(
        "metadata",
        `Add swap_candidates / cluster diversity for ${id ?? "high-frequency exercise"}; check exercise_role and similarity clusters.`
      );
    }
  }

  const lowLevel = reports.filter((r) => r.metrics.level_appropriateness < 72);
  if (lowLevel.length) {
    sug.push({
      kind: "metadata",
      detail: `Low level appropriateness in: ${lowLevel.map((r) => r.scenario_id).join(", ")} — audit workout_level_tags or beginner hard gate rules.`,
    });
  }

  const lowGoal = reports.filter((r) => r.metrics.movement_quality < 55);
  if (lowGoal.length) {
    sug.push({
      kind: "inference_rule",
      detail: `Weak goal tag alignment in: ${lowGoal.map((r) => r.scenario_id).join(", ")} — verify goal_tags on pool exercises for primary_goal mapping.`,
    });
  }

  return sug;
}

function main() {
  const { stub, autoTune, out } = parseArgs(process.argv);

  const pool = stub
    ? STUB_EXERCISES
    : EXERCISES.filter((d) => !BLOCKED_EXERCISE_IDS.has(d.id)).map(exerciseDefinitionToGeneratorExercise);

  const grid = [0.88, 0.94, 1, 1.06, 1.12];
  let bestReport: ReturnType<typeof runOnce> | null = null;
  let bestTune: { tier: number; creative: number; aggregate: number } | null = null;

  const runEval = () => runOnce(pool);

  if (autoTune) {
    const savedTier = process.env.WORKOUT_LEVEL_TIER_PREF_SCALE;
    const savedCre = process.env.WORKOUT_LEVEL_CREATIVE_BONUS_SCALE;
    try {
      for (const t of grid) {
        for (const c of grid) {
          process.env.WORKOUT_LEVEL_TIER_PREF_SCALE = String(t);
          process.env.WORKOUT_LEVEL_CREATIVE_BONUS_SCALE = String(c);
          const rep = runEval();
          if (!bestTune || rep.aggregate_composite > bestTune.aggregate) {
            bestTune = { tier: t, creative: c, aggregate: rep.aggregate_composite };
            bestReport = rep;
          }
        }
      }
    } finally {
      if (savedTier === undefined) delete process.env.WORKOUT_LEVEL_TIER_PREF_SCALE;
      else process.env.WORKOUT_LEVEL_TIER_PREF_SCALE = savedTier;
      if (savedCre === undefined) delete process.env.WORKOUT_LEVEL_CREATIVE_BONUS_SCALE;
      else process.env.WORKOUT_LEVEL_CREATIVE_BONUS_SCALE = savedCre;
    }
  }

  const report = bestReport ?? runEval();
  const issues = detectIssues(report.scenarios);
  const suggestions = buildSuggestions(report.scenarios, issues);

  const payload = {
    ...report,
    issues_detected: issues,
    tuning_suggestions: suggestions,
    auto_tune: autoTune
      ? {
          enabled: true,
          best_env: bestTune,
          note: "Set WORKOUT_LEVEL_TIER_PREF_SCALE and WORKOUT_LEVEL_CREATIVE_BONUS_SCALE to best_env values to reproduce; does not modify source.",
        }
      : { enabled: false },
  };

  const text = JSON.stringify(payload, null, 2);
  if (out) {
    writeFileSync(out, text, "utf8");
    console.log(`Wrote ${out}`);
  } else {
    console.log(text);
  }
}

main();
