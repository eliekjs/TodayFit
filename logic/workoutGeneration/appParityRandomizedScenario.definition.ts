import type { ManualPreferences } from "../../lib/types";
import type { SportGoalContext } from "../../lib/dailyGeneratorAdapter";

export type AppParityMode = "manual_goal_mode" | "adaptive_sport_mode";

export type AppParityScenarioDefinition = {
  seed: number;
  mode: AppParityMode;
  gymTemplate: "minimal" | "full";
  manualPreferences: ManualPreferences;
  sportGoalContext?: SportGoalContext;
};

const DAILY_MAX_GOALS = 2;
const DAILY_MAX_TOTAL_SUB_GOALS = 3;

function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function pickOne<T>(items: readonly T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)]!;
}

function pickN<T>(items: readonly T[], count: number, rng: () => number): T[] {
  const copy = [...items];
  const out: T[] = [];
  for (let i = 0; i < Math.min(count, copy.length); i += 1) {
    const idx = Math.floor(rng() * copy.length);
    out.push(copy[idx]!);
    copy.splice(idx, 1);
  }
  return out;
}

const UI_PRIMARY_FOCUS = [
  "Build Strength",
  "Build Muscle",
  "Sport Conditioning",
  "Improve Endurance",
  "Athletic Performance",
  "Calisthenics",
  "Body Recomp (fat loss & muscle gain)",
] as const;

const SUB_FOCUS_BY_UI_LABEL: Record<string, string[]> = {
  "Build Strength": ["Bench / Press", "Squat", "Deadlift / Hinge", "Pull-up / Row"],
  "Build Muscle": ["Upper chest", "Shoulders", "Back width", "Glutes", "Core"],
  "Sport Conditioning": ["Intervals / HIIT", "Zone 2 / Aerobic base", "Hills", "Threshold / Tempo"],
  "Improve Endurance": ["Zone 2 / Long steady", "Threshold / Tempo", "Hills", "Durability"],
  "Athletic Performance": ["Explosiveness", "Speed", "Single-leg control", "Core stability"],
  "Calisthenics": ["Full body calisthenics", "Pull-up strength", "Handstand control", "Muscle-up path"],
  "Body Recomp (fat loss & muscle gain)": ["Fat loss", "Glute focus", "Upper body recomposition", "Core"],
};

const SPORT_SCENARIOS: Array<{ sport: string; subFocus: string[] }> = [
  { sport: "soccer", subFocus: ["repeat_sprint", "deceleration_control"] },
  { sport: "trail_running", subFocus: ["uphill_endurance", "ankle_stability"] },
  { sport: "rock_climbing", subFocus: ["finger_strength", "pull_strength"] },
  { sport: "road_running", subFocus: ["aerobic_base", "leg_resilience"] },
  { sport: "surfing", subFocus: ["pop_up_power", "paddle_endurance"] },
];

export function buildRandomAppParityScenario(seed: number): AppParityScenarioDefinition {
  const rng = seeded(seed);
  const mode: AppParityMode = pickOne(["manual_goal_mode", "adaptive_sport_mode"] as const, rng);
  const gymTemplate = pickOne(["minimal", "full"] as const, rng);
  const goals = pickN(UI_PRIMARY_FOCUS, DAILY_MAX_GOALS, rng);
  const subFocusByGoal: Record<string, string[]> = {};
  let subGoalCount = 0;
  for (const g of goals) {
    if (subGoalCount >= DAILY_MAX_TOTAL_SUB_GOALS) break;
    const available = SUB_FOCUS_BY_UI_LABEL[g] ?? [];
    const remaining = DAILY_MAX_TOTAL_SUB_GOALS - subGoalCount;
    const picks = pickN(available, Math.min(2, available.length, remaining), rng);
    if (picks.length > 0) subFocusByGoal[g] = picks;
    subGoalCount += picks.length;
  }

  const manualPreferences: ManualPreferences = {
    primaryFocus: goals,
    subFocusByGoal,
    targetBody: pickOne(["Upper", "Lower", "Full"] as const, rng),
    targetModifier: [],
    durationMinutes: pickOne([30, 45, 60] as const, rng),
    energyLevel: pickOne(["low", "medium", "high"] as const, rng),
    injuries: pickOne([["No restrictions"], ["Knee"], ["Lower Back"], ["Shoulder"]] as const, rng),
    upcoming: [],
    workoutStyle: [],
    preferredZone2Cardio: pickOne(
      [
        ["bike", "treadmill"],
        ["rower", "stair_climber"],
        ["treadmill"],
        ["bike"],
      ] as const,
      rng
    ) as string[],
    goalMatchPrimaryPct: 50,
    goalMatchSecondaryPct: 30,
    goalMatchTertiaryPct: 20,
    workoutTier: pickOne(["beginner", "intermediate", "advanced"] as const, rng),
    includeCreativeVariations: pickOne([false, false, true] as const, rng),
  };

  if (mode === "manual_goal_mode") {
    return {
      seed,
      mode,
      gymTemplate,
      manualPreferences,
    };
  }
  const adaptivePattern = pickOne(["two_sports", "one_sport_one_goal"] as const, rng);
  const firstSport = pickOne(SPORT_SCENARIOS, rng);
  const secondSport = pickOne(
    SPORT_SCENARIOS.filter((s) => s.sport !== firstSport.sport),
    rng
  );
  const sport_slugs =
    adaptivePattern === "two_sports" ? [firstSport.sport, secondSport.sport] : [firstSport.sport];
  const sport_sub_focus: Record<string, string[]> = {
    [firstSport.sport]: firstSport.subFocus.slice(0, adaptivePattern === "two_sports" ? 2 : 2),
    ...(adaptivePattern === "two_sports" ? { [secondSport.sport]: secondSport.subFocus.slice(0, 1) } : {}),
  };
  const sportGoalContext: SportGoalContext = {
    sport_slugs,
    sport_sub_focus,
    sport_weight: pickOne([0.45, 0.55, 0.65] as const, rng),
    include_intent_survival_report: true,
  };
  const adaptiveGoals = adaptivePattern === "one_sport_one_goal" ? goals.slice(0, 1) : [];
  const adaptiveSubFocusByGoal: Record<string, string[]> = {};
  if (adaptiveGoals.length > 0) {
    const g = adaptiveGoals[0]!;
    const options = SUB_FOCUS_BY_UI_LABEL[g] ?? [];
    adaptiveSubFocusByGoal[g] = pickN(options, Math.min(1, options.length), rng);
  }

  return {
    seed,
    mode,
    gymTemplate,
    manualPreferences: {
      ...manualPreferences,
      primaryFocus: adaptiveGoals,
      subFocusByGoal: adaptiveSubFocusByGoal,
    },
    sportGoalContext,
  };
}
