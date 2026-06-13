/**
 * PT-inspired joint health session builder.
 * Structure: activation → controlled strength → stability → optional mobility finisher.
 */

import type { WorkoutItem } from "../../lib/types";
import type { BlockType, EnergyLevel, Exercise, GenerateWorkoutInput, WorkoutBlock } from "./types";
import {
  classifyJointHealthSlotRole,
  exerciseMatchesJointHealthSubFocus,
  isJointHealthAppropriateExercise,
  isJointHealthExcludedExercise,
  jointHealthStressScore,
  type JointHealthSlotRole,
} from "../../data/goalSubFocus/jointHealthSubFocus";
import { exerciseMatchesGoalSubFocusSlugUnified } from "./subFocusSlugMatch";

export type JointHealthPrescription = {
  sets: number;
  reps?: number;
  time_seconds?: number;
  rest_seconds: number;
  coaching_cues: string;
};

export function getJointHealthPrescription(
  exercise: Exercise,
  slotRole: JointHealthSlotRole,
  energyLevel: EnergyLevel
): JointHealthPrescription {
  const stim = (exercise.tags?.stimulus ?? []).map((s) => s.toLowerCase());
  const isIso = stim.includes("isometric") || classifyJointHealthSlotRole(exercise) === "controlled_strength" && stim.includes("isometric");

  if (slotRole === "activation" || slotRole === "mobility_finisher") {
    const sets = energyLevel === "low" ? 1 : energyLevel === "high" ? 3 : 2;
    return {
      sets,
      reps: 8,
      time_seconds: 30,
      rest_seconds: 15,
      coaching_cues: "Slow, controlled reps. Stay pain-free. Breathe steadily.",
    };
  }

  if (isIso || slotRole === "stability") {
    const sets = energyLevel === "low" ? 2 : energyLevel === "high" ? 4 : 3;
    const holdSec = energyLevel === "low" ? 20 : energyLevel === "high" ? 45 : 30;
    return {
      sets,
      time_seconds: holdSec,
      rest_seconds: 30,
      coaching_cues: "Hold with control. No shaking or compensating.",
    };
  }

  // Controlled strength / accessories
  const sets = energyLevel === "low" ? 2 : energyLevel === "high" ? 4 : 3;
  const reps = slotRole === "controlled_strength" ? (energyLevel === "high" ? 12 : 8) : energyLevel === "high" ? 15 : 12;
  return {
    sets,
    reps,
    rest_seconds: 45,
    coaching_cues: "Controlled tempo. Light-to-moderate load. Quality over intensity.",
  };
}

type SlotBudget = { role: JointHealthSlotRole; count: number };

function slotBudgetForDuration(durationMinutes: number): SlotBudget[] {
  if (durationMinutes <= 30) {
    return [
      { role: "activation", count: 1 },
      { role: "controlled_strength", count: 2 },
      { role: "stability", count: 1 },
    ];
  }
  if (durationMinutes <= 45) {
    return [
      { role: "activation", count: 2 },
      { role: "controlled_strength", count: 3 },
      { role: "stability", count: 2 },
      { role: "mobility_finisher", count: 1 },
    ];
  }
  return [
    { role: "activation", count: 2 },
    { role: "controlled_strength", count: 3 },
    { role: "stability", count: 2 },
    { role: "mobility_finisher", count: 1 },
  ];
}

const SLOT_BLOCK_TITLE: Record<JointHealthSlotRole, string> = {
  activation: "Joint prep / activation",
  controlled_strength: "Controlled strength",
  stability: "Stability & unilateral",
  mobility_finisher: "Mobility finisher",
};

const SLOT_BLOCK_TYPE: Record<JointHealthSlotRole, BlockType> = {
  activation: "warmup",
  controlled_strength: "accessory",
  stability: "accessory",
  mobility_finisher: "cooldown",
};

function filterJointHealthPool(
  exercises: Exercise[],
  input: GenerateWorkoutInput,
  used: Set<string>
): Exercise[] {
  const regionalSubs = input.goal_sub_focus?.joint_health ?? [];
  let pool = exercises.filter(
    (e) =>
      isExerciseAvailable(e, used) &&
      isJointHealthAppropriateExercise(e) &&
      !isJointHealthExcludedExercise(e)
  );

  if (regionalSubs.length > 0) {
    const matched = pool.filter((e) =>
      regionalSubs.some(
        (slug) =>
          exerciseMatchesJointHealthSubFocus(e, slug) ||
          exerciseMatchesGoalSubFocusSlugUnified(e, "joint_health", slug)
      )
    );
    if (matched.length >= 4) pool = matched;
  }
  return pool;
}

function isExerciseAvailable(exercise: Exercise, used: Set<string>): boolean {
  return !used.has(exercise.id);
}

