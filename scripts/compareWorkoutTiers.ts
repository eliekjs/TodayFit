/**
 * Compare scoreExercise rankings across user_level × creative modes (same pool + base input).
 * Run: npx tsx scripts/compareWorkoutTiers.ts
 *
 * Sets WORKOUT_LEVEL_SCORE_DEBUG so breakdown includes assignment trace + hard_reject reasons.
 */

process.env.WORKOUT_LEVEL_SCORE_DEBUG = "1";

import {
  scoreExercise,
  getHardConstraintRejectReason,
} from "../logic/workoutGeneration/dailyGenerator";
import type { Exercise, GenerateWorkoutInput, UserLevel } from "../logic/workoutGeneration/types";
import { attachWorkoutLevelScoringContext, inferWorkoutLevelsWithExplanation } from "../lib/workoutLevel";

function ex(p: Partial<Exercise> & Pick<Exercise, "id" | "name">): Exercise {
  return {
    movement_pattern: p.movement_pattern ?? "squat",
    muscle_groups: p.muscle_groups ?? ["legs"],
    modality: p.modality ?? "strength",
    equipment_required: p.equipment_required ?? ["dumbbells"],
    difficulty: p.difficulty ?? 3,
    time_cost: p.time_cost ?? "medium",
    tags: p.tags ?? { goal_tags: ["strength"] },
    ...p,
  };
}

const pool: Exercise[] = [
  ex({
    id: "goblet_squat",
    name: "Goblet Squat",
    difficulty: 2,
    movement_pattern: "squat",
    equipment_required: ["dumbbells"],
    workout_level_tags: ["beginner", "intermediate"],
    regressions: [],
    progressions: ["split_squat"],
    tags: { goal_tags: ["strength", "hypertrophy"] },
  }),
  ex({
    id: "split_squat",
    name: "Split Squat",
    difficulty: 3,
    unilateral: true,
    movement_pattern: "squat",
    workout_level_tags: ["beginner", "intermediate", "advanced"],
    regressions: ["goblet_squat"],
    tags: { goal_tags: ["strength", "hypertrophy"] },
  }),
  ex({
    id: "heavy_pistol",
    name: "Pistol Squat",
    difficulty: 5,
    unilateral: true,
    movement_pattern: "squat",
    equipment_required: ["bodyweight"],
    workout_level_tags: ["advanced"],
    stability_demand: "high",
    grip_demand: "medium",
    tags: { goal_tags: ["strength", "calisthenics"] },
  }),
  ex({
    id: "creative_carry",
    name: "Offset Carry Complex",
    movement_pattern: "carry",
    modality: "strength",
    creative_variation: true,
    workout_level_tags: ["beginner", "intermediate", "advanced"],
    tags: {
      goal_tags: ["strength"],
      attribute_tags: ["complex_variation"],
    },
  }),
  ex({
    id: "leg_press",
    name: "Leg Press",
    movement_pattern: "squat",
    equipment_required: ["leg_press"],
    difficulty: 2,
    workout_level_tags: ["beginner", "intermediate"],
    tags: { goal_tags: ["strength", "hypertrophy"] },
  }),
];

const baseInput: GenerateWorkoutInput = {
  duration_minutes: 45,
  primary_goal: "strength",
  energy_level: "medium",
  available_equipment: ["dumbbells", "bodyweight", "leg_press", "bench", "squat_rack", "barbell"],
  injuries_or_constraints: [],
  focus_body_parts: ["lower"],
};

type Scenario = { label: string; user_level: UserLevel; include_creative_variations: boolean };

const scenarios: Scenario[] = [
  { label: "beginner", user_level: "beginner", include_creative_variations: false },
  { label: "intermediate", user_level: "intermediate", include_creative_variations: false },
  { label: "advanced", user_level: "advanced", include_creative_variations: false },
  { label: "beginner + creative", user_level: "beginner", include_creative_variations: true },
  { label: "advanced + creative", user_level: "advanced", include_creative_variations: true },
];

