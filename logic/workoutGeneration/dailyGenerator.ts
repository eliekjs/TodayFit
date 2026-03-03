/**
 * Daily "Build My Workout" generation engine.
 * Deterministic workout generation from user inputs. Isolated from Sports Prep planner.
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
} from "./types";
import { STUB_EXERCISES } from "./exerciseStub";

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

  return exercises.filter((e) => {
    // Equipment: every required piece must be available
    const required = e.equipment_required.map((eq) => eq.toLowerCase().replace(/\s/g, "_"));
    if (required.some((eq) => !equipmentSet.has(eq))) return false;

    // Contraindications / injuries
    const contra = e.tags.contraindications ?? [];
    if (contra.some((c) => injuriesSet.has(c))) return false;

    // Joint stress: if user avoids certain patterns, exclude exercises that stress those
    const jointStress = e.tags.joint_stress ?? [];
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
      // Exclude heavy olympic / max plyo style if we had such tags; stub set is mostly fine
    }

    // Time: for 20–30 min sessions, exclude very high time_cost if we want to keep it simple
    if (input.duration_minutes <= 30 && e.time_cost === "high" && e.modality === "strength") {
      // Allow but we'll penalize in scoring instead of hard filter so we don't over-constrain
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
  includeDebug: boolean
): { score: number; debug?: Partial<ScoringDebug> } {
  let total = 0;
  const debug: Partial<ScoringDebug> = includeDebug ? { exercise_id: exercise.id } : undefined;

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

  // Balance bonus: encourage push/pull and hinge/squat balance (applied when building session, not per-exercise; we could add a small bonus for "underrepresented" pattern here)
  let balanceBonus = 0;
  const underRep = [...movementPatternCounts.entries()].filter(([, c]) => c === 0);
  if (underRep.some(([p]) => p === "push" || p === "pull") && (exercise.movement_pattern === "push" || exercise.movement_pattern === "pull")) balanceBonus += 0.5;
  if (underRep.some(([p]) => p === "hinge" || p === "squat") && (exercise.movement_pattern === "hinge" || exercise.movement_pattern === "squat")) balanceBonus += 0.5;
  total += balanceBonus;
  if (debug && balanceBonus) debug.balance_bonus = balanceBonus;

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

// --- Rep/set prescription heuristics ---
function getPrescription(
  exercise: Exercise,
  blockType: BlockType,
  energyLevel: "low" | "medium" | "high"
): { sets: number; reps?: number; time_seconds?: number; rest_seconds: number; coaching_cues: string } {
  const lowRest = 45;
  const midRest = 90;
  const longRest = 120;

  if (blockType === "warmup" || blockType === "cooldown" || exercise.modality === "mobility" || exercise.modality === "recovery") {
    return {
      sets: 1,
      reps: 8,
      time_seconds: 45,
      rest_seconds: 15,
      coaching_cues: "Controlled, full range of motion. Breathe steadily.",
    };
  }

  if (exercise.modality === "conditioning") {
    const minutes = energyLevel === "high" ? 8 : energyLevel === "low" ? 5 : 6;
    return {
      sets: 1,
      time_seconds: minutes * 60,
      rest_seconds: 0,
      coaching_cues: "Steady effort. Keep heart rate in target zone.",
    };
  }

  if (blockType === "main_strength" || exercise.tags.goal_tags?.includes("strength")) {
    const sets = energyLevel === "high" ? 5 : energyLevel === "low" ? 3 : 4;
    return {
      sets,
      reps: 5,
      rest_seconds: energyLevel === "high" ? 150 : midRest,
      coaching_cues: "Heavy, controlled. Full lockout.",
    };
  }

  if (blockType === "main_hypertrophy" || exercise.tags.goal_tags?.includes("hypertrophy")) {
    const sets = energyLevel === "high" ? 4 : 3;
    return {
      sets,
      reps: 10,
      rest_seconds: 60,
      coaching_cues: "Moderate load. Squeeze at peak contraction.",
    };
  }

  // Default
  const sets = energyLevel === "high" ? 4 : energyLevel === "low" ? 2 : 3;
  return {
    sets,
    reps: 8,
    rest_seconds: midRest,
    coaching_cues: "Controlled tempo.",
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
  includeDebug: boolean
): { exercises: Exercise[]; scoringDebug: ScoringDebug[] } {
  const scored = pool.map((e) => ({
    exercise: e,
    ...scoreExercise(e, input, recentIds, movementCounts, includeDebug),
  }));
  scored.sort((a, b) => b.score - a.score);
  const topOverall = scored.slice(0, Math.min(60, scored.length));
  const chosen: Exercise[] = [];
  const debugList: ScoringDebug[] = [];

  for (let i = 0; chosen.length < count && i < topOverall.length * 2; i++) {
    const idx = Math.floor(rng() * Math.min(15, topOverall.length));
    const item = topOverall[idx];
    if (!item || chosen.some((c) => c.id === item.exercise.id)) continue;
    chosen.push(item.exercise);
    if (item.debug && includeDebug) debugList.push(item.debug as ScoringDebug);
  }

  // If we didn't fill, add from top in order
  for (const { exercise, debug } of topOverall) {
    if (chosen.length >= count) break;
    if (chosen.some((c) => c.id === exercise.id)) continue;
    chosen.push(exercise);
    if (debug && includeDebug) debugList.push(debug as ScoringDebug);
  }

  return { exercises: chosen.slice(0, count), scoringDebug: debugList };
}

// --- Build warmup block (5–8 min): 2–4 mobility/activation items ---
function buildWarmup(
  exercises: Exercise[],
  input: GenerateWorkoutInput,
  used: Set<string>,
  rng: () => number,
  includeDebug: boolean
): WorkoutBlock {
  const pool = exercises.filter(
    (e) =>
      (e.modality === "mobility" || e.modality === "recovery") &&
      !used.has(e.id) &&
      e.id !== "breathing_cooldown"
  );
  const count = input.duration_minutes <= 30 ? 2 : input.duration_minutes <= 45 ? 3 : 4;
  const movementCounts = new Map<string, number>();
  const recentIds = new Set(input.recent_history?.flatMap((h) => h.exercise_ids) ?? []);
  const { exercises: chosen } = selectExercises(
    pool.length ? pool : exercises.filter((e) => e.modality === "mobility" || e.modality === "recovery"),
    input,
    recentIds,
    movementCounts,
    Math.min(count, pool.length || 4),
    rng,
    false
  );

  const items: WorkoutItem[] = chosen.map((e) => {
    used.add(e.id);
    const p = getPrescription(e, "warmup", input.energy_level);
    return {
      exercise_id: e.id,
      exercise_name: e.name,
      sets: p.sets,
      reps: p.reps,
      time_seconds: p.time_seconds,
      rest_seconds: p.rest_seconds,
      coaching_cues: p.coaching_cues,
      reasoning_tags: ["warmup", "mobility", ...(e.tags.goal_tags ?? [])],
    };
  });

  return {
    block_type: "warmup",
    format: "circuit",
    items,
    estimated_minutes: Math.min(8, 3 + items.length * 1.5),
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
    const p = getPrescription(e, "cooldown", input.energy_level);
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

// --- Main block: strength (1 main lift + 1–2 supersets) ---
function buildMainStrength(
  exercises: Exercise[],
  input: GenerateWorkoutInput,
  used: Set<string>,
  recentIds: Set<string>,
  movementCounts: Map<string, number>,
  rng: () => number,
  wantsSupersets: boolean
): WorkoutBlock[] {
  const blocks: WorkoutBlock[] = [];
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

  const { exercises: mainLifts } = selectExercises(
    mainPool,
    input,
    recentIds,
    movementCounts,
    1,
    rng,
    false
  );
  const mainLift = mainLifts[0];
  if (mainLift) {
    used.add(mainLift.id);
    movementCounts.set(mainLift.movement_pattern, (movementCounts.get(mainLift.movement_pattern) ?? 0) + 1);
    const p = getPrescription(mainLift, "main_strength", input.energy_level);
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
      const pA = getPrescription(exA, "main_strength", input.energy_level);
      const pB = getPrescription(exB, "main_strength", input.energy_level);
      return [
        {
          exercise_id: exA.id,
          exercise_name: exA.name,
          sets: pA.sets,
          reps: pA.reps,
          rest_seconds: 45,
          coaching_cues: pA.coaching_cues,
          reasoning_tags: ["superset", "accessory", ...(exA.tags.goal_tags ?? [])],
        },
        {
          exercise_id: exB.id,
          exercise_name: exB.name,
          sets: pB.sets,
          reps: pB.reps,
          rest_seconds: 45,
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

// --- Main block: hypertrophy / body recomp (2–3 supersets) ---
function buildMainHypertrophy(
  exercises: Exercise[],
  input: GenerateWorkoutInput,
  used: Set<string>,
  recentIds: Set<string>,
  movementCounts: Map<string, number>,
  rng: () => number,
  wantsSupersets: boolean
): WorkoutBlock[] {
  const pool = exercises.filter(
    (e) =>
      (e.modality === "hypertrophy" || e.modality === "strength") &&
      !used.has(e.id) &&
      ["push", "pull", "squat", "hinge", "rotate"].includes(e.movement_pattern)
  );
  const pairCount = input.duration_minutes <= 30 ? 2 : input.duration_minutes <= 60 ? 3 : 4;
  const { exercises: chosen } = selectExercises(
    pool,
    input,
    recentIds,
    movementCounts,
    Math.min(pairCount * 2, pool.length),
    rng,
    false
  );

  const pairs: Exercise[][] = [];
  for (let i = 0; i < chosen.length - 1; i += 2) {
    pairs.push([chosen[i], chosen[i + 1]].filter(Boolean));
  }
  if (pairs.length === 0 && chosen.length) pairs.push([chosen[0]]);

  const items: WorkoutItem[] = pairs.flatMap((pair) =>
    pair.map((e) => {
      used.add(e.id);
      const p = getPrescription(e, "main_hypertrophy", input.energy_level);
      return {
        exercise_id: e.id,
        exercise_name: e.name,
        sets: p.sets,
        reps: p.reps,
        rest_seconds: 60,
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
  rng: () => number
): WorkoutBlock[] {
  const strengthPool = exercises.filter(
    (e) =>
      (e.modality === "strength" || e.modality === "conditioning") &&
      !used.has(e.id) &&
      e.time_cost !== "high"
  );
  const { exercises: two } = selectExercises(strengthPool, input, recentIds, movementCounts, 2, rng, false);
  const blocks: WorkoutBlock[] = [];
  if (two.length >= 2) {
    two.forEach((e) => used.add(e.id));
    const items: WorkoutItem[] = two.map((e) => {
      const p = getPrescription(e, "conditioning", input.energy_level);
      return {
        exercise_id: e.id,
        exercise_name: e.name,
        sets: 2,
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
  const condMins = input.style_prefs?.conditioning_minutes ?? (input.duration_minutes >= 60 ? 12 : 8);
  if (cardioPool.length && condMins > 0) {
    const c = cardioPool[Math.floor(rng() * cardioPool.length)];
    if (c) {
      used.add(c.id);
      const p = getPrescription(c, "conditioning", input.energy_level);
      blocks.push({
        block_type: "conditioning",
        format: "straight_sets",
        items: [
          {
            exercise_id: c.id,
            exercise_name: c.name,
            sets: 1,
            time_seconds: Math.min(condMins * 60, 15 * 60),
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
    const p = getPrescription(e, "cooldown", input.energy_level);
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

// --- Main entry ---
export function generateWorkoutSession(
  input: GenerateWorkoutInput,
  exercisePool: Exercise[] = STUB_EXERCISES,
  includeDebug = false
): WorkoutSession {
  const seed = input.seed ?? 0;
  const rng = createSeededRng(seed);

  const filtered = filterByHardConstraints(exercisePool, input);
  const used = new Set<string>();
  const recentIds = new Set(input.recent_history?.flatMap((h) => h.exercise_ids) ?? []);
  const movementCounts = new Map<string, number>();

  const warmup = buildWarmup(filtered, input, used, rng, false);
  const blocks: WorkoutBlock[] = [warmup];

  const wantsSupersets = input.style_prefs?.wants_supersets !== false;
  const primary = input.primary_goal;

  if (primary === "strength" || primary === "power") {
    blocks.push(...buildMainStrength(filtered, input, used, recentIds, movementCounts, rng, wantsSupersets));
  } else if (primary === "hypertrophy" || primary === "body_recomp") {
    blocks.push(...buildMainHypertrophy(filtered, input, used, recentIds, movementCounts, rng, wantsSupersets));
  } else if (primary === "endurance" || primary === "conditioning") {
    blocks.push(...buildEnduranceMain(filtered, input, used, recentIds, movementCounts, rng));
  } else if (primary === "mobility" || primary === "recovery") {
    blocks.push(...buildMobilityRecoveryMain(filtered, input, used, rng));
  } else {
    // athletic_performance or fallback: strength-style
    blocks.push(...buildMainStrength(filtered, input, used, recentIds, movementCounts, rng, wantsSupersets));
  }

  // Optional conditioning block (if not already added and user wants it)
  const conditioningMins = input.style_prefs?.conditioning_minutes ?? 0;
  if (
    conditioningMins > 0 &&
    input.energy_level !== "low" &&
    primary !== "endurance" &&
    primary !== "conditioning" &&
    !blocks.some((b) => b.block_type === "conditioning")
  ) {
    const cardioPool = filtered.filter((e) => e.modality === "conditioning" && !used.has(e.id));
    if (cardioPool.length) {
      const c = cardioPool[Math.floor(rng() * cardioPool.length)];
      if (c) {
        used.add(c.id);
        const p = getPrescription(c, "conditioning", input.energy_level);
        blocks.push({
          block_type: "conditioning",
          format: "straight_sets",
          items: [
            {
              exercise_id: c.id,
              exercise_name: c.name,
              sets: 1,
              time_seconds: Math.min(conditioningMins * 60, 15 * 60),
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

  const cooldown = buildCooldown(filtered, input, used, rng);
  blocks.push(cooldown);

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
    // Reuse block structure; regenerate to get new exercise picks (same seed would give same; we changed seed)
    return generateWorkoutSession(newInput, exercisePool, includeDebug);
  }

  // new_structure
  return generateWorkoutSession(newInput, exercisePool, includeDebug);
}
