import { describe, expect, it } from "vitest";
import { resolveWorkoutConstraints } from "./resolveWorkoutConstraints";

describe("resolveWorkoutConstraints intent conditioning (Slice E)", () => {
  it("requires conditioning block when sport sub-focus is marathon_pace", () => {
    const c = resolveWorkoutConstraints({
      primary_goal: "strength",
      available_equipment: ["bodyweight"],
      duration_minutes: 60,
      energy_level: "medium",
      sport_sub_focus: { road_running: ["marathon_pace"] },
    });
    expect(c.required_conditioning_block).toBe(true);
  });

  it("requires conditioning block when goal sub-focus is zone2_aerobic_base", () => {
    const c = resolveWorkoutConstraints({
      primary_goal: "strength",
      available_equipment: ["bodyweight"],
      duration_minutes: 60,
      energy_level: "medium",
      goal_sub_focus: { conditioning: ["zone2_aerobic_base"] },
    });
    expect(c.required_conditioning_block).toBe(true);
  });

  it("does not require conditioning for strength-only squat sub-focus", () => {
    const c = resolveWorkoutConstraints({
      primary_goal: "strength",
      available_equipment: ["bodyweight"],
      duration_minutes: 60,
      energy_level: "medium",
      goal_sub_focus: { strength: ["squat"] },
    });
    expect(c.required_conditioning_block).toBeUndefined();
  });

  it("requires conditioning block when sport sub-focus is repeat_sprint (RSA)", () => {
    const c = resolveWorkoutConstraints({
      primary_goal: "strength",
      available_equipment: ["bodyweight"],
      duration_minutes: 60,
      energy_level: "medium",
      sport_sub_focus: { soccer: ["repeat_sprint"] },
    });
    expect(c.required_conditioning_block).toBe(true);
  });

  it("requires conditioning for hypertrophy primary with Sport Conditioning secondary", () => {
    const c = resolveWorkoutConstraints({
      primary_goal: "hypertrophy",
      available_equipment: ["bodyweight"],
      duration_minutes: 60,
      energy_level: "medium",
      secondary_goals: ["conditioning"],
    });
    expect(c.required_conditioning_block).toBe(true);
  });

  it("does not require conditioning for hypertrophy primary with RSA sport sub-focus only", () => {
    const c = resolveWorkoutConstraints({
      primary_goal: "hypertrophy",
      available_equipment: ["bodyweight"],
      duration_minutes: 60,
      energy_level: "medium",
      sport_sub_focus: { soccer: ["repeat_sprint"] },
    });
    expect(c.required_conditioning_block).toBeUndefined();
  });
});
