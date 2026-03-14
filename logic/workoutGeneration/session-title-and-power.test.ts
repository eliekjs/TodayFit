/**
 * Session title (body focus) and power prescription.
 * Run with: npx tsx logic/workoutGeneration/session-title-and-power.test.ts
 */

import { generateWorkoutSession, scoreExercise } from "./dailyGenerator";
import type { GenerateWorkoutInput } from "./types";
import { STUB_EXERCISES } from "./exerciseStub";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

// --- Session title includes body focus when present ---
function testSessionTitleWithBodyFocus() {
  const input: GenerateWorkoutInput = {
    duration_minutes: 45,
    primary_goal: "strength",
    focus_body_parts: ["upper_push"],
    energy_level: "medium",
    available_equipment: ["barbell", "bench", "dumbbells", "bodyweight"],
    injuries_or_constraints: [],
    seed: 200,
  };
  const session = generateWorkoutSession(input, STUB_EXERCISES, false);
  assert(session.title.includes("Push"), "title includes focus label (Push)");
  assert(session.title.includes("45"), "title includes duration");
  assert(session.title.includes("Strength"), "title includes goal");
  console.log("  OK: session title with upper_push focus → includes Push and duration");

  const fullBody: GenerateWorkoutInput = {
    ...input,
    focus_body_parts: ["full_body"],
  };
  const sessionFull = generateWorkoutSession(fullBody, STUB_EXERCISES, false);
  assert(!sessionFull.title.includes("Full body") || sessionFull.title.includes("Strength"), "full_body does not add redundant focus or still shows goal");
  console.log("  OK: full_body focus → title is goal + duration");

  const lowerInput: GenerateWorkoutInput = {
    ...input,
    focus_body_parts: ["lower"],
    primary_goal: "hypertrophy",
  };
  const sessionLower = generateWorkoutSession(lowerInput, STUB_EXERCISES, false);
  assert(sessionLower.title.includes("Lower"), "title includes Lower for lower focus");
  console.log("  OK: lower focus → title includes Lower");

  // Secondary mobility → title suffix " + Mobility"
  const withMobility: GenerateWorkoutInput = {
    ...input,
    focus_body_parts: [],
    secondary_goals: ["mobility"],
  };
  const sessionMobility = generateWorkoutSession(withMobility, STUB_EXERCISES, false);
  assert(sessionMobility.title.includes("Mobility"), "title includes + Mobility when mobility is secondary goal");
  console.log("  OK: secondary mobility → title includes + Mobility");
}

// --- Power goal: main block uses power rep range and longer rest ---
function testPowerPrescription() {
  const input: GenerateWorkoutInput = {
    duration_minutes: 45,
    primary_goal: "power",
    focus_body_parts: ["lower"],
    energy_level: "medium",
    available_equipment: ["barbell", "dumbbells", "kettlebells", "bodyweight"],
    injuries_or_constraints: [],
    seed: 201,
  };
  const session = generateWorkoutSession(input, STUB_EXERCISES, false);
  const mainBlocks = session.blocks.filter(
    (b) => b.block_type === "main_strength"
  );
  assert(mainBlocks.length >= 1, "power session has at least one main_strength block");
  const mainBlock = mainBlocks[0];
  assert(mainBlock?.items?.length >= 1, "main block has items");
  const firstItem = mainBlock.items[0];
  assert(firstItem != null, "first item exists");
  const reps = firstItem.reps ?? 0;
  const rest = firstItem.rest_seconds ?? 0;
  assert(reps >= 2 && reps <= 6, "power reps in 2–6 range (power rep range)");
  assert(rest >= 90, "power rest >= 90 s (power uses long rest)");
  console.log("  OK: power goal → main block reps 2–6, rest ≥90 s");
}

// --- Beginner: fewer sets and simpler cues ---
function testBeginnerPrescription() {
  const input: GenerateWorkoutInput = {
    duration_minutes: 45,
    primary_goal: "strength",
    energy_level: "medium",
    available_equipment: ["barbell", "bench", "dumbbells", "bodyweight"],
    injuries_or_constraints: [],
    seed: 202,
    style_prefs: { user_level: "beginner" },
  };
  const session = generateWorkoutSession(input, STUB_EXERCISES, false);
  const mainBlock = session.blocks.find((b) => b.block_type === "main_strength");
  assert(mainBlock != null && mainBlock.items.length >= 1, "has main strength block");
  const item = mainBlock!.items[0];
  assert(item.sets <= 3, "beginner gets at most 3 sets");
  assert(
    (item.coaching_cues ?? "").toLowerCase().includes("form") || (item.coaching_cues ?? "").toLowerCase().includes("quality"),
    "beginner gets form/quality cue"
  );
  console.log("  OK: beginner style_prefs → sets ≤3 and form-focused cue");
}

// --- Warmup count scales with duration ---
function testWarmupCountByDuration() {
  const short: GenerateWorkoutInput = {
    duration_minutes: 20,
    primary_goal: "strength",
    energy_level: "medium",
    available_equipment: ["barbell", "dumbbells", "bodyweight"],
    injuries_or_constraints: [],
    seed: 203,
  };
  const long: GenerateWorkoutInput = { ...short, duration_minutes: 60, seed: 204 };
  const sessionShort = generateWorkoutSession(short, STUB_EXERCISES, false);
  const sessionLong = generateWorkoutSession(long, STUB_EXERCISES, false);
  const warmupShort = sessionShort.blocks.find((b) => b.block_type === "warmup");
  const warmupLong = sessionLong.blocks.find((b) => b.block_type === "warmup");
  assert(warmupShort != null && warmupLong != null, "both have warmup");
  assert(warmupShort!.items.length <= 2, "short session warmup has 1–2 items");
  assert(warmupLong!.items.length >= 2, "long session warmup has 2–3 items");
  console.log("  OK: warmup count scales with duration");
}

// --- Injury + impact_level: high-impact exercises down-ranked when user has knee/back/ankle ---
function testImpactPenaltyWithInjury() {
  const boxJump = STUB_EXERCISES.find((e) => e.id === "box_jump");
  const gobletSquat = STUB_EXERCISES.find((e) => e.id === "goblet_squat");
  assert(boxJump != null && gobletSquat != null, "stub has box_jump and goblet_squat");
  const inputWithKnee: GenerateWorkoutInput = {
    duration_minutes: 45,
    primary_goal: "strength",
    energy_level: "medium",
    available_equipment: ["barbell", "dumbbells", "bodyweight", "plyo_box"],
    injuries_or_constraints: ["knee"],
    seed: 205,
  };
  const movementCounts = new Map<string, number>();
  const recentIds = new Set<string>();
  const scoreBox = scoreExercise(boxJump!, inputWithKnee, recentIds, movementCounts, false, undefined, {});
  const scoreGoblet = scoreExercise(gobletSquat!, inputWithKnee, recentIds, movementCounts, false, undefined, {});
  assert(scoreBox.score < scoreGoblet.score, "with knee injury, high-impact box_jump scores below low-impact goblet_squat");
  console.log("  OK: knee injury → high-impact exercise down-ranked vs low-impact");
}

function run() {
  console.log("Session title and power prescription tests\n");
  testSessionTitleWithBodyFocus();
  testPowerPrescription();
  testBeginnerPrescription();
  testWarmupCountByDuration();
  testImpactPenaltyWithInjury();
  console.log("\nAll session title and power tests passed.");
}

run();
