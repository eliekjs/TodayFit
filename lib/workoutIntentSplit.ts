/**
 * Utilities for computing and displaying workout focus splits (declared intent and actual exercise mix).
 * Used by: GenerationLoadingScreen (declared intent pie chart), workout screen (actual split display).
 */

import type { GeneratedWorkout, WorkoutBlock, WorkoutItem } from "./types";
import type {
  GenerateWorkoutInput,
  GoalSubFocusInput,
  GoalSubFocusWeightsInput,
  PrimaryGoal,
} from "../logic/workoutGeneration/types";
import {
  GOAL_SLUG_TO_LABEL,
  GOAL_SLUG_TO_PRIMARY_FOCUS,
  normalizeGoalMatchPct,
} from "./preferencesConstants";
import {
  GOAL_SUB_FOCUS_OPTIONS,
  resolveGoalSubFocusSlugs,
  resolveSubFocusProfile,
} from "../data/goalSubFocus";
import {
  goalSubFocusKeysForPrimary,
  goalTagAliases,
} from "../logic/workoutGeneration/sessionIntentCoverage";
import { getCanonicalSportSlug } from "../data/sportSubFocus";

export type IntentSplitEntry = {
  slug: string;
  label: string;
  /** 0..1 weight */
  weight: number;
  /** 0..100 rounded percentage */
  pct: number;
  kind: "sport" | "goal" | "goal_sub_focus" | "sport_sub_focus";
  /** Parent sport slug or goal-sub bucket key (e.g. muscle). */
  parent_slug?: string;
  /** Hex color for pie chart segment */
  color: string;
};

const SPLIT_COLORS = [
  "#2dd4bf", // teal (primary)
  "#3b82f6", // blue (secondary)
  "#a78bfa", // violet
  "#f59e0b", // amber
  "#f472b6", // pink
  "#22c55e", // green
  "#f97316", // orange
  "#e879f9", // fuchsia
];

/** Max segments in the donut (remaining weight is omitted from the chart but declared split still informs generation). */
const MAX_SPLIT_SEGMENTS = 12;

const PREP_BLOCK_TYPES = new Set(["warmup", "cooldown"]);

/** Map manual / DB goal slug to generator `PrimaryGoal` (e.g. muscle → hypertrophy). */
function manualGoalSlugToPrimaryGoal(slug: string): PrimaryGoal {
  const norm = slug.toLowerCase().replace(/\s/g, "_");
  const m: Record<string, PrimaryGoal> = {
    muscle: "hypertrophy",
    strength: "strength",
    physique: "body_recomp",
    conditioning: "conditioning",
    endurance: "endurance",
    mobility: "mobility",
    resilience: "recovery",
  };
  if (m[norm]) return m[norm]!;
  return norm as PrimaryGoal;
}

function colorForIndex(i: number): string {
  return SPLIT_COLORS[i % SPLIT_COLORS.length]!;
}

