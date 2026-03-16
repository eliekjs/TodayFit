import { EXERCISES } from "../data/exercises";
import {
  getAvoidTagSlugsFromUpcoming,
  exerciseHasAnyAvoidTag,
} from "./filterTagRules";
import { deriveBodyPartFocus, deriveBodyPartFocusFromSubFocus, deriveSubFocus } from "./preferencesConstants";
import {
  resolveGoalSubFocusSlugs,
  getExerciseTagsForGoalSubFocuses,
} from "../data/goalSubFocus";
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
  isCooldownEligibleEquipment,
  WARMUP_CARDIO_POSITION,
  WARMUP_ITEM_MAX_SECONDS,
  MAX_NON_CARDIO_CUE_SECONDS,
  ZONE2_HR_GUIDANCE,
  getSimilarExerciseClusterId,
  BLOCKED_EXERCISE_IDS,
} from "./workoutRules";
import { pickBestSupersetPairs } from "../logic/workoutIntelligence/supersetPairing";
import type { PairingInput } from "../logic/workoutIntelligence/supersetPairing";

/** Convert ExerciseDefinition to PairingInput so we can use superset pairing rules (push+pull, chest+triceps, etc.). */
function toPairingInput(e: ExerciseDefinition): PairingInput {
  const muscles = e.muscles ?? [];
  const tags = e.tags ?? [];
  const tagSet = new Set(tags.map((t) => t.toLowerCase().replace(/\s/g, "_")));
  let movement_pattern = "push";
  if (muscles.includes("pull")) movement_pattern = "pull";
  else if (muscles.includes("legs"))
    movement_pattern = tagSet.has("quad-focused") || tagSet.has("squat") ? "squat" : tagSet.has("posterior_chain") || tagSet.has("hamstrings") || tagSet.has("glutes") ? "hinge" : "squat";
  else if (muscles.includes("core")) movement_pattern = "rotate";
  return {
    id: e.id,
    movement_pattern,
    muscle_groups: [...muscles, ...tags].map((m) => m.toLowerCase().replace(/\s/g, "_")),
    tags: { stimulus: tags },
  };
}

/** Cardio machine / pure cardio: can be cued for more than 5 min (e.g. zone 2 block). */
function isCardioMachineOrPureCardio(e: ExerciseDefinition): boolean {
  if (!e.modalities.includes("conditioning")) return false;
  const cardioEquipment = new Set(["treadmill", "assault_bike", "rower", "stair_climber"]);
  return e.tags.includes("zone2") || e.equipment.some((eq) => cardioEquipment.has(eq));
}

function pickCountByDuration(durationMinutes: number | null) {
  if (!durationMinutes) return { warmup: 2, mainSupersetPairs: 2, accessory: 2, cooldown: 2 };
  if (durationMinutes <= 25) return { warmup: 2, mainSupersetPairs: 1, accessory: 1, cooldown: 1 };
  if (durationMinutes <= 40) return { warmup: 2, mainSupersetPairs: 2, accessory: 2, cooldown: 2 };
  if (durationMinutes <= 60) return { warmup: 2, mainSupersetPairs: 3, accessory: 2, cooldown: 2 };
  return { warmup: 2, mainSupersetPairs: 4, accessory: 3, cooldown: 2 };
}

/**
 * Max sets per exercise by session duration (research-informed).
 * Shorter sessions: cap sets so volume fits time and quality is preserved (Schoenfeld et al.;
 * time-efficient resistance training still uses 2–3 sets per exercise when duration is limited).
 */
function maxSetsByDuration(durationMinutes: number | null): number {
  if (!durationMinutes) return 4;
  if (durationMinutes <= 25) return 2;
  if (durationMinutes <= 40) return 3;
  return 4;
}

type StructuredPrescription = {
  sets: number;
  reps?: number;
  time_seconds?: number;
  rest_seconds: number;
  coaching_cues: string;
};

/**
 * Sets/reps/rest per exercise. Factors:
 * - Energy: low → fewer sets (2), high → more (4), medium → 3 (RPE/recovery).
 * - Duration: short session → cap sets so workout fits and quality stays high.
 * - Goal: hypertrophy/recomp → moderate sets (3–4); strength/power → 3–5 sets (we use energy band 2–4).
 * - Type: conditioning → 1 set (time-based, "do once"); power → 3–6; mobility/accessory → 2–4.
 */
