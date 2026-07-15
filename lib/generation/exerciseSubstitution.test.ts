import { describe, it, expect } from "vitest";
import {
  getSubstitutes,
  getBestSubstitute,
  type ExerciseLike,
} from "./exerciseSubstitution";

function makeEx(partial: Partial<ExerciseLike> & Pick<ExerciseLike, "id" | "name">): ExerciseLike {
  return {
    movement_pattern: "",
    muscle_groups: [],
    equipment_required: [],
    ...partial,
  };
}

describe("getSubstitutes — similarity ranking", () => {
  const squat = makeEx({
    id: "barbell_back_squat",
    name: "Barbell Back Squat",
    movement_pattern: "squat",
    muscle_groups: ["quads", "glutes"],
    equipment_required: ["barbell"],
    modality: "strength",
    primary_movement_family: "squat",
    swap_candidates: ["front_squat", "goblet_squat"],
    progressions: ["front_squat"],
    regressions: ["goblet_squat"],
  });

  const pool: ExerciseLike[] = [
    squat,
    makeEx({
      id: "front_squat",
      name: "Front Squat",
      movement_pattern: "squat",
      muscle_groups: ["quads", "glutes"],
      equipment_required: ["barbell"],
      modality: "strength",
      primary_movement_family: "squat",
    }),
    makeEx({
      id: "goblet_squat",
      name: "Goblet Squat",
      movement_pattern: "squat",
      muscle_groups: ["quads", "glutes"],
      equipment_required: ["dumbbell"],
      modality: "strength",
      primary_movement_family: "squat",
    }),
    makeEx({
      id: "leg_press",
      name: "Leg Press",
      movement_pattern: "squat",
      muscle_groups: ["quads", "glutes"],
      equipment_required: ["machine"],
      modality: "strength",
      primary_movement_family: "squat",
    }),
    makeEx({
      id: "romanian_deadlift",
      name: "Romanian Deadlift",
      movement_pattern: "hinge",
      muscle_groups: ["hamstrings", "glutes"],
      equipment_required: ["barbell"],
      modality: "strength",
      primary_movement_family: "hinge",
    }),
    makeEx({
      id: "bench_press",
      name: "Bench Press",
      movement_pattern: "push",
      muscle_groups: ["chest", "triceps"],
      equipment_required: ["barbell"],
      modality: "strength",
      primary_movement_family: "horizontal_push",
    }),
    makeEx({
      id: "bike",
      name: "Bike",
      movement_pattern: "locomotion",
      muscle_groups: ["legs"],
      equipment_required: ["bike"],
      modality: "conditioning",
    }),
  ];

  it("ranks curated swap_candidates above other same-pattern options", () => {
    const subs = getSubstitutes(squat, pool, { maxResults: 5, allowSameCluster: true });
    expect(subs[0]?.exercise.id).toBe("front_squat");
    expect(subs[0]?.reason).toBe("curated_swap");
    expect(subs.map((s) => s.exercise.id)).toContain("goblet_squat");
    expect(subs.map((s) => s.exercise.id).indexOf("front_squat")).toBeLessThan(
      subs.map((s) => s.exercise.id).indexOf("leg_press")
    );
  });

  it("prefers same movement pattern over merely same modality", () => {
    const target = makeEx({
      id: "leg_press",
      name: "Leg Press",
      movement_pattern: "squat",
      muscle_groups: ["quads"],
      equipment_required: ["machine"],
      modality: "strength",
    });
    const localPool = [
      target,
      makeEx({
        id: "hack_squat",
        name: "Hack Squat",
        movement_pattern: "squat",
        muscle_groups: ["quads"],
        equipment_required: ["machine"],
        modality: "strength",
      }),
      makeEx({
        id: "cable_row",
        name: "Cable Row",
        movement_pattern: "pull",
        muscle_groups: ["back"],
        equipment_required: ["cable"],
        modality: "strength",
      }),
    ];
    const subs = getSubstitutes(target, localPool, { maxResults: 5, allowSameCluster: true });
    expect(subs[0]?.exercise.id).toBe("hack_squat");
    expect(subs[0]?.reason).toMatch(/pattern/);
  });

  it("does not treat empty movement_pattern as a universal pattern match", () => {
    const target = makeEx({
      id: "mystery_a",
      name: "Mystery A",
      movement_pattern: "",
      muscle_groups: ["core"],
      equipment_required: ["bodyweight"],
      modality: "strength",
    });
    const localPool = [
      target,
      makeEx({
        id: "mystery_b",
        name: "Mystery B",
        movement_pattern: "",
        muscle_groups: ["chest"],
        equipment_required: ["bodyweight"],
        modality: "strength",
      }),
      makeEx({
        id: "plank",
        name: "Plank",
        movement_pattern: "stabilize",
        muscle_groups: ["core"],
        equipment_required: ["bodyweight"],
        modality: "strength",
      }),
    ];
    const subs = getSubstitutes(target, localPool, { maxResults: 5, allowSameCluster: true });
    expect(subs.find((s) => s.exercise.id === "mystery_b")?.reason).not.toBe("same_pattern");
    expect(subs.find((s) => s.exercise.id === "plank")?.reason).toBe("same_muscles");
  });

  it("excludes same similarity cluster by default (session packing)", () => {
    const target = makeEx({
      id: "barbell_deadlift",
      name: "Barbell Deadlift",
      movement_pattern: "hinge",
      muscle_groups: ["hamstrings", "glutes"],
      equipment_required: ["barbell"],
      modality: "strength",
    });
    const localPool = [
      target,
      makeEx({
        id: "barbell_rdl",
        name: "Barbell RDL",
        movement_pattern: "hinge",
        muscle_groups: ["hamstrings", "glutes"],
        equipment_required: ["barbell"],
        modality: "strength",
      }),
      makeEx({
        id: "good_morning",
        name: "Good Morning",
        movement_pattern: "hinge",
        muscle_groups: ["hamstrings", "glutes"],
        equipment_required: ["barbell"],
        modality: "strength",
      }),
    ];
    const without = getSubstitutes(target, localPool, { maxResults: 5 });
    const withCluster = getSubstitutes(target, localPool, {
      maxResults: 5,
      allowSameCluster: true,
    });
    expect(without.map((s) => s.exercise.id)).not.toContain("barbell_rdl");
    expect(without.map((s) => s.exercise.id)).toContain("good_morning");
    expect(withCluster.map((s) => s.exercise.id)).toContain("barbell_rdl");
  });

  it("blocks cross-domain weak matches (conditioning vs strength)", () => {
    const subs = getSubstitutes(squat, pool, { maxResults: 10, allowSameCluster: true });
    expect(subs.map((s) => s.exercise.id)).not.toContain("bike");
  });

  it("getBestSubstitute returns the top-ranked candidate", () => {
    const best = getBestSubstitute(squat, pool, { allowSameCluster: true });
    expect(best?.exercise.id).toBe("front_squat");
  });

  it("boosts shared equipment when patterns tie", () => {
    const target = makeEx({
      id: "db_bench",
      name: "DB Bench",
      movement_pattern: "push",
      muscle_groups: ["chest"],
      equipment_required: ["dumbbell"],
      modality: "strength",
    });
    const localPool = [
      target,
      makeEx({
        id: "db_fly",
        name: "DB Fly",
        movement_pattern: "push",
        muscle_groups: ["chest"],
        equipment_required: ["dumbbell"],
        modality: "strength",
      }),
      makeEx({
        id: "machine_chest_press",
        name: "Machine Chest Press",
        movement_pattern: "push",
        muscle_groups: ["chest"],
        equipment_required: ["machine"],
        modality: "strength",
      }),
    ];
    const subs = getSubstitutes(target, localPool, { maxResults: 5, allowSameCluster: true });
    expect(subs[0]?.exercise.id).toBe("db_fly");
  });
});
