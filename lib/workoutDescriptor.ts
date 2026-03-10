/**
 * Derives a short, descriptive workout title from a generated workout.
 * Priority: primary body region → primary goal → training style.
 * Used for weekly plan display so users can quickly understand and reorder days.
 */

import type { GeneratedWorkout, WorkoutBlock, WorkoutItem } from "./types";

/** Muscle group counts from exercise tags or block context. */
function countMusclePresence(blocks: WorkoutBlock[]): Record<string, number> {
  const counts: Record<string, number> = {
    upper: 0,
    lower: 0,
    push: 0,
    pull: 0,
    core: 0,
  };
  const pushTags = ["push", "chest", "shoulder", "tricep"];
  const pullTags = ["pull", "back", "bicep", "grip"];
  const lowerTags = ["legs", "quad", "posterior", "glute", "hamstring", "calf"];
  const coreTags = ["core", "abs"];

  for (const block of blocks) {
    if (block.block_type === "warmup" || block.block_type === "cooldown") continue;
    for (const item of block.items) {
      const tags = [...(item.tags ?? []), ...(item.reasoning_tags ?? [])].map((t) =>
        t.toLowerCase()
      );
      const name = (item.exercise_name ?? "").toLowerCase();
      const combined = [...tags, name];

      if (combined.some((s) => pushTags.some((p) => s.includes(p)))) counts.push += 1;
      if (combined.some((s) => pullTags.some((p) => s.includes(p)))) counts.pull += 1;
      if (combined.some((s) => lowerTags.some((p) => s.includes(p)))) counts.lower += 1;
      if (combined.some((s) => coreTags.some((p) => s.includes(p)))) counts.core += 1;
    }
  }

  counts.upper = counts.push + counts.pull;
  return counts;
}

/** Infer primary goal from focus labels and block types. */
function inferGoal(workout: GeneratedWorkout): "strength" | "hypertrophy" | "conditioning" | "mobility" | "power" {
  const focus = (workout.focus ?? []).join(" ").toLowerCase();
  const blockTypes = new Set(workout.blocks.map((b) => b.block_type));

  if (focus.includes("power") || focus.includes("explosive")) return "power";
  if (focus.includes("endurance") || focus.includes("conditioning") || blockTypes.has("conditioning"))
    return "conditioning";
  if (focus.includes("mobility") || focus.includes("joint")) return "mobility";
  if (focus.includes("recovery")) return "mobility";
  if (focus.includes("hypertrophy") || focus.includes("muscle") || blockTypes.has("main_hypertrophy"))
    return "hypertrophy";
  return "strength";
}

/**
 * Returns a human-readable workout title from its defining characteristics.
 * Examples: "Upper Body Strength", "Lower Body Power", "Full Body Hypertrophy".
 */
export function getWorkoutDescriptor(workout: GeneratedWorkout): string {
  const blocks = workout.blocks ?? [];
  const counts = countMusclePresence(blocks);
  const goal = inferGoal(workout);

  const hasMainStrength = blocks.some((b) => b.block_type === "main_strength");
  const hasMainHypertrophy = blocks.some((b) => b.block_type === "main_hypertrophy");
  const hasConditioning = blocks.some((b) => b.block_type === "conditioning");

  let region: string;
  const totalUpper = counts.upper;
  const totalLower = counts.lower;
  const totalCore = counts.core;

  if (totalUpper > totalLower && totalUpper > totalCore) {
    if (counts.push > counts.pull && counts.pull === 0) region = "Upper Push";
    else if (counts.pull > counts.push && counts.push === 0) region = "Upper Pull";
    else if (counts.pull > 0 && counts.push > 0) region = "Upper Body";
    else region = "Upper Body";
  } else if (totalLower > totalUpper && totalLower > totalCore) {
    region = "Lower Body";
  } else if (totalCore > totalUpper && totalCore > totalLower) {
    region = "Core";
  } else if (totalUpper > 0 || totalLower > 0) {
    region = "Full Body";
  } else {
    region = "Full Body";
  }

  let goalLabel: string;
  switch (goal) {
    case "power":
      goalLabel = "Power";
      break;
    case "hypertrophy":
      goalLabel = "Hypertrophy";
      break;
    case "conditioning":
      goalLabel = hasConditioning ? "Conditioning" : "Endurance";
      break;
    case "mobility":
      goalLabel = "Mobility";
      break;
    default:
      goalLabel = hasMainStrength ? "Strength" : hasMainHypertrophy ? "Hypertrophy" : "Strength";
  }

  if (region === "Core" && goalLabel === "Mobility") return "Core & Mobility";
  if (region === "Full Body" && goalLabel === "Conditioning") return "Full Body Conditioning";
  if (region === "Full Body" && goalLabel === "Endurance") return "Full Body Endurance";

  return `${region} ${goalLabel}`.trim();
}
