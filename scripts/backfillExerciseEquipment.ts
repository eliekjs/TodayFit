/**
 * Backfill exercise `equipment` arrays in static catalog TS files using
 * `resolveExerciseEquipmentRequired` (name + stored equipment).
 *
 * Run: npx tsx scripts/backfillExerciseEquipment.ts
 * Dry run: npx tsx scripts/backfillExerciseEquipment.ts --dry-run
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { EXERCISES_BUILTIN } from "../data/exercises";
import { EXERCISES_FUNCTIONAL_FITNESS } from "../data/exercisesFunctionalFitness";
import { OTA_MOVEMENTS } from "../data/otaMovements";
import { resolveExerciseEquipmentRequired } from "../lib/equipmentResolution";
import type { ExerciseDefinition } from "../lib/types";

type Source = {
  filePath: string;
  exportName: string;
  exercises: ExerciseDefinition[];
};

const SOURCES: Source[] = [
  {
    filePath: join(__dirname, "..", "data", "exercises.ts"),
    exportName: "EXERCISES_BUILTIN",
    exercises: EXERCISES_BUILTIN,
  },
  {
    filePath: join(__dirname, "..", "data", "exercisesFunctionalFitness.ts"),
    exportName: "EXERCISES_FUNCTIONAL_FITNESS",
    exercises: EXERCISES_FUNCTIONAL_FITNESS,
  },
  {
    filePath: join(__dirname, "..", "data", "otaMovements.ts"),
    exportName: "OTA_MOVEMENTS",
    exercises: OTA_MOVEMENTS,
  },
];

function formatEquipmentArray(equipment: string[]): string {
  const items = equipment.map((eq) => `"${eq}"`).join(", ");
  return `[${items}]`;
}

function replaceEquipmentForId(
  content: string,
  id: string,
  nextEquipment: string[]
): { content: string; changed: boolean } {
  const idMarkers = [`id: "${id}"`, `"id": "${id}"`];
  let idIdx = -1;
  for (const marker of idMarkers) {
    const idx = content.indexOf(marker);
    if (idx !== -1) {
      idIdx = idx;
      break;
    }
  }
  if (idIdx === -1) return { content, changed: false };

  const slice = content.slice(idIdx);
  const match = slice.match(/"?equipment"?:\s*\[[^\]]*\]/);
  if (!match || match.index == null) return { content, changed: false };

  const start = idIdx + match.index;
  const end = start + match[0].length;
  const replacement = `equipment: ${formatEquipmentArray(nextEquipment)}`;
  if (content.slice(start, end) === replacement) return { content, changed: false };

  return {
    content: content.slice(0, start) + replacement + content.slice(end),
    changed: true,
  };
}

function patchSource(source: Source, dryRun: boolean) {
  let content = readFileSync(source.filePath, "utf-8");
  let changedCount = 0;
  const samples: string[] = [];

  for (const ex of source.exercises) {
    const next = resolveExerciseEquipmentRequired(ex.equipment ?? [], ex.id, ex.name);
    const prevKey = JSON.stringify(ex.equipment ?? []);
    const nextKey = JSON.stringify(next);
    if (prevKey === nextKey) continue;

    const result = replaceEquipmentForId(content, ex.id, next);
    if (!result.changed) {
      console.warn(`  [skip] Could not patch equipment for ${ex.id} in ${source.filePath}`);
      continue;
    }
    content = result.content;
    changedCount += 1;
    if (samples.length < 8) {
      samples.push(`${ex.id}: ${prevKey} -> ${nextKey}`);
    }
  }

  if (!dryRun && changedCount > 0) {
    writeFileSync(source.filePath, content, "utf-8");
  }

  return { changedCount, samples };
}

function main() {
  const dryRun = process.argv.includes("--dry-run");
  let total = 0;

  console.log(dryRun ? "Dry run — no files will be written." : "Backfilling exercise equipment…");

  for (const source of SOURCES) {
    const { changedCount, samples } = patchSource(source, dryRun);
    total += changedCount;
    console.log(`\n${source.exportName}: ${changedCount} exercises updated`);
    for (const line of samples) console.log(`  ${line}`);
  }

  console.log(`\nTotal: ${total} exercises ${dryRun ? "would be" : ""} updated.`);
  if (dryRun && total > 0) {
    console.log("Re-run without --dry-run to apply.");
  }
}

main();
