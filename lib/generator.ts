import { EXERCISES } from "../data/exercises";
import {
  getAvoidTagSlugsFromUpcoming,
  exerciseHasAnyAvoidTag,
} from "./filterTagRules";
import { deriveBodyPartFocus, deriveBodyPartFocusFromSubFocus, deriveSubFocus } from "./preferencesConstants";
import type {
  BlockFormat,
  BlockType,
  ExerciseDefinition,
  GeneratedWorkout,
  ManualPreferences,
  WorkoutBlock,
  WorkoutItem,
} from "./types";
import type { GymProfile } from "../data/gymProfiles";
import { isDbConfigured } from "../lib/db";
import { listExercises } from "../lib/db/exerciseRepository";
import {
  BODY_RECOMP_CARDIO_DURATION_MAX,
  BODY_RECOMP_CARDIO_DURATION_MIN,
  BODY_RECOMP_CUES,
  BODY_RECOMP_REP_RANGE,
  isWarmupEligibleEquipment,
  WARMUP_CARDIO_POSITION,
} from "./workoutRules";

function pickCountByDuration(durationMinutes: number | null) {
  if (!durationMinutes) return { warmup: 2, mainSupersetPairs: 2, accessory: 2, cooldown: 2 };
  if (durationMinutes <= 25) return { warmup: 2, mainSupersetPairs: 1, accessory: 1, cooldown: 1 };
  if (durationMinutes <= 40) return { warmup: 3, mainSupersetPairs: 2, accessory: 2, cooldown: 2 };
  if (durationMinutes <= 60) return { warmup: 3, mainSupersetPairs: 3, accessory: 2, cooldown: 2 };
  return { warmup: 3, mainSupersetPairs: 4, accessory: 3, cooldown: 2 };
}

type StructuredPrescription = {
  sets: number;
  reps?: number;
  time_seconds?: number;
  rest_seconds: number;
  coaching_cues: string;
};

function prescriptionForExercise(
  exercise: ExerciseDefinition,
  energy: ManualPreferences["energyLevel"],
  primaryFocus: string[]
): StructuredPrescription {
  const baseSets = energy === "high" ? 4 : energy === "low" ? 2 : 3;
  const isBodyRecomp = primaryFocus.includes("Body Recomposition");

  if (exercise.modalities.includes("conditioning")) {
    if (isBodyRecomp) {
      const timeSeconds = Math.round((BODY_RECOMP_CARDIO_DURATION_MIN + BODY_RECOMP_CARDIO_DURATION_MAX) / 2) * 60;
      return { sets: 1, time_seconds: timeSeconds, rest_seconds: 0, coaching_cues: BODY_RECOMP_CUES.cardio };
    }
    const minutes = energy === "high" ? 12 : energy === "low" ? 6 : 8;
    return { sets: 1, time_seconds: minutes * 60, rest_seconds: 0, coaching_cues: "Steady effort. Keep heart rate in target zone." };
  }

  if (exercise.modalities.includes("power")) {
    return { sets: baseSets, reps: 4, rest_seconds: 90, coaching_cues: "Explosive, controlled." };
  }

  if (exercise.modalities.includes("mobility")) {
    return { sets: baseSets, reps: 9, rest_seconds: 15, coaching_cues: "Controlled, full range of motion. Breathe steadily." };
  }

  if (isBodyRecomp) {
    return {
      sets: baseSets,
      reps: Math.round((BODY_RECOMP_REP_RANGE.min + BODY_RECOMP_REP_RANGE.max) / 2),
      rest_seconds: 60,
      coaching_cues: BODY_RECOMP_CUES.strength,
    };
  }
  return { sets: baseSets, reps: 8, rest_seconds: 60, coaching_cues: "Moderate load. Controlled tempo." };
}

function toWorkoutItem(e: ExerciseDefinition, p: StructuredPrescription, tags: string[]): WorkoutItem {
  return {
    exercise_id: e.id,
    exercise_name: e.name,
    sets: p.sets,
    reps: p.reps,
    time_seconds: p.time_seconds,
    rest_seconds: p.rest_seconds,
    coaching_cues: p.coaching_cues,
    reasoning_tags: [],
    tags,
  };
}

function createRngFromString(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return () => {
    h = (h * 1664525 + 1013904223) >>> 0;
    return h / 0xffffffff;
  };
}

function pickRandom<T>(items: T[], rng: () => number): T | null {
  if (!items.length) return null;
  const index = Math.floor(rng() * items.length);
  return items[index] ?? null;
}

function filterByGymProfile(
  exercises: ExerciseDefinition[],
  profile: GymProfile | undefined
): ExerciseDefinition[] {
  if (!profile) return exercises;
  const allowed = new Set(profile.equipment);
  return exercises.filter((e) => e.equipment.some((eq) => allowed.has(eq)));
}

