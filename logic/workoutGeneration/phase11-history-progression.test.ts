/**
 * Phase 11: History-aware progression, regression, rotation tests.
 * Run with: npx tsx logic/workoutGeneration/phase11-history-progression.test.ts
 */

import type { Exercise } from "./types";
import type { TrainingHistoryContext } from "./historyTypes";
import {
  buildHistoryContextFromLegacy,
  recentHistoryToRecentIds,
} from "./historyTypes";
import {
  scoreRecentExposurePenalty,
  scoreAnchorRepeatBonus,
  scoreAccessoryRotationPenalty,
  getExerciseExposureCount,
  computeHistoryScoreComponents,
  getEffectiveRecentIds,
} from "./historyScoring";
import { getRecommendation } from "./recommendationLayer";
import { applyRecommendationToPrescription } from "./prescriptionHistory";
import { getExerciseRelations, pickRegressionInPool } from "./exerciseRelations";
import { generateWorkoutSession } from "./dailyGenerator";
import { STUB_EXERCISES } from "./exerciseStub";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

// --- History contract ---
function testRecentHistoryToRecentIds() {
  const history = [
    { exercise_ids: ["a", "b"], muscle_groups: [], modality: "strength" },
    { exercise_ids: ["b", "c"], muscle_groups: [], modality: "hypertrophy" },
  ];
  const ids = recentHistoryToRecentIds(history);
  assert(ids.length >= 2 && ids.includes("a") && ids.includes("b"), "recent ids from history");
}

function testBuildHistoryContextFromLegacy() {
  const input = {
    recent_history: [
      { exercise_ids: ["squat", "bench"], muscle_groups: ["legs", "chest"], modality: "strength" },
    ],
  };
  const ctx = buildHistoryContextFromLegacy(input);
  assert(ctx != null && (ctx.recent_sessions?.length ?? 0) === 1, "context from legacy");
  assert((ctx!.recently_used_exercise_ids?.length ?? 0) >= 1, "recently_used populated");
}

function testGetEffectiveRecentIds() {
  const legacy = new Set(["a", "b"]);
  const fromContext = getEffectiveRecentIds(legacy, { recently_used_exercise_ids: ["x", "y"] });
  assert(fromContext.has("x") && fromContext.has("y"), "prefer context recent ids");
  const fromLegacy = getEffectiveRecentIds(legacy, undefined);
  assert(fromLegacy.has("a") && fromLegacy.has("b"), "fallback to legacy");
}

// --- Recent exact repeat penalty ---
function testRecentExposurePenalty() {
  const recentIds = new Set(["bench", "squat"]);
  const penaltyRecent = scoreRecentExposurePenalty("bench", recentIds, { preferVariety: true });
  const penaltyFresh = scoreRecentExposurePenalty("row", recentIds);
  assert(penaltyRecent.score < 0, "penalty for recently used");
  assert(penaltyFresh.score === 0, "no penalty for fresh exercise");
}

// --- Anchor repeat allowed when progression appropriate ---
const ANCHOR_EXERCISE: Exercise = {
  id: "bench",
  name: "Bench Press",
  movement_pattern: "push",
  muscle_groups: ["chest", "triceps"],
  modality: "strength",
  equipment_required: ["barbell"],
  difficulty: 2,
  time_cost: "medium",
  tags: { goal_tags: ["strength"] },
  primary_movement_family: "upper_push",
  exercise_role: "main_compound",
} as Exercise;

function testAnchorRepeatBonus() {
  const bonus = scoreAnchorRepeatBonus(ANCHOR_EXERCISE, 1, "main_strength", true);
  assert(bonus.score > 0, "anchor repeat bonus when exposure 1 and completion success");
  const noBonus = scoreAnchorRepeatBonus(ANCHOR_EXERCISE, 0, "main_strength");
  assert(noBonus.score === 0, "no bonus when exposure 0");
  const noBonusPoor = scoreAnchorRepeatBonus(ANCHOR_EXERCISE, 1, "main_strength", false);
  assert(noBonusPoor.score === 0, "no bonus when last completion poor");
}

// --- Accessory rotation after high recent exposure ---
const ACCESSORY_EXERCISE: Exercise = {
  id: "tricep_pushdown",
  name: "Tricep Pushdown",
  movement_pattern: "push",
  muscle_groups: ["triceps"],
  modality: "strength",
  equipment_required: ["cable_machine"],
  difficulty: 1,
  time_cost: "low",
  tags: { goal_tags: ["hypertrophy"] },
  exercise_role: "accessory",
} as Exercise;

function testAccessoryRotationPenalty() {
  const penalty = scoreAccessoryRotationPenalty(ACCESSORY_EXERCISE, 5, "main_strength", 3);
  assert(penalty.score < 0, "penalty for overused accessory");
  const noPenalty = scoreAccessoryRotationPenalty(ACCESSORY_EXERCISE, 1, "main_strength", 3);
  assert(noPenalty.score === 0, "no penalty when under threshold");
}

