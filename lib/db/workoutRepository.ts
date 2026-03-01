import { getSupabase } from "./client";
import type { GeneratedWorkout, WorkoutSection, GeneratedExercise, WorkoutHistoryItem, SavedWorkout } from "../types";

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
 * Add blocks (sections) and exercises to an existing workout.
 */
export async function addBlocksAndExercises(
  workoutId: string,
  sections: { id: string; title: string; reasoning?: string; exercises: GeneratedExercise[] }[]
): Promise<void> {
  const supabase = requireClient();

  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    const { data: block, error: blockError } = await supabase
      .from("workout_blocks")
      .insert({
        workout_id: workoutId,
        block_type: sec.id,
        sort_order: i,
        title: sec.title,
        reasoning: sec.reasoning ?? null,
      })
      .select("id")
      .single();
    if (blockError) throw new Error(blockError.message);

    for (let j = 0; j < sec.exercises.length; j++) {
      const ex = sec.exercises[j];
      const { error: exError } = await supabase.from("workout_exercises").insert({
        workout_id: workoutId,
        block_id: block.id,
        sort_order: j,
        prescription: { text: ex.prescription },
        exercise_slug: ex.id,
        exercise_name: ex.name,
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

/**
 * Get a single workout by id with blocks and exercises, as GeneratedWorkout shape.
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
  const { data: blocks } = await supabase
    .from("workout_blocks")
    .select("id, block_type, title, reasoning, sort_order")
    .eq("workout_id", workoutId)
    .order("sort_order");
  if (!blocks?.length) {
    return {
      id: workout.id,
      focus: (intent.focus as string[]) ?? [],
      durationMinutes: (intent.durationMinutes as number) ?? null,
      energyLevel: (intent.energyLevel as GeneratedWorkout["energyLevel"]) ?? null,
      notes: intent.notes as string | undefined,
      sections: [],
    };
  }

  const sections: WorkoutSection[] = [];
  for (const block of blocks as Array<{ id: string; block_type: string; title: string; reasoning: string | null; sort_order: number }>) {
    const { data: exRows } = await supabase
      .from("workout_exercises")
      .select("exercise_slug, exercise_name, prescription, sort_order")
      .eq("block_id", block.id)
      .order("sort_order");
    const exercises: GeneratedExercise[] = (exRows ?? []).map((r: { exercise_slug: string; exercise_name: string; prescription: { text?: string } }) => ({
      id: r.exercise_slug,
      name: r.exercise_name,
      prescription: typeof r.prescription === "object" && r.prescription && "text" in r.prescription ? (r.prescription.text as string) : "",
      tags: [],
    }));
    sections.push({
      id: block.block_type,
      title: block.title,
      reasoning: block.reasoning ?? undefined,
      exercises,
    });
  }

  return {
    id: workout.id,
    focus: (intent.focus as string[]) ?? [],
    durationMinutes: (intent.durationMinutes as number) ?? null,
    energyLevel: (intent.energyLevel as GeneratedWorkout["energyLevel"]) ?? null,
    notes: intent.notes as string | undefined,
    sections,
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
  await addBlocksAndExercises(
    id,
    workout.sections.map((s) => ({
      id: s.id,
      title: s.title,
      reasoning: s.reasoning,
      exercises: s.exercises,
    }))
  );
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
 * List completed workouts (history) for user.
 */
export async function listCompletedWorkouts(userId: string): Promise<WorkoutHistoryItem[]> {
  const rows = await listWorkouts(userId, "completed");
  return rows.map((r) => {
    const i = r.intent as Record<string, unknown>;
    return {
      id: r.id,
      date: (i.date as string) ?? "",
      focus: (i.focus as string[]) ?? [],
      durationMinutes: (i.durationMinutes as number) ?? null,
      name: i.name as string | undefined,
      workout: i.workout as GeneratedWorkout | undefined,
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
 * List saved workouts for user.
 */
export async function listSavedWorkouts(userId: string): Promise<SavedWorkout[]> {
  const rows = await listWorkouts(userId, "saved");
  return rows.map((r) => {
    const i = r.intent as Record<string, unknown>;
    return {
      id: r.id,
      savedAt: (i.savedAt as string) ?? r.created_at,
      workout: i.workout as GeneratedWorkout,
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
