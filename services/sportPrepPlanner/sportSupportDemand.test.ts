/**
 * Run: npx tsx services/sportPrepPlanner/sportSupportDemand.test.ts
 */
import assert from "node:assert/strict";
import type { IntentKey } from "./weeklyEmphasis";
import { sportSupportDefaultDemand, defaultNonSportEmptyGoalsDemand } from "./sportSupportDemand";

const DEMAND_KEYS: IntentKey[] = [
  "strength",
  "power",
  "aerobic",
  "mobility",
  "prehab",
  "recovery",
];

function chooseIntentOrder(demand: Record<IntentKey, number>): IntentKey[] {
  const sorted = DEMAND_KEYS.slice().sort((a, b) => demand[b] - demand[a]);
  return sorted.filter((k) => demand[k] > 0.01);
}

function run() {
  const sport = sportSupportDefaultDemand();
  const sportOrder = chooseIntentOrder(sport);
  assert.equal(sportOrder[0], "aerobic", "sport-only demand should rank aerobic first");

  const nonSport = defaultNonSportEmptyGoalsDemand();
  const nonSportOrder = chooseIntentOrder(nonSport);
  assert.equal(nonSportOrder[0], "strength", "non-sport empty goals should keep strength-first bias");

  console.log("sportSupportDemand.test.ts: all passed");
}

run();
