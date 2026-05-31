/** Lightweight entropy + run seed helpers (kept out of dailyGeneratorAdapter for faster tab shell bundling). */

export function createWorkoutGenerationEntropy(): string {
  try {
    const c = globalThis.crypto;
    if (c?.randomUUID) return c.randomUUID();
    if (c?.getRandomValues) {
      const a = new Uint32Array(2);
      c.getRandomValues(a);
      return `${a[0]!.toString(16)}${a[1]!.toString(16)}`;
    }
  } catch {
    /* ignore */
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

/** Stable per-run seed for generator RNG (includes high-resolution time when available). */
export function composeRunGenerationSeed(base?: string | number): string {
  const entropy = createWorkoutGenerationEntropy();
  let perfMs = Date.now();
  try {
    const p = globalThis.performance;
    if (p && typeof p.now === "function") perfMs = p.now();
  } catch {
    /* ignore */
  }
  return JSON.stringify({ base: base ?? null, entropy, perfMs });
}
