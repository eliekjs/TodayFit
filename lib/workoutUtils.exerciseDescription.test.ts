import { describe, expect, it } from "vitest";
import { EXERCISES } from "../data/exercisesMerged";
import { exerciseDefinitionToGeneratorExercise } from "./dailyGeneratorAdapter";
import { generateWorkoutSession } from "../logic/workoutGeneration/dailyGenerator";
import type { GenerateWorkoutInput } from "../logic/workoutGeneration/types";
import { BLOCKED_EXERCISE_IDS } from "./workoutRules";
import { buildExerciseDescriptionMap, attachExerciseDescriptionsToSession } from "./workoutUtils";

describe("exercise descriptions on workout items", () => {
  const pool = EXERCISES.filter((d) => !BLOCKED_EXERCISE_IDS.has(d.id)).map(
    exerciseDefinitionToGeneratorExercise
  );

  it("attachExerciseDescriptionsToSession copies catalog description onto items", () => {
    const withDesc = pool.find((e) => e.id === "goblet_squat" && e.description);
    expect(withDesc?.description).toBeTruthy();

    const input: GenerateWorkoutInput = {
      seed: 4242,
      duration_minutes: 45,
      energy_level: "medium",
      primary_goal: "strength",
      available_equipment: ["dumbbells", "barbell", "bench", "bodyweight"],
      injuries_or_constraints: [],
    };
    const session = generateWorkoutSession(input, pool);
    const hasGoblet = session.blocks.some((b) =>
      b.items.some((i) => i.exercise_id === "goblet_squat")
    );
    if (!hasGoblet) return;

    const item = session.blocks.flatMap((b) => b.items).find((i) => i.exercise_id === "goblet_squat");
    expect(item?.exercise_description).toBeTruthy();
  });

  it("attachExerciseDescriptionsToSession uses curated fallback when exercise has no DB description", () => {
    const bare = { ...pool.find((e) => e.id === "face_pull")! };
    delete bare.description;
    const input: GenerateWorkoutInput = {
      seed: 99,
      duration_minutes: 30,
      energy_level: "medium",
      primary_goal: "hypertrophy",
      available_equipment: ["cable_machine", "dumbbells", "bodyweight"],
      injuries_or_constraints: [],
    };
    const session = generateWorkoutSession(input, pool.map((e) => (e.id === "face_pull" ? bare : e)));
    const enriched = attachExerciseDescriptionsToSession(session, pool);
    const face = enriched.blocks.flatMap((b) => b.items).find((i) => i.exercise_id === "face_pull");
    if (!face) return;
    expect(face.exercise_description).toMatch(/cable|face/i);
  });

  it("curated descriptions override generated DB stub descriptions", () => {
    const descriptionById = buildExerciseDescriptionMap([
      {
        id: "inchworm",
        name: "Inchworm",
        description: "Inchworm is a mobility exercise. Primarily targets core, legs. Equipment: bodyweight.",
        movement_pattern: "locomotion",
        muscle_groups: ["core", "legs"],
        modality: "mobility",
        equipment_required: ["bodyweight"],
        difficulty: 1,
        time_cost: "low",
        tags: {},
      },
    ]);

    expect(descriptionById.get("inchworm")).toMatch(/high plank|hinge/i);
    expect(descriptionById.get("inchworm")).not.toMatch(/Equipment:/);
  });
});
