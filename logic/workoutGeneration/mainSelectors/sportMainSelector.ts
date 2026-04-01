/**
 * Dispatch sport-owned main / secondary selection by canonical primary sport slug.
 * Extensible: add cases here as hiking/trail migrate off generic+gates.
 */

import { getCanonicalSportSlug } from "../../../data/sportSubFocus";
import { alpineSkiingPatternTransferApplies } from "../sportPatternTransfer/alpineSkiingSession";
import type { GenerateWorkoutInput } from "../types";
import { createAlpineSportMainHandles } from "./alpineSportMainHandles";
import type { SportMainHandles, SportMainSelectorDeps } from "./types";

/**
 * @param sportSlug Primary sport slug (raw or canonical); typically `input.sport_slugs?.[0]`.
 */
export function sportMainSelector(
  sportSlug: string | undefined,
  input: GenerateWorkoutInput,
  deps: SportMainSelectorDeps
): SportMainHandles | undefined {
  if (!sportSlug) return undefined;
  const canonical = getCanonicalSportSlug(sportSlug);
  if (canonical !== "alpine_skiing") return undefined;
  if (!alpineSkiingPatternTransferApplies(input)) return undefined;
  return createAlpineSportMainHandles(deps);
}
