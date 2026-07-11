import { getSupabase, isDbConfigured } from "../../lib/db";
import { getLocalDateString } from "../../lib/dateUtils";
import type { AdaptiveScheduleLabels, EnergyLevel, GeneratedWorkout } from "../../lib/types";
import { getWorkoutDescriptor } from "../../lib/workoutDescriptor";
import type { GymProfile } from "../../data/gymProfiles";
import { buildWorkoutForSessionIntent, type SessionIntent } from "../workoutBuilder";
import { saveGeneratedWorkout, deleteWorkout } from "../../lib/db/workoutRepository";
import {
  getWeeklyStructureTemplate,
  type DayBias,
  type IntentKey,
} from "./weeklyEmphasis";
import { formatDayTitle, isSpecificFocusRelevantForBody } from "../../lib/dayTitle";
import { GOAL_SLUG_TO_LABEL, GOAL_SLUG_TO_PRIMARY_FOCUS, GOAL_BIAS_TO_PRIMARY_FOCUS_LABEL } from "../../lib/preferencesConstants";
import { getCanonicalSportSlug } from "../../data/sportSubFocus";
import { sessionIntentContractForSportSlug } from "../../logic/workoutGeneration/sessionIntentContract";
import {
  zeroDemand,
  defaultNonSportEmptyGoalsDemand,
  sportSupportDefaultDemand,
  type DemandVector,
} from "./sportSupportDemand";
import { composeRunGenerationSeed } from "../../lib/dailyGeneratorAdapter";
import { loadGeneratorModule } from "../../lib/loadGeneratorModule";
import type { Exercise } from "../../logic/workoutGeneration/types";
import {
  createExplicitWeekSlotPicker,
  hasExplicitWeekDaySchedule,
  interleaveGymAndSportSlots,
  unionTrainingDayIndices,
} from "./weekDaySlotAssignment";
import {
  adaptiveSetupFromPlanContext,
  manualPreferencesForSportWeekFocus,
  resolveDayFocusPreset,
  resolvedDayFocusToWorkoutParams,
} from "../../lib/weekDaySessionFocus";
import type { ManualPreferences } from "../../lib/types";
import { mergeDaySubFocusOverride } from "../../lib/daySessionFocusConflict";
import {
  buildSportDesignatedPlannedDay,
  getSportsOnCalendarDay,
  isSportDesignatedPlannedDay,
  plannedDayFromDbRow,
  sportDesignatedDayDisplayTitle,
} from "./sportDesignatedDay";
export {
  buildSportDesignatedPlannedDay,
  getSportsOnCalendarDay,
  isSportDesignatedPlannedDay,
  plannedDayFromDbRow,
  sportDesignatedDayDisplayTitle,
  sportSlugFromPlannedDay,
} from "./sportDesignatedDay";
export type { PlannedDaySessionKind } from "./sportDesignatedDay";

/** Per-sport days per week (sportSlug -> number of days). Enables e.g. sport A 2 days, sport B 1 day, gym 3 days. */
export type SportDaysAllocation = Record<string, number>;

export type PlanWeekInput = {
  /** When absent, plan is generated in memory only (no DB persist). */
  userId?: string | null;
  weekStartDate?: string; // ISO date; defaults to current week (Monday)
  /** Null when the user did not select ranked goals (sport-only prep). */
  primaryGoalSlug: string | null;
  secondaryGoalSlug?: string | null;
  tertiaryGoalSlug?: string | null;
  sportSlug?: string | null;
  /** Optional sub-focus quality slugs for primary sport (from sport_qualities). */
  sportQualitySlugs?: string[];
  /** Optional sub-focus slugs for primary sport (from SPORTS_WITH_SUB_FOCUSES). Used for exercise-tag biasing. */
  sportSubFocusSlugs?: string[];
  gymDaysPerWeek: number;
  /** Per-sport days per week (e.g. { road_running: 2, climbing: 1 }). Same day can have gym + sport. */
  sportDaysAllocation?: SportDaysAllocation;
  /** Weekday indices for gym sessions (0=Mon .. 6=Sun). When set, slots map to these days, not interleaved order. */
  gymTrainingDays?: number[];
  /** Weekday indices per sport slug. When set with gymTrainingDays, drives sport-day slot placement. */
  sportTrainingDaysBySlug?: Record<string, number[]>;
  /** Ordered sport slugs [primary, secondary] for slot order and sub-focus (sportSlug is primary). */
  rankedSportSlugs?: string[];
  /** When 2 sports: [1st sport %, 2nd sport %], sum = 100. Used to weight sport focus in exercise selection. */
  sportFocusPct?: [number, number];
  /** When both sports and goals: 0–100 = sport(s) share. Used to merge sport vs goal exercise rankings. */
  sportVsGoalPct?: number;
  /** Sub-focus slugs per sport (sportSlug -> slugs). Used when 1 or 2 sports for exercise-tag biasing. */
  sportSubFocusSlugsBySport?: Record<string, string[]>;
  /** Training weekdays 0=Mon .. 6=Sun (union of gym + sport days when schedule screen is used). */
  preferredTrainingDays?: number[];
  defaultSessionDuration: number;
  energyBaseline: EnergyLevel;
  /** Recent load (e.g. "Long Run", "Heavy Lower") so each workout avoids exercises that add strain. */
  recentLoad?: string;
  injuries?: string[];
  /** Experience tier for exercise pool filtering (default intermediate). */
  workoutTier?: import("../../lib/types").WorkoutTierPreference;
  /** Allow creative/complex variation exercises when true. */
  includeCreativeVariations?: boolean;
  sportSessions?: { date: string; goalSlug: string; sessionType?: string }[];
  gymProfile?: GymProfile;
  /** Match % for 1st / 2nd / 3rd goal (defaults 50, 30, 20). */
  goalMatchPrimaryPct?: number;
  goalMatchSecondaryPct?: number;
  goalMatchTertiaryPct?: number;
  /** Goal sub-focus labels keyed by Manual primary focus (from Sport Mode or advanced prefs). */
  goalSubFocusByGoal?: Record<string, string[]>;
  /** Optional blend % keyed like `goalSubFocusByGoal`. */
  goalSubFocusPctByGoal?: Record<string, Record<string, number>>;
  /** Weekly body emphasis: biases gym-day templates toward this region (week still rotates upper/lower/full per planner). */
  emphasis?: import("../../lib/types").BodyEmphasisKey | null;
  /** Goal distribution: dedicate entire days to goals vs blend. Default blend. */
  goalDistributionStyle?: import("../../lib/types").GoalDistributionStyle | null;
  /**
   * One-day / per-session: when focus areas conflict across body regions,
   * spread all picks vs resolve toward body emphasis.
   */
  sessionFocusDistribution?: import("../../lib/types").SessionFocusDistributionStyle | null;
  /** Body emphasis structure: auto upper/lower/full vs manual. Default auto_alternate. */
  weeklyBodyEmphasisStyle?: import("../../lib/types").WeeklyBodyEmphasisStyle | null;
  /** Specific body-part behavior: auto-apply to relevant days vs manual. Default auto_apply. */
  specificBodyPartBehavior?: import("../../lib/types").SpecificBodyPartBehavior | null;
  /** User-selected specific body-part emphasis (e.g. glutes, shoulders). Applied to relevant days per rules. */
  specificBodyPartEmphasis?: import("../../lib/types").SpecificBodyFocusKey[] | null;
  /** Optional one-day body override from setup screens. */
  dailyPreferences?: import("../../lib/types").DailyWorkoutPreferences | null;
  /** Adaptive setup labels for summaries (fatigue, phase, etc.); not used for generator defaults. */
  adaptiveScheduleLabels?: AdaptiveScheduleLabels | null;
  /** When set, this intent is used first for gym slots (e.g. one-day sport avoids recovery-only sessions). */
  forceIntentKey?: IntentKey;
  /**
   * Per gym slot (same order as gym days in the planner): session-focus preset id
   * from `weekDaySessionFocus` (e.g. sport_first, goal_emphasis_1).
   */
  gymDayFocusPresetIds?: string[];
  /** Per gym slot body focus selected in setup. */
  gymDayBodyFocuses?: {
    targetBody: import("../../lib/types").TargetBody;
    targetModifier: string[];
    specificBodyFocus?: import("../../lib/types").SpecificBodyFocusKey[];
  }[];
  /** Per gym slot sub-focus overrides after conflict resolution (merged into goalSubFocusByGoal). */
  gymDaySubFocusByGoalOverrides?: Array<Record<string, string[]> | null | undefined>;
  /** Manual preferences for sub-focus / goal match % when resolving day-focus presets. */
  manualPreferences?: ManualPreferences | null;
};

/** Day-level focus for display and regeneration. Supports day-level editing. */
export type DayLevelFocus = {
  /** Goal label or slug for this day (e.g. "Sports Conditioning", "Hypertrophy"). */
  dayGoalFocus?: string | null;
  /** Body emphasis: upper, lower, or full. */
  dayBodyEmphasis?: "upper" | "lower" | "full" | null;
  /** Specific body-part focuses for this day (e.g. glutes, shoulders). Only relevant to dayBodyEmphasis. */
  daySpecificBodyFocuses?: string[] | null;
  /** Human-readable title: e.g. "Sports Conditioning - Lower Body (Glute Focus)". */
  displayTitle?: string | null;
};

export type PlannedDay = {
  id: string;
  date: string;
  /** Display title: prefer dayLevelFocus.displayTitle, else from getWorkoutDescriptor, else intentLabel. */
  title?: string | null;
  intentLabel: string | null;
  status: "planned" | "completed" | "skipped";
  generatedWorkoutId: string | null;
  /** Gym workout vs user-designated sport day (no generated workout). */
  sessionKind?: import("./sportDesignatedDay").PlannedDaySessionKind;
  /** When sessionKind is sport: which sport the user will perform that day. */
  sportSlug?: string | null;
  /** Per-day preferences (for edit & regenerate). */
  preferences?: import("../../lib/types").DailyWorkoutPreferences | null;
  /** Structured day-level focus for editing and naming. */
  dayLevelFocus?: DayLevelFocus | null;
};

/** Snapshot of schedule inputs for replanning from recommendation screen. */
export type ScheduleSnapshot = {
  weekStartDate: string;
  primaryGoalSlug: string | null;
  secondaryGoalSlug?: string | null;
  tertiaryGoalSlug?: string | null;
  sportSlug?: string | null;
  sportQualitySlugs?: string[];
  sportSubFocusSlugs?: string[];
  gymDaysPerWeek: number;
  sportDaysAllocation?: SportDaysAllocation;
  gymTrainingDays?: number[];
  sportTrainingDaysBySlug?: Record<string, number[]>;
  rankedSportSlugs?: string[];
  sportFocusPct?: [number, number];
  sportVsGoalPct?: number;
  sportSubFocusSlugsBySport?: Record<string, string[]>;
  /** Manual primary-focus label → sub-goal names (same shape as planWeek `goalSubFocusByGoal`). */
  goalSubFocusByGoal?: Record<string, string[]>;
  goalSubFocusPctByGoal?: Record<string, Record<string, number>>;
  preferredTrainingDays?: number[];
  defaultSessionDuration: number;
  energyBaseline: EnergyLevel;
  recentLoad?: string;
  injuries?: string[];
  emphasis?: import("../../lib/types").BodyEmphasisKey | null;
  gymProfile?: GymProfile;
  workoutTier?: import("../../lib/types").WorkoutTierPreference;
  includeCreativeVariations?: boolean;
  goalDistributionStyle?: import("../../lib/types").GoalDistributionStyle | null;
  weeklyBodyEmphasisStyle?: import("../../lib/types").WeeklyBodyEmphasisStyle | null;
  specificBodyPartBehavior?: import("../../lib/types").SpecificBodyPartBehavior | null;
  specificBodyPartEmphasis?: import("../../lib/types").SpecificBodyFocusKey[] | null;
  adaptiveScheduleLabels?: AdaptiveScheduleLabels | null;
  gymDayFocusPresetIds?: string[];
  gymDayBodyFocuses?: {
    targetBody: import("../../lib/types").TargetBody;
    targetModifier: string[];
    specificBodyFocus?: import("../../lib/types").SpecificBodyFocusKey[];
  }[];
};

export type PlanWeekResult = {
  weeklyPlanInstanceId: string;
  weekStartDate: string;
  days: PlannedDay[];
  today: PlannedDay | null;
  todayWorkout: GeneratedWorkout | null;
  sportSlug?: string | null;
  goalSlugs?: string[];
  /** Sub-focus slugs for primary sport (for regenerate). */
  sportSubFocusSlugs?: string[];
  /** Ordered sport slugs (1 or 2) for regenerate. */
  rankedSportSlugs?: string[];
  /** When 2 sports: [1st %, 2nd %] for regenerate. */
  sportFocusPct?: [number, number];
  /** Sport(s) vs additional goals % (0–100) for regenerate. */
  sportVsGoalPct?: number;
  /** Sub-focus per sport for regenerate. */
  sportSubFocusSlugsBySport?: Record<string, string[]>;
  /** When present, workouts are in-memory only (guest mode); key = date (YYYY-MM-DD). */
  guestWorkouts?: Record<string, GeneratedWorkout>;
  /** Weekly emphasis used to build this plan. */
  emphasis?: import("../../lib/types").BodyEmphasisKey | null;
  /** Schedule inputs for replanning (e.g. adjust focus from recommendation). */
  scheduleSnapshot?: ScheduleSnapshot;
};

