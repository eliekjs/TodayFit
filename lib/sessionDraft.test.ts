import { describe, expect, it } from "vitest";
import {
  buildSessionSummary,
  createSessionDraft,
  getSessionResumeRoute,
  inferSessionPhase,
  isSessionResumeCardScreen,
  sessionFlowFromManualScope,
} from "./sessionDraft";
import { defaultManualPreferences } from "../context/appStateModel";

describe("sessionDraft", () => {
  it("maps manual scope to session flow", () => {
    expect(sessionFlowFromManualScope("day")).toBe("goal_day");
    expect(sessionFlowFromManualScope("week")).toBe("goal_week");
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

  it("shows resume card only on tab root screens", () => {
    expect(isSessionResumeCardScreen("/")).toBe(true);
    expect(isSessionResumeCardScreen("/library")).toBe(true);
    expect(isSessionResumeCardScreen("/manual/preferences")).toBe(false);
  });
});
