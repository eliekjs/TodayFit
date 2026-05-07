import { describe, expect, it } from "vitest";
import {
  exerciseTagSetHasSpeedAgilityDynamicMovement,
  isSpeedAgilityPowerStyleSubFocusSlug,
  normTagSlug,
  SHARED_TAG_WEIGHTS_COURT_CHANGE_OF_DIRECTION,
  SHARED_TAG_WEIGHTS_FIELD_CHANGE_OF_DIRECTION,
  SPEED_AGILITY_DYNAMIC_MOVEMENT_TAG_SLUGS,
} from "./speedAgilitySubFocusShared";

describe("speedAgilitySubFocusShared", () => {
  it("classifies speed/COD slug variants consistently", () => {
    expect(isSpeedAgilityPowerStyleSubFocusSlug("change-of-direction")).toBe(true);
    expect(isSpeedAgilityPowerStyleSubFocusSlug("Lateral Speed")).toBe(true);
    expect(isSpeedAgilityPowerStyleSubFocusSlug("shoulder_stability")).toBe(false);
  });

  it("field vs court COD shared rows differ where landing bias should", () => {
    const field = new Set(SHARED_TAG_WEIGHTS_FIELD_CHANGE_OF_DIRECTION.map((e) => e.tag_slug));
    const court = new Set(SHARED_TAG_WEIGHTS_COURT_CHANGE_OF_DIRECTION.map((e) => e.tag_slug));
    expect(field.has("balance")).toBe(true);
    expect(court.has("knee_stability")).toBe(true);
    expect(court.has("balance")).toBe(false);
  });

  it("detects dynamic movement signals on normalized exercise tag sets", () => {
    expect(exerciseTagSetHasSpeedAgilityDynamicMovement(new Set(["balance"]))).toBe(false);
    expect(exerciseTagSetHasSpeedAgilityDynamicMovement(new Set(["agility"]))).toBe(true);
    expect(
      exerciseTagSetHasSpeedAgilityDynamicMovement(
        new Set([...SPEED_AGILITY_DYNAMIC_MOVEMENT_TAG_SLUGS].map((t) => normTagSlug(t)))
      )
    ).toBe(true);
  });
});
