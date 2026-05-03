import { EXERCISES } from "../data/exercisesMerged";
import { exerciseDefinitionToGeneratorExercise } from "../lib/dailyGeneratorAdapter";
import { generateWorkoutSession } from "../logic/workoutGeneration/dailyGenerator";
import { resolveWorkoutConstraints } from "../logic/workoutIntelligence/constraints/resolveWorkoutConstraints";
import { validateWorkoutAgainstConstraints } from "../logic/workoutIntelligence/validation/workoutValidator";
import type { EnergyLevel, FocusBodyPart, GenerateWorkoutInput, PrimaryGoal, UserLevel } from "../logic/workoutGeneration/types";

const pool = EXERCISES.map(exerciseDefinitionToGeneratorExercise);
const byId = new Map(pool.map((e) => [e.id, e]));
const originalConsoleLog = console.log.bind(console);
console.log = (...args: unknown[]) => {
  const first = typeof args[0] === "string" ? args[0] : "";
  if (first.startsWith("[Phase 8] Workout validation issues")) return;
  originalConsoleLog(...args);
};

const SPORTS = [
  "alpine_skiing",
  "trail_running",
  "hiking_backpacking",
  "soccer",
  "rock_climbing",
  "road_running",
] as const;
const GOALS: PrimaryGoal[] = ["strength", "hypertrophy", "conditioning", "endurance", "power", "athletic_performance"];
const LEVELS: UserLevel[] = ["beginner", "intermediate", "advanced"];
const ENERGIES: EnergyLevel[] = ["low", "medium", "high"];
const FOCUS: FocusBodyPart[] = ["full_body", "lower", "core", "upper_pull", "upper_push"];

const EQ_SIMPLE: string[][] = [
  ["bodyweight", "dumbbells", "bench"],
  ["bodyweight", "treadmill", "bike"],
  ["bodyweight", "dumbbells", "bands", "pull_up_bar"],
];
const EQ_COMPLEX: string[][] = [
  ["bodyweight", "dumbbells", "bench", "kettlebells", "barbell", "squat_rack"],
  ["bodyweight", "treadmill", "stair_climber", "rowing_machine", "assault_bike", "bike"],
  ["bodyweight", "dumbbells", "kettlebells", "bench", "pull_up_bar", "cable_machine", "treadmill"],
];

const INJURY_CANDIDATES = [
  "knee_pain",
  "low_back_sensitive",
  "rotator_cuff_irritation",
  "ankle_sensitivity",
  "impact_sensitive",
];

type Tier = "simple" | "moderate" | "complex";
type Issue = { tier: Tier; type: string; seed: number; sport: string; detail: string };

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}
function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}
function pickN<T>(arr: readonly T[], n: number, rng: () => number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < Math.min(n, copy.length); i++) {
    const idx = Math.floor(rng() * copy.length);
    out.push(copy[idx]!);
    copy.splice(idx, 1);
  }
  return out;
}

function makeInput(tier: Tier, seed: number): GenerateWorkoutInput {
  const rng = seeded(seed);
  const sport = pick(SPORTS, rng);
  const primary = pick(GOALS, rng);
  const g2 = pick(GOALS, rng);
  const g3 = pick(GOALS, rng);
  const secondary = [g2, g3].filter((g, i, a) => g !== primary && a.indexOf(g) === i);

  const base: GenerateWorkoutInput = {
    duration_minutes: pick([20, 30, 45, 60] as const, rng),
    primary_goal: primary,
    secondary_goals: secondary,
    focus_body_parts: [pick(FOCUS, rng)],
    energy_level: pick(ENERGIES, rng),
    available_equipment: pick(EQ_SIMPLE, rng),
    injuries_or_constraints: [],
    seed,
    sport_slugs: [sport],
    sport_weight: 0.55,
    style_prefs: {
      user_level: pick(LEVELS, rng),
      preferred_zone2_cardio: pick([["bike"], ["treadmill"], ["rower"], ["stair"], ["walk"]], rng),
    },
    include_intent_survival_report: true,
  };

  if (tier === "moderate") {
    base.duration_minutes = pick([30, 45, 60, 75] as const, rng);
    base.available_equipment = pick(EQ_COMPLEX, rng);
    base.focus_body_parts = pickN(FOCUS, 2, rng);
    base.goal_sub_focus = {
      strength: pick([["squat_strength"], ["deadlift_strength"], ["bench_press"]], rng),
      conditioning: pick([["zone2_aerobic_base"], ["threshold_tempo"], ["durability"]], rng),
      endurance: pick([["zone2_long_steady"], ["hills"], ["durability"]], rng),
      hypertrophy: pick([["lower_body"], ["upper_body"], ["posterior_chain"]], rng),
    };
    return base;
  }

  if (tier === "complex") {
    base.duration_minutes = pick([45, 60, 75] as const, rng);
    base.available_equipment = pick(EQ_COMPLEX, rng);
    base.focus_body_parts = pickN(FOCUS, 3, rng);
    base.injuries_or_constraints = pickN(INJURY_CANDIDATES, pick([1, 2], rng), rng);
    base.secondary_goals = pickN(GOALS.filter((g) => g !== primary), 3, rng);
    base.goal_sub_focus = {
      strength: pick([["squat_strength"], ["deadlift_strength"], ["overhead_press"]], rng),
      conditioning: pick([["zone2_aerobic_base"], ["threshold_tempo"], ["intervals_hiit"]], rng),
      endurance: pick([["zone2_long_steady"], ["hills"], ["durability"]], rng),
      hypertrophy: pick([["lower_body"], ["upper_body"], ["posterior_chain"]], rng),
    };
    base.sport_sub_focus = {
      [sport]: pickN(
        ["grip_endurance", "single_leg_control", "repeat_power", "aerobic_durability", "deceleration_control"],
        2,
        rng
      ),
    };
    base.style_prefs = {
      ...base.style_prefs,
      wants_supersets: pick([true, false], rng),
      include_creative_variations: pick([true, false], rng),
    };
    base.goal_weights = [0.5, 0.3, 0.2];
    return base;
  }

  return base;
}

