/**
 * Endurance sport prep: joint-specific stability sub-goals (replace generic core_stability /
 * core_bracing where load-bearing joints matter more than trunk-only work).
 *
 * Used by `sportsWithSubFocuses`, `subFocusTagMap`, and default sub-focus ranking in
 * `starterExerciseRepository`.
 */

import type { SportSubFocus, SubFocusTagMapEntry } from "./types";

export type JointStabilitySubFocusSlug =
  | "knee_stability"
  | "ankle_stability"
  | "hip_stability"
  | "shoulder_stability";

/** Product mapping: which joint stability sub-goals each endurance-prep sport exposes. */
export const ENDURANCE_SPORT_JOINT_STABILITY_SLUGS: Readonly<
  Record<string, readonly JointStabilitySubFocusSlug[]>
> = {
  road_running: ["knee_stability", "ankle_stability"],
  trail_running: ["knee_stability"],
  cycling: ["hip_stability"],
  triathlon: ["shoulder_stability", "knee_stability"],
  rucking: ["knee_stability"],
  xc_skiing: ["knee_stability", "hip_stability"],
  rowing_erg: ["shoulder_stability", "hip_stability"],
  swimming_open_water: ["shoulder_stability"],
  backcountry_skiing: ["knee_stability", "ankle_stability"],
};

const JOINT_SUB_FOCUS_DISPLAY: Record<JointStabilitySubFocusSlug, string> = {
  knee_stability: "Knee Stability",
  ankle_stability: "Ankle Stability",
  hip_stability: "Hip Stability",
  shoulder_stability: "Shoulder Stability",
};

/** Generic trunk sub-focus slugs replaced by joint-specific stability on endurance sports. */
const ENDURANCE_TRUNK_STABILITY_SLUGS = new Set(["core_stability", "core_bracing"]);

export const SHARED_TAG_WEIGHTS_KNEE_STABILITY: SubFocusTagMapEntry[] = [
  { tag_slug: "knee_stability", weight: 1.3 },
  { tag_slug: "eccentric_quad_strength", weight: 1.1 },
  { tag_slug: "single_leg_strength", weight: 1 },
  { tag_slug: "balance", weight: 0.85 },
];

export const SHARED_TAG_WEIGHTS_ANKLE_STABILITY: SubFocusTagMapEntry[] = [
  { tag_slug: "ankle_stability", weight: 1.3 },
  { tag_slug: "balance", weight: 1.2 },
  { tag_slug: "single_leg_strength", weight: 1 },
  { tag_slug: "calves", weight: 0.9 },
];

export const SHARED_TAG_WEIGHTS_HIP_STABILITY: SubFocusTagMapEntry[] = [
  { tag_slug: "hip_stability", weight: 1.2 },
  { tag_slug: "glute_strength", weight: 1.1 },
  { tag_slug: "single_leg_strength", weight: 1 },
  { tag_slug: "mobility", weight: 0.85 },
];

export const SHARED_TAG_WEIGHTS_SHOULDER_STABILITY: SubFocusTagMapEntry[] = [
  { tag_slug: "shoulder_stability", weight: 1.2 },
  { tag_slug: "scapular_control", weight: 1.2 },
  { tag_slug: "scapular_strength", weight: 1 },
];

export const SHARED_JOINT_STABILITY_TAG_WEIGHTS: Record<
  JointStabilitySubFocusSlug,
  SubFocusTagMapEntry[]
> = {
  knee_stability: SHARED_TAG_WEIGHTS_KNEE_STABILITY,
  ankle_stability: SHARED_TAG_WEIGHTS_ANKLE_STABILITY,
  hip_stability: SHARED_TAG_WEIGHTS_HIP_STABILITY,
  shoulder_stability: SHARED_TAG_WEIGHTS_SHOULDER_STABILITY,
};

export function enduranceSportHasJointStabilityConfig(sportSlug: string): boolean {
  return sportSlug in ENDURANCE_SPORT_JOINT_STABILITY_SLUGS;
}

/**
 * Replace generic core stability with sport-relevant joint stability sub-goals; preserve
 * joint slugs already listed (e.g. trail ankle, rucking ankle).
 */
export function applyEnduranceJointStabilitySubFocuses(
  sportSlug: string,
  subFocuses: SportSubFocus[]
): SportSubFocus[] {
  const jointSlugs = ENDURANCE_SPORT_JOINT_STABILITY_SLUGS[sportSlug];
  if (!jointSlugs?.length) return subFocuses;

  const withoutTrunk = subFocuses.filter((sf) => !ENDURANCE_TRUNK_STABILITY_SLUGS.has(sf.slug));
  const existing = new Set(withoutTrunk.map((sf) => sf.slug));
  const maxPriority = Math.max(0, ...withoutTrunk.map((sf) => sf.priority_weight ?? 0));

  const additions: SportSubFocus[] = [];
  let nextPriority = maxPriority;
  for (const slug of jointSlugs) {
    if (existing.has(slug)) continue;
    nextPriority += 1;
    additions.push({
      slug,
      name: JOINT_SUB_FOCUS_DISPLAY[slug],
      priority_weight: nextPriority,
    });
  }

  return [...withoutTrunk, ...additions];
}

/** Composite keys `sport:sub_focus` → tag weights for endurance joint stability sub-goals. */
export function buildEnduranceJointStabilityTagMapEntries(): Record<string, SubFocusTagMapEntry[]> {
  const out: Record<string, SubFocusTagMapEntry[]> = {};
  for (const [sportSlug, joints] of Object.entries(ENDURANCE_SPORT_JOINT_STABILITY_SLUGS)) {
    for (const joint of joints) {
      out[`${sportSlug}:${joint}`] = [...SHARED_JOINT_STABILITY_TAG_WEIGHTS[joint]];
    }
  }
  return out;
}