function filterByInjuries(
  exercises: ExerciseDefinition[],
  injuries: string[]
): ExerciseDefinition[] {
  if (!injuries.length) return exercises;
  const block = new Set(
    injuries.map((injury) => injury.toLowerCase().replace(" ", "_"))
  );
  return exercises.filter((e) => {
    if (!e.contraindications?.length) return true;
    return !e.contraindications.some((c) => block.has(c));
  });
}

function filterByBodyPartFocus(
  exercises: ExerciseDefinition[],
  bodyPartFocus: string[]
): ExerciseDefinition[] {
  if (!bodyPartFocus.length) return exercises;
  const hasUpper = bodyPartFocus.includes("Upper body");
  const hasLower = bodyPartFocus.includes("Lower body");
  const hasPush = bodyPartFocus.includes("Push");
  const hasPull = bodyPartFocus.includes("Pull");
  const hasQuad = bodyPartFocus.includes("Quad");
  const hasPosterior = bodyPartFocus.includes("Posterior");
  const hasFull = bodyPartFocus.includes("Full body");
  const hasCoreOnly = bodyPartFocus.includes("Core") && !hasUpper && !hasLower;

  if (hasFull) return exercises;

  return exercises.filter((e) => {
    // Upper: when modifier (Push/Pull) is set, focus entirely on that; otherwise push/pull/core
    if (hasUpper) {
      if (hasPush && !hasPull) return e.muscles.includes("push");
      if (hasPull && !hasPush) return e.muscles.includes("pull");
      return e.muscles.some((m) => m === "push" || m === "pull" || m === "core");
    }
    // Lower: when modifier (Quad/Posterior) is set, filter by tags; otherwise all legs
    if (hasLower) {
      if (hasQuad && !hasPosterior)
        return e.muscles.includes("legs") && e.tags.some((t) => t === "quad-focused");
      if (hasPosterior && !hasQuad)
        return e.muscles.includes("legs") && e.tags.some((t) => t === "posterior chain" || t === "glutes" || t === "hamstrings");
      return e.muscles.includes("legs");
    }
    if (hasCoreOnly) return e.muscles.includes("core");
    return false;
  });
}

/** Exclude exercises that add strain before/after upcoming events (e.g. Long Run → avoid heavy leg tags). */
function filterByUpcoming(
  exercises: ExerciseDefinition[],
  upcoming: string[]
): ExerciseDefinition[] {
  const avoidTags = getAvoidTagSlugsFromUpcoming(upcoming);
  if (!avoidTags.length) return exercises;
  return exercises.filter((e) => !exerciseHasAnyAvoidTag(e.tags, avoidTags));
}

function focusToModalities(focus: string): ExerciseDefinition["modalities"] {
  const id = focus.toLowerCase();
  if (id.includes("strength") || id.includes("power")) return ["strength", "power"];
  if (id.includes("hypertrophy") || id.includes("muscle")) return ["hypertrophy"];
  if (id.includes("conditioning") || id.includes("endurance")) {
    return ["conditioning"];
  }
  if (id.includes("mobility") || id.includes("joint")) return ["mobility"];
  return ["strength", "hypertrophy"];
}

