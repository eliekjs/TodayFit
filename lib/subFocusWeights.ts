/**
 * Sub-focus percentage UX helpers + merge → generator slug weights.
 *
 * Storage: ManualPreferences.subFocusPctByGoal[goalLabel][subFocusDisplayName] = 0–100整数 (per goal, selected subs sum to 100).
 *
 * Weight policy:
 * - Removing a chip: preserve relative ratios among remaining subs (then round to integers summing to 100).
 * - Adding a chip: equal split among all selected subs for that primary goal (then integer fix-up).
 * - Explicit map missing for a primary goal: legacy rank-based weights via resolveSubFocusProfile (backward compatible).
 */

import {
  canonicalGoalSubFocusLabel,
  resolveGoalSubFocusSlugs,
  resolveSubFocusProfile,
} from "../data/goalSubFocus";

/** Integer percentages for ordered labels; sums to exactly 100 when n ≥ 1. */
export function equalIntegerPctsForLabels(labels: string[]): Record<string, number> {
  const n = labels.length;
  if (n <= 0) return {};
  const base = Math.floor(100 / n);
  let remainder = 100 - base * n;
  const out: Record<string, number> = {};
  for (let i = 0; i < n; i++) {
    const lab = labels[i]!;
    out[lab] = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;
  }
  return out;
}

/** Clamp each entry to selected labels and renormalize integers to sum 100 (equal split on missing/zero sum). */
export function normalizeSubFocusPctRecord(
  selectedOrdered: string[],
  prev?: Record<string, number>
): Record<string, number> {
  if (selectedOrdered.length === 0) return {};
  if (selectedOrdered.length === 1) return { [selectedOrdered[0]!]: 100 };
  const filtered = selectedOrdered.map((s) =>
    Math.max(0, Math.min(100, Math.round(prev?.[s] ?? 0)))
  );
  let sum = filtered.reduce((a, b) => a + b, 0);
  if (sum <= 0) return equalIntegerPctsForLabels(selectedOrdered);
  const floats = filtered.map((v) => (v / sum) * 100);
  const floors = floats.map((f) => Math.floor(f));
  let rem = 100 - floors.reduce((a, b) => a + b, 0);
  const order = floats.map((f, i) => ({ i, r: f - Math.floor(f) })).sort((a, b) => b.r - a.r);
  const pcts = [...floors];
  for (let k = 0; k < order.length && rem > 0; k++, rem--) {
    const idx = order[k]!.i;
    pcts[idx] = (pcts[idx] ?? 0) + 1;
  }
  const out: Record<string, number> = {};
  selectedOrdered.forEach((lab, i) => {
    out[lab] = pcts[i] ?? 0;
  });
  return out;
}

/** Removing removedChip preserves ratios among remaining (fallback equal split when leftover sums to zero). */
export function redistributeSubFocusPctsOnRemoval(
  remainingOrdered: string[],
  prev: Record<string, number>
): Record<string, number> {
  if (remainingOrdered.length === 0) return {};
  if (remainingOrdered.length === 1) return { [remainingOrdered[0]!]: 100 };

  const raw = remainingOrdered.map((s) => Math.max(0, prev[s] ?? 0));
  let sum = raw.reduce((a, b) => a + b, 0);
  if (sum <= 0) return equalIntegerPctsForLabels(remainingOrdered);

  const floats = raw.map((v) => (100 * v) / sum);
  const floors = floats.map((f) => Math.floor(f));
  let rem = 100 - floors.reduce((a, b) => a + b, 0);
  const order = floats.map((f, i) => ({ i, r: f - Math.floor(f) })).sort((a, b) => b.r - a.r);
  const pcts = [...floors];
  for (let k = 0; k < order.length && rem > 0; k++, rem--) {
    const idx = order[k]!.i;
    pcts[idx] = (pcts[idx] ?? 0) + 1;
  }

  const out: Record<string, number> = {};
  remainingOrdered.forEach((lab, i) => {
    out[lab] = pcts[i] ?? 0;
  });
  return out;
}

