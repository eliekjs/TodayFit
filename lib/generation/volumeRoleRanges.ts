/**
 * Programming volume tables by session role (primary / secondary / accessory).
 * Selected via ManualPreferences.volumePreference; keys stay conservative | standard | high_volume.
 *
 * Power, conditioning, and support/mobility keep their own prescription paths.
 */

import type { EnergyLevel, VolumePreference } from "../types";

export type StrengthVolumeRole = "primary" | "secondary" | "accessory";

export type VolumeRoleSpec = {
  sets: { min: number; max: number };
  reps: { min: number; max: number };
};

/**
 * Strength Focused → conservative
 * Balanced → standard (default)
 * High Volume → high_volume
 */
export const VOLUME_ROLE_RANGES: Record<
  VolumePreference,
  Record<StrengthVolumeRole, VolumeRoleSpec>
> = {
  conservative: {
    primary: { sets: { min: 3, max: 5 }, reps: { min: 3, max: 6 } },
    secondary: { sets: { min: 3, max: 3 }, reps: { min: 5, max: 8 } },
    accessory: { sets: { min: 2, max: 3 }, reps: { min: 8, max: 12 } },
  },
  standard: {
    primary: { sets: { min: 3, max: 4 }, reps: { min: 5, max: 8 } },
    secondary: { sets: { min: 3, max: 3 }, reps: { min: 8, max: 10 } },
    accessory: { sets: { min: 2, max: 3 }, reps: { min: 10, max: 15 } },
  },
  high_volume: {
    primary: { sets: { min: 3, max: 4 }, reps: { min: 6, max: 10 } },
    secondary: { sets: { min: 3, max: 4 }, reps: { min: 8, max: 12 } },
    accessory: { sets: { min: 3, max: 4 }, reps: { min: 12, max: 15 } },
  },
};

export function normalizeVolumePreference(
  preference: VolumePreference | null | undefined
): VolumePreference {
  return preference ?? "standard";
}

export function getVolumeRoleSpec(
  preference: VolumePreference | null | undefined,
  role: StrengthVolumeRole
): VolumeRoleSpec {
  return VOLUME_ROLE_RANGES[normalizeVolumePreference(preference)][role];
}

/** Map generator block context → a strength volume role, or undefined (use goal/power paths). */
export function inferStrengthVolumeRole(args: {
  blockType: string;
  isAccessory?: boolean;
}): StrengthVolumeRole | undefined {
  const type = args.blockType.toLowerCase().replace(/\s/g, "_");
  if (type === "power" || type === "warmup" || type === "cooldown" || type === "conditioning") {
    return undefined;
  }
  if (type === "mobility" || type === "recovery" || type === "core" || type === "prep" || type === "skill") {
    return undefined;
  }
  if (args.isAccessory || type === "accessory" || type === "main_hypertrophy") {
    return "accessory";
  }
  if (type === "main_strength") return "primary";
  return undefined;
}

function pickFromRange(range: { min: number; max: number }, energy: EnergyLevel): number {
  if (range.min === range.max) return range.min;
  if (energy === "low") return range.min;
  if (energy === "high") return range.max;
  return Math.round((range.min + range.max) / 2);
}

/** Sets/reps from the volume table; energy picks low / mid / high within the band. */
export function resolveRoleVolumePrescription(
  role: StrengthVolumeRole,
  preference: VolumePreference | null | undefined,
  energy: EnergyLevel
): { reps: number; baseSets: number } {
  const spec = getVolumeRoleSpec(preference, role);
  return {
    reps: pickFromRange(spec.reps, energy),
    baseSets: pickFromRange(spec.sets, energy),
  };
}

/**
 * Remap an existing rep-based item onto the volume table for a preference change.
 * Returns null when the item should stay unchanged (time-based / no reps).
 */
export function remapItemPrescriptionForVolumePreference(
  item: { reps?: number; time_seconds?: number },
  role: StrengthVolumeRole,
  preference: VolumePreference | null | undefined,
  energy: EnergyLevel
): { sets: number; reps: number } | null {
  if (item.time_seconds != null && item.time_seconds > 0) return null;
  if (item.reps == null) return null;
  const picked = resolveRoleVolumePrescription(role, preference, energy);
  return { sets: picked.baseSets, reps: picked.reps };
}