function humanizeToken(slug: string): string {
  return slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function labelForSportSlug(slug: string): string {
  const map: Record<string, string> = {
    rock_climbing: "Climbing",
    climbing: "Climbing",
    alpine_skiing: "Alpine Skiing",
    snowboarding: "Snowboarding",
    backcountry_skiing: "Backcountry Ski",
    xc_skiing: "XC Skiing",
    trail_running: "Trail Running",
    road_running: "Running",
    hiking_backpacking: "Hiking",
    hiking: "Hiking",
    soccer: "Soccer",
    surfing: "Surfing",
    kite_surfing: "Kitesurfing",
    wind_surfing: "Windsurfing",
    mountain_biking: "Mountain Biking",
    hyrox: "Hyrox",
  };
  return (
    map[slug] ??
    GOAL_SLUG_TO_LABEL[slug] ??
    humanizeToken(slug)
  );
}

const GOAL_LABEL_MAP: Record<string, string> = {
  strength: "Strength",
  muscle: "Muscle",
  hypertrophy: "Muscle",
  body_recomp: "Body Recomp",
  endurance: "Endurance",
  conditioning: "Conditioning",
  mobility: "Mobility",
  recovery: "Recovery",
  resilience: "Recovery",
  power: "Power",
  athletic_performance: "Athletic",
  calisthenics: "Calisthenics",
};

export function labelForGoalSlug(slug: string): string {
  return (
    GOAL_LABEL_MAP[slug] ??
    GOAL_SLUG_TO_LABEL[slug] ??
    humanizeToken(slug)
  );
}

export function manualLabelForGoalSlug(goalSlug: string): string | null {
  return GOAL_SLUG_TO_PRIMARY_FOCUS[goalSlug] ?? null;
}

function labelForGoalSubFocusBucket(bucketKey: string, subSlug: string): string {
  for (const entry of Object.values(GOAL_SUB_FOCUS_OPTIONS)) {
    if (entry.goalSlug !== bucketKey) continue;
    const sf = entry.subFocuses.find((s) => s.slug === subSlug);
    if (sf) return `${labelForGoalSlug(bucketKey)} · ${sf.name}`;
  }
  return `${labelForGoalSlug(bucketKey)} · ${humanizeToken(subSlug)}`;
}

function labelForSportSubFocus(sportSlug: string, subSlug: string): string {
  return `${labelForSportSlug(sportSlug)} · ${humanizeToken(subSlug)}`;
}

function sportSubFocusList(
  sportSub: Record<string, string[]> | undefined,
  sport: string
): string[] {
  if (!sportSub) return [];
  const canon = getCanonicalSportSlug(sport.replace(/\s/g, "_").toLowerCase());
  const raw =
    sportSub[sport] ??
    sportSub[canon] ??
    sportSub[sport.replace(/\s/g, "_")] ??
    [];
  return raw ?? [];
}

function findGoalSubFocusBucket(
  goal: PrimaryGoal,
  goal_sub_focus: GoalSubFocusInput | undefined
): { bucketKey: string; slugs: string[] } | undefined {
  if (!goal_sub_focus) return undefined;
  for (const key of goalSubFocusKeysForPrimary(goal)) {
    const slugs = goal_sub_focus[key];
    if (slugs?.length) return { bucketKey: key, slugs };
  }
  return undefined;
}

function normalizePositiveWeights(weights: number[]): number[] {
  const sum = weights.reduce((s, w) => s + Math.max(0, w), 0);
  if (sum <= 0) return weights.map(() => 1 / Math.max(1, weights.length));
  return weights.map((w) => Math.max(0, w) / sum);
}

function roundPctsTo100(weights: number[]): number[] {
  if (weights.length === 0) return [];
  const sum = weights.reduce((s, w) => s + w, 0);
  if (sum <= 0) return weights.map(() => 0);
  const floats = weights.map((w) => (w / sum) * 100);
  const floors = floats.map((f) => Math.floor(f));
  let rem = 100 - floors.reduce((a, b) => a + b, 0);
  const fracOrder = floats
    .map((f, i) => ({ i, r: f - Math.floor(f) }))
    .sort((a, b) => b.r - a.r);
  const pcts = [...floors];
  for (let k = 0; k < fracOrder.length && rem > 0; k++, rem--) {
    const idx = fracOrder[k]?.i ?? 0;
    pcts[idx] = (pcts[idx] ?? 0) + 1;
  }
  return pcts;
}

function finalizeSplitEntries(
  rawEntries: Omit<IntentSplitEntry, "color" | "pct">[]
): IntentSplitEntry[] {
  const filtered = rawEntries.filter((e) => e.weight >= 0.001);
  filtered.sort((a, b) => b.weight - a.weight);
  const top = filtered.slice(0, MAX_SPLIT_SEGMENTS);
  const sumW = top.reduce((s, e) => s + e.weight, 0);
  const pcts =
    sumW > 0 ? roundPctsTo100(top.map((e) => e.weight / sumW)) : top.map(() => 0);
  return top.map((e, i) => ({ ...e, pct: pcts[i]!, color: colorForIndex(i) }));
}

/**
 * Compute declared intent split from GenerateWorkoutInput.
 * Expands goal and sport sub-focuses when provided; respects unequal dual-sport share when passed via prefs helper.
 */
export type DeclaredIntentSplitOptions = {
  /** Length = sport_slugs.length, sums ~1 — each sport's share of the sport budget (e.g. 60/40). */
  sportSharesAmongSportsNormalized?: number[];
};

export function computeDeclaredIntentSplit(
  input: GenerateWorkoutInput,
  options?: DeclaredIntentSplitOptions
): IntentSplitEntry[] {
  const sportWeight = Math.max(0, Math.min(1, input.sport_weight ?? 0));
  const goalWeightFraction = 1 - sportWeight;

  const rawEntries: Omit<IntentSplitEntry, "color" | "pct">[] = [];

  const sports = input.sport_slugs ?? [];
  const sportSub = input.sport_sub_focus;
  if (sports.length > 0 && sportWeight > 0) {
    const equalShares = sports.map(() => 1 / Math.max(1, sports.length));
    const sharesIn =
      options?.sportSharesAmongSportsNormalized?.length === sports.length
        ? options.sportSharesAmongSportsNormalized.map((v) => Math.max(0, v))
        : equalShares;
    const shareSum = sharesIn.reduce((s, v) => s + v, 0);
    const shareAmongSports = shareSum > 0 ? sharesIn.map((v) => v / shareSum) : equalShares;
    for (let si = 0; si < sports.length; si++) {
      const sport = sports[si]!;
      const sportShareAmongAll = sportWeight * (shareAmongSports[si] ?? 1 / sports.length);
      const subs = sportSubFocusList(sportSub, sport);
      if (subs.length === 0) {
        rawEntries.push({
          slug: sport,
          label: labelForSportSlug(sport),
          weight: sportShareAmongAll,
          kind: "sport",
        });
      } else {
        const subW = normalizePositiveWeights(subs.map(() => 1));
        subs.forEach((sub, idx) => {
          rawEntries.push({
            slug: `${getCanonicalSportSlug(sport)}:${String(sub).toLowerCase().replace(/\s/g, "_")}`,
            parent_slug: getCanonicalSportSlug(sport),
            label: labelForSportSubFocus(sport, sub),
            weight: sportShareAmongAll * (subW[idx] ?? 1 / subs.length),
            kind: "sport_sub_focus",
          });
        });
      }
    }
  }

  const goalRowSlugs: PrimaryGoal[] = [
    manualGoalSlugToPrimaryGoal(String(input.primary_goal)),
    ...(input.secondary_goals ?? []).map((g) => manualGoalSlugToPrimaryGoal(String(g))),
  ];
  const rawGoalWeights =
    input.goal_weights ??
    goalRowSlugs.map((_, i) => (i === 0 ? 0.5 : i === 1 ? 0.3 : 0.2));
  const goalWeightSum = rawGoalWeights.slice(0, goalRowSlugs.length).reduce((s, w) => s + w, 0);

  const goal_weights_for_sub =
    input.goal_sub_focus_weights ?? ({} as GoalSubFocusWeightsInput);

  for (let i = 0; i < goalRowSlugs.length; i++) {
    const goal = goalRowSlugs[i]!;
    const normGoalW =
      goalWeightSum > 0
        ? (rawGoalWeights[i] ?? 0) / goalWeightSum
        : 1 / Math.max(1, goalRowSlugs.length);
    const absWeight = normGoalW * goalWeightFraction;
    if (absWeight < 0.001) continue;

    const subBucket = findGoalSubFocusBucket(goal, input.goal_sub_focus);
    if (subBucket) {
      const { bucketKey, slugs } = subBucket;
      const wArr = goal_weights_for_sub[bucketKey];
      const subNorm = normalizePositiveWeights(
        wArr && wArr.length === slugs.length ? wArr : slugs.map(() => 1)
      );
      for (let j = 0; j < slugs.length; j++) {
        const subSlug = slugs[j]!;
        rawEntries.push({
          slug: `${bucketKey}:${subSlug}`,
          parent_slug: bucketKey,
          label: labelForGoalSubFocusBucket(bucketKey, subSlug),
          weight: absWeight * (subNorm[j] ?? 1 / slugs.length),
          kind: "goal_sub_focus",
        });
      }
    } else {
      rawEntries.push({
        slug: goal,
        label: labelForGoalSlug(String(goal)),
        weight: absWeight,
        kind: "goal",
      });
    }
  }

  return finalizeSplitEntries(rawEntries);
}

export type DeclaredIntentSplitFromPrefsOpts = {
  sportSlugs: string[];
  goalSlugs: string[];
  sportVsGoalPct: number;
  goalMatchPrimaryPct?: number;
  goalMatchSecondaryPct?: number;
  goalMatchTertiaryPct?: number;
  /** When two sports are selected: share of sport budget for each `[first, second]` (should sum ~100). */
  sportShareAmongSportsPct?: [number, number];
  /** Manual primary-focus label → sub-goals (same as ManualPreferences.subFocusByGoal). */
  subFocusByGoal?: Record<string, string[]>;
  /** Like ManualPreferences.weekSubFocusPrimaryLabels: labels to merge subs from when set. */
  weekSubFocusPrimaryLabels?: string[];
  /** Ordered primary-focus labels matching `goalSlugs` (preferred for sub-goal merge when goal slugs are adaptive IDs). */
  orderedPrimaryLabelsForSubFocus?: string[];
  /** Canonical sport slug → sport sub-focus slugs. */
  sportSubFocusBySport?: Record<string, string[]>;
};

function mergeGoalSubFocusMapsFromPrefs(opts: DeclaredIntentSplitFromPrefsOpts): {
  goal_sub_focus: GoalSubFocusInput;
  goal_sub_focus_weights: GoalSubFocusWeightsInput;
} {
  const goal_sub_focus: GoalSubFocusInput = {};
  const goal_sub_focus_weights: GoalSubFocusWeightsInput = {};
  const subMap = opts.subFocusByGoal ?? {};
  const labelsForMerge =
    opts.weekSubFocusPrimaryLabels != null && opts.weekSubFocusPrimaryLabels.length > 0
      ? opts.weekSubFocusPrimaryLabels
      : opts.orderedPrimaryLabelsForSubFocus != null &&
          opts.orderedPrimaryLabelsForSubFocus.length > 0
        ? opts.orderedPrimaryLabelsForSubFocus
        : opts.goalSlugs.map((slug) => manualLabelForGoalSlug(slug)).filter((x): x is string => Boolean(x));

  for (const label of labelsForMerge) {
    const subLabels = subMap[label] ?? [];
    if (!subLabels.length) continue;
    const { goalSlug, subFocusSlugs } = resolveGoalSubFocusSlugs(label, subLabels);
    if (!goalSlug || !subFocusSlugs.length) continue;
    const existing = goal_sub_focus[goalSlug] ?? [];
    goal_sub_focus[goalSlug] = [...new Set([...existing, ...subFocusSlugs])];
  }

  for (const [goalSlug, rankedSlugs] of Object.entries(goal_sub_focus)) {
    const profile = resolveSubFocusProfile({ goalSlug, rankedSubFocusSlugs: rankedSlugs });
    goal_sub_focus_weights[goalSlug] = rankedSlugs.map(
      (s) => profile.resolvedWeights[s] ?? 1 / rankedSlugs.length
    );
  }

  return { goal_sub_focus, goal_sub_focus_weights };
}

function canonicalizeSportSubFocusMap(src: Record<string, string[]>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [sportKey, subs] of Object.entries(src)) {
    if (!subs?.length) continue;
    const canon = getCanonicalSportSlug(String(sportKey).toLowerCase().replace(/\s/g, "_"));
    const prev = out[canon] ?? [];
    out[canon] = [...new Set([...prev, ...subs])];
  }
  return out;
}

