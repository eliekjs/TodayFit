/**
 * Day-level workout title formatting.
 * Format: "{Goal} - {Body Emphasis}" or "{Goal} - {Body Emphasis} ({Specific Focus})".
 * Only include specific body-part focus in the title when it is relevant to that day's body emphasis.
 */

import type { SpecificBodyFocusKey } from "./types";

/** Body emphasis display labels. */
export const BODY_EMPHASIS_LABELS: Record<"upper" | "lower" | "full", string> = {
  upper: "Upper Body",
  lower: "Lower Body",
  full: "Full Body",
};

/** Specific body-part key to title fragment (e.g. "Glute Focus", "Shoulder + Back Focus"). */
export const SPECIFIC_FOCUS_LABELS: Record<string, string> = {
  glutes: "Glute",
  quad: "Quad",
  posterior: "Posterior",
  shoulders: "Shoulder",
  back: "Back",
  push: "Push",
  pull: "Pull",
  core: "Core",
};

/**
 * Which body-emphasis day types each specific focus applies to (for naming and application).
 * Upper-specific: upper + full; Lower-specific: lower + full; Core: all.
 */
export const SPECIFIC_FOCUS_APPLIES_TO: Record<SpecificBodyFocusKey, ("upper" | "lower" | "full")[]> = {
  glutes: ["lower", "full"],
  quad: ["lower", "full"],
  posterior: ["lower", "full"],
  shoulders: ["upper", "full"],
  back: ["upper", "full"],
  push: ["upper", "full"],
  pull: ["upper", "full"],
  core: ["upper", "lower", "full"],
};

/**
 * Returns whether a specific body-part focus should be included in the title for the given body emphasis.
 */
export function isSpecificFocusRelevantForBody(
  specificKey: string,
  bodyEmphasis: "upper" | "lower" | "full"
): boolean {
  const key = specificKey as SpecificBodyFocusKey;
  const applies = SPECIFIC_FOCUS_APPLIES_TO[key];
  return applies ? applies.includes(bodyEmphasis) : false;
}

/**
 * Format a day title: Goal - Body Emphasis (Specific Focus when relevant).
 * Examples:
 * - "Sports Conditioning - Upper Body"
 * - "Hypertrophy - Lower Body (Glute Focus)"
 * - "Strength - Full Body (Shoulder + Back Focus)"
 */
export function formatDayTitle(
  goalLabel: string,
  bodyEmphasis: "upper" | "lower" | "full",
  specificFocusKeys?: string[] | null
): string {
  const bodyLabel = BODY_EMPHASIS_LABELS[bodyEmphasis];
  const base = `${goalLabel} - ${bodyLabel}`;
  if (!specificFocusKeys?.length) return base;
  const relevant = specificFocusKeys.filter((k) =>
    isSpecificFocusRelevantForBody(k, bodyEmphasis)
  );
  if (relevant.length === 0) return base;
  const focusParts = relevant
    .map((k) => SPECIFIC_FOCUS_LABELS[k] ?? k.charAt(0).toUpperCase() + k.slice(1))
    .filter(Boolean);
  const focusLabel = focusParts.join(" + ");
  return `${base} (${focusLabel} Focus)`;
}

/**
 * Normalize goal slug or label to a short display label for titles.
 * Uses GOAL_SLUG_TO_LABEL for slugs; passes through if already a known label.
 */
export function goalDisplayLabel(
  goalSlugOrLabel: string,
  slugToLabel: Record<string, string>
): string {
  const lower = goalSlugOrLabel.toLowerCase().replace(/\s+/g, "_");
  return slugToLabel[lower] ?? slugToLabel[goalSlugOrLabel] ?? goalSlugOrLabel;
}
