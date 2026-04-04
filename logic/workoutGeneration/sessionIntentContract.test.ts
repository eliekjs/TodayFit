/**
 * SessionIntentContract wiring (alpine mapping + adapter passthrough).
 * Run: npx tsx logic/workoutGeneration/sessionIntentContract.test.ts
 */

import assert from "assert";
import {
  buildAlpineSkiingSessionIntentContract,
  buildRoadRunningSessionIntentContract,
  buildRockClimbingSessionIntentContract,
  buildTrailRunningSessionIntentContract,
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

  const road = buildRoadRunningSessionIntentContract();
  assert(road.sportSlug === "road_running");
  assert(road.requiredCoverage.eccentricDecelMain === false);
  assert(road.mustIncludeCategories.includes("unilateral_running_stability"));
  assert(sessionIntentContractForSportSlug("road_running") != null);

  const trail = buildTrailRunningSessionIntentContract();
  assert(trail.sportSlug === "trail_running");
  assert(trail.requiredCoverage.eccentricDecelMain === true);
  assert(sessionIntentContractForSportSlug("trail_running") != null);

  const rock = buildRockClimbingSessionIntentContract();
  assert(rock.sportSlug === "rock_climbing");
  assert(rock.mustIncludeCategories.includes("vertical_pull_transfer"));
  assert(rock.preferCategories.includes("scapular_stability_pull"));
  assert(rock.avoidCategories.includes("olympic_skill_lift"));
  assert(rock.requiredCoverage.climbingPullTransfer === true);
  assert(rock.requiredCoverage.eccentricDecelMain === false);
  assert(sessionIntentContractForSportSlug("rock_climbing") != null);
  assert(sessionIntentContractForSportSlug("rock_bouldering") != null);

  const board = sessionIntentContractForSportSlug("snowboarding");
  assert(board?.sportSlug === "snowboarding");
  assert(board?.mustIncludeCategories.includes("snowboard_asymmetric_stance"));
  assert(board?.requiredCoverage.eccentricDecelMain === true);

  const bc = sessionIntentContractForSportSlug("backcountry_skiing");
  assert(bc?.sportSlug === "backcountry_skiing");
  assert(bc?.sessionType.includes("backcountry"));
  assert(bc?.avoidCategories.includes("locomotion_hiking_trail_identity") === false);

  const xc = sessionIntentContractForSportSlug("xc_skiing");
  assert(xc?.sportSlug === "xc_skiing");
  assert(xc?.requiredCoverage.eccentricDecelMain === false);
  assert(xc?.preferCategories.length > 0);

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
