/**
 * Fatigue management rules for workout generation.
 * Uses recent session history to reduce volume when appropriate and
 * prefer rotating muscle groups (avoid back-to-back heavy same focus).
 */

export type RecentSessionSummary = {
  exercise_ids: string[];
  muscle_groups: string[];
  modality: string;
};

export type FatigueState = {
  /** Multiply strength/hypertrophy sets by this (0.5–1.0). */
  volumeScaleFactor: number;
  /** Muscle groups trained in the most recent session (consider fatigued). */
  fatiguedMuscleGroups: Set<string>;
  /** Number of consecutive recent sessions that were heavy (strength/power). */
  consecutiveHeavySessions: number;
  /** True when we should suggest lighter work or recovery. */
  suggestRecovery: boolean;
  /** Optional: use in scoring to penalize re-hitting same muscles. */
  fatiguedPatternsNote?: string;
};

const HEAVY_MODALITIES = new Set(["strength", "power"]);
const NORMALIZE_KEYS = ["legs", "push", "pull", "core"] as const;

function normalizeMuscleGroup(m: string): string {
  const s = m.toLowerCase().trim();
  if (s === "upper" || s.includes("push")) return "push";
  if (s === "lower" || s.includes("leg")) return "legs";
  if (s.includes("pull")) return "pull";
  if (s.includes("core") || s.includes("abs")) return "core";
  return s;
}

/**
 * Compute fatigue state from recent session history.
 * Assumes recent_history is ordered most-recent first.
 */
export function getFatigueState(
  recentHistory: RecentSessionSummary[] | undefined,
  options?: { energy_level?: "low" | "medium" | "high" }
): FatigueState {
  const history = recentHistory ?? [];
  const energy = options?.energy_level ?? "medium";

  const fatiguedMuscleGroups = new Set<string>();
  let consecutiveHeavySessions = 0;
  let volumeScaleFactor = 1.0;

  if (history.length === 0) {
    return {
      volumeScaleFactor: 1.0,
      fatiguedMuscleGroups,
      consecutiveHeavySessions: 0,
      suggestRecovery: false,
    };
  }

  // Most recent session: its muscle groups are "fatigued" for today
  const last = history[0];
  for (const m of last.muscle_groups) {
    fatiguedMuscleGroups.add(normalizeMuscleGroup(m));
  }

  // Count consecutive heavy sessions from the start
  for (const session of history) {
    if (HEAVY_MODALITIES.has(session.modality.toLowerCase())) {
      consecutiveHeavySessions++;
    } else {
      break;
    }
  }

  // Volume scale: reduce sets when we have consecutive heavy or low energy
  if (consecutiveHeavySessions >= 2) {
    volumeScaleFactor = 0.85;
  } else if (consecutiveHeavySessions >= 1 && energy === "low") {
    volumeScaleFactor = 0.8;
  } else if (consecutiveHeavySessions >= 1) {
    volumeScaleFactor = 0.9;
  }

  const suggestRecovery =
    consecutiveHeavySessions >= 2 ||
    (consecutiveHeavySessions >= 1 && energy === "low");

  return {
    volumeScaleFactor,
    fatiguedMuscleGroups,
    consecutiveHeavySessions,
    suggestRecovery,
    fatiguedPatternsNote: suggestRecovery
      ? "Consider lighter load or different focus after recent heavy sessions."
      : undefined,
  };
}

/**
 * Apply volume scale to a sets value (for strength/hypertrophy).
 * Ensures at least 1 set.
 */
export function applyFatigueVolumeScale(
  sets: number,
  fatigueState: FatigueState
): number {
  const scaled = sets * fatigueState.volumeScaleFactor;
  return Math.max(1, Math.round(scaled));
}

/**
 * Score penalty when an exercise targets muscle groups that were
 * trained in the most recent session (encourages rotation).
 */
export function fatiguePenaltyForExercise(
  muscleGroups: string[],
  fatigueState: FatigueState
): number {
  if (fatigueState.fatiguedMuscleGroups.size === 0) return 0;
  const normalized = new Set(muscleGroups.map(normalizeMuscleGroup));
  const overlap = [...fatigueState.fatiguedMuscleGroups].filter((m) =>
    normalized.has(m)
  ).length;
  if (overlap === 0) return 0;
  // Penalize so we prefer different muscle groups when possible
  return -0.5 * overlap;
}
