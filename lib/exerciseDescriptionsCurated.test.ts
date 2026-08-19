import { describe, expect, it, beforeAll } from "vitest";
import {
  curatedSlugCandidates,
  ensureCuratedDescriptionsLoaded,
  getCuratedExerciseDescription,
  listCuratedExerciseDescriptionSlugs,
  resolveExerciseDescription,
  unwrapCuratedDescriptionsSource,
  validateCuratedDescriptionsFile,
} from "./exerciseDescriptionsCurated";

describe("exerciseDescriptions.curated.json", () => {
  beforeAll(async () => {
    await ensureCuratedDescriptionsLoaded();
  });

  it("validates all curated entries against copy rules", () => {
    const result = validateCuratedDescriptionsFile();
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("allows DB-only curated slugs that are not in the static catalog", () => {
    expect(getCuratedExerciseDescription("jm_press")).toMatch(/close grip|elbows|chin|upper chest/i);
    expect(getCuratedExerciseDescription("arnold_press")).toMatch(/rotat|palms|overhead/i);
    expect(getCuratedExerciseDescription("skull_crusher")).toMatch(/elbow|forehead|upper arms/i);
  });

  it("includes high-visibility builtin exercises", () => {
    const slugs = new Set(listCuratedExerciseDescriptionSlugs());
    expect(slugs.has("goblet_squat")).toBe(true);
    expect(slugs.has("hip_thrust")).toBe(true);
    expect(slugs.has("inchworm")).toBe(true);
    expect(slugs.has("decline_push_up")).toBe(true);
    expect(slugs.has("monster_walks")).toBe(true);
    expect(slugs.has("half_kneeling_thoracic_opener")).toBe(true);
    expect(getCuratedExerciseDescription("face_pull")).toMatch(/cable|face/i);
    expect(getCuratedExerciseDescription("inchworm")).toMatch(/plank|hinge/i);
    expect(getCuratedExerciseDescription("treadmill_run")).toMatch(/treadmill|running speed/i);
    expect(getCuratedExerciseDescription("medicine_ball_chest_pass")).toMatch(/medicine ball|chest/i);
    expect(getCuratedExerciseDescription("plank_shoulder_tap")).toMatch(/plank|tap/i);
    expect(getCuratedExerciseDescription("plank_shoulder_tap")).toBe(
      getCuratedExerciseDescription("plank_shoulder_taps")
    );
    for (const slug of [
      "dumbbell_push_press",
      "kettlebell_high_pull",
      "dumbbell_hang_clean",
      "kettlebell_dead_clean",
      "front_lever_tuck",
      "front_lever_advanced_tuck",
      "front_lever_negative",
      "box_pistol_squat",
      "wall_ankle_mobilization",
      "soleus_stretch_wall",
      "quadruped_sit_back",
    ] as const) {
      expect(slugs.has(slug), slug).toBe(true);
      expect(getCuratedExerciseDescription(slug), slug).toBeTruthy();
    }
  });

  it("tries singular and plural last-token slug variants", () => {
    expect(curatedSlugCandidates("plank_shoulder_tap")).toEqual([
      "plank_shoulder_tap",
      "plank_shoulder_taps",
    ]);
    expect(curatedSlugCandidates("plank_shoulder_taps")).toEqual([
      "plank_shoulder_taps",
      "plank_shoulder_tap",
    ]);
  });

  it("prefers curated copy over old generated stub copy", () => {
    const resolved = resolveExerciseDescription(
      "decline_push_up",
      "Decline Push-up is a upper-body push exercise. Primarily targets chest. Equipment: bodyweight, bench."
    );
    expect(resolved).toMatch(/bench|box/i);
    expect(resolved).not.toMatch(/Equipment:/);
  });

  it("unwraps JSON module shapes used by Metro native, Vite, and web asset URLs", () => {
    const file = {
      version: 1,
      entries: {
        goblet_squat: {
          description: "Hold the bell at your chest and squat.",
          sources: ["https://example.com"],
          reviewed_at: "2026-08-15",
        },
      },
    };

    expect(unwrapCuratedDescriptionsSource(file)).toEqual(file);
    expect(unwrapCuratedDescriptionsSource({ default: file })).toEqual(file);
    expect(unwrapCuratedDescriptionsSource({ default: { default: file } })).toEqual(file);
    expect(unwrapCuratedDescriptionsSource("/assets/exerciseDescriptions.curated.json")).toBe(
      "/assets/exerciseDescriptions.curated.json"
    );
    expect(unwrapCuratedDescriptionsSource({ default: "/assets/descriptions.json" })).toBe(
      "/assets/descriptions.json"
    );
    expect(() => unwrapCuratedDescriptionsSource({ hello: true })).toThrow(/not a valid catalog file/i);
  });
});
