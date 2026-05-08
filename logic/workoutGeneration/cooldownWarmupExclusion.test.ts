import { describe, expect, it } from "vitest";
import type { Exercise } from "./types";
import { isWarmupPrimaryCooldownExcluded } from "./cooldownSelection";

describe("isWarmupPrimaryCooldownExcluded", () => {
  it("excludes high-warmup / low-cooldown activation drills from cooldown pools", () => {
    const ex = {
      id: "wall_slide",
      warmup_relevance: "high",
      cooldown_relevance: "low",
    } as Exercise;
    expect(isWarmupPrimaryCooldownExcluded(ex)).toBe(true);
  });

  it("allows stretches that are cooldown-first", () => {
    const ex = {
      id: "hamstring_stretch",
      warmup_relevance: "none",
      cooldown_relevance: "high",
    } as Exercise;
    expect(isWarmupPrimaryCooldownExcluded(ex)).toBe(false);
  });
});
