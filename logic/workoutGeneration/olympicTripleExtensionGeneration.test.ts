/**
 * Olympic / triple-extension athletic sub-focus: pool bypass + session flow-through.
 */
import { describe, expect, it } from "vitest";
import { EXERCISES } from "../../data/exercisesMerged";
import {
  exerciseDefinitionToGeneratorExercise,
  manualPreferencesToGenerateWorkoutInput,
} from "../../lib/dailyGeneratorAdapter";
import { getDefaultEquipmentForTemplate } from "../../data/gymProfiles";
import { exerciseHasSubFocusSlug } from "../../data/goalSubFocus/conditioningSubFocus";
import {
  exerciseMatchesOlympicTripleExtension,
  inputHasOlympicTripleExtensionSubFocus,
} from "../../data/goalSubFocus/olympicTripleExtensionShared";
import {
  filterByHardConstraints,
  generateWorkoutSession,
  getHardConstraintRejectReason,
} from "./dailyGenerator";
import { resolveGatedExercisePoolForGeneration } from "./pruningGatePool";
import { GOAL_SUB_FOCUS_TAG_MAP } from "../../data/goalSubFocus/goalSubFocusTagMap";

describe("olympic triple extension sub-focus flow", () => {
  const gym = {
    id: "your_gym",
    name: "Your Gym",
    equipment: getDefaultEquipmentForTemplate("your_gym"),
  };

  function prefs(subs: string[]) {
    return {
      primaryFocus: ["Athletic Performance"],
      targetBody: "Full" as const,
      targetModifier: [] as string[],
      durationMinutes: 45,
      energyLevel: "medium" as const,
      injuries: ["No restrictions"],
      upcoming: [] as string[],
      subFocusByGoal: { "Athletic Performance": subs },
      workoutStyle: [] as string[],
      workoutTier: "intermediate" as const,
    };
  }

  it("tag map includes olympic_triple_extension intent slug", () => {
    const tags = GOAL_SUB_FOCUS_TAG_MAP["power:olympic_triple_extension"] ?? [];
    expect(tags.some((t) => t.tag_slug === "olympic_triple_extension")).toBe(true);
  });

  it("does not treat jump_squat / box_jump as olympic via goal enrichment", () => {
    for (const id of ["jump_squat", "box_jump", "med_ball_slam", "kb_swing"]) {
      const def = EXERCISES.find((e) => e.id === id);
      expect(def).toBeTruthy();
      const ex = exerciseDefinitionToGeneratorExercise(def!);
      // May still match name-based olympic only if name has clean/snatch/jerk — these should not.
      expect(exerciseHasSubFocusSlug(ex, "olympic_triple_extension")).toBe(false);
    }
  });

  it("intermediate hard filters admit hang/power cleans when olympic sub-focus is selected", () => {
    const input = manualPreferencesToGenerateWorkoutInput(
      prefs(["Olympic / Triple extension"]),
      gym,
      "olympic-hard-bypass"
    );
    expect(inputHasOlympicTripleExtensionSubFocus(input)).toBe(true);

    const catalog = EXERCISES.map(exerciseDefinitionToGeneratorExercise);
    const gated = resolveGatedExercisePoolForGeneration(catalog, input).pool;
    const hard = filterByHardConstraints(gated, input);
    const olympic = hard.filter((e) => exerciseMatchesOlympicTripleExtension(e));
    expect(olympic.length).toBeGreaterThanOrEqual(8);

    // Prefer catalog staples that survive the pruning gate on default gym profiles.
    const expectedIds = [
      "kettlebell_dead_clean",
      "dumbbell_hang_clean",
      "power_clean",
      "ff_barbell_power_clean",
      "ff_double_kettlebell_clean",
    ].filter((id) => gated.some((e) => e.id === id));
    expect(expectedIds.length).toBeGreaterThanOrEqual(3);
    for (const id of expectedIds) {
      const ex = gated.find((e) => e.id === id)!;
      expect(getHardConstraintRejectReason(ex, input)).toBeNull();
      expect(hard.some((e) => e.id === id)).toBe(true);
    }
  });

  it("generated full-body athletic session with plyos + olympic includes an olympic lift", () => {
    const input = manualPreferencesToGenerateWorkoutInput(
      prefs(["Lower body power / Plyos", "Olympic / Triple extension"]),
      gym,
      "plyo-olympic-session"
    );
    expect(input.goal_sub_focus?.power).toEqual(
      expect.arrayContaining(["lower_body_power_plyos", "olympic_triple_extension"])
    );

    const catalog = EXERCISES.map(exerciseDefinitionToGeneratorExercise);
    const session = generateWorkoutSession(input, catalog);
    const ids = session.blocks.flatMap((b) => b.items.map((i) => i.exercise_id));
    const byId = new Map(catalog.map((e) => [e.id, e]));
    const hasOlympic = ids.some((id) => {
      const ex = byId.get(id);
      return ex ? exerciseMatchesOlympicTripleExtension(ex) : false;
    });
    expect(hasOlympic).toBe(true);
  });
});
