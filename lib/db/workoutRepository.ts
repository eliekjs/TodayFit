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
};

/**
 * Get a single workout by id with blocks and exercises, as GeneratedWorkout (blocks) shape.
 * Supports legacy prescription { text } by mapping to WorkoutItem with coaching_cues.
 */
export async function getWorkout(userId: string, workoutId: string): Promise<GeneratedWorkout | null> {
  const supabase = requireClient();
  const { data: workout, error } = await supabase
    .from("workouts")
    .select("id, intent, created_at")
    .eq("id", workoutId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!workout) return null;

  const intent = workout.intent as Record<string, unknown>;
  const { data: blockRows } = await supabase
    .from("workout_blocks")
    .select("id, block_type, title, reasoning, sort_order")
    .eq("workout_id", workoutId)
    .order("sort_order");
  if (!blockRows?.length) {
    return {
      id: workout.id,
      focus: (intent.focus as string[]) ?? [],
      durationMinutes: (intent.durationMinutes as number) ?? null,
      energyLevel: (intent.energyLevel as GeneratedWorkout["energyLevel"]) ?? null,
      notes: intent.notes as string | undefined,
      blocks: [],
    };
  }

  const blocks: WorkoutBlock[] = [];
  for (const block of blockRows as Array<{ id: string; block_type: string; title: string; reasoning: string | null; sort_order: number }>) {
    const { data: exRows } = await supabase
      .from("workout_exercises")
      .select("exercise_slug, exercise_name, prescription, sort_order")
      .eq("block_id", block.id)
      .order("sort_order");
    const items: WorkoutItem[] = (exRows ?? []).map((r: { exercise_slug: string; exercise_name: string; prescription: PrescriptionRow }) => {
      const p = r.prescription ?? {};
      return {
        exercise_id: r.exercise_slug,
        exercise_name: r.exercise_name,
        sets: p.sets ?? 1,
        reps: p.reps,
        time_seconds: p.time_seconds,
        rest_seconds: p.rest_seconds ?? 0,
        coaching_cues: p.coaching_cues ?? (p.text as string) ?? "",
        reasoning_tags: p.reasoning_tags,
      };
    });
    blocks.push({
      block_type: block.block_type as WorkoutBlock["block_type"],
      format: "circuit",
      title: block.title,
      reasoning: block.reasoning ?? undefined,
      items,
    });
  }

  return {
    id: workout.id,
    focus: (intent.focus as string[]) ?? [],
    durationMinutes: (intent.durationMinutes as number) ?? null,
    energyLevel: (intent.energyLevel as GeneratedWorkout["energyLevel"]) ?? null,
    notes: intent.notes as string | undefined,
    blocks,
  };
}

/**
 * Save a full generated workout (create + blocks + exercises) in one go.
 */
export async function saveGeneratedWorkout(userId: string, workout: GeneratedWorkout): Promise<string> {
  const { id } = await createWorkout(userId, {
    focus: workout.focus,
    durationMinutes: workout.durationMinutes,
    energyLevel: workout.energyLevel,
    notes: workout.notes,
  });
  await addBlocksAndExercises(id, workout.blocks);
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
    const i = r.intent as Record<string, unknown>;
    const raw = i.workout as GeneratedWorkout | undefined;
    const workout = raw ? normalizeGeneratedWorkout(raw as Parameters<typeof normalizeGeneratedWorkout>[0]) : undefined;
    return {
      id: r.id,
      date: (i.date as string) ?? "",
      focus: (i.focus as string[]) ?? [],
      durationMinutes: (i.durationMinutes as number) ?? null,
      name: i.name as string | undefined,
      workout,
      exerciseNotes: i.exerciseNotes as Record<string, string> | undefined,
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
    const i = r.intent as Record<string, unknown>;
    const raw = i.workout as GeneratedWorkout;
    const workout = normalizeGeneratedWorkout(raw as Parameters<typeof normalizeGeneratedWorkout>[0]);
    return {
      id: r.id,
      savedAt: (i.savedAt as string) ?? r.created_at,
      workout,
      progress: i.progress as SavedWorkout["progress"],
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
