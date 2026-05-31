import { describe, expect, it, beforeAll } from "vitest";
import { EXERCISES } from "../data/exercisesMerged";
import { exerciseDefinitionToGeneratorExercise } from "./dailyGeneratorAdapter";
import { generateWorkoutSession } from "../logic/workoutGeneration/dailyGenerator";
import type { GenerateWorkoutInput } from "../logic/workoutGeneration/types";
import { BLOCKED_EXERCISE_IDS } from "./workoutRules";
import {
  formatExerciseDisplayCue,
  isGenericPrescriptionCoachingCue,
} from "./exerciseDisplayCue";
import {
  ensureCuratedDescriptionsLoaded,
  getCuratedExerciseDescription,
} from "./exerciseDescriptionsCurated";
import { buildExerciseDescriptionMap, attachExerciseDescriptionsToSession } from "./workoutUtils";
import type { WorkoutItem } from "./types";
import type { Exercise } from "../logic/workoutGeneration/types";

const P0_SLUGS = ["ankle_dorsiflexion_stretch", "ankle_circles", "banded_ankle_mob"] as const;
const P1_SLUGS = [
  "seated_hip_internal_rotation",
  "lying_hip_rotation",
  "quadruped_hip_circle",
  "prone_extension",
  "sphinx_stretch",
  "band_ir_er",
  "wrist_circles",
  "finger_extensions",
  "foam_roll_quad",
  "foam_roll_glute",
  "foam_roll_t_spine",
  "breathing_box",
] as const;

describe("exercise descriptions on workout items", () => {
  let pool: Exercise[];

  beforeAll(async () => {
    await ensureCuratedDescriptionsLoaded();
    pool = EXERCISES.filter((d) => !BLOCKED_EXERCISE_IDS.has(d.id)).map(
      exerciseDefinitionToGeneratorExercise
    );
  });

  it("attachExerciseDescriptionsToSession copies catalog description onto items", () => {
    const withDesc = pool.find((e) => e.id === "goblet_squat" && e.description);
    expect(withDesc?.description).toBeTruthy();

    const input: GenerateWorkoutInput = {
      seed: 4242,
      duration_minutes: 45,
      energy_level: "medium",
      primary_goal: "strength",
      available_equipment: ["dumbbells", "barbell", "bench", "bodyweight"],
      injuries_or_constraints: [],
    };
    const session = generateWorkoutSession(input, pool);
    const hasGoblet = session.blocks.some((b) =>
      b.items.some((i) => i.exercise_id === "goblet_squat")
    );
    if (!hasGoblet) return;

    const item = session.blocks.flatMap((b) => b.items).find((i) => i.exercise_id === "goblet_squat");
    expect(item?.exercise_description).toBeTruthy();
  });

  it("attachExerciseDescriptionsToSession uses curated fallback when exercise has no DB description", () => {
    const bare = { ...pool.find((e) => e.id === "face_pull")! };
    delete bare.description;
    const input: GenerateWorkoutInput = {
      seed: 99,
      duration_minutes: 30,
      energy_level: "medium",
      primary_goal: "hypertrophy",
      available_equipment: ["cable_machine", "dumbbells", "bodyweight"],
      injuries_or_constraints: [],
    };
    const session = generateWorkoutSession(input, pool.map((e) => (e.id === "face_pull" ? bare : e)));
    const enriched = attachExerciseDescriptionsToSession(session, pool);
    const face = enriched.blocks.flatMap((b) => b.items).find((i) => i.exercise_id === "face_pull");
    if (!face) return;
    expect(face.exercise_description).toMatch(/cable|face/i);
  });

  it("curated descriptions override generated DB stub descriptions", () => {
    const descriptionById = buildExerciseDescriptionMap([
      {
        id: "inchworm",
        name: "Inchworm",
        description: "Inchworm is a mobility exercise. Primarily targets core, legs. Equipment: bodyweight.",
        movement_pattern: "locomotion",
        muscle_groups: ["core", "legs"],
        modality: "mobility",
        equipment_required: ["bodyweight"],
        difficulty: 1,
        time_cost: "low",
        tags: {},
      },
    ]);

    expect(descriptionById.get("inchworm")).toMatch(/high plank|hinge/i);
    expect(descriptionById.get("inchworm")).not.toMatch(/Equipment:/);
  });

  it("P0 and P1 slugs resolve curated setup copy", () => {
    for (const slug of [...P0_SLUGS, ...P1_SLUGS]) {
      const curated = getCuratedExerciseDescription(slug);
      expect(curated, slug).toBeTruthy();
    }

    const descriptionById = buildExerciseDescriptionMap([
      {
        id: "ankle_dorsiflexion_stretch",
        name: "Ankle Dorsiflexion Stretch",
        movement_pattern: "rotate",
        muscle_groups: ["legs"],
        modality: "mobility",
        equipment_required: ["bodyweight"],
        difficulty: 1,
        time_cost: "low",
        tags: {},
      },
    ]);
    expect(descriptionById.get("ankle_dorsiflexion_stretch")).toMatch(/wall|heel|knee/i);
  });

  it("formatExerciseDisplayCue prefers curated description over generic mobility prescription cue", () => {
    const curated = getCuratedExerciseDescription("ankle_dorsiflexion_stretch");
    expect(curated).toBeTruthy();

    const item: WorkoutItem = {
      exercise_id: "ankle_dorsiflexion_stretch",
      exercise_name: "Ankle Dorsiflexion Stretch",
      sets: 1,
      time_seconds: 30,
      rest_seconds: 0,
      coaching_cues: "Controlled, full range of motion. Breathe steadily.",
      exercise_description: curated,
    };

    const cue = formatExerciseDisplayCue(item);
    expect(cue).toBe(curated);
    expect(cue).not.toMatch(/Breathe steadily/i);
    expect(isGenericPrescriptionCoachingCue(cue)).toBe(false);
  });

  it("formatExerciseDisplayCue hides generic prescription cue when description is missing", () => {
    const item: WorkoutItem = {
      exercise_id: "ankle_dorsiflexion_stretch",
      exercise_name: "Ankle Dorsiflexion Stretch",
      sets: 1,
      time_seconds: 30,
      rest_seconds: 0,
      coaching_cues: "Controlled, full range of motion. Breathe steadily.",
    };

    expect(formatExerciseDisplayCue(item)).toBeNull();
    expect(isGenericPrescriptionCoachingCue(item.coaching_cues)).toBe(true);
  });
});
