/**
 * Athletic Performance sub-focus → internal generator archetype routing.
 * User-facing goal is one umbrella (`Athletic Performance`); power / conditioning /
 * athletic_performance remain internal buckets for exercise tags, block policy, and prescription.
 */

import type { VerticalJumpIntentInput } from "../sportSubFocus/verticalJumpSubFocusShared";

export type AthleticSubFocusArchetype = "power" | "conditioning" | "athletic_performance";

/** Legacy primary-focus labels consolidated under Athletic Performance (persisted presets). */
export const LEGACY_ATHLETIC_PRIMARY_FOCUS_LABELS = [
  "Power & Explosiveness",
  "Sport Conditioning",
] as const;

export type LegacyAthleticPrimaryFocusLabel = (typeof LEGACY_ATHLETIC_PRIMARY_FOCUS_LABELS)[number];

export const ATHLETIC_PERFORMANCE_PRIMARY_LABEL = "Athletic Performance";

/** Sub-focus slug → internal archetype bucket for goal_sub_focus merge. */
export const ATHLETIC_SUB_FOCUS_ARCHETYPE: Record<string, AthleticSubFocusArchetype> = {
  // Speed / agility / jump (athletic_performance bucket)
  speed_sprint: "athletic_performance",
  sprint: "athletic_performance",
  vertical_jump: "athletic_performance",
  power_explosive: "athletic_performance",
  agility_cod: "athletic_performance",
  // Power development (power bucket)
  lower_body_power_plyos: "power",
  olympic_triple_extension: "power",
  upper_body_power: "power",
  // Engine / sport conditioning (conditioning bucket)
  zone2_aerobic_base: "conditioning",
  intervals_hiit: "conditioning",
  threshold_tempo: "conditioning",
  hills: "conditioning",
  // Overlays — stay under athletic_performance for body-region bias
  core: "athletic_performance",
  upper: "athletic_performance",
  lower: "athletic_performance",
  full_body: "athletic_performance",
};

/** Resolve archetype for a sub-focus slug; unknown slugs default to athletic_performance. */
export function archetypeForAthleticSubFocusSlug(subFocusSlug: string): AthleticSubFocusArchetype {
  return ATHLETIC_SUB_FOCUS_ARCHETYPE[subFocusSlug] ?? "athletic_performance";
}

/** True when this primary label is the active umbrella or a legacy alias. */
export function isAthleticUmbrellaPrimaryLabel(label: string): boolean {
  const canon = label.trim();
  return (
    canon === ATHLETIC_PERFORMANCE_PRIMARY_LABEL ||
    (LEGACY_ATHLETIC_PRIMARY_FOCUS_LABELS as readonly string[]).includes(canon)
  );
}

/**
 * Map legacy primary label → canonical Athletic Performance label.
 * Other labels pass through unchanged.
 */
export function canonicalAthleticPrimaryFocusLabel(label: string): string {
  if ((LEGACY_ATHLETIC_PRIMARY_FOCUS_LABELS as readonly string[]).includes(label.trim())) {
    return ATHLETIC_PERFORMANCE_PRIMARY_LABEL;
  }
  return label;
}

/**
 * Migrate persisted `primaryFocus` + `subFocusByGoal` from legacy Power / Sport Conditioning
 * into a single Athletic Performance entry (subs merged, deduped by display name).
 */
