import { describe, expect, it } from "vitest";
import type { GeneratedWorkout } from "./types";
import {
  buildWorkoutLogExercises,
  formatLoggedSetRow,
  summarizeWorkoutLog,
} from "./workoutCompletionLog";

const workout: GeneratedWorkout = {
  id: "w1",
  focus: ["Strength"],
  durationMinutes: 45,
  energyLevel: "medium",
  blocks: [
    {
      block_type: "main_strength",
      format: "straight_sets",
      items: [
        {
          exercise_id: "squat",
          exercise_name: "Back Squat",
          sets: 3,
          reps: 5,
          rest_seconds: 90,
          coaching_cues: "",
        },
        {
          exercise_id: "run",
          exercise_name: "Assault Bike",
          sets: 4,
          time_seconds: 60,
          rest_seconds: 30,
          coaching_cues: "",
        },
      ],
    },
  ],
};

describe("workoutCompletionLog", () => {
  it("builds log entries from completed workout notes and performance", () => {
    const entries = buildWorkoutLogExercises(workout, { squat: "Felt heavy" }, {
      squat: {
        sets: [
          { id: "s1", reps: 5, load_kg: 100 },
          { id: "s2", reps: 5, load_kg: 100, notes: "slow" },
        ],
      },
    });

    expect(entries).toHaveLength(1);
    expect(entries[0]?.exerciseName).toBe("Back Squat");
    expect(entries[0]?.exerciseNotes).toBe("Felt heavy");
    expect(entries[0]?.sets).toHaveLength(2);
  });

  it("builds log entries from saved in-progress progress", () => {
    const entries = buildWorkoutLogExercises(workout, undefined, undefined, {
      run: {
        completed: false,
        setsCompleted: 2,
        sets: [{ id: "r1", duration_seconds: 60, notes: "hard" }],
        notes: "Need more rest",
      },
    });

    expect(entries).toHaveLength(1);
    expect(entries[0]?.exerciseName).toBe("Assault Bike");
    expect(entries[0]?.isTimeBased).toBe(true);
    expect(entries[0]?.exerciseNotes).toBe("Need more rest");
    expect(entries[0]?.completed).toBe(false);
  });

  it("summarizes logged exercises, sets, and notes", () => {
    const summary = summarizeWorkoutLog(workout, { squat: "Good" }, {
      squat: { sets: [{ id: "s1", reps: 5, load_kg: 100 }] },
    });
    expect(summary).toBe("1 exercise logged · 1 set · 1 note");
  });

  it("formats strength and round rows", () => {
    expect(formatLoggedSetRow({ id: "s1", reps: 8, load_kg: 50 }, 0, "strength")).toBe(
      "Set 1: 8 reps · @ 50"
    );
    expect(formatLoggedSetRow({ id: "r1", duration_seconds: 90, notes: "tough" }, 1, "rounds")).toBe(
      "Round 2: 1.5 min · tough"
    );
  });
});
