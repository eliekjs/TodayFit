/**
 * Workout tier + creative-variation hard filters.
 * Run: npx tsx logic/workoutGeneration/workout-level-filter.test.ts
 */

import { filterByHardConstraints } from "./dailyGenerator";
import type { Exercise, GenerateWorkoutInput } from "./types";
import { inferCreativeVariationFromSource } from "../../lib/workoutLevel";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function minimalExercise(partial: Partial<Exercise> & Pick<Exercise, "id">): Exercise {
  return {
    id: partial.id,
    name: partial.name ?? partial.id,
    movement_pattern: partial.movement_pattern ?? "squat",
    muscle_groups: partial.muscle_groups ?? ["legs"],
    modality: partial.modality ?? "strength",
    equipment_required: partial.equipment_required ?? ["bodyweight"],
    difficulty: partial.difficulty ?? 2,
    time_cost: partial.time_cost ?? "medium",
    tags: partial.tags ?? {},
    ...partial,
  };
}

const baseInput: Omit<GenerateWorkoutInput, "style_prefs"> = {
  duration_minutes: 45,
  primary_goal: "strength",
  energy_level: "medium",
  available_equipment: ["bodyweight"],
  injuries_or_constraints: [],
};

function runTests() {
  const advancedOnly = minimalExercise({
    id: "adv_only",
    workout_level_tags: ["advanced"],
  });
  const beginnerOk = minimalExercise({
    id: "beginner_ok",
    workout_level_tags: ["beginner", "intermediate", "advanced"],
  });
  const creative = minimalExercise({
    id: "creative_move",
    creative_variation: true,
  });
  const inferredCreative = minimalExercise({
    id: "ff_double_clubbell_side_shoulder_cast_to_side_flag_press",
    name: "Double Clubbell Side Shoulder Cast to Side Flag Press",
    creative_variation: inferCreativeVariationFromSource({
      id: "ff_double_clubbell_side_shoulder_cast_to_side_flag_press",
      name: "Double Clubbell Side Shoulder Cast to Side Flag Press",
      tags: ["Upper Body", "shoulder_abduction", "intermediate"],
    }),
  });
  const pool = [advancedOnly, beginnerOk, creative, inferredCreative];
  const complexButBroadTier = minimalExercise({
    id: "ff_single_arm_kettlebell_start_stop_clean_to_thruster",
    name: "Single Arm Kettlebell Start Stop Clean to Thruster",
    workout_level_tags: ["beginner", "intermediate", "advanced"],
    movement_pattern: "squat",
    modality: "strength",
    tags: { attribute_tags: ["complex_variation"] },
  });
  const bottomsUpLunge = minimalExercise({
    id: "ff_double_kettlebell_bottoms_up_front_rack_walking_lunge",
    name: "Double Kettlebell Bottoms Up Front Rack Walking Lunge",
    workout_level_tags: ["beginner", "intermediate", "advanced"],
  });
  const curtsyBroad = minimalExercise({
    id: "ff_single_arm_kettlebell_suitcase_alternating_curtsy_lunge",
    name: "Single Arm Kettlebell Suitcase Alternating Curtsy Lunge",
    workout_level_tags: ["beginner", "intermediate", "advanced"],
  });
  const cyclistSquat = minimalExercise({
    id: "ff_double_kettlebell_suitcase_cyclist_squat",
    name: "Double Kettlebell Suitcase Cyclist Squat",
    workout_level_tags: ["beginner", "intermediate", "advanced"],
  });
  const ipsiBss = minimalExercise({
    id: "ff_single_arm_kettlebell_suitcase_ipsilateral_bulgarian_split_squat",
    name: "Single Arm Kettlebell Suitcase Ipsilateral Bulgarian Split Squat",
    workout_level_tags: ["beginner", "intermediate", "advanced"],
  });
  const hornGripLunge = minimalExercise({
    id: "ff_kettlebell_horn_grip_alternating_forward_lunge",
    name: "Kettlebell Horn Grip Alternating Forward Lunge",
    workout_level_tags: ["beginner", "intermediate", "advanced"],
  });
  const overheadWalk = minimalExercise({
    id: "ff_single_arm_dumbbell_overhead_walking_lunge",
    name: "Single Arm Dumbbell Overhead Walking Lunge",
    workout_level_tags: ["beginner", "intermediate", "advanced"],
  });
  const simpleWalkLunge = minimalExercise({
    id: "walking_lunge",
    name: "Walking Lunge",
    workout_level_tags: ["beginner", "intermediate", "advanced"],
  });
  const simpleBss = minimalExercise({
    id: "bulgarian_split_squat_db",
    name: "Dumbbell Bulgarian Split Squat",
    workout_level_tags: ["beginner", "intermediate", "advanced"],
  });
  const poolWithComplex = [
    ...pool,
    complexButBroadTier,
    bottomsUpLunge,
    curtsyBroad,
    cyclistSquat,
    ipsiBss,
    hornGripLunge,
    overheadWalk,
    simpleWalkLunge,
    simpleBss,
  ];
  const ringRow = minimalExercise({
    id: "ff_ring_row",
    name: "Ring Row",
    workout_level_tags: ["beginner", "intermediate", "advanced"],
    equipment_required: ["bodyweight"],
  });
  const ringStraddle = minimalExercise({
    id: "ff_ring_straddle_front_lever_pull_up",
    name: "Ring Straddle Front Lever Pull Up",
    workout_level_tags: ["advanced"],
    equipment_required: ["bodyweight"],
    creative_variation: true,
  });
  const ringPool = [ringRow, ringStraddle];

  const beginnerFiltered = filterByHardConstraints(poolWithComplex, {
    ...baseInput,
    style_prefs: { user_level: "beginner", include_creative_variations: false },
  });
  const complexFixtureIds = new Set([
    bottomsUpLunge.id,
    curtsyBroad.id,
    cyclistSquat.id,
    ipsiBss.id,
    hornGripLunge.id,
    overheadWalk.id,
    complexButBroadTier.id,
  ]);
  assert(
    beginnerFiltered.some((e) => e.id === "beginner_ok") &&
      !beginnerFiltered.some((e) => e.id === "adv_only") &&
      !beginnerFiltered.some((e) => e.id === "creative_move") &&
      !beginnerFiltered.some(
        (e) => e.id === "ff_double_clubbell_side_shoulder_cast_to_side_flag_press"
      ) &&
      !beginnerFiltered.some((e) => complexFixtureIds.has(e.id)),
    "beginner: only beginner-tagged, no advanced-only, no creative, no complex-skill lifts"
  );

  const intermediateFiltered = filterByHardConstraints(poolWithComplex, {
    ...baseInput,
    style_prefs: { user_level: "intermediate", include_creative_variations: false },
  });
  assert(
    intermediateFiltered.some((e) => e.id === "beginner_ok") &&
      intermediateFiltered.some((e) => e.id === "walking_lunge") &&
      intermediateFiltered.some((e) => e.id === "bulgarian_split_squat_db") &&
      !intermediateFiltered.some((e) => e.id === "adv_only") &&
      !intermediateFiltered.some((e) => e.id === "creative_move") &&
      !intermediateFiltered.some(
        (e) => e.id === "ff_double_clubbell_side_shoulder_cast_to_side_flag_press"
      ) &&
      !intermediateFiltered.some((e) => e.id === "ff_single_arm_kettlebell_start_stop_clean_to_thruster") &&
      !intermediateFiltered.some((e) => complexFixtureIds.has(e.id)),
    "intermediate: no advanced-only tier, no creative when off"
  );

  const advancedAllTiers = filterByHardConstraints(poolWithComplex, {
    ...baseInput,
    style_prefs: { user_level: "advanced", include_creative_variations: false },
  });
  assert(
    advancedAllTiers.some((e) => e.id === "adv_only") &&
      advancedAllTiers.some((e) => e.id === "beginner_ok") &&
      advancedAllTiers.some((e) => e.id === bottomsUpLunge.id) &&
      advancedAllTiers.some((e) => e.id === curtsyBroad.id) &&
      !advancedAllTiers.some((e) => e.id === "creative_move") &&
      !advancedAllTiers.some(
        (e) => e.id === "ff_double_clubbell_side_shoulder_cast_to_side_flag_press"
      ) &&
      !advancedAllTiers.some((e) => e.id === "ff_single_arm_kettlebell_start_stop_clean_to_thruster"),
    "advanced tier keeps advanced-only; creative still off; start-stop always excluded"
  );

  const advancedCreative = filterByHardConstraints(poolWithComplex, {
    ...baseInput,
    style_prefs: { user_level: "advanced", include_creative_variations: true },
  });
  assert(
    advancedCreative.length === poolWithComplex.length - 1 &&
      !advancedCreative.some((e) => e.id === "ff_single_arm_kettlebell_start_stop_clean_to_thruster"),
    "advanced + creative keeps full pool except globally blocked start-stop"
  );

  const noRings = filterByHardConstraints(ringPool, {
    ...baseInput,
    style_prefs: { user_level: "advanced", include_creative_variations: true },
  });
  assert(
    noRings.length === 0,
    "ring exercises are excluded when rings are not in available equipment"
  );

  const ringsOnlyStrength = filterByHardConstraints(ringPool, {
    ...baseInput,
    available_equipment: ["bodyweight", "rings"],
    primary_goal: "strength",
    style_prefs: { user_level: "advanced", include_creative_variations: false },
  });
  assert(
    ringsOnlyStrength.some((e) => e.id === ringRow.id) &&
      !ringsOnlyStrength.some((e) => e.id === ringStraddle.id),
    "with rings available, ring basics pass but ring straddle is restricted unless goal-specific or advanced creative"
  );

  const ringsCalisthenics = filterByHardConstraints(ringPool, {
    ...baseInput,
    available_equipment: ["bodyweight", "rings"],
    primary_goal: "calisthenics",
    style_prefs: { user_level: "advanced", include_creative_variations: false },
  });
  assert(
    ringsCalisthenics.some((e) => e.id === ringStraddle.id),
    "ring straddle is allowed for calisthenics goal when rings are available"
  );

  const ringsAdvancedCreative = filterByHardConstraints(ringPool, {
    ...baseInput,
    available_equipment: ["bodyweight", "rings"],
    primary_goal: "strength",
    style_prefs: { user_level: "advanced", include_creative_variations: true },
  });
  assert(
    ringsAdvancedCreative.some((e) => e.id === ringStraddle.id),
    "ring straddle is allowed for advanced creative selections when rings are available"
  );

  console.log("workout-level-filter tests passed.");
}

runTests();
