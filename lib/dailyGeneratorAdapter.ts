/**
 * Adapters to use logic/workoutGeneration/dailyGenerator as the single engine for the app.
 * Maps ManualPreferences + GymProfile → GenerateWorkoutInput, ExerciseDefinition → Exercise,
 * and WorkoutSession → GeneratedWorkout.
 */

import type { ManualPreferences, GeneratedWorkout, ExerciseDefinition } from "./types";
import type { GymProfile } from "../data/gymProfiles";
import { resolveEffectiveEquipment } from "./gymEquipment";
import {
  deriveBodyPartFocus,
  deriveBodyPartFocusFromSubFocus,
  deriveSubFocus,
  normalizeSubFocusByGoalAgainstConditioningPolicy,
  PRIMARY_FOCUS_TO_GOAL_SLUG,
} from "./preferencesConstants";
import { getAvoidTagSlugsFromUpcoming } from "./filterTagRules";
import { primaryFocusLabelToPrimaryGoal } from "./goalRegistry";
import { getExerciseTagsForGoalSubFocuses } from "../data/goalSubFocus";
import { buildMergedGoalSubFocusSlugWeights, sanitizeSubFocusPctMaps } from "./subFocusWeights";
import { filterSubFocusSlugsForBodyFocus } from "../logic/workoutGeneration/bodyFocusSubFocusFilter";
import { SUB_FOCUS_TAG_MAP } from "../data/sportSubFocus/subFocusTagMap";
import { getExerciseTagsForSubFocuses, normalizeSubFocusSlug } from "../data/sportSubFocus";
import { getCanonicalSportSlug } from "../data/sportSubFocus/canonicalSportSlug";
import { SPORTS_WITH_SUB_FOCUSES } from "../data/sportSubFocus/sportsWithSubFocuses";
import type {
  GenerateWorkoutInput,
  PrimaryGoal,
  FocusBodyPart,
  Exercise,
  ExerciseTags,
  WorkoutSession,
  Modality,
  MovementPattern,
  UserLevel,
} from "../logic/workoutGeneration/types";
import type { TrainingHistoryContext } from "../logic/workoutGeneration/historyTypes";
import type {
  SessionIntentContract,
  SessionIntentSelection,
  IntentEntry,
} from "../logic/workoutGeneration/sessionIntentContract";
import { sportSubFocusSelectionsImplyEnduranceSecondary } from "../data/sportSubFocus/enduranceSportPrepSecondaryGoal";
import {
  buildWeeklySubFocusKeysFromPreferences,
  computeWeeklySubFocusSessionMinimums,
} from "../logic/workoutGeneration/weeklySubFocusCoveragePlan";
import { getGenerationPruningGateFlags } from "./generationPruningGateConfig";
import { buildStylePrefsWorkoutFields } from "../logic/workoutGeneration/workoutStylePolicy";

const DURATIONS = [20, 30, 45, 60, 75] as const;
type AllowedDuration = (typeof DURATIONS)[number];

/** Deep copy for `GeneratedWorkout.generationPreferences` (survives later state mutations). */
export function cloneManualPreferencesSnapshot(p: ManualPreferences): ManualPreferences {
  try {
    const { weekSubFocusPrimaryLabels: _w, weeklySubFocusCoverage: _wc, ...rest } = p;
    return structuredClone(rest);
  } catch {
    const { weekSubFocusPrimaryLabels: _w, weeklySubFocusCoverage: _wc, ...rest } = p;
    return JSON.parse(JSON.stringify(rest)) as ManualPreferences;
  }
}

function clampDuration(mins: number | null): AllowedDuration {
  if (mins == null || mins <= 0) return 45;
  if (mins <= 25) return 20;
  if (mins <= 37) return 30;
  if (mins <= 52) return 45;
  if (mins <= 67) return 60;
  return 75;
}

/**
 * When sport prep selects an endurance-engine sport (`enduranceSportPrepSecondaryGoal.ts`) plus an
 * engine-relevant sub-focus, but the session primary is still strength/hypertrophy/etc., append `endurance`
 * so constraints can require conditioning/Zone-style work (`resolveWorkoutConstraints` +
 * `generateWorkoutSession`). Trail/ultra (aerobic_base / uphill_endurance) stays covered via that module.
 */
function shouldAppendEnduranceSecondaryFromSportSubFocus(
  primaryGoal: PrimaryGoal,
  secondaryGoals: PrimaryGoal[],
  sportGoalContext?: SportGoalContext
): boolean {
  if (primaryGoal === "endurance" || primaryGoal === "conditioning") return false;
  if (secondaryGoals.some((g) => g === "endurance" || g === "conditioning")) return false;
  const sub = sportGoalContext?.sport_sub_focus;
  if (!sub) return false;
  for (const [sportKey, slugs] of Object.entries(sub)) {
    const canon = getCanonicalSportSlug(sportKey);
    if (sportSubFocusSelectionsImplyEnduranceSecondary(canon, slugs)) return true;
  }
  return false;
}

// --- Ranked intent entry builder ---

/** Sub-focus rank weights: first sub-focus gets 50%, second 30%, third 20%. */
const SUB_FOCUS_RANK_WEIGHTS = [0.5, 0.3, 0.2] as const;

/**
 * Maps a PrimaryGoal to the key used in merged `goal_sub_focus` (from GOAL_SUB_FOCUS_OPTIONS).
 * hypertrophy → muscle, body_recomp → physique, recovery → resilience; athletic_performance and power use their own buckets
 * (`goalSubFocusKeysForPrimary` adds legacy aliases for persisted maps).
 */
function primaryGoalToSubFocusKey(goal: PrimaryGoal): string {
  switch (goal) {
    case "hypertrophy": return "muscle";
    case "body_recomp": return "physique";
    case "recovery":
    case "recovery_mobility":
      return "recovery_mobility";
    case "mobility":
      return "recovery_mobility";
    case "joint_health":
      return "joint_health";
    default: return goal as string;
  }
}

/**
 * Tag slugs (appearing in exercise goal_tags) that identify exercises for a PrimaryGoal.
 * Mirrors goalTagAliases in sessionIntentCoverage without cross-importing that module.
 */
function goalTagSlugsForEntry(goal: PrimaryGoal): string[] {
  if (goal === "athletic_performance") return ["athleticism", "power"];
  if (goal === "body_recomp") return ["hypertrophy", "strength"];
  return [goal as string];
}

/**
 * Build the flat ranked intent list from the session's goals, sub-goals, sports, and sport sub-focuses.
 * Weights are proportional to goal_weights × goal portion + sport_weight × sport portion.
 * Sub-focuses are weighted within their parent (50/30/20 split by rank).
 * All weights are normalized to sum = 1 and entries are ranked descending by weight (rank 1 = highest).
 */
function normIntentSubSlug(s: string): string {
  return normalizeSubFocusSlug(String(s));
}