/** After user edits one sub-focus %; others scaled proportionally; fixed row sums with the edited value. */
export function commitSubFocusPctEdit(
  orderedSubs: string[],
  prev: Record<string, number>,
  changedSub: string,
  newPct: number
): Record<string, number> {
  const clamped = Math.max(0, Math.min(100, Math.round(newPct)));
  const others = orderedSubs.filter((s) => s !== changedSub);
  if (others.length === 0) return { [changedSub]: 100 };
  const remain = Math.max(0, 100 - clamped);
  const prevSum = others.reduce((acc, s) => acc + Math.max(0, prev[s] ?? 0), 0);

  const raw =
    prevSum > 0
      ? others.map((s) => (remain * Math.max(0, prev[s] ?? 0)) / prevSum)
      : others.map(() => remain / others.length);

  const floors = raw.map((x) => Math.floor(x));
  let rem = remain - floors.reduce((a, b) => a + b, 0);
  const fracOrder = raw.map((x, i) => ({ i, r: x - Math.floor(x) })).sort((a, b) => b.r - a.r);
  const tail = [...floors];
  for (let k = 0; k < fracOrder.length && rem > 0; k++, rem--) {
    const idx = fracOrder[k]!.i;
    tail[idx] = (tail[idx] ?? 0) + 1;
  }

  const out: Record<string, number> = { [changedSub]: clamped };
  others.forEach((s, i) => {
    out[s] = tail[i] ?? 0;
  });
  let total = orderedSubs.reduce((acc, s) => acc + (out[s] ?? 0), 0);
  if (total !== 100) out[changedSub] = clamped + (100 - total);
  return out;
}

function labelHasExplicitSubFocusPct(
  label: string,
  selectedSubs: string[],
  pctMap: Record<string, Record<string, number>> | undefined
): boolean {
  const rec = pctMap?.[label];
  if (!rec) return false;
  return selectedSubs.some((s) => rec[s] != null && Number.isFinite(rec[s]));
}

function legacyWeightsForLabelSlugs(goalSlug: string, subFocusSlugs: string[]): Record<string, number> {
  if (!subFocusSlugs.length) return {};
  const profile = resolveSubFocusProfile({
    goalSlug,
    rankedSubFocusSlugs: subFocusSlugs,
  });
  const m: Record<string, number> = {};
  for (const s of subFocusSlugs) {
    m[s] = profile.resolvedWeights[s] ?? 1 / subFocusSlugs.length;
  }
  return m;
}

/** Internal: map each display label → slug with per-label weight fraction (sums to 1 within label). */
function perLabelSlugWeights(
  label: string,
  subLabels: string[],
  pctByGoal?: Record<string, Record<string, number>>
): { goalSlug: string; pairs: { slug: string; w: number }[] } | null {
  const canonicalLabel = canonicalGoalSubFocusLabel(label);
  const { goalSlug, subFocusSlugs } = resolveGoalSubFocusSlugs(canonicalLabel, subLabels);
  if (!goalSlug || subFocusSlugs.length === 0) return null;

  if (labelHasExplicitSubFocusPct(label, subLabels, pctByGoal)) {
    const ints = normalizeSubFocusPctRecord(subLabels, pctByGoal?.[label]);
    const pairs: { slug: string; w: number }[] = [];
    const n = Math.min(subLabels.length, subFocusSlugs.length);
    for (let i = 0; i < n; i++) {
      const subLab = subLabels[i]!;
      const slug = subFocusSlugs[i]!;
      pairs.push({ slug, w: (ints[subLab] ?? 0) / 100 });
    }
    let s = pairs.reduce((a, p) => a + p.w, 0);
    if (s > 0 && Math.abs(s - 1) > 1e-6) {
      for (const p of pairs) p.w /= s;
    }
    return { goalSlug, pairs };
  }

  const legacy = legacyWeightsForLabelSlugs(goalSlug, subFocusSlugs);
  const pairs: { slug: string; w: number }[] = [];
  for (let i = 0; i < subFocusSlugs.length; i++) {
    const slug = subFocusSlugs[i]!;
    pairs.push({ slug, w: legacy[slug] ?? 1 / subFocusSlugs.length });
  }
  return { goalSlug, pairs };
}

