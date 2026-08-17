import { EQUIPMENT_BY_CATEGORY, type GymProfile } from "../data/gymProfiles";
import type { EquipmentKey } from "./types";
import { isHiddenGymEquipment } from "./gymEquipment";
import { formatItemList } from "./formatItemList";

export function equipmentLabelForKey(key: string): string {
  for (const cat of EQUIPMENT_BY_CATEGORY) {
    const opt = cat.options.find((o) => o.id === key);
    if (opt) {
      return opt.label;
    }
  }
  return key.replace(/_/g, " ");
}

export type GymProfileEquipmentSummary = {
  itemCount: number;
  categoryLine: string;
  highlightLine: string;
};

/** Read-only summary for gym selection UI (category counts + short equipment list). */
export function summarizeGymProfileEquipment(
  profile: GymProfile
): GymProfileEquipmentSummary {
  const equipment = profile.equipment.filter(
    (key) => !isHiddenGymEquipment(key as EquipmentKey)
  );

  const categoryParts: string[] = [];
  for (const cat of EQUIPMENT_BY_CATEGORY) {
    const count = cat.options.filter((opt) => equipment.includes(opt.id)).length;
    if (count > 0) categoryParts.push(`${cat.category} (${count})`);
  }

  const labels = equipment.map(equipmentLabelForKey);
  const highlightLine =
    labels.length > 0 ? formatItemList(labels) : "No equipment selected yet";

  return {
    itemCount: equipment.length,
    categoryLine: categoryParts.join(" · "),
    highlightLine,
  };
}
