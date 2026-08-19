import { describe, expect, it } from "vitest";
import { loadStaticExerciseDefinitions as loadNative } from "./staticExerciseCatalog.native";
import { loadStaticExerciseDefinitions as loadWeb } from "./staticExerciseCatalog.web";

describe("staticExerciseCatalog platform stubs", () => {
  it("native and web stubs do not ship the TypeScript catalogs", async () => {
    await expect(loadNative()).resolves.toEqual([]);
    await expect(loadWeb()).resolves.toEqual([]);
  });
});
