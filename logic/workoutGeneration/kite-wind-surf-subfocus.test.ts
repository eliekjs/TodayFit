/**
 * Regression: Kitesurfing / Windsurfing sub-focus → tag map includes rig-relevant pull/scapular bias.
 * Run: npx tsx logic/workoutGeneration/kite-wind-surf-subfocus.test.ts
 */

import { getExerciseTagsForSubFocuses } from "../../data/sportSubFocus";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function weightBySlug(
  rows: { tag_slug: string; weight: number }[]
): Record<string, number> {
  return Object.fromEntries(rows.map((r) => [r.tag_slug, r.weight]));
}

function runTests() {
  const core = weightBySlug(
    getExerciseTagsForSubFocuses("kite_wind_surf", ["core_stability"])
  );
  for (const slug of [
    "core_stability",
    "core_anti_rotation",
    "horizontal_pull",
    "vertical_pull",
    "pulling_strength",
    "scapular_control",
    "shoulder_stability",
  ]) {
    assert(core[slug] != null && core[slug] > 0, `core_stability should include ${slug}`);
  }
  assert(
    (core.horizontal_pull ?? 0) + (core.vertical_pull ?? 0) >= 1.5,
    "core_stability: combined horizontal + vertical pull weights should be substantive"
  );

  const balance = weightBySlug(
    getExerciseTagsForSubFocuses("kite_wind_surf", ["balance"])
  );
  assert(
    (balance.scapular_control ?? 0) > 0 && (balance.horizontal_pull ?? 0) > 0,
    "balance should lightly favor scapular + horizontal pull (rig)"
  );

  const grip = weightBySlug(
    getExerciseTagsForSubFocuses("kite_wind_surf", ["grip_endurance"])
  );
  assert(
    (grip.horizontal_pull ?? 0) > 0,
    "grip_endurance should include pulling context"
  );

  console.log("kite-wind-surf subfocus tag map tests passed.");
}

runTests();
