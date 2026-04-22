import { describe, expect, it } from "vitest";
import { buildWeeklyPlanWithWorkoutsFromRows } from "./weekPlanRepository";
import type { GeneratedWorkout } from "../types";

function makeWorkout(id: string, focus: string[]): GeneratedWorkout {
  return {
    id,
    focus,
    durationMinutes: 40,
    energyLevel: "medium",
    blocks: [],
  };
}

describe("buildWeeklyPlanWithWorkoutsFromRows", () => {
  it("maps planned days and resolves guest workouts from batched map", () => {
    const out = buildWeeklyPlanWithWorkoutsFromRows(
      { id: "inst-1", week_start_date: "2026-04-20" },
      [
        {
          id: "day-1",
          date: "2026-04-20",
          intent_label: "Strength",
          status: "planned",
          generated_workout_id: "w-1",
        },
        {
          id: "day-2",
          date: "2026-04-21",
          intent_label: "Recovery",
          status: "completed",
          generated_workout_id: "w-2",
        },
      ],
      {
        "w-1": makeWorkout("w-1", ["upper"]),
        "w-2": makeWorkout("w-2", ["mobility"]),
      }
    );

    expect(out.weeklyPlanInstanceId).toBe("inst-1");
    expect(out.weekStartDate).toBe("2026-04-20");
    expect(out.days).toEqual([
      {
        id: "day-1",
        date: "2026-04-20",
        intentLabel: "Strength",
        status: "planned",
        generatedWorkoutId: "w-1",
      },
      {
        id: "day-2",
        date: "2026-04-21",
        intentLabel: "Recovery",
        status: "completed",
        generatedWorkoutId: "w-2",
      },
    ]);
    expect(out.guestWorkouts["2026-04-20"]?.id).toBe("w-1");
    expect(out.guestWorkouts["2026-04-21"]?.id).toBe("w-2");
  });

  it("skips missing workouts and defaults null status to planned", () => {
    const out = buildWeeklyPlanWithWorkoutsFromRows(
      { id: "inst-2", week_start_date: "2026-04-27" },
      [
        {
          id: "day-3",
          date: "2026-04-27",
          intent_label: null,
          status: null,
          generated_workout_id: "w-missing",
        },
        {
          id: "day-4",
          date: "2026-04-28",
          intent_label: "No workout",
          status: "skipped",
          generated_workout_id: null,
        },
      ],
      {}
    );

    expect(out.days[0]).toMatchObject({
      id: "day-3",
      intentLabel: null,
      status: "planned",
      generatedWorkoutId: "w-missing",
    });
    expect(out.days[1]).toMatchObject({
      id: "day-4",
      status: "skipped",
      generatedWorkoutId: null,
    });
    expect(out.guestWorkouts).toEqual({});
  });
});
