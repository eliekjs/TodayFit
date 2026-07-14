import { getDefaultEquipmentForTemplate } from "../../data/gymProfiles";
import type { GymProfile } from "../../data/gymProfiles";
import type { ManualPreferences } from "../../lib/types";
import type { SportGoalContext } from "../../lib/dailyGeneratorAdapter";

export type PersonaTestPriority = "P0" | "P1";

export type PersonaFixtureMode = "sport_day" | "goal_day" | "goal_week";

/** Weekly scenario metadata for multi-goal dedicate-days personas (P05). */
export type PersonaWeeklyScenarioMeta = {
  scenarioId: "A" | "B" | "C";
  label: string;
  /** Day-of-week indices with training (0=Mon). */
  trainingDays: number[];
  goalDistributionStyle: "dedicate_days";
};

export type PersonaFixture = {
  id: string;
  name: string;
  testPriority: PersonaTestPriority;
  mode: PersonaFixtureMode;
  defaultSeed: number;
  manualPreferences: ManualPreferences;
  sportGoalContext?: SportGoalContext;
  gymTemplate: "your_gym" | "hotel_gym" | "home_gym";
  successCriteria: string[];
  failureSignals: string[];
  /** Present when mode is `goal_week`. */
  weeklyScenario?: PersonaWeeklyScenarioMeta;
};

/**
 * Day-level prefs for a dedicated week day under a multi-goal P05 plan.
 * Used when single-day sims need a representative session from the week.
 */
export type PersonaWeeklyDayFixture = {
  personaId: string;
  scenarioId: "A" | "B" | "C";
  dayKey: string;
  primaryFocusLabel: string;
  subFocusDisplayNames: string[];
  manualPreferences: ManualPreferences;
  defaultSeed: number;
};

const BASE_SPORT_PREFS = {
  primaryFocus: [] as string[],
  subFocusByGoal: {},
  targetModifier: [] as string[],
  upcoming: [] as string[],
  workoutStyle: [] as string[],
  workoutTier: "intermediate" as const,
};

function fullGym(id: string): GymProfile {
  return {
    id,
    name: "Full Commercial Gym",
    equipment: getDefaultEquipmentForTemplate("your_gym"),
  };
}

function hotelGym(id: string): GymProfile {
  return {
    id,
    name: "Hotel Gym",
    equipment: getDefaultEquipmentForTemplate("hotel_gym"),
  };
}

