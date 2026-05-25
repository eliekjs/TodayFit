import { describe, it, expect } from "vitest";
import { buildAppTrainingHistory, mergeRegenerationAvoidIntoHistory } from "./buildAppTrainingHistory";
import type { GeneratedWorkout, WorkoutHistoryItem } from "./types";

function minimalWorkout(ids: string[]): GeneratedWorkout {
  return {
    id: "w_test",
    focus: ["Build Strength"],
    durationMinutes: 45,
    energyLevel: "medium",
    blocks: [
      {
        block_type: "main_strength",
        format: "straight_sets",
        items: ids.map((id) => ({
          exercise_id: id,
          exercise_name: id,
          sets: 3,
          reps: 8,
          rest_seconds: 60,
          coaching_cues: "Controlled reps.",
        })),
      },
    ],
  };
}

describe("buildAppTrainingHistory", () => {
  it("maps completed workout history into recent_sessions and exposure", () => {
    const history: WorkoutHistoryItem[] = [
      {
        id: "h1",
        date: "2026-05-20T12:00:00.000Z",
        focus: ["Build Strength"],
        durationMinutes: 45,
        workout: minimalWorkout(["back_squat", "bench_press"]),
      },
    ];
    const ctx = buildAppTrainingHistory({ workoutHistory: history });
    expect(ctx?.recent_sessions?.length).toBeGreaterThanOrEqual(1);
    expect(ctx?.recently_used_exercise_ids).toContain("back_squat");
    expect(ctx?.exposure?.by_exercise?.back_squat).toBeGreaterThanOrEqual(1);
    expect(ctx?.last_performed_by_exercise?.back_squat).toBe("2026-05-20T12:00:00.000Z");
  });

  it("includes in-progress workout as incomplete recent session", () => {
    const ctx = buildAppTrainingHistory({
      inProgressWorkout: minimalWorkout(["rdl"]),
      inProgressProgress: { rdl: { completed: false, setsCompleted: 1 } },
    });
    expect(ctx?.recent_sessions?.[0]?.exercise_ids).toContain("rdl");
    expect(ctx?.recent_sessions?.[0]?.completed).toBe(false);
  });

  it("merges regeneration avoid ids with penalty exposure", () => {
    const ctx = buildAppTrainingHistory({
      regenerationAvoidExerciseIds: ["goblet_squat"],
    });
    expect(ctx?.recently_used_exercise_ids).toContain("goblet_squat");
    expect(ctx?.exposure?.by_exercise?.goblet_squat).toBeGreaterThanOrEqual(2);
  });
});

describe("mergeRegenerationAvoidIntoHistory", () => {
  it("returns avoid-only context when base is undefined", () => {
    const ctx = mergeRegenerationAvoidIntoHistory(undefined, ["a", "b"]);
    expect(ctx?.recent_sessions?.[0]?.modality).toBe("regeneration_penalty");
    expect(ctx?.recently_used_exercise_ids).toEqual(["a", "b"]);
  });
});
