export type EnergyLevel = "low" | "medium" | "high";

export type ManualPreferences = {
  primaryFocus: string[];
  durationMinutes: number | null;
  energyLevel: EnergyLevel | null;
  injuries: string[];
  upcoming: string[];
  subFocus: string[];
};

export type EquipmentKey =
  | "squat_rack"
  | "barbell"
  | "plates"
  | "bench"
  | "trap_bar"
  | "leg_press"
  | "cable_machine"
  | "lat_pulldown"
  | "chest_press"
  | "hamstring_curl"
  | "leg_extension"
  | "dumbbells"
  | "kettlebells"
  | "adjustable_bench"
  | "treadmill"
  | "assault_bike"
  | "rower"
  | "ski_erg"
  | "stair_climber"
  | "bands"
  | "trx"
  | "pullup_bar"
  | "plyo_box"
  | "sled"
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
  /** Main block only: 1–4 superset pairs. When set, UI shows "A ↔ B" per pair. */
  supersetPairs?: [GeneratedExercise, GeneratedExercise][];
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

export type ExecutionProgress = Record<
  string,
  { completed: boolean; setsCompleted: number }
>;

export type SavedWorkout = {
  id: string;
  savedAt: string;
  workout: GeneratedWorkout;
  progress?: ExecutionProgress;
};
