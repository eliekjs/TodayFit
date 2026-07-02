/**
 * Surfing sport-prep: header and per-exercise labels use selected sport sub-goals only.
 */
import { describe, expect, it } from "vitest";
import { EXERCISES } from "../../data/exercisesMerged";
import { BLOCKED_EXERCISE_IDS } from "../../lib/workoutRules";
import {
  exerciseDefinitionToGeneratorExercise,
  manualPreferencesToGenerateWorkoutInput,
  workoutSessionToGeneratedWorkout,
} from "../../lib/dailyGeneratorAdapter";
import { displayNameForSportSubFocusSlug } from "../../lib/workoutIntentSplit";
import { generateWorkoutSession } from "./dailyGenerator";
import type { ManualPreferences } from "../../lib/types";
import type { GymProfile } from "../../data/gymProfiles";

// Cast: includes test-only "rowing_machine" (not a canonical EquipmentKey).
const GYM = {
  id: "test_gym",
  name: "Test Gym",
  equipment: [
    "bodyweight",
    "dumbbells",
    "barbell",
    "bench",
    "cable_machine",
    "squat_rack",
    "kettlebells",
    "pullup_bar",
    "rowing_machine",
  ],
} as GymProfile;

const SPORT_ONLY_PREFS: ManualPreferences = {
  primaryFocus: ["Sport preparation"],
  targetBody: "Full",
  targetModifier: [],
  durationMinutes: 45,
  energyLevel: "medium",
  injuries: [],
  upcoming: [],
  subFocusByGoal: {},
  workoutStyle: [],
  workoutTier: "intermediate",
};

const pool = EXERCISES.filter((d) => !BLOCKED_EXERCISE_IDS.has(d.id)).map(
  exerciseDefinitionToGeneratorExercise
);

const SURF_SUBS = ["shoulder_stability", "pop_up_power", "paddle_endurance"] as const;

describe("surfing sport sub-focus display", () => {
  it("generates sport-primary session with sub-goal intent on dedicated blocks and items", () => {
    const input = manualPreferencesToGenerateWorkoutInput(
      SPORT_ONLY_PREFS,
      GYM,
      "surf-sub-focus-display",
      undefined,
      {
        sport_slugs: ["surfing"],
        sport_sub_focus: { surfing: [...SURF_SUBS] },
        sport_weight: 1,
      }
    );

    expect(input.sport_weight).toBe(1);

    const session = generateWorkoutSession(input, pool);
    const workout = workoutSessionToGeneratedWorkout(session, SPORT_ONLY_PREFS, "w_surf", input);

    expect(workout.intentSplit?.every((e) => e.kind === "sport_sub_focus")).toBe(true);
    expect(workout.intentSplit?.some((e) => e.label.includes("Strength"))).toBe(false);

    const workingBlocks = session.blocks.filter(
      (b) => b.block_type !== "warmup" && b.block_type !== "cooldown"
    );
    const dedicated = workingBlocks.filter((b) => b.goal_intent?.intent_kind === "sport_sub_focus");
    expect(dedicated.length).toBeGreaterThan(0);

    for (const block of dedicated) {
      const sub = block.goal_intent!.sub_focus_slug!;
      expect(SURF_SUBS).toContain(sub);
      for (const item of block.items) {
        const labels =
          item.session_intent_links?.matched_intents
            ?.filter((m) => m.kind === "sport_sub_focus")
            .map((m) => displayNameForSportSubFocusSlug(m.parent_slug ?? "surfing", m.slug)) ?? [];
        expect(labels.some((l) => l.length > 0)).toBe(true);
        expect(labels.some((l) => l.toLowerCase() === "strength")).toBe(false);
      }
    }
  });
});
