import { getSupabase } from "./client";
import type { SportPreset, SportFormSnapshot } from "../sessionDraft";

const DEFAULT_SPORT_FORM: SportFormSnapshot = {
  rankedGoals: [null, null, null],
  intensityLevel: "Moderate",
  injuryStatus: "No Concerns",
  injuryTypes: [],
  sportFocusPct: [60, 40],
  sportVsGoalPct: 50,
  rankedSportSlugs: [null, null],
  subFocusBySport: {},
  oneDayDuration: 45,
  oneDayBodyBias: "full",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((entry): entry is string => typeof entry === "string");
}

function asNullableStringTuple(value: unknown, length: number): (string | null)[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out = value
    .slice(0, length)
    .map((v) => (typeof v === "string" ? v : null));
  while (out.length < length) out.push(null);
  return out;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asSubFocusBySport(value: unknown): Record<string, string[]> | undefined {
  if (!isRecord(value)) return undefined;
  const out: Record<string, string[]> = {};
  for (const [key, raw] of Object.entries(value)) {
    const parsed = asStringArray(raw);
    if (parsed) out[key] = parsed;
  }
  return out;
}

function asBodyBias(value: unknown): SportFormSnapshot["oneDayBodyBias"] | undefined {
  if (value === "upper" || value === "lower" || value === "full") return value;
  return undefined;
}

function normalizeSportFormPayload(raw: unknown): SportFormSnapshot {
  const form = isRecord(raw) ? raw : {};
  const sportFocusPct: [number, number] = [
    asNumber(Array.isArray(form.sportFocusPct) ? form.sportFocusPct[0] : undefined) ?? DEFAULT_SPORT_FORM.sportFocusPct[0],
    asNumber(Array.isArray(form.sportFocusPct) ? form.sportFocusPct[1] : undefined) ?? DEFAULT_SPORT_FORM.sportFocusPct[1],
  ];
  return {
    rankedGoals: asNullableStringTuple(form.rankedGoals, 3) ?? DEFAULT_SPORT_FORM.rankedGoals,
    intensityLevel: typeof form.intensityLevel === "string" ? form.intensityLevel : DEFAULT_SPORT_FORM.intensityLevel,
    injuryStatus: typeof form.injuryStatus === "string" ? form.injuryStatus : DEFAULT_SPORT_FORM.injuryStatus,
    injuryTypes: asStringArray(form.injuryTypes) ?? DEFAULT_SPORT_FORM.injuryTypes,
    sportFocusPct,
    sportVsGoalPct: asNumber(form.sportVsGoalPct) ?? DEFAULT_SPORT_FORM.sportVsGoalPct,
    rankedSportSlugs: asNullableStringTuple(form.rankedSportSlugs, 2) ?? DEFAULT_SPORT_FORM.rankedSportSlugs,
    subFocusBySport: asSubFocusBySport(form.subFocusBySport) ?? DEFAULT_SPORT_FORM.subFocusBySport,
    oneDayDuration: asNumber(form.oneDayDuration) ?? DEFAULT_SPORT_FORM.oneDayDuration,
    oneDayBodyBias: asBodyBias(form.oneDayBodyBias) ?? DEFAULT_SPORT_FORM.oneDayBodyBias,
  };
}

function requireClient() {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error("Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.");
  }
  return supabase;
}

/** List sport-mode presets for user. */
export async function listSportPresets(userId: string): Promise<SportPreset[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from("sport_presets")
    .select("id, name, saved_at, sport_form")
    .eq("user_id", userId)
    .order("saved_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: { id: string; name: string; saved_at: string; sport_form: unknown }) => ({
    id: r.id,
    name: r.name,
    savedAt: r.saved_at,
    sportForm: normalizeSportFormPayload(r.sport_form),
  }));
}

/** Add a sport-mode preset. */
export async function addSportPreset(
  userId: string,
  preset: Omit<SportPreset, "id">
): Promise<SportPreset> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from("sport_presets")
    .insert({
      user_id: userId,
      name: preset.name,
      saved_at: preset.savedAt,
      sport_form: preset.sportForm as unknown as Record<string, unknown>,
    })
    .select("id, name, saved_at, sport_form")
    .single();
  if (error) throw new Error(error.message);
  return {
    id: data.id,
    name: data.name,
    savedAt: data.saved_at,
    sportForm: normalizeSportFormPayload(data.sport_form),
  };
}

/** Update a sport-mode preset. */
export async function updateSportPreset(
  userId: string,
  id: string,
  update: Partial<Pick<SportPreset, "name" | "sportForm">>
): Promise<void> {
  const supabase = requireClient();
  const payload: Record<string, unknown> = {};
  if (update.name != null) payload.name = update.name;
  if (update.sportForm != null) payload.sport_form = update.sportForm;
  const { error } = await supabase
    .from("sport_presets")
    .update(payload)
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

/** Remove a sport-mode preset. */
export async function removeSportPreset(userId: string, id: string): Promise<void> {
  const supabase = requireClient();
  const { error } = await supabase
    .from("sport_presets")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}
