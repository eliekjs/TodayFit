/**
 * Audit exercise tag matchability coverage.
 *
 * "Matchable" slugs are the ones the workout generator can actually use
 * to bias selection for:
 * - goals (goalToTags)
 * - goal sub-focuses (GOAL_SUB_FOCUS_TAG_MAP tag_slug values)
 * - sport sub-focuses (SUB_FOCUS_TAG_MAP tag_slug values)
 * - sports (input sport_slugs are compared against exercise sport_tags)
 *
 * Metrics produced:
 * - matchableTagSlugCount: intersection count using tags-only slugs
 *   (goal_tags + sport_tags + stimulus + attribute_tags)
 * - matchableTagLikeSlugCount: intersection count using tag-like slugs
 *   (tags-only + muscles + movement_pattern + pairing_category)
 *
 * Run:
 *   npx tsx scripts/auditExerciseTagMatchability.ts
 */

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

  // Goal tags
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

  // Goal sub-focus tags
  for (const entries of Object.values(GOAL_SUB_FOCUS_TAG_MAP)) {
    for (const e of entries) u.add(tagToSlug(e.tag_slug));
  }

  // Sport sub-focus tags
  for (const entries of Object.values(SUB_FOCUS_TAG_MAP)) {
    for (const e of entries) u.add(tagToSlug(e.tag_slug));
  }

  // Sports (dailyGenerator compares input sport_slugs vs exercise.tags.sport_tags)
  for (const sportSlug of Object.keys(SPORTS_WITH_SUB_FOCUSES)) {
    u.add(tagToSlug(sportSlug));
  }

  return u;
}

function uniqueSetSize<T>(s: Set<T>): number {
  return s.size;
}

type AuditRow = {
  id: string;
  name: string;
  matchableTagSlugCount: number;
  matchableTagLikeSlugCount: number;
};

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

function getTagLikeSlugsFromExercise(
  ex: ReturnType<typeof exerciseDefinitionToGeneratorExercise>
): Set<string> {
  const s = new Set<string>(getTagSlugsFromExercise(ex));
  for (const m of ex.muscle_groups ?? []) s.add(tagToSlug(m));
  if (ex.movement_pattern) s.add(tagToSlug(ex.movement_pattern));
  // pairing_category currently not populated for ExerciseDefinition->Exercise, but keep for forward-compat
  if ((ex as any).pairing_category) s.add(tagToSlug((ex as any).pairing_category));
  return s;
}

function histogram(rows: AuditRow[], selector: (r: AuditRow) => number): Map<number, number> {
  const m = new Map<number, number>();
  for (const r of rows) {
    const k = selector(r);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

function topWorst(rows: AuditRow[], n: number, selector: (r: AuditRow) => number): AuditRow[] {
  return [...rows]
    .sort((a, b) => selector(a) - selector(b))
    .slice(0, n);
}

function topBest(rows: AuditRow[], n: number, selector: (r: AuditRow) => number): AuditRow[] {
  return [...rows]
    .sort((a, b) => selector(b) - selector(a))
    .slice(0, n);
}

async function main() {
  const matchableUniverse = buildMatchableUniverse();

  const rows: AuditRow[] = [];
  const matchableTagSlugFrequency = new Map<string, number>();
  for (const def of EXERCISES) {
    const ex = exerciseDefinitionToGeneratorExercise(def);

    const tagSlugs = getTagSlugsFromExercise(ex);
    const tagLikeSlugs = getTagLikeSlugsFromExercise(ex);

    let matchableTagSlugCount = 0;
    const matchableTagsForThisExercise: string[] = [];
    for (const s of tagSlugs) if (matchableUniverse.has(s)) matchableTagSlugCount++;
    for (const s of tagSlugs) {
      if (matchableUniverse.has(s)) matchableTagsForThisExercise.push(s);
    }
    for (const s of matchableTagsForThisExercise) {
      matchableTagSlugFrequency.set(s, (matchableTagSlugFrequency.get(s) ?? 0) + 1);
    }

    let matchableTagLikeSlugCount = 0;
    for (const s of tagLikeSlugs) if (matchableUniverse.has(s)) matchableTagLikeSlugCount++;

    rows.push({
      id: def.id,
      name: def.name,
      matchableTagSlugCount,
      matchableTagLikeSlugCount,
    });
  }

  rows.sort((a, b) => a.matchableTagSlugCount - b.matchableTagSlugCount);

  const total = rows.length;
  const ge3Tags = rows.filter((r) => r.matchableTagSlugCount >= 3).length;
  const ge3TagLike = rows.filter((r) => r.matchableTagLikeSlugCount >= 3).length;

  const histTags = histogram(rows, (r) => r.matchableTagSlugCount);
  const histLike = histogram(rows, (r) => r.matchableTagLikeSlugCount);
  const matchableTagsWithNonZeroCoverage = [...matchableTagSlugFrequency.entries()].filter(([, c]) => c > 0).length;
  const matchableTagsWithZeroCoverage = matchableUniverse.size - matchableTagsWithNonZeroCoverage;

  const fmtHist = (h: Map<number, number>) =>
    [...h.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");

  console.log(`Total exercises analyzed: ${total}`);
  console.log(`Matchable universe size: ${matchableUniverse.size}`);
  console.log(`Matchable tag slugs with >=1 exercise tagged: ${matchableTagsWithNonZeroCoverage}`);
  console.log(`Matchable tag slugs with 0 tagged exercises (tags-only): ${matchableTagsWithZeroCoverage}`);
  console.log(`>= 3 matchable tags (tags-only): ${ge3Tags} (${((ge3Tags / total) * 100).toFixed(1)}%)`);
  console.log(`>= 3 matchable tags (tag-like slugs): ${ge3TagLike} (${((ge3TagLike / total) * 100).toFixed(1)}%)`);
  console.log("");
  console.log(`Histogram matchable tags-only: ${fmtHist(histTags)}`);
  console.log(`Histogram matchable tag-like slugs: ${fmtHist(histLike)}`);
  console.log("");

  const topMatchableSlugs = [...matchableTagSlugFrequency.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);
  console.log("Most covered matchable tag slugs (tags-only), top 15:");
  for (const [slug, count] of topMatchableSlugs) {
    console.log(`  ${slug}: ${count}`);
  }
  console.log("");

  console.log("Worst 10 (tags-only):");
  for (const r of topWorst(rows, 10, (rr) => rr.matchableTagSlugCount)) {
    console.log(`  ${r.matchableTagSlugCount} :: ${r.id} :: ${r.name}`);
  }

  console.log("Worst 10 (tag-like):");
  for (const r of topWorst(rows, 10, (rr) => rr.matchableTagLikeSlugCount)) {
    console.log(`  ${r.matchableTagLikeSlugCount} :: ${r.id} :: ${r.name}`);
  }

  console.log("Best 10 (tags-only):");
  for (const r of topBest(rows, 10, (rr) => rr.matchableTagSlugCount)) {
    console.log(`  ${r.matchableTagSlugCount} :: ${r.id} :: ${r.name}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

