/**
 * User-facing volume dial copy: which rep counts the user wants, with a
 * goal-based recommended range.
 */

import { getGoalRules } from "./generation/prescriptionRules";
import { PRIMARY_FOCUS_TO_GOAL_SLUG } from "./goalSlugMapping";
import type { VolumePreference } from "./types";

/** Map app / UI goal keys → GOAL_TRAINING_RULES keys. */
const GOAL_SLUG_TO_RULE_KEY: Record<string, string> = {
  strength: "strength",
  muscle: "hypertrophy",
  hypertrophy: "hypertrophy",
  physique: "body_recomp",
  body_recomp: "body_recomp",
  endurance: "endurance",
  conditioning: "conditioning",
  mobility: "mobility",
  recovery: "recovery",
  recovery_mobility: "recovery_mobility",
  resilience: "recovery_mobility",
  joint_health: "joint_health",
  athletic_performance: "athletic_performance",
  power: "power",
  calisthenics: "calisthenics",
};

const RULE_KEY_GOAL_LABEL: Record<string, string> = {
  strength: "strength",
  hypertrophy: "building muscle",
  body_recomp: "body recomp",
  endurance: "endurance",
  conditioning: "conditioning",
  mobility: "mobility",
  recovery: "recovery",
  recovery_mobility: "recovery & mobility",
  joint_health: "joint health",
  athletic_performance: "athletic performance",
  power: "power",
  calisthenics: "calisthenics",
};

export type VolumePreferenceOptionCopy = {
  value: VolumePreference;
  /** Short chip / summary label. */
  label: string;
  /** One-line explanation with goal-specific rep guidance. */
  description: string;
};

const FALLBACK_RULE_KEY = "hypertrophy";

/**
 * Resolve a training-rule key from primary-focus labels and/or goal bias slugs.
 * Uses the first resolvable primary focus; falls back to hypertrophy.
 */
export function resolveVolumeRuleKey(args: {
  primaryFocus?: string[] | null;
  goalBias?: string | null;
  goalSlugs?: string[] | null;
}): string {
  const bias = args.goalBias?.trim().toLowerCase();
  if (bias && GOAL_SLUG_TO_RULE_KEY[bias]) return GOAL_SLUG_TO_RULE_KEY[bias]!;

  for (const slug of args.goalSlugs ?? []) {
    const key = GOAL_SLUG_TO_RULE_KEY[slug.trim().toLowerCase()];
    if (key) return key;
  }

  for (const label of args.primaryFocus ?? []) {
    const slug = PRIMARY_FOCUS_TO_GOAL_SLUG[label];
    if (slug) {
      const key = GOAL_SLUG_TO_RULE_KEY[slug];
      if (key) return key;
    }
    const asSlug = label.trim().toLowerCase().replace(/\s+/g, "_");
    if (GOAL_SLUG_TO_RULE_KEY[asSlug]) return GOAL_SLUG_TO_RULE_KEY[asSlug]!;
  }

  return FALLBACK_RULE_KEY;
}

export function formatRepRange(min: number, max: number): string {
  if (min === max) return `${min}`;
  return `${min}–${max}`;
}

const STRENGTH_VOLUME_OPTIONS: VolumePreferenceOptionCopy[] = [
  {
    value: "conservative",
    label: "Strength Focused",
    description: "Primary 3–5 × 3–6 · Secondary ~3 × 5–8 · Accessory 2–3 × 8–12",
  },
  {
    value: "standard",
    label: "Balanced",
    description: "Primary 3–4 × 5–8 · Secondary ~3 × 8–10 · Accessory 2–3 × 10–15",
  },
  {
    value: "high_volume",
    label: "High Volume",
    description: "Primary 3–4 × 6–10 · Secondary 3–4 × 8–12 · Accessory 3–4 × 12–15+",
  },
];

/**
 * Build the three volume options. Strength / muscle / mixed sessions use programming
 * profiles; mobility / time-based goals keep density language.
 */
export function volumePreferenceOptionsForGoals(args: {
  primaryFocus?: string[] | null;
  goalBias?: string | null;
  goalSlugs?: string[] | null;
}): VolumePreferenceOptionCopy[] {
  const ruleKey = resolveVolumeRuleKey(args);
  const rules = getGoalRules(ruleKey);
  const { min, max } = rules.repRange;
  const goalPhrase = RULE_KEY_GOAL_LABEL[ruleKey] ?? "your goals";

  if (ruleKey === "mobility" || (min === 1 && max === 1)) {
    return [
      {
        value: "conservative",
        label: "Strength Focused",
        description: "Shorter holds and fewer rounds — lighter session density.",
      },
      {
        value: "standard",
        label: "Balanced",
        description: `Recommended for ${goalPhrase}: controlled holds and easy rounds.`,
      },
      {
        value: "high_volume",
        label: "High Volume",
        description: "Extra rounds and longer holds when you want more volume.",
      },
    ];
  }

  return STRENGTH_VOLUME_OPTIONS;
}

export function volumePreferenceDisplayLabel(
  value: VolumePreference | null | undefined,
  args?: {
    primaryFocus?: string[] | null;
    goalBias?: string | null;
    goalSlugs?: string[] | null;
  }
): string {
  const options = volumePreferenceOptionsForGoals(args ?? {});
  const pref = value ?? "standard";
  return options.find((o) => o.value === pref)?.label ?? "Balanced";
}

/** Section subtitle under Volume preference. */
export function volumePreferenceSectionSubtitle(args: {
  primaryFocus?: string[] | null;
  goalBias?: string | null;
  goalSlugs?: string[] | null;
}): string {
  const ruleKey = resolveVolumeRuleKey(args);
  const rules = getGoalRules(ruleKey);
  if (ruleKey === "mobility" || (rules.repRange.min === 1 && rules.repRange.max === 1)) {
    return `How dense holds and rounds should feel. High Volume is extra density, not a hypertrophy goal.`;
  }
  return "How much strength work to do. High Volume is a volume preference, not a Build Muscle goal. Power, conditioning, and support work keep their own prescriptions.";
}
