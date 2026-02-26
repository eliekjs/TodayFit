export type EnergyLevel = "low" | "medium" | "high";

export type BodyPartFocusKey =
  | "Upper body"
  | "Lower body"
  | "Full body"
  | "Push"
  | "Pull";

export type SorenessInjuryKey =
  | "Upper Body"
  | "Lower Body"
  | "Core"
  | "Shoulders"
  | "Elbows / Wrists"
  | "Knees / Ankles"
  | "Back"
  | "Hips"
  | "No Restrictions";

export type WorkoutStyleKey =
  | "Compound Strength"
  | "Hypertrophy Bias"
  | "Functional / Athletic"
  | "Calisthenics Focus"
  | "CrossFit-style / HIIT"
  | "Cardio Emphasis"
  | "Mixed Strength + Conditioning";

export type UpcomingBodyRegion = "Lower" | "Upper" | "Full" | "Skill" | "None";
export type UpcomingDemandType = "Strength" | "Endurance" | "Power" | "Mixed";
export type UpcomingTimeBucket = "0–1" | "2–3" | "4–6" | "7+";

export type ManualPreferences = {
  primaryFocus: string[];
  bodyPartFocus: BodyPartFocusKey[];
  durationMinutes: number | null;
  energyLevel: EnergyLevel | null;
  injuries: string[];
  upcoming: string[];
  subFocus: string[];
  /** Advanced: areas to avoid (soreness/injuries) */
  sorenessInjuries: string[];
  /** Advanced: workout style multi-select */
  workoutStyle: string[];
  /** Advanced: upcoming event filters */
  upcomingEventBodyRegion: UpcomingBodyRegion | null;
  upcomingEventDemandType: UpcomingDemandType | null;
  upcomingEventTimeBucket: UpcomingTimeBucket | null;
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
  /** Full workout plan when completed from this app (for View / Do again). */
  workout?: GeneratedWorkout;
  /** Notes per exercise (exerciseId -> note) from execution. */
  exerciseNotes?: Record<string, string>;
};

export type ExecutionProgress = Record<
  string,
  { completed: boolean; setsCompleted: number; notes?: string }
>;

export type SavedWorkout = {
  id: string;
  savedAt: string;
  workout: GeneratedWorkout;
  progress?: ExecutionProgress;
};
