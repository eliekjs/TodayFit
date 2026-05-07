/**
 * Largest-remainder proportional slot allocation (used by goal-dedicated blocks
 * and intent-based slot allocation).
 */
export function allocateSlotsBySubFocusWeights<T extends string>(
  keys: T[],
  weights: number[],
  nSlots: number
): Map<T, number> {
  const out = new Map<T, number>();
  if (nSlots <= 0 || keys.length === 0) return out;
  const w =
    weights.length === keys.length && weights.some((x) => x > 0)
      ? [...weights]
      : keys.map(() => 1 / keys.length);
  const sumW = w.reduce((s, x) => s + x, 0);
  const norm = sumW > 0 ? w.map((x) => x / sumW) : w.map(() => 1 / w.length);
  const counts = norm.map((x) => Math.floor(nSlots * x));
  const rem = nSlots - counts.reduce((s, c) => s + c, 0);
  const fracs = norm.map((x, i) => ({ i, r: nSlots * x - counts[i]! }));
  fracs.sort((a, b) => b.r - a.r);
  for (let k = 0; k < rem; k++) {
    counts[fracs[k % fracs.length]!.i]! += 1;
  }
  for (let i = 0; i < keys.length; i++) {
    out.set(keys[i]!, counts[i]!);
  }
  return out;
}
