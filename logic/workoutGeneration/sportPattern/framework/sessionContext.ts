import type { WorkoutBlock } from "../../../lib/types";
import type { GenerateWorkoutInput } from "../../types";
import type { SportCoverageContext } from "../../sportPatternTransfer/types";

/** Collect exercise ids per block type (for coverage validation). */
export function collectBlocksExerciseIdsByType(blocks: WorkoutBlock[]): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const b of blocks) {
    const k = b.block_type;
    const prev = m.get(k) ?? [];
    for (const it of b.items) {
      prev.push(it.exercise_id);
    }
    m.set(k, prev);
  }
  return m;
}

/** Session-level context for minimum-coverage rules (training blocks only, no warmup/cooldown). */
export function buildSportCoverageContext(input: GenerateWorkoutInput, blocks: WorkoutBlock[]): SportCoverageContext {
  const training = blocks.filter((b) => b.block_type !== "warmup" && b.block_type !== "cooldown");
  return {
    input,
    trainingBlockCount: training.length,
    hasMainStrengthBlock: training.some((b) => b.block_type === "main_strength"),
    hasConditioningBlock: training.some((b) => b.block_type === "conditioning"),
  };
}