/** Canonical persona fixtures from docs/USER_PERSONAS.md (single-day paths). */
export const PERSONA_FIXTURES: PersonaFixture[] = [
  {
    id: "P01",
    name: "Maya — in-season court athlete",
    testPriority: "P0",
    mode: "sport_day",
    defaultSeed: 88042,
    manualPreferences: {
      ...BASE_SPORT_PREFS,
      targetBody: "Lower",
      durationMinutes: 45,
      energyLevel: "medium",
      injuries: ["No restrictions"],
    },
    sportGoalContext: {
      sport_slugs: ["basketball"],
      sport_sub_focus: { basketball: ["vertical_jump"] },
      sport_weight: 0.55,
      include_intent_survival_report: true,
    },
    gymTemplate: "your_gym",
    successCriteria: [
      "Plyometric / power / jump-transfer work",
      "Athletic cross-training tone",
      "Lower-body emphasis in main blocks",
    ],
    failureSignals: [
      "Med-ball-only with no jump/plyo pattern",
      "Heavy upper hypertrophy on lower day",
      "Ontology labels as exercise names",
    ],
  },
  {
    id: "P02",
    name: "Morgan — multi-sport blend",
    testPriority: "P0",
    mode: "sport_day",
    defaultSeed: 99002,
    manualPreferences: {
      ...BASE_SPORT_PREFS,
      targetBody: "Lower",
      durationMinutes: 45,
      energyLevel: "medium",
      injuries: ["No restrictions"],
    },
    sportGoalContext: {
      sport_slugs: ["basketball", "soccer"],
      sport_sub_focus: {
        basketball: ["vertical_jump", "change_of_direction"],
        soccer: ["speed"],
      },
      sport_weight: 0.55,
      sport_focus_pct: [60, 40],
      include_intent_survival_report: true,
    },
    gymTemplate: "your_gym",
    successCriteria: [
      "Both sports influence exercise selection",
      "COD / sprint / jump patterns present",
    ],
    failureSignals: [
      "100% single-sport drowning",
      "filter_transfer_sport_or_goal_context fail",
    ],
  },
  {
    id: "P03",
    name: "Riley — outdoor endurance prep (single day)",
    testPriority: "P0",
    mode: "sport_day",
    defaultSeed: 43117,
    manualPreferences: {
      ...BASE_SPORT_PREFS,
      targetBody: "Lower",
      durationMinutes: 50,
      energyLevel: "medium",
      injuries: ["No restrictions"],
    },
    sportGoalContext: {
      sport_slugs: ["trail_running"],
      sport_sub_focus: { trail_running: ["uphill_endurance", "knee_resilience"] },
      sport_weight: 0.55,
      include_intent_survival_report: true,
    },
    gymTemplate: "your_gym",
    successCriteria: [
      "Eccentric / durability patterns for trail prep",
      "Sport-specific energy systems",
    ],
    failureSignals: [
      "Generic hypertrophy filler",
      "Machine-isolation dominance for endurance prep",
    ],
  },
  {
    id: "P04",
    name: "Sam — climber cross-training",
    testPriority: "P1",
    mode: "sport_day",
    defaultSeed: 66441,
    manualPreferences: {
      ...BASE_SPORT_PREFS,
      targetBody: "Upper",
      durationMinutes: 45,
      energyLevel: "medium",
      injuries: ["No restrictions"],
    },
    sportGoalContext: {
      sport_slugs: ["rock_climbing"],
      sport_sub_focus: { rock_climbing: ["pull_strength", "finger_strength"] },
      sport_weight: 0.55,
      include_intent_survival_report: true,
    },
    gymTemplate: "your_gym",
    successCriteria: [
      "Vertical pull and scapular control",
      "Antagonist push balance",
    ],
    failureSignals: [
      "Leg-press family dominance",
      "Heavy lower-only hypertrophy",
    ],
  },
  {
    id: "P05",
    name: "Jordan — multi-goal week planner",
    testPriority: "P0",
    mode: "goal_week",
    defaultSeed: 88001,
    /**
     * Scenario A modernized onto PRIMARY_FOCUS_OPTIONS: legacy "Power & Explosiveness"
     * folds into Athletic Performance (Speed/Sprint + Vertical jump = power-related).
     * Single-day sims use these multi-goal prefs with dedicate_days; weekly gate uses
     * PERSONA_WEEKLY_FIXTURES / day representatives.
     */
    manualPreferences: {
      primaryFocus: ["Build Muscle (Hypertrophy)", "Athletic Performance"],
      subFocusByGoal: {
        "Build Muscle (Hypertrophy)": ["Glutes"],
        "Athletic Performance": ["Speed / Sprint", "Vertical jump"],
      },
      targetBody: null,
      targetModifier: [],
      durationMinutes: 45,
      energyLevel: "medium",
      injuries: ["No restrictions"],
      upcoming: [],
      workoutStyle: [],
      workoutTier: "intermediate",
      goalMatchPrimaryPct: 50,
      goalMatchSecondaryPct: 30,
      goalMatchTertiaryPct: 20,
      goalDistributionStyle: "dedicate_days",
    },
    gymTemplate: "your_gym",
    weeklyScenario: {
      scenarioId: "A",
      label: "Hypertrophy + Athletic Performance (power via athletic subs)",
      trainingDays: [0, 1, 3, 4],
      goalDistributionStyle: "dedicate_days",
    },
    successCriteria: [
      "Each sub-goal appears across the week (coverage ≥3 matches where implemented)",
      "Day titles / blocks reflect dedicated goal for that day",
      "Primary sub-goal dominates within each day",
    ],
    failureSignals: [
      "Everything crammed into each session",
      "Duplicate main compound lifts across week where avoidance is wired",
    ],
  },
  {
    id: "P06",
    name: "Casey — physique + performance",
    testPriority: "P1",
    mode: "goal_day",
    defaultSeed: 92008,
    manualPreferences: {
      primaryFocus: ["Build Muscle (Hypertrophy)"],
      subFocusByGoal: { "Build Muscle (Hypertrophy)": ["Glutes", "Legs"] },
      targetBody: "Lower",
      targetModifier: [],
      durationMinutes: 45,
      energyLevel: "medium",
      injuries: ["No restrictions"],
      upcoming: [],
      workoutStyle: [],
      workoutTier: "intermediate",
    },
    gymTemplate: "your_gym",
    successCriteria: [
      "Hypertrophy volume 8–15 rep main work (median ≥10 reps)",
      "Lower-body region honored",
    ],
    failureSignals: [
      "Random upper fill on lower day",
      "Power prescription in hypertrophy blocks",
    ],
  },
  {
    id: "P07",
    name: "Alex — traveling athlete",
    testPriority: "P0",
    mode: "sport_day",
    defaultSeed: 55007,
    manualPreferences: {
      ...BASE_SPORT_PREFS,
      targetBody: "Full",
      durationMinutes: 35,
      energyLevel: "medium",
      injuries: ["No restrictions"],
    },
    sportGoalContext: {
      sport_slugs: ["soccer"],
      sport_sub_focus: { soccer: ["repeat_sprint"] },
      sport_weight: 0.55,
      include_intent_survival_report: true,
    },
    gymTemplate: "hotel_gym",
    successCriteria: [
      "Zero barbell/rack/cable exercises",
      "Sensible DB/band/bodyweight substitutions",
    ],
    failureSignals: [
      "filter_transfer_equipment fail",
      "Empty or 3-exercise repetitive session",
    ],
  },
  {
    id: "P08",
    name: "Taylor — joint-health focus",
    testPriority: "P1",
    mode: "goal_day",
    defaultSeed: 88008,
    manualPreferences: {
      primaryFocus: ["Strength Training for Joint Health"],
      subFocusByGoal: { "Strength Training for Joint Health": ["Knee Health"] },
      targetBody: "Lower",
      targetModifier: [],
      durationMinutes: 45,
      energyLevel: "medium",
      injuries: ["No restrictions"],
      upcoming: [],
      workoutStyle: [],
      workoutTier: "intermediate",
    },
    gymTemplate: "your_gym",
    successCriteria: [
      "Activation → controlled strength → mobility arc",
      "No high-impact plyometrics",
    ],
    failureSignals: [
      "Depth jumps or heavy spinal loading",
      "Missing joint-health structure",
    ],
  },
  {
    id: "P09",
    name: "Chris — train-today habitual",
    testPriority: "P1",
    mode: "goal_day",
    defaultSeed: 99009,
    manualPreferences: {
      primaryFocus: ["Athletic Performance"],
      subFocusByGoal: { "Athletic Performance": ["Speed / Sprint"] },
      targetBody: "Lower",
      targetModifier: [],
      durationMinutes: 45,
      energyLevel: "medium",
      injuries: ["No restrictions"],
      upcoming: [],
      workoutStyle: [],
      workoutTier: "intermediate",
    },
    gymTemplate: "your_gym",
    successCriteria: [
      "Generation completes with saved goals",
      "Duration within tolerance",
    ],
    failureSignals: [
      "Empty session",
      "Goals not reflected in blocks",
    ],
  },
  {
    id: "P10",
    name: "Drew — managing injury",
    testPriority: "P0",
    mode: "sport_day",
    defaultSeed: 77010,
    manualPreferences: {
      ...BASE_SPORT_PREFS,
      targetBody: "Full",
      durationMinutes: 45,
      energyLevel: "medium",
      injuries: ["Knee", "Shoulder"],
    },
    sportGoalContext: {
      sport_slugs: ["soccer"],
      sport_sub_focus: { soccer: ["speed"] },
      sport_weight: 0.55,
      include_intent_survival_report: true,
    },
    gymTemplate: "your_gym",
    successCriteria: [
      "filter_transfer_injuries_constraints pass",
      "Usable session with alternatives",
    ],
    failureSignals: [
      "Contraindicated joint stress exercises",
      "Empty session after injury filter",
    ],
  },
];

