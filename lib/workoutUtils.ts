import type { GeneratedWorkout, WorkoutItem, WorkoutBlock } from "./types";

/** All exercise ids in a generated workout (main + supersets), in block order. */
export function collectWorkoutExerciseIds(workout: GeneratedWorkout | null | undefined): string[] {
  if (!workout?.blocks?.length) return [];
  const out: string[] = [];
  for (const block of workout.blocks) {
    const pairs = block.supersetPairs;
    if (pairs?.length) {
      for (const pair of pairs) {
        for (const item of pair) {
          if (item.exercise_id) out.push(item.exercise_id);
        }
      }
      continue;
    }
    for (const item of block.items ?? []) {
      if (item.exercise_id) out.push(item.exercise_id);
    }
  }
  return out;
}

/**
 * Replace one exercise with another across all blocks and superset pairs.
 * Preserves prescription (sets, reps, etc.) for the slot.
 */
export function replaceExerciseInWorkout(
  workout: GeneratedWorkout,
  fromExerciseId: string,
  toId: string,
  toName: string
): GeneratedWorkout {
  const updateItem = (item: WorkoutItem): WorkoutItem =>
    item.exercise_id === fromExerciseId
      ? { ...item, exercise_id: toId, exercise_name: toName }
      : item;

  const updateBlock = (block: WorkoutBlock): WorkoutBlock => {
    if (block.supersetPairs && block.supersetPairs.length > 0) {
      return {
        ...block,
        supersetPairs: block.supersetPairs.map((pair) =>
          pair.map(updateItem) as [WorkoutItem, WorkoutItem]
        ),
      };
    }
    return {
      ...block,
      items: block.items.map(updateItem),
    };
  };

  return {
    ...workout,
    blocks: workout.blocks.map(updateBlock),
  };
}
