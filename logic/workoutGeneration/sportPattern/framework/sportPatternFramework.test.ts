/**
 * Framework-only tests (no hiking categories required).
 * Run: npx tsx logic/workoutGeneration/sportPattern/framework/sportPatternFramework.test.ts
 */

import assert from "assert";
import type { Exercise } from "../../types";
import { gatePoolForSportSlot } from "./gatePool";
import { computeSportPatternSlotScoreAdjustment } from "./slotScoreAdjustment";
import { getSportPatternSlotRuleForBlockType } from "./slotRules";
import type { SportPatternSlotRule, SportPatternSlotScoreWeights } from "./types";

function mkEx(id: string, tags: string[]): Exercise {
  return {
    id,
    name: id,
    movement_pattern: "squat",
    muscle_groups: ["legs"],
    modality: "strength",
    equipment_required: ["dumbbells"],
    difficulty: 3,
    time_cost: "medium",
    tags: { goal_tags: ["strength"], energy_fit: ["medium"], attribute_tags: tags },
  };
}

const slots: readonly SportPatternSlotRule[] = [
  {
    slotRuleId: "test_main",
    blockTypes: ["main_strength"],
    gateMatchAnyOf: ["alpha", "beta"],
    preferMatchAnyOf: ["alpha", "gamma"],
    deprioritizeMatchAnyOf: ["bad"],
  },
];

const weights: SportPatternSlotScoreWeights = {
  matchGateFallback: 10,
  matchPrefer: 5,
  deprioritized: 8,
};

function categoriesFromTags(ex: Exercise): Set<string> {
  return new Set((ex.tags?.attribute_tags ?? []).map((t) => String(t).toLowerCase()));
}

function matchesGate(ex: Exercise, cats: readonly string[]): boolean {
  const s = categoriesFromTags(ex);
  return cats.some((c) => s.has(c));
}

function main() {
  const rule = getSportPatternSlotRuleForBlockType("main_strength", slots);
  assert(rule?.slotRuleId === "test_main", "slot rule resolution");

  const a = mkEx("a", ["alpha"]);
  const b = mkEx("b", ["other"]);
  const noRuleResult = gatePoolForSportSlot([a, b], "main_strength", undefined, {}, { exerciseMatchesGate: matchesGate });
  assert(noRuleResult.poolForSelection.length === 2 && !noRuleResult.usedFullPoolFallback, "no rule → use full pool");

  const gatedOk = gatePoolForSportSlot([a, b], "main_strength", rule, {}, { exerciseMatchesGate: matchesGate });
  assert(gatedOk.hasMatches && gatedOk.poolForSelection.length === 1 && gatedOk.poolForSelection[0].id === "a", "gated pool");
  assert(!gatedOk.usedFullPoolFallback, "no fallback when matches exist");

  const gatedEmpty = gatePoolForSportSlot([b], "main_strength", rule, {}, { exerciseMatchesGate: matchesGate });
  assert(
    gatedEmpty.usedFullPoolFallback && gatedEmpty.poolForSelection.length === 1 && gatedEmpty.poolForSelection[0].id === "b",
    "zero gate matches → full pool fallback"
  );

  const adj = computeSportPatternSlotScoreAdjustment(a, rule!, "gated", categoriesFromTags, weights);
  assert(adj.matchedGate && adj.matchedPrefer && adj.delta > 0, "gated mode boosts prefer");

  const depOnly = mkEx("d", ["bad"]);
  const adjDep = computeSportPatternSlotScoreAdjustment(depOnly, rule!, "gated", categoriesFromTags, weights);
  assert(adjDep.matchedDeprioritized && adjDep.delta < 0, "deprioritized-only penalty");

  console.log("sportPatternFramework.test.ts: all assertions passed");
}

main();
