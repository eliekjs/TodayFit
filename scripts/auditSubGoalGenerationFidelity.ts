/**
 * Generate one Manual session per active goal sub-focus and score intent fidelity.
 *
 * npx tsx scripts/auditSubGoalGenerationFidelity.ts
 * npx tsx scripts/auditSubGoalGenerationFidelity.ts --json
 * npx tsx scripts/auditSubGoalGenerationFidelity.ts --only=olympic_triple_extension
 */

import { EXERCISES } from "../data/exercisesMerged";
import { getDefaultEquipmentForTemplate } from "../data/gymProfiles";
import { buildAllSubGoalIntentContracts } from "../data/goalSubFocus/subGoalIntentContracts";
import {
  exerciseDefinitionToGeneratorExercise,
  manualPreferencesToGenerateWorkoutInput,
} from "../lib/dailyGeneratorAdapter";
import type { ManualPreferences } from "../lib/types";
import { generateWorkoutSession } from "../logic/workoutGeneration/dailyGenerator";
import {
  evaluateSubGoalSessionFidelity,
  type SubGoalFidelityResult,
} from "../logic/workoutGeneration/subGoalGenerationFidelity";

const gym = {
  id: "your_gym",
  name: "Your Gym",
  equipment: getDefaultEquipmentForTemplate("your_gym"),
};

function prefsFor(primaryLabel: string, subDisplayName: string, seed: string): ManualPreferences {
  return {
    primaryFocus: [primaryLabel],
    targetBody: "Full",
    targetModifier: [],
    durationMinutes: 45,
    energyLevel: "medium",
    injuries: ["No restrictions"],
    upcoming: [],
    subFocusByGoal: { [primaryLabel]: [subDisplayName] },
    workoutStyle: [],
    workoutTier: "intermediate",
  };
}

function main() {
  const args = process.argv.slice(2);
  const asJson = args.includes("--json");
  const onlyArg = args.find((a) => a.startsWith("--only="));
  const only = onlyArg?.slice("--only=".length);

  const catalog = EXERCISES.map(exerciseDefinitionToGeneratorExercise);
  let contracts = buildAllSubGoalIntentContracts();
  if (only) {
    contracts = contracts.filter((c) => c.slug === only || c.primaryLabel.includes(only));
  }

  const results: SubGoalFidelityResult[] = [];
  for (let i = 0; i < contracts.length; i++) {
    const c = contracts[i]!;
    const seed = `subgoal-fidelity-${c.primaryLabel}-${c.slug}-${i}`;
    const input = manualPreferencesToGenerateWorkoutInput(
      prefsFor(c.primaryLabel, c.displayName, seed),
      gym,
      seed
    );
    const session = generateWorkoutSession(input, catalog);
    results.push(evaluateSubGoalSessionFidelity(c, session, catalog));
  }

  const failed = results.filter((r) => !r.pass);
  const passed = results.filter((r) => r.pass);

  if (asJson) {
    console.log(JSON.stringify({ passed: passed.length, failed: failed.length, results }, null, 2));
    process.exit(failed.length > 0 ? 1 : 0);
  }

  console.log("Sub-goal generation fidelity audit");
  console.log(`Contracts: ${results.length} | pass: ${passed.length} | fail: ${failed.length}`);
  console.log("");

  const byPrimary = new Map<string, SubGoalFidelityResult[]>();
  for (const r of results) {
    const list = byPrimary.get(r.primaryLabel) ?? [];
    list.push(r);
    byPrimary.set(r.primaryLabel, list);
  }

  for (const [primary, rows] of byPrimary) {
    const fails = rows.filter((r) => !r.pass);
    console.log(`## ${primary} (${rows.length - fails.length}/${rows.length} pass)`);
    for (const r of rows) {
      const mark = r.pass ? "OK" : "FAIL";
      const detail = r.pass
        ? `match=${r.matchingCount} strong=${r.strongCount} e.g. ${r.matchingIds.slice(0, 3).join(", ") || "—"}`
        : r.reason;
      console.log(`  [${mark}] ${r.displayName} (${r.slug}) — ${detail}`);
      if (!r.pass) {
        console.log(`         intent: ${r.intentSummary}`);
        if (r.matchingIds.length) {
          console.log(`         weak/all matches: ${r.matchingIds.join(", ")}`);
        }
      }
    }
    console.log("");
  }

  if (failed.length) {
    console.log("Failed slugs:", failed.map((f) => f.key).join(" | "));
    process.exit(1);
  }
  console.log("All sub-goal fidelity checks passed.");
}

main();
