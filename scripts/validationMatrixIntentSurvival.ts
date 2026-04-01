/**
 * Fixed-scenario validation matrix: intent survival + session summary.
 * Run: npx tsx scripts/validationMatrixIntentSurvival.ts
 */

import { EXERCISES } from "../data/exercisesMerged";
import { exerciseDefinitionToGeneratorExercise } from "../lib/dailyGeneratorAdapter";
import { BLOCKED_EXERCISE_IDS } from "../lib/workoutRules";
import { generateWorkoutSession } from "../logic/workoutGeneration/dailyGenerator";
import type { Exercise, GenerateWorkoutInput, PrimaryGoal } from "../logic/workoutGeneration/types";
import type { IntentSurvivalSessionSummary } from "../logic/workoutGeneration/intentSurvivalDebug";

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

const DUMB_ONLY: string[] = ["dumbbells", "bench", "bodyweight"];
const BW_ONLY: string[] = ["bodyweight"];

function pool(): Exercise[] {
  return EXERCISES.filter((d) => !BLOCKED_EXERCISE_IDS.has(d.id)).map(exerciseDefinitionToGeneratorExercise);
}

function base(partial: Partial<GenerateWorkoutInput>): GenerateWorkoutInput {
  return {
    duration_minutes: 45,
    primary_goal: "strength",
    focus_body_parts: ["lower"],
    energy_level: "medium",
    available_equipment: [...FULL_GYM],
    injuries_or_constraints: [],
    seed: 42,
    sport_weight: 0.55,
    include_intent_survival_report: true,
    ...partial,
  };
}

type Scenario = {
  id: string;
  label: string;
  input: GenerateWorkoutInput;
};

function scenarios(): Scenario[] {
  const s: Scenario[] = [];

  // Alpine — levels + durations + energy
  s.push({
    id: "alp_beg_short_low",
    label: "Alpine skiing | beginner | 20m | low energy | full gym",
    input: base({
      sport_slugs: ["alpine_skiing"],
      duration_minutes: 20,
      energy_level: "low",
      style_prefs: { user_level: "beginner" },
      seed: 101,
    }),
  });
  s.push({
    id: "alp_int_med",
    label: "Alpine skiing | intermediate | 45m | medium | full gym",
    input: base({
      sport_slugs: ["alpine_skiing"],
      duration_minutes: 45,
      style_prefs: { user_level: "intermediate" },
      seed: 202,
    }),
  });
  s.push({
    id: "alp_adv_long_high",
    label: "Alpine skiing | advanced | 60m | high energy | full gym",
    input: base({
      sport_slugs: ["alpine_skiing"],
      duration_minutes: 60,
      energy_level: "high",
      style_prefs: { user_level: "advanced" },
      seed: 303,
    }),
  });
  s.push({
    id: "alp_int_bw",
    label: "Alpine skiing | intermediate | 30m | bodyweight-only",
    input: base({
      sport_slugs: ["alpine_skiing"],
      duration_minutes: 30,
      available_equipment: BW_ONLY,
      style_prefs: { user_level: "intermediate" },
      seed: 404,
    }),
  });

  // Trail running
  s.push({
    id: "trail_int_45",
    label: "Trail running | intermediate | 45m | lower focus",
    input: base({
      sport_slugs: ["trail_running"],
      duration_minutes: 45,
      focus_body_parts: ["lower"],
      style_prefs: { user_level: "intermediate" },
      seed: 505,
    }),
  });
  s.push({
    id: "trail_beg_20_low",
    label: "Trail running | beginner | 20m | low energy | dumbbells",
    input: base({
      sport_slugs: ["trail_running"],
      duration_minutes: 20,
      energy_level: "low",
      available_equipment: DUMB_ONLY,
      style_prefs: { user_level: "beginner" },
      seed: 606,
    }),
  });

  // Hiking / backpacking
  s.push({
    id: "hike_adv_60",
    label: "Hiking/backpacking | advanced | 60m | full body",
    input: base({
      sport_slugs: ["hiking_backpacking"],
      duration_minutes: 60,
      focus_body_parts: ["full_body"],
      style_prefs: { user_level: "advanced" },
      seed: 707,
    }),
  });
  s.push({
    id: "hike_int_core",
    label: "Hiking/backpacking | intermediate | 45m | core emphasis",
    input: base({
      sport_slugs: ["hiking_backpacking"],
      duration_minutes: 45,
      focus_body_parts: ["core"],
      style_prefs: { user_level: "intermediate" },
      seed: 808,
    }),
  });

  // Generic — no sport
  const generic = (
    goal: PrimaryGoal,
    id: string,
    label: string,
    extra: Partial<GenerateWorkoutInput>
  ): Scenario => ({
    id,
    label,
    input: base({
      primary_goal: goal,
      sport_slugs: undefined,
      sport_weight: undefined,
      focus_body_parts: ["full_body"],
      ...extra,
    }),
  });

  s.push(
    generic("strength", "gen_str_upper_adv", "Generic strength | advanced | upper | 45m", {
      focus_body_parts: ["upper_push", "upper_pull"],
      style_prefs: { user_level: "advanced" },
      seed: 1001,
    })
  );
  s.push(
    generic("hypertrophy", "gen_hyp_lower_int", "Generic hypertrophy | intermediate | lower | 45m", {
      primary_goal: "hypertrophy",
      focus_body_parts: ["lower"],
      style_prefs: { user_level: "intermediate" },
      seed: 1002,
    })
  );
  s.push(
    generic("conditioning", "gen_cond_30", "Generic conditioning | 30m | medium | full gym", {
      primary_goal: "conditioning",
      duration_minutes: 30,
      focus_body_parts: ["full_body"],
      seed: 1003,
    })
  );
  s.push(
    generic("strength", "gen_str_bw", "Generic strength | beginner | full body | bodyweight-only", {
      available_equipment: BW_ONLY,
      style_prefs: { user_level: "beginner" },
      seed: 1004,
    })
  );

  return s;
}

