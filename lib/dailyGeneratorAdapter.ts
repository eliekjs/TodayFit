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
import {
  resolveGoalSubFocusSlugs,
  resolveSubFocusProfile,
} from "../data/goalSubFocus";
import { SUB_FOCUS_TAG_MAP } from "../data/sportSubFocus/subFocusTagMap";
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

import { SPORTS_WITH_SUB_FOCUSES } from "../data/sportSubFocus/sportsWithSubFocuses";
import { getCanonicalSportSlug } from "../data/sportSubFocus/canonicalSportSlug";

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
  // Power & Explosiveness must map to power (its goal slug is "conditioning" for sub-focus tags only).
  if (label.includes("Power")) return "power";
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
    goal_sub_focus[goalSlug] = [...new Set([...existing, ...subFocusSlugs])];
  }
  // Resolver: rank-based weights (intent vs overlay, same-class conflict by user priority).
  const goal_sub_focus_weights: Record<string, number[]> = {};
  for (const [goalSlug, rankedSlugs] of Object.entries(goal_sub_focus)) {
    if (!rankedSlugs?.length) continue;
    const profile = resolveSubFocusProfile({ goalSlug, rankedSubFocusSlugs: rankedSlugs });
    // Weights in same order as goal_sub_focus[goalSlug] for getExerciseTagsForGoalSubFocuses(goalSlug, slugs, weights).
    goal_sub_focus_weights[goalSlug] = rankedSlugs.map((s) => profile.resolvedWeights[s] ?? 1 / rankedSlugs.length);
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
    user_level: preferences.workoutTier ?? "intermediate",
    include_creative_variations: preferences.includeCreativeVariations === true,
  };
  const hasStylePrefs =
    !!style_prefs.avoid_tags?.length ||
    !!style_prefs.preferred_zone2_cardio?.length ||
    !!style_prefs.preferred_exercise_ids?.length ||
    style_prefs.user_level != null ||
    style_prefs.include_creative_variations === true;

  const seedNum =
    typeof seedExtra === "number"
      ? seedExtra
      : typeof seedExtra === "string"
        ? hashString(seedExtra)
        : hashString(
            JSON.stringify({
              p: preferences.primaryFocus,
              b: bodyPartFocus,
              d: durationMinutes,
              primary_goal,
              subFocusByGoal,
              goalWeightsPct: [
                preferences.goalMatchPrimaryPct ?? 50,
                preferences.goalMatchSecondaryPct ?? 30,
                preferences.goalMatchTertiaryPct ?? 20,
              ],
            })
          );

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
    goal_sub_focus_weights: Object.keys(goal_sub_focus_weights).length ? goal_sub_focus_weights : undefined,
    goal_weights: sportGoalContext?.goal_weights ?? goal_weights,
    sport_slugs: sportGoalContext?.sport_slugs,
    sport_sub_focus: sportGoalContext?.sport_sub_focus,
    sport_weight: sportGoalContext?.sport_weight,
    week_main_strength_lift_ids_used:
      preferences.weekMainStrengthLiftIdsUsed?.length && preferences.weekMainStrengthLiftIdsUsed.length > 0
        ? [...preferences.weekMainStrengthLiftIdsUsed]
        : undefined,
  };
}

