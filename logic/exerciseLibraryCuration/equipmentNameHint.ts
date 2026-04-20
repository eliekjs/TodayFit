/**
 * Shared name/slug/catalog text → equipment_class hint (phase 2 + phase 3).
 * Order matters: more specific implements before generic bodyweight.
 */

import type { CurationEquipmentClass } from "./enums";

const EQUIP_ORDER: { kw: RegExp; value: CurationEquipmentClass }[] = [
  { kw: /(?:^|_)kb(?:_|$)|\bkettlebell/i, value: "kettlebell" },
  { kw: /\b(?:dumbbell|dumbbells)\b|(?:^|_)db(?:_|$)|\bdb\b/i, value: "dumbbell" },
  { kw: /barbell|\bbb\b(?![a-z])/i, value: "barbell" },
  { kw: /cable\b/i, value: "cable" },
  { kw: /\b(smith machine|leg press|pec deck|hack squat)\b/i, value: "machine" },
  { kw: /(?:^|_)trx(?:_|$)|suspension/i, value: "specialty" },
  { kw: /\bband\b|resistance band/i, value: "band" },
  { kw: /treadmill|row(er|ing)? machine|assault bike|spin bike|elliptical|stair climber/i, value: "cardio_machine" },
  { kw: /bodyweight|calisthenics|no equipment|air squat|push-?up|pull-?up/i, value: "bodyweight" },
];

/**
 * Best single equipment_class hint from catalog equipment slugs, exercise id, and display name.
 */
export function inferEquipmentFromCatalogAndText(
  equipmentSlugs: readonly string[],
  exerciseId: string,
  displayName: string
): CurationEquipmentClass | null {
  const blob = `${equipmentSlugs.join(" ")} ${exerciseId.replace(/_/g, " ")} ${displayName}`.toLowerCase();
  for (const { kw, value } of EQUIP_ORDER) {
    if (kw.test(blob)) return value;
  }
  return null;
}
