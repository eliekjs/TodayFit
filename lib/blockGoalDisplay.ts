import { getCanonicalSportSlug } from "../data/sportSubFocus/canonicalSportSlug";
import { SPORTS_WITH_SUB_FOCUSES } from "../data/sportSubFocus/sportsWithSubFocuses";
import type { WorkoutBlock, WorkoutBlockGoalIntent } from "./types";

const _sportBySlug = new Map(SPORTS_WITH_SUB_FOCUSES.map((s) => [s.slug, s]));

function _sportSubFocusDisplayName(sportSlug: string, subSlug: string): string {
  const canon = getCanonicalSportSlug(sportSlug);
  const sport = _sportBySlug.get(canon);
  const norm = subSlug.toLowerCase().replace(/\s/g, "_");
  const sf = sport?.sub_focuses.find((f) => f.slug === norm);
  return sf?.name ?? _humanizeGoalSlug(subSlug);
}

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
  prep: "Activation",
  main_strength: "Primary Strength",
  main_hypertrophy: "Hypertrophy",
  power: "Power / Speed",
  accessory: "Accessory",
  skill: "Skill",
  conditioning: "Conditioning",
  cooldown: "Cooldown",
  mobility: "Mobility",
  recovery: "Recovery",
  core: "Core",
};

/** User-facing name for a block type (Activation, Primary Strength, …). */
export function structuralBlockTitle(blockType: string): string {
  return STRUCTURAL_BLOCK_TITLES[blockType] ?? blockType.replace(/_/g, " ");
}

const GENERIC_STRUCTURAL_TITLES = new Set([
  "activation",
  "warmup",
  "main_strength",
  "main strength",
  "primary strength",
  "secondary strength",
  "main hypertrophy",
  "hypertrophy",
  "power block",
  "power",
  "power / speed",
  "accessory",
  "skill",
  "conditioning",
  "cooldown",
  "mobility",
  "recovery",
  "core",
]);

/** True when the title is a generic six-block name, not a specific program title. */
export function isGenericStructuralTitle(title: string): boolean {
  const n = title.toLowerCase().trim();
  if (!n) return true;
  if (GENERIC_STRUCTURAL_TITLES.has(n)) return true;
  if (/^block [a-z]+$/i.test(n)) return true;
  if (/^main strength\b/i.test(n)) return true;
  if (/^main hypertrophy\b/i.test(n)) return true;
  if (/^power block\b/i.test(n)) return true;
  return false;
}

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
      return _sportSubFocusDisplayName(sportSlug, sub_focus_slug);
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
 * Block title for display.
 * Specific program titles (Calisthenics, HIIT, Zone 2, joint-health PT, etc.) win.
 * Generic titles map onto the six-block structure. Goal badges stay separate.
 */
export function getBlockDisplayTitle(block: WorkoutBlock): string {
  const raw = stripSecondaryGoalTitleSuffix(
    block.title ?? block.block_type.replace(/_/g, " ")
  );
  const badge = block.goal_intent ? buildBlockGoalBadgeLabel(block.goal_intent) : null;
  const title = badge ? raw.replace(/\s*\([^)]*\)\s*$/, "").trim() : raw;
  const structural = STRUCTURAL_BLOCK_TITLES[block.block_type];

  if (block.block_type === "main_strength" && /secondary/i.test(title)) {
    return "Secondary Strength";
  }

  if (title && !isGenericStructuralTitle(title)) {
    return title;
  }

  if (title === "Main" && structural) return structural;
  if (structural && /^main\b/i.test(title)) return structural;
  if (block.block_type === "power" && /^power\b/i.test(title)) return structural ?? title;

  return structural || title || raw;
}
