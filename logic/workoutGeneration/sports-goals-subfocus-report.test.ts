/**
 * Simulates user selections (sports, goals, sub-focuses, secondary goals) and reports
 * exercise tags + reasoning for chosen exercises. Run with:
 *   npx tsx logic/workoutGeneration/sports-goals-subfocus-report.test.ts
 *   npx tsx logic/workoutGeneration/sports-goals-subfocus-report.test.ts --json  # machine-readable
 */

import { generateWorkoutSession } from "./dailyGenerator";
import type { GenerateWorkoutInput, WorkoutSession, ScoringDebug } from "./types";
import type { Exercise } from "./types";
import type { WorkoutBlock, WorkoutItem } from "../../lib/types";
import { STUB_EXERCISES } from "./exerciseStub";

// --- Scenario: user selections we simulate ---
export type UserSelectionScenario = {
  name: string;
  input: GenerateWorkoutInput;
};

const BASE_INPUT: Omit<GenerateWorkoutInput, "primary_goal" | "duration_minutes" | "seed"> = {
  energy_level: "medium",
  available_equipment: ["barbell", "bench", "dumbbells", "kettlebell", "bodyweight", "pullup_bar", "cable_machine"],
  injuries_or_constraints: [],
};

const SCENARIOS: UserSelectionScenario[] = [
  {
    name: "Strength only, no sport, no sub-focus",
    input: {
      ...BASE_INPUT,
      duration_minutes: 45,
      primary_goal: "strength",
      focus_body_parts: ["full_body"],
      seed: 1,
    },
  },
  {
    name: "Strength + goal sub-focus (squat, deadlift)",
    input: {
      ...BASE_INPUT,
      duration_minutes: 45,
      primary_goal: "strength",
      focus_body_parts: ["full_body"],
      goal_sub_focus: { strength: ["squat", "deadlift_hinge"] },
      seed: 2,
    },
  },
  {
    name: "Hypertrophy + secondary goal strength",
    input: {
      ...BASE_INPUT,
      duration_minutes: 45,
      primary_goal: "hypertrophy",
      secondary_goals: ["strength"],
      focus_body_parts: ["full_body"],
      seed: 3,
    },
  },
  {
    name: "Rock climbing + sport sub-focus (finger strength, pull strength)",
    input: {
      ...BASE_INPUT,
      duration_minutes: 45,
      primary_goal: "athletic_performance",
      focus_body_parts: ["full_body"],
      sport_slugs: ["rock_climbing"],
      sport_sub_focus: { rock_climbing: ["finger_strength", "pull_strength"] },
      seed: 4,
    },
  },
  {
    name: "Backcountry skiing + sub-focus (leg strength, core stability)",
    input: {
      ...BASE_INPUT,
      duration_minutes: 45,
      primary_goal: "athletic_performance",
      focus_body_parts: ["lower"],
      sport_slugs: ["backcountry_skiing"],
      sport_sub_focus: { backcountry_skiing: ["leg_strength", "core_stability"] },
      seed: 5,
    },
  },
  {
    name: "Sport conditioning + HIIT sub-focus",
    input: {
      ...BASE_INPUT,
      duration_minutes: 45,
      primary_goal: "conditioning",
      focus_body_parts: ["full_body"],
      goal_sub_focus: { conditioning: ["intervals_hiit", "full_body"] },
      seed: 6,
    },
  },
  {
    name: "Endurance + goal sub-focus (zone2, threshold)",
    input: {
      ...BASE_INPUT,
      duration_minutes: 45,
      primary_goal: "endurance",
      goal_sub_focus: { endurance: ["zone2_long_steady", "threshold_tempo"] },
      seed: 7,
    },
  },
  {
    name: "Road running + aerobic base, leg resilience",
    input: {
      ...BASE_INPUT,
      duration_minutes: 45,
      primary_goal: "endurance",
      sport_slugs: ["road_running"],
      sport_sub_focus: { road_running: ["aerobic_base", "leg_resilience"] },
      seed: 8,
    },
  },
  {
    name: "Upper push focus + strength",
    input: {
      ...BASE_INPUT,
      duration_minutes: 45,
      primary_goal: "strength",
      focus_body_parts: ["upper_push"],
      seed: 9,
    },
  },
  {
    name: "Two sports: climbing + trail running",
    input: {
      ...BASE_INPUT,
      duration_minutes: 45,
      primary_goal: "athletic_performance",
      focus_body_parts: ["full_body"],
      sport_slugs: ["rock_climbing", "trail_running"],
      sport_sub_focus: {
        rock_climbing: ["pull_strength", "core_tension"],
        trail_running: ["uphill_endurance", "ankle_stability"],
      },
      sport_weight: 0.5,
      seed: 10,
    },
  },
];

