/**
 * Session generation engine. Used by both Build My Workout and Sports Prep.
 * The difference between modes is the type of filters that supply the input
 * (session-focused vs sport/plan-focused); both can generate one day or a week.
 */

import type {
  Exercise,
  GenerateWorkoutInput,
  WorkoutSession,
  WorkoutBlock,
  WorkoutItem,
  ScoringDebug,
  RegenerateMode,
  BlockType,
  BlockFormat,
  PrimaryGoal,
} from "./types";
import { STUB_EXERCISES } from "./exerciseStub";
import {
  isWarmupEligibleEquipment,
  WARMUP_CARDIO_POSITION,
  WARMUP_ITEM_MAX_SECONDS,
  getInjuryAvoidTags,
  getInjuryAvoidExerciseIds,
  MAX_SAME_PATTERN_PER_SESSION,
  MIN_MOVEMENT_CATEGORIES,
  BALANCE_CATEGORY_PATTERNS,
} from "../../lib/workoutRules";
import {
  balanceBonusForExercise,
  getBalanceState,
  getPatternsToPrefer,
} from "../../lib/generation/movementBalance";
import {
  getFatigueState,
  fatiguePenaltyForExercise,
  type FatigueState,
} from "../../lib/generation/fatigueRules";
import {
  getGoalRules,
  scaleSetsByEnergy,
  getConditioningDurationMinutes,
  type EnergyLevel,
} from "../../lib/generation/prescriptionRules";
import { getBestSubstitute } from "../../lib/generation/exerciseSubstitution";

// --- Avoid tags that imply overhead / hanging / shoulder extension (safety) ---
const OVERHEAD_HANGING_PATTERNS = new Set([
  "overhead",
  "hanging",
  "shoulder_extension",
  "shoulder_overhead",
  "grip_hanging",
]);
const EXERCISE_IDS_OVERHEAD_OR_HANGING = new Set([
  "pullup",
  "oh_press",
  "db_shoulder_press",
  "dips",
]);

function exerciseHasOverheadOrHanging(e: Exercise, avoidTags: string[]): boolean {
  if (!avoidTags.length) return false;
  const avoid = new Set(avoidTags.map((t) => t.toLowerCase().replace(/\s/g, "_")));
  const hasOverheadAvoid = [...OVERHEAD_HANGING_PATTERNS].some((p) => avoid.has(p));
  if (!hasOverheadAvoid) return false;
  if (EXERCISE_IDS_OVERHEAD_OR_HANGING.has(e.id)) return true;
  const jointStress = e.tags.joint_stress ?? [];
  if (jointStress.some((s) => s === "shoulder_overhead" || s === "grip_hanging")) return true;
  return false;
}

