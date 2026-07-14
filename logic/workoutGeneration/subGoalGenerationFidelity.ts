/**
 * Evaluate a generated session against a sub-goal intent contract.
 */

import type { Exercise, WorkoutBlock, WorkoutSession } from "./types";
import {
  resolveMatchFn,
  type SubGoalIntentContract,
} from "../../data/goalSubFocus/subGoalIntentContracts";

const NON_WORKING = new Set(["warmup"]);

/** Blocks that count as the session's training content for fidelity scoring. */
function isWorkingBlockForContract(
  blockType: string | undefined,
  contract: SubGoalIntentContract
): boolean {
  const bt = norm(blockType ?? "");
  if (bt === "warmup") return false;
  // Recovery & mobility primary is intentionally a unified stretch/cooldown session.
  if (
    contract.primaryLabel === "Recovery & Mobility" ||
    contract.goalSlug === "recovery_mobility" ||
    contract.goalSlug === "resilience" ||
    contract.goalSlug === "mobility"
  ) {
    return bt === "cooldown" || bt === "mobility" || bt === "recovery" || bt === "accessory";
  }
  if (bt === "cooldown" || bt === "mobility" || bt === "recovery") return false;
  return true;
}

export function collectWorkingExercises(
  session: WorkoutSession,
  byId: Map<string, Exercise>,
  contract?: SubGoalIntentContract
): Exercise[] {
  const out: Exercise[] = [];
  for (const block of session.blocks as WorkoutBlock[]) {
    if (contract) {
      if (!isWorkingBlockForContract(block.block_type, contract)) continue;
    } else {
      const bt = norm(block.block_type ?? "");
      if (NON_WORKING.has(bt) || bt === "cooldown" || bt === "mobility" || bt === "recovery") continue;
    }
    for (const item of block.items ?? []) {
      const ex = byId.get(item.exercise_id);
      if (ex) out.push(ex);
    }
  }
  return out;
}

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
}

export type SubGoalFidelityResult = {
  key: string;
  primaryLabel: string;
  slug: string;
  displayName: string;
  pass: boolean;
  matchingCount: number;
  strongCount: number;
  workingCount: number;
  matchingIds: string[];
  weakProxyIds: string[];
  reason?: string;
  intentSummary: string;
};

export function evaluateSubGoalSessionFidelity(
  contract: SubGoalIntentContract,
  session: WorkoutSession,
  catalog: Exercise[]
): SubGoalFidelityResult {
  const byId = new Map(catalog.map((e) => [e.id, e]));
  const working = collectWorkingExercises(session, byId, contract);
  const match = resolveMatchFn(contract);
  const matching = working.filter(match);
  const weak = contract.isWeakProxy ? matching.filter(contract.isWeakProxy) : [];
  const strong = matching.filter((ex) => !(contract.isWeakProxy?.(ex) ?? false));

  const minMatching = contract.minMatchingWorking ?? 1;
  const minStrong =
    contract.minStrongMatches ?? (contract.isWeakProxy ? 1 : 0);

  const key = `${contract.primaryLabel}::${contract.slug}`;
  const base = {
    key,
    primaryLabel: contract.primaryLabel,
    slug: contract.slug,
    displayName: contract.displayName,
    matchingCount: matching.length,
    strongCount: strong.length,
    workingCount: working.length,
    matchingIds: matching.map((e) => e.id),
    weakProxyIds: weak.map((e) => e.id),
    intentSummary: contract.intentSummary,
  };

  if (working.length === 0) {
    return { ...base, pass: false, reason: "no_working_exercises" };
  }
  if (minMatching === 0) {
    return { ...base, pass: true };
  }
  if (matching.length < minMatching) {
    return {
      ...base,
      pass: false,
      reason: `need ≥${minMatching} intent-matching working exercises; got ${matching.length}`,
    };
  }
  if (strong.length < minStrong) {
    return {
      ...base,
      pass: false,
      reason: `need ≥${minStrong} strong (non-proxy) matches; got ${strong.length} (weak: ${weak
        .map((e) => e.id)
        .join(", ") || "none"})`,
    };
  }
  return { ...base, pass: true };
}
