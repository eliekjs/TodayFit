import { EXERCISES } from "../data/exercisesMerged";
import { exerciseDefinitionToGeneratorExercise } from "../lib/dailyGeneratorAdapter";
import { exerciseMatchesWorkoutTier } from "../lib/workoutLevel";
import { generateWorkoutSession } from "../logic/workoutGeneration/dailyGenerator";
import { resolveWorkoutConstraints } from "../logic/workoutIntelligence/constraints/resolveWorkoutConstraints";
import { matchesBodyPartFocus } from "../logic/workoutIntelligence/constraints/eligibilityHelpers";
import { validateWorkoutAgainstConstraints } from "../logic/workoutIntelligence/validation/workoutValidator";
import type { Exercise, GenerateWorkoutInput, PrimaryGoal, UserLevel, WorkoutSession } from "../logic/workoutGeneration/types";

type Mode = "sport_mode" | "goal_mode";

const originalConsoleLog = console.log.bind(console);
const originalConsoleWarn = console.warn.bind(console);
const originalConsoleError = console.error.bind(console);
const shouldSilence = (args: unknown[]) => {
  const first = typeof args[0] === "string" ? args[0] : "";
  return first.startsWith("[Phase 8]");
};
console.log = (...args: unknown[]) => {
  if (shouldSilence(args)) return;
  originalConsoleLog(...args);
};
console.warn = (...args: unknown[]) => {
  if (shouldSilence(args)) return;
  originalConsoleWarn(...args);
};
console.error = (...args: unknown[]) => {
  if (shouldSilence(args)) return;
  originalConsoleError(...args);
};

const GOALS: PrimaryGoal[] = [
  "strength",
  "hypertrophy",
  "conditioning",
  "endurance",
  "mobility",
  "recovery",
  "power",
  "athletic_performance",
  "body_recomp",
  "calisthenics",
];
const DURATIONS: GenerateWorkoutInput["duration_minutes"][] = [20, 30, 45, 60, 75];
const FOCUS = ["full_body", "upper_push", "upper_pull", "lower", "core"] as const;
const ENERGIES: GenerateWorkoutInput["energy_level"][] = ["low", "medium", "high"];
const LEVELS: UserLevel[] = ["beginner", "intermediate", "advanced"];
const SPORTS = ["trail_running", "road_running", "hiking_backpacking", "soccer", "rock_climbing", "alpine_skiing"] as const;
const INJURIES = ["knee_pain", "low_back_sensitive", "rotator_cuff_irritation", "ankle_sensitivity", "impact_sensitive"] as const;

const EQUIPMENT_PROFILES: string[][] = [
  ["bodyweight"],
  ["bodyweight", "dumbbells", "bench"],
  ["bodyweight", "dumbbells", "bands", "pull_up_bar"],
  ["bodyweight", "treadmill", "bike", "rowing_machine"],
  ["barbell", "dumbbells", "bench", "squat_rack", "bodyweight"],
  ["barbell", "dumbbells", "kettlebells", "bench", "squat_rack", "bodyweight", "treadmill", "rowing_machine", "assault_bike", "bike", "stair_climber", "cable_machine", "pull_up_bar"],
];

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

function pool(): Exercise[] {
  return EXERCISES.map(exerciseDefinitionToGeneratorExercise);
}

