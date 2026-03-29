/**
 * Detailed coverage audit for canonical matchable exercise tag slugs.
 *
 * Produces:
 * - Missing slugs in the canonical matchable universe (no exercises tagged with them).
 * - Sparse slugs (coverage < threshold) so we can prioritize backfilling.
 *
 * Run:
 *   npx tsx scripts/auditExerciseTagCoverageDetails.ts
 */

import { EXERCISES } from "../data/exercisesMerged";
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

type Origin =
  | { kind: "goal"; goal: string; tag: string }
  | { kind: "goal_sub_focus"; goalSlug: string; subFocusSlug: string; tag: string }
  | { kind: "sport_sub_focus"; sportSlug: string; subFocusSlug: string; tag: string }
  | { kind: "sport"; sportSlug: string };

function buildMatchableUniverseWithOrigins(): Map<string, Origin[]> {
  const out = new Map<string, Origin[]>();
  const add = (slug: string, origin: Origin) => {
    const s = tagToSlug(slug);
    const existing = out.get(s) ?? [];
    out.set(s, [...existing, origin]);
  };

  // Goals
  for (const g of ["strength", "power", "hypertrophy", "body_recomp", "endurance", "conditioning", "mobility", "recovery", "athletic_performance", "calisthenics"]) {
    for (const t of goalToTags(g)) add(t, { kind: "goal", goal: g, tag: t });
  }

  // Goal sub-focus tag slugs
  for (const [compoundKey, entries] of Object.entries(GOAL_SUB_FOCUS_TAG_MAP)) {
    const [goalSlug, subFocusSlug] = compoundKey.split(":");
    for (const e of entries) add(e.tag_slug, { kind: "goal_sub_focus", goalSlug, subFocusSlug, tag: e.tag_slug });
  }

  // Sport sub-focus tag slugs
  for (const [compoundKey, entries] of Object.entries(SUB_FOCUS_TAG_MAP)) {
    const [sportSlug, subFocusSlug] = compoundKey.split(":");
    for (const e of entries) add(e.tag_slug, { kind: "sport_sub_focus", sportSlug, subFocusSlug, tag: e.tag_slug });
  }

  // Sports slugs (used directly by dailyGenerator sport_tags matching)
  for (const s of SPORTS_WITH_SUB_FOCUSES) add(s.slug, { kind: "sport", sportSlug: s.slug });

  return out;
}

function uniqueSetSize<T>(s: Set<T>): number {
  return s.size;
}

function getTagSlugsFromExercise(ex: ReturnType<typeof exerciseDefinitionToGeneratorExercise>): Set<string> {
  const s = new Set<string>();
  const add = (arr: string[] | undefined) => {
    for (const t of arr ?? []) s.add(tagToSlug(t));
  };
  add(ex.tags.goal_tags as unknown as string[] | undefined);
  add(ex.tags.sport_tags);
  add(ex.tags.stimulus as unknown as string[] | undefined);
  add(ex.tags.attribute_tags as unknown as string[] | undefined);
  return s;
}

function prettyOrigin(o: Origin): string {
  if (o.kind === "goal") return `goal:${o.goal}:${o.tag}`;
  if (o.kind === "sport") return `sport:${o.sportSlug}`;
  if (o.kind === "goal_sub_focus") return `goal_sub_focus:${o.goalSlug}:${o.subFocusSlug}:${o.tag}`;
  return `sport_sub_focus:${o.sportSlug}:${o.subFocusSlug}:${o.tag}`;
}

function histogram(rows: { slug: string; count: number }[], selector: (r: { count: number }) => number): Map<number, number> {
  const m = new Map<number, number>();
  for (const r of rows) {
    const k = selector(r);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

async function main() {
  const universeWithOrigins = buildMatchableUniverseWithOrigins();
  const universe = new Set(universeWithOrigins.keys());

  const matchableTagSlugFrequency = new Map<string, number>();
  for (const def of EXERCISES) {
    const ex = exerciseDefinitionToGeneratorExercise(def);
    for (const s of getTagSlugsFromExercise(ex)) {
      if (universe.has(s)) matchableTagSlugFrequency.set(s, (matchableTagSlugFrequency.get(s) ?? 0) + 1);
    }
  }

  const sortedAll = [...universe].sort();
  const missing: string[] = [];
  const counts: { slug: string; count: number }[] = [];
  for (const slug of sortedAll) {
    const c = matchableTagSlugFrequency.get(slug) ?? 0;
    counts.push({ slug, count: c });
    if (c === 0) missing.push(slug);
  }

  counts.sort((a, b) => a.count - b.count || a.slug.localeCompare(b.slug));

  const sparseThreshold = 3;
  const sparse = counts.filter((r) => r.count > 0 && r.count < sparseThreshold);

  console.log(`Total exercises analyzed: ${EXERCISES.length}`);
  console.log(`Matchable universe size: ${universe.size}`);
  console.log(`Slugs with coverage >= 1: ${counts.filter((r) => r.count > 0).length}`);
  console.log(`Missing slugs (coverage=0): ${missing.length}`);
  console.log(`Sparse slugs (0 < coverage < ${sparseThreshold}): ${sparse.length}`);

  console.log("");
  console.log(`Missing slugs (${missing.length}):`);
  console.log(missing.join(", "));

  console.log("");
  console.log(`Sparse slugs (count < ${sparseThreshold}, top 40):`);
  for (const r of sparse.slice(0, 40)) {
    const origins = universeWithOrigins.get(r.slug) ?? [];
    const uniqueOriginKinds = [...new Set(origins.map(prettyOrigin))];
    console.log(`  ${r.slug} :: ${r.count} :: ${uniqueOriginKinds.slice(0, 4).join(" | ")}${uniqueOriginKinds.length > 4 ? " ..." : ""}`);
  }

  console.log("");
  console.log("Coverage histogram (missing=0 included):");
  const hist = histogram(counts, (r) => r.count);
  console.log(
    [...hist.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ")
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

