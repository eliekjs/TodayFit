/**
 * Node / tests / scripts: load the eligibility JSON from disk.
 * Metro native and web resolve the `.native.ts` / `.web.ts` stubs instead, so the
 * 1.5MB catalog is not part of the app download.
 */
import eligibilityBundle from "../../data/generator-eligibility-by-id.json";
import type { ExerciseEligibilityEntry } from "../exerciseLibraryCuration/generatorEligibilityTypes";

let cached: Map<string, ExerciseEligibilityEntry> | undefined;

export function getBundledEligibilityById(): Map<string, ExerciseEligibilityEntry> {
  if (!cached) {
    const raw = eligibilityBundle as unknown as { by_id?: Record<string, ExerciseEligibilityEntry> };
    cached = new Map(Object.entries(raw.by_id ?? {}));
  }
  return cached;
}
