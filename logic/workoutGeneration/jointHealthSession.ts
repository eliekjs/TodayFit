/**
 * PT-inspired joint health session builder.
 * Structure: activation → controlled strength → stability → optional mobility finisher.
 */

import type { WorkoutItem } from "../../lib/types";
import { isCooldownEligibleEquipment, isWarmupEligibleEquipment } from "../../lib/workoutRules";
import type { BlockType, EnergyLevel, Exercise, GenerateWorkoutInput, WorkoutBlock } from "./types";
import {
  classifyJointHealthSlotRole,
  exerciseMatchesJointHealthSubFocus,
  isJointHealthAppropriateExercise,
  isJointHealthExcludedExercise,
  jointHealthStressScore,
  type JointHealthSlotRole,
} from "../../data/goalSubFocus/jointHealthSubFocus";
import { filterByUnusedActivationFamilies } from "./jointHealthActivationFamilies";

export type JointHealthPrescription = {
  sets: number;
  reps?: number;
  time_seconds?: number;
  rest_seconds: number;
  coaching_cues: string;
};

type JointHealthDurationTier = "short" | "standard" | "long";

function jointHealthDurationTier(durationMinutes: number): JointHealthDurationTier {
  if (durationMinutes <= 30) return "short";
  if (durationMinutes <= 45) return "standard";
  return "long";
}

function energySetBonus(energyLevel: EnergyLevel): number {
  if (energyLevel === "low") return -1;
  if (energyLevel === "high") return 1;
  return 0;
}

export function getJointHealthPrescription(
  exercise: Exercise,
  slotRole: JointHealthSlotRole,
  energyLevel: EnergyLevel,
  durationMinutes = 45
): JointHealthPrescription {
  const tier = jointHealthDurationTier(durationMinutes);
  const energyBonus = energySetBonus(energyLevel);
  const stim = (exercise.tags?.stimulus ?? []).map((s) => s.toLowerCase());
  const isIso =
    stim.includes("isometric") ||
    (classifyJointHealthSlotRole(exercise) === "controlled_strength" && stim.includes("isometric"));

  if (slotRole === "activation" || slotRole === "mobility_finisher") {
    const baseSets = tier === "short" ? 2 : tier === "standard" ? 3 : 3;
    const sets = Math.max(2, baseSets + energyBonus);
    return {
      sets,
      reps: tier === "long" ? 12 : 10,
      time_seconds: tier === "short" ? 25 : tier === "standard" ? 35 : 40,
      rest_seconds: 20,
      coaching_cues: "Slow, controlled reps. Stay pain-free. Breathe steadily.",
    };
  }

  if (isIso || slotRole === "stability") {
    const baseSets = tier === "short" ? 3 : tier === "standard" ? 4 : 4;
    const sets = Math.max(3, baseSets + energyBonus);
    const holdSec =
      tier === "short" ? 25 : tier === "standard" ? 35 : energyLevel === "high" ? 45 : 40;
    return {
      sets,
      time_seconds: holdSec,
      rest_seconds: tier === "short" ? 25 : 30,
      coaching_cues: "Hold with control. No shaking or compensating.",
    };
  }

  const baseSets = tier === "short" ? 3 : tier === "standard" ? 4 : 4;
  const sets = Math.max(3, baseSets + energyBonus);
  const reps =
    slotRole === "controlled_strength"
      ? tier === "long"
        ? 12
        : energyLevel === "high"
          ? 12
          : 10
      : energyLevel === "high"
        ? 15
        : 12;
  return {
    sets,
    reps,
    rest_seconds: tier === "short" ? 40 : 45,
    coaching_cues: "Controlled tempo. Light-to-moderate load. Quality over intensity.",
  };
}

type SlotBudget = { role: JointHealthSlotRole; count: number };

function slotBudgetForDuration(durationMinutes: number, regionalSubs: string[] = []): SlotBudget[] {
  const expandedActivation = regionalSubs.some((s) =>
    ["shoulder_health", "hip_health", "ankle_foot_health", "back_spine_health", "elbow_wrist_health"].includes(s)
  );
  if (durationMinutes <= 30) {
    return [
      { role: "activation", count: expandedActivation ? 3 : 2 },
      { role: "controlled_strength", count: 3 },
      { role: "stability", count: 2 },
      { role: "mobility_finisher", count: 1 },
    ];
  }
  if (durationMinutes <= 45) {
    return [
      { role: "activation", count: expandedActivation ? 4 : 3 },
      { role: "controlled_strength", count: 4 },
      { role: "stability", count: 3 },
      { role: "mobility_finisher", count: 2 },
    ];
  }
  return [
    { role: "activation", count: expandedActivation ? 4 : 3 },
    { role: "controlled_strength", count: 5 },
    { role: "stability", count: 4 },
    { role: "mobility_finisher", count: 2 },
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
  controlled_strength: "main_strength",
  stability: "main_strength",
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
      regionalSubs.some((slug) => exerciseMatchesJointHealthSubFocus(e, slug))
    );
    if (matched.length > 0) pool = matched;
  }
  return pool;
}

