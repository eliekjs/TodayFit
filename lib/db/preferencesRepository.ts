import { getSupabase } from "./client";
import type { ManualPreferences, PreferencePreset } from "../types";

const DEFAULT_MANUAL_PREFERENCES: ManualPreferences = {
  primaryFocus: [],
  targetBody: null,
  targetModifier: [],
  durationMinutes: null,
  energyLevel: null,
  injuries: [],
  upcoming: [],
  subFocusByGoal: {},
  workoutStyle: [],
  preferredZone2Cardio: [],
  goalMatchPrimaryPct: 50,
  goalMatchSecondaryPct: 30,
  goalMatchTertiaryPct: 20,
  workoutTier: "intermediate",
  includeCreativeVariations: false,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((entry): entry is string => typeof entry === "string");
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function asEnergyLevel(value: unknown): ManualPreferences["energyLevel"] | undefined {
  if (value === "low" || value === "medium" || value === "high") return value;
  return undefined;
}

function asTargetBody(value: unknown): ManualPreferences["targetBody"] | undefined {
  if (value === "Upper" || value === "Lower" || value === "Full") return value;
  if (value === null) return null;
  return undefined;
}

function asSubFocusByGoal(value: unknown): Record<string, string[]> | undefined {
  if (!isRecord(value)) return undefined;
  const out: Record<string, string[]> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof key !== "string") continue;
    const parsed = asStringArray(raw);
    if (parsed) out[key] = parsed;
  }
  return out;
}

function normalizeManualPreferencesPayload(raw: unknown): ManualPreferences {
  const prefs = isRecord(raw) ? raw : {};
  const weeklySubFocusCoverage = isRecord(prefs.weeklySubFocusCoverage)
    ? prefs.weeklySubFocusCoverage
    : undefined;
  const weeklySubFocusCoverageTrainingDayIndex = asNumber(weeklySubFocusCoverage?.trainingDayIndex);
  const weeklySubFocusCoverageTrainingDaysTotal = asNumber(weeklySubFocusCoverage?.trainingDaysTotal);
  const weeklySubFocusCoverageTargetPerSubFocus = asNumber(weeklySubFocusCoverage?.targetPerSubFocus);
  const weeklySubFocusCoverageMatchCounts = isRecord(weeklySubFocusCoverage?.matchCountsSoFar)
    ? Object.fromEntries(
        Object.entries(weeklySubFocusCoverage.matchCountsSoFar).filter(
          ([key, value]) => typeof key === "string" && typeof value === "number" && Number.isFinite(value)
        )
      )
    : {};
  return {
    ...DEFAULT_MANUAL_PREFERENCES,
    primaryFocus: asStringArray(prefs.primaryFocus) ?? DEFAULT_MANUAL_PREFERENCES.primaryFocus,
    targetBody: asTargetBody(prefs.targetBody) ?? DEFAULT_MANUAL_PREFERENCES.targetBody,
    targetModifier: asStringArray(prefs.targetModifier) ?? DEFAULT_MANUAL_PREFERENCES.targetModifier,
    durationMinutes: asNumber(prefs.durationMinutes) ?? DEFAULT_MANUAL_PREFERENCES.durationMinutes,
    energyLevel: asEnergyLevel(prefs.energyLevel) ?? DEFAULT_MANUAL_PREFERENCES.energyLevel,
    injuries: asStringArray(prefs.injuries) ?? DEFAULT_MANUAL_PREFERENCES.injuries,
    upcoming: asStringArray(prefs.upcoming) ?? DEFAULT_MANUAL_PREFERENCES.upcoming,
    subFocusByGoal: asSubFocusByGoal(prefs.subFocusByGoal) ?? DEFAULT_MANUAL_PREFERENCES.subFocusByGoal,
    workoutStyle: asStringArray(prefs.workoutStyle) ?? DEFAULT_MANUAL_PREFERENCES.workoutStyle,
    preferredZone2Cardio: asStringArray(prefs.preferredZone2Cardio) ?? DEFAULT_MANUAL_PREFERENCES.preferredZone2Cardio,
    goalMatchPrimaryPct: asNumber(prefs.goalMatchPrimaryPct) ?? DEFAULT_MANUAL_PREFERENCES.goalMatchPrimaryPct,
    goalMatchSecondaryPct:
      asNumber(prefs.goalMatchSecondaryPct) ?? DEFAULT_MANUAL_PREFERENCES.goalMatchSecondaryPct,
    goalMatchTertiaryPct:
      asNumber(prefs.goalMatchTertiaryPct) ?? DEFAULT_MANUAL_PREFERENCES.goalMatchTertiaryPct,
    goalDistributionStyle:
      prefs.goalDistributionStyle === "dedicate_days" || prefs.goalDistributionStyle === "blend"
        ? prefs.goalDistributionStyle
        : undefined,
    weeklyBodyEmphasisStyle:
      prefs.weeklyBodyEmphasisStyle === "auto_alternate" || prefs.weeklyBodyEmphasisStyle === "manual"
        ? prefs.weeklyBodyEmphasisStyle
        : undefined,
    specificBodyPartBehavior:
      prefs.specificBodyPartBehavior === "auto_apply" || prefs.specificBodyPartBehavior === "manual"
        ? prefs.specificBodyPartBehavior
        : undefined,
    workoutTier:
      prefs.workoutTier === "beginner" || prefs.workoutTier === "intermediate" || prefs.workoutTier === "advanced"
        ? prefs.workoutTier
        : DEFAULT_MANUAL_PREFERENCES.workoutTier,
    includeCreativeVariations:
      asBoolean(prefs.includeCreativeVariations) ?? DEFAULT_MANUAL_PREFERENCES.includeCreativeVariations,
    weekSubFocusPrimaryLabels: asStringArray(prefs.weekSubFocusPrimaryLabels),
    weekMainStrengthLiftIdsUsed: asStringArray(prefs.weekMainStrengthLiftIdsUsed),
    weeklySubFocusCoverage:
      weeklySubFocusCoverageTrainingDayIndex != null && weeklySubFocusCoverageTrainingDaysTotal != null
      ? {
          matchCountsSoFar: weeklySubFocusCoverageMatchCounts,
          trainingDayIndex: weeklySubFocusCoverageTrainingDayIndex,
          trainingDaysTotal: weeklySubFocusCoverageTrainingDaysTotal,
          targetPerSubFocus: weeklySubFocusCoverageTargetPerSubFocus,
        }
      : undefined,
  };
}

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
  const prefs = normalizeManualPreferencesPayload(data.preferences);
  return {
    ...prefs,
    durationMinutes: asNumber(data.default_duration) ?? prefs.durationMinutes,
    energyLevel: asEnergyLevel(data.default_energy) ?? prefs.energyLevel,
  };
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
  return (data ?? []).map((r: { id: string; name: string; saved_at: string; preferences: unknown }) => ({
    id: r.id,
    name: r.name,
    savedAt: r.saved_at,
    preferences: normalizeManualPreferencesPayload(r.preferences),
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
    preferences: normalizeManualPreferencesPayload(data.preferences),
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
