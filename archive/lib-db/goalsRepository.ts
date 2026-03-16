import { getSupabase } from "./client";

function requireClient() {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error("Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.");
  }
  return supabase;
}

export type UserGoal = {
  id: string;
  goal_type: string;
  goal_slug: string;
  priority: number;
  created_at: string;
  updated_at: string;
};

/**
 * List user goals (e.g. primary focus, secondary goals).
 */
export async function listGoals(userId: string): Promise<UserGoal[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from("user_goals")
    .select("id, goal_type, goal_slug, priority, created_at, updated_at")
    .eq("user_id", userId)
    .order("priority", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as UserGoal[];
}

/**
 * Replace user goals with a new set (delete existing, insert new).
 */
export async function upsertGoals(
  userId: string,
  goals: { goal_type: string; goal_slug: string; priority: number }[]
): Promise<void> {
  const supabase = requireClient();
  await supabase.from("user_goals").delete().eq("user_id", userId);
  if (goals.length) {
    const rows = goals.map((g) => ({
      user_id: userId,
      goal_type: g.goal_type,
      goal_slug: g.goal_slug,
      priority: g.priority,
    }));
    const { error } = await supabase.from("user_goals").insert(rows);
    if (error) throw new Error(error.message);
  }
}
