import { getSupabase } from "./client";
import type {
  Sport,
  SportCategory,
  SportQuality,
  UserSportProfile,
  SportEvent,
} from "./types";

function requireClient() {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error("Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.");
  }
  return supabase;
}

/**
 * Fetch all sport categories with their sports (sorted by category sort_order, then sport sort_order).
 */
export async function getSportCategories(): Promise<SportCategory[]> {
  const supabase = requireClient();
  const { data: sports, error } = await supabase
    .from("sports")
    .select("id, slug, name, category, is_active, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  if (!sports?.length) return [];

  const byCategory = new Map<string, Sport[]>();
  for (const s of sports as Sport[]) {
    const list = byCategory.get(s.category) ?? [];
    list.push(s);
    byCategory.set(s.category, list);
  }

  const categoryOrder = [
    "team_sports",
    "racquet",
    "climbing",
    "winter",
    "combat",
    "track_sprint",
    "endurance_racing",
  ];
  return categoryOrder
    .filter((c) => byCategory.has(c))
    .map((category) => ({
      category,
      sports: byCategory.get(category) ?? [],
    }));
}

/**
 * Fetch sports in a given category.
 */
export async function getSportsByCategory(category: string): Promise<Sport[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from("sports")
    .select("id, slug, name, category, is_active, sort_order")
    .eq("is_active", true)
    .eq("category", category)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Sport[];
}

/**
 * Fetch qualities for a sport, pre-filtered and sorted by relevance (1 = highest) then quality sort_order.
 */
export async function getQualitiesForSport(sportSlug: string): Promise<SportQuality[]> {
  const supabase = requireClient();

  const { data: sportRow } = await supabase
    .from("sports")
    .select("id")
    .eq("slug", sportSlug)
    .single();

  if (!sportRow) return [];

  const { data: mapRows, error: mapError } = await supabase
    .from("sport_quality_map")
    .select("quality_id, relevance")
    .eq("sport_id", sportRow.id);

  if (mapError) throw new Error(mapError.message);
  if (!mapRows?.length) return [];

  type MapRow = { quality_id: string; relevance: number };
  const rows = mapRows as MapRow[];
  const relevanceByQualityId = new Map(rows.map((r) => [r.quality_id, r.relevance] as [string, number]));
  const qualityIds = rows.map((r) => r.quality_id);

  const { data: qualities, error: qualError } = await supabase
    .from("sport_qualities")
    .select("id, slug, name, description, quality_group, is_active, sort_order")
    .in("id", qualityIds)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (qualError) throw new Error(qualError.message);
  const list = (qualities ?? []) as (SportQuality & { id: string })[];
  list.sort((a, b) => {
    const relA = relevanceByQualityId.get(a.id) ?? 99;
    const relB = relevanceByQualityId.get(b.id) ?? 99;
    return relA !== relB ? relA - relB : a.sort_order - b.sort_order;
  });
  return list;
}

export type UpsertUserSportProfileParams = {
  sportId?: string | null;
  seasonPhase?: string | null;
  notes?: string | null;
  qualityIds?: { qualityId: string; priority: number }[];
};

/**
 * Create or update the user's sport profile and its 1–3 qualities.
 */
export async function upsertUserSportProfile(
  userId: string,
  params: UpsertUserSportProfileParams
): Promise<UserSportProfile> {
  const supabase = requireClient();

  const { data: existing } = await supabase
    .from("user_sport_profiles")
    .select("id")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  let profileId: string;

  if (existing?.id) {
    profileId = existing.id;
    const { error: updateError } = await supabase
      .from("user_sport_profiles")
      .update({
        sport_id: params.sportId ?? null,
        season_phase: params.seasonPhase ?? null,
        notes: params.notes ?? null,
      })
      .eq("id", profileId)
      .eq("user_id", userId);

    if (updateError) throw new Error(updateError.message);

    await supabase
      .from("user_sport_profile_qualities")
      .delete()
      .eq("user_sport_profile_id", profileId);
  } else {
    const { data: inserted, error: insertError } = await supabase
      .from("user_sport_profiles")
      .insert({
        user_id: userId,
        sport_id: params.sportId ?? null,
        season_phase: params.seasonPhase ?? null,
        notes: params.notes ?? null,
      })
      .select("id")
      .single();

    if (insertError) throw new Error(insertError.message);
    profileId = inserted.id;
  }

  if (params.qualityIds?.length) {
    const rows = params.qualityIds.slice(0, 3).map((q) => ({
      user_sport_profile_id: profileId,
      quality_id: q.qualityId,
      priority: q.priority,
    }));
    const { error: qualError } = await supabase
      .from("user_sport_profile_qualities")
      .insert(rows);
    if (qualError) throw new Error(qualError.message);
  }

  const { data: profile, error: fetchError } = await supabase
    .from("user_sport_profiles")
    .select("*")
    .eq("id", profileId)
    .single();

  if (fetchError) throw new Error(fetchError.message);
  return profile as UserSportProfile;
}

export type UpsertSportEventParams = {
  id?: string;
  sportId?: string | null;
  name: string;
  eventDate: string; // YYYY-MM-DD
  importance: string;
};

/**
 * Create or update a sport event for the user.
 */
export async function upsertSportEvent(
  userId: string,
  params: UpsertSportEventParams
): Promise<SportEvent> {
  const supabase = requireClient();

  if (params.id) {
    const { data, error } = await supabase
      .from("sport_events")
      .update({
        sport_id: params.sportId ?? null,
        name: params.name,
        event_date: params.eventDate,
        importance: params.importance,
      })
      .eq("id", params.id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as SportEvent;
  }

  const { data, error } = await supabase
    .from("sport_events")
    .insert({
      user_id: userId,
      sport_id: params.sportId ?? null,
      name: params.name,
      event_date: params.eventDate,
      importance: params.importance,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as SportEvent;
}

/**
 * Read the latest user sport profile (most recent by updated_at).
 */
export async function getLatestUserSportProfile(
  userId: string
): Promise<UserSportProfile | null> {
  const supabase = requireClient();

  const { data, error } = await supabase
    .from("user_sport_profiles")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as UserSportProfile | null;
}
