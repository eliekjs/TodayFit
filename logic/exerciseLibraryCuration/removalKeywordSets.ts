/**
 * Configurable name-keyword families for niche / complexity / spam detection (phase 5).
 * Each family uses a severity tier — strong hits feed niche / technicality / confusion penalties directly.
 */

export type KeywordSeverityTier = "mild" | "moderate" | "strong";

/** Direct additive contributions before blending (per hit); scaled in scoreExerciseValue. */
export const KEYWORD_TIER_PENALTY_VECTORS: Record<
  KeywordSeverityTier,
  { niche: number; technicality: number; confusion: number }
> = {
  mild: { niche: 0.1, technicality: 0.08, confusion: 0.09 },
  moderate: { niche: 0.24, technicality: 0.2, confusion: 0.22 },
  strong: { niche: 0.44, technicality: 0.36, confusion: 0.34 },
};

export type RemovalKeywordFamily = {
  id: string;
  label: string;
  substrings: string[];
  /** Drives how hard this family pushes removal-relevant penalties. */
  tier: KeywordSeverityTier;
};

/**
 * Central registry. Tune tiers and substrings here — not scattered across scoring functions.
 */
export const REMOVAL_KEYWORD_FAMILIES: RemovalKeywordFamily[] = [
  {
    id: "start_stop",
    label: "Start/stop or positional drill naming",
    substrings: ["start stop", "start-stop", "startstop", "3 point", "3-point", "2 point", "2-point", "4 point", "4-point"],
    tier: "strong",
  },
  {
    id: "complex_combo",
    label: "Complex / combo / series / flow naming",
    substrings: ["complex", "combo", "combination", "series", "sequence", "circuit", "flow"],
    tier: "strong",
  },
  {
    id: "oscillatory",
    label: "Oscillatory patterns",
    substrings: ["oscillat"],
    tier: "strong",
  },
  {
    id: "tempo_pause_modifier",
    label: "Tempo / pause / half-rep as modifiers (not core identity)",
    substrings: ["tempo", "pause rep", "1.5", "1 5", "one and a half", "half rep", "paused squat", "paused bench", "paused deadlift"],
    tier: "moderate",
  },
  {
    id: "bottoms_up_niche",
    label: "Bottoms-up niche loading",
    substrings: ["bottoms up", "bottoms-up", "bottom-up"],
    tier: "strong",
  },
  {
    id: "gymnastics_skill_niche",
    label: "Advanced gymnastics / lever / planche progressions",
    substrings: [
      "advanced tuck",
      "straddle planche",
      "full front lever",
      "front lever",
      "back lever",
      "iron cross",
      "maltese",
      "planche",
      "human flag",
      " v-sit",
      " l-sit",
    ],
    tier: "strong",
  },
  /** "straddle" alone is mild — overlaps many mobility names; use with care. */
  {
    id: "straddle_skill",
    label: "Straddle in skill context",
    substrings: ["straddle press", "straddle planche", "straddle sit"],
    tier: "moderate",
  },
  {
    id: "exotic_implement",
    label: "Unusual implements (mace / club / indian club)",
    substrings: ["macebell", "mace ", " clubbell", "clubbell", "indian club", "steel club", " gada "],
    tier: "strong",
  },
  {
    id: "cast_swing_catch",
    label: "Highly specific cast/swing/catch patterns",
    substrings: ["cast and", "swing catch", "catch and", "kettlebell snatch complex"],
    tier: "moderate",
  },
  {
    id: "positional_stack",
    label: "Stacked positional qualifiers",
    substrings: [
      "half kneeling",
      "half-kneeling",
      "tall kneeling",
      "contralateral",
      "ipsilateral",
      "quadruped",
    ],
    tier: "moderate",
  },
  {
    id: "iso_hold_modifier",
    label: "Iso / extreme hold as complexity",
    substrings: ["iso hold", "isometric hold", "isometric split", "extreme iso"],
    tier: "moderate",
  },
  {
    id: "niche_acronym_spam",
    label: "FF- or overly technical prefixed movement codes",
    substrings: [" ff ", " ff_", "ff-", "ff "],
    tier: "strong",
  },
];

export type KeywordFamilyHit = { family_id: string; tier: KeywordSeverityTier };

/** Match families; each family at most once per name. */
export function matchRemovalKeywordFamilies(normalizedLowerName: string): KeywordFamilyHit[] {
  const hits: KeywordFamilyHit[] = [];
  const hay = ` ${normalizedLowerName.replace(/[_/]+/g, " ")} `;
  for (const fam of REMOVAL_KEYWORD_FAMILIES) {
    for (const sub of fam.substrings) {
      const needle = sub.toLowerCase().trim();
      if (needle.length >= 2 && hay.includes(needle)) {
        hits.push({ family_id: fam.id, tier: fam.tier });
        break;
      }
    }
  }
  return hits;
}

/**
 * Combine multiple keyword hits with diminishing overlap (deterministic).
 * Uses noisy-OR style: 1 - Π(1 - min(v, cap)).
 */
export function blendKeywordPenaltyVectors(hits: KeywordFamilyHit[]): { niche: number; technicality: number; confusion: number } {
  const cap = 0.92;
  let n = 0;
  let t = 0;
  let c = 0;
  for (const h of hits) {
    const v = KEYWORD_TIER_PENALTY_VECTORS[h.tier];
    n = 1 - (1 - n) * (1 - Math.min(cap, v.niche));
    t = 1 - (1 - t) * (1 - Math.min(cap, v.technicality));
    c = 1 - (1 - c) * (1 - Math.min(cap, v.confusion));
  }
  return { niche: n, technicality: t, confusion: c };
}
