import { getDefaultEquipmentForTemplate } from "../../data/gymProfiles";
import type { GymProfile } from "../../data/gymProfiles";
import type { ManualPreferences } from "../../lib/types";
import type { SportGoalContext } from "../../lib/dailyGeneratorAdapter";

export type PersonaTestPriority = "P0" | "P1";

export type PersonaFixture = {
  id: string;
  name: string;
  testPriority: PersonaTestPriority;
  mode: "sport_day" | "goal_day";
  defaultSeed: number;
  manualPreferences: ManualPreferences;
  sportGoalContext?: SportGoalContext;
  gymTemplate: "your_gym" | "hotel_gym" | "home_gym";
  successCriteria: string[];
  failureSignals: string[];
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
      "Hypertrophy volume 6–12 rep main work",
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
