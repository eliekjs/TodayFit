import type { EquipmentKey } from "../lib/types";

export type GymProfile = {
  id: string;
  name: string;
  equipment: EquipmentKey[];
  isActive?: boolean;
};

export const initialGymProfiles: GymProfile[] = [
  {
    id: "home",
    name: "Home Gym",
    equipment: ["dumbbells", "bands", "pullup_bar", "bodyweight"],
    isActive: true,
  },
  {
    id: "commercial",
    name: "Commercial Gym",
    equipment: [
      "barbells",
      "dumbbells",
      "kettlebells",
      "cable_machine",
      "squat_rack",
      "bench",
      "leg_press",
      "cardio_machines",
    ],
  },
  {
    id: "travel",
    name: "Travel Minimal",
    equipment: ["bands", "bodyweight"],
  },
];
