import { expandProfileEquipmentForFiltering } from "./equipmentResolution";
import type { EquipmentKey } from "./types";

/**
 * Dedicated selectorized / plate-loaded stations. Selecting any of these implies access
 * to other specialty machines (hack squat, pec deck, GHD, etc.) without asking users
 * to toggle a vague "Other Machine" option.
 *
 * Cable stations are excluded — a home gym may have cables but not plate-loaded machines.
 */
export const DEDICATED_MACHINE_EQUIPMENT: readonly EquipmentKey[] = [
  "leg_press",
  "lat_pulldown",
  "chest_press",
  "hamstring_curl",
  "leg_extension",
] as const;

const DEDICATED_MACHINE_SET = new Set<string>(DEDICATED_MACHINE_EQUIPMENT);

/** Equipment slugs stored on profiles but not shown in the gym profile picker. */
export const HIDDEN_GYM_EQUIPMENT: readonly EquipmentKey[] = ["machine"] as const;

const HIDDEN_GYM_EQUIPMENT_SET = new Set<string>(HIDDEN_GYM_EQUIPMENT);

/** Equipment slugs removed from the gym profile picker but may still appear on legacy profiles. */
export const RETIRED_GYM_EQUIPMENT: readonly string[] = ["gada"] as const;

const RETIRED_GYM_EQUIPMENT_SET = new Set<string>(RETIRED_GYM_EQUIPMENT);

export function isHiddenGymEquipment(key: EquipmentKey): boolean {
  return HIDDEN_GYM_EQUIPMENT_SET.has(key);
}

/**
 * Expand a gym profile's stored equipment for workout filtering.
 * Adds generic `machine` when the user has any dedicated machine station selected.
 */
export function resolveEffectiveEquipment(
  equipment: readonly EquipmentKey[]
): EquipmentKey[] {
  const expanded = expandProfileEquipmentForFiltering(equipment);
  const resolved = new Set<EquipmentKey>(expanded);
  const hasDedicatedMachine = expanded.some((key) =>
    DEDICATED_MACHINE_SET.has(key)
  );
  if (hasDedicatedMachine) {
    resolved.add("machine");
  }
  return [...resolved];
}

/**
 * Normalize stored profile equipment when saving or applying templates.
 * Drops the legacy explicit `machine` toggle — it is implied at generation time.
 */
export function normalizeStoredGymEquipment(
  equipment: readonly string[]
): EquipmentKey[] {
  return equipment.filter(
    (key): key is EquipmentKey =>
      !RETIRED_GYM_EQUIPMENT_SET.has(key) && !isHiddenGymEquipment(key as EquipmentKey)
  );
}