function freshInferenceSummary(e: Exercise): string {
  const explained = inferWorkoutLevelsWithExplanation({
    id: e.id,
    name: e.name,
    tags: [],
    workout_levels: e.workout_levels_from_db,
    attribute_tags: e.tags.attribute_tags,
    stability_demand: e.stability_demand,
    grip_demand: e.grip_demand,
    impact_level: e.impact_level,
    modality: e.modality,
    movement_pattern: e.movement_pattern,
    difficulty: e.difficulty,
    unilateral: e.unilateral,
    equipment_required: e.equipment_required,
  });
  return `${explained.levels.join("|")} (${explained.origin}; ${explained.reasons.slice(0, 3).join("; ")}${
    explained.reasons.length > 3 ? "…" : ""
  })`;
}

function run() {
  console.log("Workout tier / creative comparison (top 10 by score)\n");

  for (const sc of scenarios) {
    const input: GenerateWorkoutInput = {
      ...baseInput,
      style_prefs: {
        user_level: sc.user_level,
        include_creative_variations: sc.include_creative_variations,
      },
    };
    attachWorkoutLevelScoringContext(input, pool);

    const rows = pool.map((e) => {
      const r = scoreExercise(e, input, new Set(), new Map(), undefined, {
        blockType: "main_strength",
        include_scoring_breakdown: true,
      });
      const hardReject = getHardConstraintRejectReason(e, input);
      return {
        id: e.id,
        score: r.score,
        breakdown: r.breakdown,
        tiers: e.workout_level_tags,
        difficulty: e.difficulty,
        creative: e.creative_variation,
        reg: e.regressions?.length ?? 0,
        prog: e.progressions?.length ?? 0,
        attrCreative: Boolean(
          e.tags.attribute_tags?.some((t) =>
            ["creative", "complex_variation"].includes(t.toLowerCase().replace(/\s/g, "_"))
          )
        ),
        freshInfer: freshInferenceSummary(e),
        hardReject,
      };
    });
    rows.sort((a, b) => b.score - a.score);
    const top = rows.slice(0, 10);

    console.log(`=== ${sc.label} ===`);
    for (const row of top) {
      const b = row.breakdown;
      console.log(
        `  ${row.id.padEnd(18)} score=${row.score.toFixed(2)}  assigned_tiers=${JSON.stringify(
          row.tiers
        )}  db_explicit=${JSON.stringify(row.workoutLevelsFromDb ?? null)}  trace=${row.freshInfer}`
      );
      console.log(
        `    diff=${row.difficulty}  creative_flag=${row.creative ?? false}  attr_creative=${row.attrCreative}  regr=${row.reg}  prog=${row.prog}  hard_reject=${row.hardReject ?? "—"}`
      );
      if (b) {
        console.log(
          `    goal=${(b.goal_alignment ?? 0).toFixed(2)}  user_level_pref=${(b.user_level_preference ?? 0).toFixed(
            2
          )}  creative_bonus=${(b.creative_selection_bonus ?? 0).toFixed(2)}  body=${(b.body_part ?? 0).toFixed(2)}`
        );
        if (b.tier_preference_components && Object.keys(b.tier_preference_components).length) {
          console.log(`    tier_pref_parts=${JSON.stringify(b.tier_preference_components)}`);
        }
        if (b.creative_bonus_components && Object.keys(b.creative_bonus_components).length) {
          console.log(`    creative_parts=${JSON.stringify(b.creative_bonus_components)}`);
        }
        if (b.workout_level_assignment_trace) {
          console.log(`    level_trace=${JSON.stringify(b.workout_level_assignment_trace)}`);
        }
        if (b.hard_constraint_reject_reason) {
          console.log(`    hard_constraint_reject_reason=${b.hard_constraint_reject_reason}`);
        }
      }
    }
    console.log("");
  }
}

run();
