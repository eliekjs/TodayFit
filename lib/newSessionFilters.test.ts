import { describe, expect, it } from "vitest";
import { defaultManualPreferences } from "../context/appStateModel";
import {
  blankFiltersForNewSession,
  createBlankManualPreferences,
  shouldPromptSessionFlowConflict,
} from "./newSessionFilters";
import { createSessionDraft } from "./sessionDraft";

describe("blankFiltersForNewSession", () => {
  it("starts goal sessions with empty prefs and no week/sport snapshot", () => {
    const blank = blankFiltersForNewSession("goal_day");
    expect(blank.preferences.primaryFocus).toEqual([]);
    expect(blank.preferences.targetBody).toBeNull();
    expect(blank.adaptiveSetup).toBeNull();
    expect(blank.weekSetup).toBeNull();
    expect(blank.sportForm).toBeNull();
  });

  it("starts sport sessions with an empty sport form, not leftover sports", () => {
    const blank = blankFiltersForNewSession("sport_week");
    expect(blank.sportForm?.rankedSportSlugs).toEqual([null, null]);
    expect(blank.sportForm?.rankedGoals).toEqual([null, null, null]);
    expect(blank.sportForm?.subFocusBySport).toEqual({});
  });

  it("does not share mutable arrays with the default prefs constant", () => {
    const a = createBlankManualPreferences();
    a.primaryFocus.push("Build muscle");
    expect(defaultManualPreferences.primaryFocus).toEqual([]);
    expect(createBlankManualPreferences().primaryFocus).toEqual([]);
  });
});

describe("shouldPromptSessionFlowConflict", () => {
  const draft = createSessionDraft({
    flow: "goal_day",
    preferences: defaultManualPreferences,
    gymProfileId: null,
    gymName: null,
    adaptiveSetup: null,
    weekSetup: null,
    phase: "setup",
  });

  it("does not prompt when there is no active session", () => {
    expect(shouldPromptSessionFlowConflict(null, "goal_day", true)).toBe(false);
  });

  it("prompts on Create even when the same flow is already in progress", () => {
    expect(shouldPromptSessionFlowConflict(draft, "goal_day", true)).toBe(true);
  });

  it("continues the same flow without a prompt when not forcing a new session", () => {
    expect(shouldPromptSessionFlowConflict(draft, "goal_day", false)).toBe(false);
  });

  it("prompts when switching flows", () => {
    expect(shouldPromptSessionFlowConflict(draft, "sport_day", false)).toBe(true);
  });
});
