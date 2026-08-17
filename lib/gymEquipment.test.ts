import { describe, expect, it } from "vitest";
import {
  DEDICATED_MACHINE_EQUIPMENT,
  resolveEffectiveEquipment,
} from "./gymEquipment";

describe("resolveEffectiveEquipment", () => {
  it("always includes bodyweight even when the profile only lists free weights", () => {
    const resolved = resolveEffectiveEquipment(["barbell", "dumbbells", "bench"]);
    expect(resolved).toContain("bodyweight");
    expect(resolved).toContain("barbell");
  });

  it("adds machine when any dedicated machine station is selected", () => {
    for (const key of DEDICATED_MACHINE_EQUIPMENT) {
      const resolved = resolveEffectiveEquipment(["bodyweight", key]);
      expect(resolved).toContain("machine");
    }
  });
});
