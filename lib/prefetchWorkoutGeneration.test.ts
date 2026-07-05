import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const loadGeneratorModule = vi.fn(async () => ({ generateWorkoutAsync: vi.fn() }));

vi.mock("./loadGeneratorModule", () => ({
  loadGeneratorModule,
}));

describe("prefetchWorkoutGenerationStack", () => {
  beforeEach(() => {
    vi.resetModules();
    loadGeneratorModule.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads only the generator module, not the exercise catalog", async () => {
    const { prefetchWorkoutGenerationStack } = await import("./prefetchWorkoutGeneration");
    await prefetchWorkoutGenerationStack();
    expect(loadGeneratorModule).toHaveBeenCalledTimes(1);
  });

  it("dedupes concurrent prefetch calls", async () => {
    const { prefetchWorkoutGenerationStack } = await import("./prefetchWorkoutGeneration");
    await Promise.all([
      prefetchWorkoutGenerationStack(),
      prefetchWorkoutGenerationStack(),
    ]);
    expect(loadGeneratorModule).toHaveBeenCalledTimes(1);
  });
});

describe("scheduleWorkoutGenerationPrefetch", () => {
  beforeEach(() => {
    vi.resetModules();
    loadGeneratorModule.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("respects delayMs before prefetching", async () => {
    const { scheduleWorkoutGenerationPrefetch } = await import("./prefetchWorkoutGeneration");
    scheduleWorkoutGenerationPrefetch({ delayMs: 1000 });
    expect(loadGeneratorModule).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1000);
    expect(loadGeneratorModule).toHaveBeenCalledTimes(1);
  });

  it("cancels scheduled prefetch on cleanup", async () => {
    const { scheduleWorkoutGenerationPrefetch } = await import("./prefetchWorkoutGeneration");
    const cancel = scheduleWorkoutGenerationPrefetch({ delayMs: 1000 });
    cancel();
    await vi.advanceTimersByTimeAsync(2000);
    expect(loadGeneratorModule).not.toHaveBeenCalled();
  });
});
