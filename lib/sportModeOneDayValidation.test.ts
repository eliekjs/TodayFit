import { describe, expect, it } from "vitest";
import {
  isOneDaySportModeCombinationValid,
  validateSportFormForScope,
} from "./sportModeOneDayValidation";

describe("isOneDaySportModeCombinationValid", () => {
  it("allows two sports with no fitness goals", () => {
    expect(
      isOneDaySportModeCombinationValid({
        sportCount: 2,
        goalCount: 0,
        sportSubGoalCount: 0,
      })
    ).toBe(true);
  });

  it("allows one sport plus one fitness goal", () => {
    expect(
      isOneDaySportModeCombinationValid({
        sportCount: 1,
        goalCount: 1,
        sportSubGoalCount: 0,
      })
    ).toBe(true);
  });

  it("allows one sport with sport sub-focuses and no fitness goal", () => {
    expect(
      isOneDaySportModeCombinationValid({
        sportCount: 1,
        goalCount: 0,
        sportSubGoalCount: 1,
      })
    ).toBe(true);
    expect(
      isOneDaySportModeCombinationValid({
        sportCount: 1,
        goalCount: 0,
        sportSubGoalCount: 2,
      })
    ).toBe(true);
    expect(
      isOneDaySportModeCombinationValid({
        sportCount: 1,
        goalCount: 0,
        sportSubGoalCount: 3,
      })
    ).toBe(true);
  });

  it("rejects one sport alone without sub-focuses or a fitness goal", () => {
    expect(
      isOneDaySportModeCombinationValid({
        sportCount: 1,
        goalCount: 0,
        sportSubGoalCount: 0,
      })
    ).toBe(false);
  });

  it("rejects invalid sport counts", () => {
    expect(
      isOneDaySportModeCombinationValid({
        sportCount: 0,
        goalCount: 0,
        sportSubGoalCount: 2,
      })
    ).toBe(false);
    expect(
      isOneDaySportModeCombinationValid({
        sportCount: 3,
        goalCount: 0,
        sportSubGoalCount: 2,
      })
    ).toBe(false);
  });
});

describe("validateSportFormForScope", () => {
  it("never flags week scope, regardless of selections", () => {
    expect(
      validateSportFormForScope(
        {
          rankedSportSlugs: ["basketball", "soccer"],
          rankedGoals: ["strength", "muscle", "endurance"],
          subFocusBySport: { basketball: ["a", "b", "c"], soccer: ["d", "e"] },
        },
        "week"
      )
    ).toEqual([]);
  });

  it("passes a form saved for one-day mode (1 sport + 1 goal) unchanged", () => {
    expect(
      validateSportFormForScope(
        {
          rankedSportSlugs: ["basketball", null],
          rankedGoals: ["strength", null, null],
          subFocusBySport: {},
        },
        "day"
      )
    ).toEqual([]);
  });

  it("flags a week-scale preset (2 sports + goals) when applied to one day", () => {
    const issues = validateSportFormForScope(
      {
        rankedSportSlugs: ["basketball", "soccer"],
        rankedGoals: ["strength", "muscle", null],
        subFocusBySport: {},
      },
      "day"
    );
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.some((i) => i.id === "combination")).toBe(true);
  });

  it("flags too many total sub-focus picks for one day even with a valid combination", () => {
    const issues = validateSportFormForScope(
      {
        rankedSportSlugs: ["basketball", "soccer"],
        rankedGoals: [null, null, null],
        // Shared Goal↔Sport ceiling is 5; six exceeds it.
        subFocusBySport: {
          basketball: ["a", "b", "c"],
          soccer: ["d", "e", "f"],
        },
      },
      "day"
    );
    expect(issues.some((i) => i.id === "combination")).toBe(false);
    expect(issues.some((i) => i.id === "sub_goal_cap")).toBe(true);
  });

  it("allows up to the shared sub-goal ceiling on one day", () => {
    const issues = validateSportFormForScope(
      {
        rankedSportSlugs: ["basketball", "soccer"],
        rankedGoals: [null, null, null],
        subFocusBySport: { basketball: ["a", "b", "c"], soccer: ["d", "e"] },
      },
      "day"
    );
    expect(issues.some((i) => i.id === "sub_goal_cap")).toBe(false);
  });
});