// --- Seeded RNG (deterministic) ---
function createSeededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function shuffleWithSeed<T>(arr: T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// --- Hard constraints: filter out exercises that violate equipment, injuries, avoid, energy, time ---
export function filterByHardConstraints(
  exercises: Exercise[],
  input: GenerateWorkoutInput
): Exercise[] {
  const equipmentSet = new Set(
    input.available_equipment.map((e) => e.toLowerCase().replace(/\s/g, "_"))
  );
  const injuriesSet = new Set(
    input.injuries_or_constraints.map((i) => i.toLowerCase().replace(/\s/g, "_"))
  );
  const avoidTags = input.style_prefs?.avoid_tags ?? [];
  const injuryAvoidTags = getInjuryAvoidTags(input.injuries_or_constraints);
  const injuryAvoidIds = getInjuryAvoidExerciseIds(input.injuries_or_constraints);

  return exercises.filter((e) => {
    // Equipment: every required piece must be available
    const required = e.equipment_required.map((eq) => eq.toLowerCase().replace(/\s/g, "_"));
    if (required.some((eq) => !equipmentSet.has(eq))) return false;

    // Contraindications / injuries (explicit tag match)
    const contra = e.tags.contraindications ?? [];
    if (contra.some((c) => injuriesSet.has(c))) return false;

    // Injury safety: exclude exercises that stress injured areas
    const jointStress = e.tags.joint_stress ?? [];
    for (const avoid of injuryAvoidTags) {
      if (jointStress.includes(avoid)) return false;
    }
    if (injuryAvoidIds.has(e.id)) return false;

    // Joint stress: if user style prefs avoid certain patterns, exclude
    for (const avoid of avoidTags) {
      const a = avoid.toLowerCase().replace(/\s/g, "_");
      if (jointStress.includes(a)) return false;
    }

    // Avoid overhead / hanging when user specified
    if (exerciseHasOverheadOrHanging(e, avoidTags)) return false;

    // Energy: low energy → exclude exercises tagged only for high
    if (input.energy_level === "low") {
      const energyFit = e.tags.energy_fit ?? ["low", "medium", "high"];
      if (energyFit.length === 1 && energyFit[0] === "high") return false;
    }

    return true;
  });
}

// --- Scoring weights ---
const WEIGHT_PRIMARY_GOAL = 3.0;
const WEIGHT_SECONDARY_GOAL = 1.5;
const WEIGHT_TERTIARY = 1.0;
const WEIGHT_BODY_PART = 1.5;
const WEIGHT_ENERGY_FIT = 1.0;

function goalToTags(goal: string): string[] {
  const g = goal.toLowerCase().replace(/\s/g, "_");
  const map: Record<string, string[]> = {
    strength: ["strength"],
    power: ["power"],
    hypertrophy: ["hypertrophy"],
    body_recomp: ["hypertrophy", "strength"],
    endurance: ["endurance"],
    conditioning: ["conditioning"],
    mobility: ["mobility"],
    recovery: ["recovery"],
    athletic_performance: ["athleticism", "power"],
    calisthenics: ["calisthenics", "strength"],
  };
  return map[g] ?? [g];
}

function focusBodyPartToMuscles(focus: string): string[] {
  const f = focus.toLowerCase();
  if (f === "upper_push") return ["push"];
  if (f === "upper_pull") return ["pull"];
  if (f === "lower") return ["legs"];
  if (f === "core") return ["core"];
  if (f === "full_body") return ["legs", "push", "pull", "core"];
  return [];
}

export function scoreExercise(
  exercise: Exercise,
  input: GenerateWorkoutInput,
  recentExerciseIds: Set<string>,
  movementPatternCounts: Map<string, number>,
  includeDebug: boolean,
  fatigueState?: FatigueState
): { score: number; debug?: Partial<ScoringDebug> } {
  let total = 0;
  const debug: Partial<ScoringDebug> | undefined = includeDebug ? { exercise_id: exercise.id } : undefined;

  // Goal alignment
  const goalTags = exercise.tags.goal_tags ?? [];
  const primaryTags = goalToTags(input.primary_goal);
  const secondaryTags = (input.secondary_goals ?? []).flatMap(goalToTags);
  let goalScore = 0;
  for (const t of goalTags) {
    if (primaryTags.includes(t)) goalScore += WEIGHT_PRIMARY_GOAL;
    else if (secondaryTags.includes(t)) goalScore += WEIGHT_SECONDARY_GOAL;
    else goalScore += WEIGHT_TERTIARY * 0.5;
  }
  total += goalScore;
  if (debug) debug.goal_alignment = goalScore;

  // Body part focus
  const focusParts = input.focus_body_parts ?? [];
  if (focusParts.length) {
    const wantedMuscles = new Set(focusParts.flatMap(focusBodyPartToMuscles));
    const match = exercise.muscle_groups.some((m) => wantedMuscles.has(m));
    if (match) {
      total += WEIGHT_BODY_PART;
      if (debug) debug.body_part = WEIGHT_BODY_PART;
    }
  }

  // Energy fit
  const energyFit = exercise.tags.energy_fit ?? ["low", "medium", "high"];
  if (energyFit.includes(input.energy_level)) {
    total += WEIGHT_ENERGY_FIT;
    if (debug) debug.energy_fit = WEIGHT_ENERGY_FIT;
  }

  // Variety penalty: used recently
  let varietyPenalty = 0;
  if (recentExerciseIds.has(exercise.id)) varietyPenalty += 3;
  const pattern = exercise.movement_pattern;
  const samePatternCount = movementPatternCounts.get(pattern) ?? 0;
  if (samePatternCount >= 2) varietyPenalty += 1.5;
  if (samePatternCount >= 3) varietyPenalty += 2;
  total -= varietyPenalty;
  if (debug && varietyPenalty) debug.variety_penalty = -varietyPenalty;

  // Balance bonus: movement-pattern balancing engine (prefer missing categories, then underrepresented)
  const balanceBonus = balanceBonusForExercise(
    pattern,
    movementPatternCounts,
    MIN_MOVEMENT_CATEGORIES,
    [...BALANCE_CATEGORY_PATTERNS]
  );
  total += balanceBonus;
  if (debug && balanceBonus) debug.balance_bonus = balanceBonus;

  // Fatigue management: slight penalty for re-hitting same muscle groups as last session
  if (fatigueState) {
    const fatiguePenalty = fatiguePenaltyForExercise(exercise.muscle_groups, fatigueState);
    total += fatiguePenalty;
    if (debug && fatiguePenalty !== 0) debug.fatigue_penalty = fatiguePenalty;
  }

  // Duration practicality: short sessions prefer low time_cost
  if (input.duration_minutes <= 30 && exercise.time_cost === "high") {
    total -= 1;
    if (debug) debug.duration_practicality = -1;
  } else if (input.duration_minutes <= 30 && exercise.time_cost === "low") {
    total += 0.5;
    if (debug) debug.duration_practicality = 0.5;
  }

  if (debug) debug.total = total;
  return { score: total, debug };
}

// --- Rep/set prescription from goal rules (evidence-based) ---
function getPrescription(
  exercise: Exercise,
  blockType: BlockType,
  energyLevel: EnergyLevel,
  primaryGoal?: PrimaryGoal,
  isAccessory?: boolean,
  fatigueVolumeScale?: number
): { sets: number; reps?: number; time_seconds?: number; rest_seconds: number; coaching_cues: string } {
  const goal = primaryGoal ?? "hypertrophy";
  const rules = getGoalRules(goal);
  const scaleSets = (s: number) =>
    fatigueVolumeScale != null && fatigueVolumeScale < 1
      ? Math.max(1, Math.round(s * fatigueVolumeScale))
      : s;

  if (blockType === "warmup" || blockType === "cooldown" || exercise.modality === "mobility" || exercise.modality === "recovery") {
    const timeSec = rules.mobilityTimePerMovement ?? 45;
    return {
      sets: rules.mobilitySets ?? 1,
      reps: 8,
      time_seconds: timeSec,
      rest_seconds: 15,
      coaching_cues: rules.cueStyle.mobility ?? "Controlled, full range of motion. Breathe steadily.",
    };
  }

  if (exercise.modality === "conditioning") {
    const mins = getConditioningDurationMinutes(goal, energyLevel) ?? (energyLevel === "high" ? 8 : energyLevel === "low" ? 5 : 6);
    return {
      sets: 1,
      time_seconds: mins * 60,
      rest_seconds: 0,
      coaching_cues: rules.cueStyle.cardio ?? "Steady effort. Keep heart rate in target zone.",
    };
  }

  // Accessory work (e.g. strength superset pairs): use accessory rules when present
  if (isAccessory && rules.accessoryRepRange) {
    const setRange = rules.accessorySetRange ?? { min: 2, max: 3 };
    const sets = scaleSets(scaleSetsByEnergy(Math.round((setRange.min + setRange.max) / 2), energyLevel));
    const reps = Math.round((rules.accessoryRepRange.min + rules.accessoryRepRange.max) / 2);
    const rest = rules.accessoryRestRange ? Math.round((rules.accessoryRestRange.min + rules.accessoryRestRange.max) / 2) : 60;
    return {
      sets,
      reps,
      rest_seconds: rest,
      coaching_cues: rules.cueStyle.strength ?? "Controlled tempo. Muscular balance.",
    };
  }

  if (blockType === "main_strength" || exercise.tags.goal_tags?.includes("strength")) {
    const baseSets = Math.round((rules.setRange.min + rules.setRange.max) / 2);
    const sets = scaleSets(scaleSetsByEnergy(baseSets, energyLevel));
    const reps = Math.round((rules.repRange.min + rules.repRange.max) / 2);
    const rest = Math.round((rules.restRange.min + rules.restRange.max) / 2);
    return {
      sets,
      reps,
      rest_seconds: rest,
      coaching_cues: rules.cueStyle.strength ?? "Heavy, controlled. Full lockout.",
    };
  }

  if (blockType === "main_hypertrophy" || exercise.tags.goal_tags?.includes("hypertrophy")) {
    const baseSets = Math.round((rules.setRange.min + rules.setRange.max) / 2);
    const sets = scaleSets(scaleSetsByEnergy(baseSets, energyLevel));
    const reps = Math.round((rules.repRange.min + rules.repRange.max) / 2);
    const rest = Math.round((rules.restRange.min + rules.restRange.max) / 2);
    return {
      sets,
      reps,
      rest_seconds: rest,
      coaching_cues: rules.cueStyle.strength ?? "Moderate load. Squeeze at peak contraction.",
    };
  }

  // Default
  const baseSets = Math.round((rules.setRange.min + rules.setRange.max) / 2);
  const sets = scaleSets(scaleSetsByEnergy(baseSets, energyLevel));
  const reps = Math.round((rules.repRange.min + rules.repRange.max) / 2);
  const rest = Math.round((rules.restRange.min + rules.restRange.max) / 2);
  return {
    sets,
    reps,
    rest_seconds: rest,
    coaching_cues: rules.cueStyle.strength ?? "Controlled tempo.",
  };
}

// --- Select top exercises by score (and by movement pattern for balance) ---
function selectExercises(
  pool: Exercise[],
  input: GenerateWorkoutInput,
  recentIds: Set<string>,
  movementCounts: Map<string, number>,
  count: number,
  rng: () => number,
  includeDebug: boolean,
  fatigueState?: FatigueState
): { exercises: Exercise[]; scoringDebug: ScoringDebug[] } {
  const scored = pool.map((e) => ({
    exercise: e,
    ...scoreExercise(e, input, recentIds, movementCounts, includeDebug, fatigueState),
  }));
  scored.sort((a, b) => b.score - a.score);
  const topOverall = scored.slice(0, Math.min(60, scored.length));
  const chosen: Exercise[] = [];
  const debugList: ScoringDebug[] = [];

  // Category-fill pass: ensure we hit MIN_MOVEMENT_CATEGORIES when possible (movement-pattern balancing engine)
  const patternsToPrefer = getPatternsToPrefer(movementCounts, MIN_MOVEMENT_CATEGORIES, [...BALANCE_CATEGORY_PATTERNS]);
  const state = getBalanceState(movementCounts, [...BALANCE_CATEGORY_PATTERNS]);
  const needCategories = Math.min(MIN_MOVEMENT_CATEGORIES - state.categoryCount, patternsToPrefer.length);

  for (let k = 0; k < needCategories && chosen.length < count; k++) {
    const targetPattern = patternsToPrefer[k];
    if (!targetPattern) break;
    const best = topOverall.find(
      (x) =>
        x.exercise.movement_pattern === targetPattern &&
        !chosen.some((c) => c.id === x.exercise.id)
    );
    if (!best) continue;
    chosen.push(best.exercise);
    movementCounts.set(best.exercise.movement_pattern, (movementCounts.get(best.exercise.movement_pattern) ?? 0) + 1);
    if (best.debug && includeDebug) debugList.push(best.debug as ScoringDebug);
  }

  // Random selection from top candidates (respecting pattern cap)
  for (let i = 0; chosen.length < count && i < topOverall.length * 2; i++) {
    const idx = Math.floor(rng() * Math.min(15, topOverall.length));
    const item = topOverall[idx];
    if (!item || chosen.some((c) => c.id === item.exercise.id)) continue;
    const nextCount = (movementCounts.get(item.exercise.movement_pattern) ?? 0) + 1;
    if (nextCount > MAX_SAME_PATTERN_PER_SESSION) continue;
    chosen.push(item.exercise);
    movementCounts.set(item.exercise.movement_pattern, nextCount);
    if (item.debug && includeDebug) debugList.push(item.debug as ScoringDebug);
  }

  // If we didn't fill, add from top in order (respecting pattern cap)
  for (const { exercise, debug } of topOverall) {
    if (chosen.length >= count) break;
    if (chosen.some((c) => c.id === exercise.id)) continue;
    const nextCount = (movementCounts.get(exercise.movement_pattern) ?? 0) + 1;
    if (nextCount > MAX_SAME_PATTERN_PER_SESSION) continue;
    chosen.push(exercise);
    movementCounts.set(exercise.movement_pattern, nextCount);
    if (debug && includeDebug) debugList.push(debug as ScoringDebug);
  }

  return { exercises: chosen.slice(0, count), scoringDebug: debugList };
}

// --- Build warmup block (5–8 min): 2–4 mobility/activation items ---
// Warm-up: bodyweight or bands only (shared rules). Short cardio first or last (WARMUP_CARDIO_POSITION).
function buildWarmup(
  exercises: Exercise[],
  input: GenerateWorkoutInput,
  used: Set<string>,
  rng: () => number,
  includeDebug: boolean,
  fatigueState?: FatigueState
): WorkoutBlock {
  const basePool = exercises.filter(
    (e) =>
      (e.modality === "mobility" || e.modality === "recovery" || e.modality === "conditioning") &&
      !used.has(e.id) &&
      e.id !== "breathing_cooldown"
  );
  const pool = basePool.filter((e) => isWarmupEligibleEquipment(e.equipment_required));
  const finalPool = pool.length ? pool : basePool;
  const count = 2;
  const movementCounts = new Map<string, number>();
  const recentIds = new Set(input.recent_history?.flatMap((h) => h.exercise_ids) ?? []);
  const { exercises: chosen } = selectExercises(
    finalPool,
    input,
    recentIds,
    movementCounts,
    Math.min(count, finalPool.length || 2),
    rng,
    false,
    fatigueState
  );
  const sortedChosen = WARMUP_CARDIO_POSITION === "last"
    ? [...chosen].sort((a, b) => (a.modality === "conditioning" ? 1 : 0) - (b.modality === "conditioning" ? 1 : 0))
    : chosen;

  const items: WorkoutItem[] = sortedChosen.map((e) => {
    used.add(e.id);
    let p = getPrescription(e, "warmup", input.energy_level, input.primary_goal);
    let timeSec = p.time_seconds;
    if (timeSec != null && timeSec > WARMUP_ITEM_MAX_SECONDS) {
      timeSec = WARMUP_ITEM_MAX_SECONDS;
    }
    return {
      exercise_id: e.id,
      exercise_name: e.name,
      sets: p.sets,
      reps: p.reps,
      time_seconds: timeSec,
      rest_seconds: p.rest_seconds,
      coaching_cues: p.coaching_cues,
      reasoning_tags: ["warmup", "mobility", ...(e.tags.goal_tags ?? [])],
    };
  });

  return {
    block_type: "warmup",
    format: "circuit",
    title: "Warm-up",
    reasoning: "Prepares your joints and elevates heart rate before the main work.",
    items,
    estimated_minutes: Math.min(10, 5 + items.length * 2),
  };
}

// --- Build cooldown block (3–6 min): 2–3 items breathing + mobility ---
function buildCooldown(
  exercises: Exercise[],
  input: GenerateWorkoutInput,
  used: Set<string>,
  rng: () => number
): WorkoutBlock {
  const pool = exercises.filter(
    (e) =>
      (e.modality === "mobility" || e.modality === "recovery") &&
      !used.has(e.id)
  );
  const count = input.duration_minutes <= 30 ? 2 : 3;
  const chosen: Exercise[] = [];
  const ids = shuffleWithSeed([...pool], rng);
  for (const e of ids) {
    if (chosen.length >= count) break;
    chosen.push(e);
    used.add(e.id);
  }
  if (chosen.length < count && !used.has("breathing_cooldown")) {
    const breath = exercises.find((e) => e.id === "breathing_cooldown");
    if (breath) {
      chosen.push(breath);
      used.add(breath.id);
    }
  }

  const items: WorkoutItem[] = chosen.map((e) => {
    const p = getPrescription(e, "cooldown", input.energy_level, input.primary_goal);
    return {
      exercise_id: e.id,
      exercise_name: e.name,
      sets: p.sets,
      reps: p.reps,
      time_seconds: p.time_seconds ?? 60,
      rest_seconds: p.rest_seconds,
      coaching_cues: p.coaching_cues,
      reasoning_tags: ["cooldown", "recovery", ...(e.tags.goal_tags ?? [])],
    };
  });

  return {
    block_type: "cooldown",
    format: "circuit",
    items,
    estimated_minutes: Math.min(6, 2 + items.length),
  };
}

// --- Main block: strength (2 compound lifts when goal=strength, then optional supersets) ---
function buildMainStrength(
  exercises: Exercise[],
  input: GenerateWorkoutInput,
  used: Set<string>,
  recentIds: Set<string>,
  movementCounts: Map<string, number>,
  rng: () => number,
  wantsSupersets: boolean,
  fatigueVolumeScale?: number,
  fatigueState?: FatigueState
): WorkoutBlock[] {
  const blocks: WorkoutBlock[] = [];
  const goalRules = getGoalRules(input.primary_goal);
  const compoundMin = goalRules.compoundLiftMin ?? 1;
  const mainPool = exercises.filter(
    (e) =>
      (e.modality === "strength" || e.modality === "power") &&
      !used.has(e.id) &&
      ["squat", "hinge", "push", "pull"].includes(e.movement_pattern)
  );
  const accessoryPool = exercises.filter(
    (e) =>
      (e.modality === "strength" || e.modality === "hypertrophy") &&
      !used.has(e.id)
  );

  const mainLiftCount = Math.min(compoundMin, 2, mainPool.length);
  const { exercises: mainLifts } = selectExercises(
    mainPool,
    input,
    recentIds,
    movementCounts,
    mainLiftCount,
    rng,
    false,
    fatigueState
  );
  for (const mainLift of mainLifts) {
    used.add(mainLift.id);
    movementCounts.set(mainLift.movement_pattern, (movementCounts.get(mainLift.movement_pattern) ?? 0) + 1);
    const p = getPrescription(mainLift, "main_strength", input.energy_level, input.primary_goal, false, fatigueVolumeScale);
    blocks.push({
      block_type: "main_strength",
      format: "straight_sets",
      items: [
        {
          exercise_id: mainLift.id,
          exercise_name: mainLift.name,
          sets: p.sets,
          reps: p.reps,
          rest_seconds: p.rest_seconds,
          coaching_cues: p.coaching_cues,
          reasoning_tags: ["main_lift", "strength", ...(mainLift.tags.goal_tags ?? [])],
        },
      ],
      estimated_minutes: p.sets * (2 + (p.rest_seconds || 0) / 60),
    });
  }

  const pairCount = input.duration_minutes <= 30 ? 1 : input.duration_minutes <= 45 ? 1 : 2;
  if (pairCount && wantsSupersets) {
    let available = accessoryPool.filter((e) => !used.has(e.id));
    const pairs: [Exercise, Exercise][] = [];
    const nonCompeting: [string, string][] = [
      ["push", "pull"],
      ["hinge", "rotate"],
      ["squat", "pull"],
    ];
    for (let i = 0; i < pairCount && available.length >= 2; i++) {
      const a = available[Math.floor(rng() * available.length)];
      if (!a) break;
      const competing = nonCompeting.find(([x, y]) => (x === a.movement_pattern || y === a.movement_pattern));
      const b = available.find(
        (e) =>
          e.id !== a.id &&
          competing &&
          (e.movement_pattern === competing[0] || e.movement_pattern === competing[1]) &&
          e.movement_pattern !== a.movement_pattern
      ) ?? available.find((e) => e.id !== a.id);
      if (!b) break;
      pairs.push([a, b]);
      used.add(a.id);
      used.add(b.id);
      available = available.filter((e) => e.id !== a.id && e.id !== b.id);
    }
    const items: WorkoutItem[] = pairs.flatMap(([exA, exB]) => {
      const pA = getPrescription(exA, "main_strength", input.energy_level, input.primary_goal, true, fatigueVolumeScale);
      const pB = getPrescription(exB, "main_strength", input.energy_level, input.primary_goal, true, fatigueVolumeScale);
      return [
        {
          exercise_id: exA.id,
          exercise_name: exA.name,
          sets: pA.sets,
          reps: pA.reps,
          rest_seconds: pA.rest_seconds,
          coaching_cues: pA.coaching_cues,
          reasoning_tags: ["superset", "accessory", ...(exA.tags.goal_tags ?? [])],
        },
        {
          exercise_id: exB.id,
          exercise_name: exB.name,
          sets: pB.sets,
          reps: pB.reps,
          rest_seconds: pB.rest_seconds,
          coaching_cues: pB.coaching_cues,
          reasoning_tags: ["superset", "accessory", ...(exB.tags.goal_tags ?? [])],
        },
      ];
    });
    if (items.length) {
      blocks.push({
        block_type: "main_strength",
        format: "superset",
        items,
        estimated_minutes: Math.ceil(items.length / 2) * 4,
      });
    }
  }

  return blocks;
}

// --- Main block: hypertrophy / body recomp / calisthenics (2–4 supersets) ---
function buildMainHypertrophy(
  exercises: Exercise[],
  input: GenerateWorkoutInput,
  used: Set<string>,
  recentIds: Set<string>,
  movementCounts: Map<string, number>,
  rng: () => number,
  wantsSupersets: boolean,
  fatigueVolumeScale?: number,
  fatigueState?: FatigueState
): WorkoutBlock[] {
  let pool = exercises.filter(
    (e) =>
      (e.modality === "hypertrophy" || e.modality === "strength") &&
      !used.has(e.id) &&
      ["push", "pull", "squat", "hinge", "rotate"].includes(e.movement_pattern)
  );
  if (input.primary_goal === "calisthenics") {
    const bodyweightOrCal = pool.filter(
      (e) =>
        e.equipment_required.some((eq) => eq.toLowerCase() === "bodyweight") ||
        e.tags.goal_tags?.includes("calisthenics")
    );
    if (bodyweightOrCal.length >= 2) pool = bodyweightOrCal;
  }
  const goalRules = getGoalRules(input.primary_goal);
  const maxExercises = goalRules.maxStrengthExercises ?? 8;
  const pairCount = input.duration_minutes <= 30 ? 2 : input.duration_minutes <= 60 ? 3 : 4;
  const wantCount = Math.min(pairCount * 2, maxExercises, pool.length);
  const { exercises: chosen } = selectExercises(
    pool,
    input,
    recentIds,
    movementCounts,
    wantCount,
    rng,
    false,
    fatigueState
  );

  const pairs: Exercise[][] = [];
  for (let i = 0; i < chosen.length - 1; i += 2) {
    pairs.push([chosen[i], chosen[i + 1]].filter(Boolean));
  }
  if (pairs.length === 0 && chosen.length) pairs.push([chosen[0]]);

  const items: WorkoutItem[] = pairs.flatMap((pair) =>
    pair.map((e) => {
      used.add(e.id);
      const p = getPrescription(e, "main_hypertrophy", input.energy_level, input.primary_goal, false, fatigueVolumeScale);
      return {
        exercise_id: e.id,
        exercise_name: e.name,
        sets: p.sets,
        reps: p.reps,
        rest_seconds: p.rest_seconds,
        coaching_cues: p.coaching_cues,
        reasoning_tags: ["hypertrophy", ...(e.tags.goal_tags ?? [])],
      };
    })
  );

  const format: BlockFormat = wantsSupersets && pairs.every((p) => p.length === 2) ? "superset" : "straight_sets";
  return [
    {
      block_type: "main_hypertrophy",
      format,
      items,
      estimated_minutes: Math.ceil(items.length / 2) * 5,
    },
  ];
}

// --- Endurance / conditioning: short strength superset + conditioning block ---
function buildEnduranceMain(
  exercises: Exercise[],
  input: GenerateWorkoutInput,
  used: Set<string>,
  recentIds: Set<string>,
  movementCounts: Map<string, number>,
  rng: () => number,
  fatigueVolumeScale?: number,
  fatigueState?: FatigueState
): WorkoutBlock[] {
  const strengthPool = exercises.filter(
    (e) =>
      (e.modality === "strength" || e.modality === "conditioning") &&
      !used.has(e.id) &&
      e.time_cost !== "high"
  );
  const { exercises: two } = selectExercises(strengthPool, input, recentIds, movementCounts, 2, rng, false, fatigueState);
  const blocks: WorkoutBlock[] = [];
  if (two.length >= 2) {
    two.forEach((e) => used.add(e.id));
    const supportSets = Math.max(1, Math.round(2 * (fatigueVolumeScale ?? 1)));
    const items: WorkoutItem[] = two.map((e) => {
      const p = getPrescription(e, "main_hypertrophy", input.energy_level, input.primary_goal, false, fatigueVolumeScale);
      return {
        exercise_id: e.id,
        exercise_name: e.name,
        sets: supportSets,
        reps: p.reps ?? 10,
        rest_seconds: 30,
        coaching_cues: p.coaching_cues,
        reasoning_tags: ["conditioning", "strength", ...(e.tags.goal_tags ?? [])],
      };
    });
    blocks.push({
      block_type: "conditioning",
      format: "superset",
      items,
      estimated_minutes: 8,
    });
  }

  const cardioPool = exercises.filter(
    (e) =>
      e.modality === "conditioning" &&
      !used.has(e.id)
  );
  const condMins = getConditioningDurationMinutes(input.primary_goal, input.energy_level)
    ?? input.style_prefs?.conditioning_minutes
    ?? (input.duration_minutes >= 60 ? 30 : 20);
  if (cardioPool.length && condMins > 0) {
    const c = cardioPool[Math.floor(rng() * cardioPool.length)];
    if (c) {
      used.add(c.id);
      const p = getPrescription(c, "conditioning", input.energy_level, input.primary_goal);
      blocks.push({
        block_type: "conditioning",
        format: "straight_sets",
        items: [
          {
            exercise_id: c.id,
            exercise_name: c.name,
            sets: 1,
            time_seconds: Math.min(condMins * 60, 45 * 60),
            rest_seconds: 0,
            coaching_cues: p.coaching_cues,
            reasoning_tags: ["endurance", ...(c.tags.goal_tags ?? [])],
          },
        ],
        estimated_minutes: condMins,
      });
    }
  }
  return blocks;
}

// --- Mobility / recovery: mobility circuit + light carries/core + breathing ---
function buildMobilityRecoveryMain(
  exercises: Exercise[],
  input: GenerateWorkoutInput,
  used: Set<string>,
  rng: () => number
): WorkoutBlock[] {
  const mobilityPool = exercises.filter(
    (e) =>
      (e.modality === "mobility" || e.modality === "recovery") &&
      !used.has(e.id)
  );
  const lightPool = exercises.filter(
    (e) =>
      (e.movement_pattern === "carry" || e.movement_pattern === "rotate") &&
      (e.modality === "strength" || e.modality === "mobility") &&
      !used.has(e.id)
  );
  const count = input.duration_minutes <= 30 ? 4 : 6;
  const chosen = shuffleWithSeed([...mobilityPool, ...lightPool], rng).slice(0, count);
  chosen.forEach((e) => used.add(e.id));

  const items: WorkoutItem[] = chosen.map((e) => {
    const p = getPrescription(e, "cooldown", input.energy_level, input.primary_goal);
    return {
      exercise_id: e.id,
      exercise_name: e.name,
      sets: p.sets,
      reps: p.reps,
      time_seconds: p.time_seconds ?? 45,
      rest_seconds: p.rest_seconds,
      coaching_cues: p.coaching_cues,
      reasoning_tags: ["mobility", "recovery", ...(e.tags.goal_tags ?? [])],
    };
  });

  return [
    {
      block_type: "cooldown",
      format: "circuit",
      items,
      estimated_minutes: input.duration_minutes - 10,
    },
  ];
}

// --- Session title ---
function sessionTitle(input: GenerateWorkoutInput): string {
  const goal = input.primary_goal.replace(/_/g, " ");
  const cap = goal.charAt(0).toUpperCase() + goal.slice(1);
  return `${cap} • ${input.duration_minutes} min`;
}

// --- Main entry: 8-step generation flow ---
export function generateWorkoutSession(
  input: GenerateWorkoutInput,
  exercisePool: Exercise[] = STUB_EXERCISES,
  includeDebug = false
): WorkoutSession {
  const seed = input.seed ?? 0;
  const rng = createSeededRng(seed);

  // 1. Determine goal rules (from prescriptionRules)
  const primary = input.primary_goal;
  const goalRules = getGoalRules(primary);

  // 2. Filter exercises (equipment, injuries, avoid tags, energy)
  const filtered = filterByHardConstraints(exercisePool, input);
  const used = new Set<string>();
  const recentIds = new Set(input.recent_history?.flatMap((h) => h.exercise_ids) ?? []);
  const movementCounts = new Map<string, number>();

  // Fatigue management: volume scale and fatigued muscle groups from recent history
  const fatigueState = getFatigueState(input.recent_history, {
    energy_level: input.energy_level,
  });
  const fatigueVolumeScale = fatigueState.volumeScaleFactor;

  // 3. Build warmup
  const warmup = buildWarmup(filtered, input, used, rng, false, fatigueState);
  const blocks: WorkoutBlock[] = [warmup];

  const wantsSupersets = input.style_prefs?.wants_supersets !== false;

  // 4. Build main block (goal-specific)
  if (primary === "strength" || primary === "power") {
    blocks.push(...buildMainStrength(filtered, input, used, recentIds, movementCounts, rng, wantsSupersets, fatigueVolumeScale, fatigueState));
  } else if (primary === "hypertrophy" || primary === "body_recomp" || primary === "calisthenics") {
    blocks.push(...buildMainHypertrophy(filtered, input, used, recentIds, movementCounts, rng, wantsSupersets, fatigueVolumeScale, fatigueState));
  } else if (primary === "endurance" || primary === "conditioning") {
    blocks.push(...buildEnduranceMain(filtered, input, used, recentIds, movementCounts, rng, fatigueVolumeScale, fatigueState));
  } else if (primary === "mobility" || primary === "recovery") {
    blocks.push(...buildMobilityRecoveryMain(filtered, input, used, rng));
  } else {
    // athletic_performance: strength + power style
    blocks.push(...buildMainStrength(filtered, input, used, recentIds, movementCounts, rng, wantsSupersets, fatigueVolumeScale, fatigueState));
  }

  // 5. Build accessory (handled inside buildMainStrength / buildMainHypertrophy per goal rules)

  // 6. Build conditioning (goal rules: optional vs mandatory vs primary)
  const hasConditioningBlock = blocks.some((b) => b.block_type === "conditioning");
  const conditioningStrategy = goalRules.conditioningStrategy;
  const skipConditioning =
    hasConditioningBlock ||
    conditioningStrategy === "none" ||
    (goalRules.conditioningOnlyIfHighEnergy && input.energy_level !== "high");

  if (!skipConditioning && (conditioningStrategy === "mandatory" || conditioningStrategy === "optional_short" || conditioningStrategy === "optional_moderate")) {
    const userMins = input.style_prefs?.conditioning_minutes ?? 0;
    const ruleMins = getConditioningDurationMinutes(primary, input.energy_level);
    const conditioningMins = conditioningStrategy === "mandatory"
      ? (ruleMins ?? 30)
      : (userMins > 0 ? userMins : (ruleMins ?? 0));
    if (conditioningMins > 0) {
      const cardioPool = filtered.filter((e) => e.modality === "conditioning" && !used.has(e.id));
      if (cardioPool.length) {
        const c = cardioPool[Math.floor(rng() * cardioPool.length)];
        if (c) {
          used.add(c.id);
          const p = getPrescription(c, "conditioning", input.energy_level, input.primary_goal);
          blocks.push({
            block_type: "conditioning",
            format: "straight_sets",
            items: [
              {
                exercise_id: c.id,
                exercise_name: c.name,
                sets: 1,
                time_seconds: Math.min(conditioningMins * 60, 45 * 60),
                rest_seconds: 0,
                coaching_cues: p.coaching_cues,
                reasoning_tags: ["conditioning", ...(c.tags.goal_tags ?? [])],
              },
            ],
            estimated_minutes: conditioningMins,
          });
        }
      }
    }
  }

  // 7. Build cooldown
  const cooldown = buildCooldown(filtered, input, used, rng);
  blocks.push(cooldown);

  // 8. Enforce shared rules (movement pattern cap and balance already applied in selectExercises / scoring)

  const estimated_duration_minutes = blocks.reduce((sum, b) => sum + (b.estimated_minutes ?? 5), 0);

  const debug = includeDebug
    ? {
        scoring_breakdown: [] as ScoringDebug[],
        seed_used: seed,
      }
    : undefined;

  return {
    title: sessionTitle(input),
    estimated_duration_minutes,
    blocks,
    debug,
  };
}

// --- Regenerate ---
export function regenerateWorkoutSession(
  input: GenerateWorkoutInput,
  previousSession: WorkoutSession,
  mode: RegenerateMode,
  exercisePool: Exercise[] = STUB_EXERCISES,
  includeDebug = false
): WorkoutSession {
  const seed = (input.seed ?? 0) + 1;
  const newInput: GenerateWorkoutInput = { ...input, seed };

  if (mode === "keep_structure_swap_exercises") {
    return regenerateWithSubstitution(
      input,
      previousSession,
      exercisePool,
      includeDebug
    );
  }

  return generateWorkoutSession(newInput, exercisePool, includeDebug);
}

/**
 * Keep block structure and prescriptions; swap each exercise to a ranked substitute
 * (same pattern/muscles, progressions/regressions) from the filtered pool.
 */
function regenerateWithSubstitution(
  input: GenerateWorkoutInput,
  previousSession: WorkoutSession,
  exercisePool: Exercise[],
  includeDebug: boolean
): WorkoutSession {
  const filtered = filterByHardConstraints(exercisePool, input);
  const poolById = new Map(exercisePool.map((e) => [e.id, e]));
  const usedInNewSession = new Set<string>();

  const blocks: WorkoutBlock[] = previousSession.blocks.map((block) => {
    const items: WorkoutItem[] = block.items.map((item) => {
      const original = poolById.get(item.exercise_id);
      const candidatePool = filtered.filter((e) => !usedInNewSession.has(e.id));
      const substitute = original
        ? getBestSubstitute(original, candidatePool, {
            excludeIds: usedInNewSession,
            maxResults: 1,
          })
        : undefined;

      const chosen = substitute?.exercise ?? original;
      const exerciseId = chosen?.id ?? item.exercise_id;
      const exerciseName = chosen?.name ?? item.exercise_name;
      if (chosen) usedInNewSession.add(chosen.id);

      return {
        ...item,
        exercise_id: exerciseId,
        exercise_name: exerciseName,
      };
    });

    return { ...block, items };
  });

  const estimated_duration_minutes = blocks.reduce(
    (sum, b) => sum + (b.estimated_minutes ?? 5),
    0
  );

  return {
    title: previousSession.title,
    estimated_duration_minutes,
    blocks,
    debug: includeDebug ? { seed_used: input.seed } : undefined,
  };
}
