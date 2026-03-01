import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

let client: SupabaseClient | null = null;

/**
 * Returns the Supabase client. Use this instead of creating your own client.
 * Returns null if env vars are not set (e.g. before project is configured).
 */
export function getSupabase(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey);
  }
  return client;
}

/**
 * Check if the DB layer is configured (env vars present).
 */
export function isDbConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}
