import { describe, expect, it } from "vitest";
import { resolveSessionContext } from "./qualityResolution";
import type { SessionTemplateV2 } from "../types";

describe("resolveSessionContext main block goal dominance", () => {
  it("anchors the earliest main block to the primary goal (ignores secondary goals)", () => {
    const template: SessionTemplateV2 = {
      id: "t",
      session_type: "full_body",
      stimulus_profile: "sport_support_strength",
      duration_minutes_min: 30,
      duration_minutes_max: 60,
      fatigue_budget: { kind: "level", level: "moderate" },
      block_specs: [
        { block_type: "warmup", format: "circuit", min_items: 2, max_items: 3 },
        { block_type: "main_strength", format: "straight_sets", min_items: 2, max_items: 4 },
        { block_type: "accessory", format: "superset", min_items: 2, max_items: 4 },
      ],
    };

    const ctx = resolveSessionContext(
      {
        primary_goal: "power",
        secondary_goals: ["strength"],
        available_equipment: [],
        duration_minutes: 45,
        energy_level: "medium",
        sports: ["boxing"],
        sport_sub_focus: { boxing: ["rotational_power"] },
      },
      template
    );

    // Main block qualities should not be identical to the blended session qualities
    // when secondary goals are present (primary-dominant override should apply).
    expect(ctx.block_qualities[1].weights).not.toEqual(ctx.session_qualities.weights);
  });
});

