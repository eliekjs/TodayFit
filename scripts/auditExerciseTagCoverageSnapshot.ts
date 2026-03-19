/**
 * Write an exercise ontology tag coverage snapshot (JSON) to `docs/auditSnapshots/`.
 *
 * This is meant to be committed as an artifact so we can track coverage improvement over time.
 *
 * Run:
 *   npx tsx scripts/auditExerciseTagCoverageSnapshot.ts
 */

import fs from "node:fs";
import path from "node:path";

import { EXERCISES } from "../data/exercises";
import { exerciseDefinitionToGeneratorExercise } from "../lib/dailyGeneratorAdapter";
import { GOAL_SUB_FOCUS_TAG_MAP } from "../data/goalSubFocus";
import { SUB_FOCUS_TAG_MAP } from "../data/sportSubFocus/subFocusTagMap";
import { SPORTS_WITH_SUB_FOCUSES } from "../data/sportSubFocus/sportsWithSubFocuses";

function tagToSlug(tag: string): string {
  return tag.toLowerCase().replace(/\s/g, "_");
}

function goalToTags(goal: string): string[] {
  const g = goal.toLowerCase().replace(/\s/g, "_");
  const map: Record<string, string[]> = {
    strength: ["strength"],
    power: ["power"],
    hypertrophy: ["hypertrophy"],
    body_recomp: ["hypertrophy", "strength"],
    endurance: ["endurance"],
    conditioning: ["conditioning"],
    mobility: ["mobility"],
    recovery: ["recovery"],
    athletic_performance: ["athleticism", "power"],
    calisthenics: ["calisthenics", "strength"],
  };
  return map[g] ?? [g];
}

function buildMatchableUniverse(): Set<string> {
  const u = new Set<string>();

  for (const g of [
    "strength",
    "power",
    "hypertrophy",
    "body_recomp",
    "endurance",
    "conditioning",
    "mobility",
    "recovery",
    "athletic_performance",
    "calisthenics",
  ]) {
    for (const t of goalToTags(g)) u.add(tagToSlug(t));
  }

  for (const entries of Object.values(GOAL_SUB_FOCUS_TAG_MAP)) {
    for (const e of entries) u.add(tagToSlug(e.tag_slug));
  }

  for (const entries of Object.values(SUB_FOCUS_TAG_MAP)) {
    for (const e of entries) u.add(tagToSlug(e.tag_slug));
  }

  for (const sport of SPORTS_WITH_SUB_FOCUSES) u.add(tagToSlug(sport.slug));
  return u;
}

function histogram(counts: { slug: string; count: number }[]): Record<string, number> {
  const out = new Map<number, number>();
  for (const r of counts) out.set(r.count, (out.get(r.count) ?? 0) + 1);
  return Object.fromEntries([...out.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => [String(k), v]));
}

function getSelectorFacingTagSlugs(ex: ReturnType<typeof exerciseDefinitionToGeneratorExercise>): Set<string> {
  const out = new Set<string>();
  const add = (arr?: string[]) => {
    for (const t of arr ?? []) out.add(tagToSlug(t));
  };
  add(ex.tags.goal_tags as unknown as string[] | undefined);
  add(ex.tags.sport_tags as unknown as string[] | undefined);
  add(ex.tags.stimulus as unknown as string[] | undefined);
  add(ex.tags.attribute_tags as unknown as string[] | undefined);
  return out;
}

function ymd(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

async function main() {
  const universe = buildMatchableUniverse();
  const coverage = new Map<string, number>();
  for (const s of universe) coverage.set(s, 0);

  for (const def of EXERCISES) {
    const ex = exerciseDefinitionToGeneratorExercise(def);
    for (const s of getSelectorFacingTagSlugs(ex)) {
      if (!universe.has(s)) continue;
      coverage.set(s, (coverage.get(s) ?? 0) + 1);
    }
  }

  const counts = [...universe]
    .map((slug) => ({ slug, count: coverage.get(slug) ?? 0 }))
    .sort((a, b) => a.slug.localeCompare(b.slug));

  const missing = counts.filter((r) => r.count === 0).map((r) => r.slug).sort();
  const sparseThreshold = 3;
  const sparse = counts
    .filter((r) => r.count > 0 && r.count < sparseThreshold)
    .map((r) => r.slug)
    .sort();

  const date = ymd(new Date());
  const outputDir = path.join(process.cwd(), "docs", "auditSnapshots");
  const outputPath = path.join(outputDir, `exercise-tag-coverage-snapshot-${date}.json`);

  const snapshot = {
    generatedAt: new Date().toISOString(),
    totalExercises: EXERCISES.length,
    universeSize: universe.size,
    sparseThreshold,
    missingCount: missing.length,
    sparseCount: sparse.length,
    missingSlugs: missing,
    sparseSlugs: sparse,
    coverageBySlug: Object.fromEntries(counts.map((r) => [r.slug, r.count])),
    histogram: histogram(counts),
  };

  fs.writeFileSync(outputPath, JSON.stringify(snapshot, null, 2), "utf8");
  console.log(outputPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

