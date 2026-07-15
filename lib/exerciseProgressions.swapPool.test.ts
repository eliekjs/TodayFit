import { describe, it, expect, vi, beforeEach } from "vitest";
import { getSwapSuggestionsPage } from "./exerciseProgressions";
import type { ExerciseDefinition } from "./types";

// ---------------------------------------------------------------------------
// Module mocks — use real getSubstitutes so pool ranking is similarity-based
// ---------------------------------------------------------------------------

vi.mock("./db", () => ({
  isDbConfigured: vi.fn(() => true),
}));

vi.mock("./db/exerciseRepository", () => ({
  getExercise: vi.fn(),
  getProgressionsRegressions: vi.fn(),
  listExercises: vi.fn(),
}));

vi.mock("./workoutRules", async () => {
  const actual = await vi.importActual<typeof import("./workoutRules")>("./workoutRules");
  return {
    ...actual,
    isCooldownEligibleEquipment: vi.fn(() => true),
    isWarmupEligibleEquipment: vi.fn(() => true),
  };
});

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
  makeDef("squat", {
    movement_pattern: "squat",
    muscles: ["quads", "glutes"],
    primary_movement_family: "squat",
    swap_candidates: ["front_squat", "goblet_squat"],
    regressions: ["goblet_squat"],
  }),
  makeDef("deadlift", {
    movement_pattern: "hinge",
    muscles: ["hamstrings", "glutes"],
    primary_movement_family: "hinge",
  }),
  makeDef("lunge", {
    movement_pattern: "squat",
    muscles: ["quads", "glutes"],
    primary_movement_family: "lunge",
  }),
  makeDef("leg_press", {
    movement_pattern: "squat",
    muscles: ["quads", "glutes"],
    primary_movement_family: "squat",
    equipment: ["machine"],
  }),
  makeDef("front_squat", {
    movement_pattern: "squat",
    muscles: ["quads", "glutes"],
    primary_movement_family: "squat",
  }),
  makeDef("goblet_squat", {
    movement_pattern: "squat",
    muscles: ["quads", "glutes"],
    primary_movement_family: "squat",
    equipment: ["dumbbell"],
  }),
  makeDef("bench_press", {
    movement_pattern: "push",
    muscles: ["chest", "triceps"],
    primary_movement_family: "horizontal_push",
  }),
  makeDef("row", {
    movement_pattern: "pull",
    muscles: ["back"],
    primary_movement_family: "horizontal_pull",
  }),
  makeDef("advanced_snatch", {
    workout_levels: ["advanced"],
    movement_pattern: "hinge",
    muscles: ["hamstrings"],
  }),
];

beforeEach(() => {
  vi.clearAllMocks();
  mockGetExercise.mockResolvedValue(ALL_EXERCISES[0]);
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
    for (const id of ids) {
      expect(pool).toContain(id);
    }
    expect(ids).not.toContain("squat");
    expect(ids).not.toContain("bench_press");
    expect(ids).not.toContain("front_squat");
    expect(numPages).toBe(1);
    expect(suggestions.length).toBe(3);
  });

  it("ranks curated swap_candidates and same-pattern pool members ahead of dissimilar ones", async () => {
    const pool = ["deadlift", "front_squat", "bench_press", "goblet_squat", "lunge"];
    const { suggestions } = await getSwapSuggestionsPage(
      "squat",
      { swapPoolExerciseIds: pool, workoutTier: "intermediate" },
      0
    );

    const ids = suggestions.map((s) => s.id);
    // Curated: front_squat + goblet_squat should land in the first page before bench/deadlift
    expect(ids[0]).toBe("front_squat");
    expect(ids).toContain("goblet_squat");
    expect(ids.indexOf("front_squat")).toBeLessThan(ids.indexOf("bench_press") === -1 ? 99 : ids.indexOf("bench_press"));
  });

  it("places progressions/regressions that are in the pool first when no curated list", async () => {
    mockGetExercise.mockResolvedValue(
      makeDef("squat", {
        movement_pattern: "squat",
        muscles: ["quads"],
        regressions: ["goblet_squat"],
        modalities: ["strength"],
      })
    );
    mockGetProgressionsRegressions.mockResolvedValue({
      progressions: [],
      regressions: [{ id: "goblet_squat", name: "Goblet Squat" }],
    });

    const pool = ["goblet_squat", "deadlift", "bench_press"];
    const { suggestions } = await getSwapSuggestionsPage(
      "squat",
      { swapPoolExerciseIds: pool, workoutTier: "intermediate" },
      0
    );

    expect(suggestions[0]?.id).toBe("goblet_squat");
    const ids = suggestions.map((s) => s.id);
    expect(ids).toContain("deadlift");
  });

  it("does not include out-of-pool exercises even when they are progressions/regressions", async () => {
    mockGetExercise.mockResolvedValue(
      makeDef("squat", {
        movement_pattern: "squat",
        muscles: ["quads"],
        progressions: ["front_squat"],
        regressions: ["goblet_squat"],
        swap_candidates: ["front_squat", "goblet_squat"],
        modalities: ["strength"],
      })
    );

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
    expect(ids.some((id) => ["front_squat", "goblet_squat"].includes(id))).toBe(true);
  });

  it("paginates correctly across pool items", async () => {
    const pool = ["ex_a", "ex_b", "ex_c", "ex_d", "ex_e", "ex_f", "ex_g"];
    const extraDefs = pool.map((id) =>
      makeDef(id, {
        movement_pattern: "squat",
        muscles: ["quads"],
        modalities: ["strength"],
      })
    );
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
    for (const id of pool) {
      expect(all).toContain(id);
    }
    expect(new Set(all).size).toBe(all.length);
  });

  it("different target exercises in the same pool surface different top suggestions", async () => {
    const pool = ["front_squat", "goblet_squat", "deadlift", "bench_press", "row", "lunge"];

    const squatPage = await getSwapSuggestionsPage(
      "squat",
      { swapPoolExerciseIds: pool, workoutTier: "intermediate" },
      0
    );

    mockGetExercise.mockResolvedValue(
      makeDef("bench_press", {
        movement_pattern: "push",
        muscles: ["chest", "triceps"],
        primary_movement_family: "horizontal_push",
        swap_candidates: ["row"],
        modalities: ["strength"],
        equipment: ["barbell"],
      })
    );

    const pressPage = await getSwapSuggestionsPage(
      "bench_press",
      { swapPoolExerciseIds: pool, workoutTier: "intermediate" },
      0
    );

    expect(squatPage.suggestions[0]?.id).not.toBe(pressPage.suggestions[0]?.id);
    expect(["front_squat", "goblet_squat", "lunge"]).toContain(squatPage.suggestions[0]?.id);
  });
});
