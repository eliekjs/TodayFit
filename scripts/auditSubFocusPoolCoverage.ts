/**
 * Audit sub-focus / sport sub-focus exercise pool sizes using the same pipeline as
 * generateWorkoutSession (static catalog path = exerciseDefinitionToGeneratorExercise,
 * pruning gate, filterByHardConstraints, filterByConstraintsForPool).
 *
 * npx tsx scripts/auditSubFocusPoolCoverage.ts
 */

import { EXERCISES } from "../data/exercisesMerged";
import { manualPreferencesToGenerateWorkoutInput, exerciseDefinitionToGeneratorExercise } from "../lib/dailyGeneratorAdapter";
import {
  filterByHardConstraints,
  filterByConstraintsForPool,
} from "../logic/workoutGeneration/dailyGenerator";
import { resolveGatedExercisePoolForGeneration } from "../logic/workoutGeneration/pruningGatePool";
import { resolveWorkoutConstraints } from "../logic/workoutIntelligence/constraints/resolveWorkoutConstraints";
import type { GenerateWorkoutInput, Exercise } from "../logic/workoutGeneration/types";
import { GOAL_SUB_FOCUS_OPTIONS } from "../data/goalSubFocus/goalSubFocusOptions";
import { getSubFocusClassMap } from "../data/goalSubFocus/subFocusClassifications";
import { buildConditioningIntentPool, CONDITIONING_INTENT_MIN_DIRECT_POOL } from "../logic/workoutGeneration/conditioningPoolBuilder";
import { exerciseMatchesGoalSubFocusSlugUnified, exerciseMatchesSportSubFocusSlug } from "../logic/workoutGeneration/subFocusSlugMatch";
import { filterPoolByOverlay } from "../data/goalSubFocus/conditioningSubFocus";
import { SPORTS_WITH_SUB_FOCUSES } from "../data/sportSubFocus/sportsWithSubFocuses";
import { getDefaultEquipmentForTemplate } from "../data/gymProfiles";
import type { GymProfileTemplate } from "../data/gymProfiles";

const WEAK = 12;
const CRITICAL = 5;

function allEquipmentFromCatalog(): string[] {
  const s = new Set<string>();
  for (const e of EXERCISES) {
    for (const x of e.equipment ?? []) {
      s.add(typeof x === "string" ? x.toLowerCase().replace(/\s/g, "_") : String(x).toLowerCase().replace(/\s/g, "_"));
    }
  }
  return [...s].sort();
}

function inputToSelectionInput(input: GenerateWorkoutInput) {
  return {
    primary_goal: input.primary_goal,
    secondary_goals: input.secondary_goals?.map((g) => g.toLowerCase().replace(/\s/g, "_")) ?? [],
    sports: input.sport_slugs,
    available_equipment: input.available_equipment,
    duration_minutes: input.duration_minutes,
    energy_level: input.energy_level,
    injuries_or_limitations: input.injuries_or_constraints ?? [],
    body_region_focus: input.focus_body_parts?.map((f) => f.toLowerCase().replace(/\s/g, "_")) ?? [],
  };
}

function sessionFilteredPool(
  template: GymProfileTemplate,
  primaryLabel: string,
  subFocusByGoal?: Record<string, string[]>
): { filtered: Exercise[]; input: GenerateWorkoutInput; catalogSize: number } {
  const gym =
    template === "your_gym"
      ? { id: "your_gym", name: "Your Gym", equipment: getDefaultEquipmentForTemplate("your_gym") }
      : { id: "full", name: "Full catalog equipment", equipment: allEquipmentFromCatalog() };

  const input = manualPreferencesToGenerateWorkoutInput(
    {
      primaryFocus: [primaryLabel],
      targetBody: "Full",
      targetModifier: [],
      durationMinutes: 45,
      energyLevel: "medium",
      injuries: ["No restrictions"],
      upcoming: [],
      subFocusByGoal: subFocusByGoal ?? {},
      workoutStyle: [],
    },
    gym,
    1
  );

  const catalog = EXERCISES.map(exerciseDefinitionToGeneratorExercise);
  const gated = resolveGatedExercisePoolForGeneration(catalog, input).pool;
  const hard = filterByHardConstraints(gated, input);
  const constraints = resolveWorkoutConstraints(inputToSelectionInput(input));
  const filtered = filterByConstraintsForPool(hard, constraints);
  return { filtered, input, catalogSize: catalog.length };
}

type PoolRow = {
  key: string;
  count: number;
  selectionCount?: number;
  status: "ok" | "weak" | "critical";
  samples: string[];
};

function status(count: number): PoolRow["status"] {
  if (count <= CRITICAL) return "critical";
  if (count <= WEAK) return "weak";
  return "ok";
}