function prescriptionForExercise(
  exercise: ExerciseDefinition,
  energy: ManualPreferences["energyLevel"],
  primaryFocus: string[],
  durationMinutes: number | null
): StructuredPrescription {
  let baseSets = energy === "high" ? 4 : energy === "low" ? 2 : 3;
  const maxSets = maxSetsByDuration(durationMinutes);
  baseSets = Math.min(baseSets, maxSets);
  const isBodyRecomp = primaryFocus.includes("Body Recomposition");

  if (exercise.modalities.includes("conditioning")) {
    const isZone2 = exercise.tags.includes("zone2");
    const zone2Cue = isZone2 ? `${BODY_RECOMP_CUES.cardio} ${ZONE2_HR_GUIDANCE}` : BODY_RECOMP_CUES.cardio;
    if (isBodyRecomp) {
      const timeSeconds = Math.round((BODY_RECOMP_CARDIO_DURATION_MIN + BODY_RECOMP_CARDIO_DURATION_MAX) / 2) * 60;
      return { sets: 1, time_seconds: timeSeconds, rest_seconds: 0, coaching_cues: zone2Cue };
    }
    const minutes = energy === "high" ? 12 : energy === "low" ? 6 : 8;
    const steadyCue = isZone2 ? `Steady effort. ${ZONE2_HR_GUIDANCE}` : "Steady effort. Keep heart rate in target zone.";
    return { sets: 1, time_seconds: minutes * 60, rest_seconds: 0, coaching_cues: steadyCue };
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

/** Canonical upper-push muscles (for body-part filter). */
const PUSH_MUSCLES = ["chest", "triceps", "shoulders"];
/** Canonical upper-pull muscles (for body-part filter). */
const PULL_MUSCLES = ["lats", "biceps", "upper_back"];
/** All canonical upper-body muscles (exclude from lower-body focus). */
const UPPER_MUSCLES = [...PUSH_MUSCLES, ...PULL_MUSCLES];
/** Lower-body muscles (legs, quads, glutes, hamstrings, calves). */
const LOWER_MUSCLES = ["legs", "quads", "glutes", "hamstrings", "calves"];

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
    const muscles = e.muscles.map((m) => m.toLowerCase().replace(/\s/g, "_"));
    const hasPushMuscle = PUSH_MUSCLES.some((m) => muscles.includes(m)) || muscles.includes("push");
    const hasPullMuscle = PULL_MUSCLES.some((m) => muscles.includes(m)) || muscles.includes("pull");
    const hasUpperMuscle = UPPER_MUSCLES.some((m) => muscles.includes(m)) || muscles.includes("push") || muscles.includes("pull");
    const hasLowerMuscle = LOWER_MUSCLES.some((m) => muscles.includes(m));
    const hasLegs = muscles.includes("legs") || hasLowerMuscle;
    const hasCore = muscles.includes("core");

    // Upper: strictly no lower-body; when modifier (Push/Pull) is set, focus on that; otherwise any upper or core
    if (hasUpper) {
      if (hasLegs) return false;
      if (hasPush && !hasPull) return hasPushMuscle;
      if (hasPull && !hasPush) return hasPullMuscle;
      return hasUpperMuscle || hasCore;
    }
    // Lower: strictly no upper push/pull; when modifier (Quad/Posterior) is set, filter by tags; otherwise all legs
    if (hasLower) {
      if (hasUpperMuscle) return false;
      if (hasQuad && !hasPosterior)
        return hasLegs && e.tags.some((t) => t === "quad-focused");
      if (hasPosterior && !hasQuad)
        return hasLegs && e.tags.some((t) => t === "posterior chain" || t === "glutes" || t === "hamstrings");
      return hasLegs;
    }
    if (hasCoreOnly) return hasCore && !hasLegs;
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

/** Map preferred Zone 2 modality keys to equipment slugs (for filtering conditioning pool). */
const PREFERRED_ZONE2_TO_EQUIPMENT: Record<string, string> = {
  bike: "assault_bike",
  treadmill: "treadmill",
  rower: "rower",
  stair_climber: "stair_climber",
};

/** Restrict Zone 2 / conditioning pool to exercises matching preferred modalities (by equipment). */
function filterByPreferredZone2Cardio(
  exercises: ExerciseDefinition[],
  preferredKeys: string[] | undefined
): ExerciseDefinition[] {
  if (!preferredKeys?.length) return exercises;
  const allowedEquipment = new Set(
    preferredKeys.map((k) => PREFERRED_ZONE2_TO_EQUIPMENT[k.toLowerCase()]).filter(Boolean)
  );
  if (!allowedEquipment.size) return exercises;
  return exercises.filter((e) =>
    e.equipment.some((eq) => allowedEquipment.has(eq))
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
  if (id.includes("recovery") || id.includes("resilience")) return ["mobility", "recovery"];
  return ["strength", "hypertrophy"];
}

/** Normalize display tag to slug form for matching goal sub-focus tag map. */
function tagToSlug(tag: string): string {
  return tag.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
}

/**
 * When user has selected sub-goals (subFocusByGoal), score eligible exercises by tag overlap
 * with goal sub-focus tag weights and return top exercise ids/slugs to prefer during pick.
 */
function buildPreferredSlugsFromSubFocus(
  primaryFocus: string[],
  subFocusByGoal: Record<string, string[]>,
  eligible: ExerciseDefinition[]
): string[] {
  const tagWeightMap = new Map<string, number>();
  for (const goalLabel of primaryFocus) {
    const subLabels = subFocusByGoal[goalLabel];
    if (!subLabels?.length) continue;
    const { goalSlug, subFocusSlugs } = resolveGoalSubFocusSlugs(goalLabel, subLabels);
    if (!goalSlug || !subFocusSlugs.length) continue;
    const weights = getExerciseTagsForGoalSubFocuses(goalSlug, subFocusSlugs);
    for (const { tag_slug, weight } of weights) {
      const existing = tagWeightMap.get(tag_slug) ?? 0;
      tagWeightMap.set(tag_slug, existing + weight);
    }
  }
  if (tagWeightMap.size === 0) return [];

  const scored: { id: string; score: number }[] = [];
  for (const e of eligible) {
    const tagLike = [...(e.tags ?? []), ...(e.muscles ?? [])];
    let score = 0;
    for (const t of tagLike) {
      const slug = tagToSlug(t);
      const w = tagWeightMap.get(slug);
      if (w != null) score += w;
    }
    if (score > 0) scored.push({ id: e.id, score });
  }
  scored.sort((a, b) => b.score - a.score);
  const topN = 40;
  return scored.slice(0, topN).map((x) => x.id);
}

const DEFAULT_DURATION_MINUTES = 45;

export function generateWorkout(
  preferences: ManualPreferences,
  gymProfile?: GymProfile,
  seedExtra?: string | number,
  exercisesInput?: ExerciseDefinition[],
  preferredExerciseSlugs?: string[]
): GeneratedWorkout {
  const durationMinutes = preferences.durationMinutes ?? DEFAULT_DURATION_MINUTES;
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
    duration: durationMinutes,
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

  const counts = pickCountByDuration(durationMinutes);

  let exercises = exercisesInput ?? EXERCISES;
  exercises = exercises.filter((e) => !BLOCKED_EXERCISE_IDS.has(e.id));
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

  // #region agent log
  const hasUpper = bodyPartFocus.includes("Upper body");
  const eligibleIds = eligible.map((e) => e.id);
  const anyLegsInEligible = eligible.some((e) => e.muscles.includes("legs"));
  fetch('http://127.0.0.1:7432/ingest/35ca614a-496d-4b67-8b19-4e79a0489437',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'67622d'},body:JSON.stringify({sessionId:'67622d',location:'lib/generator.ts:generateWorkout',message:'body-part filter result',data:{bodyPartFocus,hasUpper,eligibleCount:eligible.length,anyLegsInEligible,sampleIds:eligibleIds.slice(0,12)},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
  // #endregion

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
  // Cooldown: mobility only, no dumbbells/kettlebells/barbells/cables/machines (stretching/mobility only)
  const cooldownPool = eligible.filter(
    (e) =>
      e.modalities.includes("mobility") && isCooldownEligibleEquipment(e.equipment ?? [])
  );

  // Build prefer set: optional caller-provided preferred slugs + slugs from goal sub-focus tag scoring
  const subFocusPreferSlugs = buildPreferredSlugsFromSubFocus(
    preferences.primaryFocus,
    preferences.subFocusByGoal,
    eligible
  );
  const preferSet = new Set<string>(preferredExerciseSlugs ?? []);
  for (const slug of subFocusPreferSlugs) preferSet.add(slug);
  const prefer = preferSet.size > 0 ? preferSet : null;
  const preferMatch = (e: ExerciseDefinition) =>
    prefer !== null && (prefer.has(e.id) || prefer.has(e.name));

  /** Avoid 3+ in a row from the same similar cluster (e.g. deadlift family). */
  const wouldBeThreeSameClusterInARow = (lastTwoExerciseIds: string[], candidateId: string): boolean => {
    if (lastTwoExerciseIds.length < 2) return false;
    const cluster = getSimilarExerciseClusterId({ id: candidateId });
    const last = getSimilarExerciseClusterId({ id: lastTwoExerciseIds[1] });
    const prev = getSimilarExerciseClusterId({ id: lastTwoExerciseIds[0] });
    return last === cluster && prev === cluster;
  };

  /** If flattened pairs have 3+ same-cluster in a row, swap order within a pair to break it when possible. */
  const reorderPairsToAvoidThreeInARow = (pairs: [WorkoutItem, WorkoutItem][]): [WorkoutItem, WorkoutItem][] => {
    const items = pairs.flat();
    for (let i = 2; i < items.length; i++) {
      const a = getSimilarExerciseClusterId({ id: items[i - 2].exercise_id });
      const b = getSimilarExerciseClusterId({ id: items[i - 1].exercise_id });
      const c = getSimilarExerciseClusterId({ id: items[i].exercise_id });
      if (a === b && b === c) {
        const pairIndex = Math.floor((i - 1) / 2);
        if (pairIndex < pairs.length) {
          const [first, second] = pairs[pairIndex];
          const midId = items[i - 1].exercise_id;
          const other = first.exercise_id === midId ? second : first;
          const otherCluster = getSimilarExerciseClusterId({ id: other.exercise_id });
          if (otherCluster !== a) {
            pairs[pairIndex] = [second, first];
            return reorderPairsToAvoidThreeInARow(pairs);
          }
        }
        const pairIndexFirst = Math.floor((i - 2) / 2);
        if (pairIndexFirst >= 0 && pairIndexFirst < pairs.length && pairIndexFirst !== pairIndex) {
          const [first, second] = pairs[pairIndexFirst];
          const midIdFirst = items[i - 2].exercise_id;
          const otherFirst = first.exercise_id === midIdFirst ? second : first;
          const otherClusterFirst = getSimilarExerciseClusterId({ id: otherFirst.exercise_id });
          if (otherClusterFirst !== a) {
            pairs[pairIndexFirst] = [second, first];
            return reorderPairsToAvoidThreeInARow(pairs);
          }
        }
      }
    }
    return pairs;
  };

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
      const lastTwoIds = items.length >= 2 ? [items[items.length - 2].exercise_id, items[items.length - 1].exercise_id] : [];
      const withoutThreeInARow = lastTwoIds.length === 2
        ? poolToPick.filter((e) => !wouldBeThreeSameClusterInARow(lastTwoIds, e.id))
        : poolToPick;
      const picked = pickRandom(withoutThreeInARow.length ? withoutThreeInARow : poolToPick, rng);
      if (!picked) break;
      used.add(picked.id);
      let p = prescriptionForExercise(picked, preferences.energyLevel, preferences.primaryFocus, durationMinutes);
      let item = toWorkoutItem(picked, p, picked.tags);
      if (blockType === "warmup" && item.time_seconds != null && item.time_seconds > WARMUP_ITEM_MAX_SECONDS) {
        item = { ...item, time_seconds: WARMUP_ITEM_MAX_SECONDS };
      }
      if (blockType !== "warmup" && item.time_seconds != null && item.time_seconds > MAX_NON_CARDIO_CUE_SECONDS && !isCardioMachineOrPureCardio(picked)) {
        item = { ...item, time_seconds: MAX_NON_CARDIO_CUE_SECONDS };
      }
      items.push(item);
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
    reasoning: string,
    rngForPairs: () => number
  ): WorkoutBlock => {
    const poolToUse = pool.length ? pool : eligible;
    const byId = new Map(poolToUse.map((e) => [e.id, e]));
    const asPairing = poolToUse.map(toPairingInput);
    const pairingResults = pickBestSupersetPairs(asPairing, pairCount, used, rngForPairs);
    const pairs: [WorkoutItem, WorkoutItem][] = [];

    for (const [pA, pB] of pairingResults) {
      const first = byId.get(pA.id);
      const second = byId.get(pB.id);
      if (!first || !second) continue;
      used.add(first.id);
      used.add(second.id);
      const pres1 = prescriptionForExercise(first, preferences.energyLevel, preferences.primaryFocus, durationMinutes);
      const pres2 = prescriptionForExercise(second, preferences.energyLevel, preferences.primaryFocus, durationMinutes);
      pairs.push([toWorkoutItem(first, pres1, first.tags), toWorkoutItem(second, pres2, second.tags)]);
    }

    const reordered = reorderPairsToAvoidThreeInARow(pairs);
    // #region agent log
    const out = { block_type: blockType, format: "superset" as const, title, reasoning, items: reordered.flat(), supersetPairs: reordered };
    fetch('',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3f6292'},body:JSON.stringify({sessionId:'3f6292',location:'lib/generator.ts:buildMainSupersetBlock',message:'generator returning superset block',data:{format:out.format,supersetPairsLen:out.supersetPairs.length,itemsLen:out.items.length},timestamp:Date.now(),hypothesisId:'H5'})}).catch(()=>{});
    return out;
    // #endregion
  };

  const usedExerciseIds = new Set<string>();
  const warmupBlock = buildBlock(
    "warmup",
    "circuit",
    "Warm-up",
    warmupPool,
    counts.warmup,
    usedExerciseIds,
    "5–10 min total. Prepares your joints and elevates heart rate before the main work."
  );
  const isRecoveryOnly = preferences.primaryFocus.some(
    (f) => f.toLowerCase().includes("recovery") || f.toLowerCase().includes("resilience")
  );
  const isHypertrophy = !isRecoveryOnly && preferences.primaryFocus.some(
    (f) => f.toLowerCase().includes("hypertrophy") || f.toLowerCase().includes("muscle") || f.toLowerCase().includes("recomposition")
  );
  const mainBlockType: BlockType = isHypertrophy ? "main_hypertrophy" : "main_strength";
  const recoveryCircuitCount = Math.min(6, Math.max(4, Math.floor(durationMinutes / 5)));
  const mainBlock = isRecoveryOnly
    ? buildBlock(
        "mobility",
        "circuit",
        "Stretch & mobility",
        mainPool,
        recoveryCircuitCount,
        usedExerciseIds,
        "Light movement, stretching and breathing to support recovery. No heavy loading."
      )
    : buildMainSupersetBlock(
        mainBlockType,
        "Main Sets",
        mainPool,
        counts.mainSupersetPairs,
        usedExerciseIds,
        "Compound and focus-aligned movements in supersets to maximize time under tension.",
        rng
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
  const wantsZone2Cardio =
    isBodyRecomp ||
    preferences.primaryFocus.some(
      (f) =>
        f.includes("Endurance") ||
        f.includes("Sport Conditioning") ||
        f.includes("Recomposition")
    );
  // When body recomp / endurance, allow cardio; use gym+injury+upcoming and optional Zone 2 preference
  let conditioningPool = isBodyRecomp
    ? filterByUpcoming(
        filterByInjuries(
          filterByGymProfile(exercises, gymProfile),
          injuryFilter
        ).filter((e) => e.modalities.includes("conditioning")),
        preferences.upcoming
      )
    : eligible.filter((e) => e.modalities.includes("conditioning"));
  if (wantsZone2Cardio && conditioningPool.length > 0) {
    conditioningPool = filterByPreferredZone2Cardio(
      conditioningPool,
      preferences.preferredZone2Cardio
    );
    // If preference filtered out everything (e.g. no rower in gym), fall back to full conditioning pool
    if (conditioningPool.length === 0 && preferences.preferredZone2Cardio?.length) {
      conditioningPool = isBodyRecomp
        ? filterByUpcoming(
            filterByInjuries(
              filterByGymProfile(exercises, gymProfile),
              injuryFilter
            ).filter((e) => e.modalities.includes("conditioning")),
            preferences.upcoming
          )
        : eligible.filter((e) => e.modalities.includes("conditioning"));
    }
  }
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

  const blocks: WorkoutBlock[] = isRecoveryOnly
    ? [warmupBlock, mainBlock, cooldownBlock]
    : cardioBlock
      ? [warmupBlock, mainBlock, accessoryBlock, cardioBlock, cooldownBlock]
      : [warmupBlock, mainBlock, accessoryBlock, cooldownBlock];

  return {
    id: `w_${Date.now()}`,
    focus: preferences.primaryFocus,
    durationMinutes,
    energyLevel: preferences.energyLevel,
    notes: notes.length ? notes.join(" • ") : undefined,
    blocks,
  };
}

/** Map UI body part focus to DB primary_muscles values (canonical slugs per EXERCISE_ONTOLOGY_DESIGN). */
function bodyPartFocusToMuscles(bodyPartFocus: string[]): string[] {
  const out: string[] = [];
  for (const opt of bodyPartFocus) {
    if (opt === "Upper body") {
      out.push("chest", "triceps", "shoulders", "lats", "biceps", "upper_back", "core");
    } else if (opt === "Lower body") {
      out.push("legs", "quads", "glutes", "hamstrings", "calves");
    } else if (opt === "Full body") {
      return []; // no filter
    } else if (opt === "Core") {
      out.push("core");
    } else if (opt === "Push") {
      out.push("chest", "triceps", "shoulders");
    } else if (opt === "Pull") {
      out.push("lats", "biceps", "upper_back");
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
