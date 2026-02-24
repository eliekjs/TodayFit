export type EnergyLevel = "low" | "medium" | "high";

export type ManualPreferences = {
  primaryFocus: string[];
  durationMinutes: number | null;
  energyLevel: EnergyLevel | null;
  injuries: string[];
  upcoming: string[];
  subFocus: string[];
  useGymEquipmentOnly: boolean;
};

export type EquipmentKey =
  | "barbells"
  | "dumbbells"
  | "kettlebells"
  | "cable_machine"
  | "pullup_bar"
  | "squat_rack"
  | "bench"
  | "leg_press"
  | "bands"
  | "cardio_machines"
  | "hangboard"
  | "bodyweight";

export type ContraindicationKey =
  | "shoulder"
  | "elbow"
  | "wrist"
  | "lower_back"
  | "hip"
  | "knee"
  | "ankle";

export type MuscleGroup = "legs" | "push" | "pull" | "core";

export type Modality =
  | "strength"
  | "hypertrophy"
  | "conditioning"
  | "mobility"
  | "power";

export type ExerciseDefinition = {
  id: string;
  name: string;
  muscles: MuscleGroup[];
  modalities: Modality[];
  contraindications?: ContraindicationKey[];
  equipment: EquipmentKey[];
  tags: string[];
};

export type GeneratedExercise = {
  id: string;
  name: string;
  prescription: string;
  tags: string[];
};

export type WorkoutSection = {
  id: string;
  title: string;
  exercises: GeneratedExercise[];
};

export type GeneratedWorkout = {
  id: string;
  focus: string[];
  durationMinutes: number | null;
  energyLevel: EnergyLevel | null;
  notes?: string;
  sections: WorkoutSection[];
};

export type WorkoutHistoryItem = {
  id: string;
  date: string;
  focus: string[];
  durationMinutes: number | null;
};
