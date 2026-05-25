import type { GeneratedWorkout, WorkoutItem, WorkoutBlock } from "./types";
import type { WorkoutSession } from "../logic/workoutGeneration/types";
import type { Exercise } from "../logic/workoutGeneration/types";
import { resolveExerciseDescription } from "./exerciseDescriptionsCurated";

function descriptionForExerciseId(
  exerciseId: string,
  descriptionById?: Map<string, string>
): string | undefined {
  return resolveExerciseDescription(exerciseId, descriptionById?.get(exerciseId));
}

function attachDescriptionToItem(
  item: WorkoutItem,
  descriptionById?: Map<string, string>
): WorkoutItem {
  const desc = descriptionForExerciseId(item.exercise_id, descriptionById);
  if (!desc) return item;
  return { ...item, exercise_description: desc };
}

/** Attach catalog descriptions to every item in a generated workout. */
export function attachExerciseDescriptionsToWorkout(
  workout: GeneratedWorkout,
  descriptionById?: Map<string, string>
): GeneratedWorkout {
  const updateBlock = (block: WorkoutBlock): WorkoutBlock => {
    if (block.supersetPairs?.length) {
      return {
        ...block,
        supersetPairs: block.supersetPairs.map(
          (pair) => pair.map((item) => attachDescriptionToItem(item, descriptionById)) as [
            WorkoutItem,
            WorkoutItem,
          ]
        ),
        items: block.items.map((item) => attachDescriptionToItem(item, descriptionById)),
      };
    }
    return {
      ...block,
      items: block.items.map((item) => attachDescriptionToItem(item, descriptionById)),
    };
  };
  return { ...workout, blocks: workout.blocks.map(updateBlock) };
}

export function buildExerciseDescriptionMap(pool: Exercise[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const e of pool) {
    const d = resolveExerciseDescription(e.id, e.description);
    if (d) map.set(e.id, d);
  }
  return map;
}

export function attachExerciseDescriptionsToSession(
  session: WorkoutSession,
  exercisePool: Exercise[]
): WorkoutSession {
  const descriptionById = buildExerciseDescriptionMap(exercisePool);
  const blocks = session.blocks.map((block) => {
    const mapItem = (item: WorkoutItem) => attachDescriptionToItem(item, descriptionById);
    if (block.supersetPairs?.length) {
      const supersetPairs = block.supersetPairs.map(
        (pair) => pair.map(mapItem) as [WorkoutItem, WorkoutItem]
      );
      return {
        ...block,
        supersetPairs,
        items: block.items.map(mapItem),
      };
    }
    return { ...block, items: block.items.map(mapItem) };
  });
  return { ...session, blocks };
}

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
  toName: string,
  toDescription?: string
): GeneratedWorkout {
  const updateItem = (item: WorkoutItem): WorkoutItem => {
    if (item.exercise_id !== fromExerciseId) return item;
    const desc =
      toDescription?.trim() ??
      resolveExerciseDescription(toId) ??
      item.exercise_description;
    return {
      ...item,
      exercise_id: toId,
      exercise_name: toName,
      ...(desc ? { exercise_description: desc } : {}),
    };
  };

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
