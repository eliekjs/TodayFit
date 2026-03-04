export type EnergyLevel = "low" | "medium" | "high";

/** Single body target: Upper / Lower / Full. Modifiers (Push, Pull, Quad, Posterior) are separate. */
export type TargetBody = "Upper" | "Lower" | "Full";

/** Used by generator for filtering; derived from targetBody + targetModifier or from sub-focus (e.g. Athletic Performance). */
export type BodyPartFocusKey =
  | "Upper body"
  | "Lower body"
  | "Full body"
  | "Core"
  | "Push"
  | "Pull";

export type WorkoutStyleKey =
  | "Compound Strength"
  | "Hypertrophy Bias"
  | "Functional / Athletic"
  | "Calisthenics Focus"
  | "CrossFit-style / HIIT"
  | "Cardio Emphasis"
  | "Mixed Strength + Conditioning";

export type ManualPreferences = {
  primaryFocus: string[];
  /** Single target; when set, modifier chips (Push/Pull or Quad/Posterior) shown. */
  targetBody: TargetBody | null;
  /** e.g. Push, Pull for Upper; Quad, Posterior for Lower; empty for Full. */
  targetModifier: string[];
  durationMinutes: number | null;
  energyLevel: EnergyLevel | null;
  /** Single list: joints + "No restrictions" (mutually exclusive with others). */
  injuries: string[];
  upcoming: string[];
  /** Sub-goals per goal: key = goal label, value = ordered sub-goal labels (max 3 per goal, order = rank). */
  subFocusByGoal: Record<string, string[]>;
  workoutStyle: string[];
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
  /** Optional one-sentence reasoning for this section (from generator). */
  reasoning?: string;
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
  /** Optional user-defined name for this completed workout. */
  name?: string;
  /** Full workout plan when completed from this app (for View / Do again). */
  workout?: GeneratedWorkout;
  /** Notes per exercise (exerciseId -> note) from execution. */
  exerciseNotes?: Record<string, string>;
};

/** Saved workout preference preset (named snapshot of ManualPreferences). */
export type PreferencePreset = {
  id: string;
  name: string;
  savedAt: string;
  preferences: ManualPreferences;
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