/** Shares of the sport budget across ranked sports (sums to 1). Honors dual-sport % when provided. */
function sportSharesAmongRankedSports(
  sportSlugs: string[],
  sportFocusPct?: [number, number]
): number[] {
  const n = sportSlugs.length;
  if (n === 0) return [];
  if (n === 2 && sportFocusPct) {
    const a = Math.max(0, sportFocusPct[0] ?? 0);
    const b = Math.max(0, sportFocusPct[1] ?? 0);
    const sum = a + b;
    if (sum <= 0) return [0.5, 0.5];
    return [a / sum, b / sum];
  }
  return sportSlugs.map(() => 1 / n);
}

/** Align merged power / athletic sub-focus lists with explicit upper/lower session focus. */
function applyBodyEmphasisToMergedGoalSubFocus(
  goalSubFocus: Record<string, string[]>,
  goalSubFocusWeights: Record<string, number[]>,
  focusBodyParts: FocusBodyPart[]
): {
  goal_sub_focus: Record<string, string[]>;
  goal_sub_focus_weights: Record<string, number[]>;
} {
  const outFocus = { ...goalSubFocus };
  const outWeights = { ...goalSubFocusWeights };
  for (const goalKey of ["power", "athletic_performance"] as const) {
    const slugs = outFocus[goalKey];
    if (!slugs?.length) continue;
    const filtered = filterSubFocusSlugsForBodyFocus(slugs, focusBodyParts);
    if (filtered.length === slugs.length) continue;
    if (filtered.length === 0) {
      delete outFocus[goalKey];
      delete outWeights[goalKey];
      continue;
    }
    outFocus[goalKey] = filtered;
    const prevWeights = outWeights[goalKey] ?? slugs.map(() => 1 / slugs.length);
    const nextWeights = filtered.map((slug) => {
      const idx = slugs.indexOf(slug);
      return idx >= 0 ? (prevWeights[idx] ?? 0) : 0;
    });
    const sum = nextWeights.reduce((a, b) => a + b, 0);
    outWeights[goalKey] =
      sum > 0 ? nextWeights.map((w) => w / sum) : filtered.map(() => 1 / filtered.length);
  }
  return { goal_sub_focus: outFocus, goal_sub_focus_weights: outWeights };
}

function buildRankedIntentEntries(
  selectedGoals: PrimaryGoal[],
  goalSubFocusByGoal: Record<string, string[]>,
  sportSlugs: string[],
  sportSubFocusBySport: Record<string, string[]>,
  goalWeights: number[] | undefined,
  sportWeight: number | undefined,
  sportFocusPct?: [number, number]
): IntentEntry[] {
  const entries: IntentEntry[] = [];

  const sportWeightFraction =
    sportSlugs.length > 0 && sportWeight != null ? Math.max(0, Math.min(1, sportWeight)) : 0;
  const goalWeightFraction = 1 - sportWeightFraction;

  const sportSubSlugCoverage = new Set<string>();
  for (const sport of sportSlugs) {
    const canonSport = getCanonicalSportSlug(sport);
    const subs =
      sportSubFocusBySport[sport] ?? sportSubFocusBySport[canonSport] ?? [];
    for (const s of subs) sportSubSlugCoverage.add(normIntentSubSlug(s));
  }

  // Normalize goal weights (sum-to-1 within goals slice, then scale by goalWeightFraction)
  const rawGoalWeights =
    goalWeights ?? selectedGoals.map((_, i) => SUB_FOCUS_RANK_WEIGHTS[i] ?? 1 / Math.max(selectedGoals.length, 1));
  const goalWeightSum = rawGoalWeights.reduce((s, w) => s + w, 0);
  const normGoalWeights =
    goalWeightSum > 0 ? rawGoalWeights.map((w) => (w / goalWeightSum) * goalWeightFraction) : rawGoalWeights;

  // Track which sub-focus keys have been claimed so goals sharing a key don't double-add
  const claimedSubFocusKeys = new Set<string>();

  for (let i = 0; i < selectedGoals.length; i++) {
    const goal = selectedGoals[i]!;
    const goalAbsWeight = normGoalWeights[i] ?? goalWeightFraction / Math.max(selectedGoals.length, 1);

    const subFocusKey = primaryGoalToSubFocusKey(goal);
    if (claimedSubFocusKeys.has(subFocusKey)) continue;

    const subSlugsRaw = goalSubFocusByGoal[subFocusKey] ?? [];
    const subSlugs = subSlugsRaw.filter(
      (s) => !sportSubSlugCoverage.has(normIntentSubSlug(s))
    );

    if (subSlugsRaw.length > 0 && subSlugs.length === 0) {
      claimedSubFocusKeys.add(subFocusKey);
      continue;
    }

    claimedSubFocusKeys.add(subFocusKey);

    if (subSlugs.length === 0) {
      entries.push({
        kind: "goal",
        slug: goal,
        rank: 0,
        weight: goalAbsWeight,
        tag_slugs: goalTagSlugsForEntry(goal),
      });
      continue;
    }

    const goalSubRankWeights = subSlugs.map(
      (_, j) => SUB_FOCUS_RANK_WEIGHTS[j] ?? 1 / Math.max(subSlugs.length, 1)
    );
    const goalSubRankSum = goalSubRankWeights.reduce((s, w) => s + w, 0) || 1;
    for (let j = 0; j < subSlugs.length; j++) {
      const subSlug = subSlugs[j]!;
      const subRankWeight = (goalSubRankWeights[j] ?? 1 / subSlugs.length) / goalSubRankSum;
      const subWeight = goalAbsWeight * subRankWeight;
      const tagEntries = getExerciseTagsForGoalSubFocuses(subFocusKey, [subSlug]);
      entries.push({
        kind: "goal_sub_focus",
        slug: subSlug,
        parent_slug: goal,
        rank: 0,
        weight: subWeight,
        tag_slugs: tagEntries.map((e) => e.tag_slug),
      });
    }
  }

  // Sports
  const numSports = sportSlugs.length;
  if (numSports > 0) {
    const amongSports = sportSharesAmongRankedSports(sportSlugs, sportFocusPct);
    for (let si = 0; si < sportSlugs.length; si++) {
      const sport = sportSlugs[si]!;
      const perSportWeight = sportWeightFraction * (amongSports[si] ?? 1 / numSports);
      const canonSport = getCanonicalSportSlug(sport);
      entries.push({
        kind: "sport",
        slug: sport,
        rank: 0,
        weight: perSportWeight,
        // sport_tags for exercises use canonical sport slug
        tag_slugs: [canonSport],
      });

      const sportSubSlugs =
        sportSubFocusBySport[sport] ?? sportSubFocusBySport[canonSport] ?? [];
      const sportSubRankWeights = sportSubSlugs.map(
        (_, j) => SUB_FOCUS_RANK_WEIGHTS[j] ?? 1 / Math.max(sportSubSlugs.length, 1)
      );
      const sportSubRankSum = sportSubRankWeights.reduce((s, w) => s + w, 0) || 1;
      for (let j = 0; j < sportSubSlugs.length; j++) {
        const subSlug = sportSubSlugs[j]!;
        const subRankWeight = (sportSubRankWeights[j] ?? 1 / sportSubSlugs.length) / sportSubRankSum;
        const subWeight = perSportWeight * subRankWeight;
        const tagEntries = getExerciseTagsForSubFocuses(sport, [subSlug]);
        entries.push({
          kind: "sport_sub_focus",
          slug: subSlug,
          parent_slug: sport,
          rank: 0,
          weight: subWeight,
          tag_slugs: tagEntries.map((e) => e.tag_slug),
        });
      }
    }
  }

  // Normalize weights and assign ranks
  const totalWeight = entries.reduce((s, e) => s + e.weight, 0);
  if (totalWeight > 0) {
    for (const e of entries) e.weight = parseFloat((e.weight / totalWeight).toFixed(4));
  }
  entries.sort((a, b) => b.weight - a.weight);
  for (let i = 0; i < entries.length; i++) entries[i]!.rank = i + 1;

  return entries;
}

