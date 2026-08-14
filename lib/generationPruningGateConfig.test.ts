import { describe, expect, it } from "vitest";
import { eligibilityStatesForCatalogFetch } from "./generationPruningGateConfig";
import type { PruningGateFeatureFlags } from "../logic/exerciseLibraryCuration/generatorEligibilityTypes";

const OFF: PruningGateFeatureFlags = {
  enable_pruning_gating: false,
  allow_niche_exercises: true,
  allow_phase2_exercises: true,
  allow_review_exercises: true,
};

const PILOT: PruningGateFeatureFlags = {
  enable_pruning_gating: true,
  allow_niche_exercises: false,
  allow_phase2_exercises: false,
  allow_review_exercises: false,
};

describe("eligibilityStatesForCatalogFetch", () => {
  it("returns null when gating is off so the full active catalog is fetched", () => {
    expect(eligibilityStatesForCatalogFetch(OFF)).toBeNull();
  });

  it("requests only eligible_core for the pilot gate", () => {
    expect(eligibilityStatesForCatalogFetch(PILOT)).toEqual(["eligible_core"]);
  });

  it("includes allowed non-core states when those flags are on", () => {
    expect(
      eligibilityStatesForCatalogFetch({
        enable_pruning_gating: true,
        allow_niche_exercises: true,
        allow_phase2_exercises: true,
        allow_review_exercises: false,
      })
    ).toEqual(["eligible_core", "eligible_niche", "eligible_phase2"]);
  });
});
