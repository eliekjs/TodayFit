import { EXERCISES } from "../data/exercises";
import type {
  ExerciseDefinition,
  GeneratedExercise,
  GeneratedWorkout,
  ManualPreferences,
} from "./types";
import type { GymProfile } from "../data/gymProfiles";

function pickCountByDuration(durationMinutes: number | null) {
  if (!durationMinutes) return { warmup: 2, main: 4, accessory: 2, cooldown: 2 };
  if (durationMinutes <= 25) return { warmup: 2, main: 4, accessory: 1, cooldown: 1 };
  if (durationMinutes <= 40) return { warmup: 3, main: 4, accessory: 2, cooldown: 2 };
  if (durationMinutes <= 60) return { warmup: 3, main: 5, accessory: 2, cooldown: 2 };
  return { warmup: 3, main: 6, accessory: 3, cooldown: 2 };
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
  profile: GymProfile | undefined,
  useGymEquipmentOnly: boolean
): ExerciseDefinition[] {
  if (!useGymEquipmentOnly || !profile) return exercises;
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
  gymProfile?: GymProfile
): GeneratedWorkout {
  const seed = JSON.stringify({
    focus: preferences.primaryFocus,
    duration: preferences.durationMinutes,
    energy: preferences.energyLevel,
    injuries: preferences.injuries,
    upcoming: preferences.upcoming,
    subFocus: preferences.subFocus,
    profile: gymProfile?.id,
    useGymOnly: preferences.useGymEquipmentOnly,
  });
  const rng = createRngFromString(seed);

  const focusModalities = preferences.primaryFocus.flatMap((f) =>
    focusToModalities(f)
  );

  const counts = pickCountByDuration(preferences.durationMinutes);

  const eligible = filterByInjuries(
    filterByGymProfile(EXERCISES, gymProfile, preferences.useGymEquipmentOnly),
    preferences.injuries
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
    count: number
  ): { id: string; title: string; exercises: GeneratedExercise[] } => {
    const used = new Set<string>();
    const exercises: GeneratedExercise[] = [];

    while (exercises.length < count) {
      const poolToUse = pool.length ? pool : eligible;
      const picked = pickRandom(poolToUse, rng);
      if (!picked) break;
      if (used.has(picked.id)) continue;
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
      exercises,
    };
  };

  const warmup = buildSection("Warm-up", warmupPool, counts.warmup);
  const mainSets = buildSection("Main Sets", mainPool, counts.main);
  const accessory = buildSection("Accessory", accessoryPool, counts.accessory);
  const cooldown = buildSection("Cooldown", cooldownPool, counts.cooldown);

  const notes: string[] = [];
  if (preferences.injuries.length) {
    notes.push(`Injury-aware: avoiding ${preferences.injuries.join(", ")}`);
  }
  if (preferences.upcoming.length) {
    notes.push(`Upcoming: ${preferences.upcoming.join(", ")}`);
  }
  if (preferences.subFocus.length) {
    notes.push(`Sub-focus: ${preferences.subFocus.join(", ")}`);
  }
  if (preferences.useGymEquipmentOnly && gymProfile) {
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
