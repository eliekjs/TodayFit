import { describe, expect, it } from "vitest";
import {
  buildAddedBlockFromGeneratedSession,
  capAddedBlockItems,
  extractBlockForType,
  insertBlockIntoWorkout,
  insertIndexForBlockType,
  preferencesForAddedBlock,
  primaryFocusForAddedBlockType,
  stripDuplicateExercises,
} from "./appendGeneratedBlock";
import type { GeneratedWorkout, ManualPreferences, WorkoutBlock, WorkoutItem } from "./types";

const BASE_PREFS: ManualPreferences = {
  primaryFocus: ["Build Strength"],
  targetBody: "Full",
  targetModifier: [],
  durationMinutes: 45,
  energyLevel: "medium",
  injuries: ["No restrictions"],
  upcoming: [],
  subFocusByGoal: {},
  workoutStyle: [],
  workoutTier: "intermediate",
};

function item(id: string, name = id): WorkoutItem {
  return {
    exercise_id: id,
    exercise_name: name,
    sets: 3,
    reps: 8,
    rest_seconds: 90,
    coaching_cues: "",
  };
}

function block(
  type: WorkoutBlock["block_type"],
  ids: string[],
  extra?: Partial<WorkoutBlock>
): WorkoutBlock {
  return {
    block_type: type,
    format: "straight_sets",
    title: type,
    items: ids.map((id) => item(id)),
    estimated_minutes: 8,
    ...extra,
  };
}

function workout(blocks: WorkoutBlock[]): GeneratedWorkout {
  return {
    id: "w1",
    focus: ["Build Strength"],
    durationMinutes: 45,
    energyLevel: "medium",
    blocks,
  };
}

describe("preferencesForAddedBlock", () => {
  it("shortens duration and maps main strength / cooldown to matching goals", () => {
    const strength = preferencesForAddedBlock(BASE_PREFS, "main_strength");
    expect(strength.durationMinutes).toBe(20);
    expect(strength.primaryFocus).toEqual(["Build Strength"]);

    const cooldown = preferencesForAddedBlock(BASE_PREFS, "cooldown");
    expect(cooldown.primaryFocus).toEqual(["Recovery & Mobility"]);
  });

  it("applies a chest body choice and hypertrophy sub-focus for a hypertrophy block", () => {
    const prefs = preferencesForAddedBlock(BASE_PREFS, "main_hypertrophy", "chest");
    expect(prefs.primaryFocus).toEqual(["Build Muscle (Hypertrophy)"]);
    expect(prefs.targetBody).toBe("Upper");
    expect(prefs.specificBodyFocus).toEqual(["chest"]);
    expect(prefs.subFocusByGoal["Build Muscle (Hypertrophy)"]).toEqual(["Chest"]);
  });

  it("keeps the session goal for accessory and still applies glute body bias", () => {
    const prefs = preferencesForAddedBlock(BASE_PREFS, "accessory", "glutes");
    expect(prefs.primaryFocus).toEqual(["Build Strength"]);
    expect(prefs.targetBody).toBe("Lower");
    expect(prefs.specificBodyFocus).toEqual(["glutes"]);
  });
});

describe("primaryFocusForAddedBlockType", () => {
  it("does not override accessory or skill", () => {
    expect(primaryFocusForAddedBlockType("accessory")).toBeNull();
    expect(primaryFocusForAddedBlockType("skill")).toBeNull();
  });
});

describe("extractBlockForType", () => {
  const blocks = [
    block("warmup", ["wu1"]),
    block("main_strength", ["sq"]),
    block("accessory", ["row"]),
    block("cooldown", ["stretch"]),
  ];

  it("returns the exact requested type when present", () => {
    expect(extractBlockForType(blocks, "main_strength")?.items[0]?.exercise_id).toBe("sq");
    expect(extractBlockForType(blocks, "cooldown")?.items[0]?.exercise_id).toBe("stretch");
  });

  it("falls back to accessory for skill and to a working block otherwise", () => {
    expect(extractBlockForType(blocks, "skill")?.items[0]?.exercise_id).toBe("row");
    expect(extractBlockForType(blocks, "power")?.items[0]?.exercise_id).toBe("sq");
  });
});

describe("stripDuplicateExercises", () => {
  it("drops items already in the session and keeps new ones", () => {
    const next = stripDuplicateExercises(block("accessory", ["sq", "curl", "row"]), new Set(["sq"]));
    expect(next?.items.map((i) => i.exercise_id)).toEqual(["curl", "row"]);
  });

  it("returns null when every exercise is already used", () => {
    expect(stripDuplicateExercises(block("accessory", ["sq"]), new Set(["sq"]))).toBeNull();
  });
});

describe("capAddedBlockItems", () => {
  it("caps working blocks at 3 and prep blocks at 4", () => {
    expect(capAddedBlockItems(block("main_strength", ["a", "b", "c", "d"]), "main_strength").items).toHaveLength(
      3
    );
    expect(capAddedBlockItems(block("warmup", ["a", "b", "c", "d", "e"]), "warmup").items).toHaveLength(4);
  });
});

describe("insertIndexForBlockType / insertBlockIntoWorkout", () => {
  const existing = [
    block("warmup", ["wu"]),
    block("main_strength", ["sq"]),
    block("cooldown", ["cd"]),
  ];

  it("places warmup after existing warmups, working blocks before cooldown, cooldown at the end", () => {
    expect(insertIndexForBlockType(existing, "warmup")).toBe(1);
    expect(insertIndexForBlockType(existing, "main_hypertrophy")).toBe(2);
    expect(insertIndexForBlockType(existing, "mobility")).toBe(2);
    expect(insertIndexForBlockType(existing, "cooldown")).toBe(3);
  });

  it("appends duration and keeps the original blocks", () => {
    const updated = insertBlockIntoWorkout(
      workout(existing),
      block("accessory", ["curl"], { estimated_minutes: 6 })
    );
    expect(updated.blocks.map((b) => b.block_type)).toEqual([
      "warmup",
      "main_strength",
      "accessory",
      "cooldown",
    ]);
    expect(updated.durationMinutes).toBe(51);
    expect(updated.blocks[1]?.items[0]?.exercise_id).toBe("sq");
  });
});

describe("buildAddedBlockFromGeneratedSession", () => {
  it("extracts, dedupes, and relabels the requested block", () => {
    const generated = workout([
      block("warmup", ["wu"]),
      block("main_hypertrophy", ["bench", "fly", "press", "pushdown"]),
      block("cooldown", ["stretch"]),
    ]);
    const added = buildAddedBlockFromGeneratedSession(generated, "main_hypertrophy", ["bench"], "chest");
    expect(added).not.toBeNull();
    expect(added!.block_type).toBe("main_hypertrophy");
    expect(added!.title).toBe("Hypertrophy");
    expect(added!.items.map((i) => i.exercise_id)).toEqual(["fly", "press", "pushdown"]);
    expect(added!.goal_intent?.sub_focus_slug).toBe("chest");
  });
});
