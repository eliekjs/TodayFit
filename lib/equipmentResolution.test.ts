import { describe, expect, it } from "vitest";
import {
  inferImplementsFromExerciseName,
  resolveExerciseEquipmentRequired,
} from "./equipmentResolution";
import {
  DEDICATED_MACHINE_EQUIPMENT,
  normalizeStoredGymEquipment,
  resolveEffectiveEquipment,
} from "./gymEquipment";
import type { EquipmentKey } from "./types";
import { exerciseDefinitionToGeneratorExercise } from "./dailyGeneratorAdapter";
import { mapDbExerciseToGeneratorExercise } from "./db/generatorExerciseAdapter";
import type { ExerciseRowWithOntology } from "./db/generatorExerciseAdapter";

describe("inferImplementsFromExerciseName", () => {
  it("maps specialty tools from name", () => {
    expect(inferImplementsFromExerciseName("ff_double_clubbell_swing")).toEqual([
      "clubbell",
    ]);
    expect(inferImplementsFromExerciseName("ff_landmine_press")).toEqual([
      "barbell",
      "plates",
    ]);
    expect(inferImplementsFromExerciseName("smith_machine_squat")).toEqual([
      "smith_machine",
    ]);
  });

  it("maps common free-weight implements", () => {
    expect(inferImplementsFromExerciseName("db_front_raise")).toEqual(["dumbbells"]);
    expect(inferImplementsFromExerciseName("barbell_split_squat")).toEqual(["barbell"]);
    expect(inferImplementsFromExerciseName("trap_bar_deadlift")).toEqual(["trap_bar"]);
    expect(inferImplementsFromExerciseName("cable_woodchops")).toEqual(["cable_machine"]);
  });

  it("does not treat rowing rows as rower cardio", () => {
    expect(inferImplementsFromExerciseName("db_bent_over_row")).toEqual(["dumbbells"]);
    expect(inferImplementsFromExerciseName("cable_row")).toEqual(["cable_machine"]);
  });

  it("maps bench press variants", () => {
    expect(inferImplementsFromExerciseName("bench_press")).toEqual(["barbell", "bench"]);
    expect(inferImplementsFromExerciseName("dumbbell_bench_press")).toEqual([
      "dumbbells",
      "bench",
    ]);
  });
});

describe("resolveExerciseEquipmentRequired", () => {
  it("replaces bodyweight-only mislabels with inferred implements", () => {
    expect(
      resolveExerciseEquipmentRequired(["bodyweight"], "clubbell_lunges", "Clubbell Lunges")
    ).toEqual(["clubbell"]);
    expect(
      resolveExerciseEquipmentRequired(["bodyweight"], "db_front_raise", "DB Front Raise")
    ).toEqual(["dumbbells"]);
  });

  it("merges inferred implements with non-bodyweight stored equipment", () => {
    expect(
      resolveExerciseEquipmentRequired(
        ["bodyweight", "plyo_box"],
        "ff_clubbell_box_step_up",
        "Clubbell Box Step Up"
      )
    ).toEqual(["clubbell", "plyo_box"]);
  });

  it("keeps valid multi-equipment rows unchanged when no name hint", () => {
    expect(
      resolveExerciseEquipmentRequired(
        ["bodyweight", "plyo_box"],
        "approach_box_jump",
        "Approach Box Jump"
      )
    ).toEqual(["bodyweight", "plyo_box"]);
  });

  it("defaults empty equipment to bodyweight", () => {
    expect(resolveExerciseEquipmentRequired([], "air_squat", "Air Squat")).toEqual([
      "bodyweight",
    ]);
  });
});

describe("resolveEffectiveEquipment", () => {
  it("adds machine when any dedicated machine station is selected", () => {
    for (const key of DEDICATED_MACHINE_EQUIPMENT) {
      const resolved = resolveEffectiveEquipment(["bodyweight", key]);
      expect(resolved).toContain("machine");
    }
  });

  it("does not add machine for cable-only setups", () => {
    const resolved = resolveEffectiveEquipment([
      "cable_machine",
      "dumbbells",
      "bodyweight",
    ]);
    expect(resolved).not.toContain("machine");
  });

  it("implies bench from adjustable_bench", () => {
    const resolved = resolveEffectiveEquipment(["adjustable_bench", "dumbbells", "bodyweight"]);
    expect(resolved).toContain("bench");
    expect(resolved).toContain("adjustable_bench");
  });

  it("implies plates from barbell and cable from lat pulldown", () => {
    const resolved = resolveEffectiveEquipment(["barbell", "lat_pulldown", "bodyweight"]);
    expect(resolved).toContain("plates");
    expect(resolved).toContain("cable_machine");
  });

  it("preserves all original selections", () => {
    const input: EquipmentKey[] = ["leg_press", "barbell", "bodyweight"];
    expect(resolveEffectiveEquipment(input)).toEqual(expect.arrayContaining(input));
  });
});

describe("normalizeStoredGymEquipment", () => {
  it("removes legacy explicit machine toggle from stored profiles", () => {
    const normalized = normalizeStoredGymEquipment([
      "leg_press",
      "machine",
      "bodyweight",
    ]);
    expect(normalized).toEqual(["leg_press", "bodyweight"]);
  });

  it("removes retired gada toggle from stored profiles", () => {
    expect(normalizeStoredGymEquipment(["gada", "dumbbells"])).toEqual(["dumbbells"]);
  });
});

describe("adapter equipment parity", () => {
  it("static adapter resolves mislabeled clubbell rows", () => {
    const ex = exerciseDefinitionToGeneratorExercise({
      id: "clubbell_lunges",
      name: "Clubbell Lunges",
      muscles: ["legs"],
      modalities: ["strength"],
      equipment: ["bodyweight"],
      tags: [],
    });
    expect(ex.equipment_required).toEqual(["clubbell"]);
  });

  it("db adapter resolves mislabeled kettlebell rows", () => {
    const row: ExerciseRowWithOntology = {
      id: "uuid",
      slug: "kettlebell_swing",
      name: "Kettlebell Swing",
      primary_muscles: ["legs"],
      secondary_muscles: [],
      equipment: ["bodyweight"],
      modalities: ["strength"],
      movement_pattern: "hinge",
    };
    const ex = mapDbExerciseToGeneratorExercise(row, [], [], [], []);
    expect(ex.equipment_required).toEqual(["kettlebells"]);
  });
});
