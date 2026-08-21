import { describe, expect, it } from "vitest";
import {
  ACTIVE_WEEK_ROUTE,
  buildManualWeekProgress,
  buildWeekProgressSnapshot,
  markManualWeekDayByWorkoutId,
  manualWeekPlanFromSingleDay,
  pickNextUpcomingDay,
  pickTodayOrNextDay,
  type WeekProgressDay,
} from "./weekProgress";
import { getTodayLocalDateString } from "./dateUtils";
import type { ManualWeekPlan, GeneratedWorkout } from "./types";

function makeWorkout(id: string, focus: string[] = ["Strength"]): GeneratedWorkout {
  return {
    id,
    focus,
    durationMinutes: 45,
    energyLevel: "medium",
    blocks: [],
  };
}

function day(overrides: Partial<WeekProgressDay> & Pick<WeekProgressDay, "date" | "status">): WeekProgressDay {
  return {
    id: overrides.date,
    title: "Workout",
    hasGymWorkout: true,
    isSportDay: false,
    workout: null,
    ...overrides,
  };
}

describe("pickNextUpcomingDay", () => {
  it("prefers the earliest planned day on or after today", () => {
    const days = [
      day({ date: "2026-07-06", status: "completed" }),
      day({ date: "2026-07-09", status: "planned" }),
      day({ date: "2026-07-11", status: "planned" }),
    ];
    const next = pickNextUpcomingDay(days);
    expect(next?.date).toBe("2026-07-09");
  });

  it("falls back to earliest planned day when all remaining are in the past", () => {
    const days = [
      day({ date: "2026-07-01", status: "completed" }),
      day({ date: "2026-07-03", status: "planned" }),
    ];
    const next = pickNextUpcomingDay(days);
    expect(next?.date).toBe("2026-07-03");
  });

  it("returns null when every day is complete", () => {
    const days = [day({ date: "2026-07-07", status: "completed" })];
    expect(pickNextUpcomingDay(days)).toBeNull();
  });

  it("skips completed and skipped days when picking next", () => {
    const days = [
      day({ date: "2026-07-09", status: "completed" }),
      day({ date: "2026-07-10", status: "skipped" }),
      day({ date: "2026-07-11", status: "planned" }),
    ];
    expect(pickNextUpcomingDay(days)?.date).toBe("2026-07-11");
  });
});

describe("buildManualWeekProgress", () => {
  const threeDayPlan: ManualWeekPlan = {
    weekStartDate: "2026-07-07",
    days: [
      { date: "2026-07-07", status: "planned", workout: makeWorkout("w1", ["Upper"]) },
      { date: "2026-07-09", status: "planned", workout: makeWorkout("w2", ["Lower"]) },
      { date: "2026-07-11", status: "planned", workout: makeWorkout("w3", ["Full"]) },
    ],
  };

  it("defaults new days to planned status", () => {
    const plan: ManualWeekPlan = {
      weekStartDate: "2026-07-07",
      days: [{ date: "2026-07-07", workout: makeWorkout("w1") }],
    };
    const snapshot = buildManualWeekProgress(plan);
    expect(snapshot.days[0]?.status).toBe("planned");
    expect(snapshot.totalCount).toBe(1);
  });

  it("marks week complete when all days are done", () => {
    const plan: ManualWeekPlan = {
      weekStartDate: "2026-07-07",
      days: [
        { date: "2026-07-07", status: "completed", workout: makeWorkout("w1") },
        { date: "2026-07-09", status: "completed", workout: makeWorkout("w2") },
      ],
    };
    const snapshot = buildManualWeekProgress(plan);
    expect(snapshot.isWeekComplete).toBe(true);
    expect(snapshot.completedCount).toBe(2);
    expect(snapshot.nextDay).toBeNull();
  });

  it("surfaces the next incomplete day after one completion", () => {
    const plan = markManualWeekDayByWorkoutId(threeDayPlan, "w1", "completed");
    const snapshot = buildManualWeekProgress(plan);
    expect(snapshot.completedCount).toBe(1);
    expect(snapshot.isWeekComplete).toBe(false);
    expect(snapshot.nextDay?.id).toBe("w2");
    expect(snapshot.fullWeekRoute).toBe("/manual/week");
  });
});

describe("markManualWeekDayByWorkoutId", () => {
  it("only updates the matching workout day", () => {
    const plan: ManualWeekPlan = {
      weekStartDate: "2026-07-07",
      days: [
        { date: "2026-07-07", status: "planned", workout: makeWorkout("w1") },
        { date: "2026-07-09", status: "planned", workout: makeWorkout("w2") },
      ],
    };
    const updated = markManualWeekDayByWorkoutId(plan, "w1", "completed");
    expect(updated.days[0]?.status).toBe("completed");
    expect(updated.days[1]?.status).toBe("planned");
  });
});

describe("buildWeekProgressSnapshot", () => {
  it("prefers manual week plan when both are set", () => {
    const manual: ManualWeekPlan = {
      weekStartDate: "2026-07-07",
      days: [{ date: "2026-07-07", workout: makeWorkout("manual-w1") }],
    };
    const snapshot = buildWeekProgressSnapshot({
      manualWeekPlan: manual,
      sportPrepWeekPlan: {
        weekStartDate: "2026-07-07",
        weeklyPlanInstanceId: "sport-1",
        days: [],
        today: null,
        todayWorkout: null,
      },
    });
    expect(snapshot?.flow).toBe("goal_week");
    expect(snapshot?.days[0]?.id).toBe("manual-w1");
  });

  it("returns null when no week is active", () => {
    expect(buildWeekProgressSnapshot({ manualWeekPlan: null, sportPrepWeekPlan: null })).toBeNull();
  });
});

describe("pickTodayOrNextDay", () => {
  it("flags today's session when the week has one", () => {
    const todayIso = getTodayLocalDateString();
    const target = pickTodayOrNextDay([
      day({ date: "2026-01-01", status: "completed" }),
      day({ date: todayIso, status: "planned", title: "Upper Push" }),
    ]);
    expect(target?.isToday).toBe(true);
    expect(target?.day.title).toBe("Upper Push");
  });

  it("falls back to the next outstanding session when today has none", () => {
    const target = pickTodayOrNextDay([
      day({ date: "2999-03-01", status: "planned", title: "Lower" }),
    ]);
    expect(target?.isToday).toBe(false);
    expect(target?.day.title).toBe("Lower");
  });

  it("returns null once every session is done", () => {
    expect(pickTodayOrNextDay([day({ date: "2026-07-07", status: "completed" })])).toBeNull();
  });
});

describe("Workout tab route", () => {
  it("routes the active week to the Workout tab", () => {
    expect(ACTIVE_WEEK_ROUTE).toBe("/workout");
  });
});

describe("manualWeekPlanFromSingleDay", () => {
  it("wraps a day workout so the Workout tab can show a singular-day overview", () => {
    const workout = makeWorkout("day-1", ["Hypertrophy"]);
    const plan = manualWeekPlanFromSingleDay({
      weekStartDate: "2026-08-17",
      date: "2026-08-19",
      workout,
      displayTitle: "Push day",
    });
    expect(plan.weekStartDate).toBe("2026-08-17");
    expect(plan.days).toHaveLength(1);
    expect(plan.days[0]).toMatchObject({
      date: "2026-08-19",
      displayTitle: "Push day",
      status: "planned",
      workout,
    });
    const snapshot = buildManualWeekProgress(plan);
    expect(snapshot.days).toHaveLength(1);
    expect(snapshot.fullWeekRoute).toBe("/manual/week");
  });
});