function isExerciseAvailable(exercise: Exercise, used: Set<string>): boolean {
  return !used.has(exercise.id);
}

function passesJointHealthSlotEquipmentGate(exercise: Exercise, role: JointHealthSlotRole): boolean {
  const equipment = exercise.equipment_required ?? [];
  if (role === "activation") return isWarmupEligibleEquipment(equipment);
  if (role === "mobility_finisher") return isCooldownEligibleEquipment(equipment);
  return true;
}

function maxHighStressJointHealthLoadingSlots(
  durationMinutes: number,
  regionalSubs: string[]
): number {
  return slotBudgetForDuration(durationMinutes, regionalSubs)
    .filter((b) => b.role === "controlled_strength" || b.role === "stability")
    .reduce((sum, b) => sum + b.count, 0);
}

/** Loading stress budget applies to controlled work only — prep/mobility should not block strength picks. */
function shouldAccumulateJointHealthStress(role: JointHealthSlotRole): boolean {
  return role === "controlled_strength" || role === "stability";
}

function recordJointHealthStress(
  exercise: Exercise,
  role: JointHealthSlotRole,
  regionalSubs: string[],
  stressBudget: Map<string, number>
): void {
  if (!shouldAccumulateJointHealthStress(role)) return;
  if (jointHealthStressScore(exercise) < 2) return;
  const regionKey = regionalSubs[0] ?? "general";
  stressBudget.set(regionKey, (stressBudget.get(regionKey) ?? 0) + 1);
}

function passesRegionalAndStressGate(
  exercise: Exercise,
  regionalSubs: string[],
  stressBudget: Map<string, number>,
  durationMinutes: number
): boolean {
  if (regionalSubs.length > 0) {
    const matches = regionalSubs.some((s) => exerciseMatchesJointHealthSubFocus(exercise, s));
    if (!matches) return false;
  }
  const regionKey = regionalSubs[0] ?? "general";
  const stress = jointHealthStressScore(exercise);
  const highStressSlotsUsed = stressBudget.get(regionKey) ?? 0;
  const cap = maxHighStressJointHealthLoadingSlots(durationMinutes, regionalSubs);
  if (stress >= 2 && highStressSlotsUsed >= cap) return false;
  return true;
}

function pickFromCandidates(
  candidates: Exercise[],
  rng: () => number,
  role?: JointHealthSlotRole,
  regionalSubs?: string[],
  used?: Set<string>
): Exercise | null {
  if (!candidates.length) return null;
  let pool = candidates;
  if (role === "activation" && regionalSubs?.length && used) {
    pool = filterByUnusedActivationFamilies(candidates, used, regionalSubs[0]!) as Exercise[];
  }
  const sorted = [...pool].sort(
    (a, b) => jointHealthStressScore(a) - jointHealthStressScore(b) || a.difficulty - b.difficulty
  );
  const topN = Math.min(sorted.length, 5);
  return sorted[Math.floor(rng() * topN)] ?? null;
}

function regionalSlotTagPrefix(regionalSubs: string[]): string | null {
  const slug = regionalSubs[0];
  if (!slug) return null;
  const map: Record<string, string> = {
    knee_health: "knee",
    shoulder_health: "shoulder",
    hip_health: "hip",
    ankle_foot_health: "ankle_foot",
    back_spine_health: "back_spine",
    elbow_wrist_health: "elbow_wrist",
  };
  return map[slug] ?? null;
}

function matchesRelaxedRole(
  exercise: Exercise,
  role: JointHealthSlotRole,
  regionalSubs: string[]
): boolean {
  const tags = new Set((exercise.tags?.attribute_tags ?? []).map((t) => t.toLowerCase()));
  const classified = classifyJointHealthSlotRole(exercise);
  const prefix = regionalSlotTagPrefix(regionalSubs);
  const mobilityTag = prefix ? `${prefix}_mobility` : null;
  const activationTag = prefix ? `${prefix}_activation` : null;
  const strengthTag = prefix ? `${prefix}_strength` : null;
  const stabilityTag = prefix ? `${prefix}_stability` : null;

  if (role === "mobility_finisher") {
    return (
      (mobilityTag != null && tags.has(mobilityTag)) ||
      classified === "mobility_finisher"
    );
  }
  if (classified === "mobility_finisher") return false;
  if (role === "activation") {
    if (!isWarmupEligibleEquipment(exercise.equipment_required ?? [])) return false;
    return (
      (activationTag != null && tags.has(activationTag)) ||
      exercise.exercise_role === "activation"
    );
  }
  if (role === "controlled_strength") {
    return (strengthTag != null && tags.has(strengthTag)) || classified === "controlled_strength";
  }
  if (role === "stability") {
    return (stabilityTag != null && tags.has(stabilityTag)) || classified === "stability";
  }
  return true;
}

