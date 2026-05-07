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

/** Human-readable adaptive setup (for summaries — not the same as generator energy defaults). */
export type AdaptiveScheduleLabels = {
  intensityLevel: string;
  injuryStatus: string;
  injuryAreas?: string[];
};

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

/** User’s preferred workout difficulty / complexity (manual + adaptive). */
export type WorkoutTierPreference = "beginner" | "intermediate" | "advanced";

/** Per-workout preferences when editing a single day in a week (goal/body/energy/style bias). */
export type DailyWorkoutPreferences = {
  goalBias?: "strength" | "hypertrophy" | "endurance" | "mobility" | "recovery" | "power";
  bodyRegionBias?: "upper" | "lower" | "full" | "pull" | "push" | "core";
  /** Specific body-part emphasis for this day (e.g. glutes, shoulders). Only include when relevant to body region. */
  specificBodyFocus?: SpecificBodyFocusKey[];
  energyLevel?: EnergyLevel;
  stylePreference?: string;
  /** Override global workout tier for this day’s regeneration. */
  workoutTier?: WorkoutTierPreference;
  includeCreativeVariations?: boolean;
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
  /**
   * Sub-goals per goal: key = goal label, value = ordered sub-goal labels (order = rank).
   * UI caps total selections at 3 across all goals.
   */
  subFocusByGoal: Record<string, string[]>;
  /**
   * When generating a single day inside a week, `primaryFocus` may be narrowed to that day’s goal while
   * sub-goals should still reflect the user’s full ranked goals (so e.g. Calisthenics + Handstand still
   * bias an upper day dedicated to another primary). Optional; when unset, `primaryFocus` drives sub-focus merge.
   */
  weekSubFocusPrimaryLabels?: string[];
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
  /**
   * Experience tier for exercise selection (ordered: beginner < intermediate < advanced).
   * Creative / complex variations are controlled separately via includeCreativeVariations.
   */
  workoutTier?: WorkoutTierPreference;
  /** When true, allow exercises marked as creative/complex variations in the catalog. Default false. */
  includeCreativeVariations?: boolean;
  /**
   * When generating a multi-day week, pass IDs from prior days' main blocks so the engine avoids repeating
   * the same main compound across the week (see GenerateWorkoutInput.week_main_strength_lift_ids_used).
   */
  weekMainStrengthLiftIdsUsed?: string[];
  /**
   * Only while generating a manual training week: tracks how many training exercises so far matched each
   * sub-focus, and spreads a minimum target (default 3 per sub-goal) across days. Stripped from saved snapshots.
   */
  weeklySubFocusCoverage?: {
    matchCountsSoFar: Record<string, number>;
    trainingDayIndex: number;
    trainingDaysTotal: number;
    /** Default 3 in the adapter when omitted. */
    targetPerSubFocus?: number;
  };
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
  | "clubbell"
  | "macebell"
  | "steel_mace"
  | "indian_club"
  | "gada"
  | "treadmill"
  | "assault_bike"
  | "rower"
  | "ski_erg"
  | "stair_climber"
  | "elliptical"
  | "bands"
  | "trx"
  | "pullup_bar"
  | "rings"
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
  /** DB alternate names; used for swap / catalog search when present. */
  aliases?: string[];
  /** Exercise ids (slugs) of harder variants. */
  progressions?: string[];
  /** Exercise ids (slugs) of easier variants. */
  regressions?: string[];
  /**
   * Explicit experience tiers for generator filtering. When omitted, tiers are inferred from tags/metadata.
   */
  workout_levels?: WorkoutTierPreference[];
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
  | "accessory"
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
  /**
   * How this movement links to the session’s declared goals / sub-goals (or sport).
   * Filled at generation time for UI and audits; prep/cooldown may use `session_prep`.
   */
  session_intent_links?: {
    goals?: string[];
    sub_focus?: { goal_slug: string; sub_slug: string }[];
    sport_slugs?: string[];
    /** True when the exercise primarily prepares the session (typical warmup/cooldown). */
    session_prep?: boolean;
    /** True when links default to the primary goal because tag metadata had no explicit overlap. */
    intent_inferred?: boolean;
    /**
     * Sport sub-focuses the user selected that **this exercise actually matches** (sport tag +
     * sub-focus tag map). Omit when none apply so FOR chips stay exercise-specific.
     */
    declared_sport_sub_focuses?: { parent_slug: string; slug: string }[];
    /**
     * All sports selected for this session (regardless of whether this exercise matches).
     * Used as a UI fallback chip when no specific sub-focus or sport match applies.
     */
    session_sport_slugs?: string[];
    /**
     * Ranked list of which user intent entries (goal / sub-goal / sport / sport sub-focus)
     * this exercise directly or partially matches. Populated when `ranked_intent_entries` is
     * present on the session input; provides full traceability from exercise → user intent.
     */
    matched_intents?: Array<{
      kind: "goal" | "goal_sub_focus" | "sport" | "sport_sub_focus";
      slug: string;
      parent_slug?: string;
      match_strength: "direct" | "partial" | "inferred";
      rank: number;
      weight: number;
    }>;
  };
  /** When true, reps are per leg / per arm; display "each leg" or "per leg". */
  unilateral?: boolean;
  /** Phase 11: history recommendation (why this prescription). */
  recommendation?: RecommendationSlug;
  recommendation_reason?: string;
  /** Dev / audit: sport profile engine score snapshot when debug enabled. */
  sport_profile_score_debug?: {
    movement_pattern_match_score?: number;
    sport_alignment_score?: number;
    penalty_flags?: string[];
  };
};

