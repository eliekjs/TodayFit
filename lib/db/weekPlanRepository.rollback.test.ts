import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GeneratedWorkout } from "../types";

const { getSupabaseMock, saveGeneratedWorkoutMock } = vi.hoisted(() => ({
  getSupabaseMock: vi.fn(),
  saveGeneratedWorkoutMock: vi.fn(),
}));

vi.mock("./client", () => ({
  getSupabase: getSupabaseMock,
}));

vi.mock("./workoutRepository", () => ({
  saveGeneratedWorkout: saveGeneratedWorkoutMock,
  getWorkoutsByIds: vi.fn(),
}));

import { saveManualDay, saveManualWeek } from "./weekPlanRepository";

function makeWorkout(id: string): GeneratedWorkout {
  return {
    id,
    focus: ["strength"],
    durationMinutes: 35,
    energyLevel: "medium",
    blocks: [],
  };
}

describe("manual plan rollback behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rolls back instance and tracked workouts when saveManualWeek fails", async () => {
    const dayInsertMock = vi
      .fn()
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { message: "day insert failed" } });
    const instanceInsertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: "instance-1" }, error: null }),
      }),
    });

    const dayDeleteEqMock = vi.fn().mockResolvedValue({ error: null });
    const daysDeleteMock = vi.fn().mockReturnValue({ eq: dayDeleteEqMock });
    const instanceDeleteEqUserMock = vi.fn().mockResolvedValue({ error: null });
    const instanceDeleteEqIdMock = vi.fn().mockReturnValue({ eq: instanceDeleteEqUserMock });
    const instanceDeleteMock = vi.fn().mockReturnValue({ eq: instanceDeleteEqIdMock });
    const workoutsDeleteEqUserMock = vi.fn().mockResolvedValue({ error: null });
    const workoutsDeleteEqIdMock = vi.fn().mockReturnValue({ eq: workoutsDeleteEqUserMock });
    const workoutsDeleteMock = vi.fn().mockReturnValue({ eq: workoutsDeleteEqIdMock });

    getSupabaseMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "weekly_plan_instances") {
          return { insert: instanceInsertMock, delete: instanceDeleteMock };
        }
        if (table === "weekly_plan_days") {
          return { insert: dayInsertMock, delete: daysDeleteMock };
        }
        if (table === "workouts") {
          return { delete: workoutsDeleteMock };
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    });

    saveGeneratedWorkoutMock.mockResolvedValueOnce("w-1").mockResolvedValueOnce("w-2");

    await expect(
      saveManualWeek("user-1", "2026-04-20", [
        { date: "2026-04-20", workout: makeWorkout("generated-a") },
        { date: "2026-04-21", workout: makeWorkout("generated-b") },
      ])
    ).rejects.toThrow("day insert failed");

    expect(dayDeleteEqMock).toHaveBeenCalledWith("weekly_plan_instance_id", "instance-1");
    expect(instanceDeleteEqIdMock).toHaveBeenCalledWith("id", "instance-1");
    expect(instanceDeleteEqUserMock).toHaveBeenCalledWith("user_id", "user-1");
    expect(workoutsDeleteEqIdMock).toHaveBeenNthCalledWith(1, "id", "w-1");
    expect(workoutsDeleteEqIdMock).toHaveBeenNthCalledWith(2, "id", "w-2");
    expect(workoutsDeleteEqUserMock).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("rolls back single-day instance and workout when saveManualDay day insert fails", async () => {
    const dayInsertMock = vi.fn().mockResolvedValue({ error: { message: "day insert failed" } });
    const instanceInsertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: "instance-2" }, error: null }),
      }),
    });

    const dayDeleteEqMock = vi.fn().mockResolvedValue({ error: null });
    const daysDeleteMock = vi.fn().mockReturnValue({ eq: dayDeleteEqMock });
    const instanceDeleteEqUserMock = vi.fn().mockResolvedValue({ error: null });
    const instanceDeleteEqIdMock = vi.fn().mockReturnValue({ eq: instanceDeleteEqUserMock });
    const instanceDeleteMock = vi.fn().mockReturnValue({ eq: instanceDeleteEqIdMock });
    const workoutsDeleteEqUserMock = vi.fn().mockResolvedValue({ error: null });
    const workoutsDeleteEqIdMock = vi.fn().mockReturnValue({ eq: workoutsDeleteEqUserMock });
    const workoutsDeleteMock = vi.fn().mockReturnValue({ eq: workoutsDeleteEqIdMock });

    getSupabaseMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "weekly_plan_instances") {
          return { insert: instanceInsertMock, delete: instanceDeleteMock };
        }
        if (table === "weekly_plan_days") {
          return { insert: dayInsertMock, delete: daysDeleteMock };
        }
        if (table === "workouts") {
          return { delete: workoutsDeleteMock };
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    });

    saveGeneratedWorkoutMock.mockResolvedValueOnce("w-3");

    await expect(saveManualDay("user-2", "2026-04-22", makeWorkout("generated-c"))).rejects.toThrow(
      "day insert failed"
    );

    expect(dayDeleteEqMock).toHaveBeenCalledWith("weekly_plan_instance_id", "instance-2");
    expect(instanceDeleteEqIdMock).toHaveBeenCalledWith("id", "instance-2");
    expect(instanceDeleteEqUserMock).toHaveBeenCalledWith("user_id", "user-2");
    expect(workoutsDeleteEqIdMock).toHaveBeenCalledWith("id", "w-3");
    expect(workoutsDeleteEqUserMock).toHaveBeenCalledWith("user_id", "user-2");
  });
});
