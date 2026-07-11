import { describe, expect, it } from "vitest";
import {
  SPORT_DAY_INTENT_PREFIX,
  buildSportDesignatedPlannedDay,
  getSportsOnCalendarDay,
  isSportDesignatedPlannedDay,
  plannedDayFromDbRow,
  sportDesignatedDayDisplayTitle,
  sportSlugFromPlannedDay,
} from "./sportDesignatedDay";

describe("sportDesignatedDay", () => {
  it("buildSportDesignatedPlannedDay marks session as sport with no workout id", () => {
    const day = buildSportDesignatedPlannedDay({
      id: "guest-2025-06-09-sport",
      date: "2025-06-09",
      sportSlug: "road_running",
    });
    expect(day.sessionKind).toBe("sport");
    expect(day.sportSlug).toBe("road_running");
    expect(day.generatedWorkoutId).toBeNull();
    expect(day.intentLabel).toBe(`${SPORT_DAY_INTENT_PREFIX}road_running`);
    expect(day.title).toBe("Road Running");
  });

  it("getSportsOnCalendarDay returns ranked sports on that weekday", () => {
    expect(
      getSportsOnCalendarDay(5, ["road_running", "rock_climbing"], {
        road_running: [5, 6],
        rock_climbing: [2],
      })
    ).toEqual(["road_running"]);
  });

  it("plannedDayFromDbRow restores sport designation from intent_label prefix", () => {
    const day = plannedDayFromDbRow({
      id: "abc",
      date: "2025-06-07",
      intent_label: `${SPORT_DAY_INTENT_PREFIX}rock_climbing`,
      status: "planned",
      generated_workout_id: null,
    });
    expect(isSportDesignatedPlannedDay(day)).toBe(true);
    expect(sportSlugFromPlannedDay(day)).toBe("rock_climbing");
    expect(sportDesignatedDayDisplayTitle(day)).toBe("Rock Climbing");
  });

  it("sportDesignatedDayDisplayTitle strips legacy Sport day suffix", () => {
    expect(
      sportDesignatedDayDisplayTitle({
        title: "Basketball — Sport day",
        sportSlug: "basketball",
        intentLabel: `${SPORT_DAY_INTENT_PREFIX}basketball`,
      })
    ).toBe("Basketball");
  });

  it("isSportDesignatedPlannedDay accepts sessionKind without prefix", () => {
    expect(
      isSportDesignatedPlannedDay({
        sessionKind: "sport",
        intentLabel: "anything",
      })
    ).toBe(true);
  });
});