/** Map primary focus label to generator PrimaryGoal. */
function primaryFocusLabelToGoal(label: string): PrimaryGoal {
  return primaryFocusLabelToPrimaryGoal(label);
}

/** Map BodyPartFocusKey (UI) to FocusBodyPart (generator). */
function bodyPartFocusToGeneratorFocus(keys: string[]): FocusBodyPart[] {
  const out: FocusBodyPart[] = [];
  if (keys.includes("Full body")) return ["full_body"];
  if (keys.includes("Upper body")) {
    if (keys.includes("Push") && !keys.includes("Pull")) return ["upper_push"];
    if (keys.includes("Pull") && !keys.includes("Push")) return ["upper_pull"];
    return ["upper_push", "upper_pull"];
  }
  if (keys.includes("Lower body")) return ["lower"];
  if (keys.includes("Core") && !keys.includes("Upper body") && !keys.includes("Lower body")) return ["core"];
  return out;
}

/** Normalize constraint/injury label to slug (e.g. "Lower Back" → "lower_back"). */
function injuryLabelToSlug(label: string): string {
  return label.toLowerCase().replace(/\s/g, "_").replace(/^no_restrictions$/, "");
}

/** Optional sport/goal context when building input from adaptive or sport-prep flows. */
export type SportGoalContext = {
  sport_slugs?: string[];
  sport_sub_focus?: Record<string, string[]>;
  goal_weights?: number[];
  sport_weight?: number;
  /** When two sports are ranked: [first sport %, second sport %] (e.g. 60/40). Must match `sport_slugs` order. */
  sport_focus_pct?: [number, number];
  /** Penalize re-picking these ids on regenerate so the session visibly refreshes. */
  regeneration_avoid_exercise_ids?: string[];
  /** Explicit sport-day intent (planner → generator); optional for non-sport modes. */
  session_intent_contract?: SessionIntentContract;
  /** When true, generator attaches `WorkoutSession.debug.intent_survival_report`. */
  include_intent_survival_report?: boolean;
  /** Optional planner/adapter snapshot merged into intent survival report. */
  intent_survival_upstream?: {
    source?: string;
    session_intent_summary?: string;
    primitives?: Record<string, unknown>;
  };
};

/**
 * Build GenerateWorkoutInput from ManualPreferences and optional GymProfile.
 * Used so the app can call dailyGenerator with the same semantics as the current lib generator.
 * seedExtra: optional string or number for the RNG (e.g. tests, explicit replay). Omit to derive from
 * preferences only — callers that want variety each run should pass `createWorkoutGenerationEntropy()` or use
 * `generateWorkoutAsync`, which supplies entropy when `seedExtra` is omitted.
 * preferredExerciseIds: optional exercise ids/slugs to prefer when scoring (e.g. from sport/goal ranking).
 * sportGoalContext: optional override for sport_slugs, sport_sub_focus, goal_weights, sport_weight (e.g. from adaptive/sport-prep).
 */
