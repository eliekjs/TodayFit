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

/**
 * Flattens user-selected sport sub-focuses (canonical sport slug + sub slug) for UI chips.
 * Merges `session_intent.sport_sub_focus_by_sport` with legacy `input.sport_sub_focus`.
 */
export function collectDeclaredSportSubFocuses(
  input: GenerateWorkoutInput
): { parent_slug: string; slug: string }[] {
  const bySport: Record<string, Set<string>> = {};
  const add = (sportKey: string, slugs: string[]) => {
    const canon = getCanonicalSportSlug(String(sportKey).toLowerCase().replace(/\s/g, "_"));
    if (!bySport[canon]) bySport[canon] = new Set();
    for (const s of slugs) {
      if (s) bySport[canon].add(String(s).toLowerCase().replace(/\s/g, "_"));
    }
  };

  const fromSession = input.session_intent?.sport_sub_focus_by_sport;
  if (fromSession) {
    for (const [k, v] of Object.entries(fromSession)) {
      if (v?.length) add(k, v);
    }
  }
  const legacy = input.sport_sub_focus;
  if (legacy) {
    for (const [k, v] of Object.entries(legacy)) {
      if (v?.length) add(k, v);
    }
  }

  const out: { parent_slug: string; slug: string }[] = [];
  for (const [parent_slug, set] of Object.entries(bySport)) {
    for (const slug of set) out.push({ parent_slug, slug });
  }
  return out;
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

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Allocate `n` exercise slots to fitness goals using match weights (largest-remainder + shuffle).
 */
export function allocateFitnessGoalsToSlots(
  goals: PrimaryGoal[],
  weights: number[] | undefined,
  n: number,
  seed: number
): PrimaryGoal[] {
  if (n <= 0 || goals.length === 0) return [];
  const g = [...goals];
  const w =
    weights && weights.length === g.length && weights.some((x) => x > 0)
      ? [...weights]
      : g.map(() => 1 / g.length);
  const sumW = w.reduce((s, x) => s + x, 0);
  const norm = sumW > 0 ? w.map((x) => x / sumW) : w.map(() => 1 / w.length);
  const counts = norm.map((x) => Math.floor(n * x));
  const tallied = counts.reduce((s, c) => s + c, 0);
  const rem = n - tallied;
  const fracs = norm.map((x, i) => ({ i, r: n * x - counts[i]! }));
  fracs.sort((a, b) => b.r - a.r);
  for (let k = 0; k < rem; k++) {
    counts[fracs[k % fracs.length]!.i]! += 1;
  }
  const seq: PrimaryGoal[] = [];
  for (let i = 0; i < g.length; i++) {
    for (let j = 0; j < counts[i]!; j++) seq.push(g[i]!);
  }
  const rng = mulberry32(seed);
  for (let i = seq.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = seq[i]!;
    seq[i] = seq[j]!;
    seq[j] = tmp;
  }
  return seq;
}

function filterSubFocusForPrimary(
  primary: PrimaryGoal,
  rows: { goal_slug: string; sub_slug: string }[],
  ex: Exercise | undefined
): { goal_slug: string; sub_slug: string }[] {
  const keySet = new Set(goalSubFocusKeysForPrimary(primary));
  const matched = rows.filter((r) => keySet.has(r.goal_slug));
  if (matched.length === 0) return [];
  if (matched.length === 1 || !ex) return [matched[0]!];
  const withEx = matched.filter((r) => exerciseMatchesGoalSubFocusSlugUnified(ex, r.goal_slug, r.sub_slug));
  return [withEx[0] ?? matched[0]!];
}

function filterMatchedIntentsForPrimary(
  primary: PrimaryGoal,
  matched: MatchedIntentEntry[] | undefined
): MatchedIntentEntry[] | undefined {
  if (!matched?.length) return undefined;
  const out = matched.filter((m) => {
    if (m.kind === "goal") return m.slug === primary;
    if (m.kind === "goal_sub_focus") return m.parent_slug === primary;
    return true;
  });
  const goalSubs = out.filter((m) => m.kind === "goal_sub_focus");
  const sports = out.filter((m) => m.kind === "sport" || m.kind === "sport_sub_focus");
  const goalRows = out.filter((m) => m.kind === "goal");
  const pickedSubs = goalSubs.length ? [goalSubs.sort((a, b) => a.rank - b.rank)[0]!] : [];
  const pickedGoals = goalRows.length ? [goalRows.sort((a, b) => a.rank - b.rank)[0]!] : [];
  const merged = [...pickedGoals, ...pickedSubs, ...sports];
  return merged.length ? merged : undefined;
}

function applyPrimaryToSessionIntentLinks(
  base: NonNullable<WorkoutItem["session_intent_links"]>,
  primary: PrimaryGoal,
  ex: Exercise | undefined
): NonNullable<WorkoutItem["session_intent_links"]> {
  const subFocus = filterSubFocusForPrimary(primary, base.sub_focus ?? [], ex);
  const matched = filterMatchedIntentsForPrimary(primary, base.matched_intents);
  const out: NonNullable<WorkoutItem["session_intent_links"]> = {
    declared_sport_sub_focuses: base.declared_sport_sub_focuses,
    sport_slugs: base.sport_slugs,
    goals: [primary as string],
    ...(subFocus.length ? { sub_focus: subFocus } : {}),
    ...(matched?.length ? { matched_intents: matched } : {}),
  };
  return out;
}

const SESSION_PREP_BLOCK_TYPES = new Set<BlockType>(["warmup", "cooldown"]);

export function buildWorkoutItemSessionIntentLinks(
  ex: Exercise,
  input: GenerateWorkoutInput,
  blockType: BlockType
): NonNullable<WorkoutItem["session_intent_links"]> {
  const computed = computeSessionIntentLinks(ex, input);
  const declaredSportSubs = collectDeclaredSportSubFocuses(input);
  const declaredSportField =
    declaredSportSubs.length > 0 ? { declared_sport_sub_focuses: declaredSportSubs } : {};

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

  /** Provisional goals: proportional pass assigns one fitness goal per working set. */
  if (computed.goals.length > 0 || computed.sub_focus.length > 0) {
    return {
      goals: computed.goals,
      ...(computed.sub_focus.length ? { sub_focus: computed.sub_focus } : {}),
      ...(sportMatched.length ? { sport_slugs: sportMatched } : {}),
      ...declaredSportField,
      ...matchedIntentsField,
    };
  }
  if (sportMatched.length) {
    return { goals: [], sport_slugs: sportMatched, ...declaredSportField, ...matchedIntentsField };
  }
  if (SESSION_PREP_BLOCK_TYPES.has(blockType)) {
    return { goals: [], session_prep: true, ...declaredSportField, ...matchedIntentsField };
  }
  return { goals: [], intent_inferred: true, ...declaredSportField, ...matchedIntentsField };
}

/**
 * When an exercise id is missing from the annotation map (e.g. picked from an edge pool),
 * still attach session-level chips so UI never shows a blank "FOR:" row.
 */
export function buildFallbackSessionIntentLinks(
  input: GenerateWorkoutInput,
  blockType: BlockType
): NonNullable<WorkoutItem["session_intent_links"]> {
  const declaredSportSubs = collectDeclaredSportSubFocuses(input);
  const declaredSportField =
    declaredSportSubs.length > 0 ? { declared_sport_sub_focuses: declaredSportSubs } : {};
  if (SESSION_PREP_BLOCK_TYPES.has(blockType)) {
    return { goals: [], session_prep: true, ...declaredSportField };
  }
  return { goals: [], intent_inferred: true, ...declaredSportField };
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
      item.session_intent_links = ex
        ? buildWorkoutItemSessionIntentLinks(ex, input, bt)
        : buildFallbackSessionIntentLinks(input, bt);
    }
  }

  const selectedFitnessGoals = collectUniqueSessionGoals(input);
  const weights =
    input.session_intent?.goal_weights ??
    input.goal_weights ??
    selectedFitnessGoals.map(() => 1 / Math.max(selectedFitnessGoals.length, 1));

  const workingItems: { blockType: BlockType; item: WorkoutItem; ex: Exercise | undefined }[] = [];
  for (const block of mergedBlocks) {
    const bt = block.block_type as BlockType;
    if (SESSION_PREP_BLOCK_TYPES.has(bt)) continue;
    for (const item of block.items) {
      workingItems.push({
        blockType: bt,
        item,
        ex: exerciseById.get(item.exercise_id),
      });
    }
  }

  const n = workingItems.length;
  if (n > 0 && selectedFitnessGoals.length > 0) {
    const seq = allocateFitnessGoalsToSlots(selectedFitnessGoals, weights, n, input.seed ?? 0);
    for (let i = 0; i < n; i++) {
      const { item, ex } = workingItems[i]!;
      const base = item.session_intent_links;
      if (!base) continue;
      const g = seq[i] ?? selectedFitnessGoals[0]!;
      item.session_intent_links = applyPrimaryToSessionIntentLinks(base, g, ex);
    }
  }

  const prepGoal = selectedFitnessGoals[0] ?? input.primary_goal;
  for (const block of mergedBlocks) {
    const bt = block.block_type as BlockType;
    if (!SESSION_PREP_BLOCK_TYPES.has(bt)) continue;
    for (const item of block.items) {
      const base = item.session_intent_links;
      if (!base) continue;
      const ex = exerciseById.get(item.exercise_id);
      item.session_intent_links = {
        ...applyPrimaryToSessionIntentLinks(base, prepGoal, ex),
        session_prep: true,
      };
    }
  }
}
