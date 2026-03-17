/**
 * Adapters to use logic/workoutGeneration/dailyGenerator as the single engine for the app.
 * Maps ManualPreferences + GymProfile → GenerateWorkoutInput, ExerciseDefinition → Exercise,
 * and WorkoutSession → GeneratedWorkout.
 */

import type { ManualPreferences, GeneratedWorkout, ExerciseDefinition } from "./types";
import type { GymProfile } from "../data/gymProfiles";
import { deriveBodyPartFocus, deriveBodyPartFocusFromSubFocus, deriveSubFocus } from "./preferencesConstants";
import { getAvoidTagSlugsFromUpcoming } from "./filterTagRules";
import { PRIMARY_FOCUS_TO_GOAL_SLUG } from "./preferencesConstants";
import { resolveGoalSubFocusSlugs } from "../data/goalSubFocus";
import type {
  GenerateWorkoutInput,
  PrimaryGoal,
  FocusBodyPart,
  Exercise,
  ExerciseTags,
  WorkoutSession,
  Modality,
  MovementPattern,
} from "../logic/workoutGeneration/types";

const DURATIONS = [20, 30, 45, 60, 75] as const;
type AllowedDuration = (typeof DURATIONS)[number];

function clampDuration(mins: number | null): AllowedDuration {
  if (mins == null || mins <= 0) return 45;
  if (mins <= 25) return 20;
  if (mins <= 37) return 30;
  if (mins <= 52) return 45;
  if (mins <= 67) return 60;
  return 75;
}

/** Map primary focus label to generator PrimaryGoal. */
function primaryFocusLabelToGoal(label: string): PrimaryGoal {
  const slug = PRIMARY_FOCUS_TO_GOAL_SLUG[label] ?? "strength";
  const slugToGoal: Record<string, PrimaryGoal> = {
    strength: "strength",
    muscle: "hypertrophy",
    physique: "body_recomp",
    conditioning: "conditioning",
    endurance: "endurance",
    mobility: "mobility",
    resilience: "recovery",
  };
  if (slugToGoal[slug]) return slugToGoal[slug];
  if (label.includes("Athletic")) return "athletic_performance";
  if (label.includes("Calisthenics")) return "calisthenics";
  if (label.includes("Power")) return "power";
  return "strength";
}

/** Map BodyPartFocusKey (UI) to FocusBodyPart (generator). */
function bodyPartFocusToGeneratorFocus(keys: string[]): FocusBodyPart[] {
  const out: FocusBodyPart[] = [];
  if (keys.includes("Full body")) return ["full_body"];
  if (keys.includes("Upper body")) {
    if (keys.includes("Push") && !keys.includes("Pull")) return ["upper_push"];
    if (keys.includes("Pull") && !keys.includes("Push")) return ["upper_pull"];
    return ["upper_push", "upper_pull"];
  }
  if (keys.includes("Lower body")) return ["lower"];
  if (keys.includes("Core") && !keys.includes("Upper body") && !keys.includes("Lower body")) return ["core"];
  return out;
}

/** Normalize constraint/injury label to slug (e.g. "Lower Back" → "lower_back"). */
function injuryLabelToSlug(label: string): string {
  return label.toLowerCase().replace(/\s/g, "_").replace(/^no_restrictions$/, "");
}

/** Optional sport/goal context when building input from adaptive or sport-prep flows. */
export type SportGoalContext = {
  sport_slugs?: string[];
  sport_sub_focus?: Record<string, string[]>;
  goal_weights?: number[];
  sport_weight?: number;
};

/**
 * Build GenerateWorkoutInput from ManualPreferences and optional GymProfile.
 * Used so the app can call dailyGenerator with the same semantics as the current lib generator.
 * seedExtra: optional string or number from the app (e.g. date or session id) for reproducible RNG.
 * preferredExerciseIds: optional exercise ids/slugs to prefer when scoring (e.g. from sport/goal ranking).
 * sportGoalContext: optional override for sport_slugs, sport_sub_focus, goal_weights, sport_weight (e.g. from adaptive/sport-prep).
 */