export function manualPreferencesToGenerateWorkoutInput(
  preferences: ManualPreferences,
  gymProfile?: GymProfile,
  seedExtra?: string | number,
  preferredExerciseIds?: string[],
  sportGoalContext?: SportGoalContext,
  trainingHistory?: TrainingHistoryContext
): GenerateWorkoutInput {
  const durationMinutes = clampDuration(preferences.durationMinutes);
  const bodyPartFromTarget = deriveBodyPartFocus(preferences.targetBody, preferences.targetModifier);
  const subFocusByGoalSanitized = normalizeSubFocusByGoalAgainstConditioningPolicy(
    preferences.subFocusByGoal ?? {}
  );
  const subFocus = deriveSubFocus(preferences.primaryFocus, subFocusByGoalSanitized);
  const bodyPartFromSubFocus = deriveBodyPartFocusFromSubFocus(subFocus);
  const bodyPartFocus =
    bodyPartFromTarget.length > 0 ? bodyPartFromTarget : bodyPartFromSubFocus;
  const focus_body_parts = bodyPartFocusToGeneratorFocus(bodyPartFocus);
  const normalizedFocusBodyParts: FocusBodyPart[] = focus_body_parts.length > 0 ? focus_body_parts : ["full_body"];

  const injuryFilter =
    preferences.injuries.includes("No restrictions") || preferences.injuries.length === 0
      ? []
      : preferences.injuries.filter((i) => i !== "No restrictions");
  const injuries_or_constraints = injuryFilter.map(injuryLabelToSlug);

  const available_equipment = resolveEffectiveEquipment(
    gymProfile?.equipment ?? []
  ).map((eq) => (typeof eq === "string" ? eq : String(eq)));
  const avoid_tags = getAvoidTagSlugsFromUpcoming(preferences.upcoming ?? []);

  const firstFocusLabel = preferences.primaryFocus?.[0];
  const primary_goal =
    firstFocusLabel != null && firstFocusLabel !== ""
      ? primaryFocusLabelToGoal(firstFocusLabel)
      : sportGoalContext?.sport_slugs?.length
        // No explicit fitness goal selected; use "strength" as a neutral prescription template.
        // Sport sub-focus quality weights (via sport_weight = 1.0) drive exercise selection.
        ? "strength"
        : primaryFocusLabelToGoal("Build Strength");
  let secondary_goals = preferences.primaryFocus
    .slice(1, 3)
    .map(primaryFocusLabelToGoal)
    .filter((g) => g !== primary_goal);
  const userDeclaredSecondaryGoals = [...secondary_goals];
  if (shouldAppendEnduranceSecondaryFromSportSubFocus(primary_goal, secondary_goals, sportGoalContext)) {
    secondary_goals = [...secondary_goals, "endurance"];
  }

  // Detect sessions where no explicit fitness goal was selected — only sport + sub-focuses.
  // In this case we elevate sport_weight to 1.0 so the full quality-selection budget comes from
  // sport demand; "strength" acts as a prescription template only (no phantom goal in header/badges).
  // Implied `endurance` from sport sub-focus (e.g. paddle_endurance) must not break sport-only mode.
  const isImpliedSportOnlySession =
    (firstFocusLabel == null ||
      firstFocusLabel === "" ||
      firstFocusLabel === "Sport preparation") &&
    userDeclaredSecondaryGoals.length === 0 &&
    (sportGoalContext?.sport_slugs?.length ?? 0) > 0;
  // When sport-only: override to 1.0 (or preserve explicit override if caller already set 1.0+).
  const effectiveSportWeight = isImpliedSportOnlySession
    ? 1.0
    : sportGoalContext?.sport_weight;

  const subFocusByGoal = subFocusByGoalSanitized;
  const weekSubLabels = preferences.weekSubFocusPrimaryLabels;
  const labelsForSubFocusMerge =
    weekSubLabels != null && weekSubLabels.length > 0 ? weekSubLabels : preferences.primaryFocus;
  const subFocusPctByGoalAligned = sanitizeSubFocusPctMaps(
    subFocusByGoal,
    preferences.subFocusPctByGoal
  );
  let { goal_sub_focus, goal_sub_focus_weights } = buildMergedGoalSubFocusSlugWeights({
    labelsForSubFocusMerge,
    subFocusByGoal,
    subFocusPctByGoal: subFocusPctByGoalAligned,
  });
  ({ goal_sub_focus, goal_sub_focus_weights } = applyBodyEmphasisToMergedGoalSubFocus(
    goal_sub_focus,
    goal_sub_focus_weights,
    normalizedFocusBodyParts
  ));

  // Goal weights from match percentages (normalize to sum 1)
  const p1 = (preferences.goalMatchPrimaryPct ?? 50) / 100;
  const p2 = (preferences.goalMatchSecondaryPct ?? 30) / 100;
  const p3 = (preferences.goalMatchTertiaryPct ?? 20) / 100;
  const sum = p1 + p2 + p3;
  const goal_weights = sum > 0 ? [p1 / sum, p2 / sum, p3 / sum] : undefined;

  const workoutStyleFields = buildStylePrefsWorkoutFields(preferences.workoutStyle);
  const style_prefs = {
    avoid_tags: avoid_tags.length ? avoid_tags : undefined,
    preferred_zone2_cardio: preferences.preferredZone2Cardio?.length
      ? preferences.preferredZone2Cardio
      : undefined,
    preferred_exercise_ids: preferredExerciseIds?.length ? preferredExerciseIds : undefined,
    user_level: preferences.workoutTier ?? "intermediate",
    include_creative_variations: preferences.includeCreativeVariations === true,
    ...workoutStyleFields,
  };
  const hasStylePrefs =
    !!style_prefs.avoid_tags?.length ||
    !!style_prefs.preferred_zone2_cardio?.length ||
    !!style_prefs.preferred_exercise_ids?.length ||
    !!style_prefs.workout_styles?.length ||
    style_prefs.wants_supersets !== undefined ||
    style_prefs.user_level != null ||
    style_prefs.include_creative_variations === true;

  const seedNum =
    typeof seedExtra === "number"
      ? seedExtra
      : typeof seedExtra === "string"
        ? hashString(seedExtra)
        : hashString(
            JSON.stringify({
              p: preferences.primaryFocus,
              b: bodyPartFocus,
              d: durationMinutes,
              primary_goal,
              subFocusByGoal,
              subFocusPctByGoal: subFocusPctByGoalAligned ?? preferences.subFocusPctByGoal ?? {},
              goalWeightsPct: [
                preferences.goalMatchPrimaryPct ?? 50,
                preferences.goalMatchSecondaryPct ?? 30,
                preferences.goalMatchTertiaryPct ?? 20,
              ],
            })
          );

  const wkCov = preferences.weeklySubFocusCoverage;
  let weekly_sub_focus_session_minimums: Record<string, number> | undefined;
  if (
    wkCov != null &&
    wkCov.trainingDaysTotal > 0 &&
    wkCov.trainingDayIndex >= 0 &&
    wkCov.trainingDayIndex < wkCov.trainingDaysTotal
  ) {
    const keys = buildWeeklySubFocusKeysFromPreferences(preferences);
    if (keys.length > 0) {
      const mins = computeWeeklySubFocusSessionMinimums({
        matchCountsSoFar: wkCov.matchCountsSoFar ?? {},
        trainingDayIndex: wkCov.trainingDayIndex,
        trainingDaysTotal: wkCov.trainingDaysTotal,
        targetPerSubFocus: wkCov.targetPerSubFocus ?? 3,
        keys,
      });
      if (Object.keys(mins).length > 0) weekly_sub_focus_session_minimums = mins;
    }
  }

  const selectedGoals: PrimaryGoal[] = [
    primary_goal,
    ...secondary_goals,
  ];
  const session_intent: SessionIntentSelection = {
    selected_goals: selectedGoals,
    selected_sports: sportGoalContext?.sport_slugs ?? [],
    goal_sub_focus_by_goal: goal_sub_focus,
    sport_sub_focus_by_sport: sportGoalContext?.sport_sub_focus ?? {},
    user_level: style_prefs.user_level,
    focus_body_parts: normalizedFocusBodyParts,
    sport_vs_goal_pct:
      effectiveSportWeight != null
        ? Math.round(Math.max(0, Math.min(1, effectiveSportWeight)) * 100)
        : undefined,
    goal_weights: sportGoalContext?.goal_weights ?? goal_weights,
    sport_weight: effectiveSportWeight,
    ranked_intent_entries: buildRankedIntentEntries(
      selectedGoals,
      goal_sub_focus,
      sportGoalContext?.sport_slugs ?? [],
      sportGoalContext?.sport_sub_focus ?? {},
      sportGoalContext?.goal_weights ?? goal_weights,
      effectiveSportWeight,
      sportGoalContext?.sport_focus_pct
    ),
  };

  const avoidIds = sportGoalContext?.regeneration_avoid_exercise_ids?.filter(Boolean) ?? [];
  const recent_history:
    | import("../logic/workoutGeneration/types").RecentSessionSummary[]
    | undefined =
    avoidIds.length > 0
      ? [
          {
            exercise_ids: avoidIds,
            muscle_groups: [],
            modality: "regeneration_penalty",
          },
        ]
      : undefined;

  return {
    duration_minutes: durationMinutes,
    primary_goal,
    secondary_goals: secondary_goals.length ? secondary_goals : undefined,
    focus_body_parts: normalizedFocusBodyParts,
    energy_level: preferences.energyLevel ?? "medium",
    available_equipment,
    injuries_or_constraints,
    recent_history,
    training_history: trainingHistory,
    style_prefs: hasStylePrefs ? style_prefs : undefined,
    seed: seedNum,
    goal_sub_focus: Object.keys(goal_sub_focus).length ? goal_sub_focus : undefined,
    goal_sub_focus_weights: Object.keys(goal_sub_focus_weights).length ? goal_sub_focus_weights : undefined,
    goal_weights: sportGoalContext?.goal_weights ?? goal_weights,
    sport_slugs: sportGoalContext?.sport_slugs,
    sport_sub_focus: sportGoalContext?.sport_sub_focus,
    sport_weight: effectiveSportWeight,
    include_intent_survival_report: sportGoalContext?.include_intent_survival_report,
    intent_survival_upstream: sportGoalContext?.intent_survival_upstream,
    session_intent_contract: sportGoalContext?.session_intent_contract,
    session_intent,
    week_main_strength_lift_ids_used:
      preferences.weekMainStrengthLiftIdsUsed?.length && preferences.weekMainStrengthLiftIdsUsed.length > 0
        ? [...preferences.weekMainStrengthLiftIdsUsed]
        : undefined,
    weekly_sub_focus_session_minimums,
    pruning_gate: getGenerationPruningGateFlags(preferences.workoutTier),
  };
}

