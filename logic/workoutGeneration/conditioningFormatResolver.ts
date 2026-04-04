import type { SubFocusProfile } from "../../data/goalSubFocus/types";
import {
  getConditioningIntentSlugs,
  getPrimaryConditioningIntent,
} from "../../data/goalSubFocus/conditioningSubFocus";

export type ConditioningIntentFormat =
  | "zone2_sustained"
  | "threshold_intervals"
  | "hills_repeats"
  | "durability_time_circuit";

/**
 * Resolve an explicit conditioning "format" from resolved intent sub-focuses.
 *
 * IMPORTANT:
 * - Overlays must NOT influence format selection (only intent slugs are considered).
 * - If no matching intent is present, return null to keep existing default behavior.
 * - `endurance` goal uses the same time-based formats (UI slugs: zone2_long_steady, etc.).
 * - Primary ranked intent wins when present; fallbacks preserve legacy includes() behavior.
 */
export function resolveConditioningIntentFormatFromIntent(
  profile: SubFocusProfile | null | undefined
): ConditioningIntentFormat | null {
  if (!profile) return null;

  const goal = profile.goalSlug;
  if (goal !== "conditioning" && goal !== "endurance") return null;

  const intentSlugs = getConditioningIntentSlugs(profile);
  const primary = getPrimaryConditioningIntent(profile);

  // HIIT / intervals: dedicated interval builder in dailyGenerator (not zone2/threshold/hills templates).
  if (
    primary === "intervals_hiit" ||
    primary === "intervals" ||
    profile.templateHints?.includes("hiit_intervals")
  ) {
    return null;
  }

  if (primary === "zone2_aerobic_base" || primary === "zone2_long_steady") {
    return "zone2_sustained";
  }
  if (primary === "threshold_tempo") return "threshold_intervals";
  if (primary === "hills") return "hills_repeats";
  if (primary === "durability") return "durability_time_circuit";

  // Legacy fallback: any matching slug in ranked list (non-primary edge cases).
  if (goal === "conditioning") {
    if (intentSlugs.includes("zone2_aerobic_base")) return "zone2_sustained";
    if (intentSlugs.includes("threshold_tempo")) return "threshold_intervals";
    if (intentSlugs.includes("hills")) return "hills_repeats";
  }
  if (goal === "endurance") {
    if (intentSlugs.includes("zone2_long_steady")) return "zone2_sustained";
    if (intentSlugs.includes("threshold_tempo")) return "threshold_intervals";
    if (intentSlugs.includes("hills")) return "hills_repeats";
    if (intentSlugs.includes("durability")) return "durability_time_circuit";
  }

  return null;
}