/** Stable string hash for generation seeds (manual default seed + sport/goal composite seeds). */
export function hashString(s: string): number {
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

import { normalizeMatchableTagSlugs, normalizeSlug } from "./ontology";
import { inferCreativeVariationFromSource, inferWorkoutLevelsFromSource } from "./workoutLevel";
import {
  exerciseInferenceInputFromDefinition,
  mergePhase1MovementOntologyIntoExercise,
} from "./exerciseMetadata/phase1MovementInference";
import { mergePhase2SafetyOntologyIntoExercise } from "./exerciseMetadata/phase2SafetyInference";
import { mergePhase3SessionOntologyIntoExercise } from "./exerciseMetadata/phase3SessionRoleInference";
import { mergePhase4ConditioningIntentOntologyIntoExercise } from "./exerciseMetadata/phase4ConditioningIntentInference";
import { mergePhase5MobilityStretchOntologyIntoExercise } from "./exerciseMetadata/phase5MobilityStretchInference";
import { mergePhase6RepRangeOntologyIntoExercise } from "./exerciseMetadata/phase6RepRangeInference";
import { mergePhase7WarmupCooldownRelevanceIntoExercise } from "./exerciseMetadata/phase7WarmupCooldownRelevanceInference";
import { mergePhase8UnilateralOntologyIntoExercise } from "./exerciseMetadata/phase8UnilateralInference";

const CANONICAL_SPORT_SLUGS = new Set(SPORTS_WITH_SUB_FOCUSES.map((s) => normalizeSlug(s.slug)));

/**
 * Sport tag inference:
 * - Build anchor tag sets per sport from SUB_FOCUS_TAG_MAP (top-weighted tags only).
 * - When an exercise contains any anchor tag, assign the sport tag to improve sport_slugs matching coverage.
 *
 * This is intentionally conservative (few anchor tags) to avoid broad/mere-hardness tagging.
 */
const SPORT_ANCHOR_TAGS: Map<string, Set<string>> = (() => {
  const sportToTagWeights = new Map<string, Map<string, number>>();

  for (const [compoundKey, entries] of Object.entries(SUB_FOCUS_TAG_MAP)) {
    const [sportSlugRaw] = compoundKey.split(":");
    if (!sportSlugRaw) continue;
    const sportSlug = normalizeSlug(getCanonicalSportSlug(sportSlugRaw));
    if (!CANONICAL_SPORT_SLUGS.has(sportSlug)) continue;

    const byTag = sportToTagWeights.get(sportSlug) ?? new Map<string, number>();
    for (const e of entries) {
      const tagSlug = normalizeSlug(e.tag_slug);
      const weight = typeof e.weight === "number" ? e.weight : 1;
      const prev = byTag.get(tagSlug) ?? -Infinity;
      byTag.set(tagSlug, Math.max(prev, weight));
    }
    sportToTagWeights.set(sportSlug, byTag);
  }

  const out = new Map<string, Set<string>>();
  for (const [sportSlug, tagWeights] of sportToTagWeights.entries()) {
    const top = [...tagWeights.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 4)
      .map(([tag]) => tag);
    out.set(sportSlug, new Set(top));
  }
  return out;
})();

function modalitiesToGoalTags(modalities: string[] | undefined): ExerciseTags["goal_tags"] {
  const m = (modalities ?? []).map((x) => x.toLowerCase().replace(/\s/g, "_"));
  const out = new Set<NonNullable<ExerciseTags["goal_tags"]>[number]>();
  for (const s of m) {
    if (s === "strength") out.add("strength");
    else if (s === "hypertrophy") out.add("hypertrophy");
    else if (s === "conditioning") out.add("conditioning");
    else if (s === "power") out.add("power");
    else if (s === "mobility") out.add("mobility");
    else if (s === "recovery") out.add("recovery");
    else if (s === "skill") out.add("calisthenics");
  }
  return out.size ? ([...out] as ExerciseTags["goal_tags"]) : undefined;
}

/** Build ExerciseTags from ExerciseDefinition tags and contraindications. Ties sport and sub-focus data to exercises for selection. */
function buildExerciseTags(def: ExerciseDefinition): ExerciseTags {
  const tags = def.tags ?? [];
  const toSlug = (t: string) => normalizeSlug(t);
  const goalTagsFromTags = tags.filter((t) =>
    ["strength", "hypertrophy", "endurance", "power", "mobility", "calisthenics", "recovery", "athleticism"].includes(toSlug(t))
  ) as ExerciseTags["goal_tags"];
  const goalTagsFromModalities = modalitiesToGoalTags(def.modalities as unknown as string[] | undefined);
  const goalTags = [...new Set([...(goalTagsFromTags ?? []), ...(goalTagsFromModalities ?? [])])] as ExerciseTags["goal_tags"];
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
  // Canonical sport tags: must match SPORTS_WITH_SUB_FOCUSES slugs (no `sport_` prefix).
  const sportTags = [
    ...new Set(
      tags.flatMap((t) => {
        const raw = toSlug(t);
        const withoutPrefix = raw.startsWith("sport_") ? raw.slice("sport_".length) : raw;
        const canonical = normalizeSlug(getCanonicalSportSlug(withoutPrefix));
        return CANONICAL_SPORT_SLUGS.has(canonical) ? [canonical] : [];
      })
    ),
  ];
  const used = new Set([
    ...(goalTags ?? []).map(toSlug),
    ...energySlugs.map(toSlug),
    ...jointStress.map(toSlug),
    ...(stimulus ?? []).map(toSlug),
    ...sportTags.map(toSlug),
  ]);
  const rawAttribute = tags.filter((t) => !used.has(toSlug(t)));
  const derivedMuscleTags = (def.muscles ?? []).map(toSlug);
  const derivedMovementPattern = deriveMovementPattern(def);
  const derivedMovementTags = derivedMovementPattern
    ? normalizeMatchableTagSlugs(toSlug(derivedMovementPattern))
    : [];
  const normalizedRawAttributeTags = rawAttribute.flatMap((t) => normalizeMatchableTagSlugs(t));

  // Lift canonical “strength qualities” from stimulus tags so sport sub-focus scoring can match them.
  const inferredFromStimulus: string[] = [];
  const hasQuads = normalizedRawAttributeTags.includes("quads");
  const hasHamstrings = normalizedRawAttributeTags.includes("hamstrings");
  const stimulusSlugs = stimulus.map(toSlug);
  if (stimulusSlugs.includes("eccentric")) {
    inferredFromStimulus.push("eccentric_strength");
    if (hasHamstrings) inferredFromStimulus.push("tendon_resilience");

    const idName = normalizeSlug(`${def.id} ${def.name}`);
    if (hasQuads || idName.includes("quad") || idName.includes("knee_dominant")) inferredFromStimulus.push("eccentric_quad_strength");
  }
  if (stimulusSlugs.includes("isometric")) {
    inferredFromStimulus.push("isometric_strength", "strength_endurance");
  }
  if (stimulusSlugs.includes("plyometric")) {
    inferredFromStimulus.push("explosive_power");
  }
  if (stimulusSlugs.includes("grip")) {
    inferredFromStimulus.push("grip_strength", "grip_endurance");
  }

  const modalitySlugs = (def.modalities ?? []).map(toSlug);
  const equipmentSlugs = (def.equipment ?? []).map(toSlug);
  const idName = normalizeSlug(`${def.id} ${def.name}`);
  const inferredFromModalitiesAndEquipment: string[] = [];
  if (modalitySlugs.includes("strength")) inferredFromModalitiesAndEquipment.push("max_strength");
  if (modalitySlugs.includes("conditioning")) inferredFromModalitiesAndEquipment.push("work_capacity");

  if (equipmentSlugs.includes("bodyweight")) inferredFromModalitiesAndEquipment.push("bodyweight");
  if (equipmentSlugs.includes("sled") || idName.includes("sled")) inferredFromModalitiesAndEquipment.push("sled_strength");

  // Eccentric inference from ids/names (FunctionalFitness exports often encode eccentricity in the slug, not tags).
  if (idName.includes("eccentric")) {
    inferredFromModalitiesAndEquipment.push("eccentric_strength");
    if (hasQuads) inferredFromModalitiesAndEquipment.push("eccentric_quad_strength");
    if (hasHamstrings) inferredFromModalitiesAndEquipment.push("tendon_resilience");
  }

  // High-intensity / threshold-ish heuristics (used by zone3/lactate/energy_high canonical tags).
  const isSprintOrInterval = /sprint|interval|hiit|tempo|sprinter/.test(idName);
  if (isSprintOrInterval) {
    inferredFromModalitiesAndEquipment.push("energy_high", "zone3_cardio", "anaerobic_capacity", "lactate_threshold");
  }

  // Reactive / landing-ish
  if (/reactive|landing|drop|drop_|jump_landing/.test(idName)) inferredFromModalitiesAndEquipment.push("reactive_power");

  // Pattern inference from OTA slugs / ids.
  if (idName.includes("lunge")) inferredFromModalitiesAndEquipment.push("lunge_pattern");
  if (idName.includes("skater") || idName.includes("shuffle") || idName.includes("agility")) inferredFromModalitiesAndEquipment.push("agility");

  // Climbing/grip inference (finger/lock-off)
  if (idName.includes("finger") || idName.includes("two_finger") || idName.includes("planche")) inferredFromModalitiesAndEquipment.push("finger_strength");
  if (idName.includes("lockoff") || idName.includes("lock-off") || idName.includes("front_lever")) inferredFromModalitiesAndEquipment.push("lockoff_strength");

  // Hips / trunk / mobility inference
  if (idName.includes("hip")) inferredFromModalitiesAndEquipment.push("hips");

  const attributeTags = [
    ...new Set([
      ...normalizedRawAttributeTags,
      ...derivedMuscleTags,
      ...derivedMovementTags,
      ...energySlugs.map(toSlug),
      ...inferredFromStimulus,
      ...inferredFromModalitiesAndEquipment,
    ]),
  ];

  // Infer sport tags from the exercise's canonical selector tags.
  // This improves generator compatibility for sport_slugs matching without requiring explicit `sport_*` tags in the DB.
  const exerciseTagSetForSportInference = new Set<string>([
    ...goalTags.map(toSlug),
    ...stimulusSlugs,
    ...attributeTags,
  ]);
  const inferredSportTags: string[] = [];
  for (const [sportSlug, anchorTags] of SPORT_ANCHOR_TAGS.entries()) {
    let matched = false;
    for (const t of anchorTags) {
      if (exerciseTagSetForSportInference.has(t)) {
        matched = true;
        break;
      }
    }
    if (matched) inferredSportTags.push(sportSlug);
  }
  const sportTagsFinal = [...new Set([...sportTags, ...inferredSportTags])];

  return {
    ...(goalTags?.length ? { goal_tags: goalTags } : {}),
    ...(sportTagsFinal.length ? { sport_tags: sportTagsFinal } : {}),
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
  const idName = normalizeSlug(`${def.id} ${def.name}`);
  const rawEquipment = (def.equipment ?? []).map((eq) =>
    typeof eq === "string" ? eq.toLowerCase().replace(/\s/g, "_") : String(eq)
  );
  // Some imported catalogs (FunctionalFitness / OTA) include specialty-tool exercises but incorrectly
  // mark equipment as bodyweight. This breaks equipment-availability filtering.
  // We keep this small and explicit: only override when the only equipment is bodyweight.
  const isBodyweightOnly =
    rawEquipment.length === 1 && rawEquipment[0] === "bodyweight";
  const inferredSpecialtyEquipment: string[] = [];
  if (isBodyweightOnly) {
    // Landmine movements require a loaded barbell; take precedence over single-tool specialty checks.
    if (/\blandmine\b/.test(idName)) {
      inferredSpecialtyEquipment.push("barbell", "plates");
    } else {
      if (/\bclubbell\b/.test(idName)) inferredSpecialtyEquipment.push("clubbell");
      if (/\bindian_club\b|\bindian_clubs\b/.test(idName))
        inferredSpecialtyEquipment.push("indian_club");
      if (/\bgada\b/.test(idName)) inferredSpecialtyEquipment.push("gada");
      if (/\bmacebell\b/.test(idName)) inferredSpecialtyEquipment.push("macebell");
      if (/\bsteel_mace\b|\bmace\b/.test(idName))
        inferredSpecialtyEquipment.push("steel_mace");
    }
  }
  const equipment_required =
    inferredSpecialtyEquipment.length > 0 ? inferredSpecialtyEquipment : rawEquipment;
  const tags = buildExerciseTags(def);

  const exercise: Exercise = {
    id: def.id,
    name: def.name,
    movement_pattern: deriveMovementPattern(def),
    muscle_groups,
    modality,
    equipment_required,
    difficulty: 2,
    time_cost: "medium",
    tags,
    ...(def.aliases?.length ? { aliases: def.aliases } : {}),
    ...(def.progressions?.length ? { progressions: def.progressions } : {}),
    ...(def.regressions?.length ? { regressions: def.regressions } : {}),
  };

  // Phase 1: research-aligned movement family + fine patterns when static/DB omits ontology
  // (see docs/research/exercise-metadata-phase1-movement-patterns.md).
  mergePhase1MovementOntologyIntoExercise(exercise, exerciseInferenceInputFromDefinition(def));

  // Phase 2: joint stress, contraindications, impact (see docs/research/exercise-metadata-phase2-safety-layer.md).
  mergePhase2SafetyOntologyIntoExercise(exercise, exerciseInferenceInputFromDefinition(def), {
    movement_patterns: exercise.movement_patterns ?? [],
    primary_movement_family: exercise.primary_movement_family,
  });

  // Phase 3: role, pairing, fatigue regions (see docs/research/exercise-metadata-phase3-session-structure.md).
  mergePhase3SessionOntologyIntoExercise(exercise, exerciseInferenceInputFromDefinition(def), {
    movement_patterns: exercise.movement_patterns ?? [],
    primary_movement_family: exercise.primary_movement_family,
    movement_pattern: exercise.movement_pattern,
    modality: exercise.modality,
    joint_stress_tags: exercise.joint_stress_tags,
  });

  // Phase 4: conditioning intent slugs for sub-focus / template matching (conditioningSubFocus.ts).
  mergePhase4ConditioningIntentOntologyIntoExercise(exercise, exerciseInferenceInputFromDefinition(def));

  // Phase 5: mobility_targets + stretch_targets for warmup/cooldown target matching.
  mergePhase5MobilityStretchOntologyIntoExercise(exercise, exerciseInferenceInputFromDefinition(def));

  // Phase 6: rep_range bounds for getEffectiveRepRange (see docs/research/exercise-metadata-phase6-rep-range-bounds.md).
  mergePhase6RepRangeOntologyIntoExercise(exercise, exerciseInferenceInputFromDefinition(def));

  // Phase 7: warmup_relevance / cooldown_relevance for ontologyScoring (after Phase 5 targets).
  mergePhase7WarmupCooldownRelevanceIntoExercise(exercise, exerciseInferenceInputFromDefinition(def));

  // Phase 8: unilateral flag for variety scoring (docs/research/exercise-metadata-phase8-unilateral.md).
  mergePhase8UnilateralOntologyIntoExercise(exercise, exerciseInferenceInputFromDefinition(def));

  const levelSource = {
    id: def.id,
    name: def.name,
    tags: def.tags ?? [],
    workout_levels: def.workout_levels,
  };
  exercise.workout_level_tags = inferWorkoutLevelsFromSource(levelSource);
  if (inferCreativeVariationFromSource(levelSource)) {
    exercise.creative_variation = true;
  }

  return exercise;
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
