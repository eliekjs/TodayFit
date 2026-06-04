import { describe, expect, it } from "vitest";
import {
  createExplicitWeekSlotPicker,
  interleaveGymAndSportSlots,
  pickSlotForCalendarDay,
  partitionWeekDaySlots,
  unionTrainingDayIndices,
} from "./weekDaySlotAssignment";

const gym = (key: string) => ({ type: "gym" as const, key });
const sport = (sportSlug: string) => ({ type: "sport" as const, sportSlug });

describe("weekDaySlotAssignment", () => {
  it("unionTrainingDayIndices merges gym and sport weekdays", () => {
    expect(
      unionTrainingDayIndices([0, 2, 4], { running: [5, 6] })
    ).toEqual([0, 2, 4, 5, 6]);
  });

  it("assigns gym slots to MWF and sport slots to Sat/Sun (MWF gym + weekend sport)", () => {
    const slots = [gym("a"), gym("b"), gym("c"), sport("road_running"), sport("road_running")];
    const pick = createExplicitWeekSlotPicker(
      [0, 2, 4],
      { road_running: [5, 6] },
      ["road_running"],
      slots
    );

    expect(pick(0)?.type).toBe("gym");
    expect(pick(2)?.type).toBe("gym");
    expect(pick(4)?.type).toBe("gym");
    const sat = pick(5);
    expect(sat?.type).toBe("sport");
    expect((sat as { sportSlug: string }).sportSlug).toBe("road_running");
    expect(pick(6)?.type).toBe("sport");
    expect(pick(1)).toBeNull();
  });

  it("does not put gym sessions on sport-only days when interleaving would", () => {
    const slots = [gym("a"), gym("b"), gym("c"), sport("climb"), sport("climb")];
    const interleaved = interleaveGymAndSportSlots(slots);
    const trainingOrder = [0, 2, 4, 5, 6];
    const interleavedByDay = trainingOrder.map((_, i) => interleaved[i]);
    // Legacy interleave: Sun (last training day) gets a gym slot even when Sat is sport.
    expect(interleavedByDay[3]?.type).toBe("sport");
    expect(interleavedByDay[4]?.type).toBe("gym");

    const pick = createExplicitWeekSlotPicker(
      [0, 2, 4],
      { climb: [5, 6] },
      ["climb"],
      slots
    );
    expect(pick(5)?.type).toBe("sport");
    expect(pick(6)?.type).toBe("sport");
  });

  it("uses gym on overlap days when both gym and sport are selected", () => {
    const slots = [gym("a"), sport("ski")];
    const state = { gymIdx: 0, sportIdxBySlug: {} };
    const { gymSlots, sportSlotsBySlug } = partitionWeekDaySlots(slots);
    const picked = pickSlotForCalendarDay(
      2,
      new Set([2]),
      { ski: [2] },
      ["ski"],
      gymSlots,
      sportSlotsBySlug,
      state
    );
    expect(picked?.type).toBe("gym");
  });
});
