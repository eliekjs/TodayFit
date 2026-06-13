/**
 * Weekly goal-oriented manual mode simulation (app-parity with manual/week.tsx).
 *
 * Usage:
 *   npx tsx .cursor/skills/workout-user-simulation-agent/scripts/runWeeklyGoalSimulation.ts
 *   npx tsx .cursor/skills/workout-user-simulation-agent/scripts/runWeeklyGoalSimulation.ts A
 *   npx tsx .cursor/skills/workout-user-simulation-agent/scripts/runWeeklyGoalSimulation.ts all 88001
 *
 * Runs 3 diverse multi-goal weekly scenarios (no sport). Fixed week anchor + seeds for reproducibility.
 */

import { loadDotEnvFromRepoRoot } from "../../../../scripts/dotenvLocal";
import { getDefaultEquipmentForTemplate } from "../../../../data/gymProfiles";
import type { GymProfile } from "../../../../data/gymProfiles";
import type { GeneratedWorkout, ManualPreferences } from "../../../../lib/types";
import {
  generateWorkoutAsync,
  getExercisePoolForManualGeneration,
  injurySlugsFromManualPreferences,
} from "../../../../lib/generator";
import { preferredExerciseNamesForManualPreferences } from "../../../../lib/manualPreferredExerciseNames";
import { getBodyEmphasisDistribution } from "../../../../services/sportPrepPlanner/weeklyEmphasis";
import {
  buildDayFocusPresetsForDay,
  resolveDayFocusPreset,
  defaultPresetIdForWeekDay,
} from "../../../../lib/weekDaySessionFocus";
import {
  accumulateWeeklySubFocusCountsFromGeneratedWorkout,
  buildWeeklySubFocusKeysFromPreferences,
} from "../../../../logic/workoutGeneration/weeklySubFocusCoveragePlan";
import { collectWeekMainLiftExerciseIds } from "../../../../logic/workoutGeneration/collectWeekMainLiftExerciseIds";
import { formatDayTitle, isSpecificFocusRelevantForBody } from "../../../../lib/dayTitle";
import { getLocalDateString } from "../../../../lib/dateUtils";
import type { Exercise } from "../../../../logic/workoutGeneration/types";

/** Fixed Monday anchor so ISO dates are stable across runs (week of 2025-06-02). */
const WEEK_ANCHOR_MONDAY = new Date(2025, 5, 2);

/** Mon, Tue, Thu, Fri */
const TRAINING_DAYS = [0, 1, 3, 4];

const GYM: GymProfile = {
  id: "weekly_goal_sim",
  name: "Full gym (template)",
  equipment: getDefaultEquipmentForTemplate("your_gym"),
};

const BASE_MANUAL: Omit<ManualPreferences, "primaryFocus" | "subFocusByGoal"> = {
  targetBody: null,
  targetModifier: [],
  durationMinutes: 45,
  energyLevel: "medium",
  injuries: ["No restrictions"],
  upcoming: [],
  workoutStyle: [],
  workoutTier: "intermediate",
  goalMatchPrimaryPct: 50,
  goalMatchSecondaryPct: 30,
  goalMatchTertiaryPct: 20,
  goalDistributionStyle: "dedicate_days",
};

type WeeklyScenario = {
  id: string;
  label: string;
  seed: number;
  manualPreferences: ManualPreferences;
};

