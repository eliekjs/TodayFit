import { describe, expect, it } from "vitest";
import type { IntentEntry } from "./sessionIntentContract";
import type { Exercise, PrimaryGoal } from "./types";
import {
  allocateSlotsAcrossLeaves,
  deriveLeafEntries,
  estimateIntentWorkingExerciseSlots,
  isIntentMainWorkCandidate,
  isPowerStyleSportIntentEntry,
  mainWorkPrimaryForIntentEntry,
  matchesIntentEntry,
  primaryGoalToSubFocusKey,
} from "./intentSlotAllocator";

describe("deriveLeafEntries", () => {
  it("drops bare goal when goal_sub_focus rows exist and renormalizes", () => {
    const ranked: IntentEntry[] = [
      { kind: "goal", slug: "strength", rank: 1, weight: 0.4, tag_slugs: ["strength"] },
      { kind: "goal_sub_focus", slug: "squat", parent_slug: "strength", rank: 2, weight: 0.35, tag_slugs: [] },
      { kind: "sport", slug: "soccer", rank: 3, weight: 0.25, tag_slugs: ["soccer"] },
    ];
    const leaves = deriveLeafEntries(ranked);
    expect(leaves.some((e) => e.kind === "goal" && e.slug === "strength")).toBe(false);
    expect(leaves.map((e) => e.kind)).toEqual(["goal_sub_focus", "sport"]);
    const sum = leaves.reduce((s, e) => s + e.weight, 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  it("keeps bare sport when no sport_sub_focus", () => {
    const ranked: IntentEntry[] = [
      { kind: "goal", slug: "strength", rank: 1, weight: 0.6, tag_slugs: ["strength"] },
      { kind: "sport", slug: "soccer", rank: 2, weight: 0.4, tag_slugs: ["soccer"] },
    ];
    const leaves = deriveLeafEntries(ranked);
    expect(leaves).toHaveLength(2);
    expect(leaves.map((e) => e.slug).sort()).toEqual(["soccer", "strength"]);
  });
});

describe("allocateSlotsAcrossLeaves", () => {
  it("allocates integer slots summing to totalSlots", () => {
    const leaves: IntentEntry[] = [
      { kind: "goal", slug: "a", rank: 1, weight: 0.6, tag_slugs: [] },
      { kind: "goal", slug: "b", rank: 2, weight: 0.4, tag_slugs: [] },
    ];
    const alloc = allocateSlotsAcrossLeaves(leaves, 10);
    const sum = alloc.reduce((s, x) => s + x.slots, 0);
    expect(sum).toBe(10);
    const a = alloc.find((x) => x.entry.slug === "a")?.slots ?? 0;
    const b = alloc.find((x) => x.entry.slug === "b")?.slots ?? 0;
    expect(a).toBe(6);
    expect(b).toBe(4);
  });
});

describe("matchesIntentEntry", () => {
  const exSportTagged: Exercise = {
    id: "x1",
    name: "Soccer Drill",
    modality: "strength",
    movement_pattern: "squat",
    muscle_groups: ["legs"],
    tags: { sport_tags: ["soccer"], goal_tags: ["strength"] },
  } as Exercise;

  it("matches bare sport via sport_tags", () => {
    const entry: IntentEntry = { kind: "sport", slug: "soccer", rank: 1, weight: 1, tag_slugs: ["soccer"] };
    expect(matchesIntentEntry(exSportTagged, entry)).toBe(true);
  });

  it("matches declared goal", () => {
    const ex: Exercise = {
      ...exSportTagged,
      tags: { goal_tags: ["strength"] },
    } as Exercise;
    const entry: IntentEntry = { kind: "goal", slug: "strength" as PrimaryGoal, rank: 1, weight: 1, tag_slugs: ["strength"] };
    expect(matchesIntentEntry(ex, entry)).toBe(true);
  });
});

describe("isIntentMainWorkCandidate", () => {
  const base: Partial<Exercise> = {
    modality: "strength",
    movement_pattern: "squat",
    muscle_groups: ["quads"],
  };

  it("accepts strength squat compound", () => {
    expect(isIntentMainWorkCandidate(base as Exercise, "strength")).toBe(true);
  });
});

describe("primaryGoalToSubFocusKey", () => {
  it("maps hypertrophy to muscle", () => {
    expect(primaryGoalToSubFocusKey("hypertrophy")).toBe("muscle");
  });
});

describe("mainWorkPrimaryForIntentEntry", () => {
  it("routes sport speed/COD leaves through power-style main work", () => {
    const entry: IntentEntry = {
      kind: "sport_sub_focus",
      slug: "change_of_direction",
      parent_slug: "lacrosse",
      rank: 1,
      weight: 0.4,
      tag_slugs: ["agility"],
    };
    expect(isPowerStyleSportIntentEntry(entry)).toBe(true);
    expect(mainWorkPrimaryForIntentEntry(entry, "hypertrophy")).toBe("power");
  });

  it("keeps compatible non-speed sport leaves on the session primary", () => {
    const entry: IntentEntry = {
      kind: "sport_sub_focus",
      slug: "shoulder_stability",
      parent_slug: "lacrosse",
      rank: 1,
      weight: 0.4,
      tag_slugs: ["shoulder_stability"],
    };
    expect(isPowerStyleSportIntentEntry(entry)).toBe(false);
    expect(mainWorkPrimaryForIntentEntry(entry, "hypertrophy")).toBe("hypertrophy");
  });
});

describe("estimateIntentWorkingExerciseSlots", () => {
  it("returns ~10 for 60 minutes", () => {
    expect(estimateIntentWorkingExerciseSlots(60)).toBe(10);
  });
});
