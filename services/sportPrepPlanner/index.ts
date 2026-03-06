import { getSupabase, isDbConfigured } from "../../lib/db";
import { getLocalDateString } from "../../lib/dateUtils";
import type { EnergyLevel, GeneratedWorkout } from "../../lib/types";
import type { GymProfile } from "../../data/gymProfiles";
import { buildWorkoutForSessionIntent, type SessionIntent } from "../workoutBuilder";
import { saveGeneratedWorkout, getWorkout } from "../../lib/db/workoutRepository";

type IntentKey = "strength" | "power" | "aerobic" | "mobility" | "prehab" | "recovery";

/** Per-sport days per week (sportSlug -> number of days). Enables e.g. sport A 2 days, sport B 1 day, gym 3 days. */
export type SportDaysAllocation = Record<string, number>;

export type PlanWeekInput = {
  /** When absent, plan is generated in memory only (no DB persist). */
  userId?: string | null;
  weekStartDate?: string; // ISO date; defaults to current week (Monday)
  primaryGoalSlug: string;
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
  /** Ordered sport slugs [primary, secondary] for slot order and sub-focus (sportSlug is primary). */
  rankedSportSlugs?: string[];
  /** When 2 sports: [1st sport %, 2nd sport %], sum = 100. Used to weight sport focus in exercise selection. */
  sportFocusPct?: [number, number];
  preferredTrainingDays?: number[]; // 0 (Sun) - 6 (Sat) relative to weekStartDate
  defaultSessionDuration: number;
  energyBaseline: EnergyLevel;
  /** Recent load (e.g. "Long Run", "Heavy Lower") so each workout avoids exercises that add strain. */
  recentLoad?: string;
  injuries?: string[];
  sportSessions?: { date: string; goalSlug: string; sessionType?: string }[];
  gymProfile?: GymProfile;
  /** Match % for 1st / 2nd / 3rd goal (defaults 50, 30, 20). */
  goalMatchPrimaryPct?: number;
  goalMatchSecondaryPct?: number;
  goalMatchTertiaryPct?: number;
};

export type PlannedDay = {
  id: string;
  date: string;
  intentLabel: string | null;
  status: "planned" | "completed" | "skipped";
  generatedWorkoutId: string | null;
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
  /** When present, workouts are in-memory only (guest mode); key = date (YYYY-MM-DD). */
  guestWorkouts?: Record<string, GeneratedWorkout>;
};

