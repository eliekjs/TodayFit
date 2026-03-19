import type { SubFocusProfile } from "../../data/goalSubFocus/types";
import { getConditioningIntentSlugs } from "../../data/goalSubFocus/conditioningSubFocus";

export type ConditioningIntentFormat =
  | "zone2_sustained"
  | "threshold_intervals"
  | "hills_repeats";

/**
 * Resolve an explicit conditioning "format" from resolved intent sub-focuses.
 *
 * IMPORTANT:
 * - Overlays must NOT influence format selection (only intent slugs are considered).
 * - If no matching intent is present, return null to keep existing default behavior.
 */
export function resolveConditioningIntentFormatFromIntent(
  profile: SubFocusProfile | null | undefined
): ConditioningIntentFormat | null {
  if (!profile) return null;

  // Scope per spec: these explicit conditioning format overrides are for the `conditioning` goal path.
  if (profile.goalSlug !== "conditioning") return null;

  // Intent slugs are already "effectiveSubFocusSlugs minus overlays" per resolver architecture.
  const intentSlugs = getConditioningIntentSlugs(profile);

  // Precedence order (required): zone2 -> threshold -> hills
  if (intentSlugs.includes("zone2_aerobic_base")) return "zone2_sustained";
  if (intentSlugs.includes("threshold_tempo")) return "threshold_intervals";
  if (intentSlugs.includes("hills")) return "hills_repeats";

  return null;
}

