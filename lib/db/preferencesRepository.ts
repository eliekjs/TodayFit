import { getSupabase } from "./client";
import type { ManualPreferences, PreferencePreset } from "../types";

function requireClient() {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error("Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.");
  }
  return supabase;
}

/**
 * Get user preferences (defaults + full preferences blob).
 */
export async function getPreferences(userId: string): Promise<ManualPreferences | null> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from("user_preferences")
    .select("default_duration, default_energy, preferences")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const prefs = data.preferences as Record<string, unknown>;
  return {
    ...prefs,
    durationMinutes: data.default_duration ?? (prefs.durationMinutes as number) ?? null,
    energyLevel: (data.default_energy as ManualPreferences["energyLevel"]) ?? (prefs.energyLevel as ManualPreferences["energyLevel"]) ?? null,
    goalMatchPrimaryPct: (prefs.goalMatchPrimaryPct as number) ?? 50,
    goalMatchSecondaryPct: (prefs.goalMatchSecondaryPct as number) ?? 30,
    goalMatchTertiaryPct: (prefs.goalMatchTertiaryPct as number) ?? 20,
  } as ManualPreferences;
}

/**
 * Upsert user preferences.
 */
export async function upsertPreferences(userId: string, preferences: Partial<ManualPreferences>): Promise<void> {
  const supabase = requireClient();
  const existing = await getPreferences(userId);
  const merged = { ...existing, ...preferences } as ManualPreferences;
  const { error } = await supabase.from("user_preferences").upsert(
    {
      user_id: userId,
      default_duration: merged.durationMinutes ?? null,
      default_energy: merged.energyLevel ?? null,
      preferences: merged as unknown as Record<string, unknown>,
    },
    { onConflict: "user_id" }
  );
  if (error) throw new Error(error.message);
}

/**
 * List preference presets for user.
 */
export async function listPresets(userId: string): Promise<PreferencePreset[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from("preference_presets")
    .select("id, name, saved_at, preferences")
    .eq("user_id", userId)
    .order("saved_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: { id: string; name: string; saved_at: string; preferences: ManualPreferences }) => ({
    id: r.id,
    name: r.name,
    savedAt: r.saved_at,
    preferences: r.preferences,
  }));
}

/**
 * Add a preference preset.
 */
export async function addPreset(
  userId: string,
  preset: Omit<PreferencePreset, "id">
): Promise<PreferencePreset> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from("preference_presets")
    .insert({
      user_id: userId,
      name: preset.name,
      saved_at: preset.savedAt,
      preferences: preset.preferences as unknown as Record<string, unknown>,
    })
    .select("id, name, saved_at, preferences")
    .single();
  if (error) throw new Error(error.message);
  return {
    id: data.id,
    name: data.name,
    savedAt: data.saved_at,
    preferences: data.preferences as ManualPreferences,
  };
}

/**
 * Update a preset.
 */
export async function updatePreset(
  userId: string,
  id: string,
  update: Partial<Pick<PreferencePreset, "name" | "preferences">>
): Promise<void> {
  const supabase = requireClient();
  const payload: Record<string, unknown> = {};
  if (update.name != null) payload.name = update.name;
  if (update.preferences != null) payload.preferences = update.preferences;
  const { error } = await supabase
    .from("preference_presets")
    .update(payload)
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

/**
 * Remove a preset.
 */
export async function removePreset(userId: string, id: string): Promise<void> {
  const supabase = requireClient();
  const { error } = await supabase
    .from("preference_presets")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}
