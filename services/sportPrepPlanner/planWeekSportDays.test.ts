import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getSupabaseMock,
  isDbConfiguredMock,
  buildWorkoutForSessionIntentMock,
} = vi.hoisted(() => ({
  getSupabaseMock: vi.fn(),
  isDbConfiguredMock: vi.fn(),
  buildWorkoutForSessionIntentMock: vi.fn(),
}));

vi.mock("../../lib/db", () => ({
  getSupabase: getSupabaseMock,
  isDbConfigured: isDbConfiguredMock,
}));

vi.mock("../workoutBuilder", () => ({
  buildWorkoutForSessionIntent: buildWorkoutForSessionIntentMock,
}));

vi.mock("../../lib/loadGeneratorModule", () => ({
  loadGeneratorModule: vi.fn().mockResolvedValue({
    getExercisePoolForManualGeneration: vi.fn().mockResolvedValue([]),
  }),
}));

import { planWeek } from "./index";
import { isSportDesignatedPlannedDay } from "./sportDesignatedDay";

function mockSupabaseForGuestPlanWeek() {
  getSupabaseMock.mockReturnValue({
    from: vi.fn((table: string) => {
      if (table === "goals") {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      }
      throw new Error(`Unexpected table in guest planWeek test: ${table}`);
    }),
  });
}

describe("planWeek sport-designated days", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isDbConfiguredMock.mockReturnValue(true);
    mockSupabaseForGuestPlanWeek();
    buildWorkoutForSessionIntentMock.mockResolvedValue({
      blocks: [],
      durationMinutes: 45,
    });
  });

  it("guest planWeek generates gym-only week when user skips sport day selection", async () => {
    const result = await planWeek({
      userId: undefined,
      primaryGoalSlug: "strength",
      gymDaysPerWeek: 3,
      gymTrainingDays: [0, 2, 4],
      sportTrainingDaysBySlug: { road_running: [] },
      sportDaysAllocation: { road_running: 0 },
      rankedSportSlugs: ["road_running"],
      sportSlug: "road_running",
      gymDayFocusPresetIds: ["sport_first", "goal_emphasis_1", "balanced"],
      defaultSessionDuration: 45,
      energyBaseline: "medium",
    });

    const sportDays = result.days.filter((d) => isSportDesignatedPlannedDay(d));
    const gymDays = result.days.filter((d) => !isSportDesignatedPlannedDay(d) && d.intentLabel);
    expect(sportDays).toHaveLength(0);
    expect(gymDays).toHaveLength(3);
    expect(buildWorkoutForSessionIntentMock).toHaveBeenCalledTimes(3);
    expect(result.scheduleSnapshot?.preferredTrainingDays).toEqual([0, 2, 4]);
    expect(result.scheduleSnapshot?.sportTrainingDaysBySlug).toBeUndefined();
    expect(result.scheduleSnapshot?.sportDaysAllocation).toBeUndefined();
  });

  it("guest planWeek creates sport cards without workouts on sport-only weekdays", async () => {
    const result = await planWeek({
      userId: undefined,
      primaryGoalSlug: "strength",
      gymDaysPerWeek: 3,
      gymTrainingDays: [0, 2, 4],
      sportTrainingDaysBySlug: { road_running: [5, 6] },
      sportDaysAllocation: { road_running: 2 },
      rankedSportSlugs: ["road_running"],
      sportSlug: "road_running",
      defaultSessionDuration: 45,
      energyBaseline: "medium",
    });

    const sportDays = result.days.filter((d) => isSportDesignatedPlannedDay(d));
    expect(sportDays).toHaveLength(2);
    expect(sportDays.every((d) => d.generatedWorkoutId == null)).toBe(true);
    expect(Object.keys(result.guestWorkouts ?? {}).length).toBeGreaterThan(0);
    expect(buildWorkoutForSessionIntentMock).toHaveBeenCalledTimes(3);
  });

  it("guest planWeek adds sport card on gym+sport overlap without generating sport workout", async () => {
    const result = await planWeek({
      userId: undefined,
      primaryGoalSlug: "strength",
      gymDaysPerWeek: 1,
      gymTrainingDays: [2],
      sportTrainingDaysBySlug: { rock_climbing: [2] },
      sportDaysAllocation: { rock_climbing: 1 },
      rankedSportSlugs: ["rock_climbing"],
      sportSlug: "rock_climbing",
      defaultSessionDuration: 45,
      energyBaseline: "medium",
    });

    const sessionsByDate = new Map<string, typeof result.days>();
    for (const day of result.days) {
      const list = sessionsByDate.get(day.date) ?? [];
      list.push(day);
      sessionsByDate.set(day.date, list);
    }
    const overlapDates = [...sessionsByDate.entries()].filter(
      ([, sessions]) =>
        sessions.some((s) => isSportDesignatedPlannedDay(s)) &&
        sessions.some((s) => !isSportDesignatedPlannedDay(s) && s.intentLabel)
    );
    expect(overlapDates).toHaveLength(1);
    expect(buildWorkoutForSessionIntentMock).toHaveBeenCalledTimes(1);
  });

  it("passes per-day sport and goal focus presets into gym workout generation", async () => {
    await planWeek({
      userId: undefined,
      primaryGoalSlug: "strength",
      secondaryGoalSlug: "mobility",
      gymDaysPerWeek: 2,
      gymTrainingDays: [0, 2],
      sportTrainingDaysBySlug: { road_running: [5], rock_climbing: [6] },
      sportDaysAllocation: { road_running: 1, rock_climbing: 1 },
      rankedSportSlugs: ["road_running", "rock_climbing"],
      sportSlug: "road_running",
      sportSubFocusSlugsBySport: {
        road_running: ["aerobic_base"],
        rock_climbing: ["grip_endurance"],
      },
      sportFocusPct: [60, 40],
      sportVsGoalPct: 50,
      gymDayFocusPresetIds: ["sport_emphasis_1", "goal_emphasis_1"],
      defaultSessionDuration: 45,
      energyBaseline: "medium",
    });

    const firstGymCall = buildWorkoutForSessionIntentMock.mock.calls[0];
    const secondGymCall = buildWorkoutForSessionIntentMock.mock.calls[1];
    const firstIntent = firstGymCall[0];
    const firstOptions = firstGymCall[3];
    const secondIntent = secondGymCall[0];
    const secondOptions = secondGymCall[3];

    expect(firstIntent.focus).toEqual(["Climbing performance"]);
    expect(firstOptions.sportSlug).toBe("rock_climbing");
    expect(firstOptions.rankedSportSlugs).toEqual(["rock_climbing"]);
    expect(firstOptions.sportSubFocusSlugsBySport).toEqual({
      rock_climbing: ["grip_endurance"],
    });
    expect(firstOptions.sportWeightOverride).toBeCloseTo(0.72, 5);

    expect(secondIntent.focus).toEqual(["Recovery & Mobility"]);
    expect(secondOptions.goalSlugs[0]).toBe("mobility");
    expect(secondOptions.sportWeightOverride).toBeCloseTo(0.14, 5);
    expect(secondOptions.goalWeightsOverride[0]).toBeCloseTo(0.62, 5);
  });
});
