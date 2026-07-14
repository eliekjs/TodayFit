import { Platform } from "react-native";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { supabaseAuthStorage } from "./authStorage";
import {
  isDbConfigured,
  isPlaceholderSupabaseConfig,
  readSupabaseEnv,
} from "./supabaseEnv";

export { isDbConfigured, isPlaceholderSupabaseConfig, readSupabaseEnv };

let client: SupabaseClient | null = null;
let clientKey: string | null = null;

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
    client = createClient(url, anonKey, {
      auth: {
        storage: supabaseAuthStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === "web",
        flowType: "pkce",
      },
    });
    clientKey = cacheKey;
  }
  return client;
}
