import type {
  GeneratedWorkout,
  EnergyLevel,
  ManualPreferences,
  TargetBody,
  WorkoutTierPreference,
} from "../../lib/types";
import type { GymProfile } from "../../data/gymProfiles";
import { loadGeneratorModule } from "../../lib/loadGeneratorModule";
import { isDbConfigured } from "../../lib/db";
import { getPreferredExerciseNamesForSportAndGoals } from "../../lib/db/starterExerciseRepository";
import { hashString, type SportGoalContext } from "../../lib/dailyGeneratorAdapter";
import type { SessionIntentContract } from "../../logic/workoutGeneration/sessionIntentContract";

export type { SessionIntentContract };

export type SessionIntent = {
  id: string;
  /** Human-readable label for the session (e.g. "Lower Strength + Zone 2"). */
  label: string;
  /** High-level focus labels mapped to Manual primaryFocus options. */
  focus: string[];
  durationMinutes: number;
  energyLevel: EnergyLevel;
  /** Optional rationale or notes for this session. */
  notes?: string;
  /** Optional body-region bias for this session (emphasis, not strict filter). */
  bodyRegionBias?: { targetBody: TargetBody | null; targetModifier: string[] };
};

export type SportGoalOptions = {
  sportSlug?: string | null;
  goalSlugs?: string[];
  /** Match % for 1st / 2nd / 3rd goal (e.g. [50, 30, 20]). Used with get_exercises_by_goals_ranked. */
  goalWeightsPct?: number[];
  /** Sub-focus slugs for primary sport (from SPORTS_WITH_SUB_FOCUSES). Biases exercise selection via tag mapping. */
  sportSubFocusSlugs?: string[];
  /** When both sports and goals: 0–100 = sport(s) share. Used to merge sport vs goal exercise rankings. */
  sportVsGoalPct?: number;
  /** Ordered sport slugs (1 or 2) for two-sport weighting with sportFocusPct. */
  rankedSportSlugs?: string[];
  /** When 2 sports: [1st sport %, 2nd sport %], sum = 100. */
  sportFocusPct?: [number, number];
  /** Sub-focus slugs per sport (sportSlug -> slugs). Used when 1 or 2 sports. */
  sportSubFocusSlugsBySport?: Record<string, string[]>;
  /** Recent load (e.g. "Long Run", "Heavy Lower") so generation can avoid exercises that add strain before/after. */
  recentLoad?: string;
  /** Injury/constraint labels (e.g. "Knee", "Lower Back") so generation excludes contraindicated exercises. */
  injuries?: string[];
  /** Body-region bias for this session (emphasis; generator uses as targetBody/targetModifier). */
  bodyRegionBias?: { targetBody: TargetBody | null; targetModifier: string[] };
  /** Experience tier for exercise pool filtering (default intermediate when omitted). */
  workoutTier?: WorkoutTierPreference;
  /** When true, allow exercises tagged as creative/complex variations. */
  includeCreativeVariations?: boolean;
  /** Per–primary-focus sub-goal labels (Manual `subFocusByGoal` keys). Biases exercise selection. */
  subFocusByGoal?: Record<string, string[]>;
  /** Populate `GenerateWorkoutInput.include_intent_survival_report` for debug tracing. */
  includeIntentSurvivalReport?: boolean;
};

/**
 * Shared workout builder that takes a high-level session intent and returns a concrete workout.
 * Both Manual mode and Sports Prep mode can route through this so exercise generation stays consistent.
 * When options.sportSlug and options.goalSlugs are provided and DB is configured, exercises are
 * preferred by goal_exercise_relevance and sport_tag_profile overlap.
 */