function auditGoalSubFocuses(template: GymProfileTemplate): PoolRow[] {
  const rows: PoolRow[] = [];
  const conditioningIntents = new Set([
    "zone2_aerobic_base",
    "intervals_hiit",
    "threshold_tempo",
    "hills",
    "zone2_long_steady",
    "intervals",
    "durability",
  ]);

  for (const [primaryLabel, entry] of Object.entries(GOAL_SUB_FOCUS_OPTIONS)) {
    const classMap = getSubFocusClassMap(entry.goalSlug);
    const { filtered } = sessionFilteredPool(template, primaryLabel);

    for (const { slug, name } of entry.subFocuses) {
      if (classMap[slug] === "overlay") continue;
      const key = `${entry.goalSlug}:${slug} (${name})`;
      const matches = filtered.filter((e) =>
        exerciseMatchesGoalSubFocusSlugUnified(e, entry.goalSlug, slug)
      );
      let selectionCount: number | undefined;
      if (conditioningIntents.has(slug) && (entry.goalSlug === "conditioning" || entry.goalSlug === "endurance" || entry.goalSlug === "power")) {
        selectionCount = buildConditioningIntentPool(filtered, {
          intentSlugs: [slug],
          used: new Set(),
        }).length;
      }
      const count = matches.length;
      rows.push({
        key,
        count,
        selectionCount,
        status: status(selectionCount ?? count),
        samples: matches.slice(0, 5).map((e) => e.name),
      });
    }
  }
  return rows;
}

function auditConditioningOverlays(template: GymProfileTemplate): PoolRow[] {
  const { filtered } = sessionFilteredPool(template, "Sport Conditioning");
  const overlays = ["upper", "lower", "core", "full_body"] as const;
  return overlays.map((ov) => {
    const pool = filterPoolByOverlay(
      filtered.filter((e) => e.modality === "conditioning" || e.modality === "power"),
      ov
    );
    return {
      key: `conditioning overlay:${ov}`,
      count: pool.length,
      status: status(pool.length),
      samples: pool.slice(0, 5).map((e) => e.name),
    };
  });
}

function auditSportSubFocuses(template: GymProfileTemplate): PoolRow[] {
  const rows: PoolRow[] = [];
  const { filtered } = sessionFilteredPool(template, "Sport preparation", {});

  for (const sport of SPORTS_WITH_SUB_FOCUSES) {
    for (const sf of sport.sub_focuses) {
      const matches = filtered.filter((e) =>
        exerciseMatchesSportSubFocusSlug(e, sport.slug, sf.slug)
      );
      rows.push({
        key: `${sport.slug}:${sf.slug}`,
        count: matches.length,
        status: status(matches.length),
        samples: matches.slice(0, 4).map((e) => e.name),
      });
    }
  }
  return rows.sort((a, b) => a.count - b.count);
}

function printSection(title: string, rows: PoolRow[]) {
  const weak = rows.filter((r) => r.status !== "ok");
  console.log(`\n=== ${title} ===`);
  console.log(`Total slugs: ${rows.length} | weak (≤${WEAK}): ${weak.length} | critical (≤${CRITICAL}): ${rows.filter((r) => r.status === "critical").length}`);
  if (weak.length === 0) {
    console.log("  All pools above weak threshold.");
    return;
  }
  for (const r of weak.sort((a, b) => a.count - b.count)) {
    const sel =
      r.selectionCount != null && r.selectionCount !== r.count
        ? ` | selection_pool=${r.selectionCount}`
        : "";
    console.log(`  [${r.status.toUpperCase()}] ${r.count}${sel} — ${r.key}`);
    if (r.samples.length) console.log(`         e.g. ${r.samples.join("; ")}`);
  }
}

function main() {
  console.log("Sub-focus pool audit (app pipeline: static catalog + adapter + generator filters)");
  console.log(`Catalog exercises: ${EXERCISES.length}`);
  console.log(`Weak threshold: ≤${WEAK} direct matches | Critical: ≤${CRITICAL}`);
  console.log(`Conditioning intent selection uses buildConditioningIntentPool (min direct ${CONDITIONING_INTENT_MIN_DIRECT_POOL} before signal fallback)`);

  for (const template of ["your_gym", "full"] as const) {
    const label = template === "your_gym" ? "Default gym (Your Gym profile)" : "All equipment (upper bound)";
    console.log(`\n######## ${label} ########`);
    const { filtered, catalogSize } = sessionFilteredPool(template, "Sport Conditioning");
    console.log(`After generator filters: ${filtered.length} / ${catalogSize} catalog`);

    printSection("Goal sub-focus intents", auditGoalSubFocuses(template));
    printSection("Conditioning overlays", auditConditioningOverlays(template));
    printSection("Sport sub-focuses (selection matcher)", auditSportSubFocuses(template));
  }

  console.log("\nNote: Production uses Supabase when active exercise count ≥ policy minimum (default 50);");
  console.log("then static TS catalogs are NOT merged. Re-run against seeded DB for prod-exact counts.");
}

main();
