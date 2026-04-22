import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GeneratedWorkout } from "../types";

const { getSupabaseMock } = vi.hoisted(() => ({
  getSupabaseMock: vi.fn(),
}));

vi.mock("./client", () => ({
  getSupabase: getSupabaseMock,
}));

import {
  buildGeneratedWorkoutMapFromRows,
  listCompletedWorkouts,
  listSavedWorkouts,
} from "./workoutRepository";

describe("workoutRepository malformed payload tolerance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not throw when intent/prescription payloads are malformed in map builder", () => {
    const workouts = [
      { id: "w1", intent: null as unknown as Record<string, unknown>, created_at: "2026-04-22T00:00:00Z" },
    ];
    const blockRows = [
      {
        id: "b1",
        workout_id: "w1",
        block_type: "main_strength",
        title: "Main",
        reasoning: null,
        sort_order: 0,
      },
    ];
    const exRows = [
      {
        block_id: "b1",
        exercise_slug: "row",
        exercise_name: "Row",
        prescription: "not-an-object",
        sort_order: 0,
      },
    ];

    const out = buildGeneratedWorkoutMapFromRows(workouts, blockRows, exRows);
    expect(out.w1).toBeDefined();
    expect(out.w1?.focus).toEqual([]);
    expect(out.w1?.durationMinutes).toBeNull();
    expect(out.w1?.blocks[0]?.items[0]).toMatchObject({
      sets: 1,
      rest_seconds: 0,
      coaching_cues: "",
    });
  });

  it("falls back safely for malformed saved/completed intent rows", async () => {
    const modeEq = vi.fn((field: string, mode: string) => {
      if (field !== "mode") throw new Error("unexpected filter");
      if (mode === "saved") {
        return Promise.resolve({
          data: [
            {
              id: "saved-1",
              intent: { savedAt: 123, workout: null, progress: "bad" },
              created_at: "2026-04-22T01:00:00Z",
            },
            {
              id: "saved-2",
              intent: {
                savedAt: "2026-04-22T02:00:00Z",
                workout: {
                  id: "generated-2",
                  focus: ["upper"],
                  durationMinutes: 20,
                  energyLevel: "low",
                  blocks: [],
                } satisfies GeneratedWorkout,
                progress: { block_1: { completed: true, setsCompleted: 2 } },
              },
              created_at: "2026-04-22T01:30:00Z",
            },
          ],
          error: null,
        });
      }
      if (mode === "completed") {
        return Promise.resolve({
          data: [
            {
              id: "completed-1",
              intent: null,
              created_at: "2026-04-22T03:00:00Z",
            },
          ],
          error: null,
        });
      }
      return Promise.resolve({ data: [], error: null });
    });

    getSupabaseMock.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              eq: modeEq,
            })),
          })),
        })),
      })),
    });

    const saved = await listSavedWorkouts("user-1");
    const completed = await listCompletedWorkouts("user-1");

    expect(saved).toHaveLength(2);
    expect(saved[0]).toMatchObject({
      id: "saved-1",
      savedAt: "2026-04-22T01:00:00Z",
      workout: {
        id: "saved-1",
        focus: [],
        durationMinutes: null,
        energyLevel: null,
        blocks: [],
      },
    });
    expect(saved[0]?.progress).toBeUndefined();
    expect(saved[1]?.workout.id).toBe("generated-2");
    expect(saved[1]?.progress).toEqual({ block_1: { completed: true, setsCompleted: 2 } });

    expect(completed).toHaveLength(1);
    expect(completed[0]).toMatchObject({
      id: "completed-1",
      date: "",
      focus: [],
      durationMinutes: null,
      workout: undefined,
    });
  });
});
