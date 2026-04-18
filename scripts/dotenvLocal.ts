/**
 * Load `.env` from the repo root into `process.env` when keys are unset.
 * Used by maintenance scripts so `npx tsx scripts/...` picks up secrets without bash `source`.
 */

import fs from "node:fs";
import path from "node:path";

export function loadDotEnvFromRepoRoot(): void {
  try {
    const envPath = path.join(process.cwd(), ".env");
    if (!fs.existsSync(envPath)) return;
    const raw = fs.readFileSync(envPath, "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  } catch {
    /* optional */
  }
}

/** Printed when `--apply` is used without `SUPABASE_SERVICE_ROLE_KEY` (RLS blocks anon updates). */
export function printServiceRoleKeyHelp(runExample: string): void {
  console.error(`
Refusing --apply: SUPABASE_SERVICE_ROLE_KEY is not set.

The anon key (EXPO_PUBLIC_SUPABASE_ANON_KEY) cannot update reference tables. Add the service role secret:

  1. Supabase Dashboard → your project → Project Settings → API.
  2. Under "Project API keys", copy the secret "service_role" key (long JWT — not "anon" / "publishable").
  3. In the repo root .env file add one line (no quotes needed):
       SUPABASE_SERVICE_ROLE_KEY=paste_here
  4. Save, run from repo root (so .env loads):
       ${runExample}

Never commit this key — .gitignore already ignores .env.
`.trim());
}
