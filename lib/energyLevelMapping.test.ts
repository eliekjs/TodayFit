import { describe, it, expect } from "vitest";
import {
  energyFromSportIntensity,
  sportIntensityDisplayLabel,
  sportIntensityFromEnergy,
} from "./energyLevelMapping";

describe("energyLevelMapping", () => {
  it("maps sport intensity chips to generator energy", () => {
    expect(energyFromSportIntensity("Fresh")).toBe("high");
    expect(energyFromSportIntensity("Moderate")).toBe("medium");
    expect(energyFromSportIntensity("Fatigued")).toBe("low");
  });

  it("maps generator energy back to sport intensity chips", () => {
    expect(sportIntensityFromEnergy("high")).toBe("Fresh");
    expect(sportIntensityFromEnergy("medium")).toBe("Moderate");
    expect(sportIntensityFromEnergy("low")).toBe("Fatigued");
    expect(sportIntensityFromEnergy(null)).toBe("Moderate");
  });

  it("maps sport intensity chips to manual-mode display labels", () => {
    expect(sportIntensityDisplayLabel("Fresh")).toBe("Low");
    expect(sportIntensityDisplayLabel("Moderate")).toBe("Medium");
    expect(sportIntensityDisplayLabel("Fatigued")).toBe("High");
  });
});
