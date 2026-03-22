/**
 * Canonical exercise ontology coverage regression test.
 *
 * Enforces the "selector-facing canonical contract":
 * - goal_tags, sport_tags, stimulus, attribute_tags must only contain canonical matchable slugs
 * - every canonical matchable slug must be covered by at least one exercise
 * - every exercise must have at least 1 matchable selector-facing canonical tag
 *
 * Run:
 *   npx tsx logic/workoutGeneration/exerciseOntologyCoverage.test.ts
 */

import { EXERCISES } from "../../data/exercises";
import { GOAL_SUB_FOCUS_TAG_MAP } from "../../data/goalSubFocus";
import { CONDITIONING_INTENT_SLUGS } from "../../data/goalSubFocus/conditioningSubFocus";
import { SPORTS_WITH_SUB_FOCUSES } from "../../data/sportSubFocus/sportsWithSubFocuses";
import { SUB_FOCUS_TAG_MAP } from "../../data/sportSubFocus/subFocusTagMap";
import { exerciseDefinitionToGeneratorExercise } from "../../lib/dailyGeneratorAdapter";

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

  for (const sport of SPORTS_WITH_SUB_FOCUSES) {
    u.add(tagToSlug(sport.slug));
  }

  // Phase 4: conditioning intent slugs live in attribute_tags for direct sub-focus matching.
  for (const s of CONDITIONING_INTENT_SLUGS) {
    u.add(tagToSlug(s));
  }

  return u;
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

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function main() {
  const universe = buildMatchableUniverse();
  const coverage = new Map<string, number>();
  for (const s of universe) coverage.set(s, 0);

  let zeroMatchableExerciseCount = 0;
  const exercisesUnknownSelectorTagSlugs: Array<{ id: string; field: string; unknown: string[] }> = [];

  for (const def of EXERCISES) {
    const ex = exerciseDefinitionToGeneratorExercise(def);
    const selectorSlugs = getSelectorFacingTagSlugs(ex);
    const matchableCount = [...selectorSlugs].filter((s) => universe.has(s)).length;
    if (matchableCount === 0) zeroMatchableExerciseCount++;

    // Contract enforcement: selector-facing fields must only contain canonical matchable universe slugs.
    const selectorFields: Array<{ field: string; tags?: string[] }> = [
      { field: "goal_tags", tags: ex.tags.goal_tags as unknown as string[] | undefined },
      { field: "sport_tags", tags: ex.tags.sport_tags as unknown as string[] | undefined },
      { field: "attribute_tags", tags: ex.tags.attribute_tags as unknown as string[] | undefined },
    ];

    for (const { field, tags } of selectorFields) {
      const unknown = (tags ?? []).map(tagToSlug).filter((t) => !universe.has(t));
      if (unknown.length) {
        exercisesUnknownSelectorTagSlugs.push({ id: ex.id, field, unknown: Array.from(new Set(unknown)).slice(0, 20) });
      }
    }

    for (const s of selectorSlugs) {
      if (universe.has(s)) coverage.set(s, (coverage.get(s) ?? 0) + 1);
    }
  }

  const missingSlugs = [...universe].filter((s) => (coverage.get(s) ?? 0) === 0).sort();

  assert(missingSlugs.length === 0, `Some canonical matchable slugs have zero coverage:\n${missingSlugs.join(", ")}`);
  assert(zeroMatchableExerciseCount === 0, `Some exercises have zero canonical selector tags (count=${zeroMatchableExerciseCount})`);
  assert(
    exercisesUnknownSelectorTagSlugs.length === 0,
    `Unknown selector-facing slugs found (count=${exercisesUnknownSelectorTagSlugs.length}). Example:\n${exercisesUnknownSelectorTagSlugs
      .slice(0, 5)
      .map((r) => `${r.id} [${r.field}]: ${r.unknown.join(", ")}`)
      .join("\n")}`
  );

  console.log(`OK: canonical exercise ontology coverage is complete (${universe.size} slugs).`);
}

main();

