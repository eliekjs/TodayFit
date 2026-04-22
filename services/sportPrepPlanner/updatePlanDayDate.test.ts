import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSupabaseMock, isDbConfiguredMock } = vi.hoisted(() => ({
  getSupabaseMock: vi.fn(),
  isDbConfiguredMock: vi.fn(),
}));

vi.mock("../../lib/db", () => ({
  getSupabase: getSupabaseMock,
  isDbConfigured: isDbConfiguredMock,
}));

import { updatePlanDayDate } from "./index";

describe("updatePlanDayDate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isDbConfiguredMock.mockReturnValue(true);
  });

  it("updates a day date by dayId after verifying instance ownership", async () => {
    const instanceMaybeSingleMock = vi
      .fn()
      .mockResolvedValue({ data: { id: "inst-1" }, error: null });
    const instanceEqUserMock = vi.fn().mockReturnValue({ maybeSingle: instanceMaybeSingleMock });
    const instanceEqIdMock = vi.fn().mockReturnValue({ eq: instanceEqUserMock });
    const instanceSelectMock = vi.fn().mockReturnValue({ eq: instanceEqIdMock });

    const dayLookupMaybeSingleMock = vi.fn().mockResolvedValue({
      data: {
        id: "day-1",
        date: "2026-04-20",
        intent_label: "Strength",
        status: "planned",
        generated_workout_id: "w-1",
      },
      error: null,
    });
    const dayLookupEqIdMock = vi.fn().mockReturnValue({ maybeSingle: dayLookupMaybeSingleMock });
    const dayLookupEqInstanceMock = vi.fn().mockReturnValue({ eq: dayLookupEqIdMock });
    const dayLookupSelectMock = vi.fn().mockReturnValue({ eq: dayLookupEqInstanceMock });

    const updateSingleMock = vi.fn().mockResolvedValue({
      data: {
        id: "day-1",
        date: "2026-04-21",
        intent_label: "Strength",
        status: "planned",
        generated_workout_id: "w-1",
      },
      error: null,
    });
    const updateSelectMock = vi.fn().mockReturnValue({ single: updateSingleMock });
    const updateEqInstanceMock = vi.fn().mockReturnValue({ select: updateSelectMock });
    const updateEqIdMock = vi.fn().mockReturnValue({ eq: updateEqInstanceMock });
    const dayUpdateMock = vi.fn().mockReturnValue({ eq: updateEqIdMock });

    const targetMaybeSingleMock = vi.fn().mockResolvedValue({ data: null, error: null });
    const targetEqDateMock = vi.fn().mockReturnValue({ maybeSingle: targetMaybeSingleMock });
    const targetEqInstanceMock = vi.fn().mockReturnValue({ eq: targetEqDateMock });
    const targetSelectMock = vi.fn().mockReturnValue({ eq: targetEqInstanceMock });

    let weeklyPlanDaysFromCount = 0;
    getSupabaseMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "weekly_plan_instances") {
          return { select: instanceSelectMock };
        }
        if (table === "weekly_plan_days") {
          weeklyPlanDaysFromCount += 1;
          if (weeklyPlanDaysFromCount === 1) return { select: dayLookupSelectMock };
          if (weeklyPlanDaysFromCount === 2) return { select: targetSelectMock };
          return { update: dayUpdateMock };
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    });

    const out = await updatePlanDayDate({
      userId: "user-1",
      weeklyPlanInstanceId: "inst-1",
      dayId: "day-1",
      newDate: "2026-04-21",
    });

    expect(instanceEqIdMock).toHaveBeenCalledWith("id", "inst-1");
    expect(instanceEqUserMock).toHaveBeenCalledWith("user_id", "user-1");
    expect(dayLookupEqInstanceMock).toHaveBeenCalledWith("weekly_plan_instance_id", "inst-1");
    expect(dayLookupEqIdMock).toHaveBeenCalledWith("id", "day-1");
    expect(targetEqDateMock).toHaveBeenCalledWith("date", "2026-04-21");
    expect(dayUpdateMock).toHaveBeenCalledWith({ date: "2026-04-21" });
    expect(updateEqIdMock).toHaveBeenCalledWith("id", "day-1");
    expect(updateEqInstanceMock).toHaveBeenCalledWith("weekly_plan_instance_id", "inst-1");
    expect(out).toEqual({
      id: "day-1",
      date: "2026-04-21",
      intentLabel: "Strength",
      status: "planned",
      generatedWorkoutId: "w-1",
    });
  });

  it("supports selecting the day by existing date", async () => {
    const instanceMaybeSingleMock = vi
      .fn()
      .mockResolvedValue({ data: { id: "inst-2" }, error: null });
    const instanceEqUserMock = vi.fn().mockReturnValue({ maybeSingle: instanceMaybeSingleMock });
    const instanceEqIdMock = vi.fn().mockReturnValue({ eq: instanceEqUserMock });
    const instanceSelectMock = vi.fn().mockReturnValue({ eq: instanceEqIdMock });

    const dayLookupMaybeSingleMock = vi.fn().mockResolvedValue({
      data: {
        id: "day-2",
        date: "2026-04-23",
        intent_label: "Endurance",
        status: "completed",
        generated_workout_id: "w-2",
      },
      error: null,
    });
    const dayLookupEqDateMock = vi.fn().mockReturnValue({ maybeSingle: dayLookupMaybeSingleMock });
    const dayLookupEqInstanceMock = vi.fn().mockReturnValue({ eq: dayLookupEqDateMock });
    const dayLookupSelectMock = vi.fn().mockReturnValue({ eq: dayLookupEqInstanceMock });

    const updateSingleMock = vi.fn().mockResolvedValue({
      data: {
        id: "day-2",
        date: "2026-04-24",
        intent_label: "Endurance",
        status: "completed",
        generated_workout_id: "w-2",
      },
      error: null,
    });
    const updateSelectMock = vi.fn().mockReturnValue({ single: updateSingleMock });
    const updateEqInstanceMock = vi.fn().mockReturnValue({ select: updateSelectMock });
    const updateEqIdMock = vi.fn().mockReturnValue({ eq: updateEqInstanceMock });
    const dayUpdateMock = vi.fn().mockReturnValue({ eq: updateEqIdMock });

    const targetMaybeSingleMock = vi.fn().mockResolvedValue({ data: null, error: null });
    const targetEqDateMock = vi.fn().mockReturnValue({ maybeSingle: targetMaybeSingleMock });
    const targetEqInstanceMock = vi.fn().mockReturnValue({ eq: targetEqDateMock });
    const targetSelectMock = vi.fn().mockReturnValue({ eq: targetEqInstanceMock });

    let weeklyPlanDaysFromCount = 0;
    getSupabaseMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "weekly_plan_instances") {
          return { select: instanceSelectMock };
        }
        if (table === "weekly_plan_days") {
          weeklyPlanDaysFromCount += 1;
          if (weeklyPlanDaysFromCount === 1) return { select: dayLookupSelectMock };
          if (weeklyPlanDaysFromCount === 2) return { select: targetSelectMock };
          return { update: dayUpdateMock };
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    });

    await updatePlanDayDate({
      userId: "user-2",
      weeklyPlanInstanceId: "inst-2",
      date: "2026-04-23",
      newDate: "2026-04-24",
    });

    expect(dayLookupEqDateMock).toHaveBeenCalledWith("date", "2026-04-23");
    expect(targetEqDateMock).toHaveBeenCalledWith("date", "2026-04-24");
  });

  it("throws when the instance does not belong to the user", async () => {
    const instanceMaybeSingleMock = vi.fn().mockResolvedValue({ data: null, error: null });
    const instanceEqUserMock = vi.fn().mockReturnValue({ maybeSingle: instanceMaybeSingleMock });
    const instanceEqIdMock = vi.fn().mockReturnValue({ eq: instanceEqUserMock });
    const instanceSelectMock = vi.fn().mockReturnValue({ eq: instanceEqIdMock });

    getSupabaseMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "weekly_plan_instances") {
          return { select: instanceSelectMock };
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    });

    await expect(
      updatePlanDayDate({
        userId: "user-3",
        weeklyPlanInstanceId: "inst-3",
        dayId: "day-3",
        newDate: "2026-04-25",
      })
    ).rejects.toThrow("Weekly plan instance not found for this user.");
  });

  it("throws when another day already exists on target date", async () => {
    const instanceMaybeSingleMock = vi
      .fn()
      .mockResolvedValue({ data: { id: "inst-4" }, error: null });
    const instanceEqUserMock = vi.fn().mockReturnValue({ maybeSingle: instanceMaybeSingleMock });
    const instanceEqIdMock = vi.fn().mockReturnValue({ eq: instanceEqUserMock });
    const instanceSelectMock = vi.fn().mockReturnValue({ eq: instanceEqIdMock });

    const dayLookupMaybeSingleMock = vi.fn().mockResolvedValue({
      data: {
        id: "day-4",
        date: "2026-04-24",
        intent_label: "Recovery",
        status: "planned",
        generated_workout_id: "w-4",
      },
      error: null,
    });
    const dayLookupEqIdMock = vi.fn().mockReturnValue({ maybeSingle: dayLookupMaybeSingleMock });
    const dayLookupEqInstanceMock = vi.fn().mockReturnValue({ eq: dayLookupEqIdMock });
    const dayLookupSelectMock = vi.fn().mockReturnValue({ eq: dayLookupEqInstanceMock });

    const targetMaybeSingleMock = vi.fn().mockResolvedValue({
      data: { id: "day-other" },
      error: null,
    });
    const targetEqDateMock = vi.fn().mockReturnValue({ maybeSingle: targetMaybeSingleMock });
    const targetEqInstanceMock = vi.fn().mockReturnValue({ eq: targetEqDateMock });
    const targetSelectMock = vi.fn().mockReturnValue({ eq: targetEqInstanceMock });

    let weeklyPlanDaysFromCount = 0;
    getSupabaseMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "weekly_plan_instances") {
          return { select: instanceSelectMock };
        }
        if (table === "weekly_plan_days") {
          weeklyPlanDaysFromCount += 1;
          if (weeklyPlanDaysFromCount === 1) return { select: dayLookupSelectMock };
          return { select: targetSelectMock };
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    });

    await expect(
      updatePlanDayDate({
        userId: "user-4",
        weeklyPlanInstanceId: "inst-4",
        dayId: "day-4",
        newDate: "2026-04-25",
      })
    ).rejects.toThrow("A plan day already exists on the target date.");

    expect(targetEqDateMock).toHaveBeenCalledWith("date", "2026-04-25");
  });
});
