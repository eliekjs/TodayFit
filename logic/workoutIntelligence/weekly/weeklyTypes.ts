/**
 * Phase 6: Types for the adaptive weekly planning engine.
 * Weekly planner sits above the session generator and decides what sessions to create.
 */

import type { TrainingQualitySlug } from "../trainingQualities";
import type { SessionTypeSlug, StimulusProfileSlug } from "../types";
import type { EnergyLevel } from "../types";
import type { WorkoutSelectionInput } from "../scoring/scoreTypes";

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

/** Priority level for a goal (used in weekly input). */
export type GoalPriority = "primary" | "secondary" | "tertiary";

/** MVP-friendly weekly planning input. Extensible for future fields. */
export interface WeeklyPlanningInput {
  /** Primary goal slug (e.g. hypertrophy, strength, climbing). */
  primary_goal: string;
  /** Optional secondary goals; order = priority. */
  secondary_goals?: string[];
  /** Optional tertiary goals. */
  tertiary_goals?: string[];
  /** Sport slugs (e.g. rock_bouldering, backcountry_skiing). */
  sports?: string[];
  /** Number of days available for training this week. */
  days_available_per_week: number;
  /** Optional: preferred day indices (0 = first day, e.g. Mon). */
  preferred_training_days?: number[];
  /** Optional: duration per day index (day_index -> minutes). */
  session_duration_by_day?: Partial<Record<number, number>>;
  /** Default session duration when not specified per day. */
  default_session_duration: number;
  /** Optional: energy profile per day (day_index -> low | medium | high). */
  energy_profile_by_day?: Partial<Record<number, EnergyLevel>>;
  /** Optional: equipment per day (e.g. home vs gym). */
  equipment_by_day?: Partial<Record<number, string[]>>;
  /** Injuries or limitations (e.g. knee, shoulder). */
  injuries_or_limitations?: string[];
  /** Optional: desired frequency per goal (goal_slug -> sessions per week). */
  desired_training_frequency_by_goal?: Partial<Record<string, number>>;
  /** Optional: recent fatigue state for MVP. */
  recent_fatigue_state?: "fresh" | "moderate" | "accumulated";
  /** Optional: sport schedule (future-facing, e.g. event day). */
  sport_schedule?: { day_index?: number; note?: string }[];
  /** Optional: hard constraints (e.g. "no_heavy_lower_back_to_back"). */
  hard_constraints?: string[];
  /** Optional: direct target qualities override for the week. */
  target_training_qualities?: Partial<Record<TrainingQualitySlug, number>>;
  /** Default equipment when not specified per day. */
  available_equipment: string[];
  /** Optional: variation seed (e.g. week index) for light rotation. */
  variation_seed?: string | number;
  /** Phase 12: recent training load / fatigue summary (e.g. from prior week). */
  recent_training_load?: "low" | "moderate" | "high" | "accumulated";
  /** Phase 12: recovery constraints (e.g. prefer_lighter_week, max_high_fatigue_days). */
  recovery_constraints?: {
    prefer_lighter_week?: boolean;
    max_high_fatigue_sessions_this_week?: number;
    min_recovery_or_mobility_sessions?: number;
  };
  /** Phase 12: upcoming events or key days (day_index -> note, e.g. "race", "game day"). */
  upcoming_events?: Partial<Record<number, string>>;
  /** Phase 12: desired weekly emphasis (e.g. "upper_focus", "lower_taper", "sport_priority"). */
  desired_weekly_emphasis?: string;
}

// ---------------------------------------------------------------------------
// Weekly demand
// ---------------------------------------------------------------------------

/** Normalized weekly priority for a training quality (0–1). */
export type WeeklyDemandProfile = Partial<Record<TrainingQualitySlug, number>>;

// ---------------------------------------------------------------------------
// Session intent (pre-ordering)
// ---------------------------------------------------------------------------

/** Expected fatigue tier for a session (for distribution rules). */
export type FatigueTier = "low" | "moderate" | "high";

/** Single session intent produced by allocation; not yet assigned to a day. */
export interface WeeklySessionIntent {
  session_type: SessionTypeSlug;
  stimulus_profile: StimulusProfileSlug;
  /** 1 = highest priority. */
  priority: number;
  /** Qualities this session should emphasize (override for daily generator). */
  target_qualities: Partial<Record<TrainingQualitySlug, number>>;
  suggested_duration_minutes: number;
  suggested_fatigue_tier: FatigueTier;
  /** Optional label for UI (e.g. "Pull / sport support"). */
  label?: string;
  /** Structural load category hints for load balancing. */
  load_hints?: StructuralLoadCategory[];
}

/** Structural load categories for weekly balancing. */
export type StructuralLoadCategory =
  | "grip_intensive"
  | "shoulder_load"
  | "lumbar_load"
  | "knee_dominant_high"
  | "heavy_compound"
  | "plyometric_impact";

// ---------------------------------------------------------------------------
// Load state (weekly structural balance)
// ---------------------------------------------------------------------------

/** Lightweight weekly load state: exposure per category. */
export interface WeeklyLoadState {
  /** Category -> count of sessions so far this week that stress it. */
  exposure: Partial<Record<StructuralLoadCategory, number>>;
  /** Optional: last day index that had high exposure for a category (for spacing). */
  last_high_day?: Partial<Record<StructuralLoadCategory, number>>;
}

// ---------------------------------------------------------------------------
// Planned session (post-ordering, with day and handoff)
// ---------------------------------------------------------------------------

