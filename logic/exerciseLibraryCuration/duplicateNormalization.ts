/**
 * Deterministic name/alias normalization for duplicate detection.
 * Does not strip meaningful distinctions (incline/flat, front/back, etc.).
 */

/** Multi-word expansions applied to normalized text before tokenization. */
const PHRASE_EXPANSIONS: { re: RegExp; replace: string }[] = [
  { re: /\brdl\b/gi, replace: "romanian deadlift" },
  { re: /\brfess\b/gi, replace: "rear foot elevated split squat" },
  { re: /\bohp\b/gi, replace: "overhead press" },
  { re: /\bkb\b/gi, replace: "kettlebell" },
  { re: /\bdb\b/gi, replace: "dumbbell" },
  { re: /\bbb\b/gi, replace: "barbell" },
  { re: /\bbw\b/gi, replace: "bodyweight" },
  { re: /rear[\s-]*foot[\s-]*elevated/gi, replace: "rear foot elevated" },
  { re: /pull[\s-]*up/gi, replace: "pull up" },
  { re: /chin[\s-]*up/gi, replace: "chin up" },
  { re: /single[\s-]*arm/gi, replace: "single arm" },
  { re: /single[\s-]*leg/gi, replace: "single leg" },
];

/** Removed as weak filler when tokenizing for duplicate matching (not from raw display). */
const FILLER_TOKENS = new Set([
  "basic",
  "standard",
  "alternating",
  "variation",
  "drill",
  "exercise",
  "variation",
  "the",
  "a",
  "an",
  "and",
  "or",
  "with",
  "using",
]);

/** Stripped only when standing alone / as extra suffix — kept if part of a compound phrase elsewhere. */
const OPTIONAL_WEAK_SUFFIXES = new Set(["hold", "iso", "isometric"]);

export function normalizeForDuplicateMatching(raw: string): string {
  let s = raw.toLowerCase().trim();
  s = s.replace(/[_/]+/g, " ");
  s = s.replace(/[^a-z0-9\s-]/gi, " ");
  for (const { re, replace } of PHRASE_EXPANSIONS) {
    s = s.replace(re, replace);
  }
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

export function tokenizeNormalizedName(normalized: string): string[] {
  const parts = normalized.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    const t = parts[i]!;
    if (FILLER_TOKENS.has(t)) continue;
    if (OPTIONAL_WEAK_SUFFIXES.has(t) && i > 0) continue;
    if (t.length >= 2) out.push(t);
  }
  return out;
}

export function normalizedNameSignature(normalized: string): string {
  return tokenizeNormalizedName(normalized).sort().join(" ");
}

/** Bigram Jaccard on character level for fuzzy name proximity. */
export function bigramJaccard(a: string, b: string): number {
  if (!a.length || !b.length) return 0;
  const bigrams = (s: string) => {
    const bg = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) bg.add(s.slice(i, i + 2));
    return bg;
  };
  const A = bigrams(a);
  const B = bigrams(b);
  let inter = 0;
  for (const x of A) if (B.has(x)) inter += 1;
  return inter / (A.size + B.size - inter || 1);
}