export type RegenerateDayInput = {
  /** When absent, regenerated workout is returned in memory only (guest mode); pass intentLabel. */
  userId?: string | null;
  weeklyPlanInstanceId: string;
  date: string; // ISO
  /** Same profile as `planWeek`; required for equipment-aware pools (omit → weak / empty generation). */
  gymProfile?: GymProfile;
  energyOverride?: EnergyLevel;
  sportSlug?: string | null;
  goalSlugs?: string[];
  /** Sub-focus slugs for primary sport (for exercise-tag biasing). */
  sportSubFocusSlugs?: string[];
  /** Ordered sport slugs (1 or 2) for sport vs goal merge. */
  rankedSportSlugs?: string[];
  /** When 2 sports: [1st %, 2nd %]. */
  sportFocusPct?: [number, number];
  /** Sport(s) vs additional goals % (0–100). */
  sportVsGoalPct?: number;
  /** Sub-focus slugs per sport. */
  sportSubFocusSlugsBySport?: Record<string, string[]>;
  /** Required for guest mode: current day intent label so we can rebuild without DB. */
  intentLabel?: string | null;
  /** Match % for 1st / 2nd / 3rd goal. */
  goalWeightsPct?: number[];
  /** Recent load so regeneration avoids exercises that add strain (e.g. "Long Run", "Heavy Lower"). */
  recentLoad?: string;
  /** Injury/constraint labels (normalized or display) so generation excludes contraindicated exercises. */
  injuries?: string[];
  /** Per–primary-focus sub-goals (same shape as `planWeek` / `buildWorkoutForSlot`). */
  subFocusByGoal?: Record<string, string[]>;
  subFocusPctByGoal?: Record<string, Record<string, number>>;
  /** Plan-level tier when dailyPreferences does not override workoutTier. */
  workoutTier?: import("../../lib/types").WorkoutTierPreference;
  /** Plan-level creative variations when dailyPreferences does not override. */
  includeCreativeVariations?: boolean;
  /** Override preferences for this single workout (goal, body region, energy, style). */
  dailyPreferences?: import("../../lib/types").DailyWorkoutPreferences | null;
  /** Manual preferences for sub-focus when resolving dayFocusPresetId. */
  manualPreferences?: ManualPreferences | null;
  /** Penalize re-picking these exercise ids (same-day regenerate variety). */
  avoidRepeatingExerciseIds?: string[];
  /** Completed / saved sessions from app state (Phase 11 training_history). */
  historySources?: import("../../lib/buildAppTrainingHistory").AppHistorySources;
};

export type RegenerateDayResult = {
  day: PlannedDay;
  workout: GeneratedWorkout | null;
};

const GOAL_WEIGHTS: number[] = [0.55, 0.3, 0.15];
const DEMAND_KEYS: IntentKey[] = [
  "strength",
  "power",
  "aerobic",
  "mobility",
  "prehab",
  "recovery",
];

function startOfWeekMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = (day + 6) % 7; // days since Monday
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - diff);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toIsoDate(d: Date): string {
  return getLocalDateString(d);
}

