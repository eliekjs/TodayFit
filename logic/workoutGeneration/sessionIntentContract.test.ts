/**
 * SessionIntentContract wiring (alpine mapping + adapter passthrough).
 * Run: npx tsx logic/workoutGeneration/sessionIntentContract.test.ts
 */

import assert from "assert";
import {
  buildAlpineSkiingSessionIntentContract,
  sessionIntentContractForSportSlug,
} from "./sessionIntentContract";
import { manualPreferencesToGenerateWorkoutInput } from "../../lib/dailyGeneratorAdapter";
import type { ManualPreferences } from "../../lib/types";

function main() {
  const alpine = buildAlpineSkiingSessionIntentContract();
  assert(alpine.sportSlug === "alpine_skiing");
  assert(alpine.sessionType.includes("alpine"));
  assert(alpine.mustIncludeCategories.includes("eccentric_braking_control"));
  assert(alpine.preferCategories.includes("hip_knee_control"));
  assert(alpine.avoidCategories.includes("running_gait_identity"));
  assert(alpine.requiredCoverage.eccentricDecelMain === true);
  assert(alpine.fallbackPolicy.allowFullPoolFallback === true);
  assert(alpine.degradedModeBehavior.flagWhenRequirementsMissed === true);

  assert(sessionIntentContractForSportSlug("alpine_skiing") != null);
  assert(sessionIntentContractForSportSlug("trail_running") === undefined);

  const prefs: ManualPreferences = {
    primaryFocus: ["Build Strength"],
    targetBody: null,
    targetModifier: [],
    durationMinutes: 45,
    energyLevel: "medium",
    injuries: [],
    upcoming: [],
    subFocusByGoal: {},
    workoutStyle: [],
    workoutTier: "intermediate",
  };
  const input = manualPreferencesToGenerateWorkoutInput(prefs, undefined, 1, undefined, {
    sport_slugs: ["alpine_skiing"],
    session_intent_contract: alpine,
  });
  assert(input.session_intent_contract?.sportSlug === "alpine_skiing");

  console.log("sessionIntentContract: ok");
}

main();
