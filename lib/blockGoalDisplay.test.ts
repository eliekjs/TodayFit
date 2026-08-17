import { describe, expect, it } from "vitest";
import { getBlockDisplayTitle } from "./blockGoalDisplay";
import type { WorkoutBlock, WorkoutBlockGoalIntent } from "./types";

function block(
  overrides: Partial<WorkoutBlock> & Pick<WorkoutBlock, "block_type">
): WorkoutBlock {
  return {
    format: "straight_sets",
    items: [],
    ...overrides,
  };
}

function goalIntent(goal_slug: string, extra?: Partial<WorkoutBlockGoalIntent>): WorkoutBlockGoalIntent {
  return { goal_slug, swap_pool_exercise_ids: [], ...extra };
}

describe("getBlockDisplayTitle", () => {
  it("keeps Calisthenics, HIIT, Zone 2, and joint-health PT titles even with a goal badge", () => {
    expect(
      getBlockDisplayTitle(
        block({
          block_type: "main_strength",
          title: "Calisthenics",
          goal_intent: goalIntent("calisthenics"),
        })
      )
    ).toBe("Calisthenics");
    expect(
      getBlockDisplayTitle(
        block({
          block_type: "conditioning",
          title: "HIIT intervals",
          goal_intent: goalIntent("conditioning", { sub_focus_slug: "intervals_hiit" }),
        })
      )
    ).toBe("HIIT intervals");
    expect(
      getBlockDisplayTitle(
        block({
          block_type: "conditioning",
          title: "Zone 2 sustained effort",
          goal_intent: goalIntent("endurance", { sub_focus_slug: "zone2_long_steady" }),
        })
      )
    ).toBe("Zone 2 sustained effort");
    expect(
      getBlockDisplayTitle(
        block({
          block_type: "main_strength",
          title: "Controlled strength",
          goal_intent: goalIntent("joint_health", { sub_focus_slug: "back_spine_health" }),
        })
      )
    ).toBe("Controlled strength");
    expect(
      getBlockDisplayTitle(
        block({
          block_type: "main_strength",
          title: "Stability & unilateral",
          goal_intent: goalIntent("joint_health"),
        })
      )
    ).toBe("Stability & unilateral");
    expect(
      getBlockDisplayTitle(
        block({
          block_type: "warmup",
          title: "Joint prep / activation",
          goal_intent: goalIntent("joint_health"),
        })
      )
    ).toBe("Joint prep / activation");
  });

  it("maps generic titles onto the six-block structure", () => {
    expect(getBlockDisplayTitle(block({ block_type: "main_strength", title: "Main strength" }))).toBe(
      "Primary Strength"
    );
    expect(
      getBlockDisplayTitle(block({ block_type: "main_strength", title: "Secondary Strength" }))
    ).toBe("Secondary Strength");
    expect(getBlockDisplayTitle(block({ block_type: "power", title: "Power block" }))).toBe(
      "Power / Speed"
    );
    expect(getBlockDisplayTitle(block({ block_type: "main_hypertrophy", title: "Main hypertrophy" }))).toBe(
      "Hypertrophy"
    );
  });

  it("strips overlay suffixes from specific titles when a goal badge is shown", () => {
    expect(
      getBlockDisplayTitle(
        block({
          block_type: "conditioning",
          title: "Zone 2 sustained effort (Road running)",
          goal_intent: goalIntent("road_running", { intent_kind: "sport" }),
        })
      )
    ).toBe("Zone 2 sustained effort");
  });
});
