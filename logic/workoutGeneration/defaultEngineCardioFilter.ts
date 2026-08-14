/**
 * Restrict Zone 2 / conditioning-interval picks to the default staples pool
 * unless Creative is on (or the session is a speed/COD field-drill day).
 */

import {
  allowedIdsForDefaultEngineCardioFamily,
  exerciseIdInDefaultEngineCardioSet,
  isDefaultZone2AlternateId,
  isWalkingLungeCardioId,
  resolveDefaultEngineCardioFamily,
} from "../../data/defaultEngineCardioPool";
import { resolveBlockStructureProfile } from "../../data/sportSubFocus/subFocusIntentRegistry";
import { getActiveBlockFillInput } from "./blockSelectionEligibility";
import type { GenerateWorkoutInput } from "./types";

export function shouldRestrictToDefaultEngineCardioStaples(
  input: GenerateWorkoutInput | undefined,
  intentSlugs: string[] | undefined
): boolean {
  if (!input) return false;
  if (input.style_prefs?.include_creative_variations === true) return false;

  const family = resolveDefaultEngineCardioFamily(intentSlugs);
  if (family == null) return false;

  const fieldDrillsOk = resolveBlockStructureProfile(input).fieldDrillConditioningEligible;
  // Unspecified finishers on RSA/COD/speed days may need field drills.
  if (fieldDrillsOk && family === "generic") return false;

  return true;
}

export function narrowToDefaultEngineCardioStaples<T extends { id: string }>(
  pool: T[],
  input: GenerateWorkoutInput | undefined,
  intentSlugs: string[] | undefined
): T[] {
  if (!shouldRestrictToDefaultEngineCardioStaples(input, intentSlugs)) return pool;

  const family = resolveDefaultEngineCardioFamily(intentSlugs);
  if (family == null) return pool;

  const withoutLunges = pool.filter((e) => !isWalkingLungeCardioId(e.id));
  const allowed = allowedIdsForDefaultEngineCardioFamily(family);
  const staples = withoutLunges.filter((e) => exerciseIdInDefaultEngineCardioSet(e.id, allowed));
  if (staples.length > 0) return staples;

  if (family === "zone2" || family === "generic" || family === "threshold") {
    const alts = withoutLunges.filter((e) => isDefaultZone2AlternateId(e.id));
    if (alts.length > 0) return alts;
  }

  // Do not fall back to COD / OTA drills when the staple pool is empty.
  return staples;
}

export function resolveConditioningPickInput(
  input?: GenerateWorkoutInput
): GenerateWorkoutInput | undefined {
  return input ?? getActiveBlockFillInput();
}
