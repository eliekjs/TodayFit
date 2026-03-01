import { EXERCISES } from "../data/exercises";
import { deriveBodyPartFocus, deriveSubFocus } from "./preferencesConstants";
import type {
  ExerciseDefinition,
  GeneratedExercise,
  GeneratedWorkout,
  ManualPreferences,
} from "./types";
import type { GymProfile } from "../data/gymProfiles";
import { isDbConfigured } from "../lib/db";
import { listExercises } from "../lib/db/exerciseRepository";

function pickCountByDuration(durationMinutes: number | null) {
  if (!durationMinutes) return { warmup: 2, mainSupersetPairs: 2, accessory: 2, cooldown: 2 };
  if (durationMinutes <= 25) return { warmup: 2, mainSupersetPairs: 1, accessory: 1, cooldown: 1 };
  if (durationMinutes <= 40) return { warmup: 3, mainSupersetPairs: 2, accessory: 2, cooldown: 2 };
  if (durationMinutes <= 60) return { warmup: 3, mainSupersetPairs: 3, accessory: 2, cooldown: 2 };
  return { warmup: 3, mainSupersetPairs: 4, accessory: 3, cooldown: 2 };
}

function prescriptionForExercise(
  exercise: ExerciseDefinition,
  energy: ManualPreferences["energyLevel"]
): string {
  const baseSets = energy === "high" ? 4 : energy === "low" ? 2 : 3;

  if (exercise.modalities.includes("conditioning")) {
    const minutes = energy === "high" ? 12 : energy === "low" ? 6 : 8;
    return `${minutes} min`;
  }

  if (exercise.modalities.includes("power")) {
    return `${baseSets} x 3–5 reps`;
  }

  if (exercise.modalities.includes("mobility")) {
    return `${baseSets} x 8–10 slow reps`;
  }

  return `${baseSets} x 6–10 reps`;
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
  return exercises.filter((e) =>
    bodyPartFocus.some((opt) => {
      if (opt === "Upper body")
        return e.muscles.some((m) => m === "push" || m === "pull" || m === "core");
      if (opt === "Lower body") return e.muscles.includes("legs");
      if (opt === "Full body") return true;
      if (opt === "Push") return e.muscles.includes("push");
      if (opt === "Pull") return e.muscles.includes("pull");
      return false;
    })
  );
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
  exercisesInput?: ExerciseDefinition[]
): GeneratedWorkout {
  const bodyPartFocus = deriveBodyPartFocus(
    preferences.targetBody,
    preferences.targetModifier
  );
  const injuryFilter =
    preferences.injuries.includes("No restrictions") || preferences.injuries.length === 0
      ? []
      : preferences.injuries.filter((i) => i !== "No restrictions");

  const subFocus = deriveSubFocus(
    preferences.primaryFocus,
    preferences.subFocusByGoal
  );

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
  const eligible = filterByBodyPartFocus(
    filterByInjuries(
      filterByGymProfile(exercises, gymProfile),
      injuryFilter
    ),
    bodyPartFocus
  );

  const warmupPool = eligible.filter(
    (e) =>
      e.modalities.includes("mobility") || e.modalities.includes("conditioning")
  );
  const mainPool = eligible.filter((e) =>
    e.modalities.some((m) => focusModalities.includes(m))
  );
  const accessoryPool = eligible.filter((e) =>
    e.tags.includes("core stability")
  );
  const cooldownPool = eligible.filter((e) => e.modalities.includes("mobility"));

  const buildSection = (
    title: string,
    pool: ExerciseDefinition[],
    count: number,
    used: Set<string>,
    reasoning: string
  ): { id: string; title: string; reasoning?: string; exercises: GeneratedExercise[]; supersetPairs?: [GeneratedExercise, GeneratedExercise][] } => {
    const exercises: GeneratedExercise[] = [];

    while (exercises.length < count) {
      const poolToUse = pool.length ? pool : eligible;
      const available = poolToUse.filter((e) => !used.has(e.id));
      const picked = pickRandom(available, rng);
      if (!picked) break;
      used.add(picked.id);

      exercises.push({
        id: picked.id,
        name: picked.name,
        prescription: prescriptionForExercise(picked, preferences.energyLevel),
        tags: picked.tags,
      });
    }

    return {
      id: title.toLowerCase().replace(" ", "_"),
      title,
      reasoning,
      exercises,
    };
  };

  const buildMainSupersetSection = (
    title: string,
    pool: ExerciseDefinition[],
    pairCount: number,
    used: Set<string>,
    reasoning: string
  ): { id: string; title: string; reasoning?: string; exercises: GeneratedExercise[]; supersetPairs: [GeneratedExercise, GeneratedExercise][] } => {
    const poolToUse = pool.length ? pool : eligible;
    const pairs: [GeneratedExercise, GeneratedExercise][] = [];

    const toGen = (e: ExerciseDefinition): GeneratedExercise => ({
      id: e.id,
      name: e.name,
      prescription: prescriptionForExercise(e, preferences.energyLevel),
      tags: e.tags,
    });

    for (let p = 0; p < pairCount; p += 1) {
      const available = poolToUse.filter((e) => !used.has(e.id));
      if (available.length < 2) break;

      const first = pickRandom(available, rng);
      if (!first) break;
      used.add(first.id);

      const availableSecond = poolToUse.filter((e) => !used.has(e.id));
      const second = pickRandom(availableSecond, rng);
      if (!second) break;
      used.add(second.id);

      pairs.push([toGen(first), toGen(second)]);
    }

    return {
      id: title.toLowerCase().replace(" ", "_"),
      title,
      reasoning,
      exercises: pairs.flat(),
      supersetPairs: pairs,
    };
  };

  const usedExerciseIds = new Set<string>();
  const warmup = buildSection(
    "Warm-up",
    warmupPool,
    counts.warmup,
    usedExerciseIds,
    "Prepares your joints and elevates heart rate before the main work."
  );
  const mainSets = buildMainSupersetSection(
    "Main Sets",
    mainPool,
    counts.mainSupersetPairs,
    usedExerciseIds,
    "Compound and focus-aligned movements in supersets to maximize time under tension."
  );
  const accessory = buildSection(
    "Accessory",
    accessoryPool,
    counts.accessory,
    usedExerciseIds,
    "Targets supporting muscles and balance for your goals."
  );
  const cooldown = buildSection(
    "Cooldown",
    cooldownPool,
    counts.cooldown,
    usedExerciseIds,
    "Mobility and breathing to support recovery."
  );

  const notes: string[] = [];
  if (bodyPartFocus.length) {
    notes.push(`Body focus: ${bodyPartFocus.join(", ")}`);
  }
  if (injuryFilter.length) {
    notes.push(`Injury-aware: avoiding ${injuryFilter.join(", ")}`);
  }
  if (preferences.upcoming.length) {
    notes.push(`Upcoming: ${preferences.upcoming.join(", ")}`);
  }
  if (subFocus.length) {
    notes.push(`Sub-focus: ${subFocus.join(", ")}`);
  }
  if (gymProfile) {
    notes.push(`Using only equipment in ${gymProfile.name}`);
  }

  return {
    id: `w_${Date.now()}`,
    focus: preferences.primaryFocus,
    durationMinutes: preferences.durationMinutes,
    energyLevel: preferences.energyLevel,
    notes: notes.length ? notes.join(" • ") : undefined,
    sections: [warmup, mainSets, accessory, cooldown],
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
 */
export async function generateWorkoutAsync(
  preferences: ManualPreferences,
  gymProfile?: GymProfile,
  seedExtra?: string | number
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
  return generateWorkout(preferences, gymProfile, seedExtra, exercises);
}
