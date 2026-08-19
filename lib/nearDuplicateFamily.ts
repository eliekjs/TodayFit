/**
 * Session near-duplicate families.
 * Variants of the same implement + movement (laterality, stance, catalog prefix)
 * share one family id so at most one may appear in a workout.
 *
 * Distinct programming choices are kept apart: implement (barbell vs dumbbell),
 * plane/angle (incline vs flat), and pattern (row vs pulldown, RDL vs deadlift).
 */

const TOKEN_ABBREVIATIONS: Record<string, string | readonly string[]> = {
  kb: "kettlebell",
  db: "dumbbell",
  bb: "barbell",
  bw: "bodyweight",
  rdl: ["romanian", "deadlift"],
};

/** Longest-first so "rear_foot_elevated" wins over a shorter prefix. */
const STRIP_PHRASES: readonly (readonly string[])[] = [
  ["rear", "foot", "elevated"],
  ["staggered", "stance"],
  ["half", "kneeling"],
  ["tall", "kneeling"],
  ["side", "lying"],
  ["start", "stop"],
  ["wide", "grip"],
  ["close", "grip"],
  ["narrow", "grip"],
  ["mixed", "grip"],
  ["neutral", "grip"],
  ["single", "arm"],
  ["single", "leg"],
  ["one", "arm"],
  ["one", "leg"],
  ["1", "arm"],
  ["1", "leg"],
];

const STRIP_TOKENS = new Set([
  "ff",
  "alternating",
  "unilateral",
  "bilateral",
  "double",
  "seated",
  "standing",
  "kneeling",
  "lying",
  "prone",
  "supine",
  "banded",
  "paused",
  "pause",
  "tempo",
  "bodyweight",
  "bulgarian",
  "assisted",
  "weighted",
  "iso",
  "isometric",
  "hold",
  "holds",
]);

const IMPLEMENT_TOKENS = new Set([
  "barbell",
  "dumbbell",
  "kettlebell",
  "cable",
  "machine",
  "landmine",
  "smith",
  "trap",
  "band",
  "miniband",
  "superband",
  "trx",
  "ring",
  "rings",
]);

/** Single leftover tokens that are too broad to use as a family on their own. */
const GENERIC_MOVEMENT_TOKENS = new Set([
  "press",
  "row",
  "curl",
  "raise",
  "squat",
  "lunge",
  "swing",
  "carry",
  "fly",
  "flies",
  "extension",
  "crunch",
  "plank",
  "pull",
  "push",
  "dip",
  "step",
  "deadlift",
  "hinge",
  "thrust",
  "bridge",
  "jump",
  "chop",
  "slam",
  "twist",
  "rotation",
  "march",
  "walk",
  "run",
  "sprint",
  "stretch",
  "circle",
  "circles",
]);

export function normalizeExerciseSlug(id: string): string {
  return id.toLowerCase().replace(/-/g, "_").replace(/\s+/g, "_");
}

function expandAbbreviations(tokens: string[]): string[] {
  const out: string[] = [];
  for (const token of tokens) {
    const mapped = TOKEN_ABBREVIATIONS[token];
    if (typeof mapped === "string") {
      out.push(mapped);
    } else if (mapped) {
      out.push(...mapped);
    } else {
      out.push(token);
    }
  }
  return out;
}

function stripPhrases(tokens: string[]): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    const match = STRIP_PHRASES.find(
      (phrase) => phrase.every((part, offset) => tokens[i + offset] === part)
    );
    if (match) {
      i += match.length;
      continue;
    }
    out.push(tokens[i]!);
    i += 1;
  }
  return out;
}

function collapseSplitSquat(tokens: string[]): string[] {
  if (!(tokens.includes("split") && tokens.includes("squat"))) return tokens;
  return tokens.filter((token) => token === "split" || token === "squat" || IMPLEMENT_TOKENS.has(token));
}

function stemTokens(slug: string): {
  expanded: string[];
  stem: string[];
  collapsed: boolean;
} {
  const raw = normalizeExerciseSlug(slug).split("_").filter(Boolean);
  const expanded = expandAbbreviations(raw);
  const afterPhrases = stripPhrases(expanded);
  const afterSingles = afterPhrases.filter((token) => !STRIP_TOKENS.has(token));
  const stem = collapseSplitSquat(afterSingles);
  const collapsed =
    raw.some((token) => token in TOKEN_ABBREVIATIONS) ||
    afterPhrases.length !== expanded.length ||
    afterSingles.length !== afterPhrases.length ||
    stem.length !== afterSingles.length;
  return { expanded, stem, collapsed };
}

function familyFromTokens(tokens: string[]): string {
  return [...tokens].sort().join("_");
}

function familyFromStem(expanded: string[], stem: string[]): string {
  if (stem.length >= 2) return familyFromTokens(stem);
  if (stem.length === 1 && !GENERIC_MOVEMENT_TOKENS.has(stem[0]!)) {
    return stem[0]!;
  }
  const fallback = expanded.filter((token) => token !== "ff");
  return familyFromTokens(fallback.length ? fallback : expanded);
}

/**
 * Canonical near-duplicate family for an exercise slug.
 * Always returns a stable id (empty input → empty string).
 */
export function getNearDuplicateFamilyId(exerciseId: string): string {
  const { expanded, stem } = stemTokens(exerciseId);
  return familyFromStem(expanded, stem);
}

/**
 * True when the slug was reduced by laterality/stance/catalog modifiers or
 * abbreviations. Unique canonical names stay uncollapsed so weekly clustering
 * can keep using the raw id.
 */
export function nearDuplicateSlugWasCollapsed(exerciseId: string): boolean {
  return stemTokens(exerciseId).collapsed;
}

export function isSameNearDuplicateFamily(aId: string, bId: string): boolean {
  const a = getNearDuplicateFamilyId(aId);
  const b = getNearDuplicateFamilyId(bId);
  return Boolean(a && b && a === b);
}
