/**
 * Session-level exercise redundancy families.
 * Max-one-per-workout for programming-equivalent movements:
 * explicit pairs (glute bridge / hip thrust) plus derived near-duplicates
 * (single-arm vs two-hand kettlebell swing, staggered vs standing, etc.).
 */

import { getNearDuplicateFamilyId, normalizeExerciseSlug } from "./nearDuplicateFamily";

export {
  getNearDuplicateFamilyId,
  isSameNearDuplicateFamily,
  nearDuplicateSlugWasCollapsed,
  normalizeExerciseSlug,
} from "./nearDuplicateFamily";

/** Cluster id shared with getSimilarExerciseClusterId in workoutRules.ts. */
export const GLUTE_BRIDGE_HIP_THRUST_FAMILY = "glute_bridge_hip_thrust_family";

/** Stem family for kettlebell swing variants (two-hand, single-arm, double, etc.). */
export const KETTLEBELL_SWING_FAMILY = getNearDuplicateFamilyId("kettlebell_swing");

const EXPLICIT_GLUTE_BRIDGE_HIP_THRUST_SLUGS = new Set([
  "glute_bridge",
  "single_leg_glute_bridge",
  "glute_bridge_hold",
  "hip_thrust",
  "barbell_hip_thrust",
  "single_leg_hip_thrust",
  "kettlebell_hip_thrust",
  "kb_hip_thrust",
  "dumbbell_hip_thrust",
  "stability_ball_hip_thrust",
  "plate_hip_thrust",
]);

/** True when slug names a glute-bridge or hip-thrust pattern (including ff_ catalog variants). */
export function isGluteBridgeOrHipThrustSlug(slug: string): boolean {
  const norm = normalizeExerciseSlug(slug);
  if (EXPLICIT_GLUTE_BRIDGE_HIP_THRUST_SLUGS.has(norm)) return true;
  return norm.includes("glute_bridge") || norm.includes("hip_thrust");
}

/** True when slug is a kettlebell swing variant (not clubbell / bag swings). */
export function isKettlebellSwingSlug(slug: string): boolean {
  return getNearDuplicateFamilyId(slug) === KETTLEBELL_SWING_FAMILY;
}

/**
 * Returns a session redundancy family id. Explicit programming-equivalent
 * pairs win; everything else uses the derived near-duplicate stem.
 */
export function getSessionRedundancyFamilyId(exerciseId: string): string | null {
  if (!exerciseId) return null;
  if (isGluteBridgeOrHipThrustSlug(exerciseId)) return GLUTE_BRIDGE_HIP_THRUST_FAMILY;
  return getNearDuplicateFamilyId(exerciseId) || null;
}

/** True when another exercise from the same redundancy family is already in the session. */
export function sessionRedundancyFamilyAlreadyUsed(
  usedExerciseIds: Iterable<string>,
  candidateId: string
): boolean {
  const candidateFamily = getSessionRedundancyFamilyId(candidateId);
  if (!candidateFamily) return false;
  for (const id of usedExerciseIds) {
    if (id === candidateId) continue;
    if (getSessionRedundancyFamilyId(id) === candidateFamily) return true;
  }
  return false;
}

/**
 * Whether an exercise may be added to the session given ids already used (and optional block-local picks).
 */
export function isExerciseAvailableForSession(
  exerciseId: string,
  sessionUsedIds: Set<string>,
  extraBlockedIds: Iterable<string> = []
): boolean {
  if (sessionUsedIds.has(exerciseId)) return false;
  for (const id of extraBlockedIds) {
    if (id === exerciseId) return false;
  }
  const combined = [...sessionUsedIds, ...extraBlockedIds];
  return !sessionRedundancyFamilyAlreadyUsed(combined, exerciseId);
}