const SCENARIOS: WeeklyScenario[] = [
  {
    id: "A",
    label: "Hypertrophy + Athletic Performance + Power & Explosiveness",
    seed: 88001,
    manualPreferences: {
      ...BASE_MANUAL,
      primaryFocus: [
        "Build Muscle (Hypertrophy)",
        "Athletic Performance",
        "Power & Explosiveness",
      ],
      subFocusByGoal: {
        "Build Muscle (Hypertrophy)": ["Glutes"],
        "Athletic Performance": ["Speed / Sprint"],
        "Power & Explosiveness": ["Vertical jump"],
      },
    },
  },
  {
    id: "B",
    label: "Build Strength + Sport Conditioning + Mobility & Joint Health",
    seed: 88002,
    manualPreferences: {
      ...BASE_MANUAL,
      primaryFocus: [
        "Build Strength",
        "Sport Conditioning",
        "Mobility & Joint Health",
      ],
      subFocusByGoal: {
        "Build Strength": ["Squat"],
        "Sport Conditioning": ["Intervals / HIIT"],
        "Mobility & Joint Health": ["Hips"],
      },
    },
  },
  {
    id: "C",
    label: "Calisthenics + Hypertrophy + Athletic Performance",
    seed: 88003,
    manualPreferences: {
      ...BASE_MANUAL,
      primaryFocus: [
        "Calisthenics",
        "Build Muscle (Hypertrophy)",
        "Athletic Performance",
      ],
      subFocusByGoal: {
        Calisthenics: ["Handstand"],
        "Build Muscle (Hypertrophy)": ["Back"],
        "Athletic Performance": ["Agility / Change of direction"],
      },
    },
  },
  {
    id: "MAX",
    label: "Max UI: 3 goals + 3 sub-goals (1 per goal)",
    seed: 99001,
    manualPreferences: {
      ...BASE_MANUAL,
      primaryFocus: [
        "Build Muscle (Hypertrophy)",
        "Athletic Performance",
        "Power & Explosiveness",
      ],
      subFocusByGoal: {
        "Build Muscle (Hypertrophy)": ["Glutes"],
        "Athletic Performance": ["Speed / Sprint"],
        "Power & Explosiveness": ["Vertical jump"],
      },
    },
  },
];

function startOfWeekMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - diff);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function dateToISO(d: Date): string {
  return getLocalDateString(d);
}

function weekdayLabel(dow: number): string {
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][dow] ?? "?";
}

function formatPrescription(item: {
  sets?: number | null;
  reps?: number | string | null;
  time_seconds?: number | null;
  rest_seconds?: number | null;
}): string {
  const sets = item.sets ?? "?";
  if (item.time_seconds != null) {
    return `${sets}×${item.time_seconds}s rest ${item.rest_seconds ?? "?"}s`;
  }
  const reps = item.reps ?? "?";
  return `${sets}×${reps} rest ${item.rest_seconds ?? "?"}s`;
}

function formatWorkoutBlocks(workout: GeneratedWorkout): string {
  const lines: string[] = [];
  for (const b of workout.blocks) {
    lines.push(`  [${b.block_type}] ${b.title ?? ""} (${b.estimated_minutes ?? "?"} min)`);
    const pairs = b.supersetPairs;
    if (pairs?.length) {
      for (const pair of pairs) {
        for (const item of pair) {
          lines.push(
            `    - ${item.exercise_name} (${item.exercise_id}) ${formatPrescription(item)}`
          );
        }
      }
      continue;
    }
    for (const item of b.items ?? []) {
      lines.push(
        `    - ${item.exercise_name} (${item.exercise_id}) ${formatPrescription(item)}`
      );
    }
  }
  return lines.join("\n");
}

function collectExerciseIds(workout: GeneratedWorkout): string[] {
  const ids: string[] = [];
  for (const b of workout.blocks) {
    if (b.supersetPairs?.length) {
      for (const pair of b.supersetPairs) {
        for (const item of pair) ids.push(item.exercise_id);
      }
    } else {
      for (const item of b.items ?? []) ids.push(item.exercise_id);
    }
  }
  return ids;
}

const INTENT_LABEL_PATTERNS =
  /\b(strength|power|unilateral|bilateral|posterior|anterior|plyometric|mobility|stability|conditioning|endurance|hypertrophy)\b/i;

function looksLikeIntentLabel(name: string): boolean {
  if (/^(chin-?up|push-?up|burpee|step-?up|pull-?up|dip)$/i.test(name.trim())) {
    return false;
  }
  return (
    /^(unilateral strength|bilateral|posterior chain|core stability)$/i.test(name.trim()) ||
    (name.split(" ").length <= 2 &&
      INTENT_LABEL_PATTERNS.test(name) &&
      !/\d/.test(name) &&
      !/[()]/.test(name))
  );
}