/** Stable string hash for generation seeds (manual default seed + sport/goal composite seeds). */
export function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Unique token for each generation so the seeded RNG varies between runs with identical preferences.
 * `generateWorkoutAsync` uses this when `seedExtra` is omitted; sport-prep `buildWorkoutForSessionIntent`
 * mixes it into composite seeds so planner slots are not locked to calendar day alone.
 */
export {
  composeRunGenerationSeed,
  createWorkoutGenerationEntropy,
} from "./generationSeed";

/** Map lib Modality to generator Modality (generator has skill, recovery). */
function toGeneratorModality(m: string): Modality {
  const n = m.toLowerCase().replace(/\s/g, "_");
  const valid: Modality[] = ["strength", "hypertrophy", "power", "conditioning", "mobility", "skill", "recovery"];
  return (valid.includes(n as Modality) ? n : "strength") as Modality;
}

/** Derive movement pattern from muscles and tags for ExerciseDefinition. */
function deriveMovementPattern(def: ExerciseDefinition): MovementPattern {
  const muscles = def.muscles ?? [];
  const tags = def.tags ?? [];
  const tagSet = new Set(tags.map((t) => t.toLowerCase().replace(/\s/g, "_")));
  if (muscles.includes("pull")) return "pull";
  if (muscles.includes("push")) return "push";
  if (muscles.includes("legs")) {
    if (tagSet.has("quad-focused") || tagSet.has("squat")) return "squat";
    if (tagSet.has("posterior_chain") || tagSet.has("hamstrings") || tagSet.has("glutes")) return "hinge";
    return "squat";
  }
  if (muscles.includes("core")) return "rotate";
  return "push";
}

/** Normalize contraindication to slug matching filter's injuryKeys (shoulder, knee, lower_back, etc.). */
function contraindicationToSlug(c: string): string {
  return c.toLowerCase().replace(/\s/g, "_");
}

const STIMULUS_SLUGS = new Set([
  "eccentric", "isometric", "plyometric", "aerobic_zone2", "anaerobic", "grip",
  "scapular_control", "trunk_anti_rotation", "anti_flexion",
]);
const JOINT_STRESS_PREFIXES = [
  "shoulder_overhead", "shoulder_extension", "knee_flexion", "lumbar_shear",
  "elbow_stress", "wrist_stress", "hip_stress", "ankle_stress",
];

import { normalizeMatchableTagSlugs, normalizeSlug } from "./ontology";
import { computeDeclaredIntentSplit } from "./workoutIntentSplit";
import { runIntentProportionGuardrail } from "../logic/workoutGeneration/intentProportionGuardrail";
import {
  inferCreativeVariationFromSource,
  inferWorkoutLevelsFromExtendedSource,
  inferWorkoutLevelsWithExplanation,
  isWorkoutLevelsDebugEnabled,
} from "./workoutLevel";
import {
  exerciseInferenceInputFromDefinition,
  mergePhase1MovementOntologyIntoExercise,
} from "./exerciseMetadata/phase1MovementInference";
import { mergePhase2SafetyOntologyIntoExercise } from "./exerciseMetadata/phase2SafetyInference";
import { mergePhase3SessionOntologyIntoExercise } from "./exerciseMetadata/phase3SessionRoleInference";
import { mergePhase4ConditioningIntentOntologyIntoExercise } from "./exerciseMetadata/phase4ConditioningIntentInference";
import { mergePhase5MobilityStretchOntologyIntoExercise } from "./exerciseMetadata/phase5MobilityStretchInference";
import { mergePhase6RepRangeOntologyIntoExercise } from "./exerciseMetadata/phase6RepRangeInference";
import { mergePhase7WarmupCooldownRelevanceIntoExercise } from "./exerciseMetadata/phase7WarmupCooldownRelevanceInference";
import { mergePhase8UnilateralOntologyIntoExercise } from "./exerciseMetadata/phase8UnilateralInference";
import { mergePhase9DynamicPowerTagsIntoExercise } from "./exerciseMetadata/phase9DynamicPowerTagInference";
import { applyExerciseMetadataOverrides } from "./exerciseMetadata/applyMetadataOverrides";
import type { ExerciseMetadataPatch } from "./exerciseMetadata/metadataOverrideTypes";
import { CONDITIONING_INTENT_ENRICHMENT } from "../data/conditioningIntentEnrichment";
import { GOAL_INTENT_ENRICHMENT } from "../data/goalIntentEnrichment";
import { SPORT_SUB_FOCUS_ENRICHMENT } from "../data/sportSubFocusEnrichment";
import exerciseMetadataOverrides from "../data/exerciseMetadataOverrides.json";
import { resolveExerciseDescription } from "./exerciseDescriptionsCurated";

const EXERCISE_METADATA_OVERRIDES = exerciseMetadataOverrides as Record<string, ExerciseMetadataPatch>;

const CANONICAL_SPORT_SLUGS = new Set(SPORTS_WITH_SUB_FOCUSES.map((s) => normalizeSlug(s.slug)));

/**
 * Sport tag inference:
 * - Build anchor tag sets per sport from SUB_FOCUS_TAG_MAP (top-weighted tags only).
 * - When an exercise contains any anchor tag, assign the sport tag to improve sport_slugs matching coverage.
 *
 * This is intentionally conservative (few anchor tags) to avoid broad/mere-hardness tagging.
 */
