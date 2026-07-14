/**
 * Stratified sport-family generation fidelity audit.
 *
 * npx tsx scripts/auditSportSubGoalGenerationFidelity.ts
 * npx tsx scripts/auditSportSubGoalGenerationFidelity.ts --json
 * npx tsx scripts/auditSportSubGoalGenerationFidelity.ts --only=jump_power
 */

import { EXERCISES } from "../data/exercisesMerged";
import { getDefaultEquipmentForTemplate } from "../data/gymProfiles";
import {
  buildSportStratifiedAuditCells,
  SPORT_FAMILY_INTENT_CONTRACTS,
  sportFamilyContractById,
} from "../data/sportSubFocus/sportFamilyIntentContracts";
import {
  exerciseDefinitionToGeneratorExercise,
  manualPreferencesToGenerateWorkoutInput,
  type SportGoalContext,
} from "../lib/dailyGeneratorAdapter";
import type { ManualPreferences } from "../lib/types";
import { generateWorkoutSession } from "../logic/workoutGeneration/dailyGenerator";
import { evaluateSportFamilySessionFidelity } from "../logic/workoutGeneration/sportSubGoalGenerationFidelity";

const BASE_SPORT_PREFS: ManualPreferences = {
  primaryFocus: [],
  subFocusByGoal: {},
  targetModifier: [],
  upcoming: [],
  workoutStyle: [],
  workoutTier: "intermediate",
  durationMinutes: 45,
  energyLevel: "medium",
  injuries: ["No restrictions"],
  targetBody: "Full",
};

function main() {
  const args = process.argv.slice(2);
  const asJson = args.includes("--json");
  const onlyArg = args.find((a) => a.startsWith("--only="));
  const only = onlyArg?.slice("--only=".length);

  const catalog = EXERCISES.map(exerciseDefinitionToGeneratorExercise);
  let cells = buildSportStratifiedAuditCells([88042, 99002]);
  if (only) {
    cells = cells.filter(
      (c) => c.familyId === only || c.sportSlug === only || c.subFocusSlug === only
    );
  }

  const results = [];
  for (const cell of cells) {
    const contract = sportFamilyContractById(cell.familyId);
    if (!contract) continue;
    const gym = {
      id: cell.gymTemplate,
      name: cell.gymTemplate,
      equipment: getDefaultEquipmentForTemplate(cell.gymTemplate),
    };
    const prefs: ManualPreferences = {
      ...BASE_SPORT_PREFS,
      targetBody: cell.targetBody,
    };
    const sportCtx: SportGoalContext = {
      sport_slugs: [cell.sportSlug],
      sport_sub_focus: { [cell.sportSlug]: [cell.subFocusSlug] },
      sport_weight: 0.55,
      include_intent_survival_report: true,
    };
    const input = manualPreferencesToGenerateWorkoutInput(
      prefs,
      gym,
      `sport-fidelity-${cell.familyId}-${cell.sportSlug}-${cell.subFocusSlug}-${cell.gymTemplate}-${cell.seed}`,
      undefined,
      sportCtx
    );
    // Force seed numeric for reproducibility
    input.seed = cell.seed;
    const session = generateWorkoutSession(input, catalog);
    results.push(evaluateSportFamilySessionFidelity(contract, cell, session, catalog));
  }

  const failed = results.filter((r) => !r.pass);
  const passed = results.filter((r) => r.pass);

  if (asJson) {
    console.log(
      JSON.stringify(
        {
          families: SPORT_FAMILY_INTENT_CONTRACTS.map((c) => c.familyId),
          cells: results.length,
          passed: passed.length,
          failed: failed.length,
          results,
        },
        null,
        2
      )
    );
    process.exit(failed.length > 0 ? 1 : 0);
  }

  console.log("Sport-family generation fidelity audit (stratified)");
  console.log(
    `Families: ${SPORT_FAMILY_INTENT_CONTRACTS.length} | cells: ${results.length} | pass: ${passed.length} | fail: ${failed.length}`
  );
  console.log("");

  for (const c of SPORT_FAMILY_INTENT_CONTRACTS) {
    const familyResults = results.filter((r) => r.familyId === c.familyId);
    const ok = familyResults.filter((r) => r.pass).length;
    console.log(`## ${c.displayName} (${ok}/${familyResults.length} pass)`);
    for (const r of familyResults) {
      const mark = r.pass ? "OK" : "FAIL";
      console.log(
        `  [${mark}] ${r.sportSlug}/${r.subFocusSlug} @ ${r.gymTemplate} seed=${r.seed} — match=${r.matchingCount} strong=${r.strongCount} e.g. ${r.matchingIds.slice(0, 3).join(", ") || "none"}${r.reason ? ` — ${r.reason}` : ""}`
      );
    }
    console.log("");
  }

  if (failed.length) {
    console.error(`${failed.length} stratified cells failed.`);
    process.exit(1);
  }
  console.log("All sport-family stratified fidelity checks passed.");
}

main();
