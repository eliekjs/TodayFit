/**
 * Proof-oriented tests: canonical sportDefinitions → mapper → runtime behavior.
 * Run: npx tsx --test logic/workoutGeneration/sportProfileCanonicalization.verification.test.ts
 */

import assert from "node:assert/strict";
import test from "node:test";
import { EXERCISES } from "../../data/exercisesMerged";
import { getSportDefinition } from "../../data/sportSubFocus";
import type { SportDefinition } from "../../data/sportSubFocus/types";
import { exerciseDefinitionToGeneratorExercise } from "../../lib/dailyGeneratorAdapter";
import { BLOCKED_EXERCISE_IDS } from "../../lib/workoutRules";
import { generateWorkoutSession } from "./dailyGenerator";
import {
  applyConditioningDurationScaleToBlocks,
  buildNormalizedSportProfile,
  buildSportProfileMappingDebug,
  clearSportProfileEngineCache,
  computeSportProfileScoreComponents,
  loadSportProfileForSession,
} from "./sportProfileEngine";
import {
  mapSportDefinitionToNormalizedProfile,
  type MapSportDefinitionResult,
} from "./mapSportDefinitionToNormalizedProfile";
import type { NormalizedSportProfile } from "./sportProfileTypes";
import type { GenerateWorkoutInput, WorkoutBlock } from "./types";
import type { Exercise } from "./types";

function catalogPool(): Exercise[] {
  return EXERCISES.filter((d) => !BLOCKED_EXERCISE_IDS.has(d.id)).map(exerciseDefinitionToGeneratorExercise);
}

function baseInput(overrides: Partial<GenerateWorkoutInput> = {}): GenerateWorkoutInput {
  return {
    duration_minutes: 45,
    primary_goal: "strength",
    focus_body_parts: ["lower"],
    energy_level: "medium",
    available_equipment: [
      "barbell",
      "dumbbells",
      "kettlebells",
      "bench",
      "squat_rack",
      "bodyweight",
      "treadmill",
      "stair_climber",
      "assault_bike",
      "rowing_machine",
      "cable_machine",
      "pullup_bar",
    ],
    injuries_or_constraints: [],
    seed: 424242,
    sport_weight: 0.55,
    ...overrides,
  };
}

// --- A. Canonical mapping (from real getSportDefinition) ---

test("A: rock_climbing canonical definition maps to expected operational profile", () => {
  const def = getSportDefinition("rock_climbing");
  assert.ok(def?.engine);
  const r = mapSportDefinitionToNormalizedProfile(def!);
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.deepEqual(r.profile.topPatterns, def!.engine!.topPatterns);
  assert.ok(r.profile.hardBanPredicates.length >= 1);
  assert.ok(r.profile.softBanPredicates.length >= 1);
  assert.ok(r.profile.requiredTagBoosts.some((b) => b.tag === "vertical_pull"));
  assert.equal(r.profile.energySystemBias.conditioningMinutesScale, 0.88);
  assert.equal(r.profile.structureBias.strength, 0.62);
  assert.ok(Array.isArray(r.defaultsApplied));

  const dbg = buildSportProfileMappingDebug("rock_climbing", r.profile, r);
  assert.equal(dbg.canonical_profile_loaded, true);
  assert.equal(dbg.canonical_sport_definition_slug, "rock_climbing");
  assert.ok(dbg.canonical_fields_used.includes("movementPatterns"));
  assert.ok(dbg.normalized_profile_summary);
  assert.deepEqual(dbg.normalized_profile_summary!.top_patterns, ["pull", "rotate"]);
});

test("A: alpine_skiing maps boosts and conditioning scale from canonical engine", () => {
  const def = getSportDefinition("alpine_skiing");
  const r = mapSportDefinitionToNormalizedProfile(def!);
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.profile.energySystemBias.conditioningMinutesScale, 1.12);
  assert.ok(r.profile.requiredTagBoosts.some((t) => t.tag === "eccentric_strength"));
  assert.ok(r.profile.scoringPenaltyKeys.includes("alpine_upper_hypertrophy_mismatch_penalty"));
});

