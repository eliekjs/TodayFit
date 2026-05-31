import { describe, expect, it } from "vitest";
import {
  DEDICATED_MACHINE_EQUIPMENT,
  normalizeStoredGymEquipment,
  resolveEffectiveEquipment,
} from "./gymEquipment";
import type { EquipmentKey } from "./types";

describe("resolveEffectiveEquipment", () => {
  it("adds machine when any dedicated machine station is selected", () => {
    for (const key of DEDICATED_MACHINE_EQUIPMENT) {
      const resolved = resolveEffectiveEquipment(["bodyweight", key]);
      expect(resolved).toContain("machine");
    }
  });

  it("does not add machine for cable-only setups", () => {
    const resolved = resolveEffectiveEquipment([
      "cable_machine",
      "dumbbells",
      "bodyweight",
    ]);
    expect(resolved).not.toContain("machine");
  });

  it("preserves all original selections", () => {
    const input: EquipmentKey[] = ["leg_press", "barbell", "bodyweight"];
    expect(resolveEffectiveEquipment(input)).toEqual(
      expect.arrayContaining(input)
    );
  });
});

describe("normalizeStoredGymEquipment", () => {
  it("removes legacy explicit machine toggle from stored profiles", () => {
    const normalized = normalizeStoredGymEquipment([
      "leg_press",
      "machine",
      "bodyweight",
    ]);
    expect(normalized).toEqual(["leg_press", "bodyweight"]);
  });
});
