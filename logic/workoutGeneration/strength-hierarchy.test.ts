/**
 * Build Strength hierarchy tests.
 * Run with: npx tsx logic/workoutGeneration/strength-hierarchy.test.ts
 */

import { generateWorkoutSession } from "./dailyGenerator";
import type { GenerateWorkoutInput } from "./types";
import type { WorkoutBlock, WorkoutItem } from "../../lib/types";
import { STUB_EXERCISES } from "./exerciseStub";
import { exerciseWarmupTargetsOverlap, getPreferredWarmupTargetsFromFocus } from "./ontologyScoring";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

const EX_BY_ID = new Map(STUB_EXERCISES.map((e) => [e.id, e]));

function attributeTagsFor(exId: string): string[] {
  return (EX_BY_ID.get(exId)?.tags as any)?.attribute_tags ?? [];
}

function hasAttrTag(exId: string, tag: string): boolean {
  return attributeTagsFor(exId).includes(tag);
}

function firstMainLiftItem(session: ReturnType<typeof generateWorkoutSession>): WorkoutItem | undefined {
  const mainBlock = session.blocks.find((b) => b.block_type === "main_strength");
  return mainBlock?.items[0];
}

function sumSets(items: WorkoutItem[]): number {
  return items.reduce((s, i) => s + (i.sets ?? 0), 0);
}

function testStrengthHingeAnchoring() {
  const input: GenerateWorkoutInput = {
    duration_minutes: 45,
    primary_goal: "strength",
    energy_level: "medium",
    focus_body_parts: ["full_body"],
    goal_sub_focus: { strength: ["deadlift_hinge"] },
    available_equipment: [
      "barbell",
      "bench",
      "dumbbells",
      "bodyweight",
      "kettlebells",
      "pullup_bar",
      "cable_machine",
    ],
    injuries_or_constraints: [],
    seed: 777,
  };

  const session = generateWorkoutSession(input, STUB_EXERCISES);

  const mainItems = session.blocks
    .filter((b) => b.block_type === "main_strength")
    .flatMap((b) => b.items);

  assert(mainItems.length >= 1, "hinge strength session has main items");
  assert(mainItems.length <= 2, "hinge strength session has 1–2 main lifts");

  assert(
    hasAttrTag(mainItems[0].exercise_id, "deadlift_hinge"),
    "primary main lift should match deadlift_hinge (first main item is hinge)"
  );
  assert(
    mainItems.some((it) => hasAttrTag(it.exercise_id, "deadlift_hinge")),
    "at least one main lift should match deadlift_hinge"
  );

  const warmup = session.blocks.find((b) => b.block_type === "warmup");
  assert(warmup != null, "hinge strength session has warmup");
  const warmupItems = warmup!.items;
  assert(warmupItems.length >= 2, "hinge strength warmup has >=2 exercises");

  const preferredTargets = getPreferredWarmupTargetsFromFocus(["lower", "core"]);
  const warmupPrimaryMatchCount = warmupItems.filter((it) => {
    const ex = EX_BY_ID.get(it.exercise_id);
    if (!ex) return false;
    return exerciseWarmupTargetsOverlap(ex as any, preferredTargets);
  }).length;
  assert(warmupPrimaryMatchCount >= 2, "warmup prioritizes hinge (lower/core) targets: >=2 matches");

  const accessoryBlocks = session.blocks.filter((b) => b.block_type === "accessory");
  assert(accessoryBlocks.length <= 2, "accessory block count capped");

  // Title: should no longer be misleading "Accessory"
  for (const b of accessoryBlocks) {
    const t = (b.title ?? "").toLowerCase();
    assert(!t.includes("accessory"), "accessory blocks are not labeled 'Accessory'");
  }

  const accessoryItems = accessoryBlocks.flatMap((b) => b.items);
  const mainSets = sumSets(mainItems);
  const accessorySets = sumSets(accessoryItems);

  assert(accessorySets <= mainSets, "accessory sets should not exceed main sets");
  if (accessoryItems.length > 0) {
    assert(mainSets > accessorySets, "main lifts dominate accessory work");
  }

  if (accessoryItems.length > 0) {
    const supportsIntent = accessoryItems.some((it) => hasAttrTag(it.exercise_id, "deadlift_hinge") || hasAttrTag(it.exercise_id, "squat"));
    assert(supportsIntent, "accessory exercises support the selected strength intent");
  }
}

function testStrengthSquatAnchoring() {
  const input: GenerateWorkoutInput = {
    duration_minutes: 45,
    primary_goal: "strength",
    energy_level: "medium",
    focus_body_parts: ["full_body"],
    goal_sub_focus: { strength: ["squat"] },
    available_equipment: [
      "barbell",
      "bench",
      "dumbbells",
      "bodyweight",
      "kettlebells",
      "pullup_bar",
      "cable_machine",
    ],
    injuries_or_constraints: [],
    seed: 778,
  };

  const session = generateWorkoutSession(input, STUB_EXERCISES);

  const mainItems = session.blocks
    .filter((b) => b.block_type === "main_strength")
    .flatMap((b) => b.items);

  assert(mainItems.length >= 1, "squat strength session has main items");
  assert(mainItems.length <= 2, "squat strength session has 1–2 main lifts");
  assert(hasAttrTag(mainItems[0].exercise_id, "squat"), "primary main lift should match squat (first main item is squat)");

  const warmup = session.blocks.find((b) => b.block_type === "warmup");
  assert(warmup != null, "squat strength session has warmup");
  const warmupItems = warmup!.items;
  assert(warmupItems.length >= 2, "squat strength warmup has >=2 exercises");

  const preferredTargets = getPreferredWarmupTargetsFromFocus(["lower", "core"]);
  const warmupPrimaryMatchCount = warmupItems.filter((it) => {
    const ex = EX_BY_ID.get(it.exercise_id);
    if (!ex) return false;
    return exerciseWarmupTargetsOverlap(ex as any, preferredTargets);
  }).length;
  assert(warmupPrimaryMatchCount >= 2, "warmup prioritizes squat (lower/core) targets: >=2 matches");

  const accessoryBlocks = session.blocks.filter((b) => b.block_type === "accessory");
  assert(accessoryBlocks.length <= 2, "accessory block count capped");
}

function run() {
  testStrengthHingeAnchoring();
  testStrengthSquatAnchoring();
  console.log("Build Strength hierarchy tests passed.");
}

run();

