/**
 * Persona success/failure contracts from docs/USER_PERSONAS.md — used for deep output analysis.
 */

import type { PersonaFixture } from "./personaSimulationFixtures";

export type ExpectationDimension =
  | "intent_tone"
  | "body_region"
  | "sport_transfer"
  | "equipment"
  | "injury_safety"
  | "session_structure"
  | "prescription"
  | "multi_sport_blend"
  | "catalog_quality";

export type PersonaExpectation = {
  id: string;
  dimension: ExpectationDimension;
  label: string;
  /** Human-readable pass criteria for reports. */
  passWhen: string;
  severity: "critical" | "moderate" | "minor";
  personaIds: string[];
};

export const PERSONA_EXPECTATIONS: PersonaExpectation[] = [
  {
    id: "plyo_jump_transfer",
    dimension: "sport_transfer",
    label: "Plyometric / jump transfer",
    passWhen: "Vertical-jump day includes plyo, jump, or power-transfer patterns in main/power blocks",
    severity: "critical",
    personaIds: ["P01"],
  },
  {
    id: "no_zone2_on_explosive_day",
    dimension: "intent_tone",
    label: "No steady-state Zone 2 on explosive day",
    passWhen: "Conditioning is not steady treadmill/Zone 2 when sub-focus is vertical jump",
    severity: "moderate",
    personaIds: ["P01"],
  },
  {
    id: "athletic_not_bodybuilding",
    dimension: "intent_tone",
    label: "Athletic tone (not bodybuilding filler)",
    passWhen: "Main work reads as athletic cross-training, not 4×12 isolation pump",
    severity: "moderate",
    personaIds: ["P01", "P02"],
  },
  {
    id: "multi_sport_representation",
    dimension: "multi_sport_blend",
    label: "Both sports influence output",
    passWhen: "Basketball AND soccer patterns appear when both sports selected at 60/40 split",
    severity: "critical",
    personaIds: ["P02"],
  },
  {
    id: "no_leg_press_athletic_power",
    dimension: "intent_tone",
    label: "No leg-press in athletic power blocks",
    passWhen: "Leg-press family absent from power/main athletic blocks",
    severity: "moderate",
    personaIds: ["P02", "P04"],
  },
  {
    id: "hypertrophy_rep_range",
    dimension: "prescription",
    label: "Hypertrophy-appropriate rep ranges",
    passWhen: "Main hypertrophy work predominantly 8–15 reps (median ≥10) with sensible rest",
    severity: "moderate",
    personaIds: ["P06"],
  },
  {
    id: "lower_body_honored",
    dimension: "body_region",
    label: "Lower-body emphasis",
    passWhen: "≥70% of main-block exercises match lower-body focus when Lower selected",
    severity: "critical",
    personaIds: ["P01", "P06"],
  },
  {
    id: "hotel_equipment_only",
    dimension: "equipment",
    label: "Hotel gym feasibility",
    passWhen: "Every exercise uses only hotel template equipment (DB, bands, treadmill, bodyweight)",
    severity: "critical",
    personaIds: ["P07"],
  },
  {
    id: "hotel_session_density",
    dimension: "session_structure",
    label: "Usable hotel session density",
    passWhen: "≥5 exercises and ≥3 blocks — not a sparse 3-exercise repeat",
    severity: "moderate",
    personaIds: ["P07"],
  },
  {
    id: "joint_health_no_high_impact",
    dimension: "injury_safety",
    label: "Joint-health: no high-impact plyos",
    passWhen: "No depth jumps / high-impact plyometrics in joint-health sessions",
    severity: "critical",
    personaIds: ["P08"],
  },
  {
    id: "train_today_reflects_saved",
    dimension: "intent_tone",
    label: "Train today matches saved intent",
    passWhen: "One-tap output reflects saved goals/sport without re-entering filters",
    severity: "moderate",
    personaIds: ["P09"],
  },
  {
    id: "injury_contraindications_respected",
    dimension: "injury_safety",
    label: "Injury filters honored",
    passWhen: "No contraindicated exercises for knee + shoulder when both selected",
    severity: "critical",
    personaIds: ["P10"],
  },
  {
    id: "no_intent_label_leak",
    dimension: "catalog_quality",
    label: "Real exercise names (not ontology labels)",
    passWhen: "No block titles or exercise names that look like intent taxonomy labels",
    severity: "critical",
    personaIds: ["P01", "P02", "P06", "P07", "P08", "P09", "P10"],
  },
];

export function expectationsForPersona(personaId: string): PersonaExpectation[] {
  return PERSONA_EXPECTATIONS.filter((e) => e.personaIds.includes(personaId));
}

export function personaStory(fixture: PersonaFixture): string {
  const stories: Record<string, string> = {
    P01: "In-season court athlete wants jump/COD transfer — not a bodybuilding pump day.",
    P02: "Multi-sport athlete needs both basketball and soccer to influence one session.",
    P03: "Outdoor endurance prep — eccentric durability and sport energy systems.",
    P04: "Climber cross-training — pull/finger/shoulder, not leg hypertrophy.",
    P06: "Physique + performance — hypertrophy lower with glutes/legs sub-focus.",
    P07: "Traveling athlete — hotel gym only; sensible substitutions required.",
    P08: "Joint-health focus — controlled strength, no high-impact plyos.",
    P09: "Train-today habitual — saved prefs, one tap from home.",
    P10: "Managing knee + shoulder injury — usable session with safe alternatives.",
  };
  return stories[fixture.id] ?? fixture.name;
}
