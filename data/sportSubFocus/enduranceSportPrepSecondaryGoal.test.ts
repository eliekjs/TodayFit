import { describe, expect, it } from "vitest";
import {
  ENDURANCE_ENGINE_CANONICAL_SPORT_SLUGS,
  sportSubFocusSelectionsImplyEnduranceSecondary,
} from "./enduranceSportPrepSecondaryGoal";

describe("sportSubFocusSelectionsImplyEnduranceSecondary", () => {
  it("keeps trail + uphill/aerobic (legacy trail/ultra intent)", () => {
    expect(
      sportSubFocusSelectionsImplyEnduranceSecondary("trail_running", ["ankle_stability", "uphill_endurance"])
    ).toBe(true);
    expect(sportSubFocusSelectionsImplyEnduranceSecondary("trail_running", ["aerobic_base"])).toBe(true);
  });

  it("fires for category-Endurance sports + engine sub-focus", () => {
    expect(sportSubFocusSelectionsImplyEnduranceSecondary("cycling", ["aerobic_base"])).toBe(true);
    expect(sportSubFocusSelectionsImplyEnduranceSecondary("road_running", ["marathon_pace"])).toBe(true);
    expect(sportSubFocusSelectionsImplyEnduranceSecondary("triathlon", ["threshold"])).toBe(true);
    expect(sportSubFocusSelectionsImplyEnduranceSecondary("rucking", ["load_carriage_durability"])).toBe(true);
  });

  it("fires for xc / rowing / swim when sub-focus signals engine work", () => {
    expect(sportSubFocusSelectionsImplyEnduranceSecondary("xc_skiing", ["aerobic_base"])).toBe(true);
    expect(sportSubFocusSelectionsImplyEnduranceSecondary("rowing_erg", ["threshold"])).toBe(true);
    expect(sportSubFocusSelectionsImplyEnduranceSecondary("swimming_open_water", ["aerobic_base"])).toBe(
      true
    );
  });

  it("does not fire for strength-only sub-focus selections on engine sports", () => {
    expect(sportSubFocusSelectionsImplyEnduranceSecondary("cycling", ["leg_strength"])).toBe(false);
    expect(sportSubFocusSelectionsImplyEnduranceSecondary("swimming_open_water", ["pull_strength"])).toBe(
      false
    );
    expect(sportSubFocusSelectionsImplyEnduranceSecondary("triathlon", ["swim_specific"])).toBe(false);
  });

  it("does not fire for field sport aerobic_base (soccer is not in engine set)", () => {
    expect(sportSubFocusSelectionsImplyEnduranceSecondary("soccer", ["aerobic_base"])).toBe(false);
  });

  it("includes all Endurance-category prep sports plus xc/row/swim/backcountry/surfing", () => {
    for (const slug of [
      "road_running",
      "trail_running",
      "cycling",
      "triathlon",
      "rucking",
      "xc_skiing",
      "rowing_erg",
      "swimming_open_water",
      "backcountry_skiing",
      "surfing",
    ]) {
      expect(ENDURANCE_ENGINE_CANONICAL_SPORT_SLUGS.has(slug), slug).toBe(true);
    }
  });

  it("paddle_endurance only counts for surfing in our signal set contract", () => {
    expect(sportSubFocusSelectionsImplyEnduranceSecondary("surfing", ["paddle_endurance"])).toBe(true);
    expect(sportSubFocusSelectionsImplyEnduranceSecondary("surfing", ["balance"])).toBe(false);
  });
});
