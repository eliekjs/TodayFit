import { getSupabase } from "./client";
import type { GeneratedWorkout, WorkoutBlock, WorkoutItem, WorkoutHistoryItem, SavedWorkout } from "../types";
import { normalizeGeneratedWorkout } from "../types";

function requireClient() {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error("Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.");
  }
  return supabase;
}

export type CreateWorkoutIntent = {
  focus?: string[];
  durationMinutes?: number | null;
  energyLevel?: string | null;
  notes?: string;
  generationPreferences?: import("../types").ManualPreferences;
  [key: string]: unknown;
};

/**
 * Create a workout and return its id and created record.
 */
export async function createWorkout(
  userId: string,
  intent: CreateWorkoutIntent
): Promise<{ id: string }> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from("workouts")
    .insert({
      user_id: userId,
      mode: "manual",
      title: intent.title ?? "Workout",
      intent: intent as Record<string, unknown>,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id };
}

/**
 * Add blocks and exercises to an existing workout. Prescription stored as structured jsonb.
 */
export async function addBlocksAndExercises(
  workoutId: string,
  blocks: WorkoutBlock[]
): Promise<void> {
  const supabase = requireClient();

  for (let i = 0; i < blocks.length; i++) {
    const blk = blocks[i];
    const { data: blockRow, error: blockError } = await supabase
      .from("workout_blocks")
      .insert({
        workout_id: workoutId,
        block_type: blk.block_type,
        sort_order: i,
        title: blk.title ?? null,
        reasoning: blk.reasoning ?? null,
      })
      .select("id")
      .single();
    if (blockError) throw new Error(blockError.message);

    for (let j = 0; j < blk.items.length; j++) {
      const item = blk.items[j];
      const prescription: Record<string, unknown> = {
        sets: item.sets,
        rest_seconds: item.rest_seconds,
        coaching_cues: item.coaching_cues,
      };
      if (item.reps != null) prescription.reps = item.reps;
      if (item.time_seconds != null) prescription.time_seconds = item.time_seconds;
      if (item.reasoning_tags?.length) prescription.reasoning_tags = item.reasoning_tags;
      if (item.unilateral === true) prescription.unilateral = true;

      const { error: exError } = await supabase.from("workout_exercises").insert({
        workout_id: workoutId,
        block_id: blockRow.id,
        sort_order: j,
        prescription,
        exercise_slug: item.exercise_id,
        exercise_name: item.exercise_name,
        notes: null,
      });
      if (exError) throw new Error(exError.message);
    }
  }
}

/**
 * List workouts for user, optionally filtered by mode. Returns minimal summary; use getWorkout for full.
 */
export async function listWorkouts(
  userId: string,
  mode?: "manual" | "completed" | "saved"
): Promise<{ id: string; intent: CreateWorkoutIntent; created_at: string }[]> {
  const supabase = requireClient();
  let query = supabase
    .from("workouts")
    .select("id, intent, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (mode) query = query.eq("mode", mode);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: { id: string; intent: CreateWorkoutIntent; created_at: string }) => ({
    id: r.id,
    intent: r.intent as CreateWorkoutIntent,
    created_at: r.created_at,
  }));
}

type PrescriptionRow = {
  sets?: number;
  reps?: number;
  time_seconds?: number;
  rest_seconds?: number;
  coaching_cues?: string;
  reasoning_tags?: string[];
  text?: string;
  unilateral?: boolean;
};

type WorkoutSummaryRow = {
  id: string;
  intent: Record<string, unknown>;
  created_at: string;
};

type BlockQueryRow = {
  id: string;
  workout_id: string;
  block_type: string;
  title: string;
  reasoning: string | null;
  sort_order: number;
};

type ExerciseQueryRow = {
  block_id: string;
  exercise_slug: string;
  exercise_name: string;
  prescription: unknown;
  sort_order: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((entry): entry is string => typeof entry === "string");
}

function asExerciseNotes(value: unknown): Record<string, string> | undefined {
  if (!isRecord(value)) return undefined;
  const entries = Object.entries(value).filter(
    ([key, note]) => typeof key === "string" && typeof note === "string"
  );
  return Object.fromEntries(entries);
}

function asProgress(value: unknown): SavedWorkout["progress"] {
  if (!isRecord(value)) return undefined;
  const entries = Object.entries(value).filter(([, state]) => {
    if (!isRecord(state)) return false;
    return (
      typeof state.completed === "boolean" &&
      typeof state.setsCompleted === "number" &&
      Number.isFinite(state.setsCompleted)
    );
  });
  return entries.length > 0
    ? (Object.fromEntries(entries) as SavedWorkout["progress"])
    : undefined;
}

function asIntentRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asGeneratedWorkout(value: unknown, fallbackId: string): GeneratedWorkout | undefined {
  if (!isRecord(value)) return undefined;
  const normalized = normalizeGeneratedWorkout({
    id: asString(value.id) ?? fallbackId,
    focus: asStringArray(value.focus) ?? [],
    durationMinutes: asNullableNumber(value.durationMinutes),
    energyLevel: asEnergyLevel(value.energyLevel),
    notes: asString(value.notes),
    generationPreferences: value.generationPreferences as GeneratedWorkout["generationPreferences"],
    sections: Array.isArray(value.sections) ? value.sections : undefined,
    blocks: Array.isArray(value.blocks) ? value.blocks : undefined,
  });
  return normalized;
}

function asEnergyLevel(value: unknown): GeneratedWorkout["energyLevel"] {
  return value === "low" || value === "medium" || value === "high" ? value : null;
}

function toWorkoutItem(row: ExerciseQueryRow): WorkoutItem {
  const p = (isRecord(row.prescription) ? row.prescription : {}) as PrescriptionRow;
  return {
    exercise_id: row.exercise_slug,
    exercise_name: row.exercise_name,
    sets: p.sets ?? 1,
    reps: p.reps,
    time_seconds: p.time_seconds,
    rest_seconds: p.rest_seconds ?? 0,
    coaching_cues: p.coaching_cues ?? (p.text as string) ?? "",
    reasoning_tags: p.reasoning_tags,
    ...(p.unilateral === true ? { unilateral: true } : {}),
  };
}

export function buildGeneratedWorkoutMapFromRows(
  workouts: WorkoutSummaryRow[],
  blockRows: BlockQueryRow[],
  exerciseRows: ExerciseQueryRow[]
): Record<string, GeneratedWorkout> {
  const blocksByWorkout = new Map<string, BlockQueryRow[]>();
  for (const block of blockRows) {
    const arr = blocksByWorkout.get(block.workout_id) ?? [];
    arr.push(block);
    blocksByWorkout.set(block.workout_id, arr);
  }

  const exercisesByBlock = new Map<string, ExerciseQueryRow[]>();
  for (const ex of exerciseRows) {
    const arr = exercisesByBlock.get(ex.block_id) ?? [];
    arr.push(ex);
    exercisesByBlock.set(ex.block_id, arr);
  }

  for (const rows of blocksByWorkout.values()) {
    rows.sort((a, b) => a.sort_order - b.sort_order);
  }
  for (const rows of exercisesByBlock.values()) {
    rows.sort((a, b) => a.sort_order - b.sort_order);
  }

  const out: Record<string, GeneratedWorkout> = {};
  for (const workout of workouts) {
    const intent = asIntentRecord(workout.intent);
    const workoutBlocks = blocksByWorkout.get(workout.id) ?? [];
    const blocks: WorkoutBlock[] = workoutBlocks.map((block) => {
      const items = (exercisesByBlock.get(block.id) ?? []).map(toWorkoutItem);
      return {
        block_type: block.block_type as WorkoutBlock["block_type"],
        format: "circuit" as const,
        title: block.title,
        reasoning: block.reasoning ?? undefined,
        items,
      };
    });

    out[workout.id] = {
      id: workout.id,
      focus: asStringArray(intent.focus) ?? [],
      durationMinutes: asNullableNumber(intent.durationMinutes),
      energyLevel: asEnergyLevel(intent.energyLevel),
      notes: asString(intent.notes),
      generationPreferences: intent.generationPreferences as GeneratedWorkout["generationPreferences"],
      blocks,
    };
  }

  return out;
}

export async function getWorkoutsByIds(
  userId: string,
  workoutIds: string[]
): Promise<Record<string, GeneratedWorkout>> {
  const uniqueIds = [...new Set(workoutIds)];
  if (uniqueIds.length === 0) return {};

  const supabase = requireClient();
  const { data: workouts, error: workoutsError } = await supabase
    .from("workouts")
    .select("id, intent, created_at")
    .eq("user_id", userId)
    .in("id", uniqueIds);
  if (workoutsError) throw new Error(workoutsError.message);
  const workoutRows = (workouts ?? []) as WorkoutSummaryRow[];
  if (workoutRows.length === 0) return {};

  const foundWorkoutIds = workoutRows.map((w) => w.id);
  const { data: blockRowsData, error: blockRowsError } = await supabase
    .from("workout_blocks")
    .select("id, workout_id, block_type, title, reasoning, sort_order")
    .in("workout_id", foundWorkoutIds)
    .order("sort_order");
  if (blockRowsError) throw new Error(blockRowsError.message);
  const blockRows = (blockRowsData ?? []) as BlockQueryRow[];
  if (blockRows.length === 0) {
    return buildGeneratedWorkoutMapFromRows(workoutRows, [], []);
  }

  const blockIds = blockRows.map((b) => b.id);
  const { data: exRowsData, error: exRowsError } = await supabase
    .from("workout_exercises")
    .select("block_id, exercise_slug, exercise_name, prescription, sort_order")
    .in("block_id", blockIds)
    .order("sort_order");
  if (exRowsError) throw new Error(exRowsError.message);
  const exRows = (exRowsData ?? []) as ExerciseQueryRow[];

  return buildGeneratedWorkoutMapFromRows(workoutRows, blockRows, exRows);
}