export function manualPreferencesToGenerateWorkoutInput(
  preferences: ManualPreferences,
  gymProfile?: GymProfile,
  seedExtra?: string | number,
  preferredExerciseIds?: string[],
  sportGoalContext?: SportGoalContext
): GenerateWorkoutInput {
  const durationMinutes = clampDuration(preferences.durationMinutes);
  const bodyPartFromTarget = deriveBodyPartFocus(preferences.targetBody, preferences.targetModifier);
  const subFocus = deriveSubFocus(preferences.primaryFocus, preferences.subFocusByGoal ?? {});
  const bodyPartFromSubFocus = deriveBodyPartFocusFromSubFocus(subFocus);
  const bodyPartFocus =
    bodyPartFromTarget.length > 0 ? bodyPartFromTarget : bodyPartFromSubFocus;
  const focus_body_parts = bodyPartFocusToGeneratorFocus(bodyPartFocus);

  const injuryFilter =
    preferences.injuries.includes("No restrictions") || preferences.injuries.length === 0
      ? []
      : preferences.injuries.filter((i) => i !== "No restrictions");
  const injuries_or_constraints = injuryFilter.map(injuryLabelToSlug);

  const available_equipment = (gymProfile?.equipment ?? []).map((eq) =>
    typeof eq === "string" ? eq : String(eq)
  );
  const avoid_tags = getAvoidTagSlugsFromUpcoming(preferences.upcoming ?? []);

  const primary_goal = primaryFocusLabelToGoal(preferences.primaryFocus[0] ?? "Build Strength");
  const secondary_goals = preferences.primaryFocus
    .slice(1, 3)
    .map(primaryFocusLabelToGoal)
    .filter((g) => g !== primary_goal);

  // Goal sub-focus: goal slug -> sub-focus slugs from primaryFocus + subFocusByGoal
  const goal_sub_focus: Record<string, string[]> = {};
  const subFocusByGoal = preferences.subFocusByGoal ?? {};
  for (const label of preferences.primaryFocus) {
    const subLabels = subFocusByGoal[label] ?? [];
    if (!subLabels.length) continue;
    const { goalSlug, subFocusSlugs } = resolveGoalSubFocusSlugs(label, subLabels);
    if (!goalSlug || !subFocusSlugs.length) continue;
    const existing = goal_sub_focus[goalSlug] ?? [];
    const combined = [...new Set([...existing, ...subFocusSlugs])];
    goal_sub_focus[goalSlug] = combined;
  }

  // Goal weights from match percentages (normalize to sum 1)
  const p1 = (preferences.goalMatchPrimaryPct ?? 50) / 100;
  const p2 = (preferences.goalMatchSecondaryPct ?? 30) / 100;
  const p3 = (preferences.goalMatchTertiaryPct ?? 20) / 100;
  const sum = p1 + p2 + p3;
  const goal_weights = sum > 0 ? [p1 / sum, p2 / sum, p3 / sum] : undefined;

  const style_prefs = {
    avoid_tags: avoid_tags.length ? avoid_tags : undefined,
    preferred_zone2_cardio: preferences.preferredZone2Cardio?.length
      ? preferences.preferredZone2Cardio
      : undefined,
    preferred_exercise_ids: preferredExerciseIds?.length ? preferredExerciseIds : undefined,
  };
  const hasStylePrefs =
    !!style_prefs.avoid_tags?.length ||
    !!style_prefs.preferred_zone2_cardio?.length ||
    !!style_prefs.preferred_exercise_ids?.length;

  const seedNum =
    typeof seedExtra === "number"
      ? seedExtra
      : typeof seedExtra === "string"
        ? hashString(seedExtra)
        : hashString(JSON.stringify({ p: preferences.primaryFocus, b: bodyPartFocus, d: durationMinutes }));

  return {
    duration_minutes: durationMinutes,
    primary_goal,
    secondary_goals: secondary_goals.length ? secondary_goals : undefined,
    focus_body_parts: focus_body_parts.length ? focus_body_parts : undefined,
    energy_level: preferences.energyLevel ?? "medium",
    available_equipment,
    injuries_or_constraints,
    style_prefs: hasStylePrefs ? style_prefs : undefined,
    seed: seedNum,
    goal_sub_focus: Object.keys(goal_sub_focus).length ? goal_sub_focus : undefined,
    goal_weights: sportGoalContext?.goal_weights ?? goal_weights,
    sport_slugs: sportGoalContext?.sport_slugs,
    sport_sub_focus: sportGoalContext?.sport_sub_focus,
    sport_weight: sportGoalContext?.sport_weight,
  };
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Map lib Modality to generator Modality (generator has skill, recovery). */
function toGeneratorModality(m: string): Modality {
  const n = m.toLowerCase().replace(/\s/g, "_");
  const valid: Modality[] = ["strength", "hypertrophy", "power", "conditioning", "mobility", "skill", "recovery"];
  return (valid.includes(n as Modality) ? n : "strength") as Modality;
}

/** Derive movement pattern from muscles and tags for ExerciseDefinition. */
function deriveMovementPattern(def: ExerciseDefinition): MovementPattern {
  const muscles = def.muscles ?? [];
  const tags = def.tags ?? [];
  const tagSet = new Set(tags.map((t) => t.toLowerCase().replace(/\s/g, "_")));
  if (muscles.includes("pull")) return "pull";
  if (muscles.includes("push")) return "push";
  if (muscles.includes("legs")) {
    if (tagSet.has("quad-focused") || tagSet.has("squat")) return "squat";
    if (tagSet.has("posterior_chain") || tagSet.has("hamstrings") || tagSet.has("glutes")) return "hinge";
    return "squat";
  }
  if (muscles.includes("core")) return "rotate";
  return "push";
}

/** Normalize contraindication to slug matching filter's injuryKeys (shoulder, knee, lower_back, etc.). */
function contraindicationToSlug(c: string): string {
  return c.toLowerCase().replace(/\s/g, "_");
}

const STIMULUS_SLUGS = new Set([
  "eccentric", "isometric", "plyometric", "aerobic_zone2", "anaerobic", "grip",
  "scapular_control", "trunk_anti_rotation", "anti_flexion",
]);
const JOINT_STRESS_PREFIXES = [
  "shoulder_overhead", "shoulder_extension", "knee_flexion", "lumbar_shear",
  "elbow_stress", "wrist_stress", "hip_stress", "ankle_stress",
];

/** Build ExerciseTags from ExerciseDefinition tags and contraindications. Ties sport and sub-focus data to exercises for selection. */
function buildExerciseTags(def: ExerciseDefinition): ExerciseTags {
  const tags = def.tags ?? [];
  const toSlug = (t: string) => t.toLowerCase().replace(/\s/g, "_");
  const goalTags = tags.filter((t) =>
    ["strength", "hypertrophy", "endurance", "power", "mobility", "calisthenics", "recovery", "athleticism"].includes(toSlug(t))
  ) as ExerciseTags["goal_tags"];
  const energySlugs = tags.filter((t) => /^energy_(low|medium|high)$/.test(toSlug(t)));
  const energyFit = energySlugs.length
    ? (energySlugs.map((t) => t.replace("energy_", "") as "low" | "medium" | "high"))
    : undefined;
  const jointStress = tags.filter((t) => {
    const u = toSlug(t);
    return JOINT_STRESS_PREFIXES.some((p) => u.includes(p) || u === p);
  });
  const contraindications = (def.contraindications ?? []).map(contraindicationToSlug);
  const stimulus = tags.filter((t) => STIMULUS_SLUGS.has(toSlug(t))) as ExerciseTags["stimulus"];
  const sportTags = tags.filter((t) => toSlug(t).startsWith("sport_"));
  const used = new Set([
    ...goalTags.map(toSlug),
    ...energySlugs.map(toSlug),
    ...jointStress.map(toSlug),
    ...stimulus.map(toSlug),
    ...sportTags.map(toSlug),
  ]);
  const attributeTags = tags.filter((t) => !used.has(toSlug(t)));

  return {
    ...(goalTags?.length ? { goal_tags: goalTags } : {}),
    ...(sportTags.length ? { sport_tags: sportTags } : {}),
    ...(energyFit?.length ? { energy_fit: energyFit } : {}),
    ...(jointStress.length ? { joint_stress: jointStress } : {}),
    ...(contraindications.length ? { contraindications } : {}),
    ...(stimulus.length ? { stimulus } : {}),
    ...(attributeTags.length ? { attribute_tags: attributeTags } : {}),
  };
}

/**
 * Convert ExerciseDefinition (lib / data/exercises / listExercises) to generator Exercise.
 * Enables using the same exercise pool for dailyGenerator when loaded from DB or in-memory.
 */
export function exerciseDefinitionToGeneratorExercise(def: ExerciseDefinition): Exercise {
  const modality = toGeneratorModality(def.modalities?.[0] ?? "strength");
  const muscle_groups = [...(def.muscles ?? [])];
  const tagsFromDef = (def.tags ?? []).filter(
    (t) =>
      !["strength", "hypertrophy", "endurance", "power", "mobility", "calisthenics", "recovery", "athleticism"].includes(
        t.toLowerCase().replace(/\s/g, "_")
      ) &&
      !/^energy_(low|medium|high)$/.test(t.toLowerCase().replace(/\s/g, "_"))
  );
  const equipment_required = (def.equipment ?? []).map((eq) =>
    typeof eq === "string" ? eq.toLowerCase().replace(/\s/g, "_") : String(eq)
  );
  const tags = buildExerciseTags(def);

  return {
    id: def.id,
    name: def.name,
    movement_pattern: deriveMovementPattern(def),
    muscle_groups,
    modality,
    equipment_required,
    difficulty: 2,
    time_cost: "medium",
    tags,
    ...(def.progressions?.length ? { progressions: def.progressions } : {}),
    ...(def.regressions?.length ? { regressions: def.regressions } : {}),
  };
}

/**
 * Convert WorkoutSession (dailyGenerator output) to GeneratedWorkout (app type).
 * Preserves blocks; adds id, focus, durationMinutes, energyLevel for the UI.
 */
export function workoutSessionToGeneratedWorkout(
  session: WorkoutSession,
  preferences: ManualPreferences,
  id?: string
): GeneratedWorkout {
  return {
    id: id ?? `w_${Date.now()}`,
    focus: preferences.primaryFocus?.length ? preferences.primaryFocus : [session.title],
    durationMinutes: session.estimated_duration_minutes,
    energyLevel: preferences.energyLevel ?? null,
    blocks: session.blocks,
  };
}