export function gymForPersona(fixture: PersonaFixture): GymProfile {
  if (fixture.gymTemplate === "hotel_gym") {
    return hotelGym(`persona_${fixture.id.toLowerCase()}_hotel`);
  }
  if (fixture.gymTemplate === "home_gym") {
    return {
      id: `persona_${fixture.id.toLowerCase()}_home`,
      name: "Home Setup",
      equipment: getDefaultEquipmentForTemplate("home_gym"),
    };
  }
  return fullGym(`persona_${fixture.id.toLowerCase()}_full`);
}

/** Run a specific persona by ID (for canonical fixture runs). */
export function getPersonaById(id: string): PersonaFixture | undefined {
  return PERSONA_FIXTURES.find((p) => p.id === id);
}

const P05_WEEK_BASE: Omit<ManualPreferences, "primaryFocus" | "subFocusByGoal"> = {
  targetBody: null,
  targetModifier: [],
  durationMinutes: 45,
  energyLevel: "medium",
  injuries: ["No restrictions"],
  upcoming: [],
  workoutStyle: [],
  workoutTier: "intermediate",
  goalMatchPrimaryPct: 50,
  goalMatchSecondaryPct: 30,
  goalMatchTertiaryPct: 20,
  goalDistributionStyle: "dedicate_days",
};