function pickForSlot(
  pool: Exercise[],
  role: JointHealthSlotRole,
  used: Set<string>,
  rng: () => number,
  regionalSubs: string[],
  stressBudget: Map<string, number>
): Exercise | null {
  const candidates = pool.filter((e) => {
    if (!isExerciseAvailable(e, used)) return false;
    if (classifyJointHealthSlotRole(e) !== role) return false;
    if (regionalSubs.length > 0) {
      const matches = regionalSubs.some((s) => exerciseMatchesJointHealthSubFocus(e, s));
      if (!matches && role !== "mobility_finisher") return false;
    }
    const regionKey = regionalSubs[0] ?? "general";
    const stress = jointHealthStressScore(e);
    const usedStress = stressBudget.get(regionKey) ?? 0;
    if (stress >= 2 && usedStress >= 2) return false;
    return true;
  });

  if (!candidates.length) {
    const fallback = pool.filter(
      (e) =>
        isExerciseAvailable(e, used) &&
        isJointHealthAppropriateExercise(e) &&
        (regionalSubs.length === 0 ||
          regionalSubs.some((s) => exerciseMatchesJointHealthSubFocus(e, s)))
    );
    if (!fallback.length) return null;
    const pick = fallback[Math.floor(rng() * fallback.length)];
    return pick ?? null;
  }

  const sorted = [...candidates].sort(
    (a, b) => jointHealthStressScore(a) - jointHealthStressScore(b) || a.difficulty - b.difficulty
  );
  const topN = Math.min(sorted.length, 5);
  const pick = sorted[Math.floor(rng() * topN)];
  return pick ?? null;
}

export function buildJointHealthMain(
  exercises: Exercise[],
  input: GenerateWorkoutInput,
  used: Set<string>,
  rng: () => number
): WorkoutBlock[] {
  const pool = filterJointHealthPool(exercises, input, used);
  const regionalSubs = input.goal_sub_focus?.joint_health ?? [];
  const budgets = slotBudgetForDuration(input.duration_minutes ?? 45);
  const stressBudget = new Map<string, number>();
  const blocks: WorkoutBlock[] = [];

  for (const { role, count } of budgets) {
    const items: WorkoutItem[] = [];
    for (let i = 0; i < count; i++) {
      const ex = pickForSlot(pool, role, used, rng, regionalSubs, stressBudget);
      if (!ex) continue;
      used.add(ex.id);
      const regionKey = regionalSubs[0] ?? "general";
      stressBudget.set(regionKey, (stressBudget.get(regionKey) ?? 0) + jointHealthStressScore(ex));

      const rx = getJointHealthPrescription(ex, role, input.energy_level);
      items.push({
        exercise_id: ex.id,
        exercise_name: ex.name,
        sets: rx.sets,
        ...(rx.reps != null ? { reps: rx.reps } : {}),
        ...(rx.time_seconds != null ? { time_seconds: rx.time_seconds } : {}),
        rest_seconds: rx.rest_seconds,
        coaching_cues: rx.coaching_cues,
        reasoning_tags: ["joint_health", role, ...(ex.tags?.goal_tags ?? [])],
        unilateral: ex.unilateral ?? false,
      });
    }
    if (items.length === 0) continue;
    blocks.push({
      block_type: SLOT_BLOCK_TYPE[role],
      format: "straight_sets",
      title: SLOT_BLOCK_TITLE[role],
      reasoning: "PT-inspired joint-supportive work: controlled loading, stability, and tissue tolerance.",
      items,
      estimated_minutes: Math.max(4, Math.round(items.length * 3)),
    });
  }

  if (blocks.length === 0 && pool.length > 0) {
    const ex = pool.find((e) => isExerciseAvailable(e, used));
    if (ex) {
      used.add(ex.id);
      const rx = getJointHealthPrescription(ex, "controlled_strength", input.energy_level);
      blocks.push({
        block_type: "accessory",
        format: "straight_sets",
        title: "Joint health",
        reasoning: "Fallback joint-supportive session.",
        items: [
          {
            exercise_id: ex.id,
            exercise_name: ex.name,
            sets: rx.sets,
            ...(rx.reps != null ? { reps: rx.reps } : {}),
            ...(rx.time_seconds != null ? { time_seconds: rx.time_seconds } : {}),
            rest_seconds: rx.rest_seconds,
            coaching_cues: rx.coaching_cues,
            reasoning_tags: ["joint_health"],
            unilateral: ex.unilateral ?? false,
          },
        ],
        estimated_minutes: 10,
      });
    }
  }

  return blocks;
}

/** Secondary joint health: bias toward safer variants in mixed-goal sessions. */
export function applyJointHealthSecondaryBias(
  exercises: Exercise[],
  hasJointHealthSecondary: boolean
): Exercise[] {
  if (!hasJointHealthSecondary) return exercises;
  return exercises.map((e) => {
    if (isJointHealthExcludedExercise(e)) {
      return { ...e, _jointHealthPenalized: true } as Exercise & { _jointHealthPenalized?: boolean };
    }
    return e;
  });
}

export function exercisePenalizedForJointHealthSecondary(exercise: Exercise): boolean {
  return (exercise as Exercise & { _jointHealthPenalized?: boolean })._jointHealthPenalized === true;
}
