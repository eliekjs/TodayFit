import { describe, it, expect, vi, beforeEach } from "vitest";
import { getSwapSuggestionsPage } from "./exerciseProgressions";
import type { ExerciseDefinition } from "./types";

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("./db", () => ({
  isDbConfigured: vi.fn(() => true),
}));

vi.mock("./db/exerciseRepository", () => ({
  getExercise: vi.fn(),
  getProgressionsRegressions: vi.fn(),
  listExercises: vi.fn(),
}));

vi.mock("./generation/exerciseSubstitution", () => ({
  getSubstitutes: vi.fn(() => []),
}));

vi.mock("./workoutRules", () => ({
  isCooldownEligibleEquipment: vi.fn(() => true),
  isWarmupEligibleEquipment: vi.fn(() => true),
}));

vi.mock("./workoutLevel", () => ({
  exerciseMatchesWorkoutTier: vi.fn(
    (levels: string[], tier: string) => levels.includes(tier)
  ),
  inferCreativeVariationFromSource: vi.fn(() => false),
  inferWorkoutLevelsWithExplanation: vi.fn((src: { workout_levels?: string[] }) => ({
    levels: src.workout_levels ?? ["beginner", "intermediate", "advanced"],
  })),
  isComplexSkillLiftForNonAdvanced: vi.fn(() => false),
  isHardBlockedForBeginnerTier: vi.fn(() => false),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import { getExercise, getProgressionsRegressions, listExercises } from "./db/exerciseRepository";

const mockGetExercise = getExercise as ReturnType<typeof vi.fn>;
const mockGetProgressionsRegressions = getProgressionsRegressions as ReturnType<typeof vi.fn>;
const mockListExercises = listExercises as ReturnType<typeof vi.fn>;

function makeDef(id: string, opts: Partial<ExerciseDefinition> = {}): ExerciseDefinition {
  return {
    id,
    name: id.replace(/_/g, " "),
    muscles: [],
    modalities: ["strength"],
    equipment: ["barbell"],
    tags: [],
    workout_levels: ["beginner", "intermediate", "advanced"],
    ...opts,
  };
}

const ALL_EXERCISES: ExerciseDefinition[] = [
  makeDef("squat"),
  makeDef("deadlift"),
  makeDef("lunge"),
  makeDef("leg_press"),
  makeDef("front_squat"),
  makeDef("goblet_squat"),
  makeDef("bench_press"),
  makeDef("row"),
  makeDef("advanced_snatch", { workout_levels: ["advanced"] }),
];

beforeEach(() => {
  vi.clearAllMocks();
  mockGetExercise.mockResolvedValue(makeDef("squat"));
  mockGetProgressionsRegressions.mockResolvedValue({ progressions: [], regressions: [] });
  mockListExercises.mockResolvedValue(ALL_EXERCISES);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("getSwapSuggestionsPage — swapPoolExerciseIds restriction", () => {
  it("restricts suggestions to pool IDs only (excluding the current exercise)", async () => {
    const pool = ["deadlift", "lunge", "leg_press"];
    const { suggestions, numPages } = await getSwapSuggestionsPage(
      "squat",
      { swapPoolExerciseIds: pool, workoutTier: "intermediate" },
      0
    );

    const ids = suggestions.map((s) => s.id);
    // All returned suggestions must come from the pool
    for (const id of ids) {
      expect(pool).toContain(id);
    }
    // The current exercise must not appear
    expect(ids).not.toContain("squat");
    // Results from outside the pool must not appear
    expect(ids).not.toContain("bench_press");
    expect(ids).not.toContain("front_squat");
    // Pool has 3 items → 1 page of 3
    expect(numPages).toBe(1);
    expect(suggestions.length).toBe(3);
  });

  it("places progressions/regressions that are in the pool first", async () => {
    mockGetProgressionsRegressions.mockResolvedValue({
      progressions: [],
      regressions: [{ id: "goblet_squat", name: "Goblet Squat" }],
    });

    const pool = ["goblet_squat", "deadlift", "lunge"];
    const { suggestions } = await getSwapSuggestionsPage(
      "squat",
      { swapPoolExerciseIds: pool, workoutTier: "intermediate" },
      0
    );

    // goblet_squat is in both regressions and pool → should be first
    expect(suggestions[0]?.id).toBe("goblet_squat");
    // remaining pool IDs must all appear
    const ids = suggestions.map((s) => s.id);
    expect(ids).toContain("deadlift");
    expect(ids).toContain("lunge");
  });

  it("does not include out-of-pool exercises even when they are progressions/regressions", async () => {
    mockGetProgressionsRegressions.mockResolvedValue({
      progressions: [{ id: "front_squat", name: "Front Squat" }],
      regressions: [{ id: "goblet_squat", name: "Goblet Squat" }],
    });

    const pool = ["deadlift", "lunge"];
    const { suggestions } = await getSwapSuggestionsPage(
      "squat",
      { swapPoolExerciseIds: pool, workoutTier: "intermediate" },
      0
    );

    const ids = suggestions.map((s) => s.id);
    expect(ids).not.toContain("front_squat");
    expect(ids).not.toContain("goblet_squat");
    expect(ids).toContain("deadlift");
    expect(ids).toContain("lunge");
  });

  it("applies tier filter within the pool (advanced exercises excluded for beginner tier)", async () => {
    const pool = ["deadlift", "advanced_snatch", "lunge"];
    const { suggestions } = await getSwapSuggestionsPage(
      "squat",
      { swapPoolExerciseIds: pool, workoutTier: "beginner" },
      0
    );

    const ids = suggestions.map((s) => s.id);
    // advanced_snatch has workout_levels: ["advanced"] only — must be excluded for beginner
    expect(ids).not.toContain("advanced_snatch");
    expect(ids).toContain("deadlift");
    expect(ids).toContain("lunge");
  });

  it("falls back to tag-similarity (progressions/regressions) when pool is empty", async () => {
    mockGetProgressionsRegressions.mockResolvedValue({
      progressions: [{ id: "front_squat", name: "Front Squat" }],
      regressions: [{ id: "goblet_squat", name: "Goblet Squat" }],
    });

    const { suggestions } = await getSwapSuggestionsPage(
      "squat",
      { swapPoolExerciseIds: [], workoutTier: "intermediate" },
      0
    );

    const ids = suggestions.map((s) => s.id);
    // Empty pool → fall back → progressions/regressions should appear
    expect(ids.some((id) => ["front_squat", "goblet_squat"].includes(id))).toBe(true);
  });

  it("falls back to tag-similarity when no pool is provided", async () => {
    mockGetProgressionsRegressions.mockResolvedValue({
      progressions: [{ id: "front_squat", name: "Front Squat" }],
      regressions: [{ id: "goblet_squat", name: "Goblet Squat" }],
    });

    const { suggestions } = await getSwapSuggestionsPage(
      "squat",
      { workoutTier: "intermediate" },
      0
    );

    const ids = suggestions.map((s) => s.id);
    // Out-of-pool exercises appear when no pool restriction
    expect(ids.some((id) => ["front_squat", "goblet_squat"].includes(id))).toBe(true);
  });

  it("paginates correctly across pool items", async () => {
    // Pool with 7 items → ceil(7/3) = 3 pages
    const pool = ["ex_a", "ex_b", "ex_c", "ex_d", "ex_e", "ex_f", "ex_g"];
    const extraDefs = pool.map((id) => makeDef(id));
    mockListExercises.mockResolvedValue([...ALL_EXERCISES, ...extraDefs]);

    const page0 = await getSwapSuggestionsPage(
      "squat",
      { swapPoolExerciseIds: pool, workoutTier: "intermediate" },
      0
    );
    const page1 = await getSwapSuggestionsPage(
      "squat",
      { swapPoolExerciseIds: pool, workoutTier: "intermediate" },
      1
    );
    const page2 = await getSwapSuggestionsPage(
      "squat",
      { swapPoolExerciseIds: pool, workoutTier: "intermediate" },
      2
    );

    expect(page0.numPages).toBe(3);
    expect(page1.numPages).toBe(3);
    expect(page2.numPages).toBe(3);

    const all = [
      ...page0.suggestions.map((s) => s.id),
      ...page1.suggestions.map((s) => s.id),
      ...page2.suggestions.map((s) => s.id),
    ];
    // All 7 pool IDs should appear across the 3 pages (last page has 1 item)
    for (const id of pool) {
      expect(all).toContain(id);
    }
    // No duplicates across pages
    expect(new Set(all).size).toBe(all.length);
  });
});