export async function buildWorkoutForSessionIntent(
  intent: SessionIntent,
  gymProfile?: GymProfile,
  seedExtra?: string | number,
  options?: SportGoalOptions
): Promise<GeneratedWorkout> {
  const bodyBias =
    options?.bodyRegionBias ?? intent.bodyRegionBias ?? null;
  const basePreferences: ManualPreferences = {
    primaryFocus: intent.focus,
    targetBody: bodyBias?.targetBody ?? null,
    targetModifier: bodyBias?.targetModifier ?? [],
    durationMinutes: intent.durationMinutes,
    energyLevel: intent.energyLevel,
    injuries: options?.injuries ?? [],
    upcoming: options?.recentLoad ? [options.recentLoad] : [],
    subFocusByGoal:
      options?.subFocusByGoal && Object.keys(options.subFocusByGoal).length > 0
        ? { ...options.subFocusByGoal }
        : {},
    workoutStyle: [],
    workoutTier: options?.workoutTier ?? "intermediate",
    includeCreativeVariations: options?.includeCreativeVariations === true,
  };

  let preferredNames: string[] | undefined;
  const hasGoals = (options?.goalSlugs?.length ?? 0) > 0;
  const hasSport =
    (options?.sportSlug != null && options.sportSlug !== "") ||
    (options?.rankedSportSlugs?.length ?? 0) > 0;
  if (isDbConfigured() && (hasGoals || hasSport)) {
    try {
      preferredNames = await getPreferredExerciseNamesForSportAndGoals(
        options?.sportSlug ?? options?.rankedSportSlugs?.[0] ?? null,
        options?.goalSlugs ?? [],
        options?.goalWeightsPct ?? [50, 30, 20],
        options?.sportSubFocusSlugs,
        {
          rankedSportSlugs: options?.rankedSportSlugs,
          sportFocusPct: options?.sportFocusPct,
          sportVsGoalPct: options?.sportVsGoalPct,
          sportSubFocusSlugsBySport: options?.sportSubFocusSlugsBySport,
        }
      );
    } catch {
      preferredNames = undefined;
    }
  }

  const sportGoalContext: SportGoalContext | undefined =
    hasGoals || hasSport || options?.includeIntentSurvivalReport
      ? {
          sport_slugs:
            (options?.rankedSportSlugs?.length ?? 0) > 0
              ? options?.rankedSportSlugs
              : options?.sportSlug
                ? [options.sportSlug]
                : undefined,
          sport_sub_focus:
            options?.sportSubFocusSlugsBySport &&
            Object.keys(options.sportSubFocusSlugsBySport).length > 0
              ? options.sportSubFocusSlugsBySport
              : (options?.sportSubFocusSlugs?.length ?? 0) > 0
                ? (() => {
                    const key =
                      options?.sportSlug && options.sportSlug !== ""
                        ? options.sportSlug
                        : options?.rankedSportSlugs?.[0];
                    return key ? { [key]: options.sportSubFocusSlugs! } : undefined;
                  })()
                : undefined,
          goal_weights:
            (options?.goalWeightsPct?.length ?? 0) > 0
              ? options.goalWeightsPct!.map((p) => p / 100)
              : undefined,
          sport_weight:
            options?.sportVsGoalPct != null ? options.sportVsGoalPct / 100 : undefined,
          include_intent_survival_report: options?.includeIntentSurvivalReport === true,
          intent_survival_upstream:
            options?.includeIntentSurvivalReport === true
              ? {
                  source: "workoutBuilder_session_intent",
                  session_intent_summary: intent.label,
                  primitives: {
                    focus: intent.focus,
                    durationMinutes: intent.durationMinutes,
                    energyLevel: intent.energyLevel,
                    notes: intent.notes ?? null,
                    session_intent_contract: options?.session_intent_contract ?? null,
                  },
                }
              : undefined,
          session_intent_contract: options?.session_intent_contract,
        }
      : undefined;

  const baseSeed = seedExtra ?? intent.id;
  const resolvedSeed: string | number =
    hasGoals || hasSport
      ? hashString(
          JSON.stringify({
            base: baseSeed,
            focus: intent.focus,
            goalSlugs: options?.goalSlugs ?? [],
            goalWeightsPct: options?.goalWeightsPct ?? [],
            sportSlug: options?.sportSlug ?? null,
            rankedSportSlugs: options?.rankedSportSlugs ?? [],
            sportVsGoalPct: options?.sportVsGoalPct ?? null,
            sportFocusPct: options?.sportFocusPct ?? null,
            sportSubFocusSlugs: options?.sportSubFocusSlugs ?? null,
            sportSubFocusSlugsBySport: options?.sportSubFocusSlugsBySport ?? null,
            sessionIntentContractSport: options?.session_intent_contract?.sportSlug ?? null,
            sessionIntentContractType: options?.session_intent_contract?.sessionType ?? null,
          })
        )
      : baseSeed;

  const { generateWorkoutAsync } = await loadGeneratorModule();
  const workout = await generateWorkoutAsync(
    basePreferences,
    gymProfile,
    resolvedSeed,
    preferredNames,
    sportGoalContext
  );

  return {
    ...workout,
    notes: intent.notes ?? workout.notes,
  };
}

