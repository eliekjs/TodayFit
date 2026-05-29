import { describe, it, expect } from "vitest";
import { SPORTS_WITH_SUB_FOCUSES } from "./sportsWithSubFocuses";
import { SUB_FOCUS_TAG_MAP } from "./subFocusTagMap";
import {
  ENDURANCE_SPORT_JOINT_STABILITY_SLUGS,
  applyEnduranceJointStabilitySubFocuses,
  buildEnduranceJointStabilityTagMapEntries,
} from "./enduranceJointStabilitySubFocus";
import { getExerciseTagsForSubFocuses } from "./index";
import { isStabilityPrehabSportSubFocusSlug } from "./subFocusIntentArchetypes";

function subFocusSlugsForSport(slug: string): string[] {
  return SPORTS_WITH_SUB_FOCUSES.find((s) => s.slug === slug)?.sub_focuses.map((sf) => sf.slug) ?? [];
}

describe("endurance joint stability sub-focuses", () => {
  it("replaces core_stability with sport-relevant joint slugs for configured endurance sports", () => {
    for (const sportSlug of Object.keys(ENDURANCE_SPORT_JOINT_STABILITY_SLUGS)) {
      const slugs = subFocusSlugsForSport(sportSlug);
      expect(slugs).not.toContain("core_stability");
      expect(slugs).not.toContain("core_bracing");
      for (const joint of ENDURANCE_SPORT_JOINT_STABILITY_SLUGS[sportSlug]!) {
        expect(slugs).toContain(joint);
      }
    }
  });

  it("road_running exposes knee and ankle stability with tag map weights", () => {
    const slugs = subFocusSlugsForSport("road_running");
    expect(slugs).toContain("knee_stability");
    expect(slugs).toContain("ankle_stability");

    const kneeTags = getExerciseTagsForSubFocuses("road_running", ["knee_stability"]);
    expect(kneeTags.some((t) => t.tag_slug === "knee_stability" && t.weight > 0)).toBe(true);
  });

  it("cycling replaces core with hip stability and biases hip_stability tags", () => {
    const slugs = subFocusSlugsForSport("cycling");
    expect(slugs).not.toContain("core_stability");
    expect(slugs).toContain("hip_stability");

    const tags = getExerciseTagsForSubFocuses("cycling", ["hip_stability"]);
    expect(tags.find((t) => t.tag_slug === "hip_stability")?.weight).toBeGreaterThan(1);
  });

  it("preserves existing joint sub-focuses when already listed (trail ankle)", () => {
    const raw = [
      { slug: "aerobic_base", name: "Aerobic Base", priority_weight: 1 },
      { slug: "ankle_stability", name: "Ankle Stability", priority_weight: 4 },
      { slug: "core_stability", name: "Core Stability", priority_weight: 5 },
    ];
    const merged = applyEnduranceJointStabilitySubFocuses("trail_running", raw);
    expect(merged.filter((sf) => sf.slug === "ankle_stability")).toHaveLength(1);
    expect(merged.some((sf) => sf.slug === "knee_stability")).toBe(true);
    expect(merged.some((sf) => sf.slug === "core_stability")).toBe(false);
  });

  it("every configured joint sub-focus has SUB_FOCUS_TAG_MAP entries and stability-prehab routing", () => {
    const built = buildEnduranceJointStabilityTagMapEntries();
    for (const [composite, entries] of Object.entries(built)) {
      expect(SUB_FOCUS_TAG_MAP[composite]?.length ?? 0).toBeGreaterThan(0);
      expect(entries.length).toBeGreaterThan(0);
      const subSlug = composite.split(":")[1]!;
      expect(isStabilityPrehabSportSubFocusSlug(subSlug)).toBe(true);
    }
  });
});
