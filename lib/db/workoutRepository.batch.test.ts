import { describe, expect, it } from "vitest";
import { buildGeneratedWorkoutMapFromRows } from "./workoutRepository";

describe("buildGeneratedWorkoutMapFromRows", () => {
  it("maps workouts, blocks, and items with stable sort and prescription defaults", () => {
    const workouts = [
      {
        id: "w1",
        intent: {
          focus: ["upper"],
          durationMinutes: 45,
          energyLevel: "medium",
          notes: "note-1",
        },
        created_at: "2026-04-21T00:00:00Z",
      },
      {
        id: "w2",
        intent: {
          focus: ["lower"],
          durationMinutes: 30,
          energyLevel: "low",
        },
        created_at: "2026-04-21T01:00:00Z",
      },
    ];

    const blockRows = [
      {
        id: "b2",
        workout_id: "w1",
        block_type: "cooldown",
        title: "Cooldown",
        reasoning: null,
        sort_order: 1,
      },
      {
        id: "b1",
        workout_id: "w1",
        block_type: "main_strength",
        title: "Main",
        reasoning: "heavy",
        sort_order: 0,
      },
    ];

    const exRows = [
      {
        block_id: "b1",
        exercise_slug: "row",
        exercise_name: "Row",
        prescription: { sets: 4, reps: 8, rest_seconds: 90, coaching_cues: "brace" },
        sort_order: 1,
      },
      {
        block_id: "b1",
        exercise_slug: "bench",
        exercise_name: "Bench",
        prescription: { text: "legacy cue" },
        sort_order: 0,
      },
      {
        block_id: "b2",
        exercise_slug: "cat_camel",
        exercise_name: "Cat Camel",
        prescription: { sets: 1, time_seconds: 45, unilateral: true },
        sort_order: 0,
      },
    ];

    const out = buildGeneratedWorkoutMapFromRows(workouts, blockRows, exRows);

    expect(Object.keys(out).sort()).toEqual(["w1", "w2"]);
    expect(out.w2?.blocks).toEqual([]);

    const w1 = out.w1!;
    expect(w1.focus).toEqual(["upper"]);
    expect(w1.durationMinutes).toBe(45);
    expect(w1.blocks.map((b) => b.title)).toEqual(["Main", "Cooldown"]);
    expect(w1.blocks[0]?.items.map((i) => i.exercise_id)).toEqual(["bench", "row"]);
    expect(w1.blocks[0]?.items[0]).toMatchObject({
      sets: 1,
      rest_seconds: 0,
      coaching_cues: "legacy cue",
    });
    expect(w1.blocks[1]?.items[0]).toMatchObject({
      exercise_id: "cat_camel",
      unilateral: true,
      time_seconds: 45,
    });
  });
});