function evaluateScenario(
  scenario: WeeklyScenario,
  days: Array<{
    date: string;
    dow: number;
    bodyEmphasis: string;
    effectivePrimary: string[];
    displayTitle: string;
    presetId: string;
    workout: GeneratedWorkout;
  }>,
  poolById: Map<string, Exercise>
): { overall: "Good" | "Mixed" | "Bad"; notes: string[] } {
  const notes: string[] = [];
  let bad = 0;
  let mixed = 0;

  for (const day of days) {
    for (const id of collectExerciseIds(day.workout)) {
      if (!poolById.has(id)) {
        bad++;
        notes.push(`Day ${day.date}: exercise id "${id}" not in catalog`);
      }
    }
    for (const b of day.workout.blocks) {
      const items = b.supersetPairs?.flat() ?? b.items ?? [];
      for (const item of items) {
        if (looksLikeIntentLabel(item.exercise_name)) {
          bad++;
          notes.push(`Day ${day.date}: intent-like name "${item.exercise_name}"`);
        }
      }
    }
  }

  const subKeys = buildWeeklySubFocusKeysFromPreferences(scenario.manualPreferences);
  if (subKeys.length > 0) {
    notes.push(
      `Weekly sub-focus keys tracked: ${subKeys.map((k) => (typeof k === "string" ? k : `${k.goalSlug}:${k.subSlug}`)).join(", ")}`
    );
  }

  const goalLabels = scenario.manualPreferences.primaryFocus;
  const dedicatedOk = days.some((d) =>
    goalLabels.some((g, i) => d.effectivePrimary[0] === goalLabels[i])
  );
  if (!dedicatedOk && scenario.manualPreferences.goalDistributionStyle === "dedicate_days") {
    mixed++;
    notes.push("Dedicated-days mode: not all ranked goals appeared as day-1 primary focus");
  }

  const bodySplit = days.map((d) => d.bodyEmphasis).join(", ");
  if (!bodySplit.includes("Upper") || !bodySplit.includes("Lower")) {
    mixed++;
    notes.push(`4-day split may lack expected U/L mix: ${bodySplit}`);
  }

  if (bad >= 2) return { overall: "Bad", notes };
  if (bad >= 1 || mixed >= 2) return { overall: "Mixed", notes };
  if (mixed >= 1) return { overall: "Mixed", notes };
  notes.push("Exercises catalog-valid; body split and multi-goal dedication look reasonable");
  return { overall: "Good", notes };
}

