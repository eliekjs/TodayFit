import { describe, expect, it } from "vitest";
import type { IntentEntry } from "./sessionIntentContract";
import type { Exercise, PrimaryGoal } from "./types";
import {
  allocateSlotsAcrossLeaves,
  buildUnifiedIntentSlotPlan,
  classifyLeafArchetype,
  deriveLeafEntries,
  estimateIntentWorkingExerciseSlots,
  getMainWorkPatternSlugsForGoal,
  isEnduranceConditioningSportIntentEntry,
  isMainWorkCandidateForIntentEntry,
  isIntentMainWorkCandidate,
  isNonMainWorkSportIntentEntry,
  isPowerStyleSportIntentEntry,
  isStabilityPrehabSportIntentEntry,
  mainWorkPrimaryForIntentEntry,
  matchesIntentEntry,
  primaryGoalToSubFocusKey,
  rebalanceAllocMinOneSlotPerPowerLeaf,
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

  it("rebalanceAllocMinOneSlotPerPowerLeaf gives each power sport leaf at least one slot", () => {
    const leaves: IntentEntry[] = [
      {
        kind: "sport_sub_focus",
        slug: "repeat_sprint",
        parent_slug: "soccer",
        rank: 1,
        weight: 0.5,
        tag_slugs: ["speed"],
      },
      {
        kind: "sport_sub_focus",
        slug: "deceleration",
        parent_slug: "soccer",
        rank: 2,
        weight: 0.5,
        tag_slugs: ["agility"],
      },
    ];
    const base = allocateSlotsAcrossLeaves(leaves, 3);
    const allocMap = new Map(base.map(({ leafIndex, slots }) => [String(leafIndex), slots]));
    const rebalanced = rebalanceAllocMinOneSlotPerPowerLeaf(leaves, allocMap);
    expect(rebalanced.get("0")).toBeGreaterThanOrEqual(1);
    expect(rebalanced.get("1")).toBeGreaterThanOrEqual(1);
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

  it("on a core-only focus day, a squat compound is no longer a main-work candidate", () => {
    expect(isIntentMainWorkCandidate(base as Exercise, "strength", ["core"])).toBe(false);
  });

  it("on a core-only focus day, a rotate-pattern core exercise becomes a main-work candidate", () => {
    const core: Partial<Exercise> = {
      modality: "strength",
      movement_pattern: "rotate",
      muscle_groups: ["core"],
    };
    expect(isIntentMainWorkCandidate(core as Exercise, "strength", ["core"])).toBe(true);
    // Not eligible outside of core-only focus (rotate isn't a strength main-work pattern otherwise).
    expect(isIntentMainWorkCandidate(core as Exercise, "strength")).toBe(false);
  });

  it("a carry-pattern exercise is a main-work candidate on a core-only day", () => {
    const carry: Partial<Exercise> = {
      modality: "strength",
      movement_pattern: "carry",
      muscle_groups: ["core"],
    };
    expect(isIntentMainWorkCandidate(carry as Exercise, "strength", ["core"])).toBe(true);
  });
});

describe("getMainWorkPatternSlugsForGoal", () => {
  it("returns squat/hinge/push/pull for strength when not core-only", () => {
    expect(getMainWorkPatternSlugsForGoal("strength")).toEqual(
      new Set(["squat", "hinge", "push", "pull"])
    );
  });

  it("includes rotate for hypertrophy/body_recomp/calisthenics when not core-only", () => {
    expect(getMainWorkPatternSlugsForGoal("hypertrophy").has("rotate")).toBe(true);
    expect(getMainWorkPatternSlugsForGoal("body_recomp").has("rotate")).toBe(true);
    expect(getMainWorkPatternSlugsForGoal("calisthenics").has("rotate")).toBe(true);
  });

  it("restricts to rotate/carry on a core-only focus day regardless of goal", () => {
    expect(getMainWorkPatternSlugsForGoal("strength", ["core"])).toEqual(new Set(["rotate", "carry"]));
    expect(getMainWorkPatternSlugsForGoal("hypertrophy", ["core"])).toEqual(new Set(["rotate", "carry"]));
  });

  it("does not restrict when focus is mixed or full body", () => {
    expect(getMainWorkPatternSlugsForGoal("strength", ["full_body"])).toEqual(
      new Set(["squat", "hinge", "push", "pull"])
    );
    expect(getMainWorkPatternSlugsForGoal("strength", ["core", "lower"])).toEqual(
      new Set(["squat", "hinge", "push", "pull"])
    );
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

  it("routes endurance cycling hip_stability as stability/prehab (not main compound)", () => {
    const entry: IntentEntry = {
      kind: "sport_sub_focus",
      slug: "hip_stability",
      parent_slug: "cycling",
      rank: 1,
      weight: 0.4,
      tag_slugs: ["hip_stability", "glute_strength"],
    };
    const hinge: Exercise = {
      id: "rdl",
      name: "Romanian Deadlift",
      modality: "strength",
      movement_pattern: "hinge",
      muscle_groups: ["hamstrings"],
      tags: {
        sport_tags: ["cycling"],
        goal_tags: ["strength"],
        attribute_tags: ["hip_stability", "glute_strength"],
      },
      exercise_role: "main_compound",
    } as Exercise;
    expect(isStabilityPrehabSportIntentEntry(entry)).toBe(true);
    expect(isMainWorkCandidateForIntentEntry(hinge, entry, "strength")).toBe(false);
  });

  it("allows strength foundation and plyometrics for vertical_jump main-work candidates", () => {
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
    expect(isMainWorkCandidateForIntentEntry(heavySquat, entry, "power")).toBe(true);
    expect(isMainWorkCandidateForIntentEntry(jump, entry, "power")).toBe(true);
  });

  it("allows conditioning agility drills for change_of_direction sport sub-focus", () => {
    const entry: IntentEntry = {
      kind: "sport_sub_focus",
      slug: "change_of_direction",
      parent_slug: "soccer",
      rank: 1,
      weight: 0.4,
      tag_slugs: ["agility", "reactive_power"],
    };
    const lateralShuffle: Exercise = {
      id: "lateral_shuffle_drill",
      name: "Lateral Shuffle",
      modality: "conditioning",
      movement_pattern: "locomotion",
      muscle_groups: ["legs"],
      tags: {
        sport_tags: ["soccer"],
        stimulus: ["plyometric"],
        attribute_tags: ["agility", "reactive_power", "speed"],
      },
      exercise_role: "accessory",
    } as Exercise;
    const backSquat: Exercise = {
      id: "back_squat",
      name: "Back Squat",
      modality: "strength",
      movement_pattern: "squat",
      muscle_groups: ["quads"],
      tags: { sport_tags: ["soccer"], attribute_tags: ["squat_pattern"] },
      exercise_role: "main_compound",
    } as Exercise;
    expect(isMainWorkCandidateForIntentEntry(lateralShuffle, entry, "strength")).toBe(true);
    expect(isMainWorkCandidateForIntentEntry(backSquat, entry, "strength")).toBe(false);
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

describe("isEnduranceConditioningSportIntentEntry", () => {
  it("classifies marathon_pace as endurance_conditioning (not main compound)", () => {
    const entry: IntentEntry = {
      kind: "sport_sub_focus",
      slug: "marathon_pace",
      parent_slug: "road_running",
      rank: 1,
      weight: 0.3,
      tag_slugs: ["marathon_pace"],
    };
    expect(isEnduranceConditioningSportIntentEntry(entry)).toBe(true);
    expect(isStabilityPrehabSportIntentEntry(entry)).toBe(false);
    expect(isNonMainWorkSportIntentEntry(entry)).toBe(true);
  });

  it("classifies threshold as endurance_conditioning", () => {
    const entry: IntentEntry = {
      kind: "sport_sub_focus",
      slug: "threshold",
      parent_slug: "road_running",
      rank: 2,
      weight: 0.2,
      tag_slugs: ["threshold"],
    };
    expect(isEnduranceConditioningSportIntentEntry(entry)).toBe(true);
  });

  it("classifies aerobic_base as endurance_conditioning", () => {
    const entry: IntentEntry = {
      kind: "sport_sub_focus",
      slug: "aerobic_base",
      parent_slug: "trail_running",
      rank: 3,
      weight: 0.2,
      tag_slugs: ["aerobic_base"],
    };
    expect(isEnduranceConditioningSportIntentEntry(entry)).toBe(true);
  });

  it("blocks endurance_conditioning entries from main compound slots", () => {
    const entry: IntentEntry = {
      kind: "sport_sub_focus",
      slug: "marathon_pace",
      parent_slug: "road_running",
      rank: 1,
      weight: 0.3,
      tag_slugs: ["marathon_pace"],
    };
    const squat: Exercise = {
      id: "back_squat",
      name: "Back Squat",
      modality: "strength",
      movement_pattern: "squat",
      muscle_groups: ["quads"],
      tags: { sport_tags: ["road_running"], goal_tags: ["strength"] },
      exercise_role: "main_compound",
    } as Exercise;
    expect(isMainWorkCandidateForIntentEntry(squat, entry, "strength")).toBe(false);
  });

  it("does not classify ankle_stability as endurance_conditioning (it is stability_prehab)", () => {
    const entry: IntentEntry = {
      kind: "sport_sub_focus",
      slug: "ankle_stability",
      parent_slug: "road_running",
      rank: 2,
      weight: 0.2,
      tag_slugs: ["ankle_stability"],
    };
    expect(isEnduranceConditioningSportIntentEntry(entry)).toBe(false);
    expect(isStabilityPrehabSportIntentEntry(entry)).toBe(true);
    expect(isNonMainWorkSportIntentEntry(entry)).toBe(true);
  });
});

describe("estimateIntentWorkingExerciseSlots", () => {
  it("returns ~10 for 60 minutes", () => {
    expect(estimateIntentWorkingExerciseSlots(60)).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// Unified slot plan — the core proof mechanism
// ---------------------------------------------------------------------------

describe("buildUnifiedIntentSlotPlan (slot budget proof)", () => {
  /**
   * Scenario: Bodybuilding Arms & Shoulders (body_recomp) + Running Marathon Pace
   * + Trail Running Ankle Stability — the exact scenario from the user's screenshot.
   *
   * Arms & Shoulders → main_compound
   * Marathon Pace    → conditioning
   * Ankle Stability  → prehab
   *
   * Total slots for 53 min = 8
   * Proportional: arms_shoulders ~40% → 3, marathon_pace ~30% → 2, ankle_stability ~30% → 3
   */
  const leaves: IntentEntry[] = [
    {
      kind: "goal_sub_focus",
      slug: "arms_and_shoulders",
      parent_slug: "physique",
      rank: 1,
      weight: 0.40,
      tag_slugs: ["shoulders", "biceps", "triceps"],
    },
    {
      kind: "sport_sub_focus",
      slug: "marathon_pace",
      parent_slug: "road_running",
      rank: 2,
      weight: 0.30,
      tag_slugs: ["aerobic_base", "zone3_cardio"],
    },
    {
      kind: "sport_sub_focus",
      slug: "ankle_stability",
      parent_slug: "trail_running",
      rank: 3,
      weight: 0.30,
      tag_slugs: ["ankle_stability", "balance"],
    },
  ];

  it("slot plan total equals estimateIntentWorkingExerciseSlots(53)", () => {
    const totalSlots = estimateIntentWorkingExerciseSlots(53);
    const plan = buildUnifiedIntentSlotPlan(leaves, totalSlots);
    const planTotal = plan.reduce((s, e) => s + e.slots, 0);
    expect(planTotal).toBe(totalSlots);
  });

  it("classifies arms_and_shoulders as main_compound", () => {
    const entry = leaves[0]!;
    expect(classifyLeafArchetype(entry)).toBe("main_compound");
  });

  it("classifies marathon_pace as conditioning", () => {
    const entry = leaves[1]!;
    expect(classifyLeafArchetype(entry)).toBe("conditioning");
  });

  it("classifies ankle_stability as prehab", () => {
    const entry = leaves[2]!;
    expect(classifyLeafArchetype(entry)).toBe("prehab");
  });

  it("conditioning + prehab slots total the non-main portion of budget", () => {
    const totalSlots = estimateIntentWorkingExerciseSlots(53); // 8
    const plan = buildUnifiedIntentSlotPlan(leaves, totalSlots);
    const mainSlots = plan.find((p) => p.entry.slug === "arms_and_shoulders")?.slots ?? 0;
    const condSlots = plan.find((p) => p.entry.slug === "marathon_pace")?.slots ?? 0;
    const prehabSlots = plan.find((p) => p.entry.slug === "ankle_stability")?.slots ?? 0;
    // All three must sum to totalSlots
    expect(mainSlots + condSlots + prehabSlots).toBe(totalSlots);
    // Each specialty leaf should have at least 1 slot (proportional share > 0)
    expect(condSlots).toBeGreaterThan(0);
    expect(prehabSlots).toBeGreaterThan(0);
    // Main compound should have the largest share (40%)
    expect(mainSlots).toBeGreaterThanOrEqual(condSlots);
    expect(mainSlots).toBeGreaterThanOrEqual(prehabSlots);
  });

  it("proportional allocation never gives zero slots to a leaf with meaningful weight", () => {
    // Even a leaf with 30% weight on an 8-slot budget should get ≥ 1 slot
    const totalSlots = estimateIntentWorkingExerciseSlots(53); // 8
    const plan = buildUnifiedIntentSlotPlan(leaves, totalSlots);
    for (const entry of plan) {
      expect(entry.slots).toBeGreaterThan(0);
    }
  });

  it("shorter workouts still allocate proportionally", () => {
    const totalSlots = estimateIntentWorkingExerciseSlots(25); // 4
    const plan = buildUnifiedIntentSlotPlan(leaves, totalSlots);
    const planTotal = plan.reduce((s, e) => s + e.slots, 0);
    expect(planTotal).toBe(totalSlots);
  });

  it("single-leaf session has no plan (guard for the multi-intent gate)", () => {
    const singleLeaf = [leaves[0]!];
    // buildUnifiedIntentSlotPlan is only called when leaves.length >= 2; here we
    // confirm it still returns a valid plan for a single leaf (edge case safety).
    const plan = buildUnifiedIntentSlotPlan(singleLeaf, 8);
    expect(plan.reduce((s, e) => s + e.slots, 0)).toBe(8);
  });
});

describe("classifyLeafArchetype", () => {
  it("power-style sport sub-focus → power", () => {
    const entry: IntentEntry = {
      kind: "sport_sub_focus",
      slug: "vertical_jump",
      parent_slug: "volleyball",
      rank: 1,
      weight: 0.3,
      tag_slugs: ["explosive_power"],
    };
    expect(classifyLeafArchetype(entry)).toBe("power");
  });

  it("speed/COD sport sub-focus → power", () => {
    const entry: IntentEntry = {
      kind: "sport_sub_focus",
      slug: "change_of_direction",
      parent_slug: "soccer",
      rank: 1,
      weight: 0.3,
      tag_slugs: ["agility"],
    };
    expect(classifyLeafArchetype(entry)).toBe("power");
  });

  it("bare goal entry → main_compound", () => {
    const entry: IntentEntry = {
      kind: "goal",
      slug: "strength",
      rank: 1,
      weight: 0.5,
      tag_slugs: ["strength"],
    };
    expect(classifyLeafArchetype(entry)).toBe("main_compound");
  });

  it("goal sub-focus speed_sprint → power", () => {
    const entry: IntentEntry = {
      kind: "goal_sub_focus",
      slug: "speed_sprint",
      parent_slug: "athletic_performance",
      rank: 1,
      weight: 0.5,
      tag_slugs: ["speed", "plyometric"],
    };
    expect(isPowerStyleSportIntentEntry(entry)).toBe(true);
    expect(classifyLeafArchetype(entry)).toBe("power");
  });

  it("goal sub-focus (physique) → main_compound", () => {
    const entry: IntentEntry = {
      kind: "goal_sub_focus",
      slug: "chest",
      parent_slug: "physique",
      rank: 1,
      weight: 0.5,
      tag_slugs: ["chest"],
    };
    expect(classifyLeafArchetype(entry)).toBe("main_compound");
  });
});
