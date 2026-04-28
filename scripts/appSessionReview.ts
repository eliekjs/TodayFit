/**
 * Single-run “app parity” session review: same path as the product
 * (`generateWorkoutAsync` → merged pool → `manualPreferencesToGenerateWorkoutInput` → `generateWorkoutSession`).
 *
 * Prints inputs, block structure reasons, exercise tags + item reasoning_tags, and scorer breakdown
 * (post-hoc `scoreExercise` with session order simulated via movement counts / recent IDs).
 *
 * Usage:
 *   npx tsx scripts/appSessionReview.ts [seed]
 *
 * Optional: repo-root `.env` with Supabase so the pool matches production when DB is seeded;
 * otherwise the static merge path is used (same fallback as offline dev).
 */

import { loadDotEnvFromRepoRoot } from "./dotenvLocal";
import { getDefaultEquipmentForTemplate } from "../data/gymProfiles";
import type { GymProfile } from "../data/gymProfiles";
import type { ManualPreferences } from "../lib/types";
import {
  generateWorkoutAsync,
  getExercisePoolForManualGeneration,
  injurySlugsFromManualPreferences,
} from "../lib/generator";
import { manualPreferencesToGenerateWorkoutInput } from "../lib/dailyGeneratorAdapter";
import { getFatigueState } from "../lib/generation/fatigueRules";
import type { Exercise, GenerateWorkoutInput, ScoringDebug } from "../logic/workoutGeneration/types";
import { scoreExercise } from "../logic/workoutGeneration/dailyGenerator";

/** Edit this object to mirror what you tap in Manual mode (up to 3 ranked goals + sub-goals). */
const REVIEW_PREFS: ManualPreferences = {
  primaryFocus: ["Build Strength", "Sport Conditioning", "Improve Endurance"],
  subFocusByGoal: {
    "Build Strength": ["Bench / Press", "Squat"],
    "Sport Conditioning": ["Zone 2 / Aerobic base", "Intervals / HIIT"],
    "Improve Endurance": ["Zone 2 / Long steady", "Hills"],
  },
  targetBody: "Full",
  targetModifier: [],
  durationMinutes: 45,
  energyLevel: "medium",
  injuries: ["No restrictions"],
  upcoming: [],
  workoutStyle: [],
  preferredZone2Cardio: ["treadmill", "bike", "rower"],
  goalMatchPrimaryPct: 50,
  goalMatchSecondaryPct: 30,
  goalMatchTertiaryPct: 20,
  workoutTier: "intermediate",
};

const gym: GymProfile = {
  id: "app_session_review",
  name: "Your Gym (template)",
  equipment: getDefaultEquipmentForTemplate("your_gym"),
};

function formatTags(ex: Exercise | undefined): string {
  if (!ex) return "(exercise not in pool)";
  const parts: string[] = [];
  parts.push(`modality=${ex.modality}`);
  if (ex.movement_pattern) parts.push(`pattern=${ex.movement_pattern}`);
  const t = ex.tags;
  if (t?.goal_tags?.length) parts.push(`goal_tags=[${t.goal_tags.join(", ")}]`);
  if (t?.stimulus?.length) parts.push(`stimulus=[${t.stimulus.join(", ")}]`);
  if (t?.attribute_tags?.length) parts.push(`attribute=[${t.attribute_tags.slice(0, 12).join(", ")}${t.attribute_tags.length > 12 ? ", …" : ""}]`);
  if (t?.sport_tags?.length) parts.push(`sport_tags=[${t.sport_tags.slice(0, 8).join(", ")}${t.sport_tags.length > 8 ? ", …" : ""}]`);
  if (ex.joint_stress_tags?.length) parts.push(`joint_stress=[${ex.joint_stress_tags.join(", ")}]`);
  return parts.join(" · ");
}

function topScoringComponents(b: ScoringDebug | undefined, limit = 14): string {
  if (!b) return "(no breakdown)";
  const entries = Object.entries(b).filter(
    ([k, v]) => typeof v === "number" && !Number.isNaN(v) && k !== "exercise_id"
  ) as [string, number][];
  entries.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  return entries
    .slice(0, limit)
    .map(([k, v]) => `${k}=${v.toFixed(2)}`)
    .join(", ");
}

