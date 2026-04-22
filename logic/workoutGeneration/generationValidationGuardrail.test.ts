import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  __resetSportProfileMapFailedLogDedupeForTests,
  generateWorkoutSession,
} from "./dailyGenerator";
import { STUB_EXERCISES } from "./exerciseStub";
import type { GenerateWorkoutInput, WorkoutSession } from "./types";
import * as validatorModule from "../workoutIntelligence/validation/workoutValidator";
import * as sportProfileEngineModule from "./sportProfileEngine";

function baseInput(overrides: Partial<GenerateWorkoutInput> = {}): GenerateWorkoutInput {
  return {
    duration_minutes: 45,
    primary_goal: "strength",
    focus_body_parts: ["full_body"],
    energy_level: "medium",
    available_equipment: [
      "barbell",
      "dumbbells",
      "bench",
      "squat_rack",
      "bodyweight",
      "pullup_bar",
    ],
    injuries_or_constraints: [],
    seed: 912_001,
    ...overrides,
  };
}

function allExerciseIds(session: WorkoutSession): string[] {
  return session.blocks.flatMap((b) => b.items.map((i) => i.exercise_id));
}

describe("generation + validation guardrails", () => {
  beforeEach(() => {
    __resetSportProfileMapFailedLogDedupeForTests();
  });

  it("removes unresolved critical injury violations when validator cannot repair", () => {
    let forcedViolationExerciseId: string | undefined;

    const validateSpy = vi
      .spyOn(validatorModule, "validateWorkoutAgainstConstraints")
      .mockImplementation((workout) => {
        const targetBlockIndex = workout.blocks.findIndex(
          (b) => b.block_type === "main_strength" || b.block_type === "main_hypertrophy"
        );
        const safeIndex = targetBlockIndex >= 0 ? targetBlockIndex : 0;
        const block = workout.blocks[safeIndex]!;
        const item = block.items[0];
        forcedViolationExerciseId = item?.exercise_id;
        if (!item) return { valid: true, violations: [] };

        return {
          valid: false,
          violations: [
            {
              type: "injury_restriction",
              block,
              blockIndex: safeIndex,
              exercise: item,
              exerciseId: item.exercise_id,
              description: "forced unresolved injury violation for integration test",
              repaired: false,
            },
          ],
        };
      });

    let session: WorkoutSession;
    try {
      session = generateWorkoutSession(baseInput(), STUB_EXERCISES);
    } finally {
      validateSpy.mockRestore();
    }

    expect(forcedViolationExerciseId).toBeDefined();
    expect(allExerciseIds(session!)).not.toContain(forcedViolationExerciseId);
    expect(session!.debug?.validation_fallback).toBeDefined();
    expect(session!.debug?.validation_fallback?.unresolved_violation_count).toBeGreaterThanOrEqual(1);
    expect(session!.debug?.validation_fallback?.unresolved_violation_types).toContain("injury_restriction");
    expect(session!.debug?.validation_fallback?.unresolved_has_critical_types).toBe(true);
  });

  it("attempts exactly one regenerate pass before fallback when critical unresolved violations remain", () => {
    let validateCallCount = 0;
    const validateSpy = vi
      .spyOn(validatorModule, "validateWorkoutAgainstConstraints")
      .mockImplementation((workout) => {
        validateCallCount += 1;
        if (validateCallCount === 1) {
          const blockIndex = workout.blocks.findIndex(
            (b) => b.block_type === "main_strength" || b.block_type === "main_hypertrophy"
          );
          const safeIndex = blockIndex >= 0 ? blockIndex : 0;
          const block = workout.blocks[safeIndex]!;
          const item = block.items[0];
          if (!item) return { valid: true, violations: [] };
          return {
            valid: false,
            violations: [
              {
                type: "injury_restriction",
                block,
                blockIndex: safeIndex,
                exercise: item,
                exerciseId: item.exercise_id,
                description: "force first-pass unresolved critical violation",
                repaired: false,
              },
            ],
          };
        }
        return { valid: true, violations: [] };
      });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      const session = generateWorkoutSession(baseInput({ seed: 42 }), STUB_EXERCISES);
      expect(validateCallCount).toBe(3);
      expect(session.blocks.length).toBeGreaterThan(0);
      expect(session.debug?.validation_fallback).toBeUndefined();
      expect(warnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("[Phase 8] Applied critical validation safeguard"),
        expect.anything()
      );
    } finally {
      validateSpy.mockRestore();
      warnSpy.mockRestore();
    }
  });

  it("keeps conservative removal fallback when regenerate attempt still has critical unresolveds", () => {
    const violatingIdsByCall: string[] = [];
    let validateCallCount = 0;
    const validateSpy = vi
      .spyOn(validatorModule, "validateWorkoutAgainstConstraints")
      .mockImplementation((workout) => {
        validateCallCount += 1;
        const blockIndex = workout.blocks.findIndex(
          (b) => b.block_type === "main_strength" || b.block_type === "main_hypertrophy"
        );
        const safeIndex = blockIndex >= 0 ? blockIndex : 0;
        const block = workout.blocks[safeIndex]!;
        const item = block.items[0];
        if (!item) return { valid: true, violations: [] };
        violatingIdsByCall.push(item.exercise_id);
        return {
          valid: false,
          violations: [
            {
              type: "injury_restriction",
              block,
              blockIndex: safeIndex,
              exercise: item,
              exerciseId: item.exercise_id,
              description: "force unresolved critical violation across regenerate path",
              repaired: false,
            },
          ],
        };
      });

    let session: WorkoutSession;
    try {
      session = generateWorkoutSession(baseInput({ seed: 43 }), STUB_EXERCISES);
    } finally {
      validateSpy.mockRestore();
    }

    expect(validateCallCount).toBe(3);
    expect(violatingIdsByCall.length).toBeGreaterThanOrEqual(3);
    const finalCriticalId = violatingIdsByCall[violatingIdsByCall.length - 1];
    expect(allExerciseIds(session!)).not.toContain(finalCriticalId);
    expect(session!.debug?.validation_fallback).toBeDefined();
    expect(session!.debug?.validation_fallback?.unresolved_has_critical_types).toBe(true);
    expect(session!.debug?.validation_fallback?.unresolved_violation_types).toContain("injury_restriction");
  });

  it("logs map_failed sport-profile load and still returns a session", () => {
    const loadSpy = vi
      .spyOn(sportProfileEngineModule, "loadSportProfileForSession")
      .mockReturnValue({
        status: "map_failed",
        canonicalSlug: "rock_climbing",
        errors: ["forced mapping failure"],
      });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const session = generateWorkoutSession(
        baseInput({
          sport_slugs: ["rock_climbing"],
        }),
        STUB_EXERCISES
      );
      expect(errorSpy).toHaveBeenCalledWith(
        "[SportProfile] canonical map failed; continuing without sport profile engine",
        expect.objectContaining({
          canonical_sport_definition_slug: "rock_climbing",
          errors: ["forced mapping failure"],
        })
      );
      expect(session).toBeDefined();
      expect(session.blocks.length).toBeGreaterThan(0);
      expect(session.debug?.sport_profile_canonical_mapping_failed).toEqual({
        canonical_sport_definition_slug: "rock_climbing",
        errors: ["forced mapping failure"],
      });
    } finally {
      loadSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });

  it("emits generation mode fingerprint debug metadata when debug is enabled", () => {
    const session = generateWorkoutSession(
      baseInput({
        include_pruning_gate_comparison: true,
      }),
      STUB_EXERCISES
    );
    const fingerprint = session.debug?.generation_mode_fingerprint;
    expect(fingerprint).toBeDefined();
    expect(fingerprint?.pruning_gate).toEqual(
      expect.objectContaining({
        enabled: expect.any(Boolean),
        resolved_flags: expect.objectContaining({
          enable_pruning_gating: expect.any(Boolean),
        }),
      })
    );
    expect(fingerprint?.sport_profile_engine).toEqual(
      expect.objectContaining({
        status: expect.stringMatching(/^(applied|skipped|map_failed)$/),
      })
    );
    expect(fingerprint?.pool_sizes).toEqual(
      expect.objectContaining({
        input_exercise_pool: expect.any(Number),
        after_pruning_gate: expect.any(Number),
        after_hard_constraints: expect.any(Number),
        after_constraint_gate: expect.any(Number),
        guarantee_pool_after_injury_gate: expect.any(Number),
      })
    );
  });

  it("dedupes repeated identical map_failed logs in a single runtime", () => {
    const loadSpy = vi
      .spyOn(sportProfileEngineModule, "loadSportProfileForSession")
      .mockReturnValue({
        status: "map_failed",
        canonicalSlug: "rock_climbing",
        errors: ["forced mapping failure"],
      });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      generateWorkoutSession(baseInput({ sport_slugs: ["rock_climbing"], seed: 1 }), STUB_EXERCISES);
      generateWorkoutSession(baseInput({ sport_slugs: ["rock_climbing"], seed: 2 }), STUB_EXERCISES);

      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith(
        "[SportProfile] canonical map failed; continuing without sport profile engine",
        expect.objectContaining({
          canonical_sport_definition_slug: "rock_climbing",
          errors: ["forced mapping failure"],
        })
      );
    } finally {
      loadSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });
});
