import { getSupabase } from "./client";
import type { GymProfile } from "../../data/gymProfiles";
import type { EquipmentKey } from "../types";

function requireClient() {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error("Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.");
  }
  return supabase;
}

/**
 * List all gym profiles for a user.
 */
export async function listProfiles(userId: string): Promise<GymProfile[]> {
  const supabase = requireClient();
  const { data: profiles, error } = await supabase
    .from("gym_profiles")
    .select("id, name, is_active, dumbbell_max_weight")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  if (!profiles?.length) return [];

  const ids = profiles.map((p: { id: string }) => p.id);
  const { data: equipRows } = await supabase
    .from("gym_profile_equipment")
    .select("gym_profile_id, equipment_slug")
    .in("gym_profile_id", ids)
    .eq("available", true);

  const equipmentByProfileId = new Map<string, string[]>();
  for (const r of equipRows ?? []) {
    const pid = (r as { gym_profile_id: string }).gym_profile_id;
    const slug = (r as { equipment_slug: string }).equipment_slug;
    const list = equipmentByProfileId.get(pid) ?? [];
    list.push(slug);
    equipmentByProfileId.set(pid, list);
  }

  return profiles.map((p: { id: string; name: string; is_active: boolean; dumbbell_max_weight: number | null }) => ({
    id: p.id,
    name: p.name,
    equipment: (equipmentByProfileId.get(p.id) ?? []) as EquipmentKey[],
    dumbbellMaxWeight: p.dumbbell_max_weight ?? undefined,
    isActive: p.is_active,
  }));
}

/**
 * Get the currently active gym profile for the user.
 */
export async function getActiveProfile(userId: string): Promise<GymProfile | null> {
  const supabase = requireClient();
  const { data: row, error } = await supabase
    .from("gym_profiles")
    .select("id, name, is_active, dumbbell_max_weight")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!row) return null;

  const { data: equipRows } = await supabase
    .from("gym_profile_equipment")
    .select("equipment_slug")
    .eq("gym_profile_id", row.id)
    .eq("available", true);

  const equipment = (equipRows ?? []).map((r: { equipment_slug: string }) => r.equipment_slug) as EquipmentKey[];
  return {
    id: row.id,
    name: row.name,
    equipment,
    dumbbellMaxWeight: row.dumbbell_max_weight ?? undefined,
    isActive: true,
  };
}

/**
 * Set the active gym profile (deactivates others).
 */
export async function setActiveProfile(userId: string, profileId: string): Promise<void> {
  const supabase = requireClient();
  await supabase.from("gym_profiles").update({ is_active: false }).eq("user_id", userId);
  const { error } = await supabase
    .from("gym_profiles")
    .update({ is_active: true })
    .eq("id", profileId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export type UpsertProfileParams = {
  id?: string;
  name: string;
  equipment: string[];
  dumbbellMaxWeight?: number;
  isActive?: boolean;
};

/**
 * Create or update a gym profile and its equipment.
 */
export async function upsertProfile(userId: string, params: UpsertProfileParams): Promise<GymProfile> {
  const supabase = requireClient();

  if (params.id) {
    const { error: updateError } = await supabase
      .from("gym_profiles")
      .update({
        name: params.name,
        dumbbell_max_weight: params.dumbbellMaxWeight ?? null,
        is_active: params.isActive ?? false,
      })
      .eq("id", params.id)
      .eq("user_id", userId);
    if (updateError) throw new Error(updateError.message);
    await setEquipment(params.id, params.equipment);
    const profile = await listProfiles(userId).then((list) => list.find((p) => p.id === params.id));
    if (!profile) throw new Error("Profile not found after update");
    return profile;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("gym_profiles")
    .insert({
      user_id: userId,
      name: params.name,
      is_active: params.isActive ?? false,
      dumbbell_max_weight: params.dumbbellMaxWeight ?? null,
    })
    .select("id")
    .single();

  if (insertError) throw new Error(insertError.message);
  await setEquipment(inserted.id, params.equipment);
  const profile = await listProfiles(userId).then((list) => list.find((p) => p.id === inserted.id));
  if (!profile) throw new Error("Profile not found after insert");
  return profile;
}

/**
 * Replace equipment list for a profile.
 */
export async function setEquipment(gymProfileId: string, equipmentSlugs: string[]): Promise<void> {
  const supabase = requireClient();
  await supabase.from("gym_profile_equipment").delete().eq("gym_profile_id", gymProfileId);
  if (equipmentSlugs.length) {
    const rows = equipmentSlugs.map((equipment_slug) => ({
      gym_profile_id: gymProfileId,
      equipment_slug,
      available: true,
    }));
    const { error } = await supabase.from("gym_profile_equipment").insert(rows);
    if (error) throw new Error(error.message);
  }
}

/**
 * Delete a gym profile.
 */
export async function removeProfile(userId: string, profileId: string): Promise<void> {
  const supabase = requireClient();
  const { error } = await supabase
    .from("gym_profiles")
    .delete()
    .eq("id", profileId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}
