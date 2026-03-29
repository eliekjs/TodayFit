import type { SportPatternSlotRule } from "./types";

/**
 * Find the slot rule whose `blockTypes` contains the normalized block type (e.g. main_strength).
 */
export function getSportPatternSlotRuleForBlockType(
  blockType: string,
  slots: readonly SportPatternSlotRule[]
): SportPatternSlotRule | undefined {
  const bt = blockType.toLowerCase().replace(/\s/g, "_");
  return slots.find((s) => s.blockTypes.includes(bt));
}