function normalizedDualSportShares(
  sportSlugs: string[],
  pct?: [number, number]
): number[] | undefined {
  if (sportSlugs.length !== 2 || !pct) return undefined;
  const a = Math.max(0, pct[0] ?? 0);
  const b = Math.max(0, pct[1] ?? 0);
  const sum = a + b;
  if (sum <= 0) return undefined;
  return [a / sum, b / sum];
}

/**
 * Compute declared intent split from UI preferences (loading screen).
 * Mirrors `manualPreferencesToGenerateWorkoutInput` weights, expands sub-goals, and respects dual-sport priority %.
 */
export function computeDeclaredIntentSplitFromPrefs(
  opts: DeclaredIntentSplitFromPrefsOpts
): IntentSplitEntry[] {
  const sportWeight = Math.max(0, Math.min(100, opts.sportVsGoalPct)) / 100;
  const gw = normalizeGoalMatchPct(
    opts.goalMatchPrimaryPct ?? 50,
    opts.goalMatchSecondaryPct ?? 30,
    opts.goalMatchTertiaryPct ?? 20,
    opts.goalSlugs.length
  );
  const goalWeightsPct = [
    gw.goalMatchPrimaryPct / 100,
    gw.goalMatchSecondaryPct / 100,
    gw.goalMatchTertiaryPct / 100,
  ].slice(0, Math.max(0, opts.goalSlugs.length));

  const merged = mergeGoalSubFocusMapsFromPrefs(opts);
  const sportSubCanon =
    opts.sportSubFocusBySport && Object.keys(opts.sportSubFocusBySport).length > 0
      ? canonicalizeSportSubFocusMap(opts.sportSubFocusBySport)
      : undefined;

  const fakeInput = {
    sport_slugs: opts.sportSlugs,
    sport_weight: sportWeight,
    sport_sub_focus: sportSubCanon && Object.keys(sportSubCanon).length ? sportSubCanon : undefined,
    primary_goal: manualGoalSlugToPrimaryGoal(opts.goalSlugs[0] ?? "strength"),
    secondary_goals:
      opts.goalSlugs.length > 1 ? opts.goalSlugs.slice(1, 3).map(manualGoalSlugToPrimaryGoal) : undefined,
    goal_weights: goalWeightsPct.length ? goalWeightsPct : undefined,
    goal_sub_focus:
      Object.keys(merged.goal_sub_focus).length > 0 ? merged.goal_sub_focus : undefined,
    goal_sub_focus_weights:
      Object.keys(merged.goal_sub_focus_weights).length > 0
        ? merged.goal_sub_focus_weights
        : undefined,
  };

  const sportShares = normalizedDualSportShares(opts.sportSlugs, opts.sportShareAmongSportsPct);

  return computeDeclaredIntentSplit(fakeInput as GenerateWorkoutInput, {
    sportSharesAmongSportsNormalized: sportShares,
  });
}

