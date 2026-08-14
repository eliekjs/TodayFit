import { describe, expect, it } from "vitest";
import type { GeneratedWorkout, SavedWeek } from "./types";
import type { PlanWeekResult } from "../services/sportPrepPlanner";
import {
  defaultSavedDayName,
  defaultSavedWeekName,
  isSavedDayPlan,
  rememberSavedPlanFingerprint,
  saveDayButtonLabel,
  saveWeekButtonLabel,
  savedDayFingerprint,
  savedPlanDaysFromSportPrep,
  savedPlanLibraryTitle,
  savedWeekFingerprint,
  wasPlanSavedThisSession,
} from "./saveNamedPlan";

function workout(id: string, focus: string[] = ["Strength"]): GeneratedWorkout {
  return {
    id,
    focus,
    durationMinutes: 40,
    energyLevel: "medium",
    blocks: [],
  };
}

describe("saveNamedPlan fingerprints", () => {
  it("changes the day fingerprint when the workout id changes", () => {
    const first = savedDayFingerprint("2026-04-20", "w-1");
    const same = savedDayFingerprint("2026-04-20", "w-1");
    const regenerated = savedDayFingerprint("2026-04-20", "w-2");
    expect(first).toBe(same);
    expect(regenerated).not.toBe(first);
  });

  it("changes the week fingerprint when a day workout is regenerated", () => {
    const days = [
      { date: "2026-04-20", workout: { id: "a" } },
      { date: "2026-04-22", workout: { id: "b" } },
    ];
    const original = savedWeekFingerprint("2026-04-20", days);
    const regenerated = savedWeekFingerprint("2026-04-20", [
      days[0]!,
      { date: "2026-04-22", workout: { id: "b-new" } },
    ]);
    expect(regenerated).not.toBe(original);
  });

  it("remembers a fingerprint for the rest of the session", () => {
    const fingerprint = savedDayFingerprint("2026-08-14", `session-${Date.now()}`);
    expect(wasPlanSavedThisSession(fingerprint)).toBe(false);
    rememberSavedPlanFingerprint(fingerprint);
    expect(wasPlanSavedThisSession(fingerprint)).toBe(true);
  });
});

describe("saveNamedPlan labels", () => {
  it("prefers display title then focus for default day names", () => {
    expect(defaultSavedDayName("2026-04-20", workout("w-1", ["Upper"]), "Push day")).toBe(
      "Push day"
    );
    expect(defaultSavedDayName("2026-04-20", workout("w-1", ["Upper"]))).toBe("Upper");
  });

  it("uses the user-chosen name in the library title", () => {
    const plan: SavedWeek = {
      id: "day-1",
      savedAt: "2026-04-20T00:00:00.000Z",
      weekStartDate: "2026-04-20",
      source: "manual",
      singleDay: true,
      name: "Heavy lower",
      days: [{ date: "2026-04-21", workout: workout("w-1", ["Lower"]) }],
    };
    expect(isSavedDayPlan(plan)).toBe(true);
    expect(savedPlanLibraryTitle(plan)).toBe("Heavy lower");
    expect(defaultSavedWeekName("2026-04-20")).toMatch(/Week of/);
  });

  it("disables repeat saves via Saved labels", () => {
    expect(saveDayButtonLabel({ saved: true, busy: false })).toBe("Saved");
    expect(saveWeekButtonLabel({ saved: true, busy: false })).toBe("Saved");
    expect(saveDayButtonLabel({ saved: false, busy: false, compact: true })).toBe("Save");
  });
});

describe("savedPlanDaysFromSportPrep", () => {
  it("keeps gym sessions and skips days without workouts", () => {
    const plan: PlanWeekResult = {
      weeklyPlanInstanceId: "inst-1",
      weekStartDate: "2026-04-20",
      days: [
        {
          id: "d1",
          date: "2026-04-20",
          intentLabel: "Upper",
          status: "planned",
          generatedWorkoutId: "w-1",
          title: "Upper strength",
        },
        {
          id: "d2",
          date: "2026-04-21",
          intentLabel: "Sport",
          status: "planned",
          generatedWorkoutId: null,
        },
      ],
      today: null,
      todayWorkout: null,
      guestWorkouts: {
        "2026-04-20": workout("w-1", ["Upper"]),
      },
    };
    const days = savedPlanDaysFromSportPrep(plan);
    expect(days).toHaveLength(1);
    expect(days[0]?.date).toBe("2026-04-20");
    expect(days[0]?.displayTitle).toBe("Upper strength");
  });
});