export function generateWorkout(
  preferences: ManualPreferences,
  gymProfile?: GymProfile,
  seedExtra?: string | number,
  exercisesInput?: ExerciseDefinition[],
  preferredExerciseSlugs?: string[]
): GeneratedWorkout {
  const subFocus = deriveSubFocus(
    preferences.primaryFocus,
    preferences.subFocusByGoal
  );
  const bodyPartFocus =
    deriveBodyPartFocus(preferences.targetBody, preferences.targetModifier).length > 0
      ? deriveBodyPartFocus(preferences.targetBody, preferences.targetModifier)
      : deriveBodyPartFocusFromSubFocus(subFocus);
  const injuryFilter =
    preferences.injuries.includes("No restrictions") || preferences.injuries.length === 0
      ? []
      : preferences.injuries.filter((i) => i !== "No restrictions");

  const seed = JSON.stringify({
    focus: preferences.primaryFocus,
    bodyPartFocus,
    duration: preferences.durationMinutes,
    energy: preferences.energyLevel,
    injuries: injuryFilter,
    upcoming: preferences.upcoming,
    subFocus,
    profile: gymProfile?.id,
    ...(seedExtra != null && { seedExtra }),
  });
  const rng = createRngFromString(seed);

  const focusModalities = preferences.primaryFocus.flatMap((f) =>
    focusToModalities(f)
  );

  const counts = pickCountByDuration(preferences.durationMinutes);

  const exercises = exercisesInput ?? EXERCISES;
  const eligible = filterByUpcoming(
    filterByBodyPartFocus(
      filterByInjuries(
        filterByGymProfile(exercises, gymProfile),
        injuryFilter
      ),
      bodyPartFocus
    ),
    preferences.upcoming
  );

  // Warm-up: bodyweight or bands only — activation, mobility, getting the body moving (no weights)
  const warmupPool = eligible.filter(
    (e) =>
      isWarmupEligibleEquipment(e.equipment) &&
      (e.modalities.includes("mobility") || e.modalities.includes("conditioning"))
  );
  const mainPool = eligible.filter((e) =>
    e.modalities.some((m) => focusModalities.includes(m))
  );
  const accessoryPool = eligible.filter((e) =>
    e.tags.includes("core stability")
  );
  const cooldownPool = eligible.filter((e) => e.modalities.includes("mobility"));

  const prefer = preferredExerciseSlugs?.length
    ? new Set(preferredExerciseSlugs)
    : null;
  const preferMatch = (e: ExerciseDefinition) =>
    prefer !== null && (prefer.has(e.id) || prefer.has(e.name));

  const buildBlock = (
    blockType: BlockType,
    format: BlockFormat,
    title: string,
    pool: ExerciseDefinition[],
    count: number,
    used: Set<string>,
    reasoning: string
  ): WorkoutBlock => {
    const items: WorkoutItem[] = [];
    const poolToUse = pool.length ? pool : eligible;

    while (items.length < count) {
      const available = poolToUse.filter((e) => !used.has(e.id));
      const preferred = prefer ? available.filter(preferMatch) : [];
      const poolToPick = preferred.length ? preferred : available;
      const picked = pickRandom(poolToPick, rng);
      if (!picked) break;
      used.add(picked.id);
      const p = prescriptionForExercise(picked, preferences.energyLevel, preferences.primaryFocus);
      items.push(toWorkoutItem(picked, p, picked.tags));
    }

    if (WARMUP_CARDIO_POSITION === "last" && blockType === "warmup" && items.length > 1) {
      const getDef = (id: string) => poolToUse.find((e) => e.id === id) ?? eligible.find((e) => e.id === id);
      const isConditioning = (id: string) => getDef(id)?.modalities.includes("conditioning") ?? false;
      items.sort((a, b) => (isConditioning(a.exercise_id) ? 1 : 0) - (isConditioning(b.exercise_id) ? 1 : 0));
    }

    return { block_type: blockType, format, title, reasoning, items };
  };

  const buildMainSupersetBlock = (
    blockType: BlockType,
    title: string,
    pool: ExerciseDefinition[],
    pairCount: number,
    used: Set<string>,
    reasoning: string
  ): WorkoutBlock => {
    const poolToUse = pool.length ? pool : eligible;
    const pairs: [WorkoutItem, WorkoutItem][] = [];

    for (let p = 0; p < pairCount; p += 1) {
      const available = poolToUse.filter((e) => !used.has(e.id));
      if (available.length < 2) break;
      const preferred = prefer ? available.filter(preferMatch) : [];
      const poolToPick = preferred.length ? preferred : available;
      const first = pickRandom(poolToPick, rng);
      if (!first) break;
      used.add(first.id);
      const availableSecond = poolToUse.filter((e) => !used.has(e.id));
      const preferredSecond = prefer ? availableSecond.filter(preferMatch) : [];
      const poolToPickSecond = preferredSecond.length ? preferredSecond : availableSecond;
      const second = pickRandom(poolToPickSecond, rng);
      if (!second) break;
      used.add(second.id);
      const p1 = prescriptionForExercise(first, preferences.energyLevel, preferences.primaryFocus);
      const p2 = prescriptionForExercise(second, preferences.energyLevel, preferences.primaryFocus);
      pairs.push([toWorkoutItem(first, p1, first.tags), toWorkoutItem(second, p2, second.tags)]);
    }

    return {
      block_type: blockType,
      format: "superset",
      title,
      reasoning,
      items: pairs.flat(),
      supersetPairs: pairs,
    };
  };

  const usedExerciseIds = new Set<string>();
  const warmupBlock = buildBlock(
    "warmup",
    "circuit",
    "Warm-up",
    warmupPool,
    counts.warmup,
    usedExerciseIds,
    "Prepares your joints and elevates heart rate before the main work."
  );
  const isHypertrophy = preferences.primaryFocus.some(
    (f) => f.toLowerCase().includes("hypertrophy") || f.toLowerCase().includes("muscle") || f.toLowerCase().includes("recomposition")
  );
  const mainBlockType: BlockType = isHypertrophy ? "main_hypertrophy" : "main_strength";
  const mainBlock = buildMainSupersetBlock(
    mainBlockType,
    "Main Sets",
    mainPool,
    counts.mainSupersetPairs,
    usedExerciseIds,
    "Compound and focus-aligned movements in supersets to maximize time under tension."
  );
  const accessoryBlock = buildBlock(
    "main_hypertrophy",
    "circuit",
    "Accessory",
    accessoryPool,
    counts.accessory,
    usedExerciseIds,
    "Targets supporting muscles and balance for your goals."
  );

  const isBodyRecomp = preferences.primaryFocus.includes("Body Recomposition");
  // When body recomp, allow cardio even if target is Upper/Lower (e.g. running); use gym+injury+upcoming for conditioning pool
  const conditioningPool = isBodyRecomp
    ? filterByUpcoming(
        filterByInjuries(
          filterByGymProfile(exercises, gymProfile),
          injuryFilter
        ).filter((e) => e.modalities.includes("conditioning")),
        preferences.upcoming
      )
    : eligible.filter((e) => e.modalities.includes("conditioning"));
  const cardioBlock: WorkoutBlock | null =
    isBodyRecomp && conditioningPool.length > 0
      ? buildBlock(
          "conditioning",
          "straight_sets",
          "Cardio",
          conditioningPool,
          1,
          usedExerciseIds,
          "20–40 min lower-intensity cardio to support body recomposition."
        )
      : null;

  const cooldownBlock = buildBlock(
    "cooldown",
    "circuit",
    "Cooldown",
    cooldownPool,
    counts.cooldown,
    usedExerciseIds,
    "Mobility and breathing to support recovery."
  );

  const notes: string[] = [];
  if (bodyPartFocus.length) notes.push(`Body focus: ${bodyPartFocus.join(", ")}`);
  if (injuryFilter.length) notes.push(`Injury-aware: avoiding ${injuryFilter.join(", ")}`);
  if (preferences.upcoming.length) notes.push(`Upcoming: ${preferences.upcoming.join(", ")}`);
  if (subFocus.length) notes.push(`Sub-focus: ${subFocus.join(", ")}`);
  if (gymProfile) notes.push(`Using only equipment in ${gymProfile.name}`);

  const blocks: WorkoutBlock[] = cardioBlock
    ? [warmupBlock, mainBlock, accessoryBlock, cardioBlock, cooldownBlock]
    : [warmupBlock, mainBlock, accessoryBlock, cooldownBlock];

  return {
    id: `w_${Date.now()}`,
    focus: preferences.primaryFocus,
    durationMinutes: preferences.durationMinutes,
    energyLevel: preferences.energyLevel,
    notes: notes.length ? notes.join(" • ") : undefined,
    blocks,
  };
}

