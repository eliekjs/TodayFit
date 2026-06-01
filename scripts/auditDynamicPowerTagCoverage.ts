/**
 * Audit catalog coverage for speed/COD dynamic-movement tag signals (Phase 9).
 *
 * npx tsx scripts/auditDynamicPowerTagCoverage.ts
 */

import { EXERCISES } from "../data/exercisesMerged";
import { exerciseDefinitionToGeneratorExercise } from "../lib/dailyGeneratorAdapter";
import { tagSetHasDynamicPowerSignal } from "../data/sportSubFocus/subFocusIntentArchetypes";

function exerciseTagSet(ex: ReturnType<typeof exerciseDefinitionToGeneratorExercise>): Set<string> {
  const tags = new Set<string>();
  for (const t of ex.tags.attribute_tags ?? []) tags.add(t.toLowerCase().replace(/\s/g, "_"));
  for (const t of ex.tags.stimulus ?? []) tags.add(t.toLowerCase().replace(/\s/g, "_"));
  return tags;
}

const AGILITY_NAME = /shuffle|cone|ladder|agility|skater_jump|cod\b|change_of_direction/i;

function main(): void {
  const total = EXERCISES.length;
  let dynamicSignal = 0;
  let agilityNamed = 0;
  let agilityNamedWithSignal = 0;
  const missingSamples: string[] = [];

  for (const def of EXERCISES) {
    const ex = exerciseDefinitionToGeneratorExercise(def);
    const set = exerciseTagSet(ex);
    if (tagSetHasDynamicPowerSignal(set)) dynamicSignal += 1;

    const idName = `${def.id} ${def.name}`;
    if (!AGILITY_NAME.test(idName)) continue;
    agilityNamed += 1;
    if (tagSetHasDynamicPowerSignal(set)) {
      agilityNamedWithSignal += 1;
    } else if (missingSamples.length < 25) {
      missingSamples.push(def.id);
    }
  }

  const pct = total > 0 ? ((dynamicSignal / total) * 100).toFixed(1) : "0";
  const agilityPct =
    agilityNamed > 0 ? ((agilityNamedWithSignal / agilityNamed) * 100).toFixed(1) : "n/a";

  console.log("Dynamic power tag coverage (Phase 9)");
  console.log(`  Catalog size: ${total}`);
  console.log(`  Exercises with dynamic power signal: ${dynamicSignal} (${pct}%)`);
  console.log(`  Agility/COD-named exercises: ${agilityNamed}`);
  console.log(`  Agility/COD-named with signal: ${agilityNamedWithSignal} (${agilityPct}%)`);
  if (missingSamples.length) {
    console.log("  Sample agility-named IDs still missing signal:");
    for (const id of missingSamples) console.log(`    - ${id}`);
  }
}

main();
