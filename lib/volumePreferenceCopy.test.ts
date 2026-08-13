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

  it("formats recommended strength options around 5–8 reps", () => {
    const options = volumePreferenceOptionsForGoals({
      primaryFocus: ["Build Strength"],
    });
    expect(options.map((o) => o.value)).toEqual([
      "conservative",
      "standard",
      "high_volume",
    ]);
    expect(options[0]!.label).toBe("Lower reps");
    expect(options[1]!.label).toBe("Goal rep range");
    expect(options[1]!.description).toContain("5–8");
    expect(options[2]!.label).toBe("Higher reps");
    expect(volumePreferenceSectionSubtitle({ primaryFocus: ["Build Strength"] })).toContain(
      "5–8"
    );
  });

  it("formats hypertrophy recommendation as 8–15", () => {
    const options = volumePreferenceOptionsForGoals({
      primaryFocus: ["Build Muscle (Hypertrophy)"],
    });
    expect(options[1]!.description).toContain("8–15");
    expect(volumePreferenceDisplayLabel("standard", {
      primaryFocus: ["Build Muscle (Hypertrophy)"],
    })).toBe("Goal rep range");
  });

  it("formatRepRange handles equal bounds", () => {
    expect(formatRepRange(1, 1)).toBe("1");
    expect(formatRepRange(8, 15)).toBe("8–15");
  });
});