// --- Regress recommendation after poor completion / high stress ---
function testRegressRecommendation() {
  const rec = getRecommendation(ANCHOR_EXERCISE, "main_strength", undefined, {
    lastCompletionSuccess: false,
  });
  assert(rec.recommendation === "regress", "regress when last completion poor");
  const recLighter = getRecommendation(ANCHOR_EXERCISE, "main_strength", undefined, {
    preferLighter: true,
  });
  assert(recLighter.recommendation === "regress", "regress when prefer lighter");
}

// --- Rotate recommendation for overused accessory ---
function testRotateRecommendation() {
  const ctx: TrainingHistoryContext = {
    exposure: { by_exercise: { [ACCESSORY_EXERCISE.id]: 5 } },
  };
  const rec = getRecommendation(ACCESSORY_EXERCISE, "main_hypertrophy", ctx, {
    wasRecentlyUsed: true,
  });
  assert(rec.recommendation === "rotate" || rec.recommendation === "maintain", "rotate or maintain for overused accessory");
}

// --- Prescription influence ---
function testPrescriptionInfluence() {
  const base = { sets: 3, reps: 8, rest_seconds: 90, coaching_cues: "Control." };
  const progress = applyRecommendationToPrescription(base, "progress");
  assert(progress.sets >= base.sets || (progress.reps ?? 0) >= (base.reps ?? 0), "progress increases modestly");
  const regress = applyRecommendationToPrescription(base, "regress");
  assert(regress.sets <= base.sets || (regress.reps ?? 0) <= (base.reps ?? 0) || regress.rest_seconds >= base.rest_seconds, "regress reduces or more rest");
  const maintain = applyRecommendationToPrescription(base, "maintain");
  assert(maintain.sets === base.sets && maintain.reps === base.reps, "maintain unchanged");
}

// --- Exercise relations ---
function testExerciseRelations() {
  const ex = { ...ANCHOR_EXERCISE, progressions: ["weighted_bench"], regressions: ["push_up"] };
  const rel = getExerciseRelations(ex);
  assert(rel.progressions.includes("weighted_bench") && rel.regressions.includes("push_up"), "relations from exercise");
  const pool = [ex, { ...ex, id: "push_up", name: "Push-up" }] as Exercise[];
  const reg = pickRegressionInPool(ex, pool);
  assert(reg?.id === "push_up", "pick regression in pool");
}

// --- No-history fallback preserves behavior ---
function testNoHistoryFallback() {
  const input = {
    duration_minutes: 45 as const,
    primary_goal: "strength" as const,
    focus_body_parts: ["upper_push" as const],
    available_equipment: ["barbell", "dumbbells", "bench"],
    injuries_or_constraints: [],
    energy_level: "medium" as const,
    seed: 42,
  };
  const session = generateWorkoutSession(input, STUB_EXERCISES);
  assert(session.blocks.length >= 1, "session has blocks without history");
  assert(session.estimated_duration_minutes > 0, "duration set");
  const withHistory = generateWorkoutSession(
    { ...input, recent_history: [{ exercise_ids: ["goblet_squat"], muscle_groups: ["legs"], modality: "strength" }] },
    STUB_EXERCISES
  );
  assert(withHistory.blocks.length >= 1, "session with legacy history still builds");
}

// --- Compute history score components ---
function testComputeHistoryScoreComponents() {
  const recentIds = new Set(["bench"]);
  const { total, breakdown } = computeHistoryScoreComponents(ANCHOR_EXERCISE, {
    recentIds,
    blockType: "main_strength",
    historyContext: undefined,
  });
  assert(typeof total === "number", "history components return number");
  assert(breakdown.recent_exposure_penalty != null || total === 0, "breakdown or zero when no context");
}

function runTests() {
  console.log("Phase 11: History-aware progression tests\n");

  testRecentHistoryToRecentIds();
  console.log("  OK: recentHistoryToRecentIds");

  testBuildHistoryContextFromLegacy();
  console.log("  OK: buildHistoryContextFromLegacy");

  testGetEffectiveRecentIds();
  console.log("  OK: getEffectiveRecentIds");

  testRecentExposurePenalty();
  console.log("  OK: recent exact exercise repeat penalty");

  testAnchorRepeatBonus();
  console.log("  OK: anchor repeat allowed when progression appropriate");

  testAccessoryRotationPenalty();
  console.log("  OK: accessory rotation after high exposure");

  testRegressRecommendation();
  console.log("  OK: regress recommendation after poor completion / prefer lighter");

  testRotateRecommendation();
  console.log("  OK: rotate for overused accessory");

  testPrescriptionInfluence();
  console.log("  OK: prescription influence progress/maintain/regress");

  testExerciseRelations();
  console.log("  OK: exercise relations helper");

  testNoHistoryFallback();
  console.log("  OK: no-history fallback preserves behavior");

  testComputeHistoryScoreComponents();
  console.log("  OK: computeHistoryScoreComponents");

  console.log("\nAll Phase 11 tests passed.");
}

runTests();