// --- B. Runtime dependency: mutating definition object changes derived behavior ---

test("B: changing canonical conditioningMinutesScale changes conditioning block scaling", () => {
  const def = structuredClone(getSportDefinition("rock_climbing")!) as SportDefinition;
  assert.ok(def.engine);
  const base = mapSportDefinitionToNormalizedProfile(def);
  assert.equal(base.ok, true);
  if (!base.ok) return;

  def.engine!.energySystemBias.conditioningMinutesScale = 2.5;
  const bumped = mapSportDefinitionToNormalizedProfile(def);
  assert.equal(bumped.ok, true);
  if (!bumped.ok) return;

  const blocks: WorkoutBlock[] = [
    {
      block_type: "conditioning",
      format: "straight_sets",
      title: "Conditioning",
      items: [{ exercise_id: "x", exercise_name: "Run", sets: 1, time_seconds: 600, rest_seconds: 60 }],
      estimated_minutes: 20,
    },
  ];
  const scaledBase = applyConditioningDurationScaleToBlocks(blocks, base.profile);
  const scaledBumped = applyConditioningDurationScaleToBlocks(blocks, bumped.profile);
  assert.notEqual(
    scaledBase[0]!.estimated_minutes,
    scaledBumped[0]!.estimated_minutes,
    "conditioning block minutes should follow canonical conditioningMinutesScale"
  );
});

test("B: changing topPatterns in a clone changes movement-pattern scoring", () => {
  const def = structuredClone(getSportDefinition("rock_climbing")!) as SportDefinition;
  assert.ok(def.engine);
  const base = mapSportDefinitionToNormalizedProfile(def);
  assert.equal(base.ok, true);
  if (!base.ok) return;

  def.engine!.topPatterns = ["squat", "hinge"];
  def.engine!.movementPatterns = [
    { slug: "squat", rank: 1, weight: 1 },
    { slug: "hinge", rank: 2, weight: 0.9 },
    { slug: "push", rank: 3, weight: 0.7 },
    { slug: "pull", rank: 4, weight: 0.5 },
    { slug: "carry", rank: 5, weight: 0.4 },
  ];
  const alt = mapSportDefinitionToNormalizedProfile(def);
  assert.equal(alt.ok, true);
  if (!alt.ok) return;

  const pullEx = {
    id: "pull_test",
    name: "Pull",
    movement_pattern: "pull" as const,
    modality: "strength" as const,
    muscle_groups: ["lats"],
    equipment_required: ["pullup_bar"],
    difficulty: 3,
    time_cost: "medium" as const,
    tags: { goal_tags: ["strength"] as ("strength")[] },
  } as Exercise;

  const s0 = computeSportProfileScoreComponents(pullEx, base.profile, "main_strength");
  const s1 = computeSportProfileScoreComponents(pullEx, alt.profile, "main_strength");
  assert.ok(s1.movement_pattern_match < s0.movement_pattern_match, "de-prioritized pull when topPatterns no longer favor pull");
});

// --- C. No silent fallback when engine missing or mapping fails ---

test("C: surfing load skips — no profile applied", () => {
  const input = baseInput({ sport_slugs: ["surfing"] });
  const load = loadSportProfileForSession(input);
  assert.equal(load.status, "skipped");
});

test("C: mapping failure debug shows canonical_profile_loaded false", () => {
  const bad: MapSportDefinitionResult = { ok: false, errors: ["engine.movementPatterns must be non-empty (slug: x)"] };
  const dbg = buildSportProfileMappingDebug("x", {} as NormalizedSportProfile, bad);
  assert.equal(dbg.canonical_profile_loaded, false);
  assert.equal(dbg.fallback_used, true);
  assert.ok(dbg.fallback_reason?.includes("engine.movementPatterns"));
  assert.equal(dbg.normalized_profile_summary, null);
});