/** Map UI body part focus to DB primary_muscles values. */
function bodyPartFocusToMuscles(bodyPartFocus: string[]): string[] {
  const out: string[] = [];
  for (const opt of bodyPartFocus) {
    if (opt === "Upper body") {
      out.push("push", "pull", "core");
    } else if (opt === "Lower body") {
      out.push("legs");
    } else if (opt === "Full body") {
      return []; // no filter
    } else if (opt === "Core") {
      out.push("core");
    } else if (opt === "Push") {
      out.push("push");
    } else if (opt === "Pull") {
      out.push("pull");
    }
  }
  return [...new Set(out)];
}

/**
 * Async version: loads exercises from Supabase when configured, then generates.
 * Use this from UI so exercises are loaded from DB when available.
 * When preferredExerciseSlugsOrNames is provided, the generator prefers those exercises (match by id or name) when picking.
 */
export async function generateWorkoutAsync(
  preferences: ManualPreferences,
  gymProfile?: GymProfile,
  seedExtra?: string | number,
  preferredExerciseSlugsOrNames?: string[]
): Promise<GeneratedWorkout> {
  let exercises: ExerciseDefinition[] | undefined;
  if (isDbConfigured()) {
    try {
      const injuryFilter =
        preferences.injuries.includes("No restrictions") || preferences.injuries.length === 0
          ? []
          : preferences.injuries.filter((i) => i !== "No restrictions");
      const injurySlugs = injuryFilter.map((i) => i.toLowerCase().replace(/ /g, "_"));
      const bodyPartFocus = deriveBodyPartFocus(
        preferences.targetBody,
        preferences.targetModifier
      );
      const primaryMuscles = bodyPartFocusToMuscles(bodyPartFocus);
      exercises = await listExercises({
        equipment: gymProfile?.equipment,
        injuries: injurySlugs,
        primaryMuscles: primaryMuscles.length ? primaryMuscles : undefined,
      });
    } catch {
      exercises = undefined;
    }
  }
  return generateWorkout(preferences, gymProfile, seedExtra, exercises, preferredExerciseSlugsOrNames);
}
