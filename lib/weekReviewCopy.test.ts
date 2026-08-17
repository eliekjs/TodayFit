import { describe, expect, it } from "vitest";
import {
  REVIEW_AND_ADJUST_HINT,
  reviewAndAdjustHint,
  saveAndExecuteHint,
  saveAndExecuteLabel,
  startPromptBody,
  startPromptConfirmLabel,
  startPromptTitle,
} from "./weekReviewCopy";
import type { WeekDayToStart } from "./weekProgress";

function target(date: string, isToday: boolean, title = "Upper Strength"): WeekDayToStart {
  return {
    isToday,
    day: {
      id: date,
      date,
      title,
      status: "planned",
      hasGymWorkout: true,
      isSportDay: false,
      workout: null,
    },
  };
}

describe("reviewAndAdjustHint", () => {
  it("always tells the user they can adjust below", () => {
    expect(reviewAndAdjustHint({ multipleDays: false })).toContain(REVIEW_AND_ADJUST_HINT);
    expect(reviewAndAdjustHint({ multipleDays: true })).toContain(REVIEW_AND_ADJUST_HINT);
  });

  it("adds day-picking guidance only for multi-day plans", () => {
    expect(reviewAndAdjustHint({ multipleDays: true })).toContain("Tap a day");
    expect(reviewAndAdjustHint({ multipleDays: false })).not.toContain("Tap a day");
  });
});

describe("saveAndExecuteLabel", () => {
  it("leads with save and execute", () => {
    expect(saveAndExecuteLabel({ multipleDays: true })).toBe("Save and execute");
    expect(saveAndExecuteLabel({ multipleDays: false })).toBe("Save and execute");
  });

  it("reports progress while saving", () => {
    expect(saveAndExecuteLabel({ multipleDays: true, busy: true })).toBe("Saving…");
  });

  it("drops the save wording once the plan is already in the library", () => {
    expect(saveAndExecuteLabel({ multipleDays: true, alreadySaved: true })).toBe("Start this week");
    expect(saveAndExecuteLabel({ multipleDays: false, alreadySaved: true })).toBe("Start workout");
  });

  it("explains both halves of the action", () => {
    expect(saveAndExecuteHint({ multipleDays: true })).toContain("library");
    expect(saveAndExecuteHint({ multipleDays: true })).toContain("today");
  });
});

describe("start prompt copy", () => {
  it("asks about today when the session is today", () => {
    const t = target("2026-08-15", true);
    expect(startPromptTitle(t)).toBe("Start today's workout?");
    expect(startPromptBody(t)).toBe("Today: Upper Strength");
    expect(startPromptConfirmLabel(t)).toBe("Start today's workout");
  });

  it("names the weekday when the session is not today", () => {
    const t = target("2026-08-19", false, "Lower Power");
    expect(startPromptTitle(t)).toBe("Start your next workout?");
    expect(startPromptBody(t)).toBe("Wednesday: Lower Power");
    expect(startPromptConfirmLabel(t)).toBe("Start Wednesday's workout");
  });
});
