/**
 * RLS isolation check: two users must not read/write each other's rows.
 *
 * Loads `.env` via dotenvLocal. Creates ephemeral test users with the service role
 * unless SHIP_RLS_USER_* credentials are provided.
 *
 * Usage: npx tsx scripts/verifyRlsIsolation.ts
 */
import { createClient } from "@supabase/supabase-js";
import { loadDotEnvFromRepoRoot } from "./dotenvLocal";

loadDotEnvFromRepoRoot();

function requireEnv(name: string): string {
  const v = (process.env[name] ?? "").trim();
  if (!v) {
    throw new Error(`Missing env ${name}`);
  }
  return v;
}

async function ensureUser(
  admin: ReturnType<typeof createClient>,
  email: string,
  password: string
): Promise<string> {
  const existing = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const found = existing.data.users.find((u) => u.email === email);
  if (found) return found.id;

  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error || !created.data.user) {
    throw new Error(`createUser ${email}: ${created.error?.message}`);
  }
  return created.data.user.id;
}

async function main() {
  const url = requireEnv("EXPO_PUBLIC_SUPABASE_URL");
  const anon = requireEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY");
  const service = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const emailA =
    (process.env.SHIP_RLS_USER_A_EMAIL ?? "").trim() ||
    `rls-a-${Date.now()}@todayfit-ship-test.local`;
  const passA = (process.env.SHIP_RLS_USER_A_PASSWORD ?? "").trim() || `ShipTest-A-${Date.now()}!`;
  const emailB =
    (process.env.SHIP_RLS_USER_B_EMAIL ?? "").trim() ||
    `rls-b-${Date.now()}@todayfit-ship-test.local`;
  const passB = (process.env.SHIP_RLS_USER_B_PASSWORD ?? "").trim() || `ShipTest-B-${Date.now()}!`;

  const admin = createClient(url, service, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const ephemeral = !process.env.SHIP_RLS_USER_A_EMAIL;
  const userAId = await ensureUser(admin, emailA, passA);
  const userBId = await ensureUser(admin, emailB, passB);
  console.log("Users ready", { userAId, userBId, ephemeral });

  const clientA = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const clientB = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const signA = await clientA.auth.signInWithPassword({ email: emailA, password: passA });
  if (signA.error || !signA.data.user) {
    throw new Error(`User A sign-in failed: ${signA.error?.message}`);
  }
  const signB = await clientB.auth.signInWithPassword({ email: emailB, password: passB });
  if (signB.error || !signB.data.user) {
    throw new Error(`User B sign-in failed: ${signB.error?.message}`);
  }

  console.log("PASS: email/password sign-in works for two users");

  const marker = `rls-probe-${Date.now()}`;
  const { data: profileA, error: insertErr } = await clientA
    .from("gym_profiles")
    .insert({ user_id: signA.data.user.id, name: marker, is_active: false })
    .select("id")
    .single();
  if (insertErr || !profileA) {
    throw new Error(`User A insert gym_profiles failed: ${insertErr?.message}`);
  }
  console.log("PASS: authenticated insert into gym_profiles");

  const { data: crossRead, error: crossErr } = await clientB
    .from("gym_profiles")
    .select("id, name")
    .eq("id", profileA.id);
  if (crossErr) {
    throw new Error(`Unexpected error on cross-read: ${crossErr.message}`);
  }
  if (crossRead && crossRead.length > 0) {
    throw new Error("FAIL: User B could read User A's gym_profiles row");
  }
  console.log("PASS: User B cannot read User A's gym_profiles");

  const { data: crossWrite, error: writeErr } = await clientB
    .from("gym_profiles")
    .update({ name: `${marker}-hijack` })
    .eq("id", profileA.id)
    .select("id");
  if (writeErr) {
    console.log("PASS: User B update rejected:", writeErr.message);
  } else if (crossWrite && crossWrite.length > 0) {
    throw new Error("FAIL: User B updated User A's gym_profiles row");
  } else {
    console.log("PASS: User B update affected 0 rows");
  }

  const { data: prefsCross } = await clientB
    .from("user_preferences")
    .select("user_id")
    .eq("user_id", signA.data.user.id);
  if (prefsCross && prefsCross.length > 0) {
    throw new Error("FAIL: User B could read User A's user_preferences");
  }
  console.log("PASS: User B cannot read User A's user_preferences");

  const { data: workoutsCross } = await clientB
    .from("workouts")
    .select("id")
    .eq("user_id", signA.data.user.id)
    .limit(5);
  if (workoutsCross && workoutsCross.length > 0) {
    throw new Error("FAIL: User B could read User A's workouts");
  }
  console.log("PASS: User B cannot read User A's workouts");

  // Unauthenticated write must fail
  const anonClient = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: anonInsertErr } = await anonClient
    .from("gym_profiles")
    .insert({ user_id: signA.data.user.id, name: `${marker}-anon`, is_active: false });
  if (!anonInsertErr) {
    throw new Error("FAIL: anon insert into gym_profiles succeeded");
  }
  console.log("PASS: anon cannot insert gym_profiles:", anonInsertErr.message);

  await clientA.from("gym_profiles").delete().eq("id", profileA.id);

  // delete_own_account RPC (optional until migration applied)
  const { error: delRpcErr } = await clientA.rpc("delete_own_account");
  if (delRpcErr) {
    console.warn(
      "WARN: delete_own_account RPC not available yet — apply supabase/migrations/20260713000000_delete_own_account.sql"
    );
    console.warn("  ", delRpcErr.message);
  } else {
    console.log("PASS: delete_own_account RPC executed for user A");
  }

  if (ephemeral) {
    await admin.auth.admin.deleteUser(userAId).catch(() => undefined);
    await admin.auth.admin.deleteUser(userBId).catch(() => undefined);
    console.log("Cleaned ephemeral auth users");
  }

  console.log("RLS isolation checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
