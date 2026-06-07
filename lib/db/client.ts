import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;
let clientKey: string | null = null;

function readSupabaseEnv(): { url: string; anonKey: string } {
  return {
    url: (process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim(),
    anonKey: (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "").trim(),
  };
}

/** Reject copied `.env.example` placeholders so we do not attempt doomed fetches. */
export function isPlaceholderSupabaseConfig(url: string, anonKey: string): boolean {
  const lowerUrl = url.toLowerCase();
  const lowerKey = anonKey.toLowerCase();
  return (
    !url ||
    !anonKey ||
    lowerUrl.includes("your-project") ||
    lowerUrl.includes("example.com") ||
    lowerKey === "your-anon-key" ||
    lowerKey.includes("your-anon") ||
    anonKey.length < 32
  );
}

/**
 * Returns the Supabase client. Use this instead of creating your own client.
 * Returns null if env vars are not set (e.g. before project is configured).
 */
export function getSupabase(): SupabaseClient | null {
  const { url, anonKey } = readSupabaseEnv();
  if (isPlaceholderSupabaseConfig(url, anonKey)) {
    return null;
  }
  const cacheKey = `${url}\0${anonKey}`;
  if (!client || clientKey !== cacheKey) {
    client = createClient(url, anonKey);
    clientKey = cacheKey;
  }
  return client;
}

/**
 * Check if the DB layer is configured (env vars present).
 */
export function isDbConfigured(): boolean {
  const { url, anonKey } = readSupabaseEnv();
  return !isPlaceholderSupabaseConfig(url, anonKey);
}
