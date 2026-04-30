/**
 * Session intent coverage: maps declared goals / sub-focuses to exercises and annotates workout output.
 * Used by dailyGenerator so every workout ties moves to user intent (product + traceability).
 */

import type { BlockType, WorkoutItem } from "../../lib/types";
import type { Exercise, GenerateWorkoutInput, PrimaryGoal, WorkoutBlock } from "./types";
import type { IntentEntry } from "./sessionIntentContract";
import { getCanonicalSportSlug } from "../../data/sportSubFocus/canonicalSportSlug";
import { exerciseCountsAsCooldownMobilityForValidator } from "./cooldownSelection";
import { exerciseMatchesGoalSubFocusSlugUnified } from "./subFocusSlugMatch";

/** Maps generator PrimaryGoal to keys used in `goal_sub_focus` / manual adapter (muscle, physique, …). */
export function goalSubFocusKeysForPrimary(primary: PrimaryGoal): string[] {
  switch (primary) {
    case "strength":
      return ["strength"];
    case "hypertrophy":
      return ["muscle", "hypertrophy"];
    case "body_recomp":
      return ["physique"];
    case "conditioning":
      return ["conditioning"];
    case "endurance":
      return ["endurance"];
    case "mobility":
      return ["mobility"];
    case "recovery":
      return ["resilience"];
    case "power":
      return ["conditioning"];
    case "athletic_performance":
      return ["strength"];
    case "calisthenics":
      return ["strength"];
    default:
      return [];
  }
}

export function collectUniqueSessionGoals(input: GenerateWorkoutInput): PrimaryGoal[] {
  const fromSessionIntent = input.session_intent?.selected_goals ?? [];
  if (fromSessionIntent.length > 0) return [...new Set(fromSessionIntent)];
  return [...new Set([input.primary_goal, ...(input.secondary_goals ?? [])])];
}

/** Union of `goal_sub_focus` object keys that apply to any active session goal. */
export function collectActiveGoalSubFocusKeys(input: GenerateWorkoutInput): Set<string> {
  const fromSessionIntent = input.session_intent?.goal_sub_focus_by_goal ?? {};
  if (Object.keys(fromSessionIntent).length > 0) {
    return new Set(Object.keys(fromSessionIntent));
  }
  const keys = new Set<string>();
  for (const g of collectUniqueSessionGoals(input)) {
    for (const k of goalSubFocusKeysForPrimary(g)) keys.add(k);
  }
  return keys;
}

export function goalTagAliases(goal: PrimaryGoal): string[] {
  if (goal === "athletic_performance") return ["athleticism", "power"];
  if (goal === "body_recomp") return ["hypertrophy", "strength"];
  return [goal];
}

export function exerciseMatchesDeclaredGoal(ex: Exercise, goal: PrimaryGoal): boolean {
  const tags = new Set((ex.tags.goal_tags ?? []).map((t) => t.toLowerCase().replace(/\s/g, "_")));
  for (const g of goalTagAliases(goal)) {
    const norm = g.toLowerCase().replace(/\s/g, "_");
    if (tags.has(norm)) return true;
  }
  const attrs = new Set((ex.tags.attribute_tags ?? []).map((t) => t.toLowerCase().replace(/\s/g, "_")));
  const stimulus = new Set((ex.tags.stimulus ?? []).map((t) => t.toLowerCase().replace(/\s/g, "_")));
  const modality = (ex.modality ?? "").toLowerCase().replace(/\s/g, "_");
  if (goal === "power" && (modality === "power" || stimulus.has("plyometric") || attrs.has("explosive_power"))) return true;
  if (goal === "endurance" && (modality === "conditioning" || stimulus.has("aerobic_zone2") || attrs.has("zone2_aerobic_base")))
    return true;
  if (goal === "recovery" && (modality === "recovery" || exerciseCountsAsCooldownMobilityForValidator(ex))) return true;
  return false;
}

export function exerciseMatchesSportIntent(ex: Exercise, input: GenerateWorkoutInput): boolean {
  const sports = input.session_intent?.selected_sports?.length
    ? input.session_intent.selected_sports
    : input.sport_slugs;
  if (!sports?.length) return false;
  const exSports = new Set(
    (ex.tags.sport_tags ?? []).map((t) => getCanonicalSportSlug(String(t).toLowerCase().replace(/\s/g, "_")))
  );
  return sports.some((s) => exSports.has(getCanonicalSportSlug(s)));
}

export function itemMatchesDeclaredGoal(
  item: WorkoutItem,
  goal: PrimaryGoal,
  exerciseById: Map<string, Exercise>
): boolean {
  const rtags = (item.reasoning_tags ?? []).map((t) => String(t).toLowerCase().replace(/\s/g, "_"));
  if (rtags.includes(goal.toLowerCase().replace(/\s/g, "_"))) return true;
  const ex = exerciseById.get(item.exercise_id);
  if (!ex) return false;
  return exerciseMatchesDeclaredGoal(ex, goal);
}

export type MatchedIntentEntry = {
  kind: "goal" | "goal_sub_focus" | "sport" | "sport_sub_focus";
  slug: string;
  parent_slug?: string;
  match_strength: "direct" | "partial" | "inferred";
  rank: number;
  weight: number;
};

export type SessionIntentComputation = {
  goals: string[];
  sub_focus: { goal_slug: string; sub_slug: string }[];
  matched_intents?: MatchedIntentEntry[];
};

/**
 * For each ranked intent entry, checks whether the exercise has matching tags.
 * "direct" = match found in goal_tags or sport_tags (primary intent signal).
 * "partial" = match found only in attribute_tags or stimulus (secondary signal).
 */