// --- Exercise tags we care about (from pool) ---
function getExerciseTagsForReport(ex: Exercise): {
  goal_tags?: string[];
  sport_tags?: string[];
  attribute_tags?: string[];
  stimulus?: string[];
  movement_pattern?: string;
  primary_movement_family?: string;
} {
  return {
    goal_tags: ex.tags?.goal_tags ?? [],
    sport_tags: ex.tags?.sport_tags ?? [],
    attribute_tags: ex.tags?.attribute_tags ?? [],
    stimulus: ex.tags?.stimulus ?? [],
    movement_pattern: ex.movement_pattern,
    primary_movement_family: ex.primary_movement_family,
  };
}

// --- Reasoning: from item.reasoning_tags + optional scoring breakdown ---
function formatReasoning(item: WorkoutItem, block: WorkoutBlock): string {
  const tags = item.reasoning_tags ?? [];
  if (tags.length === 0) return block.reasoning ?? "block fit";
  const t = new Set(tags);
  if (t.has("main_lift")) return "main compound lift";
  if (t.has("warmup")) return "warmup / activation";
  if (t.has("cooldown") || t.has("mobility") || t.has("recovery")) return "cooldown / mobility";
  if (t.has("hypertrophy")) return "hypertrophy";
  if (t.has("superset")) return "superset pair";
  if (t.has("accessory")) return "accessory";
  if (t.has("conditioning") || t.has("endurance")) return "conditioning";
  if (t.has("strength")) return "strength";
  if (t.has("power")) return "power / explosive";
  return tags.slice(0, 4).join(", ").replace(/_/g, " ");
}

function scoringBreakdownForExercise(
  exerciseId: string,
  scoringBreakdown: ScoringDebug[] | undefined
): ScoringDebug | undefined {
  if (!scoringBreakdown?.length) return undefined;
  return scoringBreakdown.find((s) => s.exercise_id === exerciseId);
}

// --- Report structure (for JSON or text) ---
export type ExerciseChoiceReport = {
  exercise_id: string;
  exercise_name: string;
  block_type: string;
  block_title?: string;
  /** Tags from exercise metadata (goal, sport, attribute, stimulus). */
  exercise_tags: ReturnType<typeof getExerciseTagsForReport>;
  /** Generator-assigned reasoning (why this exercise in this block). */
  reasoning: string;
  reasoning_tags: string[];
  /** If includeDebug was true and this exercise was in scoring sample. */
  scoring_breakdown?: Partial<ScoringDebug>;
};

export type ScenarioReport = {
  scenario_name: string;
  user_selections: {
    primary_goal: string;
    secondary_goals?: string[];
    focus_body_parts?: string[];
    sport_slugs?: string[];
    goal_sub_focus?: Record<string, string[]>;
    sport_sub_focus?: Record<string, string[]>;
    duration_minutes: number;
    seed: number;
  };
  session_title: string;
  estimated_duration_minutes: number;
  exercises: ExerciseChoiceReport[];
};

function buildScenarioReport(
  scenario: UserSelectionScenario,
  session: WorkoutSession,
  exercisePool: Exercise[]
): ScenarioReport {
  const byId = new Map(exercisePool.map((e) => [e.id, e]));
  const exercises: ExerciseChoiceReport[] = [];

  for (const block of session.blocks ?? []) {
    const blockTitle = block.title ?? block.block_type;
    for (const item of block.items ?? []) {
      const ex = byId.get(item.exercise_id);
      const exercise_tags = ex ? getExerciseTagsForReport(ex) : {};
      const scoring = scoringBreakdownForExercise(item.exercise_id, session.debug?.scoring_breakdown);

      exercises.push({
        exercise_id: item.exercise_id,
        exercise_name: item.exercise_name ?? item.exercise_id,
        block_type: block.block_type,
        block_title: blockTitle,
        exercise_tags,
        reasoning: formatReasoning(item, block),
        reasoning_tags: item.reasoning_tags ?? [],
        scoring_breakdown: scoring
          ? {
              exercise_id: scoring.exercise_id,
              total: scoring.total,
              goal_alignment: scoring.goal_alignment,
              sport_tag_match: scoring.sport_tag_match,
              sub_focus_tag_match: scoring.sub_focus_tag_match,
              body_part: scoring.body_part,
              balance_bonus: scoring.balance_bonus,
              ontology_movement_family_fit: scoring.ontology_movement_family_fit,
            }
          : undefined,
      });
    }
  }

  return {
    scenario_name: scenario.name,
    user_selections: {
      primary_goal: scenario.input.primary_goal,
      secondary_goals: scenario.input.secondary_goals,
      focus_body_parts: scenario.input.focus_body_parts,
      sport_slugs: scenario.input.sport_slugs,
      goal_sub_focus: scenario.input.goal_sub_focus,
      sport_sub_focus: scenario.input.sport_sub_focus,
      duration_minutes: scenario.input.duration_minutes,
      seed: scenario.input.seed ?? 0,
    },
    session_title: session.title,
    estimated_duration_minutes: session.estimated_duration_minutes,
    exercises,
  };
}

