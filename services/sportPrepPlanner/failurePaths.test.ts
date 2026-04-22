import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getSupabaseMock,
  isDbConfiguredMock,
  buildWorkoutForSessionIntentMock,
  saveGeneratedWorkoutMock,
  deleteWorkoutMock,
} = vi.hoisted(() => ({
  getSupabaseMock: vi.fn(),
  isDbConfiguredMock: vi.fn(),
  buildWorkoutForSessionIntentMock: vi.fn(),
  saveGeneratedWorkoutMock: vi.fn(),
  deleteWorkoutMock: vi.fn(),
}));

vi.mock("../../lib/db", () => ({
  getSupabase: getSupabaseMock,
  isDbConfigured: isDbConfiguredMock,
}));

vi.mock("../workoutBuilder", () => ({
  buildWorkoutForSessionIntent: buildWorkoutForSessionIntentMock,
}));

vi.mock("../../lib/db/workoutRepository", () => ({
  saveGeneratedWorkout: saveGeneratedWorkoutMock,
  deleteWorkout: deleteWorkoutMock,
  getWorkout: vi.fn(),
}));

import { planWeek, regenerateDay, updateDayStatus } from "./index";

describe("sportPrepPlanner failure paths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isDbConfiguredMock.mockReturnValue(true);
  });

  describe("planWeek", () => {
    it("throws when db is not configured", async () => {
      isDbConfiguredMock.mockReturnValue(false);

      await expect(
        planWeek({
          userId: "user-1",
          primaryGoalSlug: null,
          gymDaysPerWeek: 0,
          defaultSessionDuration: 45,
          energyBaseline: "medium",
        })
      ).rejects.toThrow("Supabase is not configured");
    });

    it("surfaces training plan insert failures", async () => {
      const insertSingleMock = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "training plan insert failed" },
      });
      const insertSelectMock = vi.fn().mockReturnValue({ single: insertSingleMock });
      const insertMock = vi.fn().mockReturnValue({ select: insertSelectMock });

      getSupabaseMock.mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === "user_training_plans") return { insert: insertMock };
          throw new Error(`Unexpected table: ${table}`);
        }),
      });

      await expect(
        planWeek({
          userId: "user-1",
          primaryGoalSlug: null,
          gymDaysPerWeek: 0,
          defaultSessionDuration: 45,
          energyBaseline: "medium",
        })
      ).rejects.toThrow("training plan insert failed");
    });

    it("propagates weekly_plan_days insert failures after workout saves begin", async () => {
      const planInsertSingleMock = vi.fn().mockResolvedValue({
        data: { id: "plan-1" },
        error: null,
      });
      const planInsertSelectMock = vi.fn().mockReturnValue({ single: planInsertSingleMock });
      const planInsertMock = vi.fn().mockReturnValue({ select: planInsertSelectMock });

      const instanceInsertSingleMock = vi.fn().mockResolvedValue({
        data: { id: "inst-1" },
        error: null,
      });
      const instanceInsertSelectMock = vi.fn().mockReturnValue({ single: instanceInsertSingleMock });
      const instanceInsertMock = vi.fn().mockReturnValue({ select: instanceInsertSelectMock });

      const dayRowsInsertSelectMock = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "weekly_plan_days insert failed" },
      });
      const dayRowsInsertMock = vi.fn().mockReturnValue({ select: dayRowsInsertSelectMock });

      const cleanupDaysDeleteEqMock = vi.fn().mockResolvedValue({ error: null });
      const cleanupDaysDeleteMock = vi.fn().mockReturnValue({ eq: cleanupDaysDeleteEqMock });

      const cleanupInstanceDeleteEqMock = vi.fn().mockResolvedValue({ error: null });
      const cleanupInstanceDeleteMock = vi.fn().mockReturnValue({ eq: cleanupInstanceDeleteEqMock });

      const cleanupPlanDeleteEqUserMock = vi.fn().mockResolvedValue({ error: null });
      const cleanupPlanDeleteEqIdMock = vi
        .fn()
        .mockReturnValue({ eq: cleanupPlanDeleteEqUserMock });
      const cleanupPlanDeleteMock = vi.fn().mockReturnValue({ eq: cleanupPlanDeleteEqIdMock });

      getSupabaseMock.mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === "user_training_plans") {
            return { insert: planInsertMock, delete: cleanupPlanDeleteMock };
          }
          if (table === "weekly_plan_instances") {
            return { insert: instanceInsertMock, delete: cleanupInstanceDeleteMock };
          }
          if (table === "weekly_plan_days") {
            return { insert: dayRowsInsertMock, delete: cleanupDaysDeleteMock };
          }
          throw new Error(`Unexpected table: ${table}`);
        }),
      });

      buildWorkoutForSessionIntentMock.mockResolvedValue({
        id: "generated-1",
        focus: ["Build Strength"],
        durationMinutes: 60,
        energyLevel: "medium",
        blocks: [],
      });
      saveGeneratedWorkoutMock.mockResolvedValue("w-new-1");
      deleteWorkoutMock.mockResolvedValue(undefined);

      await expect(
        planWeek({
          userId: "user-1",
          primaryGoalSlug: null,
          gymDaysPerWeek: 1,
          defaultSessionDuration: 45,
          energyBaseline: "medium",
        })
      ).rejects.toThrow("weekly_plan_days insert failed");

      expect(saveGeneratedWorkoutMock).toHaveBeenCalledTimes(1);
      expect(dayRowsInsertMock).toHaveBeenCalledTimes(1);
      expect(cleanupDaysDeleteEqMock).toHaveBeenCalledWith("weekly_plan_instance_id", "inst-1");
      expect(deleteWorkoutMock).toHaveBeenCalledWith("user-1", "w-new-1");
      expect(cleanupInstanceDeleteEqMock).toHaveBeenCalledWith("id", "inst-1");
      expect(cleanupPlanDeleteEqIdMock).toHaveBeenCalledWith("id", "plan-1");
      expect(cleanupPlanDeleteEqUserMock).toHaveBeenCalledWith("user_id", "user-1");
    });
  });

  describe("regenerateDay", () => {
    it("throws when db is not configured", async () => {
      isDbConfiguredMock.mockReturnValue(false);

      await expect(
        regenerateDay({
          userId: "user-1",
          weeklyPlanInstanceId: "inst-1",
          date: "2026-04-22",
        })
      ).rejects.toThrow("Supabase is not configured");
    });

    it("throws when the plan day row is missing", async () => {
      const maybeSingleMock = vi.fn().mockResolvedValue({ data: null, error: null });
      const eqDateMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
      const eqInstanceMock = vi.fn().mockReturnValue({ eq: eqDateMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqInstanceMock });

      getSupabaseMock.mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === "weekly_plan_days") return { select: selectMock };
          throw new Error(`Unexpected table: ${table}`);
        }),
      });

      await expect(
        regenerateDay({
          userId: "user-1",
          weeklyPlanInstanceId: "inst-1",
          date: "2026-04-22",
        })
      ).rejects.toThrow("Plan day not found for given instance and date.");

      expect(buildWorkoutForSessionIntentMock).not.toHaveBeenCalled();
      expect(saveGeneratedWorkoutMock).not.toHaveBeenCalled();
    });

    it("propagates weekly_plan_days update failures after workout save", async () => {
      const lookupMaybeSingleMock = vi.fn().mockResolvedValue({
        data: {
          id: "day-1",
          date: "2026-04-22",
          intent_label: "Strength",
          status: "planned",
          generated_workout_id: "w-old",
          weekly_plan_instance_id: "inst-1",
        },
        error: null,
      });
      const lookupEqDateMock = vi.fn().mockReturnValue({ maybeSingle: lookupMaybeSingleMock });
      const lookupEqInstanceMock = vi.fn().mockReturnValue({ eq: lookupEqDateMock });
      const lookupSelectMock = vi.fn().mockReturnValue({ eq: lookupEqInstanceMock });

      const updateSingleMock = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "weekly day update failed" },
      });
      const updateSelectMock = vi.fn().mockReturnValue({ single: updateSingleMock });
      const updateEqIdMock = vi.fn().mockReturnValue({ select: updateSelectMock });
      const updateMock = vi.fn().mockReturnValue({ eq: updateEqIdMock });

      let weeklyPlanDaysFromCount = 0;
      getSupabaseMock.mockReturnValue({
        from: vi.fn((table: string) => {
          if (table !== "weekly_plan_days") throw new Error(`Unexpected table: ${table}`);
          weeklyPlanDaysFromCount += 1;
          if (weeklyPlanDaysFromCount === 1) return { select: lookupSelectMock };
          return { update: updateMock };
        }),
      });

      buildWorkoutForSessionIntentMock.mockResolvedValue({
        id: "generated-1",
        focus: ["Build Strength"],
        durationMinutes: 60,
        energyLevel: "medium",
        blocks: [],
      });
      saveGeneratedWorkoutMock.mockResolvedValue("w-new");

      await expect(
        regenerateDay({
          userId: "user-1",
          weeklyPlanInstanceId: "inst-1",
          date: "2026-04-22",
        })
      ).rejects.toThrow("weekly day update failed");

      expect(saveGeneratedWorkoutMock).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({ id: "generated-1" })
      );
    });

    it("propagates saveGeneratedWorkout failures", async () => {
      const lookupMaybeSingleMock = vi.fn().mockResolvedValue({
        data: {
          id: "day-1",
          date: "2026-04-22",
          intent_label: "Strength",
          status: "planned",
          generated_workout_id: "w-old",
          weekly_plan_instance_id: "inst-1",
        },
        error: null,
      });
      const lookupEqDateMock = vi.fn().mockReturnValue({ maybeSingle: lookupMaybeSingleMock });
      const lookupEqInstanceMock = vi.fn().mockReturnValue({ eq: lookupEqDateMock });
      const lookupSelectMock = vi.fn().mockReturnValue({ eq: lookupEqInstanceMock });

      const updateSingleMock = vi.fn();
      const updateSelectMock = vi.fn().mockReturnValue({ single: updateSingleMock });
      const updateEqIdMock = vi.fn().mockReturnValue({ select: updateSelectMock });
      const updateMock = vi.fn().mockReturnValue({ eq: updateEqIdMock });

      let weeklyPlanDaysFromCount = 0;
      getSupabaseMock.mockReturnValue({
        from: vi.fn((table: string) => {
          if (table !== "weekly_plan_days") throw new Error(`Unexpected table: ${table}`);
          weeklyPlanDaysFromCount += 1;
          if (weeklyPlanDaysFromCount === 1) return { select: lookupSelectMock };
          return { update: updateMock };
        }),
      });

      buildWorkoutForSessionIntentMock.mockResolvedValue({
        id: "generated-1",
        focus: ["Build Strength"],
        durationMinutes: 60,
        energyLevel: "medium",
        blocks: [],
      });
      saveGeneratedWorkoutMock.mockRejectedValue(new Error("save workout failed"));

      await expect(
        regenerateDay({
          userId: "user-1",
          weeklyPlanInstanceId: "inst-1",
          date: "2026-04-22",
        })
      ).rejects.toThrow("save workout failed");

      expect(updateMock).not.toHaveBeenCalled();
    });
  });

  describe("updateDayStatus", () => {
    it("throws when db is not configured", async () => {
      isDbConfiguredMock.mockReturnValue(false);

      await expect(
        updateDayStatus({
          userId: "user-1",
          weeklyPlanInstanceId: "inst-1",
          date: "2026-04-22",
          status: "completed",
        })
      ).rejects.toThrow("Supabase is not configured");
    });

    it("throws when the plan day row is missing", async () => {
      const maybeSingleMock = vi.fn().mockResolvedValue({ data: null, error: null });
      const eqDateMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
      const eqInstanceMock = vi.fn().mockReturnValue({ eq: eqDateMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqInstanceMock });

      getSupabaseMock.mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === "weekly_plan_days") return { select: selectMock };
          throw new Error(`Unexpected table: ${table}`);
        }),
      });

      await expect(
        updateDayStatus({
          userId: "user-1",
          weeklyPlanInstanceId: "inst-1",
          date: "2026-04-22",
          status: "skipped",
        })
      ).rejects.toThrow("Plan day not found for given instance and date.");
    });

    it("propagates weekly_plan_days select query errors", async () => {
      const maybeSingleMock = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "day select failed" },
      });
      const eqDateMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
      const eqInstanceMock = vi.fn().mockReturnValue({ eq: eqDateMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqInstanceMock });

      const updateMock = vi.fn();
      getSupabaseMock.mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === "weekly_plan_days") return { select: selectMock, update: updateMock };
          throw new Error(`Unexpected table: ${table}`);
        }),
      });

      await expect(
        updateDayStatus({
          userId: "user-1",
          weeklyPlanInstanceId: "inst-1",
          date: "2026-04-22",
          status: "completed",
        })
      ).rejects.toThrow("day select failed");

      expect(updateMock).not.toHaveBeenCalled();
    });

    it("surfaces weekly_plan_days status update failures", async () => {
      const lookupMaybeSingleMock = vi.fn().mockResolvedValue({
        data: {
          id: "day-1",
          date: "2026-04-22",
          intent_label: "Strength",
          status: "planned",
          generated_workout_id: "w-1",
        },
        error: null,
      });
      const lookupEqDateMock = vi.fn().mockReturnValue({ maybeSingle: lookupMaybeSingleMock });
      const lookupEqInstanceMock = vi.fn().mockReturnValue({ eq: lookupEqDateMock });
      const lookupSelectMock = vi.fn().mockReturnValue({ eq: lookupEqInstanceMock });

      const updateSingleMock = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "status update failed" },
      });
      const updateSelectMock = vi.fn().mockReturnValue({ single: updateSingleMock });
      const updateEqIdMock = vi.fn().mockReturnValue({ select: updateSelectMock });
      const updateMock = vi.fn().mockReturnValue({ eq: updateEqIdMock });

      let weeklyPlanDaysFromCount = 0;
      getSupabaseMock.mockReturnValue({
        from: vi.fn((table: string) => {
          if (table !== "weekly_plan_days") throw new Error(`Unexpected table: ${table}`);
          weeklyPlanDaysFromCount += 1;
          if (weeklyPlanDaysFromCount === 1) return { select: lookupSelectMock };
          return { update: updateMock };
        }),
      });

      await expect(
        updateDayStatus({
          userId: "user-1",
          weeklyPlanInstanceId: "inst-1",
          date: "2026-04-22",
          status: "completed",
        })
      ).rejects.toThrow("status update failed");
    });
  });
});
