import { describe, expect, it } from "vitest";
import { isOneDaySportModeCombinationValid } from "./sportModeOneDayValidation";

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
