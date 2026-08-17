import { describe, expect, it, beforeAll } from "vitest";
import { EXERCISES } from "../data/exercisesMerged";
import { exerciseDefinitionToGeneratorExercise } from "./dailyGeneratorAdapter";
import { generateWorkoutSession } from "../logic/workoutGeneration/dailyGenerator";
import type { GenerateWorkoutInput } from "../logic/workoutGeneration/types";
import { BLOCKED_EXERCISE_IDS } from "./workoutRules";
import {
  formatExerciseDisplayCue,
  isGenericPrescriptionCoachingCue,
  isVagueExerciseSetupFallback,
  resolveExerciseSetupText,
  withResolvedExerciseDescription,
} from "./exerciseDisplayCue";
import {
  ensureCuratedDescriptionsLoaded,
  getCuratedExerciseDescription,
} from "./exerciseDescriptionsCurated";
import { buildExerciseDescriptionMap, attachExerciseDescriptionsToSession } from "./workoutUtils";
import type { WorkoutItem } from "./types";
import type { Exercise } from "../logic/workoutGeneration/types";
import { listGoalPrescriptionCoachingCues } from "./generation/prescriptionRules";

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
  }, 60_000);

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

  it("formatExerciseDisplayCue hides strength goal prescription cue used as false setup copy", () => {
    const item: WorkoutItem = {
      exercise_id: "v_squat",
      exercise_name: "V-Squat",
      sets: 3,
      reps: 6,
      rest_seconds: 75,
      coaching_cues: "Heavy load, controlled tempo. Full lockout.",
    };
    expect(isGenericPrescriptionCoachingCue(item.coaching_cues)).toBe(true);
    expect(formatExerciseDisplayCue(item)).toBeNull();
  });

  it("withResolvedExerciseDescription fills curated setup when item description is missing", () => {
    const item: WorkoutItem = {
      exercise_id: "goblet_squat",
      exercise_name: "Goblet Squat",
      sets: 3,
      reps: 8,
      rest_seconds: 60,
      coaching_cues: "Heavy load, controlled tempo. Full lockout.",
    };
    const resolved = withResolvedExerciseDescription(item, getCuratedExerciseDescription);
    expect(resolved.exercise_description).toMatch(/goblet|chest|squat/i);
    expect(formatExerciseDisplayCue(resolved)).toMatch(/goblet|chest|squat/i);
    expect(formatExerciseDisplayCue(resolved)).not.toMatch(/Full lockout/i);
  });

  it("resolves setup copy for DB slug aliases and previously missing catalog slugs", () => {
    const plank: WorkoutItem = {
      exercise_id: "plank_shoulder_tap",
      exercise_name: "Plank Shoulder Tap",
      sets: 3,
      reps: 10,
      rest_seconds: 45,
      coaching_cues: "Controlled, full range of motion. Breathe steadily.",
    };
    const plankResolved = withResolvedExerciseDescription(plank, getCuratedExerciseDescription);
    expect(resolveExerciseSetupText(plankResolved)).toMatch(/plank|tap/i);
    expect(resolveExerciseSetupText(plankResolved)).not.toMatch(/Breathe steadily/i);

    const chestPass: WorkoutItem = {
      exercise_id: "medicine_ball_chest_pass",
      exercise_name: "Medicine Ball Chest Pass",
      sets: 4,
      reps: 8,
      rest_seconds: 60,
      coaching_cues: "Explosive, controlled.",
    };
    const chestResolved = withResolvedExerciseDescription(chestPass, getCuratedExerciseDescription);
    expect(resolveExerciseSetupText(chestResolved)).toMatch(/medicine ball|chest/i);

    const treadmill: WorkoutItem = {
      exercise_id: "treadmill_run",
      exercise_name: "Treadmill Run",
      sets: 1,
      time_seconds: 600,
      rest_seconds: 0,
      coaching_cues: "Steady effort. Keep heart rate in target zone.",
    };
    const treadmillResolved = withResolvedExerciseDescription(
      treadmill,
      getCuratedExerciseDescription
    );
    expect(resolveExerciseSetupText(treadmillResolved)).toMatch(/treadmill|running speed/i);
  });

  it("resolveExerciseSetupText always returns setup copy, even without curated description", () => {
    const item: WorkoutItem = {
      exercise_id: "unknown_db_only_slug",
      exercise_name: "Jump Rope",
      sets: 1,
      time_seconds: 60,
      rest_seconds: 0,
      coaching_cues: "Steady effort. Keep heart rate in target zone.",
    };
    expect(formatExerciseDisplayCue(item)).toBeNull();
    expect(resolveExerciseSetupText(item)).toMatch(/Jump Rope/);
    expect(resolveExerciseSetupText(item)).not.toMatch(/Steady effort/i);
    expect(isVagueExerciseSetupFallback(resolveExerciseSetupText(item))).toBe(true);
  });

  it("resolves JM Press and other DB-core lifts to specific setup copy, not the vague fallback", () => {
    for (const [id, name, re] of [
      ["jm_press", "JM Press", /close grip|elbows|chin|upper chest/i],
      ["arnold_press", "Arnold Press", /rotat|palms|overhead/i],
      ["barbell_back_squat", "Barbell Back Squat", /squat|hips|knees/i],
      ["skull_crusher", "Skull Crusher", /elbow|forehead|upper arms/i],
    ] as const) {
      const item: WorkoutItem = {
        exercise_id: id,
        exercise_name: name,
        sets: 3,
        reps: 8,
        rest_seconds: 90,
        coaching_cues: "Moderate load. Controlled tempo.",
        exercise_description:
          `${name} is a upper-body push exercise. Primarily targets triceps. Equipment: barbell, bench.`,
      };
      const resolved = withResolvedExerciseDescription(item, getCuratedExerciseDescription);
      const setup = resolveExerciseSetupText(resolved);
      expect(setup, id).toMatch(re);
      expect(isVagueExerciseSetupFallback(setup), id).toBe(false);
      expect(setup, id).not.toMatch(/equipment this movement uses/i);
    }
  });

  it("treats every goal cueStyle string as a generic prescription cue", () => {
    for (const cue of listGoalPrescriptionCoachingCues()) {
      expect(isGenericPrescriptionCoachingCue(cue), cue).toBe(true);
    }
  });
});
