import { describe, expect, it } from "vitest";
import type { IntentEntry } from "./sessionIntentContract";
import type { Exercise, PrimaryGoal } from "./types";
import {
  allocateSlotsAcrossLeaves,
  deriveLeafEntries,
  estimateIntentWorkingExerciseSlots,
  isMainWorkCandidateForIntentEntry,
  isIntentMainWorkCandidate,
  isPowerStyleSportIntentEntry,
  isStabilityPrehabSportIntentEntry,
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

  it("routes vertical_jump sport sub-focus through power-style main work", () => {
    const entry: IntentEntry = {
      kind: "sport_sub_focus",
      slug: "vertical_jump",
      parent_slug: "volleyball",
      rank: 1,
      weight: 0.4,
      tag_slugs: [],
    };
    expect(isPowerStyleSportIntentEntry(entry)).toBe(true);
    expect(mainWorkPrimaryForIntentEntry(entry, "strength")).toBe("power");
  });

  it("does not route stability/prehab sport sub-focuses into main compound slots", () => {
    const entry: IntentEntry = {
      kind: "sport_sub_focus",
      slug: "knee_resilience",
      parent_slug: "volleyball",
      rank: 1,
      weight: 0.4,
      tag_slugs: ["knee_stability"],
    };
    const squat: Exercise = {
      id: "pause_squat",
      name: "Pause Squat",
      modality: "strength",
      movement_pattern: "squat",
      muscle_groups: ["quads"],
      tags: {
        sport_tags: ["volleyball"],
        goal_tags: ["strength"],
        attribute_tags: ["knee_stability", "eccentric_quad_strength"],
      },
      exercise_role: "main_compound",
    } as Exercise;
    expect(isStabilityPrehabSportIntentEntry(entry)).toBe(true);
    expect(isMainWorkCandidateForIntentEntry(squat, entry, "strength")).toBe(false);
  });

  it("requires dynamic evidence for explosive jump main-work candidates", () => {
    const entry: IntentEntry = {
      kind: "sport_sub_focus",
      slug: "vertical_jump",
      parent_slug: "volleyball",
      rank: 1,
      weight: 0.4,
      tag_slugs: ["explosive_power", "plyometric"],
    };
    const heavySquat: Exercise = {
      id: "heavy_squat",
      name: "Heavy Squat",
      modality: "strength",
      movement_pattern: "squat",
      muscle_groups: ["quads"],
      tags: {
        sport_tags: ["volleyball"],
        goal_tags: ["power"],
        attribute_tags: ["squat_pattern"],
      },
      exercise_role: "main_compound",
    } as Exercise;
    const jump: Exercise = {
      ...heavySquat,
      id: "approach_jump",
      name: "Approach Jump",
      modality: "power",
      movement_pattern: "locomotion",
      tags: {
        sport_tags: ["volleyball"],
        goal_tags: ["power"],
        stimulus: ["plyometric"],
        attribute_tags: ["explosive_power", "reactive_power"],
      },
      exercise_role: "accessory",
      impact_level: "medium",
    } as Exercise;
    expect(isMainWorkCandidateForIntentEntry(heavySquat, entry, "power")).toBe(false);
    expect(isMainWorkCandidateForIntentEntry(jump, entry, "power")).toBe(true);
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
