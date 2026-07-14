/**
 * Evaluate a generated sport-prep session against a FAMILY intent contract.
 */

import type { Exercise, WorkoutSession } from "./types";
import {
  type SportFamilyIntentContract,
  type SportStratifiedCell,
} from "../../data/sportSubFocus/sportFamilyIntentContracts";
import { collectWorkingExercises } from "./subGoalGenerationFidelity";

export type SportFamilyFidelityResult = {
  key: string;
  familyId: string;
  sportSlug: string;
  subFocusSlug: string;
  gymTemplate: string;
  seed: number;
  pass: boolean;
  matchingCount: number;
  strongCount: number;
  workingCount: number;
  matchingIds: string[];
  weakProxyIds: string[];
  reason?: string;
  intentSummary: string;
};

export function evaluateSportFamilySessionFidelity(
  contract: SportFamilyIntentContract,
  cell: SportStratifiedCell,
  session: WorkoutSession,
  catalog: Exercise[]
): SportFamilyFidelityResult {
  const byId = new Map(catalog.map((e) => [e.id, e]));
  const working = collectWorkingExercises(session, byId);
  const matching = working.filter((e) => contract.matchesIntent(e));
  const weak = matching.filter((e) => (contract.isWeakProxy ? contract.isWeakProxy(e) : false));
  const strong = matching.filter((e) => !(contract.isWeakProxy?.(e) ?? false));

  const minMatch = contract.minMatchingWorking ?? 1;
  const minStrong =
    contract.minStrongMatches ?? (contract.isWeakProxy ? 1 : 0);

  let pass = matching.length >= minMatch && strong.length >= minStrong;
  let reason: string | undefined;
  if (matching.length < minMatch) {
    pass = false;
    reason = `Need ≥${minMatch} matching working exercises; got ${matching.length}`;
  } else if (strong.length < minStrong) {
    pass = false;
    reason = `Need ≥${minStrong} strong (non-proxy) matches; got ${strong.length} (weak=${weak.map((e) => e.id).join(",")})`;
  }

  return {
    key: `${contract.familyId}/${cell.sportSlug}/${cell.subFocusSlug}/${cell.gymTemplate}/s${cell.seed}`,
    familyId: contract.familyId,
    sportSlug: cell.sportSlug,
    subFocusSlug: cell.subFocusSlug,
    gymTemplate: cell.gymTemplate,
    seed: cell.seed,
    pass,
    matchingCount: matching.length,
    strongCount: strong.length,
    workingCount: working.length,
    matchingIds: matching.map((e) => e.id).slice(0, 8),
    weakProxyIds: weak.map((e) => e.id).slice(0, 8),
    reason,
    intentSummary: contract.intentSummary,
  };
}
