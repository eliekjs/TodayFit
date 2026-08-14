import { describe, expect, it } from "vitest";
import {
  applySessionBlockPresentation,
  resolveSupportBlockTitle,
} from "./sessionBlockPresentation";

describe("sessionBlockPresentation", () => {
  it("names first main_strength Primary and later ones Secondary", () => {
    const blocks = [
      { block_type: "warmup", title: "Activation", items: [] },
      { block_type: "power", title: "Power block", items: [{ exercise_id: "jump", exercise_name: "Jump squat" }] },
      {
        block_type: "main_strength",
        title: "Main strength",
        items: [{ exercise_id: "squat", exercise_name: "Back squat" }],
      },
      {
        block_type: "main_strength",
        title: "Main strength",
        items: [{ exercise_id: "rdl", exercise_name: "RDL" }],
      },
      {
        block_type: "accessory",
        title: "Accessory",
        items: [{ exercise_id: "curl", exercise_name: "Curl" }],
      },
      {
        block_type: "conditioning",
        title: "Conditioning",
        items: [{ exercise_id: "bike", exercise_name: "Bike" }],
      },
      {
        block_type: "cooldown",
        title: "Cooldown",
        items: [{ exercise_id: "stretch", exercise_name: "Hamstring stretch" }],
      },
    ];
    applySessionBlockPresentation(blocks);
    expect(blocks.map((b) => b.title)).toEqual([
      "Activation",
      "Power / Speed",
      "Primary Strength",
      "Secondary Strength",
      "Accessory",
      "Conditioning",
      "Mobility",
    ]);
  });

  it("names support from knee / shoulder / core content", () => {
    expect(
      resolveSupportBlockTitle({
        block_type: "cooldown",
        items: [{ exercise_id: "tke", exercise_name: "Terminal knee extension" }],
      })
    ).toBe("Knee Resilience");
    expect(
      resolveSupportBlockTitle({
        block_type: "accessory",
        items: [{ exercise_id: "face_pull", exercise_name: "Face pull for shoulders" }],
      })
    ).toBe("Shoulder Stability");
    expect(
      resolveSupportBlockTitle({
        block_type: "core",
        items: [{ exercise_id: "pallof", exercise_name: "Pallof press" }],
      })
    ).toBe("Core");
  });

  it("keeps a lone secondary-goal strength block as Secondary Strength", () => {
    const blocks = [
      {
        block_type: "main_strength",
        title: "Secondary Strength",
        items: [{ exercise_id: "squat", exercise_name: "Back squat" }],
      },
    ];
    applySessionBlockPresentation(blocks);
    expect(blocks[0]?.title).toBe("Secondary Strength");
  });

  it("renames accessory work titled Secondary strength to Accessory", () => {
    const blocks = [
      {
        block_type: "accessory",
        title: "Secondary strength",
        items: [{ exercise_id: "curl", exercise_name: "Curl" }],
      },
    ];
    applySessionBlockPresentation(blocks);
    expect(blocks[0]?.title).toBe("Accessory");
  });

  it("keeps Calisthenics titles", () => {
    const blocks = [
      {
        block_type: "main_strength",
        title: "Calisthenics",
        items: [{ exercise_id: "pullup", exercise_name: "Pull-up" }],
      },
    ];
    applySessionBlockPresentation(blocks);
    expect(blocks[0]?.title).toBe("Calisthenics");
  });

  it("preserves joint-health and other specific titles", () => {
    const blocks = [
      { block_type: "warmup", title: "Joint prep / activation", items: [] },
      {
        block_type: "main_strength",
        title: "Controlled strength",
        items: [{ exercise_id: "bird_dog", exercise_name: "Bird dog" }],
      },
      {
        block_type: "main_strength",
        title: "Stability & unilateral",
        items: [{ exercise_id: "dead_bug", exercise_name: "Dead bug" }],
      },
      {
        block_type: "cooldown",
        title: "Mobility finisher",
        items: [{ exercise_id: "cat_cow", exercise_name: "Cat cow" }],
      },
    ];
    applySessionBlockPresentation(blocks);
    expect(blocks.map((b) => b.title)).toEqual([
      "Joint prep / activation",
      "Controlled strength",
      "Stability & unilateral",
      "Mobility finisher",
    ]);
  });
});
