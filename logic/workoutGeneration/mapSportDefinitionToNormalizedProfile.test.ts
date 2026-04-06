/**
 * Canonical sport definition → normalized profile mapping (single source of truth path).
 */

import assert from "node:assert/strict";
import test from "node:test";
import { getSportDefinition } from "../../data/sportSubFocus";
import type { SportDefinition } from "../../data/sportSubFocus/types";
import { mapSportDefinitionToNormalizedProfile } from "./mapSportDefinitionToNormalizedProfile";
import { clearSportProfileEngineCache } from "./sportProfileEngine";

test("rock_climbing maps with expected operational fields (regression)", () => {
  const def = getSportDefinition("rock_climbing");
  assert.ok(def?.engine);
  const r = mapSportDefinitionToNormalizedProfile(def!);
  assert.equal(r.ok, true);
  if (!r.ok) return;
  const p = r.profile;
  assert.equal(p.sportSlug, "rock_climbing");
  assert.deepEqual(p.topPatterns, ["pull", "rotate"]);
  assert.deepEqual(p.secondaryPatterns, ["push", "carry"]);
  assert.equal(p.climbingStyleDomainGate, true);
  assert.equal(p.energySystemBias.conditioningMinutesScale, 0.88);
  assert.equal(p.compositionNudge.conditioningPickerMinutesMultiplier, 0.95);
  assert.equal(p.hardBanPredicates.length, 1);
  assert.equal(p.softBanPredicates.length, 1);
  assert.ok(p.scoringPenaltyKeys.includes("climbing_heavy_lower_squat_hinge_penalty"));
  assert.equal(p.structureBias.strength, 0.62);
});

test("alpine_skiing maps with alpine soft ban and penalty keys", () => {
  const def = getSportDefinition("alpine_skiing");
  const r = mapSportDefinitionToNormalizedProfile(def!);
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.profile.softBanPredicates.length, 1);
  assert.ok(r.profile.scoringPenaltyKeys.includes("alpine_upper_hypertrophy_mismatch_penalty"));
  assert.equal(r.profile.energySystemBias.conditioningMinutesScale, 1.12);
});

test("surfing has no engine → mapping fails clearly", () => {
  const def = getSportDefinition("surfing");
  const r = mapSportDefinitionToNormalizedProfile(def!);
  assert.equal(r.ok, false);
  if (r.ok) return;
  assert.ok(r.errors.some((e) => e.includes("no engine")));
});

test("invalid movement slug in engine fails closed", () => {
  clearSportProfileEngineCache();
  const bad = {
    slug: "test_bad_pattern",
    displayName: "Test",
    movementPatternsRanked: [],
    energySystems: { primary: "a", secondary: "b" },
    mustInclude: [],
    mustAvoidOrLimit: [],
    weeklyStructureBias: [],
    engine: {
      movementPatterns: [{ slug: "not_a_real_pattern" as "squat", rank: 1 }],
      topPatterns: ["squat"],
      secondaryPatterns: ["hinge"],
      requiredTagBoosts: [{ tag: "x", weight: 1 }],
      energySystemBias: {},
      structureBias: {},
    },
  };
  const r = mapSportDefinitionToNormalizedProfile(bad as SportDefinition);
  assert.equal(r.ok, false);
});
