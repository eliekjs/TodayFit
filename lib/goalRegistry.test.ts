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
    expect(primaryFocusLabelToGoalSlug("Recovery")).toBe("resilience");
    expect(goalSlugToPrimaryGoal("resilience")).toBe("recovery");
  });

  it("resolves adaptive display labels via canonicalGoalSubFocusLabel", () => {
    expect(primaryFocusLabelToGoalSlug("Build muscle")).toBe("muscle");
    expect(primaryFocusLabelToGoalSlug("Mobility & joint health")).toBe("mobility");
  });
});
