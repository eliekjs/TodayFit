/**
 * Independent audit of curated exercise descriptions vs merged catalog.
 *
 * Run: npx tsx scripts/auditExerciseDescriptions.ts
 * JSON report: npx tsx scripts/auditExerciseDescriptions.ts --json > artifacts/auditExerciseDescriptions.json
 */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { EXERCISES } from "../data/exercisesMerged";
import {
  getCuratedExerciseDescriptionEntry,
  resolveExerciseDescription,
  validateCuratedDescriptionsFile,
} from "../lib/exerciseDescriptionsCurated";
import {
  isGeneratedExerciseDescriptionStub,
  validateExerciseDescriptionCopy,
} from "../lib/exerciseDisplayCue";
import { loadDotEnvFromRepoRoot } from "./dotenvLocal";

loadDotEnvFromRepoRoot();

type BatchKey = "1-200" | "201-800" | "801+";

type QualityIssue =
  | "missing"
  | "validation_error"
  | "generated_stub"
  | "generic_template"
  | "fallback_template"
  | "vague_setup"
  | "low_slug_specificity"
  | "duplicate_description"
  | "invalid_sources";

type EntryAudit = {
  position: number;
  slug: string;
  batch: BatchKey;
  resolved: boolean;
  description?: string;
  issues: QualityIssue[];
  validationErrors: string[];
  sourceCount: number;
  reviewed_at?: string;
};

/** Patterns flagged as bulk/template copy (from regenerate + generate scripts). */
const GENERIC_PATTERNS: { id: string; re: RegExp }[] = [
  { id: "move_through_pattern", re: /Move through the pattern with control/i },
  { id: "stable_stance_equipment", re: /Set up in a stable stance with the listed equipment/i },
  { id: "load_stay_stable", re: /should stay stable as you move/i },
  { id: "perform_pattern_control", re: /Perform the .+ pattern with control through the full rep/i },
  { id: "set_up_for_listed", re: /Set up for .+ with the listed (?:load|equipment)/i },
  { id: "working_side_load", re: /The working-side load should stay stable/i },
  { id: "move_exercise_control", re: /Move through the exercise with control on the way up and down/i },
  { id: "listed_equipment_stable", re: /with the listed equipment and a stable base/i },
  { id: "use_setup_implied", re: /Use the setup implied by/i },
  { id: "controlled_full_rom", re: /Controlled, full range of motion/i },
  { id: "primarily_targets", re: /\b(?:primarily )?targets\b/i },
  { id: "equipment_colon", re: /\bequipment\s*:/i },
  { id: "is_an_exercise", re: /\bis an? [^.]+ exercise\./i },
  { id: "grip_stable_setup", re: /Grip the barbell with a stable setup for the lift/i },
  { id: "hold_dumbbells_stable", re: /Hold the dumbbells in a stable start position/i },
  { id: "bodyweight_stable_start", re: /Use bodyweight only with a stable start position/i },
  { id: "step_into_lunge_pattern", re: /Step into the lunge pattern named by the exercise/i },
  { id: "plane_named_by", re: /in the plane named by the exercise/i },
  { id: "pattern_named_by", re: /named by the (?:exercise|drill)/i },
  { id: "as_the_variation_requires", re: /as the variation requires/i },
  { id: "as_the_setup_requires", re: /as the setup requires/i },
  { id: "as_listed", re: /\bas listed\b/i },
];

const FALLBACK_TEMPLATE_RE =
  /Perform the .+ pattern with control through the full rep\. .+ should stay stable as you move\./i;

function batchForPosition(position: number): BatchKey {
  if (position <= 200) return "1-200";
  if (position <= 800) return "201-800";
  return "801+";
}

function slugTokens(slug: string): Set<string> {
  return new Set(slug.replace(/^ff_/, "").split("_").filter(Boolean));
}