async function runScenario(
  scenario: WeeklyScenario,
  exercisePool: Exercise[],
  preferredNames: string[] | undefined
): Promise<void> {
  const manualPreferences = scenario.manualPreferences;
  const weekStart = startOfWeekMonday(WEEK_ANCHOR_MONDAY);
  const n = TRAINING_DAYS.length;
  const bodyDistribution = getBodyEmphasisDistribution(n);

  const p1 = manualPreferences.goalMatchPrimaryPct ?? 50;
  const p2 = manualPreferences.goalMatchSecondaryPct ?? 30;
  const p3 = manualPreferences.goalMatchTertiaryPct ?? 20;
  const total = p1 + p2 + p3;
  const n1 = total > 0 ? Math.round(n * (p1 / total)) : n;
  const n2 = total > 0 ? Math.min(n - n1, Math.round(n * (p2 / total))) : 0;
  const goalIndices: number[] = [];
  for (let i = 0; i < n1; i++) goalIndices.push(0);
  for (let i = 0; i < n2; i++) goalIndices.push(1);
  for (let i = n1 + n2; i < n; i++) goalIndices.push(2);

  const dedicateDays =
    manualPreferences.goalDistributionStyle === "dedicate_days" &&
    manualPreferences.primaryFocus.length > 0;

  const focusIds = TRAINING_DAYS.map((_, i) => {
    const presets = buildDayFocusPresetsForDay({
      manualPreferences,
      adaptiveSetup: null,
      targetBody: bodyDistribution[i]!.targetBody,
      targetModifier: bodyDistribution[i]!.targetModifier,
    });
    return defaultPresetIdForWeekDay(presets, {
      dedicateDays,
      weekGoalSlotIndex: goalIndices[i] ?? 0,
    });
  });

  const modifierToSpecific: Record<string, string> = {
    Push: "push",
    Pull: "pull",
    Quad: "quad",
    Posterior: "posterior",
  };
  const specificEmphasis =
    (manualPreferences.targetModifier?.length ?? 0) > 0
      ? (manualPreferences.targetModifier ?? [])
          .map((m) => modifierToSpecific[m] ?? m.toLowerCase())
          .filter(Boolean)
      : [];

  const days: Array<{
    date: string;
    dow: number;
    bodyEmphasis: string;
    effectivePrimary: string[];
    displayTitle: string;
    presetId: string;
    workout: GeneratedWorkout;
  }> = [];

  const weekMainStrengthLiftIds: string[] = [];
  const weeklySubFocusKeys = buildWeeklySubFocusKeysFromPreferences(manualPreferences);
  const weeklySubFocusCounts: Record<string, number> = {};
  const exerciseByIdForWeekly = new Map<string, Exercise>(
    exercisePool.map((e) => [e.id, e])
  );

  for (let i = 0; i < TRAINING_DAYS.length; i++) {
    const dow = TRAINING_DAYS[i]!;
    const date = addDays(weekStart, dow);
    const isoDate = dateToISO(date);
    const bodyBias = bodyDistribution[i]!;
    const bodyKey = bodyBias.targetBody.toLowerCase() as "upper" | "lower" | "full";

    const presetsForDay = buildDayFocusPresetsForDay({
      manualPreferences,
      adaptiveSetup: null,
      targetBody: bodyBias.targetBody,
      targetModifier: bodyBias.targetModifier,
    });
    const presetId =
      focusIds[i] ??
      defaultPresetIdForWeekDay(presetsForDay, {
        dedicateDays,
        weekGoalSlotIndex: goalIndices[i] ?? 0,
      });
    const resolved = resolveDayFocusPreset(presetId, manualPreferences, null);
    const effectivePrimary =
      resolved.primaryFocus.length > 0 ? resolved.primaryFocus : manualPreferences.primaryFocus;

    const dayPrefs: ManualPreferences = {
      ...manualPreferences,
      primaryFocus: effectivePrimary,
      weekSubFocusPrimaryLabels:
        manualPreferences.primaryFocus.length > 0
          ? [...manualPreferences.primaryFocus]
          : undefined,
      targetBody: bodyBias.targetBody,
      targetModifier: bodyBias.targetModifier,
      weekMainStrengthLiftIdsUsed:
        weekMainStrengthLiftIds.length > 0 ? [...weekMainStrengthLiftIds] : undefined,
      weeklySubFocusCoverage:
        weeklySubFocusKeys.length > 0 && TRAINING_DAYS.length > 0
          ? {
              matchCountsSoFar: { ...weeklySubFocusCounts },
              trainingDayIndex: i,
              trainingDaysTotal: TRAINING_DAYS.length,
              targetPerSubFocus: 3,
            }
          : undefined,
    };

    const priorBatchSessions = days.map((d) => d.workout);
    const sessionSeed = `${scenario.seed}-${isoDate}`;

    const workout = await generateWorkoutAsync(
      dayPrefs,
      GYM,
      sessionSeed,
      preferredNames,
      resolved.sportGoalContext,
      {
        exercisePool,
        historySources: {
          workoutHistory: [],
          savedWorkouts: [],
          inProgressProgress: null,
          priorBatchSessions,
        },
      }
    );

    accumulateWeeklySubFocusCountsFromGeneratedWorkout(
      weeklySubFocusCounts,
      workout,
      exerciseByIdForWeekly,
      weeklySubFocusKeys
    );
    weekMainStrengthLiftIds.push(...collectWeekMainLiftExerciseIds(workout));

    const specificForDay = specificEmphasis.filter((k) =>
      isSpecificFocusRelevantForBody(k, bodyKey)
    );
    const displayTitle = formatDayTitle(
      effectivePrimary.length ? effectivePrimary : ["Workout"],
      bodyKey,
      specificForDay.length ? specificForDay : undefined
    );

    const mod =
      bodyBias.targetModifier.length > 0
        ? ` (${bodyBias.targetModifier.join(" · ")})`
        : "";

    days.push({
      date: isoDate,
      dow,
      bodyEmphasis: `${bodyBias.targetBody}${mod}`,
      effectivePrimary,
      displayTitle,
      presetId,
      workout,
    });
  }

  const poolById = new Map(exercisePool.map((e) => [e.id, e]));
  const evaluation = evaluateScenario(scenario, days, poolById);

  console.log("\n" + "=".repeat(72));
  console.log(`SCENARIO ${scenario.id}: ${scenario.label}`);
  console.log("=".repeat(72));

  console.log("\n### Inputs");
  console.log(`Seed (base): ${scenario.seed} — per-day: \`${scenario.seed}-<ISO date>\``);
  console.log(`Week anchor Monday: ${dateToISO(weekStart)}`);
  console.log(`Training days: ${TRAINING_DAYS.map((d) => weekdayLabel(d)).join(", ")}`);
  console.log(`Gym: ${GYM.name} (${GYM.equipment.length} equipment items)`);
  console.log(
    `Goal match %: ${manualPreferences.goalMatchPrimaryPct}/${manualPreferences.goalMatchSecondaryPct}/${manualPreferences.goalMatchTertiaryPct}`
  );
  console.log(`Goal distribution: ${manualPreferences.goalDistributionStyle}`);
  console.log("ManualPreferences:");
  console.log(JSON.stringify(manualPreferences, null, 2));
  console.log(`SportGoalContext: none (goal-oriented manual week)`);
  console.log(`Day focus preset ids: ${focusIds.join(", ")}`);
  console.log(`Goal slot indices (dedicate days): ${goalIndices.join(", ")}`);

  console.log("\n### Generated week");
  for (const day of days) {
    console.log(`\n--- ${weekdayLabel(day.dow)} ${day.date} ---`);
    console.log(`Body emphasis: ${day.bodyEmphasis}`);
    console.log(`Day focus preset: ${day.presetId}`);
    console.log(`Effective primary focus: ${day.effectivePrimary.join(" → ")}`);
    console.log(`Display title: ${day.displayTitle}`);
    console.log(`Workout focus: ${day.workout.focus}`);
    console.log(`Duration: ${day.workout.durationMinutes} min`);
    console.log("Blocks:");
    console.log(formatWorkoutBlocks(day.workout));
  }

  console.log("\n### Weekly sub-focus coverage counts");
  console.log(JSON.stringify(weeklySubFocusCounts, null, 2));

  console.log("\n### User-perspective note");
  console.log(`Overall: ${evaluation.overall}`);
  for (const note of evaluation.notes) {
    console.log(`- ${note}`);
  }
}

