import { SPORTS_WITH_SUB_FOCUSES } from "../data/sportSubFocus/sportsWithSubFocuses";
import { displayNameForSportSubFocusSlug } from "./workoutIntentSplit";
import type { WorkoutBlock, WorkoutBlockGoalIntent } from "./types";

const _sportBySlug = new Map(SPORTS_WITH_SUB_FOCUSES.map((s) => [s.slug, s]));

function _humanizeGoalSlug(slug: string): string {
  const map: Record<string, string> = {
    strength: "Strength",
    hypertrophy: "Build Muscle",
    muscle: "Build Muscle",
    body_recomp: "Body Recomp",
    conditioning: "Conditioning",
    endurance: "Endurance",
    mobility: "Mobility",
    recovery: "Recovery",
    power: "Power",
    athletic_performance: "Athletic Performance",
    calisthenics: "Calisthenics",
    physique: "Physique",
    resilience: "Resilience",
  };
  return (
    map[slug] ??
    slug
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
}

const STRUCTURAL_BLOCK_TITLES: Record<string, string> = {
  warmup: "Activation",
  main_strength: "Main strength",
  main_hypertrophy: "Main hypertrophy",
  power: "Power block",
  accessory: "Accessory",
  conditioning: "Conditioning",
  cooldown: "Cooldown",
  mobility: "Mobility",
  recovery: "Recovery",
};

/** Strip internal "(secondary goal)" suffixes from stored block titles. */
export function stripSecondaryGoalTitleSuffix(title: string): string {
  return title.replace(/\s*\(secondary goal\)\s*/gi, "").trim();
}

/**
 * Build a single user-facing goal label for a block.
 * Returns null when the intent is too generic to show (e.g. athletic_performance).
 */
export function buildBlockGoalBadgeLabel(intent: WorkoutBlockGoalIntent): string | null {
  const { intent_kind, goal_slug, sub_focus_slug, parent_slug } = intent;

  if (intent_kind === "sport_sub_focus" || intent_kind === "sport") {
    const sportSlug = intent_kind === "sport_sub_focus" ? (parent_slug ?? goal_slug) : goal_slug;
    if (sportSlug === "athletic_performance") return null;
    const sport = _sportBySlug.get(sportSlug);
    const sportName = sport ? sport.name : _humanizeGoalSlug(sportSlug);
    if (intent_kind === "sport_sub_focus" && sub_focus_slug) {
      return displayNameForSportSubFocusSlug(sportSlug, sub_focus_slug);
    }
    return sportName;
  }

  if (intent_kind === "goal_sub_focus" && sub_focus_slug) {
    return _humanizeGoalSlug(sub_focus_slug);
  }

  if (goal_slug === "athletic_performance" && !sub_focus_slug) {
    return null;
  }

  const goalLabel = _humanizeGoalSlug(goal_slug);
  if (!sub_focus_slug) return goalLabel;
  return `${goalLabel} · ${_humanizeGoalSlug(sub_focus_slug)}`;
}

/**
 * Block title for display: structural block name only when a separate goal badge is shown.
 * Avoids duplicating sub-focus or goal text that already appears in the badge.
 */
export function getBlockDisplayTitle(block: WorkoutBlock): string {
  const raw = stripSecondaryGoalTitleSuffix(
    block.title ?? block.block_type.replace(/_/g, " ")
  );
  const badge = block.goal_intent ? buildBlockGoalBadgeLabel(block.goal_intent) : null;
  if (!badge) return raw;

  let title = raw.replace(/\s*\([^)]*\)\s*$/, "").trim();
  if (title === "Main") {
    const structural = STRUCTURAL_BLOCK_TITLES[block.block_type];
    if (structural) return structural;
  }
  const structural = STRUCTURAL_BLOCK_TITLES[block.block_type];
  if (structural && /^main\b/i.test(title)) {
    return structural;
  }
  return title || structural || raw;
}
