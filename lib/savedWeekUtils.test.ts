import { describe, expect, it } from "vitest";
import { remapSavedWeekToCurrentWeek } from "./savedWeekUtils";
import type { SavedWeek } from "./types";

describe("remapSavedWeekToCurrentWeek", () => {
  it("preserves weekday offsets and assigns fresh workout ids", () => {
    const saved: SavedWeek = {
      id: "week-1",
      savedAt: "2026-01-01T00:00:00.000Z",
      weekStartDate: "2026-03-30",
      source: "manual",
      days: [
        {
          date: "2026-03-31",
          workout: {
            id: "old-a",
            focus: ["Upper"],
            durationMinutes: 45,
            energyLevel: "medium",
            blocks: [],
          },
        },
        {
          date: "2026-04-02",
          workout: {
            id: "old-b",
            focus: ["Lower"],
            durationMinutes: 45,
            energyLevel: "medium",
            blocks: [],
          },
        },
      ],
    };

    const remapped = remapSavedWeekToCurrentWeek(saved);
    expect(remapped.days).toHaveLength(2);
    expect(remapped.days[0]?.date).not.toBe("2026-03-31");
    expect(remapped.days[1]?.date).not.toBe("2026-04-02");
    expect(remapped.days[0]?.workout.id).not.toBe("old-a");
    expect(remapped.days[1]?.workout.id).not.toBe("old-b");

    const first = new Date(`${remapped.days[0]!.date}T12:00:00`);
    const second = new Date(`${remapped.days[1]!.date}T12:00:00`);
    const dayGap = Math.round(
      (second.getTime() - first.getTime()) / (24 * 60 * 60 * 1000)
    );
    expect(dayGap).toBe(2);
  });
});