async function main() {
  loadDotEnvFromRepoRoot();

  const filterArg = (process.argv[2] ?? "all").toUpperCase();
  const seedOverride = process.argv[3];

  let scenarios = SCENARIOS;
  if (filterArg !== "ALL") {
    const one = SCENARIOS.find((s) => s.id === filterArg);
    if (!one) {
      console.error(
        `Unknown scenario "${filterArg}". Use A, B, C, MAX, or all.\n` +
          "Usage: npx tsx .cursor/skills/workout-user-simulation-agent/scripts/runWeeklyGoalSimulation.ts [A|B|C|MAX|all] [seedOverride]"
      );
      process.exit(1);
    }
    scenarios = [one];
  }

  if (seedOverride != null && seedOverride !== "") {
    const n = Number(seedOverride);
    if (!Number.isNaN(n)) {
      scenarios = scenarios.map((s) => ({ ...s, seed: n }));
    }
  }

  const injurySlugs = injurySlugsFromManualPreferences(scenarios[0]!.manualPreferences);
  const exercisePool = await getExercisePoolForManualGeneration(injurySlugs);
  if (exercisePool.length === 0) {
    console.error("No exercises in pool — check Supabase / static catalog.");
    process.exit(1);
  }

  console.log(`Exercise pool: ${exercisePool.length} exercises`);
  console.log(`Running ${scenarios.length} weekly goal scenario(s)...`);

  for (const scenario of scenarios) {
    const preferredNames = await preferredExerciseNamesForManualPreferences(
      scenario.manualPreferences
    );
    await runScenario(scenario, exercisePool as Exercise[], preferredNames);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
