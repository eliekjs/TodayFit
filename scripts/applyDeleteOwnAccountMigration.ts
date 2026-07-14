/**
 * Apply delete_own_account SQL using the database connection string if present,
 * otherwise print instructions and verify whether the RPC already exists.
 *
 * Optional env: DATABASE_URL or SUPABASE_DB_URL (postgres connection string).
 * Always needs: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage: npx tsx scripts/applyDeleteOwnAccountMigration.ts
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { loadDotEnvFromRepoRoot } from "./dotenvLocal";

loadDotEnvFromRepoRoot();

async function rpcExists(): Promise<boolean> {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !service) return false;
  const admin = createClient(url, service, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  // Probe with a throw-away call as service role (no auth.uid → expected exception if fn exists)
  const { error } = await admin.rpc("delete_own_account");
  if (!error) return true;
  if (/not authenticated|Not authenticated/i.test(error.message)) return true;
  if (/Could not find the function|schema cache/i.test(error.message)) return false;
  // Other errors often mean the function exists but rejected the call
  return !/Could not find the function/i.test(error.message);
}

async function main() {
  const sqlPath = path.join(
    process.cwd(),
    "supabase/migrations/20260713000000_delete_own_account.sql"
  );
  const sql = fs.readFileSync(sqlPath, "utf8");
  const dbUrl =
    (process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL ?? "").trim() || null;

  if (await rpcExists()) {
    console.log("PASS: delete_own_account already available on remote.");
    return;
  }

  if (dbUrl) {
    const pg = await import("pg").catch(() => null);
    if (!pg) {
      console.error("Install `pg` to apply SQL via DATABASE_URL: npm i -D pg");
      process.exit(1);
    }
    const client = new pg.Client({ connectionString: dbUrl });
    await client.connect();
    await client.query(sql);
    await client.end();
    console.log("Applied delete_own_account via DATABASE_URL.");
    if (!(await rpcExists())) {
      console.warn("WARN: applied SQL but RPC probe still failing (schema cache delay?)");
    } else {
      console.log("PASS: RPC probe ok.");
    }
    return;
  }

  console.log(`
delete_own_account is NOT on the remote yet.

Apply this SQL in the Supabase SQL editor (project Dashboard → SQL),
then re-run: npx tsx scripts/applyDeleteOwnAccountMigration.ts

--- SQL ---
${sql}
--- end ---

Or set DATABASE_URL / SUPABASE_DB_URL and re-run this script.
`);
  process.exit(2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
