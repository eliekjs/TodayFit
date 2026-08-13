/**
 * Audit all PILOT_SPORT_SLUGS sub-focus pools (Your Gym).
 * npx tsx scripts/auditPilotSportSubFocusPools.ts
 */
import { writeFileSync } from "fs";
import { EXERCISES } from "../data/exercisesMerged";
import {
  manualPreferencesToGenerateWorkoutInput,
  exerciseDefinitionToGeneratorExercise,
} from "../lib/dailyGeneratorAdapter";
import {
  filterByHardConstraints,
  filterByConstraintsForPool,
} from "../logic/workoutGeneration/dailyGenerator";
import { resolveGatedExercisePoolForGeneration } from "../logic/workoutGeneration/pruningGatePool";
import { resolveWorkoutConstraints } from "../logic/workoutIntelligence/constraints/resolveWorkoutConstraints";
import { getDefaultEquipmentForTemplate } from "../data/gymProfiles";
import { exerciseMatchesSportSubFocusSlug } from "../logic/workoutGeneration/subFocusSlugMatch";
import { SPORTS_WITH_SUB_FOCUSES } from "../data/sportSubFocus/sportsWithSubFocuses";
import { PILOT_SPORT_SLUGS } from "../lib/pilotCatalog";
import { SUB_FOCUS_TAG_MAP } from "../data/sportSubFocus/subFocusTagMap";
import type { GenerateWorkoutInput } from "../logic/workoutGeneration/types";

const WEAK = 12;
const CRITICAL = 5;
const mapKey = (sport: string, subFocus: string) => `${sport}:${subFocus}`;
const pilot = new Set<string>(PILOT_SPORT_SLUGS);

const gym = {
  id: "your_gym",
  name: "Your Gym",
  equipment: getDefaultEquipmentForTemplate("your_gym"),
};
const input = manualPreferencesToGenerateWorkoutInput(
  {
    primaryFocus: ["Sport preparation"],
    targetBody: "Full",
    targetModifier: [],
    durationMinutes: 45,
    energyLevel: "medium",
    injuries: ["No restrictions"],
    upcoming: [],
    subFocusByGoal: {},
    workoutStyle: [],
  },
  gym,
  1
);

function toSel(inp: GenerateWorkoutInput) {
  return {
    primary_goal: inp.primary_goal,
    secondary_goals: inp.secondary_goals?.map((g) => g.toLowerCase().replace(/\s/g, "_")) ?? [],
    sports: inp.sport_slugs,
    available_equipment: inp.available_equipment,
    duration_minutes: inp.duration_minutes,
    energy_level: inp.energy_level,
    injuries_or_limitations: inp.injuries_or_constraints ?? [],
    body_region_focus: inp.focus_body_parts?.map((f) => f.toLowerCase().replace(/\s/g, "_")) ?? [],
  };
}

const catalog = EXERCISES.map(exerciseDefinitionToGeneratorExercise);
const gated = resolveGatedExercisePoolForGeneration(catalog, input).pool;
const hard = filterByHardConstraints(gated, input);
const filtered = filterByConstraintsForPool(hard, resolveWorkoutConstraints(toSel(input)));

type Row = {
  sport: string;
  sf: string;
  name: string;
  count: number;
  status: "ok" | "WEAK" | "CRITICAL";
  tags: string[];
  samples: string[];
};

const rows: Row[] = [];

for (const sport of SPORTS_WITH_SUB_FOCUSES.filter((s) => pilot.has(s.slug))) {
  for (const sf of sport.sub_focuses) {
    const matches = filtered.filter((e) =>
      exerciseMatchesSportSubFocusSlug(e, sport.slug, sf.slug)
    );
    const n = matches.length;
    const status = n <= CRITICAL ? "CRITICAL" : n <= WEAK ? "WEAK" : "ok";
    const tagWeights = SUB_FOCUS_TAG_MAP[mapKey(sport.slug, sf.slug)] ?? [];
    rows.push({
      sport: sport.slug,
      sf: sf.slug,
      name: sf.name,
      count: n,
      status,
      tags: tagWeights.map((t) => t.tag_slug),
      samples: matches.slice(0, 6).map((e) => e.id),
    });
  }
}

const gaps = rows
  .filter((r) => r.status !== "ok")
  .sort((a, b) => a.count - b.count || a.sport.localeCompare(b.sport));

const bySport: Record<
  string,
  { total: number; ok: number; weak: number; critical: number }
> = {};
for (const r of rows) {
  bySport[r.sport] ??= { total: 0, ok: 0, weak: 0, critical: 0 };
  bySport[r.sport].total += 1;
  if (r.status === "ok") bySport[r.sport].ok += 1;
  else if (r.status === "WEAK") bySport[r.sport].weak += 1;
  else bySport[r.sport].critical += 1;
}

console.log(`Filtered pool: ${filtered.length}`);
console.log(
  `Pilot sports with chips: ${Object.keys(bySport).length} | total sub-focuses: ${rows.length}`
);
console.log(
  `OK: ${rows.filter((r) => r.status === "ok").length} | WEAK: ${gaps.filter((r) => r.status === "WEAK").length} | CRITICAL: ${gaps.filter((r) => r.status === "CRITICAL").length}`
);
console.log("\n=== Gaps (≤12) ===");
for (const r of gaps) {
  console.log(
    `[${r.status}] ${r.count} — ${r.sport}:${r.sf} (${r.name}) tags=[${r.tags.join(", ")}] e.g. ${r.samples.join(", ")}`
  );
}
console.log("\n=== Per sport ===");
for (const slug of PILOT_SPORT_SLUGS) {
  const s = bySport[slug];
  if (!s) {
    console.log(`${slug}: NO SUB-FOCUS CHIPS`);
    continue;
  }
  const mark = s.critical || s.weak ? "GAP" : "OK ";
  console.log(
    `[${mark}] ${slug}: ${s.ok}/${s.total} ok (weak=${s.weak} crit=${s.critical})`
  );
}

writeFileSync(
  "/tmp/pilot-subfocus-gaps.json",
  JSON.stringify({ filtered: filtered.length, rows, gaps, bySport }, null, 2)
);
console.log("\nWrote /tmp/pilot-subfocus-gaps.json");
process.exit(gaps.some((g) => g.status === "CRITICAL") ? 2 : gaps.length ? 1 : 0);
