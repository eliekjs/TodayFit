import { describe, expect, it } from "vitest";
import {
  isAlreadyAtTabTarget,
  isAlreadyOnTabHome,
  tabBarHomeHref,
  workoutTabTargetHref,
} from "./tabBarHome";

describe("tabBarHomeHref", () => {
  it("maps each visible tab to its home screen", () => {
    expect(tabBarHomeHref("index")).toBe("/");
    expect(tabBarHomeHref("workout/index")).toBe("/workout");
    expect(tabBarHomeHref("library/index")).toBe("/library");
    expect(tabBarHomeHref("profiles/index")).toBe("/profiles");
  });

  it("treats unknown / flow routes as Today home", () => {
    expect(tabBarHomeHref("manual/preferences")).toBe("/");
    expect(tabBarHomeHref("sport-mode/index")).toBe("/");
  });
});

describe("isAlreadyOnTabHome", () => {
  it("is true only on that tab's root screen", () => {
    expect(isAlreadyOnTabHome("index", "/")).toBe(true);
    expect(isAlreadyOnTabHome("workout/index", "/workout")).toBe(true);
    expect(isAlreadyOnTabHome("library/index", "/library")).toBe(true);
    expect(isAlreadyOnTabHome("manual/preferences", "/")).toBe(false);
    expect(isAlreadyOnTabHome("index", "/library")).toBe(false);
    expect(isAlreadyOnTabHome("index", "/workout")).toBe(false);
  });
});

describe("workoutTabTargetHref", () => {
  it("resumes the exercise list when a session is underway", () => {
    expect(workoutTabTargetHref({ hasActiveExecution: true })).toBe("/manual/execute");
  });

  it("otherwise opens the week overview", () => {
    expect(workoutTabTargetHref({ hasActiveExecution: false })).toBe("/workout");
  });
});

describe("isAlreadyAtTabTarget", () => {
  it("skips a re-tap that would not move the user", () => {
    expect(isAlreadyAtTabTarget("manual/execute", "/manual/execute")).toBe(true);
    expect(isAlreadyAtTabTarget("workout/index", "/workout")).toBe(true);
  });

  it("still navigates from the week overview into an active session", () => {
    expect(isAlreadyAtTabTarget("workout/index", "/manual/execute")).toBe(false);
  });

  it("still navigates out of a build flow", () => {
    expect(isAlreadyAtTabTarget("manual/week", "/workout")).toBe(false);
    expect(isAlreadyAtTabTarget("manual/execute", "/workout")).toBe(false);
  });
});