function makeInput(seed: number, mode: Mode): GenerateWorkoutInput {
  const rng = seeded(seed);
  const primary = pick(GOALS, rng);
  const secondaries = pickN(
    GOALS.filter((g) => g !== primary),
    pick([0, 1, 2] as const, rng),
    rng
  );
  const focus = pickN(FOCUS, pick([1, 1, 2, 3] as const, rng), rng) as GenerateWorkoutInput["focus_body_parts"];
  const base: GenerateWorkoutInput = {
    duration_minutes: pick(DURATIONS, rng),
    primary_goal: primary,
    secondary_goals: secondaries.length ? secondaries : undefined,
    focus_body_parts: focus.length ? focus : undefined,
    energy_level: pick(ENERGIES, rng),
    available_equipment: pick(EQUIPMENT_PROFILES, rng),
    injuries_or_constraints: pickN(INJURIES, pick([0, 0, 1, 2] as const, rng), rng),
    seed,
    style_prefs: {
      user_level: pick(LEVELS, rng),
      wants_supersets: pick([true, false] as const, rng),
      include_creative_variations: pick([true, false] as const, rng),
      preferred_zone2_cardio: pick([["bike"], ["treadmill"], ["rower"], ["stair"], ["walk"], ["assault_bike"]] as const, rng) as string[],
    },
    include_intent_survival_report: true,
  };

  if (mode === "sport_mode") {
    const sport = pick(SPORTS, rng);
    base.sport_slugs = [sport];
    base.sport_weight = pick([0.45, 0.55, 0.65] as const, rng);
    base.sport_sub_focus = {
      [sport]: pickN(
        ["grip_endurance", "single_leg_control", "repeat_power", "aerobic_durability", "deceleration_control", "zone2_aerobic_base"],
        2,
        rng
      ),
    };
  } else {
    const goals = [base.primary_goal, ...(base.secondary_goals ?? [])];
    if (goals.length > 1) {
      const w1 = pick([0.5, 0.55, 0.6] as const, rng);
      const remain = 1 - w1;
      const per = remain / (goals.length - 1);
      base.goal_weights = [w1, ...new Array(goals.length - 1).fill(per)];
    }
  }

  return base;
}

function countWorkItems(session: WorkoutSession): number {
  return session.blocks.reduce((n, b) => {
    const support = b.block_type === "warmup" || b.block_type === "cooldown" || b.block_type === "mobility" || b.block_type === "recovery";
    return n + (support ? 0 : b.items.length);
  }, 0);
}

function evaluate(input: GenerateWorkoutInput, session: WorkoutSession, exercisePool: Exercise[]) {
  const constraints = resolveWorkoutConstraints(input);
  const validation = validateWorkoutAgainstConstraints({ title: session.title, blocks: session.blocks }, constraints, exercisePool);
  const byId = new Map(exercisePool.map((e) => [e.id, e]));

  const violations = validation.violations.map((v) => v.type);
  const margin = input.duration_minutes <= 30 ? 8 : input.duration_minutes <= 45 ? 12 : 14;
  const durationPass = (session.estimated_duration_minutes ?? 0) <= input.duration_minutes + margin;
  const workCount = countWorkItems(session);
  const minWork = input.duration_minutes <= 30 ? 3 : input.duration_minutes <= 45 ? 5 : input.duration_minutes <= 60 ? 6 : 7;
  const densityPass = workCount >= minWork;

  const level = input.style_prefs?.user_level;
  const levelRows = session.blocks.flatMap((b) => b.items.map((i) => byId.get(i.exercise_id)).filter(Boolean) as Exercise[]);
  const levelPass =
    !level ||
    levelRows.filter((e) => exerciseMatchesWorkoutTier(e.workout_level_tags, level)).length / Math.max(1, levelRows.length) >= 0.75;

  const secondaryFail: string[] = [];
  for (const sg of input.secondary_goals ?? []) {
    const aliases = sg === "athletic_performance" ? ["athleticism", "power"] : sg === "body_recomp" ? ["hypertrophy", "strength"] : [sg];
    let found = false;
    for (const b of session.blocks) {
      const supportBlock = b.block_type === "warmup" || b.block_type === "cooldown" || b.block_type === "mobility" || b.block_type === "recovery";
      if (supportBlock && sg !== "recovery" && sg !== "mobility") continue;
      if (b.block_type === "warmup") continue;
      for (const it of b.items) {
        const ex = byId.get(it.exercise_id);
        const reasoningTags = (it.reasoning_tags ?? []).map((t) => String(t).toLowerCase().replace(/\s/g, "_"));
        if (aliases.some((a) => reasoningTags.includes(a))) {
          found = true;
          break;
        }
        const tags = new Set((ex?.tags.goal_tags ?? []).map((t) => t.toLowerCase().replace(/\s/g, "_")));
        if (aliases.some((a) => tags.has(a))) {
          found = true;
          break;
        }
      }
      if (found) break;
    }
    if (!found) secondaryFail.push(sg);
  }

  const sportCoveragePass = input.sport_slugs?.length ? session.debug?.sport_pattern_transfer?.coverage_ok !== false : true;

  return {
    hardPass: violations.length === 0,
    durationPass,
    densityPass,
    levelPass,
    sportCoveragePass,
    secondaryFail,
    violations,
  };
}