/**
 * Build a human-readable workout title from the top focus areas.
 * e.g. "Climbing · Body Recomp"
 */
export function buildWorkoutIntentTitle(split: IntentSplitEntry[]): string {
  if (split.length === 0) return "Your Workout";
  const top = split.slice(0, 2);
  return top.map((e) => `${e.label} (${e.pct}%)`).join(" · ");
}

function normSlugKey(s: string): string {
  return String(s).toLowerCase().replace(/\s/g, "_");
}

function parseSubFocusSlug(compositeSlug: string): { parent: string; sub: string } | undefined {
  const i = compositeSlug.indexOf(":");
  if (i <= 0 || i >= compositeSlug.length - 1) return undefined;
  return { parent: compositeSlug.slice(0, i), sub: compositeSlug.slice(i + 1) };
}

function itemHitsGoalSubFocus(
  links: WorkoutItem["session_intent_links"] | undefined,
  bucketKey: string,
  subSlug: string
): boolean {
  if (!links) return false;
  const b = normSlugKey(bucketKey);
  const s = normSlugKey(subSlug);
  for (const row of links.sub_focus ?? []) {
    if (normSlugKey(row.goal_slug) === b && normSlugKey(row.sub_slug) === s) return true;
  }
  for (const m of links.matched_intents ?? []) {
    if (m.kind !== "goal_sub_focus") continue;
    if (normSlugKey(m.slug) !== s) continue;
    if (m.parent_slug == null || normSlugKey(m.parent_slug) === b) return true;
  }
  return false;
}

