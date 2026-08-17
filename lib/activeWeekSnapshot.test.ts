import { describe, expect, it } from "vitest";
import {
  ACTIVE_WEEK_MAX_AGE_DAYS,
  activeWeekInputIsEmpty,
  buildActiveWeekSnapshot,
  parseActiveWeekSnapshot,
  type ActiveWeekSnapshotInput,
} from "./activeWeekSnapshot";
import type { GeneratedWorkout, ManualWeekPlan } from "./types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const NOW = 1_800_000_000_000;

function makeWorkout(id: string): GeneratedWorkout {
  return { id, focus: ["Strength"], durationMinutes: 45, energyLevel: "medium", blocks: [] };
}

function manualPlan(): ManualWeekPlan {
  return {
    weekStartDate: "2026-08-10",
    days: [{ date: "2026-08-10", workout: makeWorkout("w1"), status: "planned" }],
  };
}

function emptyInput(): ActiveWeekSnapshotInput {
  return {
    manualWeekPlan: null,
    sportPrepWeekPlan: null,
    generatedWorkout: null,
    manualSessionProgress: null,
    manualExecutionStarted: false,
  };
}

describe("activeWeekInputIsEmpty", () => {
  it("is empty with no plan and no session", () => {
    expect(activeWeekInputIsEmpty(emptyInput())).toBe(true);
  });

  it("is not empty with a manual week", () => {
    expect(activeWeekInputIsEmpty({ ...emptyInput(), manualWeekPlan: manualPlan() })).toBe(false);
  });

  it("is not empty with a standalone workout underway", () => {
    expect(
      activeWeekInputIsEmpty({ ...emptyInput(), generatedWorkout: makeWorkout("solo") })
    ).toBe(false);
  });

  it("ignores a plan object with no days", () => {
    expect(
      activeWeekInputIsEmpty({
        ...emptyInput(),
        manualWeekPlan: { weekStartDate: "2026-08-10", days: [] },
      })
    ).toBe(true);
  });
});

describe("buildActiveWeekSnapshot", () => {
  it("returns null when there is nothing to restore", () => {
    expect(buildActiveWeekSnapshot(emptyInput(), NOW)).toBeNull();
  });

  it("stamps version and time", () => {
    const snapshot = buildActiveWeekSnapshot(
      { ...emptyInput(), manualWeekPlan: manualPlan() },
      NOW
    );
    expect(snapshot?.version).toBe(1);
    expect(snapshot?.savedAt).toBe(NOW);
    expect(snapshot?.manualWeekPlan?.days).toHaveLength(1);
  });

  it("drops an execution flag with no workout behind it", () => {
    const snapshot = buildActiveWeekSnapshot(
      { ...emptyInput(), manualWeekPlan: manualPlan(), manualExecutionStarted: true },
      NOW
    );
    expect(snapshot?.manualExecutionStarted).toBe(false);
  });

  it("keeps the execution flag when a workout is loaded", () => {
    const snapshot = buildActiveWeekSnapshot(
      {
        ...emptyInput(),
        manualWeekPlan: manualPlan(),
        generatedWorkout: makeWorkout("w1"),
        manualExecutionStarted: true,
      },
      NOW
    );
    expect(snapshot?.manualExecutionStarted).toBe(true);
  });
});

describe("parseActiveWeekSnapshot", () => {
  const stored = buildActiveWeekSnapshot(
    { ...emptyInput(), manualWeekPlan: manualPlan() },
    NOW
  );

  it("round-trips through JSON", () => {
    const parsed = parseActiveWeekSnapshot(JSON.parse(JSON.stringify(stored)), NOW);
    expect(parsed?.manualWeekPlan?.weekStartDate).toBe("2026-08-10");
  });

  it("rejects junk and unknown versions", () => {
    expect(parseActiveWeekSnapshot(null, NOW)).toBeNull();
    expect(parseActiveWeekSnapshot("nope", NOW)).toBeNull();
    expect(parseActiveWeekSnapshot({ ...stored, version: 99 }, NOW)).toBeNull();
    expect(parseActiveWeekSnapshot({ ...stored, savedAt: "yesterday" }, NOW)).toBeNull();
  });

  it("rejects a malformed plan instead of restoring it", () => {
    expect(parseActiveWeekSnapshot({ ...stored, manualWeekPlan: { days: "nope" } }, NOW)).toBeNull();
  });

  it("expires plans abandoned long ago", () => {
    const later = NOW + (ACTIVE_WEEK_MAX_AGE_DAYS + 1) * MS_PER_DAY;
    expect(parseActiveWeekSnapshot(stored, later)).toBeNull();
    const justInside = NOW + (ACTIVE_WEEK_MAX_AGE_DAYS - 1) * MS_PER_DAY;
    expect(parseActiveWeekSnapshot(stored, justInside)).not.toBeNull();
  });

  it("rejects a snapshot that holds nothing", () => {
    expect(
      parseActiveWeekSnapshot({ version: 1, savedAt: NOW, manualWeekPlan: null }, NOW)
    ).toBeNull();
  });
});
