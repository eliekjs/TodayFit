import { describe, expect, it } from "vitest";
import {
  discardActionLabel,
  discardConfirmBody,
  discardConfirmTitle,
  discardTargetFromFlow,
} from "./discardConfirmCopy";

describe("discardConfirmCopy", () => {
  it("maps week flows to week and day flows to session", () => {
    expect(discardTargetFromFlow("goal_week")).toBe("week");
    expect(discardTargetFromFlow("sport_week")).toBe("week");
    expect(discardTargetFromFlow("goal_day")).toBe("session");
    expect(discardTargetFromFlow("sport_day")).toBe("session");
    expect(discardTargetFromFlow(null)).toBe("session");
  });

  it("uses irreversible confirm copy for the target", () => {
    expect(discardConfirmTitle("week")).toBe("Discard this week?");
    expect(discardConfirmBody("week")).toBe(
      "Are you sure you want to discard this week? This action cannot be undone."
    );
    expect(discardConfirmTitle("session")).toBe("Discard this session?");
    expect(discardConfirmBody("session")).toBe(
      "Are you sure you want to discard this session? This action cannot be undone."
    );
    expect(discardActionLabel("week")).toBe("Discard week");
    expect(discardActionLabel("session")).toBe("Discard session");
  });
});
