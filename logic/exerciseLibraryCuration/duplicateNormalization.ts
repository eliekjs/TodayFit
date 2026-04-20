/**
 * Aggressive name/alias normalization for redundancy detection (library reduction).
 * Collapses trivial naming variants; does not remove incline/flat, front/back, row vs pulldown, etc.
 */

/** Applied in order. Multi-word expansions before tokenization. */
const PHRASE_EXPANSIONS: { re: RegExp; replace: string }[] = [
  { re: /\brdl\b/gi, replace: "romanian deadlift" },
  { re: /\brfess\b/gi, replace: "rear foot elevated split squat" },
  { re: /\bohp\b/gi, replace: "overhead press" },
  { re: /\bkb\b/gi, replace: "kettlebell" },
  { re: /\bdb\b/gi, replace: "dumbbell" },
  { re: /\bbb\b/gi, replace: "barbell" },
  { re: /\bbw\b/gi, replace: "bodyweight" },
  { re: /\b1[\s-]*arm\b/gi, replace: "single arm" },
  { re: /\b1[\s-]*leg\b/gi, replace: "single leg" },
  { re: /single[\s-]*arm/gi, replace: "single arm" },
  { re: /single[\s-]*leg/gi, replace: "single leg" },
  { re: /rear[\s-]*foot[\s-]*elevated/gi, replace: "rear foot elevated" },
  /** Bulgarian split squat ≈ RFESS for redundancy purposes in this app. */
  { re: /\bbulgarian\s+split\s+squat\b/gi, replace: "rear foot elevated split squat" },
  { re: /pull[\s-]*up/gi, replace: "pull up" },
  { re: /chin[\s-]*up/gi, replace: "chin up" },
  { re: /bench[\s-]*supported/gi, replace: "chest supported" },
  { re: /chest[\s-]*supported/gi, replace: "chest supported" },
];

/** Stripped as weak filler (library reduction: do not preserve trivial cue words). */
const FILLER_TOKENS = new Set([
  "basic",
  "standard",
  "alternating",
  "variation",
  "variations",
  "drill",
  "drills",
  "exercise",
  "exercises",
  "the",
  "a",
  "an",
  "and",
  "or",
  "with",
  "using",
  "regular",
  "simple",
  "traditional",
  "classic",
  "supported",
  "hold",
  "holds",
  "iso",
  "isometric",
]);

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
    if (t.length >= 2) out.push(t);
  }
  return out;
}

export function normalizedNameSignature(normalized: string): string {
  return tokenizeNormalizedName(normalized).sort().join(" ");
}

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