/** Input to pass to the daily workout generator for one session. */
export interface DownstreamGenerationInput
  extends Omit<
    WorkoutSelectionInput,
    "preferred_session_type" | "preferred_stimulus_profile" | "target_training_qualities"
  > {
  preferred_session_type: SessionTypeSlug;
  preferred_stimulus_profile: StimulusProfileSlug;
  /** Override from weekly plan (session-specific target qualities). */
  target_training_qualities?: Partial<Record<TrainingQualitySlug, number>>;
  duration_minutes: number;
  energy_level: EnergyLevel;
  available_equipment: string[];
  injuries_or_limitations?: string[];
}

/** One planned session in the weekly plan (assigned to a day). */
export interface WeeklyPlannedSession {
  day_index: number;
  label: string;
  session_type: SessionTypeSlug;
  stimulus_profile: StimulusProfileSlug;
  priority: number;
  target_qualities: Partial<Record<TrainingQualitySlug, number>>;
  planned_duration_minutes: number;
  expected_fatigue: FatigueTier;
  /** Short human-readable rationale for this session. */
  rationale: string;
  /** Input to pass to generateWorkoutWithPrescriptions (template-ready). */
  downstream_generation_input: DownstreamGenerationInput;
  /** Optional load categories this session stresses (for debugging/UI). */
  load_hints?: StructuralLoadCategory[];
}

/** Full weekly plan output. */
export interface WeeklyPlan {
  id: string;
  primary_goal: string;
  sports: string[];
  total_days: number;
  sessions: WeeklyPlannedSession[];
  /** Short summary of the week's emphasis and balance. */
  summary: string;
  /** Optional notes (e.g. constraints applied). */
  notes?: string[];
}

// ---------------------------------------------------------------------------
// Phase 12: Weekly plan with daily-generated workouts (Adaptive week-first)
// ---------------------------------------------------------------------------

/** One day in the week with its generated workout and metadata. */
export interface WeeklyDayWithWorkout {
  day_index: number;
  /** Session label from the weekly plan. */
  session_label: string;
  /** Planned session (intent, rationale, downstream input). */
  planned_session: WeeklyPlannedSession;
  /** Generated workout from the daily generator (logic/workoutGeneration). */
  workout: import("../../workoutGeneration/types").WorkoutSession;
  /** Short day summary (e.g. "Upper strength, 45 min"). */
  day_summary?: string;
  /** Optional recovery/load note for this day. */
  recovery_note?: string;
}

/** Phase 12: Full week with per-day generated workouts and debug. */
export interface WeeklyPlanWithWorkouts {
  /** Same as WeeklyPlan.id. */
  id: string;
  primary_goal: string;
  sports: string[];
  total_days: number;
  /** Week-level summary and rationale. */
  week_summary: string;
  /** Optional recovery/load notes for the week. */
  recovery_notes?: string[];
  /** Per-day plans with generated workouts (ordered by day_index). */
  days: WeeklyDayWithWorkout[];
  /** Phase 12: why the week was structured this way (allocation, balance). */
  debug?: {
    allocation_rationale?: string;
    weekly_state_snapshot?: WeeklyStateSnapshot;
    config_used?: WeeklyPlannerConfig;
  };
}

/** Snapshot of weekly state after all days generated (for debugging / next week). */
export interface WeeklyStateSnapshot {
  /** Exercise IDs used across the week. */
  exercise_ids_used: string[];
  /** Movement family -> count of sessions that emphasized it. */
  movement_family_exposure: Partial<Record<string, number>>;
  /** Fatigue region -> approximate count. */
  fatigue_region_exposure: Partial<Record<string, number>>;
  /** Body region -> count. */
  body_region_exposure: Partial<Record<string, number>>;
  /** High-level stress distribution (high/moderate/low session count). */
  stress_distribution: { high: number; moderate: number; low: number };
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/** Tunable config for the weekly planner (heuristics, weights, caps). */
export interface WeeklyPlannerConfig {
  /** Primary goal weight when merging with sports (0–1). Default 0.6. */
  primary_goal_weight?: number;
  /** Sport weight when sports present (0–1). Default 0.5. */
  sport_weight?: number;
  /** Min sessions per week for primary goal. Default 1. */
  min_primary_goal_sessions?: number;
  /** Max high-fatigue sessions per week. Default 3. */
  max_high_fatigue_sessions?: number;
  /** Min rest days between high lower-body sessions. Default 1. */
  min_days_between_high_lower?: number;
  /** Max grip-intensive sessions in a row (no day between). Default 0. */
  max_grip_sessions_consecutive?: number;
  /** Allow bridge day (low fatigue) when density is high. Default true. */
  allow_bridge_day?: boolean;
  /** Phase 12: min recovery/mobility sessions per week (soft). Default 0. */
  min_recovery_or_mobility_sessions?: number;
  /** Variation seed for light rotation (e.g. week index). */
  variation_seed?: string | number;
}

export const DEFAULT_WEEKLY_PLANNER_CONFIG: Required<WeeklyPlannerConfig> = {
  primary_goal_weight: 0.6,
  sport_weight: 0.5,
  min_primary_goal_sessions: 1,
  max_high_fatigue_sessions: 3,
  min_days_between_high_lower: 1,
  max_grip_sessions_consecutive: 0,
  allow_bridge_day: true,
  min_recovery_or_mobility_sessions: 0,
  variation_seed: 0,
};
