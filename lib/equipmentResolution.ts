import { normalizeEquipmentSlug } from "./ontology/legacyMapping";
import { normalizeSlug } from "./ontology/vocabularies";
import type { EquipmentKey } from "./types";

/**
 * Infer canonical equipment slugs from exercise id + display name.
 * Used when catalog rows are mis-tagged (often bodyweight-only on imported FF/OTA rows).
 */
export function inferImplementsFromExerciseName(idName: string): EquipmentKey[] {
  const n = normalizeSlug(idName).replace(/_/g, " ");

  if (/\blandmine\b/.test(n)) return ["barbell", "plates"];
  if (/\bclubbell\b/.test(n)) return ["clubbell"];
  if (/\bindian club\b|\bindian clubs\b/.test(n)) return ["indian_club"];
  if (/\bsmith machine\b|\bsmith_machine\b/.test(n)) return ["smith_machine"];
  if (/\bmacebell\b/.test(n)) return ["macebell"];
  if (/\bsteel mace\b/.test(n)) return ["steel_mace"];
  if (/\bmace\b/.test(n) && !/\bmacebell\b/.test(n)) return ["steel_mace"];

  if (/\bbench press\b|\bclose grip bench\b|\blarsen bench\b/.test(n)) {
    if (/\bez bar\b|\bcurl bar\b/.test(n)) return ["ez_bar", "bench"];
    if (/\bdumbbell\b|\bdb\b/.test(n)) return ["dumbbells", "bench"];
    return ["barbell", "bench"];
  }

  if (/\bkettlebell\b|\bkb\b/.test(n)) return ["kettlebells"];
  if (/\bdumbbell\b|\bdb\b/.test(n)) return ["dumbbells"];
  if (/\btrap bar\b|\bhex bar\b/.test(n)) return ["trap_bar"];
  if (/\bez bar\b|\bcurl bar\b/.test(n)) return ["ez_bar"];
  if (/\bcable\b/.test(n)) return ["cable_machine"];
  if (/\bbarbell\b|\bbb\b/.test(n)) return ["barbell"];
  if (/\btrx\b|suspension trainer/.test(n)) return ["trx"];

  if (/\blat pulldown\b|\bpulldown\b/.test(n) && !/\bstraight arm\b/.test(n)) {
    return ["cable_machine", "lat_pulldown"];
  }
  if (/\bleg press\b/.test(n)) return ["leg_press"];
  if (/\bchest press\b/.test(n) && /\bmachine\b/.test(n)) return ["chest_press"];
  if (/\bhamstring curl\b|\bleg curl machine\b/.test(n)) return ["hamstring_curl"];
  if (/\bleg extension\b/.test(n)) return ["leg_extension"];

  if (/\btreadmill\b/.test(n)) return ["treadmill"];
  if (/\brower\b|\browing machine\b/.test(n)) return ["rower"];
  if (/\bassault bike\b|\bair bike\b/.test(n)) return ["assault_bike"];
  if (/\bski erg\b/.test(n)) return ["ski_erg"];
  if (/\bstair climber\b|\bstepper\b/.test(n)) return ["stair_climber"];
  if (/\belliptical\b/.test(n)) return ["elliptical"];

  return [];
}

/**
 * Resolve stored catalog equipment + name hints into generator `equipment_required` slugs.
 */
export function resolveExerciseEquipmentRequired(
  storedEquipment: readonly string[],
  exerciseId: string,
  exerciseName: string
): EquipmentKey[] {
  const normalized = [
    ...new Set(
      storedEquipment
        .map((eq) => normalizeEquipmentSlug(String(eq)))
        .filter((eq) => eq.length > 0)
    ),
  ];

  const idName = normalizeSlug(`${exerciseId} ${exerciseName}`);
  const inferred = inferImplementsFromExerciseName(idName);

  if (inferred.length === 0) {
    return normalized.length > 0 ? (normalized as EquipmentKey[]) : ["bodyweight"];
  }

  const accessoryEquipment = new Set<EquipmentKey>([
    "bench",
    "adjustable_bench",
    "plyo_box",
    "pullup_bar",
    "rings",
    "sled",
    "foam_roller",
  ]);
  const nonBodyweightStored = normalized.filter((eq) => eq !== "bodyweight");
  const accessories = nonBodyweightStored.filter((eq) =>
    accessoryEquipment.has(eq as EquipmentKey)
  );
  const merged = [...new Set([...inferred, ...accessories])] as EquipmentKey[];
  return merged.length > 0 ? merged : ["bodyweight"];
}

/** Profile equipment implied by other selections (for availability filtering). */
export const IMPLIED_PROFILE_EQUIPMENT: Readonly<
  Record<string, readonly EquipmentKey[]>
> = {
  adjustable_bench: ["bench"],
  barbell: ["plates"],
  lat_pulldown: ["cable_machine"],
};

export function expandProfileEquipmentForFiltering(
  equipment: readonly EquipmentKey[]
): EquipmentKey[] {
  const resolved = new Set<EquipmentKey>(equipment);
  for (const key of equipment) {
    for (const implied of IMPLIED_PROFILE_EQUIPMENT[key] ?? []) {
      resolved.add(implied);
    }
  }
  return [...resolved];
}