const SPORT_ANCHOR_TAGS: Map<string, Set<string>> = (() => {
  const sportToTagWeights = new Map<string, Map<string, number>>();

  for (const [compoundKey, entries] of Object.entries(SUB_FOCUS_TAG_MAP)) {
    const [sportSlugRaw] = compoundKey.split(":");
    if (!sportSlugRaw) continue;
    const sportSlug = normalizeSlug(getCanonicalSportSlug(sportSlugRaw));
    if (!CANONICAL_SPORT_SLUGS.has(sportSlug)) continue;

    const byTag = sportToTagWeights.get(sportSlug) ?? new Map<string, number>();
    for (const e of entries) {
      const tagSlug = normalizeSlug(e.tag_slug);
      const weight = typeof e.weight === "number" ? e.weight : 1;
      const prev = byTag.get(tagSlug) ?? -Infinity;
      byTag.set(tagSlug, Math.max(prev, weight));
    }
    sportToTagWeights.set(sportSlug, byTag);
  }

  const out = new Map<string, Set<string>>();
  for (const [sportSlug, tagWeights] of sportToTagWeights.entries()) {
    const top = [...tagWeights.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 4)
      .map(([tag]) => tag);
    out.set(sportSlug, new Set(top));
  }
  return out;
})();

function modalitiesToGoalTags(modalities: string[] | undefined): ExerciseTags["goal_tags"] {
  const m = (modalities ?? []).map((x) => x.toLowerCase().replace(/\s/g, "_"));
  const out = new Set<NonNullable<ExerciseTags["goal_tags"]>[number]>();
  for (const s of m) {
    if (s === "strength") out.add("strength");
    else if (s === "hypertrophy") out.add("hypertrophy");
    else if (s === "conditioning") out.add("conditioning");
    else if (s === "power") out.add("power");
    else if (s === "mobility") out.add("mobility");
    else if (s === "recovery") out.add("recovery");
    else if (s === "skill") out.add("calisthenics");
  }
  return out.size ? ([...out] as ExerciseTags["goal_tags"]) : undefined;
}

/** Build ExerciseTags from ExerciseDefinition tags and contraindications. Ties sport and sub-focus data to exercises for selection. */
function buildExerciseTags(def: ExerciseDefinition): ExerciseTags {
  const tags = def.tags ?? [];
  const toSlug = (t: string) => normalizeSlug(t);
  const goalTagsFromTags = tags.filter((t) =>
    ["strength", "hypertrophy", "endurance", "power", "mobility", "calisthenics", "recovery", "athleticism"].includes(toSlug(t))
  ) as ExerciseTags["goal_tags"];
  const goalTagsFromModalities = modalitiesToGoalTags(def.modalities as unknown as string[] | undefined);
  const goalTags = [...new Set([...(goalTagsFromTags ?? []), ...(goalTagsFromModalities ?? [])])] as ExerciseTags["goal_tags"];
  const energySlugs = tags.filter((t) => /^energy_(low|medium|high)$/.test(toSlug(t)));
  const energyFit = energySlugs.length
    ? (energySlugs.map((t) => t.replace("energy_", "") as "low" | "medium" | "high"))
    : undefined;
  const jointStress = tags.filter((t) => {
    const u = toSlug(t);
    return JOINT_STRESS_PREFIXES.some((p) => u.includes(p) || u === p);
  });
  const contraindications = (def.contraindications ?? []).map(contraindicationToSlug);
  const stimulus = tags.filter((t) => STIMULUS_SLUGS.has(toSlug(t))) as ExerciseTags["stimulus"];
  // Canonical sport tags: must match SPORTS_WITH_SUB_FOCUSES slugs (no `sport_` prefix).
  const sportTags = [
    ...new Set(
      tags.flatMap((t) => {
        const raw = toSlug(t);
        const withoutPrefix = raw.startsWith("sport_") ? raw.slice("sport_".length) : raw;
        const canonical = normalizeSlug(getCanonicalSportSlug(withoutPrefix));
        return CANONICAL_SPORT_SLUGS.has(canonical) ? [canonical] : [];
      })
    ),
  ];
  const used = new Set([
    ...(goalTags ?? []).map(toSlug),
    ...energySlugs.map(toSlug),
    ...jointStress.map(toSlug),
    ...(stimulus ?? []).map(toSlug),
    ...sportTags.map(toSlug),
  ]);
  const rawAttribute = tags.filter((t) => !used.has(toSlug(t)));
  const derivedMuscleTags = (def.muscles ?? []).map(toSlug);
  const derivedMovementPattern = deriveMovementPattern(def);
  const derivedMovementTags = derivedMovementPattern
    ? normalizeMatchableTagSlugs(toSlug(derivedMovementPattern))
    : [];
  const normalizedRawAttributeTags = rawAttribute.flatMap((t) => normalizeMatchableTagSlugs(t));

  // Lift canonical “strength qualities” from stimulus tags so sport sub-focus scoring can match them.
  const inferredFromStimulus: string[] = [];
  const hasQuads = normalizedRawAttributeTags.includes("quads");
  const hasHamstrings = normalizedRawAttributeTags.includes("hamstrings");
  const stimulusSlugs = stimulus.map(toSlug);
  if (stimulusSlugs.includes("eccentric")) {
    inferredFromStimulus.push("eccentric_strength");
    if (hasHamstrings) inferredFromStimulus.push("tendon_resilience");

    const idName = normalizeSlug(`${def.id} ${def.name}`);
    if (hasQuads || idName.includes("quad") || idName.includes("knee_dominant")) inferredFromStimulus.push("eccentric_quad_strength");
  }
  if (stimulusSlugs.includes("isometric")) {
    inferredFromStimulus.push("isometric_strength", "strength_endurance");
  }
  if (stimulusSlugs.includes("plyometric")) {
    inferredFromStimulus.push("explosive_power");
  }
  if (stimulusSlugs.includes("grip")) {
    inferredFromStimulus.push("grip_strength", "grip_endurance");
  }

  const modalitySlugs = (def.modalities ?? []).map(toSlug);
  const equipmentSlugs = (def.equipment ?? []).map(toSlug);
  const idName = normalizeSlug(`${def.id} ${def.name}`);
  const inferredFromModalitiesAndEquipment: string[] = [];
  if (modalitySlugs.includes("strength")) inferredFromModalitiesAndEquipment.push("max_strength");
  if (modalitySlugs.includes("conditioning")) inferredFromModalitiesAndEquipment.push("work_capacity");

  if (equipmentSlugs.includes("bodyweight")) inferredFromModalitiesAndEquipment.push("bodyweight");
  if (equipmentSlugs.includes("sled") || idName.includes("sled")) inferredFromModalitiesAndEquipment.push("sled_strength");

  // Eccentric inference from ids/names (FunctionalFitness exports often encode eccentricity in the slug, not tags).
  if (idName.includes("eccentric")) {
    inferredFromModalitiesAndEquipment.push("eccentric_strength");
    if (hasQuads) inferredFromModalitiesAndEquipment.push("eccentric_quad_strength");
    if (hasHamstrings) inferredFromModalitiesAndEquipment.push("tendon_resilience");
  }

  // High-intensity / threshold-ish heuristics (used by zone3/lactate/energy_high canonical tags).
  const isSprintOrInterval = /sprint|interval|hiit|tempo|sprinter/.test(idName);
  if (isSprintOrInterval) {
    inferredFromModalitiesAndEquipment.push("energy_high", "zone3_cardio", "anaerobic_capacity", "lactate_threshold");
  }

  // Reactive / landing-ish
  if (/reactive|landing|drop|drop_|jump_landing/.test(idName)) inferredFromModalitiesAndEquipment.push("reactive_power");

  // Pattern inference from OTA slugs / ids.
  if (idName.includes("lunge")) inferredFromModalitiesAndEquipment.push("lunge_pattern");
  const isSkaterStrength =
    idName.includes("skater_squat") || idName.includes("skater_lunge");
  const isSkaterDynamic =
    idName.includes("skater_jump") ||
    idName.includes("skater_hop") ||
    idName.includes("skater_bound") ||
    (idName.includes("skater") && (idName.includes("jump") || idName.includes("hop")));
  if (!isSkaterStrength && (idName.includes("shuffle") || idName.includes("agility") || isSkaterDynamic)) {
    inferredFromModalitiesAndEquipment.push("agility");
  }

  // Climbing/grip inference (finger/lock-off)
  if (idName.includes("finger") || idName.includes("two_finger") || idName.includes("planche")) inferredFromModalitiesAndEquipment.push("finger_strength");
  if (idName.includes("lockoff") || idName.includes("lock-off") || idName.includes("front_lever")) inferredFromModalitiesAndEquipment.push("lockoff_strength");

  // Hips / trunk / mobility inference
  if (idName.includes("hip")) inferredFromModalitiesAndEquipment.push("hips");

  const attributeTags = [
    ...new Set([
      ...normalizedRawAttributeTags,
      ...derivedMuscleTags,
      ...derivedMovementTags,
      ...energySlugs.map(toSlug),
      ...inferredFromStimulus,
      ...inferredFromModalitiesAndEquipment,
    ]),
  ];

  // Infer sport tags from the exercise's canonical selector tags.
  // This improves generator compatibility for sport_slugs matching without requiring explicit `sport_*` tags in the DB.
  const exerciseTagSetForSportInference = new Set<string>([
    ...goalTags.map(toSlug),
    ...stimulusSlugs,
    ...attributeTags,
  ]);
  const inferredSportTags: string[] = [];
  for (const [sportSlug, anchorTags] of SPORT_ANCHOR_TAGS.entries()) {
    let matched = false;
    for (const t of anchorTags) {
      if (exerciseTagSetForSportInference.has(t)) {
        matched = true;
        break;
      }
    }
    if (matched) inferredSportTags.push(sportSlug);
  }
  const sportTagsFinal = [...new Set([...sportTags, ...inferredSportTags])];

  return {
    ...(goalTags?.length ? { goal_tags: goalTags } : {}),
    ...(sportTagsFinal.length ? { sport_tags: sportTagsFinal } : {}),
    ...(energyFit?.length ? { energy_fit: energyFit } : {}),
    ...(jointStress.length ? { joint_stress: jointStress } : {}),
    ...(contraindications.length ? { contraindications } : {}),
    ...(stimulus.length ? { stimulus } : {}),
    ...(attributeTags.length ? { attribute_tags: attributeTags } : {}),
  };
}

