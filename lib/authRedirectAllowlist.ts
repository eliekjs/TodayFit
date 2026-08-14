/**
 * Supabase Auth redirect allowlist for native deep links, local Expo web, and
 * the hosted pilot origin (PUBLIC_APP_ORIGIN / EXPO_PUBLIC_APP_ORIGIN).
 */
export const NATIVE_AND_LOCAL_REDIRECTS = [
  "todayfit://**",
  "todayfit://auth/reset-password",
  "todayfit://welcome",
  "exp://**/--/auth/reset-password",
  "exp://**/--/welcome",
  "http://localhost:8081/**",
  "http://127.0.0.1:8081/**",
  "http://localhost:19006/**",
  "http://127.0.0.1:19006/**",
] as const;

export function normalizeHttpsOrigin(raw: string | undefined | null): string | null {
  const origin = (raw ?? "").trim().replace(/\/+$/, "");
  if (!origin) return null;
  if (!/^https:\/\/[^\s/]+/i.test(origin)) return null;
  return origin;
}

export function buildAuthRedirectAllowlist(webOrigin?: string | null): string[] {
  const origin = normalizeHttpsOrigin(webOrigin);
  if (!origin) return [...NATIVE_AND_LOCAL_REDIRECTS];
  return [...NATIVE_AND_LOCAL_REDIRECTS, origin, `${origin}/**`];
}

export function resolvePilotWebOriginFromEnv(
  env: NodeJS.Dict<string> = process.env
): string | null {
  return normalizeHttpsOrigin(
    env.PUBLIC_APP_ORIGIN ?? env.EXPO_PUBLIC_APP_ORIGIN
  );
}