function itemHitsSportSubFocus(
  links: WorkoutItem["session_intent_links"] | undefined,
  parentSlug: string,
  subSlug: string
): boolean {
  if (!links) return false;
  const canonParent = getCanonicalSportSlug(parentSlug);
  const canonSports = (links.sport_slugs ?? []).map((x) =>
    getCanonicalSportSlug(String(x).toLowerCase().replace(/\s/g, "_"))
  );
  if (!canonSports.includes(canonParent)) return false;
  const sn = normSlugKey(subSlug);
  for (const m of links.matched_intents ?? []) {
    if (m.kind !== "sport_sub_focus") continue;
    if (!m.parent_slug) continue;
    if (getCanonicalSportSlug(m.parent_slug) !== canonParent) continue;
    if (normSlugKey(m.slug) === sn) return true;
  }
  return false;
}

function declaredMatchRank(kind: IntentSplitEntry["kind"]): number {
  if (kind === "goal_sub_focus" || kind === "sport_sub_focus") return 0;
  return 1;
}

function itemMatchesDeclaredEntry(
  links: WorkoutItem["session_intent_links"] | undefined,
  d: IntentSplitEntry,
  fallbackGoals?: string[],
  fallbackSports?: string[]
): boolean {
  const goalsListed =
    links?.goals != null && links.goals.length > 0 ? links.goals : (fallbackGoals ?? []);
  const sportsListed =
    links?.sport_slugs != null && links.sport_slugs.length > 0
      ? links.sport_slugs
      : (fallbackSports ?? []);

  if (d.kind === "sport_sub_focus" && d.parent_slug) {
    const parsed = parseSubFocusSlug(d.slug);
    const subPart = parsed?.sub ?? "";
    return itemHitsSportSubFocus(links, d.parent_slug, subPart);
  }
  if (d.kind === "sport") {
    const canon = getCanonicalSportSlug(d.slug);
    return sportsListed.some((s) => getCanonicalSportSlug(s) === canon);
  }
  if (d.kind === "goal_sub_focus") {
    const parsed = parseSubFocusSlug(d.slug);
    if (!parsed) return false;
    return itemHitsGoalSubFocus(links, parsed.parent, parsed.sub);
  }
  if (d.kind === "goal") {
    if (goalsListed.length === 0) return false;
    const aliases = new Set(
      [...goalTagAliases(d.slug as PrimaryGoal), d.slug].map(normSlugKey)
    );
    return goalsListed.some((g) => aliases.has(normSlugKey(String(g))));
  }
  return false;
}

