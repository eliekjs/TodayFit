import { describe, it, expect } from "vitest";
import {
  cardioSwapFamilyId,
  diversifySwapSuggestionOrder,
  isSameCardioSwapFamily,
} from "./swapVariantDiversity";

describe("cardioSwapFamilyId", () => {
  it("groups treadmill pacing variants, but not incline walk or hill run", () => {
    expect(cardioSwapFamilyId("treadmill_run")).toBe("treadmill:");
    expect(cardioSwapFamilyId("zone2_treadmill")).toBe("treadmill:");
    expect(cardioSwapFamilyId("treadmill_intervals")).toBe("treadmill:");
    expect(cardioSwapFamilyId("treadmill_tempo_run")).toBe("treadmill:");
    expect(cardioSwapFamilyId("treadmill_incline_walk")).toBe("treadmill:incline_walk");
    expect(cardioSwapFamilyId("incline_treadmill_walk")).toBe("treadmill:incline_walk");
    expect(cardioSwapFamilyId("treadmill_hill_run")).toBe("treadmill:hill");
  });

  it("groups bike and rower pacing variants the same way", () => {
    expect(cardioSwapFamilyId("zone2_bike")).toBe("bike:");
    expect(cardioSwapFamilyId("assault_bike_steady")).toBe("bike:");
    expect(cardioSwapFamilyId("assault_bike_intervals")).toBe("bike:");
    expect(cardioSwapFamilyId("rower")).toBe("rower:");
    expect(cardioSwapFamilyId("zone2_rower")).toBe("rower:");
    expect(cardioSwapFamilyId("rower_threshold_intervals")).toBe("rower:");
  });

  it("does not assign a family to strength lifts", () => {
    expect(cardioSwapFamilyId("barbell_back_squat")).toBeUndefined();
    expect(cardioSwapFamilyId("cable_row")).toBeUndefined();
    expect(cardioSwapFamilyId("barbell_row")).toBeUndefined();
  });
});

describe("diversifySwapSuggestionOrder", () => {
  function opts(...ids: string[]) {
    return ids.map((id) => ({ id, name: id }));
  }

  it("keeps an incline-walk regression and distinct machines ahead of treadmill pacing variants", () => {
    const reordered = diversifySwapSuggestionOrder(
      "treadmill_run",
      opts(
        "treadmill_incline_walk",
        "treadmill_intervals",
        "zone2_treadmill",
        "elliptical",
        "rower"
      )
    );
    expect(reordered.map((x) => x.id)).toEqual([
      "treadmill_incline_walk",
      "elliptical",
      "rower",
      "treadmill_intervals",
      "zone2_treadmill",
    ]);
  });

  it("does not fill the first page with bike pacing variants when other machines exist", () => {
    const reordered = diversifySwapSuggestionOrder(
      "zone2_bike",
      opts("assault_bike_steady", "assault_bike_intervals", "rower", "ski_erg")
    );
    expect(reordered.slice(0, 3).map((x) => x.id)).toEqual(["rower", "ski_erg", "assault_bike_steady"]);
    expect(isSameCardioSwapFamily("zone2_bike", "assault_bike_steady")).toBe(true);
  });

  it("leaves strength swap order unchanged", () => {
    const ids = ["front_squat", "goblet_squat", "leg_press", "lunge"];
    const reordered = diversifySwapSuggestionOrder("squat", opts(...ids));
    expect(reordered.map((x) => x.id)).toEqual(ids);
  });
});