function requiresTaggedActivation(regionalSubs: string[], role: JointHealthSlotRole): boolean {
  if (role !== "activation") return false;
  const slug = regionalSubs[0];
  return slug === "shoulder_health" || slug === "hip_health" || slug === "knee_health" || slug === "ankle_foot_health" || slug === "back_spine_health" || slug === "elbow_wrist_health";
}

function hasRegionalActivationTag(exercise: Exercise, regionalSubs: string[]): boolean {
  const prefix = regionalSlotTagPrefix(regionalSubs);
  if (!prefix) return true;
  const tag = `${prefix}_activation`;
  return (exercise.tags?.attribute_tags ?? []).map((t) => t.toLowerCase()).includes(tag);
}

function pickForSlot(
  pool: Exercise[],
  role: JointHealthSlotRole,
  used: Set<string>,
  rng: () => number,
  regionalSubs: string[],
  stressBudget: Map<string, number>,
  durationMinutes: number
): Exercise | null {
  const strictCandidates = pool.filter((e) => {
    if (!isExerciseAvailable(e, used)) return false;
    if (classifyJointHealthSlotRole(e) !== role) return false;
    if (requiresTaggedActivation(regionalSubs, role) && !hasRegionalActivationTag(e, regionalSubs)) return false;
    if (!passesJointHealthSlotEquipmentGate(e, role)) return false;
    return passesRegionalAndStressGate(e, regionalSubs, stressBudget, durationMinutes);
  });
  const strictPick = pickFromCandidates(strictCandidates, rng, role, regionalSubs, used);
  if (strictPick) return strictPick;

  const relaxedCandidates = pool.filter((e) => {
    if (!isExerciseAvailable(e, used)) return false;
    if (requiresTaggedActivation(regionalSubs, role) && !hasRegionalActivationTag(e, regionalSubs)) return false;
    if (!passesJointHealthSlotEquipmentGate(e, role)) return false;
    if (!passesRegionalAndStressGate(e, regionalSubs, stressBudget, durationMinutes)) return false;
    return matchesRelaxedRole(e, role, regionalSubs);
  });
  return pickFromCandidates(relaxedCandidates, rng, role, regionalSubs, used);
}

export function estimateJointHealthItemMinutes(item: WorkoutItem): number {
  const sets = item.sets ?? 1;
  const restSec = item.rest_seconds ?? 30;
  if (item.time_seconds != null && item.time_seconds > 0) {
    return sets * ((item.time_seconds + restSec) / 60);
  }
  const reps = item.reps ?? 10;
  const workSec = Math.max(20, Math.min(50, reps * 3));
  return sets * ((workSec + restSec) / 60);
}

function estimateJointHealthBlockMinutes(items: WorkoutItem[]): number {
  const raw = items.reduce((sum, item) => sum + estimateJointHealthItemMinutes(item), 0);
  return Math.max(5, Math.round(raw + 1));
}

function buildJointHealthItem(
  ex: Exercise,
  role: JointHealthSlotRole,
  input: GenerateWorkoutInput
): WorkoutItem {
  const durationMinutes = input.duration_minutes ?? 45;
  const rx = getJointHealthPrescription(ex, role, input.energy_level, durationMinutes);
  return {
    exercise_id: ex.id,
    exercise_name: ex.name,
    sets: rx.sets,
    ...(rx.reps != null ? { reps: rx.reps } : {}),
    ...(rx.time_seconds != null ? { time_seconds: rx.time_seconds } : {}),
    rest_seconds: rx.rest_seconds,
    coaching_cues: rx.coaching_cues,
    reasoning_tags: ["joint_health", role, ...(ex.tags?.goal_tags ?? [])],
    unilateral: ex.unilateral ?? false,
  };
}

function estimateJointHealthSessionMinutes(blocks: WorkoutBlock[]): number {
  return blocks.reduce((sum, block) => sum + estimateJointHealthBlockMinutes(block.items), 0);
}

function jointHealthRoleItemCount(blocks: WorkoutBlock[], role: JointHealthSlotRole): number {
  const block = blocks.find((b) => b.title === SLOT_BLOCK_TITLE[role]);
  return block?.items.length ?? 0;
}

