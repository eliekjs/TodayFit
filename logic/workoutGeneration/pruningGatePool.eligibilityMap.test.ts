import { describe, expect, it } from "vitest";
import { resolveEligibilityMapForGeneration } from "./pruningGatePool";
import type { Exercise, GenerateWorkoutInput } from "./types";

function ex(id: string, state?: string): Exercise {
  return {
    id,
    name: id,
    movement_pattern: "push",
    muscle_groups: ["chest"],
    modality: "strength",
    equipment_required: ["dumbbell"],
    difficulty: 2,
    time_cost: "low",
    tags: {},
    ...(state ? { curation_generator_eligibility_state: state } : {}),
  };
}

const input = (): GenerateWorkoutInput => ({
  duration_minutes: 45,
  primary_goal: "strength",
  energy_level: "medium",
  available_equipment: ["dumbbell"],
  injuries_or_constraints: [],
});

describe("resolveEligibilityMapForGeneration", () => {
  it("builds the map from pool curation fields without requiring the bundled JSON", () => {
    const map = resolveEligibilityMapForGeneration(input(), [
      ex("a", "eligible_core"),
      ex("b", "eligible_niche"),
    ]);
    expect(map.get("a")?.eligibility_state).toBe("eligible_core");
    expect(map.get("b")?.eligibility_state).toBe("eligible_niche");
    expect(map.size).toBe(2);
  });

  it("uses an explicit override map when provided", () => {
    const map = resolveEligibilityMapForGeneration(
      {
        ...input(),
        pruning_gate_eligibility_by_id: {
          a: {
            exercise_id: "a",
            exercise_name: "a",
            eligibility_state: "excluded_removed",
            pruning_recommendation: "remove_niche_or_low_value",
            merge_target_exercise_id: null,
            is_canonical_in_cluster: false,
            cluster_id: null,
          },
        },
      },
      [ex("a", "eligible_core")]
    );
    expect(map.get("a")?.eligibility_state).toBe("excluded_removed");
  });
});
