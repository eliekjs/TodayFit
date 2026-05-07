/**
 * Session intent coverage: maps declared goals / sub-focuses to exercises and annotates workout output.
 * Used by dailyGenerator so every workout ties moves to user intent (product + traceability).
 */

import type { BlockType, WorkoutBlockGoalIntent, WorkoutItem } from "../../lib/types";
import type { Exercise, GenerateWorkoutInput, PrimaryGoal, WorkoutBlock } from "./types";
import type { IntentEntry } from "./sessionIntentContract";
import { getCanonicalSportSlug } from "../../data/sportSubFocus/canonicalSportSlug";
import { exerciseCountsAsCooldownMobilityForValidator } from "./cooldownSelection";
import {
  exerciseMatchesGoalSubFocusSlugUnified,
  exerciseMatchesSportSubFocusForCoverage,
} from "./subFocusSlugMatch";

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

function exerciseMatchesGoalSubFocusIntentRanked(
  ex: Exercise,
  parentPrimary: PrimaryGoal,
  subSlug: string
): boolean {
  for (const key of goalSubFocusKeysForPrimary(parentPrimary)) {
    if (exerciseMatchesGoalSubFocusSlugUnified(ex, key, subSlug)) return true;
  }
  return false;
}

function exerciseMatchesRankedSportSlug(ex: Exercise, sportSlug: string): boolean {
  const want = getCanonicalSportSlug(sportSlug);
  return (ex.tags.sport_tags ?? []).some((t) => getCanonicalSportSlug(String(t)) === want);
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
 * For each ranked intent entry, map exercise → intent with sport/goal-aware rules.
 * Sport sub-focus requires canonical `sport_tags` plus tags from SUB_FOCUS_TAG_MAP (avoids generic
 * quality overlap falsely hitting every climbing sub-goal). Goal sub-focus uses the same unified
 * slug matcher as coverage. Unknown entries fall back to legacy overlap on `tag_slugs`.
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
    let matchedEntry = false;
    let matchDirect = false;

    if (entry.kind === "sport_sub_focus" && entry.parent_slug) {
      matchedEntry = exerciseMatchesSportSubFocusForCoverage(ex, entry.parent_slug, entry.slug);
      matchDirect = matchedEntry;
    } else if (entry.kind === "goal_sub_focus" && entry.parent_slug) {
      matchedEntry = exerciseMatchesGoalSubFocusIntentRanked(
        ex,
        entry.parent_slug as PrimaryGoal,
        entry.slug
      );
      matchDirect = matchedEntry;
    } else if (entry.kind === "goal") {
      matchedEntry = exerciseMatchesDeclaredGoal(ex, entry.slug as PrimaryGoal);
      matchDirect = matchedEntry;
    } else if (entry.kind === "sport") {
      matchedEntry = exerciseMatchesRankedSportSlug(ex, entry.slug);
      matchDirect = matchedEntry;
    } else {
      const normSlugs = entry.tag_slugs.map(norm);
      matchedEntry = normSlugs.length > 0 && normSlugs.some((t) => allTags.has(t));
      matchDirect = normSlugs.some((t) => directTags.has(t));
    }

    if (!matchedEntry) continue;

    const result: MatchedIntentEntry = {
      kind: entry.kind,
      slug: entry.slug,
      match_strength: matchDirect ? "direct" : "partial",
      rank: entry.rank,
      weight: entry.weight,
    };
    if (entry.parent_slug != null) result.parent_slug = entry.parent_slug;
    matched.push(result);
  }
  matched.sort((a, b) => a.rank - b.rank);

  // If the exercise already matched a sport sub-focus, the bare "athletic_performance" goal
  // entry conveys no useful information — suppress it so UI chips are specific, not generic.
  const hasSportSubFocusHit = matched.some((m) => m.kind === "sport_sub_focus");
  if (hasSportSubFocusHit) {
    return matched.filter((m) => !(m.kind === "goal" && m.slug === "athletic_performance"));
  }

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

function matchStrengthOrder(m: MatchedIntentEntry): number {
  return m.match_strength === "direct" ? 0 : m.match_strength === "partial" ? 1 : 2;
}

function intentSpecificityRank(m: MatchedIntentEntry): number {
  if (m.kind === "sport_sub_focus") return 0;
  if (m.kind === "goal_sub_focus") return 1;
  if (m.kind === "goal") return 2;
  return 3;
}

