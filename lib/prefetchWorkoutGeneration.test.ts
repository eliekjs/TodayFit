import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getExercisePoolForManualGeneration = vi.fn(async () => []);
const loadGeneratorModule = vi.fn(async () => ({
  getExercisePoolForManualGeneration,
}));
const isDbConfigured = vi.fn(() => true);

vi.mock("./loadGeneratorModule", () => ({
  loadGeneratorModule: () => loadGeneratorModule(),
}));
vi.mock("./db/client", () => ({
  isDbConfigured: () => isDbConfigured(),
}));

describe("prefetchWorkoutGenerationStack", () => {
  beforeEach(() => {
    vi.resetModules();
    loadGeneratorModule.mockClear();
    getExercisePoolForManualGeneration.mockClear();
    isDbConfigured.mockClear();
    isDbConfigured.mockReturnValue(true);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("defers work until idle and skips catalog on web by default", async () => {
    vi.doMock("react-native", () => ({ Platform: { OS: "web" } }));
    const { prefetchWorkoutGenerationStack } = await import("./prefetchWorkoutGeneration");

    prefetchWorkoutGenerationStack();
    expect(loadGeneratorModule).not.toHaveBeenCalled();

    await vi.runAllTimersAsync();
    await Promise.resolve();
    await Promise.resolve();

    expect(loadGeneratorModule).toHaveBeenCalledTimes(1);
    expect(getExercisePoolForManualGeneration).not.toHaveBeenCalled();
  });

  it("warms catalog when includeCatalog is true", async () => {
    vi.doMock("react-native", () => ({ Platform: { OS: "web" } }));
    const { prefetchWorkoutGenerationStack } = await import("./prefetchWorkoutGeneration");

    prefetchWorkoutGenerationStack({ includeCatalog: true });
    await vi.runAllTimersAsync();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(getExercisePoolForManualGeneration).toHaveBeenCalled();
  });
});
