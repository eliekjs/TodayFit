import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getSwapSuggestionsPage,
  interleavePurposeAndSimilaritySwapOptions,
  orderSwapCandidatesByBlockPurpose,
} from "./exerciseProgressions";
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

describe("interleavePurposeAndSimilaritySwapOptions", () => {
  it("emits 2 purpose + 1 similarity per page of 3", () => {
    const purpose = [
      { id: "a", name: "A" },
      { id: "b", name: "B" },
      { id: "c", name: "C" },
      { id: "d", name: "D" },
    ];
    const similarity = [
      { id: "s1", name: "S1" },
      { id: "s2", name: "S2" },
      { id: "a", name: "A" },
    ];
    const out = interleavePurposeAndSimilaritySwapOptions(purpose, similarity);
    expect(out.slice(0, 3).map((x) => x.id)).toEqual(["a", "b", "s1"]);
    expect(out.slice(3, 6).map((x) => x.id)).toEqual(["c", "d", "s2"]);
  });
});

describe("orderSwapCandidatesByBlockPurpose", () => {
  it("prefers different movement patterns over near-clones", () => {
    const target = makeDef("squat", {
      movement_pattern: "squat",
      primary_movement_family: "squat",
    });
    const byId = new Map([
      ["front_squat", makeDef("front_squat", { movement_pattern: "squat", primary_movement_family: "squat" })],
      ["deadlift", makeDef("deadlift", { movement_pattern: "hinge", primary_movement_family: "hinge" })],
    ]);
    const ordered = orderSwapCandidatesByBlockPurpose(
      [
        { id: "front_squat", name: "Front Squat" },
        { id: "deadlift", name: "Deadlift" },
      ],
      { targetDef: target, byId }
    );
    expect(ordered[0]?.id).toBe("deadlift");
  });
});

