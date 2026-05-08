import { describe, expect, it } from "vitest";
import { genericSelectHypertrophyChosen } from "./mainSelectors/genericMainSelector";
import { exerciseMatchesHypertrophySubFocusSlug } from "./subFocusSlugMatch";
import {
  exerciseIsPrimaryLowerBodyHypertrophyMovement,
  isUpperOnlyFocusBodyParts,
  shouldGateLowerBodyHypertrophyRemainder,
  shouldOmitOptionalHypertrophyUpperOnlyConditioning,
} from "./upperHypertrophySessionGate";
import { generateWorkoutSession } from "./dailyGenerator";
import { STUB_EXERCISES } from "./exerciseStub";
import type { Exercise, GenerateWorkoutInput } from "./types";

describe("upperHypertrophySessionGate", () => {
  it("classifies hinge + legs as lower-body hypertrophy movement", () => {
    const hipThrust = STUB_EXERCISES.find((e) => e.id === "hip_thrust");
    expect(hipThrust).toBeDefined();
    expect(exerciseIsPrimaryLowerBodyHypertrophyMovement(hipThrust!)).toBe(true);
  });

  it("does not classify bench press as lower-body", () => {
    const bench = STUB_EXERCISES.find((e) => e.id === "bench_press_barbell");
    expect(bench).toBeDefined();
    expect(exerciseIsPrimaryLowerBodyHypertrophyMovement(bench!)).toBe(false);
  });

  it("detects upper-only focus body parts", () => {
    expect(isUpperOnlyFocusBodyParts(["upper_push"])).toBe(true);
    expect(isUpperOnlyFocusBodyParts(["upper_push", "upper_pull"])).toBe(true);
    expect(isUpperOnlyFocusBodyParts(["full_body"])).toBe(false);
    expect(isUpperOnlyFocusBodyParts(["lower"])).toBe(false);
    expect(isUpperOnlyFocusBodyParts(undefined)).toBe(false);
  });

  it("gates remainder only when focus is upper-only and muscle sub-focus is not legs/glutes", () => {
    const input = {
      focus_body_parts: ["upper_push"],
    } as GenerateWorkoutInput;
    expect(shouldGateLowerBodyHypertrophyRemainder(input, ["chest", "arms"])).toBe(true);
    expect(shouldGateLowerBodyHypertrophyRemainder(input, ["chest", "legs"])).toBe(false);
  });

  it("omits optional conditioning for pure upper hypertrophy without cardio prefs", () => {
    expect(
      shouldOmitOptionalHypertrophyUpperOnlyConditioning({
        primary_goal: "hypertrophy",
        focus_body_parts: ["upper_push"],
        secondary_goals: [],
      } as GenerateWorkoutInput)
    ).toBe(true);

    expect(
      shouldOmitOptionalHypertrophyUpperOnlyConditioning({
        primary_goal: "hypertrophy",
        focus_body_parts: ["full_body"],
        secondary_goals: [],
      } as GenerateWorkoutInput)
    ).toBe(false);

    expect(
      shouldOmitOptionalHypertrophyUpperOnlyConditioning({
        primary_goal: "hypertrophy",
        focus_body_parts: ["upper_push"],
        secondary_goals: ["conditioning"],
      } as GenerateWorkoutInput)
    ).toBe(false);
  });
});

describe("genericSelectHypertrophyChosen remainder gate", () => {
  it("excludes lower-body picks from remainder when hypertrophyRemainderEligible is set", () => {
    const chestPress = STUB_EXERCISES.find((e) => e.id === "bench_press_barbell")!;
    const hipThrust = STUB_EXERCISES.find((e) => e.id === "hip_thrust")!;
    const pool = [chestPress, hipThrust];
    const pick = (p: Exercise[], count: number) => p.slice(0, count);

    const withoutGate = genericSelectHypertrophyChosen({
      pool,
      wantCount: 2,
      isHypertrophyPrimary: true,
      muscleSubFocusRanked: ["chest", "arms"],
      hasBalanced: false,
      directSubFocusSlugs: ["chest", "arms"],
      dominantSlug: "chest",
      exerciseMatchesHypertrophySubFocusSlug,
      pick,
    });
    expect(withoutGate.map((e) => e.id).sort()).toEqual(["bench_press_barbell", "hip_thrust"]);

    const withGate = genericSelectHypertrophyChosen({
      pool,
      wantCount: 2,
      isHypertrophyPrimary: true,
      muscleSubFocusRanked: ["chest", "arms"],
      hasBalanced: false,
      directSubFocusSlugs: ["chest", "arms"],
      dominantSlug: "chest",
      exerciseMatchesHypertrophySubFocusSlug,
      pick,
      hypertrophyRemainderEligible: (e) => !exerciseIsPrimaryLowerBodyHypertrophyMovement(e),
    });
    expect(withGate.map((e) => e.id)).toEqual(["bench_press_barbell"]);
  });
});

describe("generateWorkoutSession upper-only hypertrophy", () => {
  const base: GenerateWorkoutInput = {
    duration_minutes: 45,
    primary_goal: "hypertrophy",
    focus_body_parts: ["upper_push"],
    energy_level: "medium",
    available_equipment: ["barbell", "bench", "dumbbells", "cable_machine", "bodyweight", "squat_rack", "leg_press"],
    injuries_or_constraints: [],
    goal_sub_focus: { muscle: ["chest", "arms"] },
  };

  it("does not emit a conditioning block for upper-only chest+arms hypertrophy (stub pool)", () => {
    for (const seed of [1, 42, 99, 1234, 9001]) {
      const session = generateWorkoutSession({ ...base, seed }, STUB_EXERCISES);
      expect(session.blocks.some((b) => b.block_type === "conditioning")).toBe(false);
    }
  });

  it("does not place lower-body hinge movements in main_hypertrophy for upper-only chest+arms", () => {
    const session = generateWorkoutSession({ ...base, seed: 42 }, STUB_EXERCISES);
    const mainIds = session.blocks
      .filter((b) => b.block_type === "main_hypertrophy")
      .flatMap((b) => b.items.map((i) => i.exercise_id));
    const idSet = new Set(mainIds);
    expect(idSet.has("hip_thrust")).toBe(false);
    expect(idSet.has("barbell_back_squat")).toBe(false);
  });

  it("still allows conditioning when user requests conditioning secondary goal", () => {
    const session = generateWorkoutSession(
      {
        ...base,
        seed: 7,
        secondary_goals: ["conditioning"],
      },
      STUB_EXERCISES
    );
    expect(session.blocks.some((b) => b.block_type === "conditioning")).toBe(true);
  });
});
