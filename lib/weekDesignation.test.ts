import { describe, expect, it } from "vitest";
import {
  remapDateKeyedRecord,
  remapManualWeekToStart,
  remapSportPrepWeekToStart,
  shiftWeekStartByWeeks,
} from "./weekDesignation";
import type { ManualWeekPlan } from "./types";
import type { PlanWeekResult } from "../services/sportPrepPlanner";

describe("shiftWeekStartByWeeks", () => {
  it("moves Monday starts by whole weeks", () => {
    expect(shiftWeekStartByWeeks("2026-08-17", 1)).toBe("2026-08-24");
    expect(shiftWeekStartByWeeks("2026-08-17", -1)).toBe("2026-08-10");
  });
});

describe("remapManualWeekToStart", () => {
  it("preserves weekday offsets when changing designated week", () => {
    const plan: ManualWeekPlan = {
      weekStartDate: "2026-08-10",
      days: [
        {
          date: "2026-08-10",
          workout: {
            id: "a",
            focus: ["Upper"],
            durationMinutes: 45,
            energyLevel: "medium",
            blocks: [],
          },
        },
        {
          date: "2026-08-12",
          workout: {
            id: "b",
            focus: ["Lower"],
            durationMinutes: 45,
            energyLevel: "medium",
            blocks: [],
          },
        },
      ],
    };

    const remapped = remapManualWeekToStart(plan, "2026-08-17");
    expect(remapped.weekStartDate).toBe("2026-08-17");
    expect(remapped.days[0]?.date).toBe("2026-08-17");
    expect(remapped.days[1]?.date).toBe("2026-08-19");
    expect(remapped.days[0]?.workout.id).toBe("a");
  });
});

describe("remapSportPrepWeekToStart", () => {
  it("shifts planned days, guest workout date keys, and schedule snapshot", () => {
    const plan: PlanWeekResult = {
      weeklyPlanInstanceId: "inst-1",
      weekStartDate: "2026-08-10",
      days: [
        { id: "d1", date: "2026-08-11", title: "A", intentLabel: "A", status: "planned" },
        { id: "d2", date: "2026-08-13", title: "B", intentLabel: "B", status: "planned" },
      ],
      today: { id: "d1", date: "2026-08-11", title: "A", intentLabel: "A", status: "planned" },
      todayWorkout: null,
      guestWorkouts: {
        "2026-08-11": {
          id: "w1",
          focus: ["Upper"],
          durationMinutes: 40,
          energyLevel: "medium",
          blocks: [],
        },
        d1: {
          id: "w1",
          focus: ["Upper"],
          durationMinutes: 40,
          energyLevel: "medium",
          blocks: [],
        },
      },
      scheduleSnapshot: {
        weekStartDate: "2026-08-10",
        primaryGoalSlug: null,
        gymDaysPerWeek: 2,
        defaultSessionDuration: 45,
        energyBaseline: "medium",
      },
    };

    const remapped = remapSportPrepWeekToStart(plan, "2026-08-17");
    expect(remapped.weekStartDate).toBe("2026-08-17");
    expect(remapped.days.map((d) => d.date)).toEqual(["2026-08-18", "2026-08-20"]);
    expect(remapped.today?.date).toBe("2026-08-18");
    expect(remapped.guestWorkouts?.["2026-08-18"]?.id).toBe("w1");
    expect(remapped.guestWorkouts?.d1?.id).toBe("w1");
    expect(remapped.scheduleSnapshot?.weekStartDate).toBe("2026-08-17");
  });
});

describe("remapDateKeyedRecord", () => {
  it("shifts YYYY-MM-DD keys by the week delta", () => {
    const out = remapDateKeyedRecord(
      { "2026-08-10": { x: 1 }, "2026-08-12": { x: 2 } },
      "2026-08-10",
      "2026-08-17"
    );
    expect(out).toEqual({ "2026-08-17": { x: 1 }, "2026-08-19": { x: 2 } });
  });
});