function exerciseNames(session: ReturnType<typeof generateWorkoutSession>, poolById: Map<string, Exercise>): string[] {
  const names: string[] = [];
  for (const b of session.blocks) {
    for (const it of b.items) {
      const ex = poolById.get(it.exercise_id);
      names.push(ex?.name ?? it.exercise_id);
    }
  }
  return names;
}

function summarizeReport(r: IntentSurvivalSessionSummary | undefined) {
  if (!r) {
    return {
      passes: 0,
      anyFallback: false,
      anyRepair: false,
      alpinePre: null as boolean | null,
      alpinePost: null as boolean | null,
      degraded: null as boolean | null,
      repairRan: null as boolean | null,
      strictShare: null as number | null,
      fallbackShare: null as number | null,
    };
  }
  const anyFallback = r.selection_passes.some((p) => p.fallback_occurred);
  const alp = r.alpine;
  return {
    passes: r.selection_passes.length,
    anyFallback,
    anyRepair: alp?.repair_ran ?? false,
    alpinePre: alp?.key_coverage_ok_pre_repair ?? null,
    alpinePost: alp?.key_coverage_ok_post_repair ?? null,
    degraded: alp?.degraded_mode ?? null,
    repairRan: alp?.repair_ran ?? null,
    strictShare: alp?.strict_gate_selection_share ?? null,
    fallbackShare: alp?.fallback_path_selection_share ?? null,
  };
}

function main() {
  const exercisePool = pool();
  const poolById = new Map(exercisePool.map((e) => [e.id, e]));
  const rows: string[] = [];

  console.log("# Validation matrix — intent survival (fixed scenarios)\n");
  console.log("| Scenario | Aligned (manual) | Fallback (any pass) | Repair | Degraded | Coverage pre-repair | Coverage post | Strict% | Fallback% | Notes |");
  console.log("|----------|------------------|---------------------|--------|----------|----------------------|---------------|---------|-----------|-------|");

  for (const sc of scenarios()) {
    const session = generateWorkoutSession(sc.input, exercisePool);
    const r = session.debug?.intent_survival_report;
    const sum = summarizeReport(r);
    const names = exerciseNames(session, poolById).slice(0, 14);
    const namePreview = names.join("; ");
    const isSport = !!sc.input.sport_slugs?.length;
    let aligned = "—";
    if (session.blocks.length === 0) aligned = "empty";
    else if (isSport) aligned = "sport session generated";
    else aligned = "non-sport session generated";

    const notes: string[] = [];
    if (sum.anyFallback) notes.push("pool fallback in ≥1 pass");
    if (sum.anyRepair) notes.push("alpine repair");
    if (sum.degraded) notes.push("degraded");
    if (isSport && sc.input.sport_slugs?.includes("alpine_skiing") && sum.alpinePre === false) notes.push("coverage gap pre-repair");

    console.log(
      `| ${sc.id} | ${aligned} | ${sum.anyFallback} | ${sum.repairRan ?? "—"} | ${sum.degraded ?? "—"} | ${sum.alpinePre ?? "n/a"} | ${sum.alpinePost ?? "n/a"} | ${sum.strictShare != null ? (sum.strictShare * 100).toFixed(0) : "n/a"} | ${sum.fallbackShare != null ? (sum.fallbackShare * 100).toFixed(0) : "n/a"} | ${notes.join(", ") || "—"} |`
    );

    rows.push(`## ${sc.label}\nExercises (preview): ${namePreview}\n`);
  }

  console.log("\n---\n## Exercise previews per scenario\n\n" + rows.join("\n"));
}

main();
