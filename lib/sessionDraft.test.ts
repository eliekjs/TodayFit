import { describe, expect, it } from "vitest";
import {
  buildContinueEditingLabel,
  buildSessionBannerDetails,
  buildSessionSummary,
  createSessionDraft,
  getSessionResumeRoute,
  inferSessionPhase,
  isCreateEditingFlowScreen,
  isCreateTabHome,
  isSessionFlowScreen,
  shouldShowSessionResumeBanner,
  sessionFlowFromManualScope,
  weekSetupAtPickDays,
} from "./sessionDraft";
import {
  activeTrainingOverviewLabel,
  editActivePlanHref,
  isEditFromWorkoutTab,
  sportReviewBackLabel,
  sportReviewBackRoute,
} from "./sessionFlowNav";
import { defaultManualPreferences } from "../context/appStateModel";

describe("sessionDraft", () => {
  it("maps manual scope to session flow", () => {
    expect(sessionFlowFromManualScope("day")).toBe("goal_day");
    expect(sessionFlowFromManualScope("week")).toBe("goal_week");
  });

  it("builds short banner details from goal and scope", () => {
    expect(
      buildSessionBannerDetails({
        flow: "goal_day",
        preferences: {
          ...defaultManualPreferences,
          primaryFocus: ["Build strength", "Get stronger"],
        },
        adaptiveSetup: null,
      })
    ).toBe("Build strength · Day");

    expect(
      buildSessionBannerDetails({
        flow: "sport_week",
        preferences: defaultManualPreferences,
        adaptiveSetup: {
          rankedGoals: [null, null, null],
          intensityLevel: "Moderate",
          injuryStatus: "No Concerns",
          injuryTypes: [],
          rankedSportSlugs: ["rock_climbing", null, null],
          subFocusBySport: {},
          sportFocusPct: [60, 40],
        },
      })
    ).toBe("Rock Climbing · Week");
  });

  it("builds continue-editing labels for create resume", () => {
    expect(
      buildContinueEditingLabel({
        flow: "goal_day",
        preferences: {
          ...defaultManualPreferences,
          primaryFocus: ["Build strength"],
        },
        adaptiveSetup: null,
      })
    ).toBe("Continue editing Build strength workout");

    expect(
      buildContinueEditingLabel({
        flow: "sport_week",
        preferences: defaultManualPreferences,
        adaptiveSetup: {
          rankedGoals: [null, null, null],
          intensityLevel: "Moderate",
          injuryStatus: "No Concerns",
          injuryTypes: [],
          rankedSportSlugs: ["rock_climbing", null, null],
          subFocusBySport: {},
          sportFocusPct: [60, 40],
        },
      })
    ).toBe("Continue editing Rock Climbing week");
  });

  it("builds human-readable summary from preferences", () => {
    const summary = buildSessionSummary(
      {
        ...defaultManualPreferences,
        primaryFocus: ["Build muscle", "Get stronger"],
        targetBody: "Upper",
        durationMinutes: 45,
      },
      "goal_day",
      "Home gym"
    );
    expect(summary).toContain("Build muscle");
    expect(summary).toContain("Get stronger");
    expect(summary).not.toMatch(/\+\d/);
    expect(summary).toContain("45 min");
    expect(summary).toContain("Home gym");
  });

  it("infers review phase when generated workout exists", () => {
    expect(
      inferSessionPhase({
        flow: "goal_day",
        generatedWorkout: { id: "w1" },
        manualWeekPlan: null,
        sportPrepWeekPlan: null,
        manualExecutionStarted: false,
        weekSetup: null,
        adaptiveSetup: null,
      })
    ).toBe("review");
  });

  it("routes week setup to week screen when entered", () => {
    const draft = createSessionDraft({
      flow: "goal_week",
      preferences: defaultManualPreferences,
      gymProfileId: null,
      weekSetup: {
        enteredWeekScreen: true,
        step: "pickDays",
        selectedTrainingDays: [0, 2, 4],
        dayFocusChoiceIds: [],
      },
    });
    expect(getSessionResumeRoute(draft)).toBe("/manual/week");
  });

  it("reopens weekday picking without clearing selected days", () => {
    const ws = {
      enteredWeekScreen: true,
      step: "sessionFocus" as const,
      selectedTrainingDays: [1, 3, 5],
      dayFocusChoiceIds: ["goal_emphasis_0", "goal_emphasis_1", "balanced_goals"],
      dayBodyFocusChoiceIds: ["glutes", "shoulders", "full"],
    };
    expect(weekSetupAtPickDays(ws)).toEqual({ ...ws, step: "pickDays" });
    const alreadyAtPickDays = { ...ws, step: "pickDays" as const };
    expect(weekSetupAtPickDays(alreadyAtPickDays)).toBe(alreadyAtPickDays);
  });

  it("routes sport review without a plan back to setup, not recommendation", () => {
    const draft = createSessionDraft({
      flow: "sport_week",
      preferences: defaultManualPreferences,
      gymProfileId: null,
      phase: "review",
      adaptiveSetup: {
        rankedGoals: [null, null, null],
        intensityLevel: "Moderate",
        injuryStatus: "No Concerns",
        injuryTypes: [],
        rankedSportSlugs: ["basketball", null, null],
        subFocusBySport: {},
        sportFocusPct: [60, 40],
      },
    });
    expect(getSessionResumeRoute(draft, null)).toBe("/sport-mode/schedule");
    expect(getSessionResumeRoute(draft, { days: [] })).toBe("/sport-mode/recommendation");
  });

  it("routes one-day sport review without a plan to day setup", () => {
    const draft = createSessionDraft({
      flow: "sport_day",
      preferences: defaultManualPreferences,
      gymProfileId: null,
      phase: "review",
    });
    expect(getSessionResumeRoute(draft, null)).toBe("/sport-mode?scope=day");
  });

  it("shows resume banner only on Create tab home while building", () => {
    expect(shouldShowSessionResumeBanner("/", { phase: "setup" })).toBe(true);
    expect(shouldShowSessionResumeBanner("/", { phase: "review" })).toBe(true);
    expect(shouldShowSessionResumeBanner("/", { phase: "train" })).toBe(false);
    expect(shouldShowSessionResumeBanner("/library", { phase: "setup" })).toBe(false);
    expect(shouldShowSessionResumeBanner("/workout", { phase: "review" })).toBe(false);
    expect(shouldShowSessionResumeBanner("/profiles", { phase: "setup" })).toBe(false);
    expect(shouldShowSessionResumeBanner("/manual/preferences", { phase: "setup" })).toBe(false);
    expect(isCreateTabHome("/")).toBe(true);
    expect(isCreateTabHome("/workout")).toBe(false);
    expect(isSessionFlowScreen("/sport-mode/schedule")).toBe(true);
    expect(isCreateEditingFlowScreen("manual/preferences")).toBe(true);
    expect(isCreateEditingFlowScreen("manual/week")).toBe(true);
    expect(isCreateEditingFlowScreen("sport-mode/schedule")).toBe(true);
    expect(isCreateEditingFlowScreen("manual/execute")).toBe(false);
  });

  it("routes sport review back to schedule for week flow", () => {
    expect(
      sportReviewBackRoute({
        sportPrepWeekPlan: { scheduleSnapshot: { gymDaysPerWeek: 3 } },
        adaptiveSetup: {
          rankedGoals: [null, null, null],
          intensityLevel: "Moderate",
          injuryStatus: "No Concerns",
          injuryTypes: [],
          rankedSportSlugs: ["basketball", null, null],
          subFocusBySport: {},
          sportFocusPct: [60, 40],
        },
      })
    ).toBe("/sport-mode/schedule");
    expect(
      sportReviewBackLabel({
        sportPrepWeekPlan: { scheduleSnapshot: { gymDaysPerWeek: 3 } },
        adaptiveSetup: {
          rankedGoals: [null, null, null],
          intensityLevel: "Moderate",
          injuryStatus: "No Concerns",
          injuryTypes: [],
          rankedSportSlugs: ["basketball", null, null],
          subFocusBySport: {},
          sportFocusPct: [60, 40],
        },
      })
    ).toBe("Your schedule");
  });


  it("routes sport review back to schedule when week plan exists without adaptiveSetup", () => {
    expect(
      sportReviewBackRoute({
        sportPrepWeekPlan: { scheduleSnapshot: { gymDaysPerWeek: 3 } },
        adaptiveSetup: null,
      })
    ).toBe("/sport-mode/schedule");
    expect(
      sportReviewBackLabel({
        sportPrepWeekPlan: { scheduleSnapshot: { gymDaysPerWeek: 3 } },
        adaptiveSetup: null,
      })
    ).toBe("Your schedule");
  });

  it("routes one-day sport review back to day setup", () => {
    expect(
      sportReviewBackRoute({
        sportPrepWeekPlan: { scheduleSnapshot: { gymDaysPerWeek: 1 } },
        adaptiveSetup: null,
      })
    ).toBe("/sport-mode?scope=day");
  });

  it("routes sport review back to Workout overview when editing from the Workout tab", () => {
    expect(
      sportReviewBackRoute({
        sportPrepWeekPlan: { scheduleSnapshot: { gymDaysPerWeek: 3 } },
        adaptiveSetup: null,
        fromWorkoutTab: true,
      })
    ).toBe("/workout");
    expect(
      sportReviewBackLabel({
        sportPrepWeekPlan: { scheduleSnapshot: { gymDaysPerWeek: 3 } },
        adaptiveSetup: null,
        fromWorkoutTab: true,
      })
    ).toBe("Your week");
    expect(
      sportReviewBackLabel({
        sportPrepWeekPlan: { scheduleSnapshot: { gymDaysPerWeek: 1 } },
        adaptiveSetup: null,
        fromWorkoutTab: true,
      })
    ).toBe("Your workout");
  });
});

describe("edit from Workout tab", () => {
  it("tags editor hrefs and detects the from=workout flag", () => {
    expect(editActivePlanHref("/manual/week")).toBe("/manual/week?from=workout");
    expect(editActivePlanHref("/sport-mode/recommendation?x=1")).toBe(
      "/sport-mode/recommendation?x=1&from=workout"
    );
    expect(isEditFromWorkoutTab({ from: "workout" })).toBe(true);
    expect(isEditFromWorkoutTab({ from: ["workout"] })).toBe(true);
    expect(isEditFromWorkoutTab({ from: "create" })).toBe(false);
    expect(isEditFromWorkoutTab({})).toBe(false);
  });

  it("labels the active training overview for week vs day", () => {
    expect(activeTrainingOverviewLabel({ singleDay: false })).toBe("Your week");
    expect(activeTrainingOverviewLabel({ singleDay: true })).toBe("Your workout");
  });
});