/**
 * Convert ExerciseDefinition (lib / data/exercises / listExercises) to generator Exercise.
 * Enables using the same exercise pool for dailyGenerator when loaded from DB or in-memory.
 */
export function exerciseDefinitionToGeneratorExercise(def: ExerciseDefinition): Exercise {
  const modality = toGeneratorModality(def.modalities?.[0] ?? "strength");
  const muscle_groups = [...(def.muscles ?? [])];
  const tagsFromDef = (def.tags ?? []).filter(
    (t) =>
      !["strength", "hypertrophy", "endurance", "power", "mobility", "calisthenics", "recovery", "athleticism"].includes(
        t.toLowerCase().replace(/\s/g, "_")
      ) &&
      !/^energy_(low|medium|high)$/.test(t.toLowerCase().replace(/\s/g, "_"))
  );
  const idName = normalizeSlug(`${def.id} ${def.name}`);
  const rawEquipment = (def.equipment ?? []).map((eq) =>
    typeof eq === "string" ? eq.toLowerCase().replace(/\s/g, "_") : String(eq)
  );
  // Some imported catalogs (FunctionalFitness / OTA) include specialty-tool exercises but incorrectly
  // mark equipment as bodyweight. This breaks equipment-availability filtering.
  // We keep this small and explicit: only override when the only equipment is bodyweight.
  const isBodyweightOnly =
    rawEquipment.length === 1 && rawEquipment[0] === "bodyweight";
  const inferredSpecialtyEquipment: string[] = [];
  if (isBodyweightOnly) {
    // Landmine movements require a loaded barbell; take precedence over single-tool specialty checks.
    if (/\blandmine\b/.test(idName)) {
      inferredSpecialtyEquipment.push("barbell", "plates");
    } else {
      if (/\bclubbell\b/.test(idName)) inferredSpecialtyEquipment.push("clubbell");
      if (/\bindian_club\b|\bindian_clubs\b/.test(idName))
        inferredSpecialtyEquipment.push("indian_club");
      if (/\bgada\b/.test(idName)) inferredSpecialtyEquipment.push("gada");
      if (/\bmacebell\b/.test(idName)) inferredSpecialtyEquipment.push("macebell");
      if (/\bsteel_mace\b|\bmace\b/.test(idName))
        inferredSpecialtyEquipment.push("steel_mace");
    }
  }
  const equipment_required =
    inferredSpecialtyEquipment.length > 0 ? inferredSpecialtyEquipment : rawEquipment;
  const tags = buildExerciseTags(def);

  const catalogDescription = resolveExerciseDescription(def.id, def.description);

  const exercise: Exercise = {
    id: def.id,
    name: def.name,
    ...(catalogDescription ? { description: catalogDescription } : {}),
    movement_pattern: deriveMovementPattern(def),
    muscle_groups,
    modality,
    equipment_required,
    difficulty: 2,
    time_cost: "medium",
    tags,
    ...(def.aliases?.length ? { aliases: def.aliases } : {}),
    ...(def.progressions?.length ? { progressions: def.progressions } : {}),
    ...(def.regressions?.length ? { regressions: def.regressions } : {}),
  };

  // Phase 1: research-aligned movement family + fine patterns when static/DB omits ontology
  // (see docs/research/exercise-metadata-phase1-movement-patterns.md).
  mergePhase1MovementOntologyIntoExercise(exercise, exerciseInferenceInputFromDefinition(def));

  // Phase 2: joint stress, contraindications, impact (see docs/research/exercise-metadata-phase2-safety-layer.md).
  mergePhase2SafetyOntologyIntoExercise(exercise, exerciseInferenceInputFromDefinition(def), {
    movement_patterns: exercise.movement_patterns ?? [],
    primary_movement_family: exercise.primary_movement_family,
  });

  // Phase 3: role, pairing, fatigue regions (see docs/research/exercise-metadata-phase3-session-structure.md).
  mergePhase3SessionOntologyIntoExercise(exercise, exerciseInferenceInputFromDefinition(def), {
    movement_patterns: exercise.movement_patterns ?? [],
    primary_movement_family: exercise.primary_movement_family,
    movement_pattern: exercise.movement_pattern,
    modality: exercise.modality,
    joint_stress_tags: exercise.joint_stress_tags,
  });

  // Phase 4: conditioning intent slugs for sub-focus / template matching (conditioningSubFocus.ts).
  mergePhase4ConditioningIntentOntologyIntoExercise(exercise, exerciseInferenceInputFromDefinition(def));

  // Phase 5: mobility_targets + stretch_targets for warmup/cooldown target matching.
  mergePhase5MobilityStretchOntologyIntoExercise(exercise, exerciseInferenceInputFromDefinition(def));

  // Phase 6: rep_range bounds for getEffectiveRepRange (see docs/research/exercise-metadata-phase6-rep-range-bounds.md).
  mergePhase6RepRangeOntologyIntoExercise(exercise, exerciseInferenceInputFromDefinition(def));

  // Phase 7: warmup_relevance / cooldown_relevance for ontologyScoring (after Phase 5 targets).
  mergePhase7WarmupCooldownRelevanceIntoExercise(exercise, exerciseInferenceInputFromDefinition(def));

  // Phase 8: unilateral flag for variety scoring (docs/research/exercise-metadata-phase8-unilateral.md).
  mergePhase8UnilateralOntologyIntoExercise(exercise, exerciseInferenceInputFromDefinition(def));

  // Phase 9: agility / speed / plyometric tags for sport sub-focus and dynamic-movement gates.
  mergePhase9DynamicPowerTagsIntoExercise(exercise, exerciseInferenceInputFromDefinition(def));

  const explicitFromDef = def.workout_levels?.length ? def.workout_levels : undefined;
  if (explicitFromDef?.length) {
    exercise.workout_levels_from_db = explicitFromDef as UserLevel[];
  }
  const levelSource = {
    id: def.id,
    name: def.name,
    tags: def.tags ?? [],
    workout_levels: explicitFromDef,
    stability_demand: exercise.stability_demand,
    grip_demand: exercise.grip_demand,
    impact_level: exercise.impact_level,
    modality: exercise.modality,
    movement_pattern: exercise.movement_pattern,
    difficulty: exercise.difficulty,
    unilateral: exercise.unilateral,
    attribute_tags: exercise.tags.attribute_tags,
    equipment_required: exercise.equipment_required,
  };
  exercise.workout_level_tags = inferWorkoutLevelsFromExtendedSource(levelSource);
  if (isWorkoutLevelsDebugEnabled()) {
    const explained = inferWorkoutLevelsWithExplanation(levelSource);
    exercise.workout_levels_meta = {
      origin: explained.origin,
      reasons: explained.reasons,
      ...(explained.complexityScore != null ? { complexityScore: explained.complexityScore } : {}),
    };
  }
  if (inferCreativeVariationFromSource(levelSource)) {
    exercise.creative_variation = true;
  }

  applyExerciseMetadataOverrides(exercise, def, EXERCISE_METADATA_OVERRIDES[def.id]);
  applyExerciseMetadataOverrides(exercise, def, CONDITIONING_INTENT_ENRICHMENT[def.id]);
  applyExerciseMetadataOverrides(exercise, def, GOAL_INTENT_ENRICHMENT[def.id]);
  applyExerciseMetadataOverrides(exercise, def, SPORT_SUB_FOCUS_ENRICHMENT[def.id]);

  return exercise;
}