function runTier(tier: Tier, runs: number, startSeed: number, issues: Issue[]) {
  let fallbackRuns = 0;
  let sessionsWithBlocks = 0;
  let totalEst = 0;
  let totalTarget = 0;

  for (let i = 0; i < runs; i++) {
    const seed = startSeed + i * 13;
    const input = makeInput(tier, seed);
    const sport = input.sport_slugs?.[0] ?? "none";
    let session: ReturnType<typeof generateWorkoutSession>;
    try {
      session = generateWorkoutSession(input, pool);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      issues.push({
        tier,
        type: "runtime_error",
        seed,
        sport,
        detail,
      });
      continue;
    }

    if (session.blocks.length > 0) sessionsWithBlocks += 1;
    totalEst += session.estimated_duration_minutes ?? 0;
    totalTarget += input.duration_minutes;

    const constraints = resolveWorkoutConstraints(input);
    const v = validateWorkoutAgainstConstraints(
      { title: session.title, blocks: session.blocks },
      constraints,
      pool
    );
    if (v.violations.length > 0) {
      issues.push({
        tier,
        type: "validation_violation",
        seed,
        sport,
        detail: v.violations.map((x) => x.type).join(","),
      });
    }

    const margin = input.duration_minutes <= 30 ? 8 : input.duration_minutes <= 45 ? 12 : 14;
    if ((session.estimated_duration_minutes ?? 0) > input.duration_minutes + margin) {
      issues.push({
        tier,
        type: "duration_over",
        seed,
        sport,
        detail: `target=${input.duration_minutes},est=${session.estimated_duration_minutes ?? 0}`,
      });
    }

    const report = session.debug?.intent_survival_report;
    const hadFallback = report?.selection_passes?.some((p) => p.fallback_occurred) ?? false;
    if (hadFallback) fallbackRuns += 1;

    for (const b of session.blocks) {
      if (b.block_type !== "conditioning") continue;
      for (const it of b.items) {
        const ex = byId.get(it.exercise_id);
        if (!ex) continue;
        if (ex.modality !== "conditioning") {
          issues.push({
            tier,
            type: "conditioning_nonconditioning_exercise",
            seed,
            sport,
            detail: `${it.exercise_id}:${ex.modality}`,
          });
        }
      }
    }
  }

  const avgEst = runs > 0 ? (totalEst / runs).toFixed(1) : "0.0";
  const avgTarget = runs > 0 ? (totalTarget / runs).toFixed(1) : "0.0";
  console.log(
    `TIER ${tier} runs=${runs} sessions_with_blocks=${sessionsWithBlocks} fallback_runs=${fallbackRuns} avg_target_min=${avgTarget} avg_est_min=${avgEst}`
  );
}

function main() {
  const issues: Issue[] = [];
  runTier("simple", 40, 12000, issues);
  runTier("moderate", 60, 24000, issues);
  runTier("complex", 80, 36000, issues);

  const counts = new Map<string, number>();
  const tierCounts = new Map<string, number>();
  for (const i of issues) {
    counts.set(i.type, (counts.get(i.type) ?? 0) + 1);
    const tk = `${i.tier}:${i.type}`;
    tierCounts.set(tk, (tierCounts.get(tk) ?? 0) + 1);
  }

  console.log(`TOTAL_ISSUES ${issues.length}`);
  for (const [k, v] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`ISSUE ${k} ${v}`);
    const sample = issues.find((x) => x.type === k);
    if (sample) console.log(`  SAMPLE tier=${sample.tier} seed=${sample.seed} sport=${sample.sport} ${sample.detail}`);
  }
  console.log("ISSUES_BY_TIER");
  for (const [k, v] of [...tierCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k} ${v}`);
  }
}

main();