function suggestedChangesForRun(
  mode: Mode,
  result: ReturnType<typeof evaluate>
): string[] {
  const out: string[] = [];
  if (result.violations.includes("conditioning_block_required")) {
    out.push("Strengthen post-trim conditioning preservation when conditioning/endurance is selected as a secondary goal.");
  }
  if (result.violations.includes("cooldown_mobility_required")) {
    out.push("Enforce cooldown mobility minimums after all repair/trim steps, including fallback insertions.");
  }
  if (!result.densityPass) {
    out.push("Increase minimum non-support exercise density thresholds and prevent late-stage trims from dropping below threshold.");
  }
  if (result.secondaryFail.length > 0) {
    out.push(
      `Improve secondary-goal coverage insertion for: ${result.secondaryFail.join(", ")} (ensure at least one tagged item per secondary goal).`
    );
  }
  if (!result.sportCoveragePass && mode === "sport_mode") {
    out.push("Tighten sport coverage repair pass before final validation to avoid coverage drift.");
  }
  if (!result.levelPass) {
    out.push("Increase workout-tier filtering pressure during final candidate selection.");
  }
  if (!result.hardPass && result.violations.length > 0) {
    out.push(`Resolve remaining validator violations at end of assembly: ${[...new Set(result.violations)].join(", ")}.`);
  }
  return out;
}

function main() {
  const iterations = Number(process.env.WORKOUT_SIM_ITERS ?? "3");
  const runsPerMode = Number(process.env.WORKOUT_SIM_RUNS_PER_MODE ?? "50");
  const includeRuns = process.env.WORKOUT_SIM_INCLUDE_RUNS === "1";
  const exercisePool = pool();
  const summary: unknown[] = [];
  const runs: unknown[] = [];
  for (let iter = 1; iter <= iterations; iter++) {
    for (const mode of ["sport_mode", "goal_mode"] as const) {
      const failures = new Map<string, number>();
      let crashes = 0;
      let total = 0;
      let passedAll = 0;
      for (let i = 0; i < runsPerMode; i++) {
        total += 1;
        const seed = 100000 * iter + (mode === "sport_mode" ? 1 : 2) * 10000 + i * 31;
        const input = makeInput(seed, mode);
        try {
          const session = generateWorkoutSession(input, exercisePool);
          const r = evaluate(input, session, exercisePool);
          const failed: string[] = [];
          if (!r.hardPass) failed.push("hard_constraints");
          if (!r.durationPass) failed.push("duration_fit");
          if (!r.densityPass) failed.push("structure_minimum_density");
          if (!r.levelPass) failed.push("filter_transfer_user_level");
          if (!r.sportCoveragePass) failed.push("structure_sport_specificity");
          if (r.secondaryFail.length > 0) failed.push("structure_includes_secondary_intent");
          if (failed.length === 0) passedAll += 1;
          for (const id of failed) failures.set(id, (failures.get(id) ?? 0) + 1);

          if (includeRuns) {
            runs.push({
              iteration: iter,
              mode,
              seed,
              input,
              output_session: session,
              evaluation: {
                hardPass: r.hardPass,
                durationPass: r.durationPass,
                densityPass: r.densityPass,
                levelPass: r.levelPass,
                sportCoveragePass: r.sportCoveragePass,
                secondaryFail: r.secondaryFail,
                violations: r.violations,
                failed_checks: failed,
              },
              suggested_changes: suggestedChangesForRun(mode, r),
            });
          }
        } catch {
          crashes += 1;
          failures.set("runtime_error", (failures.get("runtime_error") ?? 0) + 1);
          if (includeRuns) {
            runs.push({
              iteration: iter,
              mode,
              seed,
              input,
              runtime_error: true,
              suggested_changes: [
                "Investigate runtime error path for this seed and mode; add guardrails in repair/selection helpers.",
              ],
            });
          }
        }
      }
      summary.push({
        iteration: iter,
        mode,
        total,
        passed_all_checks: passedAll,
        crash_count: crashes,
        failure_counts: Object.fromEntries([...failures.entries()].sort((a, b) => b[1] - a[1])),
      });
    }
  }
  console.log(
    JSON.stringify(
      {
        script: "workoutGenerationRandomizedSimulationValidation",
        runsPerMode,
        includeRuns,
        summary,
        ...(includeRuns ? { runs } : {}),
      },
      null,
      2
    )
  );
}

main();