export type BuildMergedGoalSubFocusOpts = {
  labelsForSubFocusMerge: string[];
  subFocusByGoal: Record<string, string[]>;
  subFocusPctByGoal?: Record<string, Record<string, number>>;
};

/**
 * Mirrors dailyGenerator adapter merge order: walk labels, merge slug arrays with stable Set order,
 * then assign each goalSlug a weight vector aligned to merged slug order (normalized to sum 1).
 */
export function buildMergedGoalSubFocusSlugWeights(
  opts: BuildMergedGoalSubFocusOpts
): {
  goal_sub_focus: Record<string, string[]>;
  goal_sub_focus_weights: Record<string, number[]>;
} {
  const { labelsForSubFocusMerge, subFocusByGoal, subFocusPctByGoal } = opts;
  const goal_sub_focus: Record<string, string[]> = {};

  const labelsToMerge = new Set<string>();
  for (const label of labelsForSubFocusMerge) {
    if ((subFocusByGoal[label] ?? []).length > 0) labelsToMerge.add(label);
  }
  for (const label of Object.keys(subFocusByGoal)) {
    if ((subFocusByGoal[label] ?? []).length > 0) labelsToMerge.add(label);
  }

  for (const label of labelsToMerge) {
    const subLabels = subFocusByGoal[label] ?? [];
    if (!subLabels.length) continue;
    const { goalSlug, subFocusSlugs } = resolveGoalSubFocusSlugs(
      canonicalGoalSubFocusLabel(label),
      subLabels
    );
    if (!goalSlug || !subFocusSlugs.length) continue;
    const existing = goal_sub_focus[goalSlug] ?? [];
    goal_sub_focus[goalSlug] = [...new Set([...existing, ...subFocusSlugs])];
  }

  const acc: Record<string, Record<string, number>> = {};

  const add = (goalSlug: string, slug: string, w: number) => {
    if (w <= 0) return;
    if (!acc[goalSlug]) acc[goalSlug] = {};
    acc[goalSlug]![slug] = (acc[goalSlug]![slug] ?? 0) + w;
  };

  for (const label of labelsToMerge) {
    const subLabels = subFocusByGoal[label] ?? [];
    if (!subLabels.length) continue;
    const pack = perLabelSlugWeights(label, subLabels, subFocusPctByGoal);
    if (!pack) continue;
    for (const { slug, w } of pack.pairs) add(pack.goalSlug, slug, w);
  }

  const goal_sub_focus_weights: Record<string, number[]> = {};

  for (const [goalSlug, rankedSlugs] of Object.entries(goal_sub_focus)) {
    if (!rankedSlugs?.length) continue;
    const raw = rankedSlugs.map((s) => acc[goalSlug]?.[s] ?? 0);
    let sum = raw.reduce((a, b) => a + b, 0);
    if (sum <= 0) {
      const profile = resolveSubFocusProfile({ goalSlug, rankedSubFocusSlugs: rankedSlugs });
      goal_sub_focus_weights[goalSlug] = rankedSlugs.map(
        (s) => profile.resolvedWeights[s] ?? 1 / rankedSlugs.length
      );
    } else {
      goal_sub_focus_weights[goalSlug] = raw.map((w) => w / sum);
    }
  }

  return { goal_sub_focus, goal_sub_focus_weights };
}

/** Drop orphan keys; renormalize records so they match current subFocusByGoal selections. */
export function sanitizeSubFocusPctMaps(
  subFocusByGoal: Record<string, string[]>,
  subFocusPctByGoal?: Record<string, Record<string, number>>
): Record<string, Record<string, number>> | undefined {
  if (!subFocusPctByGoal || Object.keys(subFocusPctByGoal).length === 0) return undefined;
  const out: Record<string, Record<string, number>> = {};
  for (const [goalLabel, subs] of Object.entries(subFocusByGoal)) {
    if (!subs?.length) continue;
    const prev = subFocusPctByGoal[goalLabel];
    if (!prev || Object.keys(prev).length === 0) continue;
    const next = normalizeSubFocusPctRecord(subs, prev);
    if (Object.keys(next).length) out[goalLabel] = next;
  }
  return Object.keys(out).length ? out : undefined;
}