function humanizeSportSlug(slug: string): string {
  return slug
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function intentKeyFromLabel(label: string | null): IntentKey {
  if (!label) return "strength";
  const lower = label.toLowerCase();
  if (lower.includes("mobility") || lower.includes("joint")) return "mobility";
  if (lower.includes("recovery") || lower.includes("reset") || lower.includes("prehab")) {
    return "recovery";
  }
  if (lower.includes("endurance") || lower.includes("zone 2") || lower.includes("engine")) {
    return "aerobic";
  }
  if (lower.includes("power")) return "power";
  if (lower.includes("strength")) return "strength";
  return "strength";
}

type DailyPrefs = import("../../lib/types").DailyWorkoutPreferences;

function intentKeyFromDailyPreferences(prefs: DailyPrefs | null | undefined): IntentKey {
  if (!prefs?.goalBias) return "strength";
  switch (prefs.goalBias) {
    case "power": return "power";
    case "endurance": return "aerobic";
    case "mobility": return "mobility";
    case "recovery": return "recovery";
    case "hypertrophy": return "strength";
    default: return "strength";
  }
}

function bodyRegionBiasFromDailyPreferences(
  prefs: DailyPrefs | null | undefined
): { targetBody: "Upper" | "Lower" | "Full"; targetModifier: string[] } | undefined {
  if (!prefs?.bodyRegionBias) return undefined;
  let targetBody: "Upper" | "Lower" | "Full";
  let targetModifier: string[] = [];
  switch (prefs.bodyRegionBias) {
    case "upper":
      targetBody = "Upper";
      break;
    case "lower":
      targetBody = "Lower";
      break;
    case "full":
      targetBody = "Full";
      break;
    case "pull":
      targetBody = "Upper";
      targetModifier = ["Pull"];
      break;
    case "push":
      targetBody = "Upper";
      targetModifier = ["Push"];
      break;
    case "core":
      targetBody = "Full";
      break;
    default:
      return undefined;
  }
  const bodyKey = targetBody.toLowerCase() as "upper" | "lower" | "full";
  const specific = prefs.specificBodyFocus ?? [];
  for (const k of specific) {
    if (!isSpecificFocusRelevantForBody(k, bodyKey)) continue;
    const mods = SPECIFIC_FOCUS_TO_MODIFIER[k];
    if (mods?.length && !targetModifier.some((m) => mods.includes(m))) {
      targetModifier = [...targetModifier, ...mods];
    }
  }
  return { targetBody, targetModifier };
}


/**
 * Derive partial DailyWorkoutPreferences from a PlannedDay so that when the user
 * regenerates with only one change (e.g. energy), we can merge and keep the rest.
 *
 * NOTE: When falling back from label inference (no stored day.preferences), we do NOT
 * include `goalBias` in the output. `goalBias` is a user-explicit per-day override;
 * the plan-level goal is carried via `goalSlugs` (passed directly to regenerateDay) and
 * the DB's `intent_label` (used by regenerateDay when goalBias is absent). Injecting a
 * derived `goalBias: "strength"` here would silently override non-strength goals (e.g.
 * "physique" / body recomp) whenever the user makes any other override change such as
 * switching fitness level.
 */
export function deriveDailyPreferencesFromDay(
  day: PlannedDay
): import("../../lib/types").DailyWorkoutPreferences {
  if (day.preferences) {
    return { ...day.preferences };
  }
  const bodyEmphasis = day.dayLevelFocus?.dayBodyEmphasis;
  const bodyRegionBias = bodyEmphasis === "upper" || bodyEmphasis === "lower" || bodyEmphasis === "full"
    ? bodyEmphasis
    : undefined;
  const specificBodyFocus = day.dayLevelFocus?.daySpecificBodyFocuses as import("../../lib/types").SpecificBodyFocusKey[] | undefined;
  return {
    ...(bodyRegionBias && { bodyRegionBias }),
    ...(specificBodyFocus?.length && { specificBodyFocus }),
  };
}

/** Superset of weekly IntentKey: day regeneration can carry richer intent labels. */
type SessionIntentKey = IntentKey | "recovery_mobility" | "joint_health";

function sessionIntentForKey(
  key: SessionIntentKey,
  date: string,
  durationMinutes: number,
  energy: EnergyLevel
): SessionIntent {
  switch (key) {
    case "power":
      return {
        id: `session_${date}_power`,
        label: "Power & Explosiveness",
        focus: ["Power & Explosiveness"],
        durationMinutes,
        energyLevel: energy,
        notes: "Emphasizes fast, explosive efforts with full recovery between sets.",
      };
    case "aerobic":
      return {
        id: `session_${date}_aerobic`,
        label: "Endurance / Conditioning",
        focus: ["Improve Endurance"],
        durationMinutes,
        energyLevel: energy,
        notes: "Builds your aerobic engine with sustainable conditioning.",
      };
    case "mobility":
    case "prehab":
    case "recovery":
    case "recovery_mobility":
      return {
        id: `session_${date}_recovery_mobility`,
        label: "Recovery & Mobility",
        focus: ["Recovery & Mobility"],
        durationMinutes,
        energyLevel: energy,
        notes: "Stretching, mobility, and low-fatigue recovery work.",
      };
    case "joint_health":
      return {
        id: `session_${date}_joint_health`,
        label: "Joint Health Strength",
        focus: ["Strength Training for Joint Health"],
        durationMinutes,
        energyLevel: energy,
        notes: "PT-inspired controlled strength for joint resilience and stability.",
      };
    case "strength":
    default:
      return {
        id: `session_${date}_strength`,
        label: "Strength Foundation",
        focus: ["Build Strength"],
        durationMinutes,
        energyLevel: energy,
        notes: "Foundation strength session to support your primary goals.",
      };
  }
}

/**
 * When regenerating a gym day built as sport-only prep (no ranked goals), preserve athletic-prep
 * focus instead of defaulting to max-strength session intent.
 */
function maybeApplySportOnlyGymSupportIntent(
  intent: SessionIntent,
  opts: {
    goalSlugs?: string[];
    sportSlug?: string | null;
    rankedSportSlugs?: string[];
    dailyPreferences?: DailyPrefs | null;
    priorIntentLabel?: string | null;
  }
): void {
  if (opts.dailyPreferences?.goalBias) return;
  if ((opts.goalSlugs?.length ?? 0) > 0) return;
  const slug = opts.sportSlug ?? opts.rankedSportSlugs?.[0];
  if (!slug) return;
  const prior = (opts.priorIntentLabel ?? "").toLowerCase();
  if (!prior.includes("sport preparation") && !prior.includes("gym support")) {
    return;
  }
  const sportLabel = humanizeSportSlug(slug);
  intent.label = `${sportLabel} — Gym support`;
  intent.focus = ["Sport preparation"];
  intent.notes = `Balanced gym work to support ${sportLabel}.`;
}

/** Explicit sport intent when the plan’s primary/ranked sport has a defined contract (e.g. alpine). */
function planContextSessionIntentContract(opts: {
  sportSlug?: string | null;
  rankedSportSlugs?: string[];
}): ReturnType<typeof sessionIntentContractForSportSlug> {
  const raw = opts.sportSlug ?? opts.rankedSportSlugs?.[0];
  if (raw == null || raw === "") return undefined;
  return sessionIntentContractForSportSlug(getCanonicalSportSlug(raw));
}

/** Triathlon disciplines: one day each for run / swim / bike. */
const TRIATHLON_DISCIPLINES = ["running", "swimming", "biking"] as const;
type TriathlonDiscipline = (typeof TRIATHLON_DISCIPLINES)[number];

/** Session intent for a sport-specific training day (complements gym days). Label is shown as-is (no "sport-specific" suffix). */
function sessionIntentForSport(
  sportSlug: string,
  sportLabel: string,
  date: string,
  durationMinutes: number,
  energy: EnergyLevel
): SessionIntent {
  const canonical = getCanonicalSportSlug(sportSlug);
  // Cycling (road + mountain): bias toward lower-body + core so selection yields cycling-support exercises (leg strength, core, zone 2).
  const isCycling = canonical === "cycling";
  // Hiking / backpacking: lower-body, single-leg, ankle stability, load carriage.
  const isHikingBackpacking = canonical === "hiking_backpacking";
  // Backcountry skiing / splitboarding: lower-body, uphill endurance, leg strength, core.
  const isBackcountrySkiing = canonical === "backcountry_skiing";
  // Alpine (downhill) skiing: lower-body, eccentric control, knee/ankle stability.
  const isAlpineSkiing = canonical === "alpine_skiing";
  // Snowboarding: lower-body, balance, core, lateral stability.
  const isSnowboarding = canonical === "snowboarding";
  // Rock climbing (bouldering, sport/lead, trad): upper-body pull, grip, core.
  const isRockClimbing = canonical === "rock_climbing";
  // Ice climbing: upper-body pull, grip, shoulder, core.
  const isIceClimbing = sportSlug === "ice_climbing";
  // Road running: bias toward lower-body + core and leg resilience so selection yields running-support exercises.
  const isRoadRunning = canonical === "road_running";
  // Swimming: bias toward upper-body pull and core so selection yields swim-support exercises (pull, scapular, core).
  const isSwimming = canonical === "swimming_open_water";
  // Trail running: bias toward lower-body, single-leg, eccentric and ankle so selection yields trail-support exercises.
  const isTrailRunning = canonical === "trail_running";
  // Triathlon: full-body support (swim pull + bike/run legs + core); no strict body bias so tag ranking drives mix.
  const isTriathlon = canonical === "triathlon";
  // XC (Nordic) skiing: full-body (double pole + leg drive + core); no strict body bias so tag ranking drives mix.
  const isXcSkiing = canonical === "xc_skiing";
  // Hyrox (+ legacy OCR/CrossFit slots): full-body mixed work.
  const isHyrox = canonical === "hyrox";
  // Rowing / erg: full-body (leg drive + pull + core); tag ranking drives mix.
  const isRowingErg = canonical === "rowing_erg";
  // Rucking: lower-body, load carriage, core (same as hiking/backpacking).
  const isRucking = canonical === "rucking";
  // Bodybuilding / powerbuilding: full-body gym priorities.
  const isBodybuilding = canonical === "bodybuilding";
  const isPowerbuilding = canonical === "powerbuilding";
  // Sprinting / track (includes legacy vertical-jump-as-sport): lower-body power and plyometrics.
  const isTrackSprinting = canonical === "track_sprinting";
  // Volleyball (indoor + beach): lower-body (jump, land), core, shoulder.
  const isVolleyball = canonical === "volleyball";
  // Racquet & court (tennis, pickleball, badminton, squash): full-body (lateral, rotation, shoulder).
  const isCourtRacquet = canonical === "court_racquet";
  // Grappling (BJJ, Judo, MMA, Wrestling): full-body (grip, hip, pull, work capacity).
  const isGrappling = canonical === "grappling";
  return {
    id: `session_${date}_sport_${sportSlug}`,
    label: sportLabel,
    focus: isTrackSprinting
      ? ["Power & Explosiveness", "Sport Conditioning"]
      : ["Improve Endurance", "Sport Conditioning"],
    durationMinutes,
    energyLevel: energy,
    notes: `Sport-specific conditioning to support ${sportLabel}.`,
    ...(isCycling && { bodyRegionBias: { targetBody: "Lower", targetModifier: [] } }),
    ...(isHikingBackpacking && { bodyRegionBias: { targetBody: "Lower", targetModifier: [] } }),
    ...(isBackcountrySkiing && { bodyRegionBias: { targetBody: "Lower", targetModifier: [] } }),
    ...(isAlpineSkiing && { bodyRegionBias: { targetBody: "Lower", targetModifier: [] } }),
    ...(isSnowboarding && { bodyRegionBias: { targetBody: "Lower", targetModifier: [] } }),
    ...(isRockClimbing && { bodyRegionBias: { targetBody: "Upper", targetModifier: ["Pull"] } }),
    ...(isIceClimbing && { bodyRegionBias: { targetBody: "Upper", targetModifier: ["Pull"] } }),
    ...(isRoadRunning && { bodyRegionBias: { targetBody: "Lower", targetModifier: [] } }),
    ...(isSwimming && { bodyRegionBias: { targetBody: "Upper", targetModifier: ["Pull"] } }),
    ...(isTrailRunning && { bodyRegionBias: { targetBody: "Lower", targetModifier: [] } }),
    ...(isTriathlon && { bodyRegionBias: { targetBody: "Full", targetModifier: [] } }),
    ...(isXcSkiing && { bodyRegionBias: { targetBody: "Full", targetModifier: [] } }),
    ...(isHyrox && { bodyRegionBias: { targetBody: "Full", targetModifier: [] } }),
    ...(isRowingErg && { bodyRegionBias: { targetBody: "Full", targetModifier: [] } }),
    ...(isRucking && { bodyRegionBias: { targetBody: "Lower", targetModifier: [] } }),
    ...((isBodybuilding || isPowerbuilding) && { bodyRegionBias: { targetBody: "Full", targetModifier: [] } }),
    ...(isTrackSprinting && { bodyRegionBias: { targetBody: "Lower", targetModifier: [] } }),
    ...(isVolleyball && { bodyRegionBias: { targetBody: "Lower", targetModifier: [] } }),
    ...(isCourtRacquet && { bodyRegionBias: { targetBody: "Full", targetModifier: [] } }),
    ...(isGrappling && { bodyRegionBias: { targetBody: "Full", targetModifier: [] } }),
  };
}

/** Maps specific body-part key to generator targetModifier for Upper/Lower/Full. */
const SPECIFIC_FOCUS_TO_MODIFIER: Record<string, string[]> = {
  glutes: ["Posterior"],
  quad: ["Quad"],
  posterior: ["Posterior"],
  shoulders: ["Push"],
  back: ["Pull"],
  push: ["Push"],
  pull: ["Pull"],
  core: [],
};

type DaySlot =
  | {
      type: "gym";
      key: IntentKey;
      dayBias?: DayBias;
      /** When goalDistributionStyle is dedicate_days: which goal slug this day is for. */
      dayGoalSlug?: string | null;
      /** Specific body-part focuses for this day (for title and modifier layering). */
      specificBodyFocus?: string[] | null;
    }
  | { type: "sport"; sportSlug: string; discipline?: TriathlonDiscipline };

function compactSportDaysAllocation(
  allocation: SportDaysAllocation | undefined
): SportDaysAllocation | undefined {
  if (!allocation) return undefined;
  const entries = Object.entries(allocation).filter(([, count]) => (count ?? 0) > 0);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function compactSportTrainingDaysBySlug(
  daysBySlug: Record<string, number[]> | undefined
): Record<string, number[]> | undefined {
  if (!daysBySlug) return undefined;
  const entries = Object.entries(daysBySlug)
    .map(([slug, days]) => [
      slug,
      Array.from(new Set(days.filter((day) => day >= 0 && day < 7))).sort((a, b) => a - b),
    ] as const)
    .filter(([, days]) => days.length > 0);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

/**
 * Spread N training days across the week, alternating on/off where possible.
 * Returns day indices (0=Mon .. 6=Sun): even days first (0,2,4,6), then odd (1,3,5).
 * E.g. 3 days -> [0, 2, 4] (Mon, Wed, Fri); 4 days -> [0, 2, 4, 1].
 */
function spreadTrainingDays(totalDays: number): number[] {
  if (totalDays <= 0) return [];
  const evenFirstThenOdd = [0, 2, 4, 6, 1, 3, 5];
  return evenFirstThenOdd.slice(0, Math.min(totalDays, 7));
}

/**

 * Assign goal slugs to gym slots when goalDistributionStyle is dedicate_days.
 * Returns array of length gymDaysPerWeek: each element is the goal slug for that day.
 */
function assignGoalToSlots(
  gymDaysPerWeek: number,
  goalSlugs: string[],
  goalWeightsPct: [number, number, number]
): (string | null)[] {
  if (goalSlugs.length === 0) return Array(gymDaysPerWeek).fill(null);
  if (goalSlugs.length === 1) return Array(gymDaysPerWeek).fill(goalSlugs[0]);
  const total = goalWeightsPct[0] + goalWeightsPct[1] + (goalWeightsPct[2] ?? 0);
  const p1 = total > 0 ? goalWeightsPct[0] / total : 1 / goalSlugs.length;
  const p2 = total > 0 ? (goalWeightsPct[1] ?? 0) / total : 0;
  const n1 = Math.round(gymDaysPerWeek * p1);
  const n2 = Math.min(gymDaysPerWeek - n1, Math.round(gymDaysPerWeek * p2));
  const n3 = gymDaysPerWeek - n1 - n2;
  const out: (string | null)[] = [];
  let i = 0;
  for (let j = 0; j < n1 && i < gymDaysPerWeek; j++, i++) out.push(goalSlugs[0]);
  for (let j = 0; j < n2 && i < gymDaysPerWeek; j++, i++) out.push(goalSlugs[1] ?? null);
  for (let j = 0; j < n3 && i < gymDaysPerWeek; j++, i++) out.push(goalSlugs[2] ?? null);
  return out;
}

/** Build ordered list of day slots: gym days first, then per-sport days (ranked order), capped at 7. */
function buildDaySlots(
  gymDaysPerWeek: number,
  sportDaysAllocation: SportDaysAllocation | undefined,
  rankedSportSlugs: string[],
  intentOrder: IntentKey[],
  emphasis?: import("../../lib/types").BodyEmphasisKey | null,
  opts?: {
    goalDistributionStyle?: import("../../lib/types").GoalDistributionStyle | null;
    goalSlugs?: string[];
    goalWeightsPct?: [number, number, number];
    specificBodyPartEmphasis?: import("../../lib/types").SpecificBodyFocusKey[] | null;
    specificBodyPartBehavior?: import("../../lib/types").SpecificBodyPartBehavior | null;
  }
): DaySlot[] {
  const slots: DaySlot[] = [];
  const dayBiases = getWeeklyStructureTemplate(gymDaysPerWeek, emphasis ?? null);
  const orderedIntents = intentOrder.length ? intentOrder : (["strength"] as IntentKey[]);
  const goalSlugs = opts?.goalSlugs ?? [];
  const goalWeightsPct = opts?.goalWeightsPct ?? [50, 30, 20];
  const dedicateDays = opts?.goalDistributionStyle === "dedicate_days" && goalSlugs.length > 0;
  const goalPerSlot = dedicateDays
    ? assignGoalToSlots(gymDaysPerWeek, goalSlugs, goalWeightsPct)
    : null;
  const specificEmphasis = opts?.specificBodyPartEmphasis?.length
    ? opts.specificBodyPartEmphasis
    : null;
  const autoApplySpecific = opts?.specificBodyPartBehavior !== "manual" && specificEmphasis;

  for (let i = 0; i < gymDaysPerWeek && slots.length < 7; i++) {
    const bias = dayBiases?.[i];
    const targetBody = bias?.targetBody ?? (i % 2 === 0 ? "Upper" : "Lower");
    const bodyKey = targetBody.toLowerCase() as "upper" | "lower" | "full";
    let targetModifier = [...(bias?.targetModifier ?? [])];
    let specificBodyFocus: string[] | null = null;
    if (autoApplySpecific && specificEmphasis) {
      specificBodyFocus = specificEmphasis.filter((k) =>
        isSpecificFocusRelevantForBody(k, bodyKey)
      );
      for (const k of specificBodyFocus) {
        const mods = SPECIFIC_FOCUS_TO_MODIFIER[k];
        if (mods?.length && !targetModifier.some((m) => mods.includes(m))) {
          targetModifier = [...targetModifier, ...mods];
        }
      }
    }
    const dayBias: DayBias | undefined = bias
      ? { ...bias, targetModifier }
      : { targetBody, targetModifier, intentKey: orderedIntents[i % orderedIntents.length] };
    slots.push({
      type: "gym",
      key: dayBias.intentKey,
      dayBias,
      ...(goalPerSlot && goalPerSlot[i] != null && { dayGoalSlug: goalPerSlot[i] }),
      ...(specificBodyFocus?.length && { specificBodyFocus }),
    });
  }
  for (const slug of rankedSportSlugs) {
    const count = sportDaysAllocation?.[slug] ?? 0;
    if (slug === "triathlon") {
      for (const d of TRIATHLON_DISCIPLINES) {
        if (slots.length >= 7) break;
        slots.push({ type: "sport", sportSlug: slug, discipline: d });
      }
      continue;
    }
    for (let i = 0; i < count && slots.length < 7; i++) {
      slots.push({ type: "sport", sportSlug: slug });
    }
  }
  return slots;
}

function sportSlotLabel(slot: { type: "sport"; sportSlug: string; discipline?: TriathlonDiscipline }): string {
  if (slot.sportSlug === "triathlon" && slot.discipline) {
    return slot.discipline.charAt(0).toUpperCase() + slot.discipline.slice(1);
  }
  return humanizeSportSlug(slot.sportSlug);
}

async function computeCombinedDemand(
  goalSlugs: (string | null | undefined)[],
  userGoalWeightsPct?: [number, number, number],
  opts?: { sportContextPresent?: boolean }
): Promise<{
  combined: DemandVector;
  goalsSnapshot: Record<string, { slug: string; weight: number }>;
}> {
  const supabase = getSupabase();
  if (!supabase) {
    const combined = opts?.sportContextPresent
      ? sportSupportDefaultDemand()
      : defaultNonSportEmptyGoalsDemand();
    return { combined, goalsSnapshot: {} };
  }

  const slugs = goalSlugs.filter((s): s is string => Boolean(s));
  if (!slugs.length) {
    const combined = opts?.sportContextPresent
      ? sportSupportDefaultDemand()
      : defaultNonSportEmptyGoalsDemand();
    return { combined, goalsSnapshot: {} };
  }

  const { data: goals, error: goalsError } = await supabase
    .from("goals")
    .select("id, slug")
    .in("slug", slugs);
  if (goalsError) throw new Error(goalsError.message);

  const goalIdBySlug = new Map<string, string>();
  for (const g of goals ?? []) {
    goalIdBySlug.set(g.slug as string, g.id as string);
  }

  const goalIds = Array.from(goalIdBySlug.values());
  if (!goalIds.length) {
    const combined = opts?.sportContextPresent
      ? sportSupportDefaultDemand()
      : defaultNonSportEmptyGoalsDemand();
    return { combined, goalsSnapshot: {} };
  }

  const { data: demandRows, error: demandError } = await supabase
    .from("goal_demand_profile")
    .select(
      "goal_id, strength, power, aerobic, anaerobic, mobility, prehab, recovery"
    )
    .in("goal_id", goalIds);
  if (demandError) throw new Error(demandError.message);

  const combined = zeroDemand();
  const goalsSnapshot: Record<string, { slug: string; weight: number }> = {};

  const weights: number[] = userGoalWeightsPct
    ? userGoalWeightsPct.map((p) => p / 100)
    : GOAL_WEIGHTS;

  (["primary", "secondary", "tertiary"] as const).forEach((slot, idx) => {
    const slug = goalSlugs[idx];
    if (!slug) return;
    const goalId = goalIdBySlug.get(slug);
    if (!goalId) return;
    const row = (demandRows ?? []).find((r) => r.goal_id === goalId);
    if (!row) return;
    const weight = weights[idx] ?? GOAL_WEIGHTS[idx] ?? 0;
    DEMAND_KEYS.forEach((k) => {
      const val = Number((row as any)[k] ?? 0);
      combined[k] += val * weight;
    });
    goalsSnapshot[slot] = { slug, weight };
  });

  return { combined, goalsSnapshot };
}

function chooseIntentOrder(demand: DemandVector): IntentKey[] {
  const sorted = DEMAND_KEYS.slice().sort((a, b) => demand[b] - demand[a]);
  const nonZero = sorted.filter((k) => demand[k] > 0.01);
  if (nonZero.length === 0) {
    return ["strength", "aerobic", "mobility"];
  }
  return nonZero;
}

/** Prefer a work intent for the single gym slot in one-day sport prep (never recovery-only). */
export function forceIntentKeyForOneDaySport(
  primaryGoalSlug: string | null,
  rankedSportSlugs?: (string | null)[]
): IntentKey {
  const hasSport = (rankedSportSlugs ?? []).some((s) => Boolean(s));
  if (primaryGoalSlug === "endurance" || primaryGoalSlug === "conditioning") {
    return "aerobic";
  }
  if (primaryGoalSlug === "mobility") return "mobility";
  if (primaryGoalSlug === "recovery" || primaryGoalSlug === "resilience") {
    return "prehab";
  }
  if (primaryGoalSlug === "power" || primaryGoalSlug === "athletic_performance") {
    return "power";
  }
  if (hasSport) return "strength";
  return "strength";
}

export async function planWeek(input: PlanWeekInput): Promise<PlanWeekResult> {
  if (!isDbConfigured()) {
    throw new Error("Supabase is not configured; Sports Prep mode requires a backend.");
  }
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error("Supabase client is not available.");
  }

  const today = new Date();
  const baseDate = input.weekStartDate ? new Date(input.weekStartDate) : today;
  const weekStart = startOfWeekMonday(baseDate);
  const weekStartIso = toIsoDate(weekStart);

  const userGoalWeights: [number, number, number] | undefined =
    input.goalMatchPrimaryPct != null
      ? [
          input.goalMatchPrimaryPct ?? 50,
          input.goalMatchSecondaryPct ?? 30,
          input.goalMatchTertiaryPct ?? 20,
        ]
      : undefined;
  const sportContextPresent =
    (input.sportSlug != null && input.sportSlug !== "") ||
    (input.rankedSportSlugs?.length ?? 0) > 0 ||
    (input.sportDaysAllocation != null &&
      Object.keys(input.sportDaysAllocation).some(
        (k) => (input.sportDaysAllocation![k] ?? 0) > 0
      ));
  const { combined: demand, goalsSnapshot } = await computeCombinedDemand(
    [
      input.primaryGoalSlug,
      input.secondaryGoalSlug,
      input.tertiaryGoalSlug,
    ],
    userGoalWeights,
    { sportContextPresent }
  );
  let intentOrder = chooseIntentOrder(demand);
  if (input.forceIntentKey) {
    const forced = input.forceIntentKey;
    intentOrder = [forced, ...intentOrder.filter((k) => k !== forced)];
  } else if (input.gymDaysPerWeek === 1) {
    intentOrder = intentOrder.filter((k) => k !== "recovery");
    if (intentOrder.length === 0) {
      intentOrder = ["strength"];
    }
  }
  const goalSlugs = [
    input.primaryGoalSlug ?? null,
    input.secondaryGoalSlug ?? null,
    input.tertiaryGoalSlug ?? null,
  ].filter((s): s is string => Boolean(s));
  const goalWeightsPct = [
    input.goalMatchPrimaryPct ?? 50,
    input.goalMatchSecondaryPct ?? 30,
    input.goalMatchTertiaryPct ?? 20,
  ];
  const rankedSportSlugs = input.rankedSportSlugs ?? (input.sportSlug ? [input.sportSlug] : []);
  const compactedSportDaysAllocation = compactSportDaysAllocation(input.sportDaysAllocation);
  const compactedSportTrainingDaysBySlug = compactSportTrainingDaysBySlug(
    input.sportTrainingDaysBySlug
  );
  const daySlots = buildDaySlots(
    input.gymDaysPerWeek || 0,
    compactedSportDaysAllocation,
    rankedSportSlugs,
    intentOrder,
    input.emphasis,
    {
      goalDistributionStyle: input.goalDistributionStyle ?? undefined,
      goalSlugs: goalSlugs.length > 0 ? goalSlugs : undefined,
      goalWeightsPct: [goalWeightsPct[0], goalWeightsPct[1], goalWeightsPct[2]],
      specificBodyPartEmphasis: input.specificBodyPartEmphasis ?? undefined,
      specificBodyPartBehavior: input.specificBodyPartBehavior ?? undefined,
    }
  );
  const setupBodyOverride = bodyRegionBiasFromDailyPreferences(input.dailyPreferences);
  if (setupBodyOverride) {
    const firstGymIdx = daySlots.findIndex((slot) => slot.type === "gym");
    if (firstGymIdx >= 0) {
      const slot = daySlots[firstGymIdx] as Extract<DaySlot, { type: "gym" }>;
      daySlots[firstGymIdx] = {
        ...slot,
        dayBias: {
          intentKey: slot.dayBias?.intentKey ?? slot.key,
          targetBody: setupBodyOverride.targetBody,
          targetModifier: setupBodyOverride.targetModifier,
        },
      };
    }
  }
  if (input.gymDayBodyFocuses?.length) {
    let gymIdx = 0;
    for (let i = 0; i < daySlots.length; i += 1) {
      const slot = daySlots[i];
      if (slot.type !== "gym") continue;
      const body = input.gymDayBodyFocuses[gymIdx];
      gymIdx += 1;
      if (!body) continue;
      daySlots[i] = {
        ...slot,
        dayBias: {
          intentKey: slot.dayBias?.intentKey ?? slot.key,
          targetBody: body.targetBody,
          targetModifier: [...body.targetModifier],
        },
        specificBodyFocus: body.specificBodyFocus?.length
          ? [...body.specificBodyFocus]
          : null,
      };
    }
  }

  const weekDates: string[] = [];
  for (let i = 0; i < 7; i += 1) {
    weekDates.push(toIsoDate(addDays(weekStart, i)));
  }

  const hasSportSlots = daySlots.some((s) => s.type === "sport");
  const orderedIntentsForSlots =
    intentOrder.length > 0 ? intentOrder : (["strength"] as IntentKey[]);

  // Prefer user-selected days: use all preferred days so no selected day is dropped.
  const preferredUnique =
    input.preferredTrainingDays && input.preferredTrainingDays.length > 0
      ? Array.from(
          new Set(
            input.preferredTrainingDays.filter((idx) => idx >= 0 && idx < 7)
          )
        ).sort((a, b) => a - b)
      : null;

  const explicitWeekSchedule = hasExplicitWeekDaySchedule(
    input.gymTrainingDays,
    compactedSportTrainingDaysBySlug
  );

  const trainingIndices: number[] = [];
  let totalTrainingDays: number;

  if (explicitWeekSchedule && (input.gymTrainingDays?.length ?? 0) > 0) {
    trainingIndices.push(
      ...unionTrainingDayIndices(
        input.gymTrainingDays ?? [],
        compactedSportTrainingDaysBySlug ?? {}
      )
    );
    totalTrainingDays = trainingIndices.length;
  } else if (preferredUnique && preferredUnique.length > 0) {
    trainingIndices.push(...preferredUnique);
    totalTrainingDays = trainingIndices.length;
    // Legacy path: pad with gym slots when day count exceeds built slots (no per-weekday gym/sport map).
    const needSlots = totalTrainingDays - daySlots.length;
    if (needSlots > 0) {
      for (let i = 0; i < needSlots; i++) {
        const idx = daySlots.length + i;
        const key = orderedIntentsForSlots[idx % orderedIntentsForSlots.length];
        const targetBody = idx % 2 === 0 ? "Upper" : "Lower";
        daySlots.push({
          type: "gym",
          key,
          dayBias: {
            targetBody,
            targetModifier: [],
            intentKey: key,
          },
        });
      }
    }
  } else {
    totalTrainingDays = Math.max(
      1,
      daySlots.length > 0
        ? Math.min(7, daySlots.length)
        : Math.min(7, input.gymDaysPerWeek || 3)
    );
    if (hasSportSlots) {
      for (let i = 0; i < totalTrainingDays && i < 7; i += 1) {
        trainingIndices.push(i);
      }
    } else {
      trainingIndices.push(...spreadTrainingDays(totalTrainingDays));
    }
  }

  const trainingIndexSet = new Set(trainingIndices);
  const todayIso = toIsoDate(today);
  const orderedIntents =
    intentOrder.length > 0 ? intentOrder : (["strength"] as IntentKey[]);

  const pickExplicitSlot =
    explicitWeekSchedule && (input.gymTrainingDays?.length ?? 0) > 0
      ? createExplicitWeekSlotPicker(
          input.gymTrainingDays ?? [],
          compactedSportTrainingDaysBySlug ?? {},
          rankedSportSlugs,
          daySlots
        )
      : null;
  const rawSlotsForLegacy =
    daySlots.length > 0 ? daySlots.slice(0, totalTrainingDays) : [];
  const legacySlotsToUse =
    pickExplicitSlot == null && rawSlotsForLegacy.length > 0
      ? hasSportSlots
        ? interleaveGymAndSportSlots(rawSlotsForLegacy)
        : rawSlotsForLegacy
      : null;

  const resolveSlotForTrainingDay = (
    dayIdx: number,
    legacySlotIdx: number
  ): DaySlot => {
    const explicit = pickExplicitSlot?.(dayIdx);
    if (explicit) return explicit;
    if (legacySlotsToUse && legacySlotsToUse[legacySlotIdx]) {
      return legacySlotsToUse[legacySlotIdx];
    }
    return {
      type: "gym",
      key: orderedIntents[legacySlotIdx % orderedIntents.length],
    };
  };

  const injurySlugsForPool = (input.injuries ?? []).map((i) => i.toLowerCase().replace(/\s/g, "_"));
  let sharedExercisePool: Exercise[] | undefined;
  try {
    const generator = await loadGeneratorModule();
    sharedExercisePool = await generator.getExercisePoolForManualGeneration(injurySlugsForPool);
  } catch {
    sharedExercisePool = undefined;
  }

  let gymSlotIdx = 0;
  const weekManualPrefs = manualPreferencesForSportWeekFocus(
    input.manualPreferences ?? {
      primaryFocus: [],
      targetBody: null,
      targetModifier: [],
      durationMinutes: input.defaultSessionDuration,
      energyLevel: input.energyBaseline,
      injuries: input.injuries ?? [],
      upcoming: [],
      subFocusByGoal: input.goalSubFocusByGoal ?? {},
      subFocusPctByGoal: input.goalSubFocusPctByGoal ?? {},
      workoutStyle: [],
      goalMatchPrimaryPct: input.goalMatchPrimaryPct ?? 50,
      goalMatchSecondaryPct: input.goalMatchSecondaryPct ?? 30,
      goalMatchTertiaryPct: input.goalMatchTertiaryPct ?? 20,
      workoutTier: input.workoutTier ?? "intermediate",
      includeCreativeVariations: input.includeCreativeVariations === true,
    },
    adaptiveSetupFromPlanContext({
      goalSlugs,
      rankedSportSlugs,
      sportVsGoalPct: input.sportVsGoalPct,
      sportFocusPct: input.sportFocusPct,
      sportSubFocusSlugsBySport: input.sportSubFocusSlugsBySport,
    })
  );

  const buildWorkoutForSlot = async (
    slot: Extract<DaySlot, { type: "gym" }>,
    date: string
  ): Promise<{
    intent: SessionIntent;
    workout: GeneratedWorkout;
    title: string;
    dayLevelFocus?: DayLevelFocus | null;
    dayPreferences?: import("../../lib/types").DailyWorkoutPreferences | null;
  }> => {
    const slotIdx = gymSlotIdx;
    gymSlotIdx += 1;
    const presetId = input.gymDayFocusPresetIds?.[slotIdx];
    const adaptiveForFocus = adaptiveSetupFromPlanContext({
      goalSlugs,
      rankedSportSlugs,
      sportVsGoalPct: input.sportVsGoalPct,
      sportFocusPct: input.sportFocusPct,
      sportSubFocusSlugsBySport: input.sportSubFocusSlugsBySport,
    });
    const dayFocusResolved = presetId
      ? resolveDayFocusPreset(presetId, weekManualPrefs, adaptiveForFocus)
      : null;
    const dayFocusParams = dayFocusResolved
      ? resolvedDayFocusToWorkoutParams(
          dayFocusResolved,
          goalSlugs,
          [goalWeightsPct[0], goalWeightsPct[1], goalWeightsPct[2] ?? 20]
        )
      : null;

    const dayGoalSlug = slot.dayGoalSlug ?? goalSlugs[0] ?? null;
    const focusLabel = dayGoalSlug
      ? (GOAL_SLUG_TO_PRIMARY_FOCUS[dayGoalSlug] ?? GOAL_SLUG_TO_LABEL[dayGoalSlug] ?? dayGoalSlug)
      : null;
    const singleGoalWeights =
      dayGoalSlug && goalSlugs.includes(dayGoalSlug)
        ? goalSlugs.map((g) => (g === dayGoalSlug ? 100 : 0))
        : goalWeightsPct;
    const intent = sessionIntentForKey(
      slot.key,
      date,
      input.defaultSessionDuration,
      input.energyBaseline
    );
    const primarySportSlug = input.sportSlug ?? rankedSportSlugs[0] ?? null;
    if (dayFocusParams?.focusLabels.length) {
      intent.focus = dayFocusParams.focusLabels;
    } else if (focusLabel) {
      intent.focus = [focusLabel];
    } else if (goalSlugs.length > 0) {
      intent.focus = goalSlugs.map(
        (g) => GOAL_SLUG_TO_PRIMARY_FOCUS[g] ?? GOAL_SLUG_TO_LABEL[g] ?? g
      );
    } else if (primarySportSlug) {
      const sportLabel = humanizeSportSlug(primarySportSlug);
      intent.label = `${sportLabel} — Gym support`;
      intent.focus = ["Sport preparation"];
      intent.notes = `Balanced gym work to support ${sportLabel}.`;
    }
    const bodyRegionBias =
      slot.dayBias
        ? { targetBody: slot.dayBias.targetBody, targetModifier: slot.dayBias.targetModifier }
        : undefined;
    const effectiveGoalSlugs = dayFocusParams?.exclusive
      ? dayFocusParams.orderedGoalSlugs
      : dayFocusParams?.orderedGoalSlugs.length
        ? dayFocusParams.orderedGoalSlugs
        : dayGoalSlug
          ? [dayGoalSlug]
          : goalSlugs;
    const effectiveGoalWeights = dayFocusParams?.goalWeightsPct ?? (
      dayGoalSlug ? singleGoalWeights : goalWeightsPct
    );
    const focusedSportSlugs = dayFocusParams?.exclusive
      ? (dayFocusParams.sportSlugsOverride ?? [])
      : dayFocusParams?.sportSlugsOverride?.length
        ? dayFocusParams.sportSlugsOverride
        : undefined;
    const effectiveRankedSportSlugs = focusedSportSlugs ?? input.rankedSportSlugs;
    const effectiveSportSlug =
      focusedSportSlugs != null
        ? focusedSportSlugs[0] ?? null
        : input.sportSlug ?? null;
    const effectiveSportSubFocusBySport = focusedSportSlugs
      ? dayFocusParams?.sportSubFocusBySportOverride
      : input.sportSubFocusSlugsBySport;
    const effectiveSportSubFocusSlugs =
      focusedSportSlugs?.length === 1
        ? effectiveSportSubFocusBySport?.[focusedSportSlugs[0]]
        : input.sportSubFocusSlugs;
    const daySubFocusOverride = input.gymDaySubFocusByGoalOverrides?.[slotIdx];
    const effectiveSubFocusByGoal = (() => {
      const merged = mergeDaySubFocusOverride(
        input.goalSubFocusByGoal ?? {},
        daySubFocusOverride ?? undefined
      );
      if (!dayFocusParams?.exclusive) return merged;
      if (!dayFocusParams.focusLabels.length) return {};
      return Object.fromEntries(
        Object.entries(merged).filter(([label]) => dayFocusParams.focusLabels.includes(label))
      );
    })();
    const workout = await buildWorkoutForSessionIntent(
      intent,
      input.gymProfile,
      date,
      {
        sportSlug: effectiveSportSlug,
        goalSlugs: effectiveGoalSlugs,
        goalWeightsPct: effectiveGoalWeights,
        sportSubFocusSlugs: effectiveSportSubFocusSlugs,
        rankedSportSlugs: effectiveRankedSportSlugs,
        sportFocusPct: effectiveRankedSportSlugs?.length === 2 ? input.sportFocusPct : undefined,
        sportVsGoalPct: input.sportVsGoalPct,
        sportSubFocusSlugsBySport: effectiveSportSubFocusBySport,
        recentLoad: input.recentLoad,
        injuries: input.injuries,
        bodyRegionBias,
        workoutTier: input.workoutTier ?? "intermediate",
        includeCreativeVariations: input.includeCreativeVariations === true,
        subFocusByGoal: effectiveSubFocusByGoal,
        ...(input.goalSubFocusPctByGoal &&
        Object.keys(input.goalSubFocusPctByGoal).length > 0
          ? { subFocusPctByGoal: input.goalSubFocusPctByGoal }
          : {}),
        exercisePool: sharedExercisePool,
        ...(dayFocusParams?.exclusive ? { exclusiveDayFocus: true } : {}),
        ...(dayFocusParams?.sportWeightOverride != null
          ? { sportWeightOverride: dayFocusParams.sportWeightOverride }
          : {}),
        ...(dayFocusParams?.goalWeightsOverride?.length
          ? { goalWeightsOverride: dayFocusParams.goalWeightsOverride }
          : {}),
        ...(input.sessionFocusDistribution
          ? { sessionFocusDistribution: input.sessionFocusDistribution }
          : input.manualPreferences?.sessionFocusDistribution
            ? { sessionFocusDistribution: input.manualPreferences.sessionFocusDistribution }
            : {}),
      }
    );
    const bodyKey = (slot.dayBias?.targetBody ?? "Full").toLowerCase() as "upper" | "lower" | "full";
    const goalLabels =
      dayFocusParams?.focusLabels.length
        ? dayFocusParams.focusLabels
        : dayGoalSlug
          ? [GOAL_SLUG_TO_LABEL[dayGoalSlug] ?? GOAL_SLUG_TO_PRIMARY_FOCUS[dayGoalSlug] ?? dayGoalSlug]
          : goalSlugs.length > 0
            ? goalSlugs.map((g) => GOAL_SLUG_TO_LABEL[g] ?? GOAL_SLUG_TO_PRIMARY_FOCUS[g] ?? g)
            : (intent.focus?.length ? intent.focus : ["Workout"]);
    const displayTitle = formatDayTitle(
      goalLabels,
      bodyKey,
      slot.specificBodyFocus ?? null
    );
    const dayLevelFocus: DayLevelFocus = {
      dayGoalFocus: dayFocusParams?.focusLabels[0] ?? dayGoalSlug ?? intent.focus?.[0] ?? null,
      dayBodyEmphasis: bodyKey,
      daySpecificBodyFocuses: slot.specificBodyFocus ?? null,
      displayTitle,
    };
    const dayPreferences: import("../../lib/types").DailyWorkoutPreferences | null = presetId
      ? { dayFocusPresetId: presetId }
      : null;
    return {
      intent: { ...intent, label: displayTitle },
      workout,
      title: displayTitle,
      dayLevelFocus,
      dayPreferences,
    };
  };

  type DbSessionRowDraft = {
    intent_label: string | null;
    generated_workout_id: string | null;
    fatigue_score: number;
    goal_contribution: Record<string, number>;
    workout?: GeneratedWorkout;
  };

  const planSessionsForTrainingDay = async (
    dayIdx: number,
    date: string,
    legacySlotIdx: number,
    idPrefix: string
  ): Promise<{
    plannedDays: PlannedDay[];
    workoutsByKey: Record<string, GeneratedWorkout>;
    dbSessionRows: DbSessionRowDraft[];
    nextLegacySlotIdx: number;
  }> => {
    const slot = resolveSlotForTrainingDay(dayIdx, legacySlotIdx);
    const nextLegacySlotIdx = legacySlotIdx + 1;
    const plannedDays: PlannedDay[] = [];
    const workoutsByKey: Record<string, GeneratedWorkout> = {};
    const dbSessionRows: DbSessionRowDraft[] = [];
    const goalContribution: Record<string, number> = {};
    if (goalsSnapshot.primary) goalContribution.primary = goalsSnapshot.primary.weight;
    if (goalsSnapshot.secondary) goalContribution.secondary = goalsSnapshot.secondary.weight;
    if (goalsSnapshot.tertiary) goalContribution.tertiary = goalsSnapshot.tertiary.weight;

    const pushSportDesignation = (
      sportSlug: string,
      discipline?: TriathlonDiscipline
    ) => {
      const sportDay = buildSportDesignatedPlannedDay({
        id: `${idPrefix}-${date}-sport-${sportSlug}${discipline ? `-${discipline}` : ""}`,
        date,
        sportSlug,
        discipline,
      });
      plannedDays.push(sportDay);
      dbSessionRows.push({
        intent_label: sportDay.intentLabel,
        generated_workout_id: null,
        fatigue_score: 1,
        goal_contribution: {},
      });
    };

    if (slot.type === "sport") {
      pushSportDesignation(slot.sportSlug, slot.discipline);
      return { plannedDays, workoutsByKey, dbSessionRows, nextLegacySlotIdx };
    }

    const { intent, workout, title, dayLevelFocus, dayPreferences } = await buildWorkoutForSlot(slot, date);
    const gymId = `${idPrefix}-${date}-gym`;
    plannedDays.push({
      id: gymId,
      date,
      sessionKind: "gym",
      title,
      intentLabel: intent.label,
      status: "planned",
      generatedWorkoutId: null,
      dayLevelFocus: dayLevelFocus ?? null,
      ...(dayPreferences ? { preferences: dayPreferences } : {}),
    });
    workoutsByKey[gymId] = workout;
    workoutsByKey[date] = workout;

    const key = slot.key;
    const fatigueScore =
      key === "mobility" || key === "recovery" || key === "prehab" ? 1 : 3;
    dbSessionRows.push({
      intent_label: intent.label,
      generated_workout_id: null,
      fatigue_score: fatigueScore,
      goal_contribution: goalContribution,
      workout,
    });

    if (explicitWeekSchedule) {
      for (const slug of getSportsOnCalendarDay(
        dayIdx,
        rankedSportSlugs,
        compactedSportTrainingDaysBySlug
      )) {
        pushSportDesignation(slug);
      }
    }

    return { plannedDays, workoutsByKey, dbSessionRows, nextLegacySlotIdx };
  };

  // Guest mode: no DB writes; workouts kept in memory
  if (!input.userId) {
    const guestWorkouts: Record<string, GeneratedWorkout> = {};
    const plannedDays: PlannedDay[] = [];
    let legacySlotIdx = 0;
    for (let dayIdx = 0; dayIdx < 7; dayIdx += 1) {
      const date = weekDates[dayIdx];
      const isTrainingDay = trainingIndexSet.has(dayIdx);
      if (!isTrainingDay) {
        plannedDays.push({
          id: `guest-${date}`,
          date,
          intentLabel: null,
          status: "planned",
          generatedWorkoutId: null,
        });
        continue;
      }
      const sessionPlan = await planSessionsForTrainingDay(
        dayIdx,
        date,
        legacySlotIdx,
        "guest"
      );
      legacySlotIdx = sessionPlan.nextLegacySlotIdx;
      Object.assign(guestWorkouts, sessionPlan.workoutsByKey);
      plannedDays.push(...sessionPlan.plannedDays);
    }
    const todayDay =
      plannedDays.find(
        (d) => d.date === todayIso && !isSportDesignatedPlannedDay(d)
      ) ??
      plannedDays.find((d) => d.date === todayIso) ??
      null;
    const scheduleSnapshot: ScheduleSnapshot = {
      weekStartDate: weekStartIso,
      primaryGoalSlug: input.primaryGoalSlug,
      secondaryGoalSlug: input.secondaryGoalSlug ?? null,
      tertiaryGoalSlug: input.tertiaryGoalSlug ?? null,
      sportSlug: input.sportSlug ?? null,
      sportQualitySlugs: input.sportQualitySlugs,
      sportSubFocusSlugs: input.sportSubFocusSlugs,
      gymDaysPerWeek: input.gymDaysPerWeek || 0,
      sportDaysAllocation: compactedSportDaysAllocation,
      rankedSportSlugs: input.rankedSportSlugs,
      sportFocusPct: input.sportFocusPct,
      sportVsGoalPct: input.sportVsGoalPct,
      sportSubFocusSlugsBySport: input.sportSubFocusSlugsBySport,
      preferredTrainingDays: trainingIndices.length > 0 ? trainingIndices : input.preferredTrainingDays,
      gymTrainingDays:
        input.gymTrainingDays?.length ? [...input.gymTrainingDays].sort((a, b) => a - b) : undefined,
      sportTrainingDaysBySlug: compactedSportTrainingDaysBySlug
        ? { ...compactedSportTrainingDaysBySlug }
        : undefined,
      defaultSessionDuration: input.defaultSessionDuration,
      energyBaseline: input.energyBaseline,
      recentLoad: input.recentLoad,
      injuries: input.injuries,
      emphasis: input.emphasis ?? null,
      gymProfile: input.gymProfile,
      workoutTier: input.workoutTier ?? "intermediate",
      includeCreativeVariations: input.includeCreativeVariations === true,
      goalDistributionStyle: input.goalDistributionStyle ?? undefined,
      weeklyBodyEmphasisStyle: input.weeklyBodyEmphasisStyle ?? undefined,
      specificBodyPartBehavior: input.specificBodyPartBehavior ?? undefined,
      specificBodyPartEmphasis: input.specificBodyPartEmphasis ?? undefined,
      goalSubFocusByGoal:
        input.goalSubFocusByGoal && Object.keys(input.goalSubFocusByGoal).length > 0
          ? { ...input.goalSubFocusByGoal }
          : undefined,
      goalSubFocusPctByGoal:
        input.goalSubFocusPctByGoal && Object.keys(input.goalSubFocusPctByGoal).length > 0
          ? { ...input.goalSubFocusPctByGoal }
          : undefined,
      adaptiveScheduleLabels: input.adaptiveScheduleLabels ?? undefined,
      gymDayFocusPresetIds: input.gymDayFocusPresetIds?.length
        ? [...input.gymDayFocusPresetIds]
        : undefined,
      gymDayBodyFocuses: input.gymDayBodyFocuses?.length
        ? input.gymDayBodyFocuses.map((b) => ({
            targetBody: b.targetBody,
            targetModifier: [...b.targetModifier],
            ...(b.specificBodyFocus?.length
              ? { specificBodyFocus: [...b.specificBodyFocus] }
              : {}),
          }))
        : undefined,
    };
    return {
      weeklyPlanInstanceId: `guest-${weekStartIso}-${Date.now()}`,
      weekStartDate: weekStartIso,
      days: plannedDays,
      today: todayDay,
      todayWorkout: todayDay
        ? guestWorkouts[todayDay.id] ?? guestWorkouts[todayIso] ?? null
        : null,
      sportSlug: input.sportSlug ?? null,
      goalSlugs,
      sportSubFocusSlugs: input.sportSubFocusSlugs,
      rankedSportSlugs: input.rankedSportSlugs,
      sportFocusPct: input.sportFocusPct,
      sportVsGoalPct: input.sportVsGoalPct,
      sportSubFocusSlugsBySport: input.sportSubFocusSlugsBySport,
      guestWorkouts,
      emphasis: input.emphasis ?? null,
      scheduleSnapshot,
    };
  }

  const rowsForDays: {
    weekly_plan_instance_id: string;
    date: string;
    intent_id: string | null;
    intent_label: string | null;
    goal_contribution: Record<string, number>;
    fatigue_score: number | null;
    status: "planned";
    generated_workout_id: string | null;
  }[] = [];

  const createdWorkoutIds: string[] = [];
  let createdTrainingPlanId: string | null = null;
  let createdWeeklyPlanInstanceId: string | null = null;
  let instanceId: string | null = null;
  let dayRows: {
    id: string;
    date: string;
    intent_label: string | null;
    status: "planned" | "completed" | "skipped";
    generated_workout_id: string | null;
  }[] = [];

  const logCleanupFailure = (step: string, error: unknown): void => {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[sportPrepPlanner.planWeek] cleanup failed (${step}): ${message}`);
  };

  const cleanupPartialPlanPersistence = async (): Promise<void> => {
    if (createdWeeklyPlanInstanceId) {
      try {
        const { error } = await supabase
          .from("weekly_plan_days")
          .delete()
          .eq("weekly_plan_instance_id", createdWeeklyPlanInstanceId);
        if (error) {
          logCleanupFailure("delete weekly_plan_days", new Error(error.message));
        }
      } catch (error) {
        logCleanupFailure("delete weekly_plan_days", error);
      }
    }

    for (const workoutId of createdWorkoutIds) {
      try {
        await deleteWorkout(input.userId!, workoutId);
      } catch (error) {
        logCleanupFailure(`delete workout ${workoutId}`, error);
      }
    }

    if (createdWeeklyPlanInstanceId) {
      try {
        const { error } = await supabase
          .from("weekly_plan_instances")
          .delete()
          .eq("id", createdWeeklyPlanInstanceId);
        if (error) {
          logCleanupFailure("delete weekly_plan_instance", new Error(error.message));
        }
      } catch (error) {
        logCleanupFailure("delete weekly_plan_instance", error);
      }
    }

    if (createdTrainingPlanId) {
      try {
        const { error } = await supabase
          .from("user_training_plans")
          .delete()
          .eq("id", createdTrainingPlanId)
          .eq("user_id", input.userId);
        if (error) {
          logCleanupFailure("delete user_training_plan", new Error(error.message));
        }
      } catch (error) {
        logCleanupFailure("delete user_training_plan", error);
      }
    }
  };

  const plannedDays: PlannedDay[] = [];
  let legacySlotIdx = 0;
  /** In-memory workouts keyed by workout id and ISO date — avoids re-fetching after save. */
  const inMemoryWorkouts: Record<string, GeneratedWorkout> = {};

  try {
    // Create / persist user_training_plans row
    const { data: goals, error: goalsError } =
      goalSlugs.length > 0
        ? await supabase.from("goals").select("id, slug").in("slug", goalSlugs)
        : { data: [] as { id: string; slug: string }[], error: null };

    if (goalsError) throw new Error(goalsError.message);

    const goalIdBySlug = new Map<string, string>();
    for (const g of goals ?? []) {
      goalIdBySlug.set(g.slug as string, g.id as string);
    }

    const primaryGoalId =
      input.primaryGoalSlug != null && input.primaryGoalSlug !== ""
        ? goalIdBySlug.get(input.primaryGoalSlug) ?? null
        : null;

    const { data: trainingPlanRow, error: planError } = await supabase
      .from("user_training_plans")
      .insert({
        user_id: input.userId,
        primary_goal_id: primaryGoalId,
        secondary_goal_id: input.secondaryGoalSlug
          ? goalIdBySlug.get(input.secondaryGoalSlug)
          : null,
        tertiary_goal_id: input.tertiaryGoalSlug
          ? goalIdBySlug.get(input.tertiaryGoalSlug)
          : null,
        plan_horizon: "week",
        sport_sessions: input.sportSessions ?? [],
        gym_days_per_week: totalTrainingDays,
        preferred_training_days: input.preferredTrainingDays ?? null,
        default_session_duration: input.defaultSessionDuration,
        constraints: {
          injuries: input.injuries ?? [],
          energyBaseline: input.energyBaseline,
          equipment_profile_id: input.gymProfile?.id ?? null,
        },
      })
      .select("id")
      .single();
    if (planError) throw new Error(planError.message);
    const planId = trainingPlanRow.id as string;
    createdTrainingPlanId = planId;

    const rationale =
      "Week plan generated from your ranked goals and availability. " +
      "High-demand qualities get more training days; at least one lighter day is preserved.";

    const { data: instanceRow, error: instanceError } = await supabase
      .from("weekly_plan_instances")
      .insert({
        user_id: input.userId,
        week_start_date: weekStartIso,
        plan_id: planId,
        goals_snapshot: goalsSnapshot,
        rationale,
      })
      .select("id")
      .single();
    if (instanceError) throw new Error(instanceError.message);
    instanceId = instanceRow.id as string;
    createdWeeklyPlanInstanceId = instanceId;

    for (let dayIdx = 0; dayIdx < 7; dayIdx += 1) {
      const date = weekDates[dayIdx];
      const isTrainingDay = trainingIndexSet.has(dayIdx);

      if (!isTrainingDay) {
        rowsForDays.push({
          weekly_plan_instance_id: instanceId,
          date,
          intent_id: null,
          intent_label: null,
          goal_contribution: {},
          fatigue_score: null,
          status: "planned",
          generated_workout_id: null,
        });
        plannedDays.push({
          id: "", // will be back-filled after insert if needed
          date,
          intentLabel: null,
          status: "planned",
          generatedWorkoutId: null,
        });
        continue;
      }

      const sessionPlan = await planSessionsForTrainingDay(
        dayIdx,
        date,
        legacySlotIdx,
        "plan"
      );
      legacySlotIdx = sessionPlan.nextLegacySlotIdx;

      for (const dbRow of sessionPlan.dbSessionRows) {
        let workoutId: string | null = null;
        if (dbRow.workout) {
          workoutId = await saveGeneratedWorkout(input.userId, dbRow.workout);
          createdWorkoutIds.push(workoutId);
          inMemoryWorkouts[workoutId] = dbRow.workout;
          inMemoryWorkouts[date] = dbRow.workout;
        }

        rowsForDays.push({
          weekly_plan_instance_id: instanceId,
          date,
          intent_id: null,
          intent_label: dbRow.intent_label,
          goal_contribution: dbRow.goal_contribution,
          fatigue_score: dbRow.fatigue_score,
          status: "planned",
          generated_workout_id: workoutId,
        });
      }

      plannedDays.push(...sessionPlan.plannedDays);
    }

    const { data: insertedDayRows, error: daysError } = await supabase
      .from("weekly_plan_days")
      .insert(rowsForDays)
      .select("id, date, intent_label, status, generated_workout_id");
    if (daysError) throw new Error(daysError.message);
    dayRows = (insertedDayRows ?? []) as typeof dayRows;
  } catch (error) {
    await cleanupPartialPlanPersistence();
    throw error;
  }

  const finalDays: PlannedDay[] = [];
  for (const date of weekDates) {
    const rowsForDate = dayRows.filter((row) => row.date === date);
    if (rowsForDate.length === 0) {
      finalDays.push({
        id: "",
        date,
        title: null,
        intentLabel: null,
        status: "planned",
        generatedWorkoutId: null,
      });
      continue;
    }
    for (const row of rowsForDate) {
      const day = plannedDayFromDbRow(row);
      const generatedWorkoutId = row.generated_workout_id;
      if (generatedWorkoutId && inMemoryWorkouts[generatedWorkoutId]) {
        inMemoryWorkouts[day.id] = inMemoryWorkouts[generatedWorkoutId];
        inMemoryWorkouts[date] = inMemoryWorkouts[generatedWorkoutId];
      }
      finalDays.push(day);
    }
  }

  const todayDay =
    finalDays.find(
      (d) => d.date === todayIso && !isSportDesignatedPlannedDay(d)
    ) ??
    finalDays.find((d) => d.date === todayIso) ??
    null;
  const todayWorkout =
    todayDay?.generatedWorkoutId != null
      ? inMemoryWorkouts[todayDay.generatedWorkoutId] ??
        inMemoryWorkouts[todayDay.date] ??
        null
      : null;

  const scheduleSnapshot: ScheduleSnapshot = {
    weekStartDate: weekStartIso,
    primaryGoalSlug: input.primaryGoalSlug,
    secondaryGoalSlug: input.secondaryGoalSlug ?? null,
    tertiaryGoalSlug: input.tertiaryGoalSlug ?? null,
    sportSlug: input.sportSlug ?? null,
    sportQualitySlugs: input.sportQualitySlugs,
    sportSubFocusSlugs: input.sportSubFocusSlugs,
    gymDaysPerWeek: input.gymDaysPerWeek || 0,
    sportDaysAllocation: compactedSportDaysAllocation,
    rankedSportSlugs: input.rankedSportSlugs,
    sportFocusPct: input.sportFocusPct,
    sportVsGoalPct: input.sportVsGoalPct,
    sportSubFocusSlugsBySport: input.sportSubFocusSlugsBySport,
    preferredTrainingDays: trainingIndices.length > 0 ? trainingIndices : input.preferredTrainingDays,
    gymTrainingDays:
      input.gymTrainingDays?.length ? [...input.gymTrainingDays].sort((a, b) => a - b) : undefined,
    sportTrainingDaysBySlug: compactedSportTrainingDaysBySlug
      ? { ...compactedSportTrainingDaysBySlug }
      : undefined,
    defaultSessionDuration: input.defaultSessionDuration,
    energyBaseline: input.energyBaseline,
    recentLoad: input.recentLoad,
    injuries: input.injuries,
    emphasis: input.emphasis ?? null,
    gymProfile: input.gymProfile,
    workoutTier: input.workoutTier ?? "intermediate",
    includeCreativeVariations: input.includeCreativeVariations === true,
    goalDistributionStyle: input.goalDistributionStyle ?? undefined,
    weeklyBodyEmphasisStyle: input.weeklyBodyEmphasisStyle ?? undefined,
    specificBodyPartBehavior: input.specificBodyPartBehavior ?? undefined,
    specificBodyPartEmphasis: input.specificBodyPartEmphasis ?? undefined,
    goalSubFocusByGoal:
      input.goalSubFocusByGoal && Object.keys(input.goalSubFocusByGoal).length > 0
        ? { ...input.goalSubFocusByGoal }
        : undefined,
    goalSubFocusPctByGoal:
      input.goalSubFocusPctByGoal && Object.keys(input.goalSubFocusPctByGoal).length > 0
        ? { ...input.goalSubFocusPctByGoal }
        : undefined,
    adaptiveScheduleLabels: input.adaptiveScheduleLabels ?? undefined,
    gymDayFocusPresetIds: input.gymDayFocusPresetIds?.length
      ? [...input.gymDayFocusPresetIds]
      : undefined,
    gymDayBodyFocuses: input.gymDayBodyFocuses?.length
      ? input.gymDayBodyFocuses.map((b) => ({
          targetBody: b.targetBody,
          targetModifier: [...b.targetModifier],
          ...(b.specificBodyFocus?.length
            ? { specificBodyFocus: [...b.specificBodyFocus] }
            : {}),
        }))
      : undefined,
  };

  if (!instanceId) {
    throw new Error("Weekly plan instance id was not created.");
  }

  return {
    weeklyPlanInstanceId: instanceId,
    weekStartDate: weekStartIso,
    days: finalDays,
    today: todayDay,
    todayWorkout,
    sportSlug: input.sportSlug ?? null,
    goalSlugs,
    sportSubFocusSlugs: input.sportSubFocusSlugs,
    rankedSportSlugs: input.rankedSportSlugs,
    sportFocusPct: input.sportFocusPct,
    sportVsGoalPct: input.sportVsGoalPct,
    sportSubFocusSlugsBySport: input.sportSubFocusSlugsBySport,
    guestWorkouts: Object.keys(inMemoryWorkouts).length > 0 ? inMemoryWorkouts : undefined,
    emphasis: input.emphasis ?? null,
    scheduleSnapshot,
  };
}

const GOAL_BIAS_TO_LABEL: Record<string, string> = {
  strength: "Strength",
  hypertrophy: "Hypertrophy",
  endurance: "Endurance",
  mobility: "Mobility",
  recovery: "Recovery & Mobility",
  recovery_mobility: "Recovery & Mobility",
  joint_health: "Joint Health Strength",
  power: "Power",
};

function dayFocusOverridesForRegenerate(input: RegenerateDayInput): {
  goalSlugs: string[];
  goalWeightsPct: [number, number, number];
  sportWeightOverride?: number;
  goalWeightsOverride?: number[];
  focusLabels?: string[];
  sportSlugsOverride?: string[];
  sportSubFocusBySportOverride?: Record<string, string[]>;
  exclusive?: boolean;
} {
  const presetId = input.dailyPreferences?.dayFocusPresetId;
  const rankedGoalSlugs = (input.goalSlugs ?? []).filter(Boolean);
  const fallbackWeights: [number, number, number] = [
    input.goalWeightsPct?.[0] ?? 50,
    input.goalWeightsPct?.[1] ?? 30,
    input.goalWeightsPct?.[2] ?? 20,
  ];
  if (!presetId) {
    return { goalSlugs: rankedGoalSlugs, goalWeightsPct: fallbackWeights };
  }
  const weekManualPrefs = manualPreferencesForSportWeekFocus(
    input.manualPreferences ?? {
      primaryFocus: [],
      targetBody: null,
      targetModifier: [],
      durationMinutes: null,
      energyLevel: null,
      injuries: input.injuries ?? [],
      upcoming: [],
      subFocusByGoal: input.subFocusByGoal ?? {},
      subFocusPctByGoal: input.subFocusPctByGoal ?? {},
      workoutStyle: [],
      goalMatchPrimaryPct: fallbackWeights[0],
      goalMatchSecondaryPct: fallbackWeights[1],
      goalMatchTertiaryPct: fallbackWeights[2],
      workoutTier: input.workoutTier ?? "intermediate",
      includeCreativeVariations: input.includeCreativeVariations === true,
    },
    adaptiveSetupFromPlanContext({
      goalSlugs: rankedGoalSlugs,
      rankedSportSlugs: input.rankedSportSlugs,
      sportVsGoalPct: input.sportVsGoalPct,
      sportFocusPct: input.sportFocusPct,
      sportSubFocusSlugsBySport: input.sportSubFocusSlugsBySport,
    })
  );
  const resolved = resolveDayFocusPreset(presetId, weekManualPrefs, adaptiveSetupFromPlanContext({
    goalSlugs: rankedGoalSlugs,
    rankedSportSlugs: input.rankedSportSlugs,
    sportVsGoalPct: input.sportVsGoalPct,
    sportFocusPct: input.sportFocusPct,
    sportSubFocusSlugsBySport: input.sportSubFocusSlugsBySport,
  }));
  const params = resolvedDayFocusToWorkoutParams(resolved, rankedGoalSlugs, fallbackWeights);
  return {
    goalSlugs: params.exclusive
      ? params.orderedGoalSlugs
      : params.orderedGoalSlugs.length
        ? params.orderedGoalSlugs
        : rankedGoalSlugs,
    goalWeightsPct: params.goalWeightsPct,
    sportWeightOverride: params.sportWeightOverride,
    goalWeightsOverride: params.goalWeightsOverride,
    focusLabels: params.focusLabels.length ? params.focusLabels : undefined,
    sportSlugsOverride: params.exclusive
      ? (params.sportSlugsOverride ?? [])
      : params.sportSlugsOverride,
    sportSubFocusBySportOverride: params.sportSubFocusBySportOverride,
    exclusive: params.exclusive,
  };
}

export async function regenerateDay(
  input: RegenerateDayInput
): Promise<RegenerateDayResult> {
  const resolvedWorkoutTier =
    input.dailyPreferences?.workoutTier ?? input.workoutTier ?? "intermediate";
  const resolvedIncludeCreative =
    (input.dailyPreferences?.includeCreativeVariations ?? input.includeCreativeVariations) === true;
  const dayFocusOverrides = dayFocusOverridesForRegenerate(input);
  const focusedSportSlugs = dayFocusOverrides.exclusive
    ? (dayFocusOverrides.sportSlugsOverride ?? [])
    : dayFocusOverrides.sportSlugsOverride?.length
      ? dayFocusOverrides.sportSlugsOverride
      : undefined;
  const regenerateRankedSportSlugs = focusedSportSlugs ?? input.rankedSportSlugs;
  const regenerateSportSlug =
    focusedSportSlugs != null
      ? focusedSportSlugs[0] ?? null
      : input.sportSlug ?? input.rankedSportSlugs?.[0] ?? null;
  const regenerateSportSubFocusBySport = focusedSportSlugs
    ? dayFocusOverrides.sportSubFocusBySportOverride
    : input.sportSubFocusSlugsBySport;
  const regenerateSportSubFocusSlugs =
    focusedSportSlugs?.length === 1
      ? regenerateSportSubFocusBySport?.[focusedSportSlugs[0]]
      : input.sportSubFocusSlugs;
  const regenerateSportFocusPct =
    regenerateRankedSportSlugs?.length === 2 ? input.sportFocusPct : undefined;

  if (isSportDesignatedPlannedDay({ intentLabel: input.intentLabel ?? null })) {
    throw new Error("Sport days cannot be regenerated as gym workouts.");
  }

  // Guest / unsigned-in: in-memory only (no Supabase). Must run before DB checks.
  if (!input.userId) {
    // Only use the goalBias-based intent key when the user explicitly set a goalBias override.
    // Otherwise fall back to the stored intent label so that e.g. mobility/endurance days
    // are not silently regenerated as strength sessions just because workoutTier was changed.
    const key = input.dailyPreferences?.goalBias
      ? intentKeyFromDailyPreferences(input.dailyPreferences)
      : intentKeyFromLabel(input.intentLabel ?? null);
    const energy: EnergyLevel =
      input.dailyPreferences?.energyLevel ?? input.energyOverride ?? "medium";
    const sessionIntent = sessionIntentForKey(key, input.date, 60, energy);
    const bodyRegionBias = bodyRegionBiasFromDailyPreferences(input.dailyPreferences);
    if (dayFocusOverrides.focusLabels?.length) {
      sessionIntent.focus = dayFocusOverrides.focusLabels;
    } else if (input.dailyPreferences?.goalBias) {
      const bias = input.dailyPreferences.goalBias;
      sessionIntent.focus = [
        GOAL_BIAS_TO_PRIMARY_FOCUS_LABEL[bias] ??
          GOAL_SLUG_TO_PRIMARY_FOCUS[bias] ??
          GOAL_BIAS_TO_LABEL[bias] ??
          sessionIntent.focus?.[0] ??
          "Build Strength",
      ];
    }
    maybeApplySportOnlyGymSupportIntent(sessionIntent, {
      goalSlugs: dayFocusOverrides.goalSlugs,
      sportSlug: regenerateSportSlug,
      rankedSportSlugs: regenerateRankedSportSlugs,
      dailyPreferences: input.dailyPreferences,
      priorIntentLabel: input.intentLabel ?? null,
    });
    const regContractGuest = planContextSessionIntentContract({
      sportSlug: regenerateSportSlug,
      rankedSportSlugs: regenerateRankedSportSlugs,
    });
    const workout = await buildWorkoutForSessionIntent(
      sessionIntent,
      input.gymProfile,
      `${input.date}_${Date.now()}`,
      {
        sportSlug: regenerateSportSlug,
        goalSlugs: dayFocusOverrides.goalSlugs,
        goalWeightsPct: dayFocusOverrides.goalWeightsPct,
        sportSubFocusSlugs: regenerateSportSubFocusSlugs,
        rankedSportSlugs: regenerateRankedSportSlugs,
        sportFocusPct: regenerateSportFocusPct,
        sportVsGoalPct: input.sportVsGoalPct,
        sportSubFocusSlugsBySport: regenerateSportSubFocusBySport,
        recentLoad: input.recentLoad,
        injuries: input.injuries,
        bodyRegionBias,
        workoutTier: resolvedWorkoutTier,
        includeCreativeVariations: resolvedIncludeCreative,
        ...(input.subFocusByGoal && Object.keys(input.subFocusByGoal).length > 0
          ? {
              subFocusByGoal: dayFocusOverrides.exclusive && dayFocusOverrides.focusLabels?.length
                ? Object.fromEntries(
                    Object.entries(input.subFocusByGoal).filter(([label]) =>
                      dayFocusOverrides.focusLabels!.includes(label)
                    )
                  )
                : dayFocusOverrides.exclusive
                  ? {}
                  : input.subFocusByGoal,
            }
          : {}),
        ...(input.subFocusPctByGoal && Object.keys(input.subFocusPctByGoal).length > 0
          ? { subFocusPctByGoal: input.subFocusPctByGoal }
          : {}),
        ...(regContractGuest ? { session_intent_contract: regContractGuest } : {}),
        ...(dayFocusOverrides.exclusive ? { exclusiveDayFocus: true } : {}),
        ...(dayFocusOverrides.sportWeightOverride != null
          ? { sportWeightOverride: dayFocusOverrides.sportWeightOverride }
          : {}),
        ...(dayFocusOverrides.goalWeightsOverride?.length
          ? { goalWeightsOverride: dayFocusOverrides.goalWeightsOverride }
          : {}),
        regenerationAvoidExerciseIds:
          input.avoidRepeatingExerciseIds?.length ? input.avoidRepeatingExerciseIds : undefined,
        historySources: {
          ...input.historySources,
          regenerationAvoidExerciseIds: input.avoidRepeatingExerciseIds,
        },
      }
    );
    const bodyKey = (bodyRegionBias?.targetBody ?? "Full").toLowerCase() as "upper" | "lower" | "full";
    const goalLabelsForTitle =
      dayFocusOverrides.focusLabels?.length
        ? dayFocusOverrides.focusLabels
        : input.dailyPreferences?.goalBias
        ? [GOAL_BIAS_TO_LABEL[input.dailyPreferences.goalBias] ?? sessionIntent.focus?.[0] ?? "Workout"]
        : (dayFocusOverrides.goalSlugs.length
            ? dayFocusOverrides.goalSlugs.map((g) => GOAL_SLUG_TO_LABEL[g] ?? GOAL_SLUG_TO_PRIMARY_FOCUS[g] ?? g)
            : (sessionIntent.focus?.length ? sessionIntent.focus : ["Workout"]));
    const displayTitle = formatDayTitle(
      goalLabelsForTitle,
      bodyKey,
      input.dailyPreferences?.specificBodyFocus ?? null
    );
    const dayLevelFocus: DayLevelFocus = {
      dayGoalFocus: input.dailyPreferences?.goalBias ?? sessionIntent.focus?.[0] ?? null,
      dayBodyEmphasis: bodyKey,
      daySpecificBodyFocuses: input.dailyPreferences?.specificBodyFocus ?? null,
      displayTitle,
    };
    const guestPrefs =
      input.dailyPreferences && Object.keys(input.dailyPreferences).length > 0
        ? input.dailyPreferences
        : undefined;
    const day: PlannedDay = {
      id: `guest-${input.date}`,
      date: input.date,
      title: displayTitle,
      intentLabel: displayTitle,
      status: "planned",
      generatedWorkoutId: null,
      dayLevelFocus,
      ...(guestPrefs ? { preferences: guestPrefs } : {}),
    };
    return { day, workout };
  }

  if (!isDbConfigured()) {
    throw new Error("Supabase is not configured; Sports Prep mode requires a backend.");
  }
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error("Supabase client is not available.");
  }

  const { data: dayRow, error: dayError } = await supabase
    .from("weekly_plan_days")
    .select("id, date, intent_label, status, generated_workout_id, weekly_plan_instance_id")
    .eq("weekly_plan_instance_id", input.weeklyPlanInstanceId)
    .eq("date", input.date)
    .maybeSingle();
  if (dayError) throw new Error(dayError.message);
  if (!dayRow) {
    throw new Error("Plan day not found for given instance and date.");
  }

  // Only use the goalBias-based intent key when the user explicitly set a goalBias override.
  // Otherwise fall back to the stored intent label so that e.g. mobility/endurance days
  // are not silently regenerated as strength sessions just because workoutTier was changed.
  const key = input.dailyPreferences?.goalBias
    ? intentKeyFromDailyPreferences(input.dailyPreferences)
    : intentKeyFromLabel((dayRow.intent_label as string | null) ?? null);
  const energy: EnergyLevel =
    input.dailyPreferences?.energyLevel ?? input.energyOverride ?? "medium";

  const sessionIntent = sessionIntentForKey(
    key,
    dayRow.date as string,
    60,
    energy
  );
  if (dayFocusOverrides.focusLabels?.length) {
    sessionIntent.focus = dayFocusOverrides.focusLabels;
  } else if (input.dailyPreferences?.goalBias) {
    const bias = input.dailyPreferences.goalBias;
    sessionIntent.focus = [
      GOAL_BIAS_TO_PRIMARY_FOCUS_LABEL[bias] ??
        GOAL_SLUG_TO_PRIMARY_FOCUS[bias] ??
        GOAL_BIAS_TO_LABEL[bias] ??
        sessionIntent.focus?.[0] ??
        "Build Strength",
    ];
  }
  maybeApplySportOnlyGymSupportIntent(sessionIntent, {
    goalSlugs: dayFocusOverrides.goalSlugs,
    sportSlug: regenerateSportSlug,
    rankedSportSlugs: regenerateRankedSportSlugs,
    dailyPreferences: input.dailyPreferences,
    priorIntentLabel: (dayRow.intent_label as string | null) ?? null,
  });
  const bodyRegionBias = bodyRegionBiasFromDailyPreferences(input.dailyPreferences);

  const regContractDb = planContextSessionIntentContract({
    sportSlug: regenerateSportSlug,
    rankedSportSlugs: regenerateRankedSportSlugs,
  });
  const workout = await buildWorkoutForSessionIntent(
    sessionIntent,
    input.gymProfile,
    composeRunGenerationSeed(dayRow.date as string),
    {
      sportSlug: regenerateSportSlug,
      goalSlugs: dayFocusOverrides.goalSlugs,
      goalWeightsPct: dayFocusOverrides.goalWeightsPct,
      sportSubFocusSlugs: regenerateSportSubFocusSlugs,
      rankedSportSlugs: regenerateRankedSportSlugs,
      sportFocusPct: regenerateSportFocusPct,
      sportVsGoalPct: input.sportVsGoalPct,
      sportSubFocusSlugsBySport: regenerateSportSubFocusBySport,
      recentLoad: input.recentLoad,
      injuries: input.injuries,
      bodyRegionBias,
      workoutTier: resolvedWorkoutTier,
      includeCreativeVariations: resolvedIncludeCreative,
      ...(input.subFocusByGoal && Object.keys(input.subFocusByGoal).length > 0
        ? {
            subFocusByGoal: dayFocusOverrides.exclusive && dayFocusOverrides.focusLabels?.length
              ? Object.fromEntries(
                  Object.entries(input.subFocusByGoal).filter(([label]) =>
                    dayFocusOverrides.focusLabels!.includes(label)
                  )
                )
              : dayFocusOverrides.exclusive
                ? {}
                : input.subFocusByGoal,
          }
        : {}),
      ...(input.subFocusPctByGoal && Object.keys(input.subFocusPctByGoal).length > 0
        ? { subFocusPctByGoal: input.subFocusPctByGoal }
        : {}),
      ...(regContractDb ? { session_intent_contract: regContractDb } : {}),
      ...(dayFocusOverrides.exclusive ? { exclusiveDayFocus: true } : {}),
      ...(dayFocusOverrides.sportWeightOverride != null
        ? { sportWeightOverride: dayFocusOverrides.sportWeightOverride }
        : {}),
      ...(dayFocusOverrides.goalWeightsOverride?.length
        ? { goalWeightsOverride: dayFocusOverrides.goalWeightsOverride }
        : {}),
      regenerationAvoidExerciseIds:
        input.avoidRepeatingExerciseIds?.length ? input.avoidRepeatingExerciseIds : undefined,
      historySources: {
        ...input.historySources,
        regenerationAvoidExerciseIds: input.avoidRepeatingExerciseIds,
      },
    }
  );
  const bodyKey = (bodyRegionBias?.targetBody ?? "Full").toLowerCase() as "upper" | "lower" | "full";
  const goalLabelsForTitle =
    dayFocusOverrides.focusLabels?.length
      ? dayFocusOverrides.focusLabels
      : input.dailyPreferences?.goalBias
      ? [GOAL_BIAS_TO_LABEL[input.dailyPreferences.goalBias] ?? sessionIntent.focus?.[0] ?? "Workout"]
      : (dayFocusOverrides.goalSlugs.length
          ? dayFocusOverrides.goalSlugs.map((g) => GOAL_SLUG_TO_LABEL[g] ?? GOAL_SLUG_TO_PRIMARY_FOCUS[g] ?? g)
          : (sessionIntent.focus?.length ? sessionIntent.focus : [(dayRow.intent_label as string) ?? "Workout"]));
  const title = formatDayTitle(
    goalLabelsForTitle,
    bodyKey,
    input.dailyPreferences?.specificBodyFocus ?? null
  );
  const workoutId = await saveGeneratedWorkout(input.userId, workout);

  const { data: updated, error: updateError } = await supabase
    .from("weekly_plan_days")
    .update({
      intent_label: title,
      generated_workout_id: workoutId,
      status: "planned",
    })
    .eq("id", dayRow.id)
    .select("id, date, intent_label, status, generated_workout_id")
    .single();
  if (updateError) throw new Error(updateError.message);

  const dayLevelFocus: DayLevelFocus = {
    dayGoalFocus: input.dailyPreferences?.goalBias ?? (dayRow.intent_label as string) ?? null,
    dayBodyEmphasis: bodyKey,
    daySpecificBodyFocuses: input.dailyPreferences?.specificBodyFocus ?? null,
    displayTitle: title,
  };

  const dbPrefs =
    input.dailyPreferences && Object.keys(input.dailyPreferences).length > 0
      ? input.dailyPreferences
      : undefined;

  const day: PlannedDay = {
    id: updated.id as string,
    date: updated.date as string,
    title,
    intentLabel: (updated.intent_label as string) ?? null,
    status: (updated.status as "planned" | "completed" | "skipped") ?? "planned",
    generatedWorkoutId: (updated.generated_workout_id as string) ?? null,
    dayLevelFocus,
    ...(dbPrefs ? { preferences: dbPrefs } : {}),
  };

  return {
    day,
    workout,
  };
}

export type UpdateDayStatusInput = {
  userId: string;
  weeklyPlanInstanceId: string;
  date: string;
  status: "planned" | "completed" | "skipped";
};

export type UpdatePlanDayDateInput = {
  userId: string;
  weeklyPlanInstanceId: string;
  dayId?: string;
  date?: string;
  newDate: string;
};

/**
 * Update a plan day's status (e.g. mark completed or skip).
 * Returns the updated day for refreshing the week plan in context.
 */
export async function updateDayStatus(
  input: UpdateDayStatusInput
): Promise<PlannedDay> {
  if (!isDbConfigured()) {
    throw new Error("Supabase is not configured; Sports Prep mode requires a backend.");
  }
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error("Supabase client is not available.");
  }
  if (!input.userId) {
    throw new Error("User must be signed in to use Sports Prep mode.");
  }

  const { data: dayRow, error: dayError } = await supabase
    .from("weekly_plan_days")
    .select("id, date, intent_label, status, generated_workout_id")
    .eq("weekly_plan_instance_id", input.weeklyPlanInstanceId)
    .eq("date", input.date)
    .maybeSingle();
  if (dayError) throw new Error(dayError.message);
  if (!dayRow) {
    throw new Error("Plan day not found for given instance and date.");
  }

  const { data: updated, error: updateError } = await supabase
    .from("weekly_plan_days")
    .update({ status: input.status })
    .eq("id", dayRow.id)
    .select("id, date, intent_label, status, generated_workout_id")
    .single();
  if (updateError) throw new Error(updateError.message);

  return {
    id: updated.id as string,
    date: updated.date as string,
    intentLabel: (updated.intent_label as string) ?? null,
    status: (updated.status as "planned" | "completed" | "skipped") ?? "planned",
    generatedWorkoutId: (updated.generated_workout_id as string) ?? null,
  };
}

/**
 * Move a plan day to a different date within the same weekly instance.
 * Supports lookup by day id (preferred) or by current date.
 */
export async function updatePlanDayDate(
  input: UpdatePlanDayDateInput
): Promise<PlannedDay> {
  if (!isDbConfigured()) {
    throw new Error("Supabase is not configured; Sports Prep mode requires a backend.");
  }
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error("Supabase client is not available.");
  }
  if (!input.userId) {
    throw new Error("User must be signed in to use Sports Prep mode.");
  }
  if (!input.dayId && !input.date) {
    throw new Error("Either dayId or date is required to update a plan day date.");
  }

  const { data: instanceRow, error: instanceError } = await supabase
    .from("weekly_plan_instances")
    .select("id")
    .eq("id", input.weeklyPlanInstanceId)
    .eq("user_id", input.userId)
    .maybeSingle();
  if (instanceError) throw new Error(instanceError.message);
  if (!instanceRow) {
    throw new Error("Weekly plan instance not found for this user.");
  }

  let dayQuery = supabase
    .from("weekly_plan_days")
    .select("id, date, intent_label, status, generated_workout_id")
    .eq("weekly_plan_instance_id", input.weeklyPlanInstanceId);

  dayQuery = input.dayId ? dayQuery.eq("id", input.dayId) : dayQuery.eq("date", input.date!);

  const { data: dayRow, error: dayError } = await dayQuery.maybeSingle();
  if (dayError) throw new Error(dayError.message);
  if (!dayRow) {
    throw new Error("Plan day not found for given instance and selector.");
  }

  if ((dayRow.date as string) === input.newDate) {
    return {
      id: dayRow.id as string,
      date: dayRow.date as string,
      intentLabel: (dayRow.intent_label as string) ?? null,
      status: (dayRow.status as "planned" | "completed" | "skipped") ?? "planned",
      generatedWorkoutId: (dayRow.generated_workout_id as string) ?? null,
    };
  }

  const { data: targetRow, error: targetError } = await supabase
    .from("weekly_plan_days")
    .select("id")
    .eq("weekly_plan_instance_id", input.weeklyPlanInstanceId)
    .eq("date", input.newDate)
    .maybeSingle();
  if (targetError) throw new Error(targetError.message);
  if (targetRow && targetRow.id !== dayRow.id) {
    throw new Error("A plan day already exists on the target date.");
  }

  const { data: updated, error: updateError } = await supabase
    .from("weekly_plan_days")
    .update({ date: input.newDate })
    .eq("id", dayRow.id)
    .eq("weekly_plan_instance_id", input.weeklyPlanInstanceId)
    .select("id, date, intent_label, status, generated_workout_id")
    .single();
  if (updateError) throw new Error(updateError.message);

  return {
    id: updated.id as string,
    date: updated.date as string,
    intentLabel: (updated.intent_label as string) ?? null,
    status: (updated.status as "planned" | "completed" | "skipped") ?? "planned",
    generatedWorkoutId: (updated.generated_workout_id as string) ?? null,
  };
}