export function migrateLegacyAthleticPreferences(input: {
  primaryFocus: string[];
  subFocusByGoal: Record<string, string[]>;
}): { primaryFocus: string[]; subFocusByGoal: Record<string, string[]> } {
  const legacySet = new Set<string>(LEGACY_ATHLETIC_PRIMARY_FOCUS_LABELS);
  const hasLegacy =
    input.primaryFocus.some((l) => legacySet.has(l)) ||
    Object.keys(input.subFocusByGoal).some((k) => legacySet.has(k));

  if (!hasLegacy) {
    return { primaryFocus: [...input.primaryFocus], subFocusByGoal: { ...input.subFocusByGoal } };
  }

  const athleticSubs = new Set<string>(
    input.subFocusByGoal[ATHLETIC_PERFORMANCE_PRIMARY_LABEL] ?? []
  );
  for (const legacy of LEGACY_ATHLETIC_PRIMARY_FOCUS_LABELS) {
    for (const sub of input.subFocusByGoal[legacy] ?? []) {
      athleticSubs.add(sub);
    }
    if (!(input.subFocusByGoal[legacy]?.length)) {
      if (legacy === "Sport Conditioning") {
        athleticSubs.add("Intervals / HIIT");
      }
    }
  }

  const primaryFocus: string[] = [];
  const seenCanon = new Set<string>();
  for (const label of input.primaryFocus) {
    const canon = canonicalAthleticPrimaryFocusLabel(label);
    if (seenCanon.has(canon)) continue;
    seenCanon.add(canon);
    primaryFocus.push(canon);
  }

  const subFocusByGoal: Record<string, string[]> = {};
  for (const [goalLabel, subs] of Object.entries(input.subFocusByGoal)) {
    if (legacySet.has(goalLabel)) continue;
    if (subs?.length) subFocusByGoal[goalLabel] = [...subs];
  }
  if (athleticSubs.size > 0) {
    subFocusByGoal[ATHLETIC_PERFORMANCE_PRIMARY_LABEL] = [...athleticSubs];
  }

  return { primaryFocus, subFocusByGoal };
}

/** Goal slug to use when merging a sub-focus selected under Athletic Performance. */
export function goalSlugForAthleticSubFocus(subFocusSlug: string): AthleticSubFocusArchetype {
  return archetypeForAthleticSubFocusSlug(subFocusSlug);
}

/** Sub-focus slugs that should trigger dedicated power-block assembly under Athletic Performance. */
export const POWER_BLOCK_SUB_FOCUS_SLUGS = new Set<string>([
  "lower_body_power_plyos",
  "olympic_triple_extension",
  "upper_body_power",
  "vertical_jump",
  "speed_sprint",
  "sprint",
  "power_explosive",
  "agility_cod",
]);

/** True when routed goal_sub_focus includes subs that need a power block. */
export function sessionHasPowerBlockSubFocus(input: {
  goal_sub_focus?: Record<string, string[] | undefined>;
}): boolean {
  const slugs = [
    ...(input.goal_sub_focus?.power ?? []),
    ...(input.goal_sub_focus?.athletic_performance ?? []),
  ];
  return slugs.some((s) => POWER_BLOCK_SUB_FOCUS_SLUGS.has(s));
}

/** Whether the session should assemble a dedicated power block (primary power or athletic + power-style subs). */
export function sessionAssemblesPowerBlock(
  input: VerticalJumpIntentInput & {
    primary_goal?: string;
    goal_sub_focus?: Record<string, string[] | undefined>;
  }
): boolean {
  if (input.primary_goal === "power") return true;
  if (input.primary_goal === "athletic_performance") {
    if (sessionHasPowerBlockSubFocus(input)) return true;
  }
  return false;
}

/** Whether routed conditioning subs should drive conditioning-block policy. */
export function sessionHasRoutedConditioningSubFocus(input: {
  goal_sub_focus?: Record<string, string[] | undefined>;
}): boolean {
  return (input.goal_sub_focus?.conditioning?.length ?? 0) > 0;
}

/** Body-region overlay subs that stay in the athletic_performance bucket but don't imply strength/power work. */
const ATHLETIC_OVERLAY_SUB_FOCUS_SLUGS = new Set(["core", "upper", "lower", "full_body"]);

/**
 * True when an athletic_performance session's routed subs are conditioning-only
 * (engine work like intervals / zone2 / threshold / hills, plus optional body-region overlays).
 * Such sessions should assemble via the conditioning main path (e.g. dedicated HIIT intervals
 * block) rather than strength/power blocks with a small cardio finisher — this preserves the
 * legacy Sport Conditioning session shape after goal consolidation.
 */
export function athleticSessionIsConditioningDominant(input: {
  primary_goal?: string;
  goal_sub_focus?: Record<string, string[] | undefined>;
}): boolean {
  if (input.primary_goal !== "athletic_performance") return false;
  if (!sessionHasRoutedConditioningSubFocus(input)) return false;
  if ((input.goal_sub_focus?.power?.length ?? 0) > 0) return false;
  const athleticSubs = input.goal_sub_focus?.athletic_performance ?? [];
  return athleticSubs.every((s) => ATHLETIC_OVERLAY_SUB_FOCUS_SLUGS.has(s));
}
