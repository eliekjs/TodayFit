import { describe, expect, it } from "vitest";
import { EXERCISES } from "../../data/exercisesMerged";
import { exerciseDefinitionToGeneratorExercise } from "../../lib/dailyGeneratorAdapter";
import {
  exerciseHasSubFocusSlug,
  exerciseLooksLikeSprintDrill,
} from "../../data/goalSubFocus/conditioningSubFocus";

describe("conditioningSubFocus threshold and hills matching", () => {
  it("excludes sprint drills from threshold via lactate_threshold legacy bridge", () => {
    for (const id of ["bound_to_sprint", "build_up_sprint", "wall_sprint_drill"]) {
      const ex = exerciseDefinitionToGeneratorExercise(EXERCISES.find((e) => e.id === id)!);
      expect(exerciseLooksLikeSprintDrill(ex)).toBe(true);
      expect(exerciseHasSubFocusSlug(ex, "threshold_tempo")).toBe(false);
    }
  });

  it("keeps true threshold work tagged", () => {
    const ex = exerciseDefinitionToGeneratorExercise(
      EXERCISES.find((e) => e.id === "treadmill_tempo_run")!
    );
    expect(exerciseHasSubFocusSlug(ex, "threshold_tempo")).toBe(true);
    expect(exerciseLooksLikeSprintDrill(ex)).toBe(false);
  });

  it("hills legacy match rejects incline press patterns", () => {
    const inclinePress = exerciseDefinitionToGeneratorExercise({
      id: "incline_bench_test",
      name: "Barbell Incline Press",
      muscles: ["chest"],
      modalities: ["strength"],
      equipment: ["barbell", "bench"],
      tags: [],
    });
    expect(exerciseHasSubFocusSlug(inclinePress, "hills")).toBe(false);
  });
});