/** Heuristic: description should mention at least one distinctive slug token (len>=4, not ff/bodyweight/etc). */
function lowSlugSpecificity(slug: string, description: string): boolean {
  const stop = new Set([
    "bodyweight",
    "single",
    "double",
    "dumbbell",
    "barbell",
    "kettlebell",
    "cable",
    "machine",
    "band",
    "bench",
    "incline",
    "decline",
    "flat",
    "overhead",
    "underhand",
    "overhand",
    "neutral",
    "grip",
    "hold",
    "with",
    "eccentric",
    "concentric",
    "isometric",
    "alternating",
    "contralateral",
    "ipsilateral",
    "freestanding",
    "assisted",
    "unassisted",
    "tempo",
    "pause",
    "partial",
    "full",
    "half",
    "quarter",
    "reverse",
    "forward",
    "lateral",
    "front",
    "back",
    "side",
    "left",
    "right",
  ]);
  const tokens = [...slugTokens(slug)].filter((t) => t.length >= 4 && !stop.has(t));
  if (tokens.length === 0) return false;
  const desc = description.toLowerCase();
  const hits = tokens.filter((t) => desc.includes(t.replace(/_/g, " ")) || desc.includes(t));
  return hits.length === 0 && tokens.length >= 2;
}

function auditEntry(position: number, slug: string): EntryAudit {
  const batch = batchForPosition(position);
  const entry = getCuratedExerciseDescriptionEntry(slug);
  const issues: QualityIssue[] = [];
  const validationErrors: string[] = [];

  if (!entry?.description?.trim()) {
    return {
      position,
      slug,
      batch,
      resolved: false,
      issues: ["missing"],
      validationErrors: ["no curated entry"],
      sourceCount: 0,
    };
  }

  const description = entry.description.trim();
  const resolved = Boolean(resolveExerciseDescription(slug, null));

  if (isGeneratedExerciseDescriptionStub(description)) issues.push("generated_stub");
  for (const msg of validateExerciseDescriptionCopy(description)) {
    validationErrors.push(msg);
    issues.push("validation_error");
  }
  if (!entry.sources?.length || entry.sources.some((u) => !/^https?:\/\//i.test(u))) {
    issues.push("invalid_sources");
  }
  if (FALLBACK_TEMPLATE_RE.test(description)) issues.push("fallback_template");
  if (GENERIC_PATTERNS.some((p) => p.re.test(description))) issues.push("generic_template");
  if (/Set up in a stable stance with the listed equipment/i.test(description)) {
    issues.push("vague_setup");
  }
  if (lowSlugSpecificity(slug, description)) issues.push("low_slug_specificity");

  return {
    position,
    slug,
    batch,
    resolved,
    description,
    issues: [...new Set(issues)],
    validationErrors,
    sourceCount: entry.sources?.length ?? 0,
    reviewed_at: entry.reviewed_at,
  };
}

type BatchStats = {
  total: number;
  missing: number;
  resolved: number;
  passesQuality: number;
  failsQuality: number;
  issueCounts: Partial<Record<QualityIssue, number>>;
  genericTemplate: number;
  fallbackTemplate: number;
  lowSpecificity: number;
  validationFail: number;
  duplicateDescriptions: number;
};

function emptyBatchStats(): BatchStats {
  return {
    total: 0,
    missing: 0,
    resolved: 0,
    passesQuality: 0,
    failsQuality: 0,
    issueCounts: {},
    genericTemplate: 0,
    fallbackTemplate: 0,
    lowSpecificity: 0,
    validationFail: 0,
    duplicateDescriptions: 0,
  };
}

function passesQuality(a: EntryAudit): boolean {
  return a.issues.length === 0 && a.resolved;
}

async function checkSupabaseSample(slugs: string[]): Promise<{
  available: boolean;
  sampled: number;
  dbHasDescription: number;
  dbMatchesCurated: number;
  dbIsStub: number;
  note?: string;
}> {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ??
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    return { available: false, sampled: 0, dbHasDescription: 0, dbMatchesCurated: 0, dbIsStub: 0, note: "No Supabase env" };
  }

  const supabase = createClient(url, key);
  const sample = slugs.slice(0, 80);
  let dbHasDescription = 0;
  let dbMatchesCurated = 0;
  let dbIsStub = 0;

  for (const slug of sample) {
    const { data, error } = await supabase
      .from("exercises")
      .select("slug, description")
      .eq("slug", slug)
      .maybeSingle();
    if (error || !data) continue;
    const dbDesc = (data.description as string | null)?.trim();
    const curated = getCuratedExerciseDescriptionEntry(slug)?.description?.trim();
    if (dbDesc) {
      dbHasDescription++;
      if (isGeneratedExerciseDescriptionStub(dbDesc)) dbIsStub++;
      if (curated && dbDesc === curated) dbMatchesCurated++;
    }
  }

  return {
    available: true,
    sampled: sample.length,
    dbHasDescription,
    dbMatchesCurated,
    dbIsStub,
  };
}

