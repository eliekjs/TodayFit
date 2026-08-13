/**
 * Pilot / v1 exercise catalog scope against live Supabase:
 * 1) Classify unlabeled rows (mobility-protected → core, else niche)
 * 2) is_active = false for excluded_* states
 * 3) Trim eligible_core to ~1000; demote near-duplicates → eligible_phase2
 * 4) Regenerate data/generator-eligibility-by-id.json from DB
 *
 * Usage:
 *   npx tsx scripts/pilotCatalog/applyPilotExerciseScope.ts           # dry-run
 *   npx tsx scripts/pilotCatalog/applyPilotExerciseScope.ts --apply
 */

import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { loadDotEnvFromRepoRoot, printServiceRoleKeyHelp } from "../dotenvLocal";
import {
  PILOT_CORE_TARGET,
  classifyUnlabeledState,
  trimCorePool,
  type TrimExerciseRow,
} from "../../lib/pilotCatalog/trimCorePool";
import type { GeneratorEligibilityState } from "../../logic/exerciseLibraryCuration/generatorEligibilityTypes";

loadDotEnvFromRepoRoot();

const REPO = join(__dirname, "..", "..");
const ARTIFACT_DIR = join(REPO, "artifacts");
const ARTIFACT_PATH = join(ARTIFACT_DIR, "pilot-exercise-scope-decisions.json");
const BUNDLE_PATH = join(REPO, "data", "generator-eligibility-by-id.json");

type DbRow = TrimExerciseRow & {
  is_active: boolean;
  curation_generator_eligibility_state: string | null;
  curation_pruning_recommendation: string | null;
  curation_merge_target_exercise_id: string | null;
  curation_cluster_id: string | null;
  curation_canonical_exercise_id: string | null;
};

const SELECT_COLS = [
  "id",
  "slug",
  "name",
  "is_active",
  "modalities",
  "equipment",
  "primary_muscles",
  "movement_pattern",
  "curation_movement_patterns",
  "exercise_role",
  "curation_primary_role",
  "curation_equipment_class",
  "curation_is_canonical",
  "curation_complexity",
  "warmup_relevance",
  "cooldown_relevance",
  "stretch_targets",
  "mobility_targets",
  "curation_generator_eligibility_state",
  "curation_pruning_recommendation",
  "curation_merge_target_exercise_id",
  "curation_cluster_id",
  "curation_canonical_exercise_id",
].join(", ");

