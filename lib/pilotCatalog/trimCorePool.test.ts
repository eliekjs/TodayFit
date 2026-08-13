import { describe, expect, it } from "vitest";
import {
  classifyUnlabeledState,
  keepScore,
  trimCorePool,
  type TrimExerciseRow,
} from "./trimCorePool";

function row(partial: Partial<TrimExerciseRow> & Pick<TrimExerciseRow, "id" | "slug" | "name">): TrimExerciseRow {
  return {
    modalities: ["strength"],
    equipment: ["dumbbells"],
    primary_muscles: ["chest"],
    movement_pattern: "push",
    curation_movement_patterns: null,
    exercise_role: "accessory",
    curation_primary_role: null,
    curation_equipment_class: null,
    curation_is_canonical: false,
    curation_complexity: null,
    warmup_relevance: null,
    cooldown_relevance: null,
    stretch_targets: null,
    mobility_targets: null,
    ...partial,
  };
}

describe("trimCorePool", () => {
  it("protects mobility and demotes near-duplicate strength variations", () => {
    const rows: TrimExerciseRow[] = [
      row({ id: "1", slug: "stretch_a", name: "Hip Stretch", modalities: ["mobility"] }),
      row({ id: "2", slug: "db_press", name: "Dumbbell Press", equipment: ["dumbbells"] }),
      row({
        id: "3",
        slug: "incline_db_press",
        name: "Incline Single-Arm Dumbbell Press",
        equipment: ["dumbbells"],
      }),
      row({
        id: "4",
        slug: "decline_db_press",
        name: "Decline Dumbbell Press Tempo",
        equipment: ["dumbbells"],
      }),
    ];
    const result = trimCorePool(rows, 2);
    expect(result.keepIds).toContain("1");
    expect(result.demoteIds.length).toBeGreaterThan(0);
    expect(result.keepIds).not.toContain("3");
  });

  it("classifies unlabeled mobility as core", () => {
    expect(
      classifyUnlabeledState(
        row({ id: "1", slug: "x", name: "Ankle Circles", modalities: ["mobility"] })
      )
    ).toBe("eligible_core");
    expect(
      classifyUnlabeledState(row({ id: "2", slug: "y", name: "Mystery Press" }))
    ).toBe("eligible_niche");
  });

  it("scores shorter canonical names higher", () => {
    const a = row({
      id: "1",
      slug: "press",
      name: "Bench Press",
      curation_is_canonical: true,
      equipment: ["barbell"],
    });
    const b = row({
      id: "2",
      slug: "press_var",
      name: "Incline Single-Arm Tempo Dumbbell Press",
      equipment: ["dumbbells"],
    });
    expect(keepScore(a)).toBeGreaterThan(keepScore(b));
  });
});