type WorkingItemSignals = {
  links?: WorkoutItem["session_intent_links"];
  goals?: string[];
  sport_slugs?: string[];
};

function getWorkingItems(blocks: WorkoutBlock[]): WorkingItemSignals[] {
  const items: WorkingItemSignals[] = [];
  for (const block of blocks) {
    if (PREP_BLOCK_TYPES.has(block.block_type)) continue;
    const blockItems = block.supersetPairs ? block.supersetPairs.flat() : (block.items ?? []);
    for (const item of blockItems) {
      items.push({
        links: item.session_intent_links,
        goals: item.session_intent_links?.goals,
        sport_slugs: item.session_intent_links?.sport_slugs,
      });
    }
  }
  return items;
}

/**
 * Compute actual intent proportions from a generated workout's blocks.
 * Returns split entries with actual percentages (overrides declared weights).
 * Falls back to declared split when no working exercises are found.
 */
export function computeActualIntentSplit(
  workout: GeneratedWorkout,
  declared: IntentSplitEntry[]
): IntentSplitEntry[] {
  const items = getWorkingItems(workout.blocks ?? []);
  const total = items.length;
  if (total === 0) return declared;

  const orderedDeclared = [...declared].sort(
    (a, b) => declaredMatchRank(a.kind) - declaredMatchRank(b.kind) || b.weight - a.weight
  );

  const counts: Record<string, number> = {};

  for (const item of items) {
    let matched: IntentSplitEntry | undefined;
    for (const d of orderedDeclared) {
      if (
        itemMatchesDeclaredEntry(item.links, d, item.goals, item.sport_slugs)
      ) {
        matched = d;
        break;
      }
    }
    if (matched) counts[matched.slug] = (counts[matched.slug] ?? 0) + 1;
  }

  const result = declared.map((d) => {
    const count = counts[d.slug] ?? 0;
    return { ...d, weight: count / total };
  });

  result.sort((a, b) => b.weight - a.weight);

  const sumWeights = result.reduce((s, e) => s + e.weight, 0);
  const pcts =
    sumWeights > 0
      ? roundPctsTo100(result.map((e) => e.weight / sumWeights))
      : result.map(() => 0);

  return result.map((e, i) => ({ ...e, pct: pcts[i]! }));
}
