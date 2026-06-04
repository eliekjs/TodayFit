/**
 * Promote goal-coverage exercises to eligible_core in generator-eligibility-by-id.json.
 *
 * npx tsx scripts/promoteGoalCoverageEligibility.ts
 */

import fs from "node:fs";
import path from "node:path";
import { GOAL_COVERAGE_ELIGIBLE_CORE_IDS } from "../data/goalIntentEnrichment";

const ELIGIBILITY_PATH = path.join(process.cwd(), "data/generator-eligibility-by-id.json");

type EligibilityFile = {
  by_id?: Record<string, { eligibility_state: string; [k: string]: unknown }>;
};

function main(): void {
  const raw = fs.readFileSync(ELIGIBILITY_PATH, "utf8");
  const data = JSON.parse(raw) as EligibilityFile;
  if (!data.by_id) data.by_id = {};

  let promoted = 0;
  let added = 0;
  for (const id of GOAL_COVERAGE_ELIGIBLE_CORE_IDS) {
    const prev = data.by_id[id];
    if (!prev) {
      data.by_id[id] = { eligibility_state: "eligible_core" };
      added += 1;
      continue;
    }
    if (prev.eligibility_state !== "eligible_core") {
      prev.eligibility_state = "eligible_core";
      promoted += 1;
    }
  }

  fs.writeFileSync(ELIGIBILITY_PATH, `${JSON.stringify(data, null, 0)}\n`, "utf8");
  console.log(
    `Updated ${ELIGIBILITY_PATH}: promoted=${promoted} added=${added} total_ids=${GOAL_COVERAGE_ELIGIBLE_CORE_IDS.length}`
  );
}

main();
