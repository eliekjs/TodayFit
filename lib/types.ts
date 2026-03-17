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

/** Weekly training emphasis: which area gets slightly more volume; week still trains full body. */
export type BodyEmphasisKey =
  | "upper_body"
  | "lower_body"
  | "pull"
  | "push"
  | "glutes"
  | "core"
  | "none";

/** Specific body-part focus for a day (e.g. glutes, shoulders, back, core). Used in titles and exercise selection. */
export type SpecificBodyFocusKey =
  | "glutes"
  | "quad"
  | "posterior"
  | "shoulders"
  | "back"
  | "push"
  | "pull"
  | "core";

/** Per-workout preferences when editing a single day in a week (goal/body/energy/style bias). */
export type DailyWorkoutPreferences = {
  goalBias?: "strength" | "hypertrophy" | "endurance" | "mobility" | "recovery" | "power";
  bodyRegionBias?: "upper" | "lower" | "full" | "pull" | "push" | "core";
  /** Specific body-part emphasis for this day (e.g. glutes, shoulders). Only include when relevant to body region. */
  specificBodyFocus?: SpecificBodyFocusKey[];
  energyLevel?: EnergyLevel;
  stylePreference?: string;
};

/** How to distribute primary/secondary goals across the week. */
export type GoalDistributionStyle = "dedicate_days" | "blend";

/** How to assign body emphasis (upper/lower/full) across the week. */
export type WeeklyBodyEmphasisStyle = "auto_alternate" | "manual";

/** How to apply user-selected specific body-part emphasis to days. */
export type SpecificBodyPartBehavior = "auto_apply" | "manual";

export type WorkoutStyleKey =
  | "Compound Strength"
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
  /** Weekly programming: dedicate entire days to specific goals vs blend in each workout. */
  goalDistributionStyle?: GoalDistributionStyle;
  /** Weekly programming: auto upper/lower/full structure vs manual (future). */
  weeklyBodyEmphasisStyle?: WeeklyBodyEmphasisStyle;
  /** Weekly programming: auto-apply specific body-part focus to relevant days vs manual (future). */
  specificBodyPartBehavior?: SpecificBodyPartBehavior;
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
  | "machine"
  | "dumbbells"
  | "kettlebells"
  | "adjustable_bench"
  | "ez_bar"
  | "treadmill"
  | "assault_bike"
  | "rower"
  | "ski_erg"
  | "stair_climber"
  | "elliptical"
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
  /** Exercise ids (slugs) of harder variants. */
  progressions?: string[];
  /** Exercise ids (slugs) of easier variants. */
  regressions?: string[];
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
  | "power"
  | "conditioning"
  | "skill"
  | "cooldown";

export type BlockFormat =
  | "straight_sets"
  | "superset"
  | "circuit"
  | "emom"
  | "amrap";

/** Phase 11: progress | maintain | regress | rotate from history-aware recommendation layer. */
export type RecommendationSlug = "progress" | "maintain" | "regress" | "rotate";

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
  /** When true, reps are per leg / per arm; display "each leg" or "per leg". */
  unilateral?: boolean;
  /** Phase 11: history recommendation (why this prescription). */
  recommendation?: RecommendationSlug;
  recommendation_reason?: string;
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
  days: { date: string; workout: GeneratedWorkout; displayTitle?: string }[];
};

/**
 * Return superset pairs for display. Uses block.supersetPairs when set; otherwise
 * derives pairs from block.items when format is "superset" (items 0-1, 2-3, ...).
 */
export function getSupersetPairsForBlock(block: WorkoutBlock): [WorkoutItem, WorkoutItem][] | undefined {
  // #region agent log
  let result: [WorkoutItem, WorkoutItem][] | undefined;
  if (block.supersetPairs && block.supersetPairs.length > 0) {
    result = block.supersetPairs;
  } else if (block.format === "superset" && block.items.length >= 2) {
    const pairs: [WorkoutItem, WorkoutItem][] = [];
    for (let i = 0; i < block.items.length - 1; i += 2) {
      const a = block.items[i];
      const b = block.items[i + 1];
      if (a && b) pairs.push([a, b]);
    }
    result = pairs.length ? pairs : undefined;
  } else {
    result = undefined;
  }
  fetch('',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3f6292'},body:JSON.stringify({sessionId:'3f6292',location:'lib/types.ts:getSupersetPairsForBlock',message:'getSupersetPairsForBlock',data:{format:block.format,supersetPairsLen:block.supersetPairs?.length,itemsLen:block.items?.length,resultPairsLen:result?.length},timestamp:Date.now(),hypothesisId:'H2-H3'})}).catch(()=>{});
  return result;
  // #endregion
}

/** One-line prescription string for display (e.g. "3 x 10 reps", "8 rounds × 1 min", "20–40 min"). */
export function formatPrescription(item: WorkoutItem): string {
  if (item.time_seconds != null && item.time_seconds > 0) {
    const min = Math.round(item.time_seconds / 60);
    const sets = item.sets ?? 1;
    if (sets > 1) return `${sets} rounds × ${min} min`;
    return `${min} min`;
  }
  const reps = item.reps != null ? ` ${item.reps} reps` : "";
  const perLeg = item.unilateral && item.reps != null ? " each leg" : "";
  return `${item.sets} x${reps}${perLeg}`.trim() || "—";
}

/**
 * Label for how many times to perform a superset pair (for UI header).
 * Time-based single round: "1 round (do once)". Rep-based: "3 sets" so header can show "3 sets — do A then B, rest after both".
 */
export function formatSupersetPairLabel(pair: [WorkoutItem, WorkoutItem]): string {
  const a = pair[0];
  const sets = a?.sets ?? 1;
  const isTimeBased =
    (a?.time_seconds != null && a.time_seconds > 0) ||
    (pair[1]?.time_seconds != null && (pair[1] as WorkoutItem).time_seconds! > 0);
  if (isTimeBased && sets <= 1) return "1 round (do once)";
  if (sets <= 1) return "1 set";
  return `${sets} sets`;
}

/**
 * Normalize a workout that may be legacy (sections) or block-based (blocks) into GeneratedWorkout with blocks.
 */
export function normalizeGeneratedWorkout(
  workout: { id: string; focus: string[]; durationMinutes: number | null; energyLevel: EnergyLevel | null; notes?: string; sections?: WorkoutSection[]; blocks?: WorkoutBlock[] }
): GeneratedWorkout {
  if (workout.blocks?.length) {
    // #region agent log
    const blockFormats = workout.blocks.map((b) => ({ format: b.format, supersetPairsLen: b.supersetPairs?.length, itemsLen: b.items?.length }));
    fetch('',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3f6292'},body:JSON.stringify({sessionId:'3f6292',location:'lib/types.ts:normalizeGeneratedWorkout',message:'normalizeGeneratedWorkout pass-through blocks',data:{blocksLen:workout.blocks.length,blockFormats},timestamp:Date.now(),hypothesisId:'H4'})}).catch(()=>{});
    return { id: workout.id, focus: workout.focus, durationMinutes: workout.durationMinutes, energyLevel: workout.energyLevel, notes: workout.notes, blocks: workout.blocks };
    // #endregion
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
