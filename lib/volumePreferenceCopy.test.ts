import { describe, expect, it } from "vitest";
import {
  formatRepRange,
  resolveVolumeRuleKey,
  volumePreferenceDisplayLabel,
  volumePreferenceOptionsForGoals,
  volumePreferenceSectionSubtitle,
} from "./volumePreferenceCopy";

describe("volumePreferenceCopy", () => {
  it("maps primary focus labels to training rule keys", () => {
    expect(resolveVolumeRuleKey({ primaryFocus: ["Build Strength"] })).toBe("strength");
    expect(resolveVolumeRuleKey({ primaryFocus: ["Build Muscle (Hypertrophy)"] })).toBe(
      "hypertrophy"
    );
    expect(resolveVolumeRuleKey({ goalBias: "endurance" })).toBe("endurance");
    expect(resolveVolumeRuleKey({ goalSlugs: ["muscle"] })).toBe("hypertrophy");
  });

  it("formats recommended strength options as Strength Focused / Balanced / High Volume", () => {
    const options = volumePreferenceOptionsForGoals({
      primaryFocus: ["Build Strength"],
    });
    expect(options.map((o) => o.value)).toEqual([
      "conservative",
      "standard",
      "high_volume",
    ]);
    expect(options[0]!.label).toBe("Strength Focused");
    expect(options[1]!.label).toBe("Balanced");
    expect(options[1]!.description).toContain("5–8");
    expect(options[2]!.label).toBe("High Volume");
    expect(volumePreferenceSectionSubtitle({ primaryFocus: ["Build Strength"] })).toContain(
      "volume preference"
    );
  });

  it("keeps High Volume distinct from hypertrophy as a goal", () => {
    const options = volumePreferenceOptionsForGoals({
      primaryFocus: ["Build Muscle (Hypertrophy)"],
    });
    expect(options[2]!.label).toBe("High Volume");
    expect(options[2]!.description).toContain("12–15");
    expect(volumePreferenceDisplayLabel("standard", {
      primaryFocus: ["Build Muscle (Hypertrophy)"],
    })).toBe("Balanced");
  });

  it("formatRepRange handles equal bounds", () => {
    expect(formatRepRange(1, 1)).toBe("1");
    expect(formatRepRange(8, 15)).toBe("8–15");
  });
});
