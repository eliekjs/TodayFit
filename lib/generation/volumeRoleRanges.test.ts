import { describe, expect, it } from "vitest";
import {
  getVolumeRoleSpec,
  inferStrengthVolumeRole,
  remapItemPrescriptionForVolumePreference,
  resolveRoleVolumePrescription,
} from "./volumeRoleRanges";

describe("volumeRoleRanges", () => {
  it("maps Balanced primary to 3–4 × 5–8 (medium energy = mid of band)", () => {
    const spec = getVolumeRoleSpec("standard", "primary");
    expect(spec.sets).toEqual({ min: 3, max: 4 });
    expect(spec.reps).toEqual({ min: 5, max: 8 });
    const mid = resolveRoleVolumePrescription("primary", "standard", "medium");
    expect(mid.baseSets).toBe(4);
    expect(mid.reps).toBe(7);
  });

  it("Strength Focused accessory uses 2–3 × 8–12", () => {
    const low = resolveRoleVolumePrescription("accessory", "conservative", "low");
    const high = resolveRoleVolumePrescription("accessory", "conservative", "high");
    expect(low).toEqual({ reps: 8, baseSets: 2 });
    expect(high).toEqual({ reps: 12, baseSets: 3 });
  });

  it("High Volume accessory is 3–4 × 12–15", () => {
    const mid = resolveRoleVolumePrescription("accessory", "high_volume", "medium");
    expect(mid.baseSets).toBe(4);
    expect(mid.reps).toBe(14);
  });

  it("remaps rep-based items onto the preference table", () => {
    const remapped = remapItemPrescriptionForVolumePreference(
      { sets: 3, reps: 8 },
      "primary",
      "high_volume",
      "medium"
    );
    expect(remapped).toEqual({ sets: 4, reps: 8 });
  });

  it("skips time-based items when remapping volume", () => {
    expect(
      remapItemPrescriptionForVolumePreference(
        { sets: 3, time_seconds: 45 },
        "accessory",
        "high_volume",
        "medium"
      )
    ).toBeNull();
  });

  it("secondary Balanced is ~3 × 8–10, distinct from primary", () => {
    const spec = getVolumeRoleSpec("standard", "secondary");
    expect(spec.sets).toEqual({ min: 3, max: 3 });
    expect(spec.reps).toEqual({ min: 8, max: 10 });
    const mid = resolveRoleVolumePrescription("secondary", "standard", "medium");
    expect(mid.baseSets).toBe(3);
    expect(mid.reps).toBe(9);
  });

  it("null preference behaves as Balanced", () => {
    expect(getVolumeRoleSpec(null, "primary")).toEqual(getVolumeRoleSpec("standard", "primary"));
  });

  it("infers accessory for hypertrophy and accessory blocks", () => {
    expect(inferStrengthVolumeRole({ blockType: "accessory" })).toBe("accessory");
    expect(inferStrengthVolumeRole({ blockType: "main_hypertrophy" })).toBe("accessory");
    expect(inferStrengthVolumeRole({ blockType: "main_strength", isAccessory: true })).toBe(
      "accessory"
    );
    expect(inferStrengthVolumeRole({ blockType: "main_strength" })).toBe("primary");
    expect(inferStrengthVolumeRole({ blockType: "power" })).toBeUndefined();
    expect(inferStrengthVolumeRole({ blockType: "conditioning" })).toBeUndefined();
  });
});