/** Sport labels for blended sessions (sport_weight < 1) so workout.focus reflects sport + goal picks. */
function sportFocusLabelsForBlendedSession(
  input?: GenerateWorkoutInput
): string[] {
  if (!input?.sport_slugs?.length) return [];
  const sw = input.sport_weight ?? input.session_intent?.sport_weight ?? 0;
  if (sw >= 0.99) return [];

  const labels: string[] = [];
  if (!labels.some((l) => l.toLowerCase() === "sport preparation")) {
    labels.push("Sport preparation");
  }
  for (const raw of input.sport_slugs) {
    const slug = getCanonicalSportSlug(raw);
    const sport = SPORTS_WITH_SUB_FOCUSES.find((s) => s.slug === slug);
    const name =
      sport?.name ??
      slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    if (!labels.some((l) => l.toLowerCase() === name.toLowerCase())) {
      labels.push(name);
    }
  }
  return labels;
}

/**
 * Convert WorkoutSession (dailyGenerator output) to GeneratedWorkout (app type).
 * Preserves blocks; adds id, focus, durationMinutes, energyLevel, intentSplit, and
 * intentProportionCheck for the UI (pie chart, title, and alignment audit).
 */
export function workoutSessionToGeneratedWorkout(
  session: WorkoutSession,
  preferences: ManualPreferences,
  id?: string,
  generatorInput?: import("../logic/workoutGeneration/types").GenerateWorkoutInput
): GeneratedWorkout {
  const scores = session.debug?.sport_profile_exercise_scores;
  const blocks =
    scores && Object.keys(scores).length > 0
      ? session.blocks.map((b) => ({
          ...b,
          items: b.items.map((it) => {
            const s = scores[it.exercise_id];
            if (!s) return it;
            return {
              ...it,
              sport_profile_score_debug: {
                movement_pattern_match_score: s.movement_pattern_match_score,
                sport_alignment_score: s.sport_alignment_score,
                penalty_flags: s.penalty_flags,
              },
            };
          }),
        }))
      : session.blocks;

  const workoutId = id ?? `w_${Date.now()}`;
  let focus = preferences.primaryFocus?.length ? [...preferences.primaryFocus] : [session.title];
  if (generatorInput) {
    for (const label of sportFocusLabelsForBlendedSession(generatorInput)) {
      if (!focus.some((f) => f.toLowerCase() === label.toLowerCase())) {
        focus.push(label);
      }
    }
  }
  const generationPreferences = cloneManualPreferencesSnapshot(preferences);
  const declaredIntentSplit = generatorInput
    ? computeDeclaredIntentSplit(generatorInput)
    : undefined;
  const intentSplit = declaredIntentSplit;

  const intentProportionCheck =
    generatorInput && blocks.length > 0
      ? runIntentProportionGuardrail(blocks as import("../lib/types").WorkoutBlock[], generatorInput)
      : undefined;

  return {
    id: workoutId,
    focus,
    durationMinutes: session.estimated_duration_minutes,
    energyLevel: preferences.energyLevel ?? null,
    generationPreferences,
    blocks,
    ...(intentSplit ? { intentSplit } : {}),
    ...(intentProportionCheck ? { intentProportionCheck } : {}),
  };
}
