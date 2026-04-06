/**
 * Sport profile engine: pool gate + scoring (driven by canonical sportDefinitions.engine).
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
  buildNormalizedSportProfile,
  clearSportProfileEngineCache,
  computeSportProfileScoreComponents,
  exercisePassesSportProfileHardGate,
  getSportAdjustedExercisePool,
  getSportSlugsWithProfileEngine,
  mapSportDefinitionForSlug,
  sportProfileBiasedTowardConditioning,
  sportProfileConditioningPickScore,
} from "./sportProfileEngine";
import { exerciseIsHeavyLowerOnlySquatHinge } from "./sportProfileBanPredicates";
import type { Exercise, GenerateWorkoutInput } from "./types";

test("beforeAll: clear profile cache", () => {
  clearSportProfileEngineCache();
});

function ex(partial: Partial<Exercise> & Pick<Exercise, "id" | "name" | "movement_pattern">): Exercise {
  return {
    modality: "strength",
    muscle_groups: ["legs"],
    equipment_required: ["barbell"],
    difficulty: 3,
    time_cost: "medium",
    tags: {},
    progressions: [],
    regressions: [],
    ...partial,
  } as Exercise;
}

const climbingInput: GenerateWorkoutInput = {
  duration_minutes: 45,
  primary_goal: "strength",
  energy_level: "medium",
  available_equipment: ["barbell", "dumbbells", "pullup_bar", "bench", "plates", "squat_rack"],
  injuries_or_constraints: [],
  sport_slugs: ["rock_climbing"],
};

test("mapSportDefinitionForSlug rock_climbing ok", () => {
  const m = mapSportDefinitionForSlug("rock_climbing");
  assert.equal(m.ok, true);
});

test("getSportSlugsWithProfileEngine lists canonical engine sports", () => {
  const slugs = new Set(getSportSlugsWithProfileEngine());
  for (const s of [
    "rock_climbing",
    "alpine_skiing",
    "backcountry_skiing",
    "hiking_backpacking",
    "road_running",
    "trail_running",
    "hyrox",
  ]) {
    assert.ok(slugs.has(s), `missing ${s}`);
  }
});

test("buildNormalizedSportProfile for rock_climbing", () => {
  const p = buildNormalizedSportProfile(climbingInput);
  assert.ok(p);
  assert.equal(p!.sportSlug, "rock_climbing");
  assert.ok(p!.topPatterns.includes("pull"));
});

test("leg press family hard-banned for climbing profile", () => {
  const p = buildNormalizedSportProfile(climbingInput)!;
  const legPress = ex({
    id: "leg_press_machine",
    name: "Leg Press",
    movement_pattern: "squat",
    equipment_required: ["leg_press"],
    muscle_groups: ["legs"],
    tags: { goal_tags: ["strength"] },
  });
  assert.equal(exercisePassesSportProfileHardGate(legPress, p, 0), false);
  assert.equal(exercisePassesSportProfileHardGate(legPress, p, 3), false);
});

test("pull-up passes climbing domain gate", () => {
  const p = buildNormalizedSportProfile(climbingInput)!;
  const pullup = ex({
    id: "pull_up",
    name: "Pull-Up",
    movement_pattern: "pull",
    muscle_groups: ["pull"],
    equipment_required: ["pullup_bar"],
    tags: { goal_tags: ["strength"], attribute_tags: ["vertical_pull"] },
  });
  assert.equal(exercisePassesSportProfileHardGate(pullup, p, 0), true);
});

test("heavy lower-only back squat excluded at relax 0 for climbing", () => {
  const p = buildNormalizedSportProfile(climbingInput)!;
  const squat = ex({
    id: "back_squat",
    name: "Back Squat",
    movement_pattern: "squat",
    muscle_groups: ["legs"],
    tags: { goal_tags: ["hypertrophy"] },
  });
  assert.equal(exerciseIsHeavyLowerOnlySquatHinge(squat), true);
  assert.equal(exercisePassesSportProfileHardGate(squat, p, 0), false);
  assert.equal(exercisePassesSportProfileHardGate(squat, p, 1), true);
});

test("getSportAdjustedExercisePool relaxes when pool would be tiny", () => {
  const p = buildNormalizedSportProfile(climbingInput)!;
  const pool: Exercise[] = [
    ex({
      id: "back_squat",
      name: "Back Squat",
      movement_pattern: "squat",
      muscle_groups: ["legs"],
      tags: { goal_tags: ["strength"] },
    }),
    ex({
      id: "pull_up",
      name: "Pull-Up",
      movement_pattern: "pull",
      muscle_groups: ["pull"],
      equipment_required: ["pullup_bar"],
      tags: { attribute_tags: ["vertical_pull"] },
    }),
  ];
  const { pool: out, relaxLevel } = getSportAdjustedExercisePool(pool, p, 0);
  assert.ok(out.length >= 1);
  assert.ok(relaxLevel >= 0);
});

test("computeSportProfileScoreComponents boosts pull for climbing", () => {
  const p = buildNormalizedSportProfile(climbingInput)!;
  const pullup = ex({
    id: "pull_up",
    name: "Pull-Up",
    movement_pattern: "pull",
    muscle_groups: ["pull"],
    equipment_required: ["pullup_bar"],
    tags: { attribute_tags: ["vertical_pull", "pulling_strength"] },
  });
  const s = computeSportProfileScoreComponents(pullup, p, "main_strength");
  assert.ok(s.movement_pattern_match > 0);
  assert.ok(s.sport_specificity > 0);
});

test("alpine profile penalizes upper-only hypertrophy bench", () => {
  const input: GenerateWorkoutInput = {
    ...climbingInput,
    sport_slugs: ["alpine_skiing"],
  };
  const p = buildNormalizedSportProfile(input)!;
  const bench = ex({
    id: "bench_press_barbell",
    name: "Bench Press",
    movement_pattern: "push",
    modality: "hypertrophy",
    muscle_groups: ["chest", "triceps"],
    tags: { goal_tags: ["hypertrophy"] },
  });
  assert.equal(exercisePassesSportProfileHardGate(bench, p, 0), false);
  const s = computeSportProfileScoreComponents(bench, p, "main_strength");
  assert.ok(s.penalty < 0);
});

test("hyrox profile enables and differs from climbing (top patterns)", () => {
  const hyroxIn: GenerateWorkoutInput = { ...climbingInput, sport_slugs: ["hyrox"] };
  const h = buildNormalizedSportProfile(hyroxIn);
  assert.ok(h);
  assert.equal(h!.topPatterns[0], "carry");
  const climb = buildNormalizedSportProfile(climbingInput)!;
  assert.notDeepEqual(h!.topPatterns, climb.topPatterns);
});

test("sportProfileBiasedTowardConditioning matches emphasis and shares", () => {
  const road = buildNormalizedSportProfile({ ...climbingInput, sport_slugs: ["road_running"] })!;
  assert.equal(sportProfileBiasedTowardConditioning(road), true);
  const alpine = buildNormalizedSportProfile({ ...climbingInput, sport_slugs: ["alpine_skiing"] })!;
  assert.equal(sportProfileBiasedTowardConditioning(alpine), false);
});

test("sportProfileConditioningPickScore orders exercises by tag fit", () => {
  const p = buildNormalizedSportProfile({ ...climbingInput, sport_slugs: ["alpine_skiing"] })!;
  const good = ex({
    id: "split_squat_eccentric",
    name: "Split Squat",
    movement_pattern: "squat",
    muscle_groups: ["legs"],
    tags: { attribute_tags: ["eccentric_strength", "single_leg_strength"] },
  });
  const weak = ex({
    id: "bench_press",
    name: "Bench",
    movement_pattern: "push",
    muscle_groups: ["chest"],
    tags: { goal_tags: ["strength"] },
  });
  assert.ok(sportProfileConditioningPickScore(good, p) > sportProfileConditioningPickScore(weak, p));
});