async function fetchAll(supabase: ReturnType<typeof createClient>): Promise<DbRow[]> {
  const out: DbRow[] = [];
  const PAGE = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("exercises")
      .select(SELECT_COLS)
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as DbRow[];
    out.push(...rows);
    if (rows.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

async function updateInChunks(
  supabase: ReturnType<typeof createClient>,
  ids: string[],
  patch: Record<string, unknown>
): Promise<void> {
  const CHUNK = 200;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const slice = ids.slice(i, i + CHUNK);
    const { error } = await supabase.from("exercises").update(patch).in("id", slice);
    if (error) throw new Error(`${error.message} (chunk ${i / CHUNK})`);
  }
}

function countStates(rows: { curation_generator_eligibility_state: string | null }[]) {
  const c: Record<string, number> = {};
  for (const r of rows) {
    const k = r.curation_generator_eligibility_state ?? "(null)";
    c[k] = (c[k] ?? 0) + 1;
  }
  return c;
}

function buildBundleFromRows(rows: DbRow[]) {
  const by_id: Record<
    string,
    {
      exercise_id: string;
      exercise_name: string;
      eligibility_state: GeneratorEligibilityState;
      pruning_recommendation: string;
      merge_target_exercise_id: string | null;
      is_canonical_in_cluster: boolean;
      cluster_id: string | null;
    }
  > = {};
  const counts_by_state: Record<string, number> = {};
  for (const r of rows) {
    const st = (r.curation_generator_eligibility_state ?? "excluded_unknown") as GeneratorEligibilityState;
    by_id[r.slug] = {
      exercise_id: r.slug,
      exercise_name: r.name,
      eligibility_state: st,
      pruning_recommendation: r.curation_pruning_recommendation ?? "unknown",
      merge_target_exercise_id: r.curation_merge_target_exercise_id,
      is_canonical_in_cluster: r.curation_is_canonical === true,
      cluster_id: r.curation_cluster_id,
    };
    counts_by_state[st] = (counts_by_state[st] ?? 0) + 1;
  }
  return {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    counts_by_state,
    pruning_artifact_path: "supabase:exercises.curation_generator_eligibility_state",
    catalog_path: "supabase:exercises",
    by_id,
  };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url) throw new Error("EXPO_PUBLIC_SUPABASE_URL missing");
  if (apply && !key) {
    printServiceRoleKeyHelp("npx tsx scripts/pilotCatalog/applyPilotExerciseScope.ts --apply");
    process.exit(1);
  }
  const supabase = createClient(url, key || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("Fetching exercises…");
  const rows = await fetchAll(supabase);
  console.log("Fetched", rows.length, "before:", countStates(rows));

  const unlabeledUpdates: { id: string; slug: string; to: string }[] = [];
  for (const r of rows) {
    if (r.curation_generator_eligibility_state != null && r.curation_generator_eligibility_state !== "") {
      continue;
    }
    const to = classifyUnlabeledState(r);
    unlabeledUpdates.push({ id: r.id, slug: r.slug, to });
    r.curation_generator_eligibility_state = to;
  }

  const excludedDeactivate = rows
    .filter(
      (r) =>
        r.is_active &&
        ["excluded_merged", "excluded_removed", "excluded_review", "excluded_unknown"].includes(
          r.curation_generator_eligibility_state ?? ""
        )
    )
    .map((r) => ({ id: r.id, slug: r.slug, state: r.curation_generator_eligibility_state }));

  const coreRows = rows.filter((r) => r.curation_generator_eligibility_state === "eligible_core");
  const trim = trimCorePool(coreRows, PILOT_CORE_TARGET);
  const demoteSet = new Set(trim.demoteIds);
  for (const r of rows) {
    if (demoteSet.has(r.id)) r.curation_generator_eligibility_state = "eligible_phase2";
  }

  const planned = {
    generated_at: new Date().toISOString(),
    target_core: PILOT_CORE_TARGET,
    unlabeled_classified: unlabeledUpdates.length,
    unlabeled_to_core: unlabeledUpdates.filter((u) => u.to === "eligible_core").length,
    unlabeled_to_niche: unlabeledUpdates.filter((u) => u.to === "eligible_niche").length,
    excluded_deactivate: excludedDeactivate.length,
    trim: {
      core_before: coreRows.length,
      keep: trim.keepIds.length,
      demote_to_phase2: trim.demoteIds.length,
      protected_count: trim.protectedCount,
      group_count: trim.groupCount,
    },
    counts_after_plan: countStates(rows),
    sample_demotions: trim.demoteIds.slice(0, 25).map((id) => {
      const r = rows.find((x) => x.id === id)!;
      return { slug: r.slug, name: r.name };
    }),
    sample_keepers: trim.keepIds.slice(0, 25).map((id) => {
      const r = rows.find((x) => x.id === id)!;
      return { slug: r.slug, name: r.name };
    }),
  };

  mkdirSync(ARTIFACT_DIR, { recursive: true });
  writeFileSync(
    ARTIFACT_PATH,
    JSON.stringify(
      {
        ...planned,
        unlabeled_updates: unlabeledUpdates,
        excluded_deactivate_ids: excludedDeactivate.map((e) => e.id),
        demote_ids: trim.demoteIds,
        keep_ids: trim.keepIds,
      },
      null,
      2
    )
  );
  console.log(JSON.stringify(planned, null, 2));
  console.log("Wrote", ARTIFACT_PATH);

  if (!apply) {
    console.log("\nDry-run only. Re-run with --apply to write Supabase + regenerate eligibility bundle.");
    return;
  }

  console.log("Applying unlabeled classifications…");
  const byTarget = new Map<string, string[]>();
  for (const u of unlabeledUpdates) {
    const list = byTarget.get(u.to) ?? [];
    list.push(u.id);
    byTarget.set(u.to, list);
  }
  for (const [state, ids] of byTarget) {
    await updateInChunks(supabase, ids, {
      curation_generator_eligibility_state: state,
      curation_updated_at: new Date().toISOString(),
    });
  }

  console.log("Deactivating excluded rows…");
  await updateInChunks(
    supabase,
    excludedDeactivate.map((e) => e.id),
    { is_active: false, updated_at: new Date().toISOString() }
  );

  console.log("Demoting near-duplicates to eligible_phase2…");
  await updateInChunks(supabase, trim.demoteIds, {
    curation_generator_eligibility_state: "eligible_phase2",
    curation_updated_at: new Date().toISOString(),
  });

  console.log("Re-fetching for eligibility bundle…");
  const after = await fetchAll(supabase);
  const bundle = buildBundleFromRows(after);
  writeFileSync(BUNDLE_PATH, JSON.stringify(bundle, null, 2) + "\n");
  console.log("Wrote", BUNDLE_PATH, "counts", bundle.counts_by_state);
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