function filterMatchedIntentsForPrimary(
  primary: PrimaryGoal,
  matched: MatchedIntentEntry[] | undefined,
  ex: Exercise | undefined
): MatchedIntentEntry[] | undefined {
  if (!matched?.length) return undefined;

  const sortByStrengthThenRank = (a: MatchedIntentEntry, b: MatchedIntentEntry) => {
    const s = matchStrengthOrder(a) - matchStrengthOrder(b);
    if (s !== 0) return s;
    return a.rank - b.rank;
  };

  const picked: MatchedIntentEntry[] = [];

  const sportSubs = matched.filter((m) => m.kind === "sport_sub_focus");
  const bareSports = matched.filter((m) => m.kind === "sport");
  const hasSportSpecific = sportSubs.length > 0 || bareSports.length > 0;

  // When the session is sport-focused (athletic_performance) and there are direct sport/sub-focus
  // hits, suppress the bare "athletic_performance" goal entry — it adds no information beyond
  // what the sport chips already say.
  const suppressAthletic = primary === "athletic_performance" && hasSportSpecific;

  if (!suppressAthletic) {
    const goalRows = matched.filter((m) => m.kind === "goal");
    const primaryGoalRow = goalRows.find((m) => m.slug === primary);
    if (primaryGoalRow) picked.push(primaryGoalRow);
    else if (goalRows.length) picked.push([...goalRows].sort(sortByStrengthThenRank)[0]!);

    const secondaryGoalRows = goalRows.filter(
      (m) =>
        m.slug !== primary && ex != null && exerciseMatchesDeclaredGoal(ex, m.slug as PrimaryGoal)
    );
    if (secondaryGoalRows.length) picked.push([...secondaryGoalRows].sort(sortByStrengthThenRank)[0]!);

    const goalSubs = matched.filter((m) => m.kind === "goal_sub_focus");
    const primarySubs = goalSubs.filter((m) => m.parent_slug === primary);
    if (primarySubs.length) picked.push([...primarySubs].sort(sortByStrengthThenRank)[0]!);

    const extraSubs = goalSubs.filter(
      (m) =>
        m.parent_slug !== primary &&
        ex != null &&
        m.parent_slug != null &&
        exerciseMatchesGoalSubFocusIntentRanked(ex, m.parent_slug as PrimaryGoal, m.slug)
    );
    if (extraSubs.length) picked.push([...extraSubs].sort(sortByStrengthThenRank)[0]!);
  }

  // Sport sub-focus is always the most specific and most useful chip.
  if (sportSubs.length) picked.push([...sportSubs].sort(sortByStrengthThenRank)[0]!);
  if (!sportSubs.length && bareSports.length) picked.push([...bareSports].sort(sortByStrengthThenRank)[0]!);

  const seen = new Set<string>();
  const merged: MatchedIntentEntry[] = [];
  for (const p of picked) {
    const k = `${p.kind}:${p.slug}:${p.parent_slug ?? ""}`;
    if (seen.has(k)) continue;
    seen.add(k);
    merged.push(p);
  }

  merged.sort((a, b) => {
    const t = intentSpecificityRank(a) - intentSpecificityRank(b);
    if (t !== 0) return t;
    return sortByStrengthThenRank(a, b);
  });

  return merged.slice(0, 2).length ? merged.slice(0, 2) : undefined;
}

function applyPrimaryToSessionIntentLinks(
  base: NonNullable<WorkoutItem["session_intent_links"]>,
  primary: PrimaryGoal,
  ex: Exercise | undefined
): NonNullable<WorkoutItem["session_intent_links"]> {
  const subFocus = dedupeSubFocus(base.sub_focus ?? []);

  let goalsOut: string[] = [primary as string];
  if (ex != null && base.goals?.length) {
    const extra = base.goals.filter(
      (g) => g !== primary && exerciseMatchesDeclaredGoal(ex, g as PrimaryGoal)
    );
    goalsOut = [...new Set([primary as string, ...extra])];
  }

  const matched = filterMatchedIntentsForPrimary(primary, base.matched_intents, ex);
  const out: NonNullable<WorkoutItem["session_intent_links"]> = {
    declared_sport_sub_focuses: base.declared_sport_sub_focuses,
    sport_slugs: base.sport_slugs,
    ...(base.session_sport_slugs?.length ? { session_sport_slugs: base.session_sport_slugs } : {}),
    goals: goalsOut,
    ...(subFocus.length ? { sub_focus: subFocus } : {}),
    ...(matched?.length ? { matched_intents: matched } : {}),
    ...(base.session_prep ? { session_prep: true as const } : {}),
    ...(base.intent_inferred ? { intent_inferred: true as const } : {}),
  };
  return out;
}

const SESSION_PREP_BLOCK_TYPES = new Set<BlockType>(["warmup", "cooldown"]);

/**
 * Keep intent-dedicated blocks pure: if a block is allocated to a sub-intent
 * (goal sub-focus, sport, or sport sub-focus), do not also assign a fitness-goal slot.
 */
function isSubIntentDedicatedBlock(goalIntent: WorkoutBlockGoalIntent | undefined): boolean {
  if (!goalIntent) return false;
  if (goalIntent.intent_kind === "goal") return false;
  if (
    goalIntent.intent_kind === "goal_sub_focus" ||
    goalIntent.intent_kind === "sport" ||
    goalIntent.intent_kind === "sport_sub_focus"
  ) {
    return true;
  }
  // Backward compatibility: older dedicated blocks can omit intent_kind.
  return goalIntent.sub_focus_slug != null;
}