const ALL_EXERCISES: ExerciseDefinition[] = [
  makeDef("squat", {
    movement_pattern: "squat",
    muscles: ["legs"],
    primary_movement_family: "squat",
    swap_candidates: ["front_squat", "goblet_squat"],
    regressions: ["goblet_squat"],
  }),
  makeDef("deadlift", {
    movement_pattern: "hinge",
    muscles: ["legs"],
    primary_movement_family: "hinge",
  }),
  makeDef("lunge", {
    movement_pattern: "squat",
    muscles: ["legs"],
    primary_movement_family: "lunge",
  }),
  makeDef("leg_press", {
    movement_pattern: "squat",
    muscles: ["legs"],
    primary_movement_family: "squat",
    equipment: ["machine"],
  }),
  makeDef("front_squat", {
    movement_pattern: "squat",
    muscles: ["legs"],
    primary_movement_family: "squat",
  }),
  makeDef("goblet_squat", {
    movement_pattern: "squat",
    muscles: ["legs"],
    primary_movement_family: "squat",
    equipment: ["dumbbells"],
  }),
  makeDef("bench_press", {
    movement_pattern: "push",
    muscles: ["push"],
    primary_movement_family: "horizontal_push",
  }),
  makeDef("row", {
    movement_pattern: "pull",
    muscles: ["pull"],
    primary_movement_family: "horizontal_pull",
  }),
  makeDef("advanced_snatch", {
    workout_levels: ["advanced"],
    movement_pattern: "hinge",
    muscles: ["legs"],
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

  it("leads with block-purpose variety and keeps one similar-exercise slot on page 0", async () => {
    const pool = ["deadlift", "front_squat", "bench_press", "goblet_squat", "lunge"];
    const { suggestions } = await getSwapSuggestionsPage(
      "squat",
      { swapPoolExerciseIds: pool, workoutTier: "intermediate" },
      0
    );

    const ids = suggestions.map((s) => s.id);
    expect(ids).toHaveLength(3);
    // Purpose slots prefer different patterns within the intent pool (deadlift hinge, bench push).
    expect(ids.slice(0, 2)).toEqual(expect.arrayContaining(["deadlift", "bench_press"]));
    // Similarity slot still surfaces a curated/same-pattern squat variant.
    expect(ids[2]).toBe("front_squat");
  });

  it("still surfaces a regression in the similarity slot when purpose options fill first", async () => {
    mockGetExercise.mockResolvedValue(
      makeDef("squat", {
        movement_pattern: "squat",
        muscles: ["legs"],
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

    const ids = suggestions.map((s) => s.id);
    expect(ids.slice(0, 2)).toEqual(expect.arrayContaining(["deadlift", "bench_press"]));
    expect(ids[2]).toBe("goblet_squat");
  });

  it("does not include out-of-pool exercises even when they are progressions/regressions", async () => {
    mockGetExercise.mockResolvedValue(
      makeDef("squat", {
        movement_pattern: "squat",
        muscles: ["legs"],
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
        muscles: ["legs"],
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

  it("different target exercises in the same pool surface different similarity slots", async () => {
    const pool = ["front_squat", "goblet_squat", "deadlift", "bench_press", "row", "lunge"];

    const squatPage = await getSwapSuggestionsPage(
      "squat",
      { swapPoolExerciseIds: pool, workoutTier: "intermediate" },
      0
    );

    mockGetExercise.mockResolvedValue(
      makeDef("bench_press", {
        movement_pattern: "push",
        muscles: ["push"],
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

    // Similarity slot (3rd) should differ by target; purpose slots may overlap in a shared pool.
    expect(squatPage.suggestions[2]?.id).not.toBe(pressPage.suggestions[2]?.id);
    expect(["front_squat", "goblet_squat", "lunge"]).toContain(squatPage.suggestions[2]?.id);
  });

  it("prefers distinct cardio machines for purpose slots and keeps a treadmill option in the similarity slot", async () => {
    const cardio = [
      makeDef("treadmill_run", {
        name: "Treadmill Run",
        modalities: ["conditioning"],
        equipment: ["treadmill"],
        muscles: ["legs"],
        movement_pattern: "locomotion",
        regressions: ["treadmill_incline_walk"],
      }),
      makeDef("treadmill_incline_walk", {
        name: "Incline Treadmill Walk",
        modalities: ["conditioning"],
        equipment: ["treadmill"],
        muscles: ["legs"],
        movement_pattern: "locomotion",
      }),
      makeDef("treadmill_intervals", {
        name: "Treadmill Intervals",
        modalities: ["conditioning"],
        equipment: ["treadmill"],
        muscles: ["legs"],
        movement_pattern: "locomotion",
      }),
      makeDef("zone2_treadmill", {
        name: "Zone 2 Treadmill / Run",
        modalities: ["conditioning"],
        equipment: ["treadmill"],
        muscles: ["legs"],
        movement_pattern: "locomotion",
      }),
      makeDef("elliptical", {
        name: "Elliptical",
        modalities: ["conditioning"],
        equipment: ["elliptical"],
        muscles: ["legs"],
        movement_pattern: "locomotion",
      }),
      makeDef("rower", {
        name: "Rower",
        modalities: ["conditioning"],
        equipment: ["rower"],
        muscles: ["legs"],
        movement_pattern: "locomotion",
      }),
    ];
    mockGetExercise.mockResolvedValue(cardio[0]);
    mockListExercises.mockResolvedValue(cardio);

    const { suggestions } = await getSwapSuggestionsPage(
      "treadmill_run",
      {
        swapPoolExerciseIds: [
          "treadmill_incline_walk",
          "treadmill_intervals",
          "zone2_treadmill",
          "elliptical",
          "rower",
        ],
        workoutTier: "intermediate",
      },
      0
    );

    const ids = suggestions.map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining(["elliptical", "rower"]));
    expect(ids).not.toContain("treadmill_intervals");
    expect(ids).not.toContain("zone2_treadmill");
    // Similarity / diversified stream still offers the incline-walk regression.
    expect(ids).toContain("treadmill_incline_walk");
  });

  it("does not lead bike swaps with other bike pacing variants when distinct machines exist", async () => {
    const cardio = [
      makeDef("zone2_bike", {
        name: "Zone 2 Bike",
        modalities: ["conditioning"],
        equipment: ["assault_bike"],
        muscles: ["legs"],
        movement_pattern: "locomotion",
      }),
      makeDef("assault_bike_steady", {
        name: "Assault Bike Steady",
        modalities: ["conditioning"],
        equipment: ["assault_bike"],
        muscles: ["legs"],
        movement_pattern: "locomotion",
      }),
      makeDef("assault_bike_intervals", {
        name: "Assault Bike Intervals",
        modalities: ["conditioning"],
        equipment: ["assault_bike"],
        muscles: ["legs"],
        movement_pattern: "locomotion",
      }),
      makeDef("rower", {
        name: "Rower",
        modalities: ["conditioning"],
        equipment: ["rower"],
        muscles: ["legs"],
        movement_pattern: "locomotion",
      }),
      makeDef("ski_erg", {
        name: "Ski Erg",
        modalities: ["conditioning"],
        equipment: ["ski_erg"],
        muscles: ["legs"],
        movement_pattern: "locomotion",
      }),
      makeDef("elliptical", {
        name: "Elliptical",
        modalities: ["conditioning"],
        equipment: ["elliptical"],
        muscles: ["legs"],
        movement_pattern: "locomotion",
      }),
    ];
    mockGetExercise.mockResolvedValue(cardio[0]);
    mockListExercises.mockResolvedValue(cardio);

    const { suggestions } = await getSwapSuggestionsPage(
      "zone2_bike",
      {
        swapPoolExerciseIds: [
          "assault_bike_steady",
          "assault_bike_intervals",
          "rower",
          "ski_erg",
          "elliptical",
        ],
        workoutTier: "intermediate",
      },
      0
    );

    const ids = suggestions.map((s) => s.id);
    expect(ids).not.toContain("assault_bike_steady");
    expect(ids).not.toContain("assault_bike_intervals");
    expect(ids).toEqual(expect.arrayContaining(["rower", "ski_erg", "elliptical"]));
  });
});
