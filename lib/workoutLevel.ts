/**
 * Workout level (experience tier + optional creative/complex variations).
 * Used by generator filtering and exercise metadata inference.
 */

import type { UserLevel } from "../logic/workoutGeneration/types";
import type { WorkoutTierPreference } from "./types";

export type { WorkoutTierPreference };

/** Shape for inferring tiers from static defs or DB tag lists. */
export type WorkoutLevelSource = {
  id: string;
  name: string;
  tags: string[];
  workout_levels?: readonly UserLevel[];
};

function slugifyTag(t: string): string {
  return t.toLowerCase().replace(/\s/g, "_");
}

/**
 * Infer non-empty tier tags for an exercise. Defaults to all three tiers except
 * movements matching advanced-only heuristics (→ advanced only).
 */
export function inferWorkoutLevelsFromSource(src: WorkoutLevelSource): UserLevel[] {
  if (src.workout_levels?.length) {
    const order: UserLevel[] = ["beginner", "intermediate", "advanced"];
    const want = new Set(src.workout_levels);
    const out = order.filter((t) => want.has(t));
    if (out.length > 0) return out;
  }
  const slugs = new Set((src.tags ?? []).map(slugifyTag));
  const id = `${src.id} ${src.name}`.toLowerCase().replace(/-/g, "_");
  const advancedOnly =
    /\b(snatch|clean_and_jerk|muscle_up|planche|handstand_push|pistol|dragon_flag|skin_the_cat|one_arm_|one_arm\b|front_lever|iron_cross)\b/.test(
      id
    );
  if (advancedOnly) return ["advanced"];
  if (slugs.has("beginner")) return ["beginner", "intermediate", "advanced"];
  return ["beginner", "intermediate", "advanced"];
}

export function inferCreativeVariationFromSource(src: WorkoutLevelSource): boolean {
  const slugs = new Set((src.tags ?? []).map(slugifyTag));
  return slugs.has("creative") || slugs.has("complex_variation");
}

/** Tiers an exercise is tagged for (must be non-empty when filtering runs). */
export function allowedTiersForUserPreference(tier: UserLevel): Set<UserLevel> {
  if (tier === "beginner") return new Set(["beginner"]);
  if (tier === "intermediate") return new Set(["beginner", "intermediate"]);
  return new Set(["beginner", "intermediate", "advanced"]);
}

/** True if exercise tier tags overlap what the user’s tier allows. */
export function exerciseMatchesWorkoutTier(
  exerciseLevels: UserLevel[] | undefined,
  userTier: UserLevel
): boolean {
  const levels: UserLevel[] =
    exerciseLevels && exerciseLevels.length > 0
      ? exerciseLevels
      : ["beginner", "intermediate", "advanced"];
  const allowed = allowedTiersForUserPreference(userTier);
  return levels.some((l) => allowed.has(l));
}

/** When creative is off, drop exercises marked as creative-only variations. */
export function exerciseBlockedByCreativePreference(
  creativeVariation: boolean | undefined,
  includeCreativeVariations: boolean
): boolean {
  if (includeCreativeVariations) return false;
  return creativeVariation === true;
}
