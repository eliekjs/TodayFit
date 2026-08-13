/**
 * True when the id is a Supabase/Postgres UUID (not a local template or optimistic id).
 * Local ids like `your_gym` or `profile_<timestamp>` cannot be written to gym_profiles.id.
 */
export function isCloudGymProfileId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}
