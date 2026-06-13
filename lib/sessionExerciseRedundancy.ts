/**
 * Session-level exercise redundancy families.
 * Max-one-per-workout rules for programming-equivalent movements (e.g. glute bridge vs hip thrust).
 */

/** Cluster id shared with getSimilarExerciseClusterId in workoutRules.ts. */
export const GLUTE_BRIDGE_HIP_THRUST_FAMILY = "glute_bridge_hip_thrust_family";

/** Families where at most one member may appear in a single workout session. */
export const SESSION_MAX_ONE_REDUNDANCY_FAMILIES = new Set<string>([
  GLUTE_BRIDGE_HIP_THRUST_FAMILY,
]);

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

function normalizeExerciseSlug(id: string): string {
  return id.toLowerCase().replace(/-/g, "_").replace(/\s+/g, "_");
}

/** True when slug names a glute-bridge or hip-thrust pattern (including ff_ catalog variants). */
export function isGluteBridgeOrHipThrustSlug(slug: string): boolean {
  const norm = normalizeExerciseSlug(slug);
  if (EXPLICIT_GLUTE_BRIDGE_HIP_THRUST_SLUGS.has(norm)) return true;
  return norm.includes("glute_bridge") || norm.includes("hip_thrust");
}

/**
 * Returns a session redundancy family id when the exercise belongs to a max-one-per-session group.
 */
export function getSessionRedundancyFamilyId(exerciseId: string): string | null {
  if (isGluteBridgeOrHipThrustSlug(exerciseId)) return GLUTE_BRIDGE_HIP_THRUST_FAMILY;
  return null;
}

/** True when another exercise from the same redundancy family is already in the session. */
export function sessionRedundancyFamilyAlreadyUsed(
  usedExerciseIds: Iterable<string>,
  candidateId: string
): boolean {
  const candidateFamily = getSessionRedundancyFamilyId(candidateId);
  if (!candidateFamily || !SESSION_MAX_ONE_REDUNDANCY_FAMILIES.has(candidateFamily)) return false;
  for (const id of usedExerciseIds) {
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
