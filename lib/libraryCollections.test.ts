import { describe, expect, it } from "vitest";
import {
  groupCompletedHistoryByWeek,
  historyWeekCanRedo,
  sortBySavedAtNewestFirst,
} from "./libraryCollections";
import type { GeneratedWorkout, WorkoutHistoryItem } from "./types";

function workout(id: string): GeneratedWorkout {
  return {
    id,
    focus: ["Strength"],
    durationMinutes: 40,
    energyLevel: "medium",
    blocks: [],
  };
}

function historyItem(
  id: string,
  date: string,
  withWorkout = true
): WorkoutHistoryItem {
  return {
    id,
    date,
    focus: ["Strength"],
    durationMinutes: 40,
    workout: withWorkout ? workout(id) : undefined,
  };
}

describe("sortBySavedAtNewestFirst", () => {
  it("puts the most recently saved plan first", () => {
    const sorted = sortBySavedAtNewestFirst([
      { id: "old", savedAt: "2026-04-01T10:00:00.000Z" },
      { id: "new", savedAt: "2026-08-19T18:00:00.000Z" },
      { id: "mid", savedAt: "2026-06-10T12:00:00.000Z" },
    ]);
    expect(sorted.map((item) => item.id)).toEqual(["new", "mid", "old"]);
  });
});

describe("groupCompletedHistoryByWeek", () => {
  it("groups by calendar week and keeps newest weeks and sessions first", () => {
    const groups = groupCompletedHistoryByWeek([
      historyItem("mon", "2026-08-10"),
      historyItem("wed", "2026-08-12"),
      historyItem("next-tue", "2026-08-18"),
    ]);
    expect(groups.map((group) => group.weekStartDate)).toEqual([
      "2026-08-17",
      "2026-08-10",
    ]);
    expect(groups[1]?.items.map((item) => item.id)).toEqual(["wed", "mon"]);
    expect(historyWeekCanRedo(groups[0]!)).toBe(false);
    expect(historyWeekCanRedo(groups[1]!)).toBe(true);
  });

  it("does not offer redo when the week has fewer than two saved sessions", () => {
    const groups = groupCompletedHistoryByWeek([
      historyItem("only", "2026-08-11"),
      historyItem("no-plan", "2026-08-12", false),
    ]);
    expect(historyWeekCanRedo(groups[0]!)).toBe(false);
  });
});
