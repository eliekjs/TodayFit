import {
  getSupersetPairsForBlock,
  isTimeBasedPrescription,
  type ExecutionProgress,
  type GeneratedWorkout,
  type SetLogRow,
  type WorkoutItem,
} from "./types";

export type WorkoutExerciseRef = {
  id: string;
  name: string;
  item: WorkoutItem;
};

export type WorkoutLogExercise = {
  exerciseId: string;
  exerciseName: string;
  exerciseNotes?: string;
  sets?: SetLogRow[];
  completed?: boolean;
  isTimeBased: boolean;
};

export type ResolvedWorkoutLog = {
  exerciseNotes: Record<string, string>;
  exercisePerformance: Record<string, { sets: SetLogRow[] }>;
};

export function collectWorkoutExercises(workout: GeneratedWorkout): WorkoutExerciseRef[] {
  const out: WorkoutExerciseRef[] = [];
  for (const block of workout.blocks) {
    const pairs = getSupersetPairsForBlock(block);
    if (pairs?.length) {
      for (const pair of pairs) {
        for (const item of pair) {
          out.push({ id: item.exercise_id, name: item.exercise_name, item });
        }
      }
      continue;
    }
    for (const item of block.items ?? []) {
      out.push({ id: item.exercise_id, name: item.exercise_name, item });
    }
  }
  return out;
}

export function resolveWorkoutLog(
  exerciseNotes?: Record<string, string>,
  exercisePerformance?: Record<string, { sets: SetLogRow[] }>,
  progress?: ExecutionProgress | null
): ResolvedWorkoutLog {
  if (progress && Object.keys(progress).length > 0) {
    const notes: Record<string, string> = {};
    const performance: Record<string, { sets: SetLogRow[] }> = {};
    for (const [id, p] of Object.entries(progress)) {
      if (p.notes?.trim()) notes[id] = p.notes.trim();
      if (p.sets?.length) performance[id] = { sets: p.sets };
    }
    return { exerciseNotes: notes, exercisePerformance: performance };
  }
  return {
    exerciseNotes: exerciseNotes ?? {},
    exercisePerformance: exercisePerformance ?? {},
  };
}

export function buildWorkoutLogExercises(
  workout: GeneratedWorkout,
  exerciseNotes?: Record<string, string>,
  exercisePerformance?: Record<string, { sets: SetLogRow[] }>,
  progress?: ExecutionProgress | null
): WorkoutLogExercise[] {
  const { exerciseNotes: notes, exercisePerformance: performance } = resolveWorkoutLog(
    exerciseNotes,
    exercisePerformance,
    progress
  );
  const entries: WorkoutLogExercise[] = [];

  for (const exercise of collectWorkoutExercises(workout)) {
    const note = notes[exercise.id];
    const sets = performance[exercise.id]?.sets;
    const completed = progress?.[exercise.id]?.completed;
    const hasData = Boolean(note) || Boolean(sets?.length) || completed === true;
    if (!hasData) continue;

    entries.push({
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      exerciseNotes: note,
      sets,
      completed,
      isTimeBased: isTimeBasedPrescription(exercise.item),
    });
  }

  return entries;
}

export function formatLoggedSetRow(
  row: SetLogRow,
  index: number,
  mode: "strength" | "rounds"
): string {
  const label = mode === "rounds" ? `Round ${index + 1}` : `Set ${index + 1}`;
  const parts: string[] = [];
  if (mode === "strength") {
    if (row.reps != null) parts.push(`${row.reps} reps`);
    if (row.load_kg != null) parts.push(`@ ${row.load_kg}`);
  } else if (row.duration_seconds != null) {
    const min = row.duration_seconds / 60;
    parts.push(`${Number.isInteger(min) ? min : min.toFixed(1)} min`);
  }
  if (row.notes?.trim()) parts.push(row.notes.trim());
  return parts.length > 0 ? `${label}: ${parts.join(" · ")}` : label;
}

export function summarizeWorkoutLog(
  workout: GeneratedWorkout,
  exerciseNotes?: Record<string, string>,
  exercisePerformance?: Record<string, { sets: SetLogRow[] }>,
  progress?: ExecutionProgress | null
): string | null {
  const entries = buildWorkoutLogExercises(
    workout,
    exerciseNotes,
    exercisePerformance,
    progress
  );
  if (entries.length === 0) return null;

  let setCount = 0;
  let noteCount = 0;
  for (const entry of entries) {
    if (entry.exerciseNotes) noteCount += 1;
    if (entry.sets?.length) setCount += entry.sets.length;
  }

  const parts: string[] = [`${entries.length} exercise${entries.length !== 1 ? "s" : ""} logged`];
  if (setCount > 0) {
    parts.push(`${setCount} set${setCount !== 1 ? "s" : ""}`);
  }
  if (noteCount > 0) {
    parts.push(`${noteCount} note${noteCount !== 1 ? "s" : ""}`);
  }
  return parts.join(" · ");
}

export function hasWorkoutLogData(
  workout: GeneratedWorkout,
  exerciseNotes?: Record<string, string>,
  exercisePerformance?: Record<string, { sets: SetLogRow[] }>,
  progress?: ExecutionProgress | null
): boolean {
  return buildWorkoutLogExercises(workout, exerciseNotes, exercisePerformance, progress).length > 0;
}
