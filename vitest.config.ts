import { defineConfig } from "vitest/config";

/**
 * Many `*.test.ts` files in this repo are legacy `npx tsx` harnesses (they call `main()` at load).
 * Vitest only runs suites that import from `vitest`. When you add a new Vitest suite, add its glob here.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: [
      "context/**/*.test.ts",
      "lib/db/**/*.test.ts",
      "logic/workoutGeneration/generationValidationGuardrail.test.ts",
      "logic/workoutIntelligence/scoring/exerciseScoring.test.ts",
      "logic/workoutIntelligence/scoring/qualityResolution.test.ts",
      "logic/workoutIntelligence/weekly/phase12-weekly-planning.test.ts",
      "services/sportPrepPlanner/failurePaths.test.ts",
      "services/sportPrepPlanner/updatePlanDayDate.test.ts",
    ],
    passWithNoTests: false,
  },
});
