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
  | "Pull"
  | "Quad"
  | "Posterior";

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
  /** Preferred Zone 2 cardio modalities (e.g. "bike", "treadmill", "rower", "stair_climber"). Empty = any. Used for body recomp / endurance finisher. */
  preferredZone2Cardio?: string[];
  /** Advanced: what % of match score comes from 1st / 2nd / 3rd ranked goal (sum = 100). */
  goalMatchPrimaryPct?: number;
  goalMatchSecondaryPct?: number;
  goalMatchTertiaryPct?: number;
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

/** @deprecated Legacy: use WorkoutItem in blocks. */
export type GeneratedExercise = {
  id: string;
  name: string;
  prescription: string;
  tags: string[];
};

/** @deprecated Legacy: use WorkoutBlock. */
export type WorkoutSection = {
  id: string;
  title: string;
  reasoning?: string;
  exercises: GeneratedExercise[];
  supersetPairs?: [GeneratedExercise, GeneratedExercise][];
};

// --- Block-based workout (canonical) ---

export type BlockType =
  | "warmup"
  | "main_strength"
  | "main_hypertrophy"
  | "conditioning"
  | "skill"
  | "cooldown";

export type BlockFormat =
  | "straight_sets"
  | "superset"
  | "circuit"
  | "emom"
  | "amrap";

export type WorkoutItem = {
  exercise_id: string;
  exercise_name: string;
  sets: number;
  reps?: number;
  time_seconds?: number;
  rest_seconds: number;
  coaching_cues: string;
  reasoning_tags?: string[];
  tags?: string[];
};

export type WorkoutBlock = {
  block_type: BlockType;
  format: BlockFormat;
  title?: string;
  reasoning?: string;
  items: WorkoutItem[];
  estimated_minutes?: number;
  /** For UI: "A ↔ B" pairing on main block. */
  supersetPairs?: [WorkoutItem, WorkoutItem][];
};

export type GeneratedWorkout = {
  id: string;
  focus: string[];
  durationMinutes: number | null;
  energyLevel: EnergyLevel | null;
  notes?: string;
  blocks: WorkoutBlock[];
};

/** In-memory manual week: 7 generated workouts keyed by date. */
export type ManualWeekPlan = {
  weekStartDate: string;
  days: { date: string; workout: GeneratedWorkout }[];
};

/** One-line prescription string for display (e.g. "3 x 10 reps", "20–40 min"). */
export function formatPrescription(item: WorkoutItem): string {
  if (item.time_seconds != null && item.time_seconds > 0) {
    const min = Math.round(item.time_seconds / 60);
    return `${min} min`;
  }
  const reps = item.reps != null ? ` ${item.reps} reps` : "";
  return `${item.sets} x${reps}`.trim() || "—";
}

/**
 * Normalize a workout that may be legacy (sections) or block-based (blocks) into GeneratedWorkout with blocks.
 */
export function normalizeGeneratedWorkout(
  workout: { id: string; focus: string[]; durationMinutes: number | null; energyLevel: EnergyLevel | null; notes?: string; sections?: WorkoutSection[]; blocks?: WorkoutBlock[] }
): GeneratedWorkout {
  if (workout.blocks?.length) {
    return { id: workout.id, focus: workout.focus, durationMinutes: workout.durationMinutes, energyLevel: workout.energyLevel, notes: workout.notes, blocks: workout.blocks };
  }
  if (workout.sections?.length) {
    const blocks: WorkoutBlock[] = workout.sections.map((sec) => ({
      block_type: mapSectionIdToBlockType(sec.id),
      format: sec.supersetPairs?.length ? "superset" : "circuit",
      title: sec.title,
      reasoning: sec.reasoning,
      items: sec.exercises.map((ex) => ({
        exercise_id: ex.id,
        exercise_name: ex.name,
        sets: 1,
        rest_seconds: 0,
        coaching_cues: ex.prescription,
        reasoning_tags: [],
        tags: ex.tags,
      })),
      supersetPairs: sec.supersetPairs?.map(([a, b]) => [
        { exercise_id: a.id, exercise_name: a.name, sets: 1, rest_seconds: 0, coaching_cues: a.prescription, reasoning_tags: [], tags: a.tags },
        { exercise_id: b.id, exercise_name: b.name, sets: 1, rest_seconds: 0, coaching_cues: b.prescription, reasoning_tags: [], tags: b.tags },
      ]),
    }));
    return { id: workout.id, focus: workout.focus, durationMinutes: workout.durationMinutes, energyLevel: workout.energyLevel, notes: workout.notes, blocks };
  }
  return { id: workout.id, focus: workout.focus, durationMinutes: workout.durationMinutes, energyLevel: workout.energyLevel, notes: workout.notes, blocks: [] };
}

function mapSectionIdToBlockType(sectionId: string): BlockType {
  const id = sectionId.toLowerCase();
  if (id.includes("warm") || id === "warm-up") return "warmup";
  if (id.includes("main") || id.includes("strength")) return "main_strength";
  if (id.includes("accessory") || id.includes("hypertrophy")) return "main_hypertrophy";
  if (id.includes("cardio") || id.includes("conditioning")) return "conditioning";
  if (id.includes("cooldown")) return "cooldown";
  return "main_hypertrophy";
}

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
