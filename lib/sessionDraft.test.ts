import { describe, expect, it } from "vitest";
import {
  buildSessionBannerDetails,
  buildSessionSummary,
  createSessionDraft,
  getSessionResumeRoute,
  inferSessionPhase,
  isSessionFlowScreen,
  shouldShowSessionResumeBanner,
  sessionFlowFromManualScope,
} from "./sessionDraft";
import { sportReviewBackLabel, sportReviewBackRoute } from "./sessionFlowNav";
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

  it("shows resume banner only outside flow screens", () => {
    expect(shouldShowSessionResumeBanner("/")).toBe(true);
    expect(shouldShowSessionResumeBanner("/library")).toBe(true);
    expect(shouldShowSessionResumeBanner("/manual/preferences")).toBe(false);
    expect(isSessionFlowScreen("/sport-mode/schedule")).toBe(true);
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
});
