import { describe, expect, it } from "vitest";
import {
  goalSlugToPrimaryGoal,
  primaryFocusLabelToGoalSlug,
  primaryFocusLabelToPrimaryGoal,
} from "./goalRegistry";

describe("goalRegistry", () => {
  it("maps primary focus labels to goal slugs and PrimaryGoal", () => {
    expect(primaryFocusLabelToGoalSlug("Build Muscle (Hypertrophy)")).toBe("muscle");
    expect(primaryFocusLabelToPrimaryGoal("Build Muscle (Hypertrophy)")).toBe("hypertrophy");
    expect(primaryFocusLabelToGoalSlug("Recovery & Mobility")).toBe("recovery_mobility");
    expect(goalSlugToPrimaryGoal("resilience")).toBe("recovery_mobility");
    expect(primaryFocusLabelToPrimaryGoal("Strength Training for Joint Health")).toBe("joint_health");
  });

  it("resolves adaptive display labels via canonicalGoalSubFocusLabel", () => {
    expect(primaryFocusLabelToGoalSlug("Build muscle")).toBe("muscle");
    expect(primaryFocusLabelToGoalSlug("Mobility & joint health")).toBe("recovery_mobility");
    expect(primaryFocusLabelToGoalSlug("Recovery")).toBe("recovery_mobility");
  });
});
