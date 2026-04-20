/**
 * Quick checks for Calisthenics sub-focus slug matching (handstand, pull-ups, …).
 * Run: npx tsx data/goalSubFocus/calisthenicsStrengthMatch.test.ts
 */

import assert from "node:assert";
import { exerciseHasStrengthSubFocusSlug } from "./strengthSubFocus";

const wallHandstand = {
  id: "ff_bodyweight_wall_facing_handstand",
  movement_pattern: "push",
  movement_patterns: ["horizontal_push"],
  muscle_groups: ["push"],
  tags: { attribute_tags: [] },
};

assert.strictEqual(
  exerciseHasStrengthSubFocusSlug(wallHandstand, "handstand"),
  true,
  "wall handstand id should match handstand sub-focus"
);

assert.strictEqual(
  exerciseHasStrengthSubFocusSlug(wallHandstand, "squat"),
  false,
  "handstand exercise should not match squat intent"
);

console.log("calisthenicsStrengthMatch.test.ts: ok");
