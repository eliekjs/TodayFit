import { describe, expect, it } from "vitest";
import type { GymProfile } from "../../data/gymProfiles";
import { GOAL_SUB_FOCUS_OPTIONS } from "../../data/goalSubFocus/goalSubFocusOptions";
import { PRIMARY_FOCUS_OPTIONS } from "../../lib/preferencesConstants";
import { manualPreferencesToGenerateWorkoutInput } from "../../lib/dailyGeneratorAdapter";
import type { ManualPreferences } from "../../lib/types";
import { generateWorkoutSession } from "./dailyGenerator";
import { STUB_EXERCISES } from "./exerciseStub";
import type { Exercise } from "./types";
import { buildJointHealthMain } from "./jointHealthSession";

const TEST_GYM: GymProfile = {
  id: "test_gym",
  name: "Test Gym",
  equipment: [
    "bodyweight",
    "dumbbells",
    "kettlebells",
    "bands",
    "cable_machine",
    "bench",
  ],
};

describe("joint health goal in selection UI", () => {
  it("appears in PRIMARY_FOCUS_OPTIONS", () => {
    expect(PRIMARY_FOCUS_OPTIONS).toContain("Strength Training for Joint Health");
    expect(PRIMARY_FOCUS_OPTIONS).toContain("Recovery & Mobility");
    expect(PRIMARY_FOCUS_OPTIONS).not.toContain("Mobility & Joint Health");
  });

  it("defines six joint-specific sub-goals", () => {
    const entry = GOAL_SUB_FOCUS_OPTIONS["Strength Training for Joint Health"];
    expect(entry.goalSlug).toBe("joint_health");
    expect(entry.subFocuses.map((f) => f.slug)).toEqual([
      "knee_health",
      "shoulder_health",
      "hip_health",
      "ankle_foot_health",
      "back_spine_health",
      "elbow_wrist_health",
    ]);
  });
});

describe("buildJointHealthMain", () => {
  const basePrefs = (subs: string[]): ManualPreferences => ({
    primaryFocus: ["Strength Training for Joint Health"],
    targetBody: null,
    targetModifier: [],
    durationMinutes: 45,
    energyLevel: "medium",
    injuries: ["No restrictions"],
    upcoming: [],
    subFocusByGoal: {
      "Strength Training for Joint Health": subs,
    },
    workoutStyle: [],
    workoutTier: "intermediate",
  });

  it("produces PT-style block structure with activation, strength, and stability", () => {
    const input = manualPreferencesToGenerateWorkoutInput(basePrefs(["Knee Health"]), undefined, "jh-structure");
    const used = new Set<string>();
    const blocks = buildJointHealthMain(STUB_EXERCISES, input, used, () => 0.42);
    expect(blocks.length).toBeGreaterThanOrEqual(2);
    const titles = blocks.map((b) => b.title ?? "");
    expect(titles.some((t) => t.includes("activation") || t.includes("prep"))).toBe(true);
    expect(titles.some((t) => t.includes("Controlled strength") || t.includes("Stability"))).toBe(true);
    const allItems = blocks.flatMap((b) => b.items);
    expect(allItems.length).toBeGreaterThanOrEqual(4);
    expect(allItems.every((it) => (it.reasoning_tags ?? []).includes("joint_health"))).toBe(true);
  });

  it("excludes high-impact exercises from generated joint health sessions", () => {
    const withPlyo: Exercise[] = [
      ...STUB_EXERCISES,
      {
        id: "box_jump_test",
        name: "Box Jump",
        movement_pattern: "locomotion",
        muscle_groups: ["legs"],
        modality: "power",
        equipment_required: ["box"],
        difficulty: 3,
        time_cost: "low",
        tags: {
          goal_tags: ["power"],
          energy_fit: ["high"],
          stimulus: ["plyometric"],
        },
      },
    ];
    const input = manualPreferencesToGenerateWorkoutInput(basePrefs(["Knee Health"]), undefined, "jh-exclude");
    const used = new Set<string>();
    const blocks = buildJointHealthMain(withPlyo, input, used, () => 0.1);
    const ids = blocks.flatMap((b) => b.items.map((i) => i.exercise_id));
    expect(ids).not.toContain("box_jump_test");
  });

  it("generates end-to-end via dailyGenerator with knee health sub-focus", () => {
    const input = manualPreferencesToGenerateWorkoutInput(basePrefs(["Knee Health"]), TEST_GYM, "jh-e2e");
    expect(input.primary_goal).toBe("joint_health");
    expect(input.goal_sub_focus?.joint_health).toContain("knee_health");

    const session = generateWorkoutSession(input, STUB_EXERCISES);
    expect(session.blocks.length).toBeGreaterThan(0);
    const itemCount = session.blocks.reduce((n, b) => n + b.items.length, 0);
    expect(itemCount).toBeGreaterThanOrEqual(3);
    const hasJointHealthTag = session.blocks.some((b) =>
      b.items.some((it) => (it.reasoning_tags ?? []).includes("joint_health"))
    );
    expect(hasJointHealthTag).toBe(true);

    const banned = new Set(["box_jump", "burpee", "kb_swing", "kettlebell_swing", "back_squat", "barbell_squat"]);
    const ids = session.blocks.flatMap((b) => b.items.map((i) => i.exercise_id));
    for (const id of ids) {
      expect(banned.has(id)).toBe(false);
    }
    expect(ids.some((id) => id.includes("bench_press") || id === "dips")).toBe(false);
  });
});