async function main() {
  loadDotEnvFromRepoRoot();
  const seedArg = process.argv[2];
  const seed = seedArg != null && seedArg !== "" ? Number(seedArg) : 424242;
  if (Number.isNaN(seed)) {
    console.error("Usage: npx tsx scripts/appSessionReview.ts [seedNumber]");
    process.exit(1);
  }

  const injurySlugs = injurySlugsFromManualPreferences(REVIEW_PREFS);
  const pool = await getExercisePoolForManualGeneration(injurySlugs);
  const byId = new Map(pool.map((e) => [e.id, e]));

  const workout = await generateWorkoutAsync(REVIEW_PREFS, gym, seed, undefined, undefined, {
    exercisePool: pool,
  });

  const input: GenerateWorkoutInput = manualPreferencesToGenerateWorkoutInput(REVIEW_PREFS, gym, seed);
  const fatigueState = getFatigueState(input.recent_history, { energy_level: input.energy_level });
  const recentIds = new Set<string>();
  const movementCounts = new Map<string, number>();

  console.log("═".repeat(72));
  console.log("APP SESSION REVIEW (single run)");
  console.log("═".repeat(72));
  console.log("\n## ManualPreferences (what the UI sends)\n");
  console.log(JSON.stringify(REVIEW_PREFS, null, 2));

  console.log("\n## Resolved GenerateWorkoutInput (adapter → dailyGenerator)\n");
  console.log(
    JSON.stringify(
      {
        duration_minutes: input.duration_minutes,
        primary_goal: input.primary_goal,
        secondary_goals: input.secondary_goals,
        focus_body_parts: input.focus_body_parts,
        energy_level: input.energy_level,
        available_equipment_count: input.available_equipment.length,
        goal_sub_focus: input.goal_sub_focus,
        goal_sub_focus_weights: input.goal_sub_focus_weights,
        goal_weights: input.goal_weights,
        style_prefs: input.style_prefs,
        seed: input.seed,
      },
      null,
      2
    )
  );

  console.log("\n## GeneratedWorkout (app-shaped output)\n");
  console.log(
    JSON.stringify(
      {
        id: workout.id,
        focus: workout.focus,
        durationMinutes: workout.durationMinutes,
        energyLevel: workout.energyLevel,
        notes: workout.notes,
        generationPreferences: workout.generationPreferences,
      },
      null,
      2
    )
  );

  console.log("\n## Blocks — structure reasoning + exercises (tags + selection scoring)\n");
  console.log(`Exercise pool size: ${pool.length} · generator seed (passed to adapter): ${seed}\n`);

  for (const block of workout.blocks) {
    const est = block.estimated_minutes ?? "?";
    console.log("-".repeat(72));
    console.log(
      `[${block.block_type}] ${block.title ?? ""} · format=${block.format ?? "?"} · ~${est} min`
    );
    if (block.reasoning) console.log(`  Block reasoning: ${block.reasoning}`);

    for (const item of block.items ?? []) {
      const ex = byId.get(item.exercise_id);
      const scored = ex
        ? scoreExercise(ex, input, recentIds, movementCounts, fatigueState, {
            blockType: block.block_type,
            include_scoring_breakdown: true,
          })
        : null;

      console.log(`  • ${item.exercise_name} (${item.exercise_id})`);
      console.log(`    Catalog: ${formatTags(ex)}`);
      if (item.reasoningTags?.length) {
        console.log(`    Item reasoning_tags: [${item.reasoningTags.join(", ")}]`);
      }
      if (scored?.breakdown) {
        console.log(`    Score (post-hoc, ~session context): total=${scored.score.toFixed(2)}`);
        console.log(`    Top scoring components: ${topScoringComponents(scored.breakdown)}`);
      } else if (!ex) {
        console.log(`    Score: (skipped — id not in loaded pool, e.g. synthetic fallback)`);
      }

      if (ex) {
        recentIds.add(ex.id);
        const pat = (ex.movement_pattern ?? "unknown").toLowerCase();
        movementCounts.set(pat, (movementCounts.get(pat) ?? 0) + 1);
      }
    }
    console.log("");
  }

  console.log("═".repeat(72));
  console.log("Tip: change REVIEW_PREFS in scripts/appSessionReview.ts to match a scenario you want reviewed.");
  console.log("═".repeat(72));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