function reportToText(report: ScenarioReport): string[] {
  const lines: string[] = [];
  lines.push("");
  lines.push("=".repeat(72));
  lines.push(report.scenario_name);
  lines.push("=".repeat(72));
  lines.push("User selections:");
  lines.push(`  primary_goal: ${report.user_selections.primary_goal}`);
  if (report.user_selections.secondary_goals?.length)
    lines.push(`  secondary_goals: ${report.user_selections.secondary_goals.join(", ")}`);
  if (report.user_selections.focus_body_parts?.length)
    lines.push(`  focus_body_parts: ${report.user_selections.focus_body_parts.join(", ")}`);
  if (report.user_selections.sport_slugs?.length)
    lines.push(`  sport_slugs: ${report.user_selections.sport_slugs.join(", ")}`);
  if (report.user_selections.goal_sub_focus && Object.keys(report.user_selections.goal_sub_focus).length) {
    const g = report.user_selections.goal_sub_focus;
    lines.push(`  goal_sub_focus: ${JSON.stringify(g)}`);
  }
  if (report.user_selections.sport_sub_focus && Object.keys(report.user_selections.sport_sub_focus).length) {
    const s = report.user_selections.sport_sub_focus;
    lines.push(`  sport_sub_focus: ${JSON.stringify(s)}`);
  }
  lines.push(`  duration_minutes: ${report.user_selections.duration_minutes}, seed: ${report.user_selections.seed}`);
  lines.push("");
  lines.push(`Session: ${report.session_title} · ${report.estimated_duration_minutes} min`);
  lines.push("");
  lines.push("Exercises chosen (tags + reasoning):");
  lines.push("-".repeat(72));

  let currentBlock = "";
  for (const e of report.exercises) {
    if (e.block_type !== currentBlock) {
      currentBlock = e.block_type;
      lines.push(`  [${e.block_title ?? e.block_type}]`);
    }
    lines.push(`    • ${e.exercise_name} (${e.exercise_id})`);
    const tags = e.exercise_tags;
    if (tags.goal_tags?.length || tags.sport_tags?.length || tags.attribute_tags?.length || tags.stimulus?.length) {
      const parts: string[] = [];
      if (tags.goal_tags?.length) parts.push(`goal_tags: ${tags.goal_tags.join(", ")}`);
      if (tags.sport_tags?.length) parts.push(`sport_tags: ${tags.sport_tags.join(", ")}`);
      if (tags.attribute_tags?.length) parts.push(`attribute_tags: ${tags.attribute_tags.join(", ")}`);
      if (tags.stimulus?.length) parts.push(`stimulus: ${tags.stimulus.join(", ")}`);
      lines.push(`      tags: ${parts.join(" | ")}`);
    }
    if (tags.movement_pattern || tags.primary_movement_family) {
      lines.push(`      movement: ${[tags.movement_pattern, tags.primary_movement_family].filter(Boolean).join(", ")}`);
    }
    lines.push(`      reasoning: ${e.reasoning}`);
    lines.push(`      reasoning_tags: [${e.reasoning_tags.join(", ")}]`);
    if (e.scoring_breakdown && Object.keys(e.scoring_breakdown).length > 1) {
      const d = e.scoring_breakdown;
      const parts = [
        d.total != null ? `total=${d.total}` : "",
        d.goal_alignment != null ? `goal=${d.goal_alignment}` : "",
        d.sport_tag_match != null ? `sport=${d.sport_tag_match}` : "",
        d.sub_focus_tag_match != null ? `sub_focus=${d.sub_focus_tag_match}` : "",
        d.balance_bonus != null ? `balance=${d.balance_bonus}` : "",
      ].filter(Boolean);
      if (parts.length) lines.push(`      scoring: ${parts.join(", ")}`);
    }
    lines.push("");
  }
  return lines;
}

// --- Run all scenarios and output ---
function runAll(outputJson: boolean) {
  const reports: ScenarioReport[] = [];
  for (const scenario of SCENARIOS) {
    const session = generateWorkoutSession(scenario.input, STUB_EXERCISES);
    reports.push(buildScenarioReport(scenario, session, STUB_EXERCISES));
  }

  if (outputJson) {
    console.log(JSON.stringify(reports, null, 2));
    return;
  }

  console.log("\nSports / goals / sub-focus selection report");
  console.log("Scenarios simulate different user choices; each exercise shows tags and why it was selected.\n");
  for (const report of reports) {
    console.log(reportToText(report).join("\n"));
  }
  console.log("\nDone. Use --json for machine-readable output.");
}

const args = process.argv.slice(2);
const outputJson = args.includes("--json");
runAll(outputJson);
