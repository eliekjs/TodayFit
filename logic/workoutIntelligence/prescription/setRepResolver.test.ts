/**
 * Unit checks for set/rep/rest resolution (evidence-aligned prescription).
 * Run: npx tsx logic/workoutIntelligence/prescription/setRepResolver.test.ts
 */

import { getPrescriptionStyle } from "../prescriptionStyles";
import { resolveRest } from "./setRepResolver";
import type { ResolverContext } from "./setRepResolver";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function ctx(partial: Partial<ResolverContext> & Pick<ResolverContext, "style">): ResolverContext {
  return {
    fatigueCost: "medium",
    durationTier: 45,
    energyLevel: "medium",
    blockIndex: 0,
    totalBlocks: 4,
    ...partial,
  };
}

function testStrengthRestBiasesTowardSixty() {
  const style = getPrescriptionStyle("heavy_strength");
  const rest = resolveRest(
    ctx({
      style,
      fatigueCost: "medium",
      durationTier: 45,
    })
  );
  assert(rest !== undefined, "rest defined");
  assert(rest! <= 90, `strength rest ${rest} must be ≤90 s`);
  const midpoint = ((style.rest_seconds_min ?? 0) + (style.rest_seconds_max ?? 0)) / 2;
  assert(
    rest! <= midpoint,
    `strength rest ${rest} should be at or below midpoint ${midpoint} (bias toward 60 s)`
  );
}

function testHypertrophyRestBiasesTowardSixty() {
  const style = getPrescriptionStyle("moderate_hypertrophy");
  const rest = resolveRest(
    ctx({
      style,
      fatigueCost: "medium",
      durationTier: 45,
    })
  );
  assert(rest !== undefined, "rest defined");
  assert(
    rest! >= (style.rest_seconds_min ?? 0) && rest! <= Math.min(style.rest_seconds_max ?? 999, 90),
    `hypertrophy rest ${rest} stays within style band (≤90)`
  );
  const midpoint = ((style.rest_seconds_min ?? 0) + (style.rest_seconds_max ?? 0)) / 2;
  assert(
    rest! <= midpoint,
    `hypertrophy rest ${rest} at or below midpoint ${midpoint} (bias toward 60 s)`
  );
}

function run() {
  console.log("setRepResolver tests\n");
  testStrengthRestBiasesTowardSixty();
  testHypertrophyRestBiasesTowardSixty();
  console.log("\nAll setRepResolver tests passed.");
}

run();