function jointHealthRoleBudget(
  role: JointHealthSlotRole,
  durationMinutes: number,
  regionalSubs: string[]
): number {
  return slotBudgetForDuration(durationMinutes, regionalSubs).find((b) => b.role === role)?.count ?? 0;
}

function fillJointHealthSessionToDuration(
  blocks: WorkoutBlock[],
  pool: Exercise[],
  input: GenerateWorkoutInput,
  used: Set<string>,
  rng: () => number,
  regionalSubs: string[],
  stressBudget: Map<string, number>
): void {
  const targetMinutes = input.duration_minutes ?? 45;
  const minTarget = Math.round(targetMinutes * 0.9);
  const roleOrder: JointHealthSlotRole[] = [
    "controlled_strength",
    "stability",
    "activation",
    "mobility_finisher",
  ];

  let guard = 0;
  while (estimateJointHealthSessionMinutes(blocks) < minTarget && guard < 24) {
    guard += 1;
    let progressed = false;

    for (const block of blocks) {
      if (estimateJointHealthSessionMinutes(blocks) >= minTarget) break;
      for (const item of block.items) {
        if ((item.sets ?? 1) >= 5) continue;
        item.sets = (item.sets ?? 1) + 1;
        block.estimated_minutes = estimateJointHealthBlockMinutes(block.items);
        progressed = true;
        if (estimateJointHealthSessionMinutes(blocks) >= minTarget) break;
      }
    }
    if (progressed) continue;

    for (const role of roleOrder) {
      if (estimateJointHealthSessionMinutes(blocks) >= minTarget) break;
      if (jointHealthRoleItemCount(blocks, role) >= jointHealthRoleBudget(role, targetMinutes, regionalSubs)) {
        continue;
      }
      const ex = pickForSlot(pool, role, used, rng, regionalSubs, stressBudget, targetMinutes);
      if (!ex) continue;
      used.add(ex.id);
      recordJointHealthStress(ex, role, regionalSubs, stressBudget);

      const blockTitle = SLOT_BLOCK_TITLE[role];
      let block = blocks.find((b) => b.title === blockTitle);
      if (!block) {
        block = {
          block_type: SLOT_BLOCK_TYPE[role],
          format: "straight_sets",
          title: blockTitle,
          reasoning: "PT-inspired joint-supportive work: controlled loading, stability, and tissue tolerance.",
          items: [],
          estimated_minutes: 0,
        };
        blocks.push(block);
      }
      block.items.push(buildJointHealthItem(ex, role, input));
      block.estimated_minutes = estimateJointHealthBlockMinutes(block.items);
      progressed = true;
    }

    if (!progressed) break;
  }
}

export function buildJointHealthMain(
  exercises: Exercise[],
  input: GenerateWorkoutInput,
  used: Set<string>,
  rng: () => number
): WorkoutBlock[] {
  const pool = filterJointHealthPool(exercises, input, used);
  const regionalSubs = input.goal_sub_focus?.joint_health ?? [];
  const durationMinutes = input.duration_minutes ?? 45;
  const budgets = slotBudgetForDuration(durationMinutes, regionalSubs);
  const stressBudget = new Map<string, number>();
  const blocks: WorkoutBlock[] = [];

  for (const { role, count } of budgets) {
    const items: WorkoutItem[] = [];
    for (let i = 0; i < count; i++) {
      const ex = pickForSlot(pool, role, used, rng, regionalSubs, stressBudget, durationMinutes);
      if (!ex) continue;
      used.add(ex.id);
      recordJointHealthStress(ex, role, regionalSubs, stressBudget);

      items.push(buildJointHealthItem(ex, role, input));
    }
    if (items.length === 0) continue;
    blocks.push({
      block_type: SLOT_BLOCK_TYPE[role],
      format: "straight_sets",
      title: SLOT_BLOCK_TITLE[role],
      reasoning: "PT-inspired joint-supportive work: controlled loading, stability, and tissue tolerance.",
      items,
      estimated_minutes: estimateJointHealthBlockMinutes(items),
    });
  }

  if (blocks.length === 0 && pool.length > 0) {
    const ex = pool.find((e) => isExerciseAvailable(e, used));
    if (ex) {
      used.add(ex.id);
      const item = buildJointHealthItem(ex, "controlled_strength", input);
      blocks.push({
        block_type: "main_strength",
        format: "straight_sets",
        title: "Joint health",
        reasoning: "Fallback joint-supportive session.",
        items: [item],
        estimated_minutes: estimateJointHealthBlockMinutes([item]),
      });
    }
  }

  fillJointHealthSessionToDuration(blocks, pool, input, used, rng, regionalSubs, stressBudget);

  for (const block of blocks) {
    block.estimated_minutes = estimateJointHealthBlockMinutes(block.items);
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