test("C: mapSportDefinitionToNormalizedProfile fails closed on empty topPatterns", () => {
  const def = structuredClone(getSportDefinition("rock_climbing")!) as SportDefinition;
  def.engine!.topPatterns = [];
  const r = mapSportDefinitionToNormalizedProfile(def);
  assert.equal(r.ok, false);
  if (r.ok) return;
  assert.ok(r.errors.some((e) => e.includes("topPatterns")));
});

// --- D. New sport: hyrox session exposes canonical debug vs baseline ---

test("D: hyrox workout includes canonical_profile_loaded; baseline without sport does not", () => {
  clearSportProfileEngineCache();
  const pool = catalogPool();
  assert.ok(pool.length > 400, "catalog large enough for sport pool gate");

  const baseline = generateWorkoutSession(baseInput({ sport_slugs: undefined }), pool);
  assert.equal(baseline.debug?.sport_profile_applied, undefined);
  assert.equal(baseline.debug?.sport_profile_canonical_mapping_failed, undefined);

  const hyrox = generateWorkoutSession(baseInput({ sport_slugs: ["hyrox"] }), pool);
  const spa = hyrox.debug?.sport_profile_applied;
  assert.ok(spa, "hyrox should emit sport_profile_applied");
  assert.equal(spa!.canonical_profile_loaded, true);
  assert.equal(spa!.canonical_sport_definition_slug, "hyrox");
  assert.equal(spa!.fallback_used, spa!.mapping?.fallback_used);
  assert.ok(spa!.normalized_profile_summary || spa!.mapping?.normalized_profile_summary);
  const top = spa!.normalized_profile_summary?.top_patterns ?? spa!.mapping?.normalized_profile_summary?.top_patterns;
  assert.deepEqual(top, ["carry", "squat"]);
});

// --- E. Regression gold (aligned to sportDefinitions.ts engine) ---

test("E: rock_climbing golden operational fields", () => {
  clearSportProfileEngineCache();
  const input = baseInput({ sport_slugs: ["rock_climbing"] });
  const p = buildNormalizedSportProfile(input);
  assert.ok(p);
  assert.deepEqual(p!.topPatterns, ["pull", "rotate"]);
  assert.deepEqual(p!.secondaryPatterns, ["push", "carry"]);
  assert.ok(p!.hardBanPredicates.length === 1);
  assert.ok(p!.softBanPredicates.length === 1);
  const boostTags = new Set(p!.requiredTagBoosts.map((x) => x.tag));
  for (const t of ["vertical_pull", "finger_strength", "grip_endurance", "scapular_control"]) {
    assert.ok(boostTags.has(t), `expected boost ${t}`);
  }
  assert.equal(p!.energySystemBias.conditioningMinutesScale, 0.88);
});

test("E: alpine_skiing golden operational fields", () => {
  clearSportProfileEngineCache();
  const input = baseInput({ sport_slugs: ["alpine_skiing"] });
  const p = buildNormalizedSportProfile(input);
  assert.ok(p);
  assert.deepEqual(p!.topPatterns, ["squat", "rotate"]);
  assert.equal(p!.softBanPredicates.length, 1);
  assert.ok(p!.scoringPenaltyKeys.includes("alpine_upper_hypertrophy_mismatch_penalty"));
  assert.equal(p!.energySystemBias.conditioningMinutesScale, 1.12);
});

test("loadSportProfileForSession applied matches mapSportDefinitionToNormalizedProfile", () => {
  clearSportProfileEngineCache();
  const input = baseInput({ sport_slugs: ["trail_running"] });
  const load = loadSportProfileForSession(input);
  assert.equal(load.status, "applied");
  if (load.status !== "applied") return;
  const direct = mapSportDefinitionToNormalizedProfile(getSportDefinition("trail_running")!);
  assert.equal(direct.ok, true);
  if (!direct.ok) return;
  assert.deepEqual(load.profile.topPatterns, direct.profile.topPatterns);
  assert.equal(
    load.profile.energySystemBias.conditioningMinutesScale,
    direct.profile.energySystemBias.conditioningMinutesScale
  );
});
