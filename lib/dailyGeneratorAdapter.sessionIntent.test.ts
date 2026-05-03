import assert from "node:assert/strict";
import { manualPreferencesToGenerateWorkoutInput } from "./dailyGeneratorAdapter";
import type { ManualPreferences } from "./types";

const BASE_PREFS: ManualPreferences = {
  primaryFocus: ["Build Strength", "Build Muscle"],
  subFocusByGoal: {
    "Build Strength": ["Squat"],
    "Build Muscle": ["Glutes"],
  },
  targetBody: "Lower",
  targetModifier: [],
  durationMinutes: 45,
  energyLevel: "medium",
  injuries: ["No restrictions"],
  upcoming: [],
  workoutStyle: [],
  goalMatchPrimaryPct: 60,
  goalMatchSecondaryPct: 40,
  goalMatchTertiaryPct: 0,
  workoutTier: "advanced",
};

function run() {
  const input = manualPreferencesToGenerateWorkoutInput(
    BASE_PREFS,
    { id: "g1", name: "Test Gym", equipment: ["bodyweight", "dumbbells"] },
    123,
    undefined,
    {
      sport_slugs: ["trail_running"],
      sport_sub_focus: { trail_running: ["uphill_endurance", "ankle_stability"] },
      sport_weight: 0.55,
    }
  );

  assert.ok(input.session_intent != null, "session_intent should exist");
  assert.ok(
    Array.isArray(input.session_intent?.selected_goals) &&
      input.session_intent!.selected_goals[0] === "strength",
    "session_intent.selected_goals should preserve primary goal directly"
  );
  assert.ok(
    (input.session_intent?.selected_goals?.length ?? 0) >= 2,
    "session_intent.selected_goals should carry secondary intent"
  );
  assert.deepEqual(
    input.session_intent?.selected_sports,
    ["trail_running"],
    "session_intent.selected_sports should carry selected sports directly"
  );
  assert.equal(
    input.session_intent?.user_level,
    "advanced",
    "session_intent.user_level should carry level directly"
  );
  assert.ok(
    (input.session_intent?.sport_sub_focus_by_sport?.trail_running ?? []).includes("uphill_endurance"),
    "session_intent sport sub-focus should carry direct sport intent"
  );
  assert.ok(
    Array.isArray(input.session_intent?.focus_body_parts) && input.session_intent!.focus_body_parts!.length > 0,
    "session_intent focus_body_parts should be present"
  );

  console.log("dailyGeneratorAdapter.sessionIntent.test.ts: all passed");
}

run();
