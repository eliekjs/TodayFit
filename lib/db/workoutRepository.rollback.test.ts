import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GeneratedWorkout } from "../types";

const { getSupabaseMock } = vi.hoisted(() => ({
  getSupabaseMock: vi.fn(),
}));

vi.mock("./client", () => ({
  getSupabase: getSupabaseMock,
}));

import { saveGeneratedWorkout } from "./workoutRepository";

function makeWorkout(): GeneratedWorkout {
  return {
    id: "generated-1",
    focus: ["upper"],
    durationMinutes: 30,
    energyLevel: "medium",
    blocks: [
      {
        block_type: "main_strength",
        format: "straight_sets",
        items: [
          {
            exercise_id: "row",
            exercise_name: "Row",
            sets: 3,
            reps: 10,
            rest_seconds: 60,
            coaching_cues: "brace",
          },
        ],
      },
    ],
  };
}

describe("saveGeneratedWorkout rollback behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cleans up exercises, blocks, and workout when downstream persistence fails", async () => {
    const workoutsDeleteEqUserMock = vi.fn().mockResolvedValue({ error: null });
    const workoutsDeleteEqIdMock = vi.fn().mockReturnValue({ eq: workoutsDeleteEqUserMock });
    const workoutsDeleteMock = vi.fn().mockReturnValue({ eq: workoutsDeleteEqIdMock });
    const blocksDeleteEqMock = vi.fn().mockResolvedValue({ error: null });
    const blocksDeleteMock = vi.fn().mockReturnValue({ eq: blocksDeleteEqMock });
    const exercisesDeleteEqMock = vi.fn().mockResolvedValue({ error: null });
    const exercisesDeleteMock = vi.fn().mockReturnValue({ eq: exercisesDeleteEqMock });

    const workoutsInsertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: "workout-1" }, error: null }),
      }),
    });

    const workoutBlocksInsertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: "block-1" }, error: null }),
      }),
    });

    const workoutExercisesInsertMock = vi
      .fn()
      .mockResolvedValue({ error: { message: "exercise insert failed" } });

    getSupabaseMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "workouts") return { insert: workoutsInsertMock, delete: workoutsDeleteMock };
        if (table === "workout_blocks") return { insert: workoutBlocksInsertMock, delete: blocksDeleteMock };
        if (table === "workout_exercises") {
          return { insert: workoutExercisesInsertMock, delete: exercisesDeleteMock };
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    });

    await expect(saveGeneratedWorkout("user-1", makeWorkout())).rejects.toThrow("exercise insert failed");

    expect(exercisesDeleteEqMock).toHaveBeenCalledWith("workout_id", "workout-1");
    expect(blocksDeleteEqMock).toHaveBeenCalledWith("workout_id", "workout-1");
    expect(workoutsDeleteEqIdMock).toHaveBeenCalledWith("id", "workout-1");
    expect(workoutsDeleteEqUserMock).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("continues cleanup when earlier cleanup step returns an error", async () => {
    const workoutsDeleteEqUserMock = vi.fn().mockResolvedValue({ error: null });
    const workoutsDeleteEqIdMock = vi.fn().mockReturnValue({ eq: workoutsDeleteEqUserMock });
    const workoutsDeleteMock = vi.fn().mockReturnValue({ eq: workoutsDeleteEqIdMock });
    const blocksDeleteEqMock = vi.fn().mockResolvedValue({ error: null });
    const blocksDeleteMock = vi.fn().mockReturnValue({ eq: blocksDeleteEqMock });
    const exercisesDeleteEqMock = vi
      .fn()
      .mockResolvedValue({ error: { message: "exercise cleanup denied" } });
    const exercisesDeleteMock = vi.fn().mockReturnValue({ eq: exercisesDeleteEqMock });

    const workoutsInsertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: "workout-2" }, error: null }),
      }),
    });

    const workoutBlocksInsertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: "block-2" }, error: null }),
      }),
    });

    const workoutExercisesInsertMock = vi
      .fn()
      .mockResolvedValue({ error: { message: "exercise insert failed" } });

    getSupabaseMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "workouts") return { insert: workoutsInsertMock, delete: workoutsDeleteMock };
        if (table === "workout_blocks") return { insert: workoutBlocksInsertMock, delete: blocksDeleteMock };
        if (table === "workout_exercises") {
          return { insert: workoutExercisesInsertMock, delete: exercisesDeleteMock };
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    });

    await expect(saveGeneratedWorkout("user-2", makeWorkout())).rejects.toThrow("exercise insert failed");
    expect(exercisesDeleteEqMock).toHaveBeenCalledWith("workout_id", "workout-2");
    expect(blocksDeleteEqMock).toHaveBeenCalledWith("workout_id", "workout-2");
    expect(workoutsDeleteEqIdMock).toHaveBeenCalledWith("id", "workout-2");
    expect(workoutsDeleteEqUserMock).toHaveBeenCalledWith("user_id", "user-2");
  });
});
