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

function testStrengthRestSkewsLongInWideRange() {
  const style = getPrescriptionStyle("heavy_strength");
  const rest = resolveRest(
    ctx({
      style,
      fatigueCost: "medium",
      durationTier: 45,
    })
  );
  assert(rest !== undefined, "rest defined");
  const midpoint = ((style.rest_seconds_min ?? 0) + (style.rest_seconds_max ?? 0)) / 2;
  assert(
    rest! >= midpoint,
    `strength rest ${rest} should be at or above midpoint ${midpoint} (wide-range bias toward ACSM 3–5 min)`
  );
}

function testHypertrophyRestUnchangedBand() {
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
    rest! >= (style.rest_seconds_min ?? 0) && rest! <= (style.rest_seconds_max ?? 999),
    `hypertrophy rest ${rest} stays within style band`
  );
  const midpoint = ((style.rest_seconds_min ?? 0) + (style.rest_seconds_max ?? 0)) / 2;
  assert(
    Math.abs(rest! - midpoint) <= 12,
    `hypertrophy narrow band: rest ${rest} near midpoint ${midpoint} (no wide-range skew)`
  );
}

function run() {
  console.log("setRepResolver tests\n");
  testStrengthRestSkewsLongInWideRange();
  testHypertrophyRestUnchangedBand();
  console.log("\nAll setRepResolver tests passed.");
}

run();