/** When set, this block was built for a specific session goal / sub-focus; swaps should prefer `swap_pool_exercise_ids`. */
export type WorkoutBlockGoalIntent = {
  /** Which ranked intent leaf created this block. */
  intent_kind?: "goal" | "goal_sub_focus" | "sport" | "sport_sub_focus";
  /** Parent goal/sport for sub-focus leaves. */
  parent_slug?: string;
  /** Primary goal slug (e.g. strength, hypertrophy). */
  goal_slug: string;
  /** Sub-focus slug under `goal_sub_focus` (e.g. squat, chest). */
  sub_focus_slug?: string;
  /** Key in `goal_sub_focus` / manual adapter (e.g. strength, muscle). */
  goal_sub_focus_key?: string;
  /** Exercises that matched this section’s intent pool at generation time (for swap UI). */
  swap_pool_exercise_ids: string[];
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
  /** Optional: this block is dedicated to one goal/sub-focus; drives swap pool. */
  goal_intent?: WorkoutBlockGoalIntent;
};

export type GeneratedWorkout = {
  id: string;
  focus: string[];
  durationMinutes: number | null;
  energyLevel: EnergyLevel | null;
  notes?: string;
  blocks: WorkoutBlock[];
  /** Preferences used to generate this workout (accurate summary; avoids showing implicit defaults as “selected”). */
  generationPreferences?: ManualPreferences;
  /**
   * Declared/actual intent split: focus areas (goals, sub-goals, sports) by percentage.
   * Computed at generation time; drives the pie chart and workout title.
   */
  intentSplit?: Array<{
    slug: string;
    label: string;
    pct: number;
    weight: number;
    kind: "sport" | "goal" | "goal_sub_focus" | "sport_sub_focus";
    parent_slug?: string;
    color: string;
  }>;
  /**
   * Post-generation proportion check: declared vs actual exercise split alignment.
   * Populated by the guardrail after annotating session_intent_links.
   */
  intentProportionCheck?: {
    overall_aligned: boolean;
    max_delta_pct: number;
    working_exercise_count: number;
    checks: Array<{
      slug: string;
      kind: "sport" | "goal";
      label: string;
      declared_pct: number;
      actual_pct: number;
      delta_pct: number;
      passes: boolean;
    }>;
  };
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
  if (block.supersetPairs && block.supersetPairs.length > 0) {
    return block.supersetPairs;
  }
  if (block.format === "superset" && block.items.length >= 2) {
    const pairs: [WorkoutItem, WorkoutItem][] = [];
    for (let i = 0; i < block.items.length - 1; i += 2) {
      const a = block.items[i];
      const b = block.items[i + 1];
      if (a && b) pairs.push([a, b]);
    }
    return pairs.length ? pairs : undefined;
  }
  return undefined;
}

/** One-line prescription string for display (e.g. "3 x 10 reps", "8 rounds × 1 min", "20–40 min"). */
export function formatPrescription(item: WorkoutItem, options?: { includeRest?: boolean }): string {
  const includeRest = options?.includeRest !== false;
  const restText =
    includeRest && item.rest_seconds > 0 ? ` · Rest ${item.rest_seconds}s` : "";
  if (item.time_seconds != null && item.time_seconds > 0) {
    const min = Math.round(item.time_seconds / 60);
    const sets = item.sets ?? 1;
    if (sets > 1) return `${sets} rounds × ${min} min${restText}`;
    return `${min} min${restText}`;
  }
  const reps = item.reps != null ? ` ${item.reps} reps` : "";
  const perLeg = item.unilateral && item.reps != null ? " each leg" : "";
  return `${item.sets} x${reps}${perLeg}`.trim() + restText || "—";
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
  workout: {
    id: string;
    focus: string[];
    durationMinutes: number | null;
    energyLevel: EnergyLevel | null;
    notes?: string;
    generationPreferences?: ManualPreferences;
    intentSplit?: GeneratedWorkout["intentSplit"];
    intentProportionCheck?: GeneratedWorkout["intentProportionCheck"];
    sections?: WorkoutSection[];
    blocks?: WorkoutBlock[];
  }
): GeneratedWorkout {
  if (workout.blocks?.length) {
    return {
      id: workout.id,
      focus: workout.focus,
      durationMinutes: workout.durationMinutes,
      energyLevel: workout.energyLevel,
      notes: workout.notes,
      generationPreferences: workout.generationPreferences,
      blocks: workout.blocks,
      ...(workout.intentSplit ? { intentSplit: workout.intentSplit } : {}),
      ...(workout.intentProportionCheck ? { intentProportionCheck: workout.intentProportionCheck } : {}),
    };
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
    return {
      id: workout.id,
      focus: workout.focus,
      durationMinutes: workout.durationMinutes,
      energyLevel: workout.energyLevel,
      notes: workout.notes,
      generationPreferences: workout.generationPreferences,
      blocks,
    };
  }
  return {
    id: workout.id,
    focus: workout.focus,
    durationMinutes: workout.durationMinutes,
    energyLevel: workout.energyLevel,
    notes: workout.notes,
    generationPreferences: workout.generationPreferences,
    blocks: [],
  };
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