/**
 * Weekly-oriented fixtures for P05 (Jordan). Scenario A uses current PRIMARY_FOCUS_OPTIONS
 * (power via Athletic Performance). Scenarios B/C retain weekly-sim legacy labels where the
 * weekly harness still exercises migration paths.
 */
export const PERSONA_WEEKLY_FIXTURES: PersonaWeeklyDayFixture[] = [
  {
    personaId: "P05",
    scenarioId: "A",
    dayKey: "hypertrophy_glutes",
    primaryFocusLabel: "Build Muscle (Hypertrophy)",
    subFocusDisplayNames: ["Glutes"],
    defaultSeed: 88001,
    manualPreferences: {
      ...P05_WEEK_BASE,
      primaryFocus: ["Build Muscle (Hypertrophy)"],
      subFocusByGoal: { "Build Muscle (Hypertrophy)": ["Glutes"] },
      targetBody: "Lower",
    },
  },
  {
    personaId: "P05",
    scenarioId: "A",
    dayKey: "athletic_speed",
    primaryFocusLabel: "Athletic Performance",
    subFocusDisplayNames: ["Speed / Sprint"],
    defaultSeed: 88011,
    manualPreferences: {
      ...P05_WEEK_BASE,
      primaryFocus: ["Athletic Performance"],
      subFocusByGoal: { "Athletic Performance": ["Speed / Sprint"] },
      targetBody: "Lower",
    },
  },
  {
    personaId: "P05",
    scenarioId: "A",
    dayKey: "athletic_vertical_jump",
    primaryFocusLabel: "Athletic Performance",
    subFocusDisplayNames: ["Vertical jump"],
    defaultSeed: 88021,
    manualPreferences: {
      ...P05_WEEK_BASE,
      primaryFocus: ["Athletic Performance"],
      subFocusByGoal: { "Athletic Performance": ["Vertical jump"] },
      targetBody: "Lower",
    },
  },
  {
    personaId: "P05",
    scenarioId: "B",
    dayKey: "strength_squat",
    primaryFocusLabel: "Build Strength",
    subFocusDisplayNames: ["Squat"],
    defaultSeed: 88002,
    manualPreferences: {
      ...P05_WEEK_BASE,
      primaryFocus: ["Build Strength"],
      subFocusByGoal: { "Build Strength": ["Squat"] },
      targetBody: "Lower",
    },
  },
  {
    personaId: "P05",
    scenarioId: "C",
    dayKey: "calisthenics_handstand",
    primaryFocusLabel: "Calisthenics",
    subFocusDisplayNames: ["Handstand"],
    defaultSeed: 88003,
    manualPreferences: {
      ...P05_WEEK_BASE,
      primaryFocus: ["Calisthenics"],
      subFocusByGoal: { Calisthenics: ["Handstand"] },
      targetBody: "Upper",
    },
  },
];

export function weeklyFixturesForPersona(personaId: string): PersonaWeeklyDayFixture[] {
  return PERSONA_WEEKLY_FIXTURES.filter((f) => f.personaId === personaId);
}

/** Prefer athletic power day when single-day loops draw P05. */
export function dayRepresentativeForWeeklyPersona(
  fixture: PersonaFixture
): PersonaWeeklyDayFixture | undefined {
  if (fixture.mode !== "goal_week") return undefined;
  const scenarioId = fixture.weeklyScenario?.scenarioId ?? "A";
  const days = PERSONA_WEEKLY_FIXTURES.filter(
    (d) => d.personaId === fixture.id && d.scenarioId === scenarioId
  );
  return (
    days.find((d) => d.dayKey === "athletic_vertical_jump") ??
    days.find((d) => d.dayKey.includes("athletic")) ??
    days[0]
  );
}

/** Prefs to use for single-day generation when the persona is weekly-oriented. */
export function singleDayPrefsForPersona(fixture: PersonaFixture): ManualPreferences {
  if (fixture.mode !== "goal_week") return fixture.manualPreferences;
  const day = dayRepresentativeForWeeklyPersona(fixture);
  return day?.manualPreferences ?? fixture.manualPreferences;
}

/** P0 personas weighted 3×, P1 personas 1×. */
export function pickPersonaForLoop(seed: number, personaId?: string): PersonaFixture {
  if (personaId) {
    const fixed = getPersonaById(personaId);
    if (fixed) return fixed;
  }
  const rng = (() => {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0x100000000;
    };
  })();

  const weighted: PersonaFixture[] = [];
  for (const p of PERSONA_FIXTURES) {
    const w = p.testPriority === "P0" ? 3 : 1;
    for (let i = 0; i < w; i += 1) weighted.push(p);
  }
  return weighted[Math.floor(rng() * weighted.length)]!;
}