function computeMatchedIntents(
  ex: Exercise,
  rankedEntries: IntentEntry[]
): MatchedIntentEntry[] {
  const norm = (t: string) => t.toLowerCase().replace(/\s/g, "_");

  const directTags = new Set([
    ...(ex.tags.goal_tags ?? []).map(norm),
    ...(ex.tags.sport_tags ?? []).map(norm),
  ]);
  const allTags = new Set([
    ...directTags,
    ...(ex.tags.attribute_tags ?? []).map(norm),
    ...(ex.tags.stimulus ?? []).map(norm),
    norm(ex.modality ?? ""),
  ]);

  const matched: MatchedIntentEntry[] = [];
  for (const entry of rankedEntries) {
    const normSlugs = entry.tag_slugs.map(norm);
    const hasAny = normSlugs.some((t) => allTags.has(t));
    if (!hasAny) continue;
    const isDirect = normSlugs.some((t) => directTags.has(t));
    const result: MatchedIntentEntry = {
      kind: entry.kind,
      slug: entry.slug,
      match_strength: isDirect ? "direct" : "partial",
      rank: entry.rank,
      weight: entry.weight,
    };
    if (entry.parent_slug != null) result.parent_slug = entry.parent_slug;
    matched.push(result);
  }
  // Sort by ascending rank (best match first)
  matched.sort((a, b) => a.rank - b.rank);
  return matched;
}

function dedupeSubFocus(rows: { goal_slug: string; sub_slug: string }[]): { goal_slug: string; sub_slug: string }[] {
  const seen = new Set<string>();
  const out: { goal_slug: string; sub_slug: string }[] = [];
  for (const r of rows) {
    const k = `${r.goal_slug}:${r.sub_slug}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

export function computeSessionIntentLinks(ex: Exercise, input: GenerateWorkoutInput): SessionIntentComputation {
  const goals: string[] = [];
  for (const g of collectUniqueSessionGoals(input)) {
    if (exerciseMatchesDeclaredGoal(ex, g)) goals.push(g);
  }
  const sub_focus: { goal_slug: string; sub_slug: string }[] = [];
  const activeKeys = collectActiveGoalSubFocusKeys(input);
  const gsf =
    input.session_intent?.goal_sub_focus_by_goal &&
    Object.keys(input.session_intent.goal_sub_focus_by_goal).length > 0
      ? input.session_intent.goal_sub_focus_by_goal
      : input.goal_sub_focus ?? {};
  for (const goalSlug of activeKeys) {
    const slugs = gsf[goalSlug];
    if (!slugs?.length) continue;
    for (const subSlug of slugs) {
      if (exerciseMatchesGoalSubFocusSlugUnified(ex, goalSlug, subSlug)) {
        sub_focus.push({ goal_slug: goalSlug, sub_slug: subSlug });
      }
    }
  }

  const rankedEntries = input.session_intent?.ranked_intent_entries;
  const matched_intents =
    rankedEntries && rankedEntries.length > 0
      ? computeMatchedIntents(ex, rankedEntries)
      : undefined;

  return {
    goals: [...new Set(goals)],
    sub_focus: dedupeSubFocus(sub_focus),
    ...(matched_intents ? { matched_intents } : {}),
  };
}

/** True when tags/sub-focus/sport show this exercise supports the session contract. */
export function exerciseSatisfiesSessionIntent(ex: Exercise, input: GenerateWorkoutInput): boolean {
  const links = computeSessionIntentLinks(ex, input);
  if (links.goals.length > 0 || links.sub_focus.length > 0) return true;
  return exerciseMatchesSportIntent(ex, input);
}

const SESSION_PREP_BLOCK_TYPES = new Set<BlockType>(["warmup", "cooldown"]);

export function buildWorkoutItemSessionIntentLinks(
  ex: Exercise,
  input: GenerateWorkoutInput,
  blockType: BlockType
): NonNullable<WorkoutItem["session_intent_links"]> {
  const computed = computeSessionIntentLinks(ex, input);
  const sportMatched =
    (input.session_intent?.selected_sports?.length
      ? input.session_intent.selected_sports
      : input.sport_slugs
    )?.filter((s) =>
      (ex.tags.sport_tags ?? []).some((t) => getCanonicalSportSlug(String(t)) === getCanonicalSportSlug(s))
    ) ?? [];

  const matchedIntentsField =
    computed.matched_intents && computed.matched_intents.length > 0
      ? { matched_intents: computed.matched_intents }
      : {};

  if (computed.goals.length > 0 || computed.sub_focus.length > 0) {
    return {
      goals: computed.goals,
      ...(computed.sub_focus.length ? { sub_focus: computed.sub_focus } : {}),
      ...(sportMatched.length ? { sport_slugs: sportMatched } : {}),
      ...matchedIntentsField,
    };
  }
  if (sportMatched.length) {
    return { sport_slugs: sportMatched, ...matchedIntentsField };
  }
  if (SESSION_PREP_BLOCK_TYPES.has(blockType)) {
    return { goals: [input.primary_goal], session_prep: true, ...matchedIntentsField };
  }
  return { goals: [input.primary_goal], intent_inferred: true, ...matchedIntentsField };
}

export function annotateSessionIntentLinksOnBlocks(
  mergedBlocks: WorkoutBlock[],
  input: GenerateWorkoutInput,
  exerciseById: Map<string, Exercise>
): void {
  for (const block of mergedBlocks) {
    const bt = block.block_type as BlockType;
    for (const item of block.items) {
      const ex = exerciseById.get(item.exercise_id);
      if (!ex) continue;
      item.session_intent_links = buildWorkoutItemSessionIntentLinks(ex, input, bt);
    }
  }
}