/**
 * Get a single workout by id with blocks and exercises, as GeneratedWorkout (blocks) shape.
 * Supports legacy prescription { text } by mapping to WorkoutItem with coaching_cues.
 */
export async function getWorkout(userId: string, workoutId: string): Promise<GeneratedWorkout | null> {
  const byId = await getWorkoutsByIds(userId, [workoutId]);
  return byId[workoutId] ?? null;
}

/**
 * Save a full generated workout (create + blocks + exercises) in one go.
 */
export async function saveGeneratedWorkout(userId: string, workout: GeneratedWorkout): Promise<string> {
  const supabase = requireClient();
  const { id } = await createWorkout(userId, {
    focus: workout.focus,
    durationMinutes: workout.durationMinutes,
    energyLevel: workout.energyLevel,
    notes: workout.notes,
    generationPreferences: workout.generationPreferences,
  });
  try {
    await addBlocksAndExercises(id, workout.blocks);
  } catch (originalError) {
    try {
      // Best-effort cleanup in child-to-parent order so failures don't leave orphan rows.
      const { error: exerciseCleanupError } = await supabase
        .from("workout_exercises")
        .delete()
        .eq("workout_id", id);
      if (exerciseCleanupError) {
        console.error("workoutRepository.saveGeneratedWorkout.rollback_exercises_failed", {
          userId,
          workoutId: id,
          reason: exerciseCleanupError.message,
        });
      }

      const { error: blockCleanupError } = await supabase.from("workout_blocks").delete().eq("workout_id", id);
      if (blockCleanupError) {
        console.error("workoutRepository.saveGeneratedWorkout.rollback_blocks_failed", {
          userId,
          workoutId: id,
          reason: blockCleanupError.message,
        });
      }

      const { error: workoutCleanupError } = await supabase
        .from("workouts")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      if (workoutCleanupError) {
        console.error("workoutRepository.saveGeneratedWorkout.rollback_workout_failed", {
          userId,
          workoutId: id,
          reason: workoutCleanupError.message,
        });
      }
    } catch (cleanupFailure) {
      console.error("workoutRepository.saveGeneratedWorkout.rollback_failed", {
        userId,
        workoutId: id,
        cleanupFailure,
      });
    }
    throw originalError;
  }
  return id;
}

/**
 * Save a completed workout (history item) as a single row with intent snapshot.
 */
export async function saveCompletedWorkout(userId: string, item: Omit<WorkoutHistoryItem, "id">): Promise<string> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from("workouts")
    .insert({
      user_id: userId,
      mode: "completed",
      title: item.name ?? "Completed",
      intent: {
        date: item.date,
        focus: item.focus,
        durationMinutes: item.durationMinutes,
        name: item.name,
        workout: item.workout,
        exerciseNotes: item.exerciseNotes,
      },
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

/**
 * List completed workouts (history) for user. Normalizes legacy section-based workouts to blocks.
 */
export async function listCompletedWorkouts(userId: string): Promise<WorkoutHistoryItem[]> {
  const rows = await listWorkouts(userId, "completed");
  return rows.map((r) => {
    const i = asIntentRecord(r.intent);
    const workout = asGeneratedWorkout(i.workout, r.id);
    return {
      id: r.id,
      date: asString(i.date) ?? "",
      focus: asStringArray(i.focus) ?? [],
      durationMinutes: asNullableNumber(i.durationMinutes),
      name: asString(i.name),
      workout,
      exerciseNotes: asExerciseNotes(i.exerciseNotes),
    };
  });
}

/**
 * Save a saved (in-progress) workout.
 */
export async function saveSavedWorkout(userId: string, item: Omit<SavedWorkout, "id">): Promise<string> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from("workouts")
    .insert({
      user_id: userId,
      mode: "saved",
      title: "Saved",
      intent: { savedAt: item.savedAt, workout: item.workout, progress: item.progress },
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

/**
 * List saved workouts for user. Normalizes legacy section-based workouts to blocks.
 */
export async function listSavedWorkouts(userId: string): Promise<SavedWorkout[]> {
  const rows = await listWorkouts(userId, "saved");
  return rows.map((r) => {
    const i = asIntentRecord(r.intent);
    const workout = asGeneratedWorkout(i.workout, r.id) ?? normalizeGeneratedWorkout({
      id: r.id,
      focus: [],
      durationMinutes: null,
      energyLevel: null,
      blocks: [],
    });
    return {
      id: r.id,
      savedAt: asString(i.savedAt) ?? r.created_at,
      workout,
      progress: asProgress(i.progress),
    };
  });
}

/**
 * Delete a workout (e.g. remove from history or saved).
 */
export async function deleteWorkout(userId: string, workoutId: string): Promise<void> {
  const supabase = requireClient();
  const { error } = await supabase.from("workouts").delete().eq("id", workoutId).eq("user_id", userId);
  if (error) throw new Error(error.message);
}