function enforceSubIntentSeparationOnLinks(
  base: NonNullable<WorkoutItem["session_intent_links"]> | undefined,
  goalIntent: WorkoutBlockGoalIntent | undefined
): NonNullable<WorkoutItem["session_intent_links"]> | undefined {
  if (!base || !isSubIntentDedicatedBlock(goalIntent)) return base;
  return {
    ...base,
    goals: [],
    ...(base.matched_intents?.length
      ? { matched_intents: base.matched_intents.filter((m) => m.kind !== "goal") }
      : {}),
  };
}

export function buildWorkoutItemSessionIntentLinks(
  ex: Exercise,
  input: GenerateWorkoutInput,
  blockType: BlockType
): NonNullable<WorkoutItem["session_intent_links"]> {
  const computed = computeSessionIntentLinks(ex, input);
  const declaredSportSubs = collectDeclaredSportSubFocuses(input);
  const declaredFiltered = declaredSportSubs.filter((d) =>
    exerciseMatchesSportSubFocusForCoverage(ex, d.parent_slug, d.slug)
  );
  const declaredSportField =
    declaredFiltered.length > 0 ? { declared_sport_sub_focuses: declaredFiltered } : {};

  const sessionSports: string[] =
    input.session_intent?.selected_sports?.length
      ? input.session_intent.selected_sports
      : (input.sport_slugs ?? []);

  const sportMatched = sessionSports.filter((s) =>
    (ex.tags.sport_tags ?? []).some((t) => getCanonicalSportSlug(String(t)) === getCanonicalSportSlug(s))
  );

  const sessionSportField =
    sessionSports.length > 0 ? { session_sport_slugs: sessionSports } : {};

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
      ...sessionSportField,
      ...matchedIntentsField,
    };
  }
  if (sportMatched.length) {
    return {
      goals: [],
      sport_slugs: sportMatched,
      ...declaredSportField,
      ...sessionSportField,
      ...matchedIntentsField,
    };
  }
  if (SESSION_PREP_BLOCK_TYPES.has(blockType)) {
    return { goals: [], session_prep: true, ...sessionSportField };
  }
  return { goals: [], intent_inferred: true, ...sessionSportField, ...matchedIntentsField };
}

/**
 * When an exercise id is missing from the annotation map (e.g. picked from an edge pool),
 * still attach session-level chips so UI never shows a blank "FOR:" row.
 */
export function buildFallbackSessionIntentLinks(
  input: GenerateWorkoutInput,
  blockType: BlockType
): NonNullable<WorkoutItem["session_intent_links"]> {
  const sessionSports: string[] =
    input.session_intent?.selected_sports?.length
      ? input.session_intent.selected_sports
      : (input.sport_slugs ?? []);
  const sessionSportField =
    sessionSports.length > 0 ? { session_sport_slugs: sessionSports } : {};
  if (SESSION_PREP_BLOCK_TYPES.has(blockType)) {
    return { goals: [], session_prep: true, ...sessionSportField };
  }
  return { goals: [], intent_inferred: true, ...sessionSportField };
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
      const links = ex
        ? buildWorkoutItemSessionIntentLinks(ex, input, bt)
        : buildFallbackSessionIntentLinks(input, bt);
      item.session_intent_links = enforceSubIntentSeparationOnLinks(links, block.goal_intent);
    }
  }

  const selectedFitnessGoals = collectUniqueSessionGoals(input);
  const weights =
    input.session_intent?.goal_weights ??
    input.goal_weights ??
    selectedFitnessGoals.map(() => 1 / Math.max(selectedFitnessGoals.length, 1));

  const workingItems: {
    blockType: BlockType;
    goalIntent: WorkoutBlockGoalIntent | undefined;
    item: WorkoutItem;
    ex: Exercise | undefined;
  }[] = [];
  for (const block of mergedBlocks) {
    const bt = block.block_type as BlockType;
    if (SESSION_PREP_BLOCK_TYPES.has(bt)) continue;
    for (const item of block.items) {
      workingItems.push({
        blockType: bt,
        goalIntent: block.goal_intent,
        item,
        ex: exerciseById.get(item.exercise_id),
      });
    }
  }

  const fitnessAssignableItems = workingItems.filter((row) => !isSubIntentDedicatedBlock(row.goalIntent));
  const n = fitnessAssignableItems.length;
  if (n > 0 && selectedFitnessGoals.length > 0) {
    const seq = allocateFitnessGoalsToSlots(selectedFitnessGoals, weights, n, input.seed ?? 0);
    for (let i = 0; i < n; i++) {
      const { item, ex } = fitnessAssignableItems[i]!;
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