export type RegenerateDayInput = {
  /** When absent, regenerated workout is returned in memory only (guest mode); pass intentLabel. */
  userId?: string | null;
  weeklyPlanInstanceId: string;
  date: string; // ISO
  gymProfile?: GymProfile;
  energyOverride?: EnergyLevel;
  sportSlug?: string | null;
  goalSlugs?: string[];
  /** Sub-focus slugs for primary sport (for exercise-tag biasing). */
  sportSubFocusSlugs?: string[];
  /** Required for guest mode: current day intent label so we can rebuild without DB. */
  intentLabel?: string | null;
  /** Match % for 1st / 2nd / 3rd goal. */
  goalWeightsPct?: number[];
  /** Recent load so regeneration avoids exercises that add strain (e.g. "Long Run", "Heavy Lower"). */
  recentLoad?: string;
  /** Injury/constraint labels (normalized or display) so generation excludes contraindicated exercises. */
  injuries?: string[];
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

type DemandVector = Record<IntentKey, number>;

function zeroDemand(): DemandVector {
  return {
    strength: 0,
    power: 0,
    aerobic: 0,
    mobility: 0,
    prehab: 0,
    recovery: 0,
  };
}

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

function sessionIntentForKey(
  key: IntentKey,
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
      return {
        id: `session_${date}_mobility`,
        label: "Mobility & Joint Health",
        focus: ["Mobility & Joint Health"],
        durationMinutes,
        energyLevel: energy,
        notes: "Focuses on range of motion and joint-friendly patterns.",
      };
    case "prehab":
    case "recovery":
      return {
        id: `session_${date}_recovery`,
        label: "Recovery / Prehab",
        focus: ["Recovery"],
        durationMinutes,
        energyLevel: energy,
        notes: "Low-fatigue work to support tissue health and recovery.",
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
  return {
    id: `session_${date}_sport_${sportSlug}`,
    label: sportLabel,
    focus: ["Improve Endurance", "Sport Conditioning"],
    durationMinutes,
    energyLevel: energy,
    notes: `Sport-specific conditioning to support ${sportLabel}.`,
  };
}

type DaySlot =
  | { type: "gym"; key: IntentKey }
  | { type: "sport"; sportSlug: string; discipline?: TriathlonDiscipline };

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
 * Reorder slots so gym and sport alternate in the week (gym, sport, gym, sport, ...).
 * Caller assigns slots in array order to training days in ascending day index.
 * So Mon gets slots[0], Tue gets slots[1], etc. Interleaving gives gym/sport between days.
 */
function interleaveGymAndSportSlots(slots: DaySlot[]): DaySlot[] {
  const gym: DaySlot[] = [];
  const sport: DaySlot[] = [];
  for (const s of slots) {
    if (s.type === "gym") gym.push(s);
    else sport.push(s);
  }
  const result: DaySlot[] = [];
  let gi = 0;
  let si = 0;
  for (let i = 0; i < slots.length; i++) {
    if (i % 2 === 0 && gi < gym.length) {
      result.push(gym[gi++]);
    } else if (si < sport.length) {
      result.push(sport[si++]);
    } else {
      result.push(gym[gi++]);
    }
  }
  while (gi < gym.length) result.push(gym[gi++]);
  while (si < sport.length) result.push(sport[si++]);
  return result;
}

/** Build ordered list of day slots: gym days first, then per-sport days (ranked order), capped at 7. Triathlon gets 3 slots: running, swimming, biking. */
function buildDaySlots(
  gymDaysPerWeek: number,
  sportDaysAllocation: SportDaysAllocation | undefined,
  rankedSportSlugs: string[],
  intentOrder: IntentKey[]
): DaySlot[] {
  const slots: DaySlot[] = [];
  const orderedIntents = intentOrder.length ? intentOrder : (["strength"] as IntentKey[]);

  for (let i = 0; i < gymDaysPerWeek && slots.length < 7; i++) {
    slots.push({ type: "gym", key: orderedIntents[i % orderedIntents.length] });
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
  goalSlugs: (string | null | undefined)[]
): Promise<{
  combined: DemandVector;
  goalsSnapshot: Record<string, { slug: string; weight: number }>;
}> {
  const supabase = getSupabase();
  if (!supabase) {
    // Fallback: simple default vector if DB is not configured.
    const combined = zeroDemand();
    combined.strength = 2;
    combined.aerobic = 1;
    combined.mobility = 1;
    return { combined, goalsSnapshot: {} };
  }

  const slugs = goalSlugs.filter((s): s is string => Boolean(s));
  if (!slugs.length) {
    const combined = zeroDemand();
    combined.strength = 2;
    combined.aerobic = 1;
    combined.mobility = 1;
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
    const combined = zeroDemand();
    combined.strength = 2;
    combined.aerobic = 1;
    combined.mobility = 1;
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

  (["primary", "secondary", "tertiary"] as const).forEach((slot, idx) => {
    const slug = goalSlugs[idx];
    if (!slug) return;
    const goalId = goalIdBySlug.get(slug);
    if (!goalId) return;
    const row = (demandRows ?? []).find((r) => r.goal_id === goalId);
    if (!row) return;
    const weight = GOAL_WEIGHTS[idx] ?? 0;
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

  const { combined: demand, goalsSnapshot } = await computeCombinedDemand([
    input.primaryGoalSlug,
    input.secondaryGoalSlug,
    input.tertiaryGoalSlug,
  ]);
  const intentOrder = chooseIntentOrder(demand);
  const rankedSportSlugs = input.rankedSportSlugs ?? (input.sportSlug ? [input.sportSlug] : []);
  const hasSportDays = input.sportDaysAllocation && Object.keys(input.sportDaysAllocation).length > 0;
  const daySlots = hasSportDays
    ? buildDaySlots(
        input.gymDaysPerWeek || 0,
        input.sportDaysAllocation,
        rankedSportSlugs,
        intentOrder
      )
    : [];

  const totalTrainingDays = Math.max(
    1,
    daySlots.length > 0
      ? Math.min(7, daySlots.length)
      : Math.min(7, input.gymDaysPerWeek || 3)
  );

  const weekDates: string[] = [];
  for (let i = 0; i < 7; i += 1) {
    weekDates.push(toIsoDate(addDays(weekStart, i)));
  }

  const hasSportSlots = daySlots.some((s) => s.type === "sport");
  const trainingIndices: number[] = [];
  if (input.preferredTrainingDays && input.preferredTrainingDays.length > 0) {
    const unique = Array.from(
      new Set(
        input.preferredTrainingDays.filter((idx) => idx >= 0 && idx < 7)
      )
    );
    trainingIndices.push(...unique.slice(0, totalTrainingDays));
  } else if (hasSportSlots) {
    for (let i = 0; i < totalTrainingDays && i < 7; i += 1) {
      trainingIndices.push(i);
    }
  } else {
    trainingIndices.push(...spreadTrainingDays(totalTrainingDays));
  }

  const trainingIndexSet = new Set(trainingIndices);
  const goalSlugs = [
    input.primaryGoalSlug,
    input.secondaryGoalSlug ?? null,
    input.tertiaryGoalSlug ?? null,
  ].filter((s): s is string => Boolean(s));
  const todayIso = toIsoDate(today);
  const orderedIntents =
    intentOrder.length > 0 ? intentOrder : (["strength"] as IntentKey[]);
  const goalWeightsPct = [
    input.goalMatchPrimaryPct ?? 50,
    input.goalMatchSecondaryPct ?? 30,
    input.goalMatchTertiaryPct ?? 20,
  ];

  const buildWorkoutForSlot = async (
    slot: DaySlot,
    date: string
  ): Promise<{ intent: SessionIntent; workout: GeneratedWorkout }> => {
    if (slot.type === "sport") {
      const intent = sessionIntentForSport(
        slot.sportSlug,
        sportSlotLabel(slot),
        date,
        input.defaultSessionDuration,
        input.energyBaseline
      );
      const workout = await buildWorkoutForSessionIntent(
        intent,
        input.gymProfile,
        date,
        {
          sportSlug: slot.sportSlug,
          goalSlugs,
          goalWeightsPct,
          sportSubFocusSlugs:
            slot.sportSlug === (input.sportSlug ?? undefined)
              ? input.sportSubFocusSlugs
              : undefined,
          recentLoad: input.recentLoad,
          injuries: input.injuries,
        }
      );
      return { intent, workout };
    }
    const intent = sessionIntentForKey(
      slot.key,
      date,
      input.defaultSessionDuration,
      input.energyBaseline
    );
    const workout = await buildWorkoutForSessionIntent(
      intent,
      input.gymProfile,
      date,
      {
        sportSlug: input.sportSlug ?? null,
        goalSlugs,
        goalWeightsPct,
        sportSubFocusSlugs: input.sportSubFocusSlugs,
        recentLoad: input.recentLoad,
        injuries: input.injuries,
      }
    );
    return { intent, workout };
  };

  // Guest mode: no DB writes; workouts kept in memory
  if (!input.userId) {
    const guestWorkouts: Record<string, GeneratedWorkout> = {};
    const plannedDays: PlannedDay[] = [];
    const rawSlots = daySlots.length > 0 ? daySlots.slice(0, totalTrainingDays) : [];
    const slotsToUse =
      rawSlots.length > 0
        ? hasSportSlots
          ? interleaveGymAndSportSlots(rawSlots)
          : rawSlots
        : null;
    let trainingSlotIdx = 0;
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
      const slot: DaySlot = slotsToUse
        ? slotsToUse[trainingSlotIdx]
        : {
            type: "gym",
            key: orderedIntents[trainingSlotIdx % orderedIntents.length],
          };
      trainingSlotIdx += 1;
      const { intent, workout } = await buildWorkoutForSlot(slot, date);
      guestWorkouts[date] = workout;
      plannedDays.push({
        id: `guest-${date}`,
        date,
        intentLabel: intent.label,
        status: "planned",
        generatedWorkoutId: null,
      });
    }
    const todayDay = plannedDays.find((d) => d.date === todayIso) ?? null;
    return {
      weeklyPlanInstanceId: `guest-${weekStartIso}-${Date.now()}`,
      weekStartDate: weekStartIso,
      days: plannedDays,
      today: todayDay,
      todayWorkout: todayDay ? guestWorkouts[todayIso] ?? null : null,
      sportSlug: input.sportSlug ?? null,
      goalSlugs,
      sportSubFocusSlugs: input.sportSubFocusSlugs,
      guestWorkouts,
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

  // Create / persist user_training_plans row
  const { data: goals, error: goalsError } = await supabase
    .from("goals")
    .select("id, slug")
    .in("slug", goalSlugs);
  if (goalsError) throw new Error(goalsError.message);

  const goalIdBySlug = new Map<string, string>();
  for (const g of goals ?? []) {
    goalIdBySlug.set(g.slug as string, g.id as string);
  }

  const { data: trainingPlanRow, error: planError } = await supabase
    .from("user_training_plans")
    .insert({
      user_id: input.userId,
      primary_goal_id: goalIdBySlug.get(input.primaryGoalSlug),
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

  const instanceId = instanceRow.id as string;

  const plannedDays: PlannedDay[] = [];
  const rawSlots = daySlots.length > 0 ? daySlots.slice(0, totalTrainingDays) : [];
  const slotsToUse =
    rawSlots.length > 0
      ? hasSportSlots
        ? interleaveGymAndSportSlots(rawSlots)
        : rawSlots
      : null;
  let trainingSlotIdx = 0;

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

    const slot: DaySlot = slotsToUse
      ? slotsToUse[trainingSlotIdx]
      : {
          type: "gym",
          key: orderedIntents[trainingSlotIdx % orderedIntents.length],
        };
    trainingSlotIdx += 1;

    const { intent: sessionIntent, workout } = await buildWorkoutForSlot(
      slot,
      date
    );
    const workoutId = await saveGeneratedWorkout(input.userId, workout);

    const goalContribution: Record<string, number> = {};
    if (goalsSnapshot.primary) goalContribution.primary = goalsSnapshot.primary.weight;
    if (goalsSnapshot.secondary)
      goalContribution.secondary = goalsSnapshot.secondary.weight;
    if (goalsSnapshot.tertiary)
      goalContribution.tertiary = goalsSnapshot.tertiary.weight;

    const key = slot.type === "gym" ? slot.key : "aerobic";
    const fatigueScore =
      key === "mobility" || key === "recovery" || key === "prehab" ? 1 : 3;

    rowsForDays.push({
      weekly_plan_instance_id: instanceId,
      date,
      intent_id: null,
      intent_label: sessionIntent.label,
      goal_contribution: goalContribution,
      fatigue_score: fatigueScore,
      status: "planned",
      generated_workout_id: workoutId,
    });

    plannedDays.push({
      id: "", // back-filled after insert if needed
      date,
      intentLabel: sessionIntent.label,
      status: "planned",
      generatedWorkoutId: workoutId,
    });
  }

  const { data: dayRows, error: daysError } = await supabase
    .from("weekly_plan_days")
    .insert(rowsForDays)
    .select("id, date, intent_label, status, generated_workout_id");
  if (daysError) throw new Error(daysError.message);

  const plannedByDate = new Map<string, PlannedDay>();
  for (const row of dayRows ?? []) {
    plannedByDate.set(row.date as string, {
      id: row.id as string,
      date: row.date as string,
      intentLabel: (row.intent_label as string) ?? null,
      status: (row.status as "planned" | "completed" | "skipped") ?? "planned",
      generatedWorkoutId: (row.generated_workout_id as string) ?? null,
    });
  }

  const finalDays: PlannedDay[] = weekDates.map((date) => {
    return (
      plannedByDate.get(date) ?? {
        id: "",
        date,
        intentLabel: null,
        status: "planned",
        generatedWorkoutId: null,
      }
    );
  });

  const todayDay = finalDays.find((d) => d.date === todayIso) ?? null;
  const todayWorkout =
    todayDay && todayDay.generatedWorkoutId
      ? await getWorkout(input.userId, todayDay.generatedWorkoutId)
      : null;

  return {
    weeklyPlanInstanceId: instanceId,
    weekStartDate: weekStartIso,
    days: finalDays,
    today: todayDay,
    todayWorkout,
    sportSlug: input.sportSlug ?? null,
    goalSlugs,
    sportSubFocusSlugs: input.sportSubFocusSlugs,
  };
}

export async function regenerateDay(
  input: RegenerateDayInput
): Promise<RegenerateDayResult> {
  if (!isDbConfigured()) {
    throw new Error("Supabase is not configured; Sports Prep mode requires a backend.");
  }
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error("Supabase client is not available.");
  }

  // Guest mode: regenerate in memory only using intentLabel
  if (!input.userId) {
    const key = intentKeyFromLabel(input.intentLabel ?? null);
    const energy: EnergyLevel = input.energyOverride ?? "medium";
    const sessionIntent = sessionIntentForKey(
      key,
      input.date,
      60,
      energy
    );
    const workout = await buildWorkoutForSessionIntent(
      sessionIntent,
      input.gymProfile,
      `${input.date}_${Date.now()}`,
      {
        sportSlug: input.sportSlug ?? null,
        goalSlugs: input.goalSlugs ?? [],
        goalWeightsPct: input.goalWeightsPct ?? [50, 30, 20],
        sportSubFocusSlugs: input.sportSubFocusSlugs,
        recentLoad: input.recentLoad,
        injuries: input.injuries,
      }
    );
    const day: PlannedDay = {
      id: `guest-${input.date}`,
      date: input.date,
      intentLabel: sessionIntent.label,
      status: "planned",
      generatedWorkoutId: null,
    };
    return { day, workout };
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

  const key = intentKeyFromLabel(
    (dayRow.intent_label as string | null) ?? null
  );
  const energy: EnergyLevel = input.energyOverride ?? "medium";

  const sessionIntent = sessionIntentForKey(
    key,
    dayRow.date as string,
    60,
    energy
  );

  const workout = await buildWorkoutForSessionIntent(
    sessionIntent,
    input.gymProfile,
    `${dayRow.date}_${Date.now()}`,
    {
      sportSlug: input.sportSlug ?? null,
      goalSlugs: input.goalSlugs ?? [],
      goalWeightsPct: input.goalWeightsPct ?? [50, 30, 20],
      sportSubFocusSlugs: input.sportSubFocusSlugs,
      recentLoad: input.recentLoad,
      injuries: input.injuries,
    }
  );
  const workoutId = await saveGeneratedWorkout(input.userId, workout);

  const { data: updated, error: updateError } = await supabase
    .from("weekly_plan_days")
    .update({
      intent_label: sessionIntent.label,
      generated_workout_id: workoutId,
      status: "planned",
    })
    .eq("id", dayRow.id)
    .select("id, date, intent_label, status, generated_workout_id")
    .single();
  if (updateError) throw new Error(updateError.message);

  const day: PlannedDay = {
    id: updated.id as string,
    date: updated.date as string,
    intentLabel: (updated.intent_label as string) ?? null,
    status: (updated.status as "planned" | "completed" | "skipped") ?? "planned",
    generatedWorkoutId: (updated.generated_workout_id as string) ?? null,
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

