/**
 * Build Strength hierarchy tests.
 * Run with: npx tsx logic/workoutGeneration/strength-hierarchy.test.ts
 */

import { generateWorkoutSession } from "./dailyGenerator";
import type { GenerateWorkoutInput } from "./types";
import { STUB_EXERCISES } from "./exerciseStub";
import { exerciseWarmupTargetsOverlap, getPreferredWarmupTargetsFromFocus } from "./ontologyScoring";
import {
  exerciseHasStrengthSubFocusSlug,
  exerciseMatchesStrengthIntentStrong,
} from "../../data/goalSubFocus";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

const EX_BY_ID = new Map(STUB_EXERCISES.map((e) => [e.id, e]));

function attributeTagsFor(exId: string): string[] {
  return (EX_BY_ID.get(exId)?.tags as { attribute_tags?: string[] } | undefined)?.attribute_tags ?? [];
}

function hasAttrTag(exId: string, tag: string): boolean {
  return attributeTagsFor(exId).includes(tag);
}

const FULL_GYM = [
  "barbell",
  "bench",
  "dumbbells",
  "bodyweight",
  "kettlebells",
  "pullup_bar",
  "cable_machine",
  "squat_rack",
] as const;

function strengthSession(intent: string, seed: number) {
  const input: GenerateWorkoutInput = {
    duration_minutes: 45,
    primary_goal: "strength",
    energy_level: "medium",
    focus_body_parts: ["full_body"],
    goal_sub_focus: { strength: [intent] },
    available_equipment: [...FULL_GYM],
    injuries_or_constraints: [],
    seed,
  };
  return generateWorkoutSession(input, STUB_EXERCISES);
}

function testStrengthHingeAnchoring() {
  const session = strengthSession("deadlift_hinge", 777);

  const mainItems = session.blocks
    .filter((b) => b.block_type === "main_strength")
    .flatMap((b) => b.items);

  assert(mainItems.length >= 1, "hinge strength session has main items");
  assert(mainItems.length <= 2, "hinge strength session has 1–2 main lifts");

  assert(
    hasAttrTag(mainItems[0].exercise_id, "deadlift_hinge") ||
      exerciseMatchesStrengthIntentStrong(EX_BY_ID.get(mainItems[0].exercise_id)!, "deadlift_hinge"),
    "primary main lift should match deadlift_hinge (first main item is hinge)"
  );
  assert(
    mainItems.some((it) => exerciseHasStrengthSubFocusSlug(EX_BY_ID.get(it.exercise_id)!, "deadlift_hinge")),
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
    return exerciseWarmupTargetsOverlap(ex as never, preferredTargets);
  }).length;
  assert(warmupPrimaryMatchCount >= 2, "warmup prioritizes hinge (lower/core) targets: >=2 matches");

  const accessoryBlocks = session.blocks.filter((b) => b.block_type === "accessory");
  assert(accessoryBlocks.length <= 2, "accessory block count capped");

  const accessoryItems = accessoryBlocks.flatMap((b) => b.items);
  if (accessoryItems.length > 0) {
    const supportsIntent = accessoryItems.some((it) => {
      const ex = EX_BY_ID.get(it.exercise_id);
      if (!ex) return false;
      return (
        exerciseHasStrengthSubFocusSlug(ex, "deadlift_hinge") ||
        exerciseHasStrengthSubFocusSlug(ex, "squat")
      );
    });
    assert(supportsIntent, "accessory exercises support the selected strength intent");
  }
}

function testStrengthSquatAnchoring() {
  const session = strengthSession("squat", 778);

  const mainItems = session.blocks
    .filter((b) => b.block_type === "main_strength")
    .flatMap((b) => b.items);

  assert(mainItems.length >= 1, "squat strength session has main items");
  assert(mainItems.length <= 2, "squat strength session has 1–2 main lifts");
  assert(
    hasAttrTag(mainItems[0].exercise_id, "squat") ||
      exerciseMatchesStrengthIntentStrong(EX_BY_ID.get(mainItems[0].exercise_id)!, "squat"),
    "primary main lift should match squat (first main item is squat)"
  );

  const warmup = session.blocks.find((b) => b.block_type === "warmup");
  assert(warmup != null, "squat strength session has warmup");
  const warmupItems = warmup!.items;
  assert(warmupItems.length >= 2, "squat strength warmup has >=2 exercises");

  const preferredTargets = getPreferredWarmupTargetsFromFocus(["lower", "core"]);
  const warmupPrimaryMatchCount = warmupItems.filter((it) => {
    const ex = EX_BY_ID.get(it.exercise_id);
    if (!ex) return false;
    return exerciseWarmupTargetsOverlap(ex as never, preferredTargets);
  }).length;
  assert(warmupPrimaryMatchCount >= 2, "warmup prioritizes squat (lower/core) targets: >=2 matches");

  const accessoryBlocks = session.blocks.filter((b) => b.block_type === "accessory");
  assert(accessoryBlocks.length <= 2, "accessory block count capped");
}

/** Every Build Strength lift intent must appear as the first main lift (not only in accessories). */
function testAllStrengthLiftIntentsAnchorMain() {
  const intents = ["squat", "deadlift_hinge", "bench_press", "overhead_press", "pull"] as const;
  for (let i = 0; i < intents.length; i++) {
    const intent = intents[i]!;
    const session = strengthSession(intent, 900 + i);
    const mainItems = session.blocks
      .filter((b) => b.block_type === "main_strength")
      .flatMap((b) => b.items);
    assert(mainItems.length >= 1, `${intent}: expected main lifts`);
    const first = EX_BY_ID.get(mainItems[0]!.exercise_id);
    assert(first != null, `${intent}: main exercise in stub catalog`);
    assert(
      exerciseMatchesStrengthIntentStrong(first, intent),
      `${intent}: first main should be a strong match, got ${first.id}`
    );
  }
}

function run() {
  testStrengthHingeAnchoring();
  testStrengthSquatAnchoring();
  testAllStrengthLiftIntentsAnchorMain();
  console.log("Build Strength hierarchy tests passed.");
}

run();
