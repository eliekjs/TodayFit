import type { EquipmentKey } from "../lib/types";

export type GymProfile = {
  id: string;
  name: string;
  equipment: EquipmentKey[];
  dumbbellMaxWeight?: number;
  isActive?: boolean;
};

export const EQUIPMENT_BY_CATEGORY: {
  category: string;
  options: { id: EquipmentKey; label: string; hasInput?: "dumbbell_max" }[];
}[] = [
  {
    category: "Barbell & Strength",
    options: [
      { id: "squat_rack", label: "Squat Rack" },
      { id: "barbell", label: "Barbell" },
      { id: "plates", label: "Plates" },
      { id: "bench", label: "Bench" },
      { id: "trap_bar", label: "Trap Bar" },
      { id: "ez_bar", label: "EZ Bar" },
    ],
  },
  {
    category: "Machines",
    options: [
      { id: "leg_press", label: "Leg Press" },
      { id: "cable_machine", label: "Cable Machine" },
      { id: "lat_pulldown", label: "Lat Pulldown" },
      { id: "chest_press", label: "Chest Press" },
      { id: "hamstring_curl", label: "Hamstring Curl" },
      { id: "leg_extension", label: "Leg Extension" },
      { id: "machine", label: "Other Machine (Hack Squat, Pec Deck, etc.)" },
    ],
  },
  {
    category: "Free Weights",
    options: [
      { id: "dumbbells", label: "Dumbbells (max weight)", hasInput: "dumbbell_max" },
      { id: "kettlebells", label: "Kettlebells" },
      { id: "adjustable_bench", label: "Adjustable Bench" },
    ],
  },
  {
    category: "Conditioning",
    options: [
      { id: "treadmill", label: "Treadmill" },
      { id: "assault_bike", label: "Assault Bike" },
      { id: "rower", label: "Rower" },
      { id: "ski_erg", label: "Ski Erg" },
      { id: "stair_climber", label: "Stair Climber" },
      { id: "elliptical", label: "Elliptical" },
    ],
  },
  {
    category: "Other",
    options: [
      { id: "bands", label: "Bands" },
      { id: "trx", label: "TRX" },
      { id: "pullup_bar", label: "Pull-up Bar" },
      { id: "plyo_box", label: "Plyo Box" },
      { id: "sled", label: "Sled" },
      { id: "bodyweight", label: "Bodyweight" },
    ],
  },
];

const YOUR_GYM_DEFAULTS: EquipmentKey[] = [
  "squat_rack",
  "barbell",
  "plates",
  "bench",
  "dumbbells",
  "kettlebells",
  "cable_machine",
  "lat_pulldown",
  "leg_press",
  "treadmill",
  "pullup_bar",
  "bodyweight",
];

const HOME_GYM_DEFAULTS: EquipmentKey[] = [
  "dumbbells",
  "kettlebells",
  "bands",
  "pullup_bar",
  "adjustable_bench",
  "bodyweight",
];

const HOTEL_GYM_DEFAULTS: EquipmentKey[] = [
  "dumbbells",
  "treadmill",
  "bands",
  "bodyweight",
];

const SMALL_GYM_DEFAULTS: EquipmentKey[] = [
  "barbell",
  "plates",
  "bench",
  "dumbbells",
  "kettlebells",
  "pullup_bar",
  "bodyweight",
];

export type GymProfileTemplate =
  | "your_gym"
  | "small_gym"
  | "home_gym"
  | "hotel_gym"
  | "custom";

/** Step 1 — Space type labels per spec (Full Commercial Gym, Small Gym, Home Setup, Hotel Gym, Bodyweight Only) */
export const SPACE_TYPE_OPTIONS: {
  template: GymProfileTemplate;
  label: string;
}[] = [
  { template: "your_gym", label: "Full Commercial Gym" },
  { template: "small_gym", label: "Small Gym" },
  { template: "home_gym", label: "Home Setup" },
  { template: "hotel_gym", label: "Hotel Gym" },
  { template: "custom", label: "Bodyweight Only" },
];

export function getDefaultEquipmentForTemplate(
  template: GymProfileTemplate
): EquipmentKey[] {
  switch (template) {
    case "your_gym":
      return [...YOUR_GYM_DEFAULTS];
    case "small_gym":
      return [...SMALL_GYM_DEFAULTS];
    case "home_gym":
      return [...HOME_GYM_DEFAULTS];
    case "hotel_gym":
      return [...HOTEL_GYM_DEFAULTS];
    case "custom":
      return ["bodyweight"];
    default:
      return ["bodyweight"];
  }
}

export const initialGymProfiles: GymProfile[] = [
  {
    id: "your_gym",
    name: "Your Gym",
    equipment: YOUR_GYM_DEFAULTS,
    dumbbellMaxWeight: undefined,
    isActive: true,
  },
];
