/**
 * Fail if bundled data/generator-eligibility-by-id.json drifts from live Supabase
 * curation_generator_eligibility_state (by slug).
 *
 *   npx tsx scripts/pilotCatalog/verifyEligibilityBundleDrift.ts
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";
import { loadDotEnvFromRepoRoot } from "../dotenvLocal";

loadDotEnvFromRepoRoot();

const REPO = join(__dirname, "..", "..");
const BUNDLE_PATH = join(REPO, "data", "generator-eligibility-by-id.json");
const MAX_REPORT = 30;

async function main() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) throw new Error("Need EXPO_PUBLIC_SUPABASE_URL and a Supabase key");

  const bundle = JSON.parse(readFileSync(BUNDLE_PATH, "utf8")) as {
    by_id: Record<string, { eligibility_state: string }>;
    counts_by_state?: Record<string, number>;
  };

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const dbBySlug = new Map<string, string | null>();
  const PAGE = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("exercises")
      .select("slug, curation_generator_eligibility_state")
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as { slug: string; curation_generator_eligibility_state: string | null }[];
    for (const r of rows) dbBySlug.set(r.slug, r.curation_generator_eligibility_state);
    if (rows.length < PAGE) break;
    from += PAGE;
  }

  const mismatches: string[] = [];
  const missingInDb: string[] = [];
  const missingInBundle: string[] = [];

  for (const [slug, entry] of Object.entries(bundle.by_id)) {
    if (!dbBySlug.has(slug)) {
      missingInDb.push(slug);
      continue;
    }
    const dbState = dbBySlug.get(slug) ?? "excluded_unknown";
    const bundled = entry.eligibility_state;
    if (dbState !== bundled) {
      mismatches.push(`${slug}: bundle=${bundled} db=${dbState}`);
    }
  }
  for (const slug of dbBySlug.keys()) {
    if (!bundle.by_id[slug]) missingInBundle.push(slug);
  }

  console.log("Bundle entries:", Object.keys(bundle.by_id).length);
  console.log("DB rows:", dbBySlug.size);
  console.log("Mismatched states:", mismatches.length);
  console.log("In bundle, missing in DB:", missingInDb.length);
  console.log("In DB, missing in bundle:", missingInBundle.length);
  for (const line of mismatches.slice(0, MAX_REPORT)) console.log("  !", line);
  for (const s of missingInBundle.slice(0, MAX_REPORT)) console.log("  +db", s);

  if (mismatches.length > 0 || missingInBundle.length > 50) {
    console.error("Eligibility bundle drift detected.");
    process.exit(1);
  }
  console.log("OK — bundle matches DB eligibility states.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
