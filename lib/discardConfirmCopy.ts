import type { SessionFlow } from "./sessionFlowTypes";

/** What the user is about to throw away — drives confirm copy. */
export type DiscardTarget = "week" | "session";

export function discardTargetFromFlow(flow: SessionFlow | null | undefined): DiscardTarget {
  return flow != null && flow.endsWith("_week") ? "week" : "session";
}

export function discardConfirmTitle(target: DiscardTarget): string {
  return `Discard this ${target}?`;
}

export function discardConfirmBody(target: DiscardTarget): string {
  return `Are you sure you want to discard this ${target}? This action cannot be undone.`;
}

export function discardActionLabel(target: DiscardTarget): string {
  return target === "week" ? "Discard week" : "Discard session";
}