async function main() {
  const jsonOut = process.argv.includes("--json");
  const catalogSlugs = EXERCISES.map((e) => e.id);
  const catalogSet = new Set(catalogSlugs);

  const fileValidation = validateCuratedDescriptionsFile(catalogSet);
  const audits: EntryAudit[] = catalogSlugs.map((slug, i) => auditEntry(i + 1, slug));

  // Duplicate descriptions (exact text)
  const descToSlugs = new Map<string, string[]>();
  for (const a of audits) {
    if (!a.description) continue;
    const list = descToSlugs.get(a.description) ?? [];
    list.push(a.slug);
    descToSlugs.set(a.description, list);
  }
  for (const a of audits) {
    if (!a.description) continue;
    const slugs = descToSlugs.get(a.description) ?? [];
    if (slugs.length >= 3) a.issues.push("duplicate_description");
  }

  const batches: Record<BatchKey, BatchStats> = {
    "1-200": emptyBatchStats(),
    "201-800": emptyBatchStats(),
    "801+": emptyBatchStats(),
  };

  for (const a of audits) {
    const b = batches[a.batch];
    b.total++;
    if (a.issues.includes("missing")) b.missing++;
    if (a.resolved) b.resolved++;
    if (passesQuality(a)) b.passesQuality++;
    else b.failsQuality++;
    for (const issue of a.issues) {
      b.issueCounts[issue] = (b.issueCounts[issue] ?? 0) + 1;
    }
    if (a.issues.includes("generic_template")) b.genericTemplate++;
    if (a.issues.includes("fallback_template")) b.fallbackTemplate++;
    if (a.issues.includes("low_slug_specificity")) b.lowSpecificity++;
    if (a.issues.includes("validation_error")) b.validationFail++;
    if (a.issues.includes("duplicate_description")) b.duplicateDescriptions++;
  }

  const missingSlugs = audits.filter((a) => a.issues.includes("missing")).map((a) => a.slug);
  const orphanCurated = [...catalogSet].length; // placeholder

  // Orphan curated slugs (in JSON but not catalog)
  const curatedPath = path.join(process.cwd(), "data/exerciseDescriptions.curated.json");
  const curatedFile = JSON.parse(fs.readFileSync(curatedPath, "utf8")) as {
    entries: Record<string, unknown>;
  };
  const curatedSlugs = Object.keys(curatedFile.entries ?? {});
  const orphanSlugs = curatedSlugs.filter((s) => !catalogSet.has(s));

  const bulkAudits = audits.filter((a) => a.batch === "801+");
  const worstBulk = bulkAudits
    .filter((a) => !passesQuality(a))
    .sort((x, y) => {
      const score = (e: EntryAudit) =>
        (e.issues.includes("fallback_template") ? 10 : 0) +
        (e.issues.includes("generic_template") ? 5 : 0) +
        (e.issues.includes("low_slug_specificity") ? 3 : 0) +
        (e.issues.includes("duplicate_description") ? 2 : 0) +
        e.validationErrors.length;
      return score(y) - score(x);
    })
    .slice(0, 10);

  const goodBulk = bulkAudits
    .filter((a) => passesQuality(a) && !a.issues.includes("duplicate_description"))
    .filter((a) => {
      const d = a.description ?? "";
      return !GENERIC_PATTERNS.some((p) => p.re.test(d));
    })
    .slice(0, 5);

  const dbCheck = await checkSupabaseSample(catalogSlugs);

  const report = {
    generated_at: new Date().toISOString(),
    catalog_total: catalogSlugs.length,
    curated_entries: curatedSlugs.length,
    unique_catalog_slugs: catalogSet.size,
    duplicate_catalog_slugs: catalogSlugs.length - catalogSet.size,
    missing_from_curated: missingSlugs.length,
    missing_slugs: missingSlugs,
    orphan_curated_slugs: orphanSlugs.length,
    orphan_slugs: orphanSlugs.slice(0, 30),
    file_validation_ok: fileValidation.ok,
    file_validation_error_count: fileValidation.errors.length,
    batches,
    db: dbCheck,
    worst_bulk: worstBulk.map((a) => ({
      slug: a.slug,
      position: a.position,
      issues: a.issues,
      description: a.description,
    })),
    good_bulk: goodBulk.map((a) => ({
      slug: a.slug,
      position: a.position,
      description: a.description,
    })),
  };

  if (jsonOut) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log("=== Exercise Description Audit ===\n");
  console.log(`Catalog exercises: ${report.catalog_total}`);
  console.log(`Curated JSON entries: ${report.curated_entries}`);
  console.log(`Missing curated entries: ${report.missing_from_curated}`);
  if (missingSlugs.length) console.log(`  Missing: ${missingSlugs.join(", ")}`);
  console.log(`Orphan curated slugs (not in catalog): ${report.orphan_curated_slugs}`);
  if (orphanSlugs.length) console.log(`  Sample: ${orphanSlugs.slice(0, 10).join(", ")}`);
  console.log(`File validation (validateCuratedDescriptionsFile): ${fileValidation.ok ? "PASS" : "FAIL"} (${fileValidation.errors.length} errors)`);
  if (!fileValidation.ok && fileValidation.errors.length <= 20) {
    for (const e of fileValidation.errors) console.log(`  - ${e}`);
  }

  console.log("\n--- Quality by batch ---");
  for (const key of ["1-200", "201-800", "801+"] as BatchKey[]) {
    const b = batches[key];
    const passPct = b.total ? ((100 * b.passesQuality) / b.total).toFixed(1) : "0";
    const failPct = b.total ? ((100 * b.failsQuality) / b.total).toFixed(1) : "0";
    console.log(`\n${key} (n=${b.total}):`);
    console.log(`  Resolved via curated: ${b.resolved}/${b.total}`);
    console.log(`  Passes quality heuristics: ${b.passesQuality} (${passPct}%)`);
    console.log(`  Fails quality heuristics: ${b.failsQuality} (${failPct}%)`);
    console.log(`  generic_template: ${b.genericTemplate}`);
    console.log(`  fallback_template: ${b.fallbackTemplate}`);
    console.log(`  low_slug_specificity: ${b.lowSpecificity}`);
    console.log(`  duplicate_description (shared by 3+ slugs): ${b.duplicateDescriptions}`);
    console.log(`  validation_error: ${b.validationFail}`);
  }

  console.log("\n--- Supabase DB sample ---");
  if (!dbCheck.available) {
    console.log(`  ${dbCheck.note ?? "Unavailable"}`);
  } else {
    console.log(`  Sampled ${dbCheck.sampled} catalog slugs`);
    console.log(`  DB has description: ${dbCheck.dbHasDescription}/${dbCheck.sampled}`);
    console.log(`  DB matches curated exactly: ${dbCheck.dbMatchesCurated}/${dbCheck.sampled}`);
    console.log(`  DB is old generated stub: ${dbCheck.dbIsStub}/${dbCheck.sampled}`);
  }

  console.log("\n--- Worst bulk (#801+) offenders ---");
  for (const w of worstBulk) {
    console.log(`\n#${w.position} ${w.slug} [${w.issues.join(", ")}]`);
    console.log(`  ${w.description}`);
  }

  console.log("\n--- Good bulk (#801+) examples ---");
  for (const g of goodBulk) {
    console.log(`\n#${g.position} ${g.slug}`);
    console.log(`  ${g.description}`);
  }

  // Top duplicate description clusters in bulk batch
  const bulkDupClusters = [...descToSlugs.entries()]
    .filter(([, slugs]) => slugs.some((s) => bulkAudits.some((a) => a.slug === s)))
    .filter(([, slugs]) => slugs.length >= 5)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 5);
  if (bulkDupClusters.length) {
    console.log("\n--- Largest duplicate-description clusters (bulk batch) ---");
    for (const [desc, slugs] of bulkDupClusters) {
      console.log(`\n${slugs.length} slugs share:`);
      console.log(`  "${desc.slice(0, 120)}…"`);
      console.log(`  e.g. ${slugs.slice(0, 4).join(", ")}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
