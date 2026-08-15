import { describe, expect, it, beforeAll } from "vitest";
import { EXERCISES } from "../data/exercisesMerged";
import {
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

  it("validates all entries against catalog slugs and copy rules", () => {
    const known = new Set(EXERCISES.map((e) => e.id));
    const result = validateCuratedDescriptionsFile(known);
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
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
