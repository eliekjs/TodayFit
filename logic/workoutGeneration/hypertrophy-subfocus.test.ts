/**
 * Hypertrophy sub-focus tests (Build Muscle / muscle goal).
 *
 * Run with:
 *   npx tsx logic/workoutGeneration/hypertrophy-subfocus.test.ts
 */

import { generateWorkoutSession, scoreExercise } from "./dailyGenerator";
import type { GenerateWorkoutInput } from "./types";
import { STUB_EXERCISES } from "./exerciseStub";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function byId() {
  return new Map(STUB_EXERCISES.map((e) => [e.id, e]));
}

function countMainHypertrophyMatches(
  session: ReturnType<typeof generateWorkoutSession>,
  matcher: (exercise: (typeof STUB_EXERCISES)[number]) => boolean
) {
  const idTo = byId();
  const main = session.blocks.find((b) => b.block_type === "main_hypertrophy");
  assert(main != null, "session has main_hypertrophy block");
  assert(main!.items.length > 0, "main_hypertrophy has items");

  let matches = 0;
  for (const item of main!.items) {
    const ex = idTo.get(item.exercise_id);
    assert(ex != null, `exercise exists in stub: ${item.exercise_id}`);
    if (matcher(ex)) matches++;
  }
  return { mainItemCount: main!.items.length, matches };
}

function slugMatch(exercise: (typeof STUB_EXERCISES)[number], slug: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "_");
  const matchSetBySlug: Record<string, string[]> = {
    glutes: ["glutes", "hamstrings", "legs", "posterior_chain"],
    back: ["back", "lats", "upper_back", "pull"],
    chest: ["chest", "pecs", "push"],
    arms: ["biceps", "triceps"],
    shoulders: ["shoulders", "push"],
    legs: ["legs", "quads", "glutes", "hamstrings", "calves"],
    core: ["core", "core_stability"],
    balanced: [],
  };

  if (slug === "balanced") return false;
  const targets = new Set((matchSetBySlug[slug] ?? [slug]).map(norm));
  const muscleSet = new Set((exercise.muscle_groups ?? []).map(norm));
  const attrSet = new Set((exercise.tags?.attribute_tags ?? []).map(norm));
  const fatigueSet = new Set((exercise.fatigue_regions ?? []).map(norm));
  const pairing = norm(exercise.pairing_category ?? "");

  for (const t of targets) {
    if (muscleSet.has(t) || attrSet.has(t) || fatigueSet.has(t) || pairing === t) return true;
  }
  return false;
}

function testDirectHypertrophySubFocusScoring() {
  const hipThrust = STUB_EXERCISES.find((e) => e.id === "hip_thrust");
  const latPulldown = STUB_EXERCISES.find((e) => e.id === "lat_pulldown");
  const benchPress = STUB_EXERCISES.find((e) => e.id === "bench_press_barbell");

  assert(hipThrust && latPulldown && benchPress, "stub has required exercises");

  const base: Omit<GenerateWorkoutInput, "goal_sub_focus" | "goal_sub_focus_weights"> = {
    duration_minutes: 45,
    primary_goal: "hypertrophy",
    energy_level: "medium",
    available_equipment: ["barbell", "bench", "dumbbells", "cable_machine", "bodyweight"],
    injuries_or_constraints: [],
    seed: 900,
  };

  const movementCounts = new Map<string, number>();
  const recentIds = new Set<string>();

  const gluteInput: GenerateWorkoutInput = {
    ...base,
    goal_sub_focus: { muscle: ["glutes"] },
    goal_sub_focus_weights: { muscle: [1] },
  };
  const hipScore = scoreExercise(
    hipThrust,
    gluteInput,
    recentIds,
    movementCounts,
    undefined,
    { blockType: "main_hypertrophy" }
  );
  const benchScore = scoreExercise(
    benchPress,
    gluteInput,
    recentIds,
    movementCounts,
    undefined,
    { blockType: "main_hypertrophy" }
  );
  assert(hipScore.score > benchScore.score, "glutes: hip_thrust scores above bench_press_barbell");

  const backInput: GenerateWorkoutInput = {
    ...base,
    goal_sub_focus: { muscle: ["back"] },
    goal_sub_focus_weights: { muscle: [1] },
  };
  const latScore = scoreExercise(
    latPulldown,
    backInput,
    recentIds,
    movementCounts,
    undefined,
    { blockType: "main_hypertrophy" }
  );
  const benchScore2 = scoreExercise(
    benchPress,
    backInput,
    recentIds,
    movementCounts,
    undefined,
    { blockType: "main_hypertrophy" }
  );
  assert(latScore.score > benchScore2.score, "back: lat_pulldown scores above bench_press_barbell");
}

function testMainHypertrophyDominanceAndBalanced() {
  const base: Omit<GenerateWorkoutInput, "goal_sub_focus"> = {
    duration_minutes: 45,
    primary_goal: "hypertrophy",
    energy_level: "medium",
    available_equipment: ["barbell", "bench", "dumbbells", "cable_machine", "bodyweight"],
    injuries_or_constraints: [],
    seed: 901,
  };

  // Glutes → glute/hamstring match should dominate most of the main block.
  const glutesSession = generateWorkoutSession(
    { ...base, goal_sub_focus: { muscle: ["glutes"] } },
    STUB_EXERCISES
  );
  const gluteCounts = countMainHypertrophyMatches(glutesSession, (ex) => slugMatch(ex, "glutes"));
  assert(
    gluteCounts.matches >= Math.ceil(gluteCounts.mainItemCount * 0.65),
    `glutes dominant: expected >= ~65% direct matches (got ${gluteCounts.matches}/${gluteCounts.mainItemCount})`
  );

  // Balanced → should not collapse into a single body area; expect at least some upper-body work.
  const balancedSession = generateWorkoutSession(
    { ...base, seed: 902, goal_sub_focus: { muscle: ["balanced"] } },
    STUB_EXERCISES
  );
  const balancedCounts = countMainHypertrophyMatches(balancedSession, (mg) =>
    // In the stub, upper work is primarily encoded via movement_pattern "push"/"pull".
    mg.movement_pattern === "push" || mg.movement_pattern === "pull"
  );
  assert(
    balancedCounts.matches >= Math.ceil(balancedCounts.mainItemCount * 0.3),
    `balanced: expected at least ~30% upper-body matches (got ${balancedCounts.matches}/${balancedCounts.mainItemCount})`
  );
}

function run() {
  console.log("Hypertrophy sub-focus tests\n");
  testDirectHypertrophySubFocusScoring();
  testMainHypertrophyDominanceAndBalanced();
  console.log("\nAll hypertrophy sub-focus tests passed.");
}

run();

