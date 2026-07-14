/** Env helpers with no React Native imports (safe for Node/Vitest). */

export function readSupabaseEnv(): { url: string; anonKey: string } {
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

export function isDbConfigured(): boolean {
  const { url, anonKey } = readSupabaseEnv();
  return !isPlaceholderSupabaseConfig(url, anonKey);
}
