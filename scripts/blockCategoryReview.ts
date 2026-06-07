/**
 * Human-readable block category report for a generated workout.
 *
 * Usage:
 *   npx tsx scripts/blockCategoryReview.ts [seed] [scenario]
 *
 * Scenarios: volleyball, basketball, soccer, lacrosse, strength, hypertrophy,
 *   endurance, strength_cond, track, recovery
 *
 * Examples:
 *   npx tsx scripts/blockCategoryReview.ts 66440 volleyball
 *   npx tsx scripts/blockCategoryReview.ts 88042 basketball
 */

import { loadDotEnvFromRepoRoot } from "./dotenvLocal";
import { getDefaultEquipmentForTemplate } from "../data/gymProfiles";
import type { GymProfile } from "../data/gymProfiles";
import type { ManualPreferences } from "../lib/types";
import {
  generateWorkoutAsync,
  getExercisePoolForManualGeneration,
  injurySlugsFromManualPreferences,
} from "../lib/generator";
import {
  manualPreferencesToGenerateWorkoutInput,
  type SportGoalContext,
} from "../lib/dailyGeneratorAdapter";
import type { Exercise } from "../logic/workoutGeneration/types";
import {
  hasMetabolicConditioningSignal,
  isAccessoryEligible,
  isConditioningEligible,
  isRecoveryCooldownEligible,
  isSprintMechanicsDrill,
} from "../logic/workoutGeneration/blockSelectionEligibility";
import { resolveBlockStructureProfile } from "../data/sportSubFocus/subFocusIntentRegistry";

type ScenarioDef = {
  label: string;
  manualPreferences: ManualPreferences;
  sportGoalContext?: SportGoalContext;
};

const GYM: GymProfile = {
  id: "block_category_review",
  name: "Full gym (template)",
  equipment: getDefaultEquipmentForTemplate("your_gym"),
};

const SCENARIOS: Record<string, ScenarioDef> = {
  volleyball: {
    label: "Volleyball vertical jump, lower body, 45 min",
    manualPreferences: {
      primaryFocus: [],
      subFocusByGoal: {},
      targetBody: "Lower",
      targetModifier: [],
      durationMinutes: 45,
      energyLevel: "medium",
      injuries: ["No restrictions"],
      upcoming: [],
      workoutStyle: [],
      workoutTier: "intermediate",
    },
    sportGoalContext: {
      sport_slugs: ["volleyball"],
      sport_sub_focus: { volleyball: ["vertical_jump"] },
      sport_weight: 0.55,
    },
  },
  basketball: {
    label: "Basketball vertical jump, lower body, 45 min",
    manualPreferences: {
      primaryFocus: [],
      subFocusByGoal: {},
      targetBody: "Lower",
      targetModifier: [],
      durationMinutes: 45,
      energyLevel: "medium",
      injuries: ["No restrictions"],
      upcoming: [],
      workoutStyle: [],
      workoutTier: "intermediate",
    },
    sportGoalContext: {
      sport_slugs: ["basketball"],
      sport_sub_focus: { basketball: ["vertical_jump"] },
      sport_weight: 0.55,
    },
  },
  soccer: {
    label: "Soccer repeat sprint + deceleration, lower body, 45 min",
    manualPreferences: {
      primaryFocus: [],
      subFocusByGoal: {},
      targetBody: "Lower",
      targetModifier: [],
      durationMinutes: 45,
      energyLevel: "medium",
      injuries: ["No restrictions"],
      upcoming: [],
      workoutStyle: [],
      workoutTier: "intermediate",
    },
    sportGoalContext: {
      sport_slugs: ["soccer"],
      sport_sub_focus: { soccer: ["repeat_sprint", "deceleration"] },
      sport_weight: 0.55,
    },
  },
  strength: {
    label: "Pure strength lower body, 30 min, no sport",
    manualPreferences: {
      primaryFocus: ["Build Strength"],
      subFocusByGoal: {},
      targetBody: "Lower",
      targetModifier: [],
      durationMinutes: 30,
      energyLevel: "medium",
      injuries: ["No restrictions"],
      upcoming: [],
      workoutStyle: [],
      workoutTier: "intermediate",
    },
  },
  hypertrophy: {
    label: "Upper hypertrophy chest+arms, 45 min, no sport",
    manualPreferences: {
      primaryFocus: ["Build Muscle (Hypertrophy)"],
      subFocusByGoal: { "Build Muscle (Hypertrophy)": ["Chest", "Arms"] },
      targetBody: "Upper",
      targetModifier: ["Push"],
      durationMinutes: 45,
      energyLevel: "medium",
      injuries: ["No restrictions"],
      upcoming: [],
      workoutStyle: [],
      workoutTier: "intermediate",
    },
  },
  lacrosse: {
    label: "Lacrosse change of direction, full body, 45 min",
    manualPreferences: {
      primaryFocus: [],
      subFocusByGoal: {},
      targetBody: "Full",
      targetModifier: [],
      durationMinutes: 45,
      energyLevel: "medium",
      injuries: ["No restrictions"],
      upcoming: [],
      workoutStyle: [],
      workoutTier: "intermediate",
    },
    sportGoalContext: {
      sport_slugs: ["lacrosse"],
      sport_sub_focus: { lacrosse: ["change_of_direction"] },
      sport_weight: 0.55,
    },
  },
  endurance: {
    label: "Improve Endurance primary, 40 min, no sport",
    manualPreferences: {
      primaryFocus: ["Improve Endurance"],
      subFocusByGoal: {},
      targetBody: "Full",
      targetModifier: [],
      durationMinutes: 40,
      energyLevel: "medium",
      injuries: ["No restrictions"],
      upcoming: [],
      workoutStyle: [],
      workoutTier: "intermediate",
    },
  },
  strength_cond: {
    label: "Strength lower + Sport Conditioning secondary, 45 min",
    manualPreferences: {
      primaryFocus: ["Build Strength", "Sport Conditioning"],
      subFocusByGoal: {},
      targetBody: "Lower",
      targetModifier: [],
      durationMinutes: 45,
      energyLevel: "medium",
      injuries: ["No restrictions"],
      upcoming: [],
      workoutStyle: [],
      workoutTier: "intermediate",
    },
  },
  track: {
    label: "Track sprinting acceleration, lower body, 45 min",
    manualPreferences: {
      primaryFocus: [],
      subFocusByGoal: {},
      targetBody: "Lower",
      targetModifier: [],
      durationMinutes: 45,
      energyLevel: "medium",
      injuries: ["No restrictions"],
      upcoming: [],
      workoutStyle: [],
      workoutTier: "intermediate",
    },
    sportGoalContext: {
      sport_slugs: ["track_sprinting"],
      sport_sub_focus: { track_sprinting: ["acceleration_power"] },
      sport_weight: 0.55,
    },
  },
  recovery: {
    label: "Recovery / mobility-focused, 30 min, no sport",
    manualPreferences: {
      primaryFocus: ["Recovery"],
      subFocusByGoal: {},
      targetBody: null,
      targetModifier: [],
      durationMinutes: 30,
      energyLevel: "low",
      injuries: ["No restrictions"],
      upcoming: [],
      workoutStyle: [],
      workoutTier: "intermediate",
    },
  },
};

const DEFAULT_SEEDS: Record<string, number> = {
  volleyball: 66440,
  basketball: 88042,
  soccer: 99123,
  lacrosse: 77201,
  strength: 42001,
  hypertrophy: 55001,
  endurance: 66001,
  strength_cond: 77001,
  track: 88101,
  recovery: 11111,
};

function rejectReasonForConditioning(ex: Exercise, input?: ReturnType<typeof manualPreferencesToGenerateWorkoutInput>): string | null {
  if (isSprintMechanicsDrill(ex) && !hasMetabolicConditioningSignal(ex)) {
    if (input && resolveBlockStructureProfile(input).fieldDrillConditioningEligible) {
      return null;
    }
    return "COD/sprint mechanics drill";
  }
  if (!isConditioningEligible(ex, input ? { input } : undefined)) {
    if (/figure_8|figure8/i.test(ex.id)) return "COD mechanics drill";
    if (/tibialis|calf_raise/i.test(ex.id)) return "isolation/prehab";
    if (isRecoveryCooldownEligible(ex)) return "stretch/recovery (cooldown slot)";
    return "not metabolic conditioning";
  }
  return null;
}

function rejectReasonForCooldown(ex: Exercise): string | null {
  if (!isRecoveryCooldownEligible(ex)) {
    if (/tibialis/i.test(ex.id)) return "isolation/prehab";
    if (isConditioningEligible(ex)) return "metabolic conditioning";
    if (/figure_8/i.test(ex.id)) return "agility drill";
    return "not stretch/recovery";
  }
  return null;
}

function rejectReasonForAccessory(ex: Exercise): string | null {
  if (!isAccessoryEligible(ex)) {
    if (isRecoveryCooldownEligible(ex)) return "stretch/recovery";
    if (isConditioningEligible(ex)) return "conditioning finisher";
    return "not supplemental strength";
  }
  return null;
}

function sampleRejected(
  pool: Exercise[],
  rejectFn: (ex: Exercise) => string | null,
  limit = 5
): string[] {
  const out: string[] = [];
  for (const ex of pool) {
    const reason = rejectFn(ex);
    if (reason) {
      out.push(`${ex.name} (${reason})`);
      if (out.length >= limit) break;
    }
  }
  return out;
}

function categoryLabel(ex: Exercise | undefined, blockType: string): string {
  if (!ex) return "";
  if (blockType === "conditioning") {
    if (hasMetabolicConditioningSignal(ex)) return "metabolic";
    return ex.modality ?? "conditioning";
  }
  if (blockType === "accessory") return `${ex.modality ?? "strength"} accessory`;
  if (blockType === "cooldown") return ex.exercise_role === "stretch" ? "stretch" : "recovery";
  return ex.modality ?? "";
}

function conditioningReason(resolved: ReturnType<typeof manualPreferencesToGenerateWorkoutInput>): string {
  const blockStructure = resolveBlockStructureProfile(resolved);
  if (blockStructure.requiresConditioningBlock) {
    return "sub-focus archetype requires conditioning (RSA/COD/sprint/endurance)";
  }
  const secondary = resolved.secondary_goals ?? [];
  if (secondary.includes("conditioning") || secondary.includes("endurance")) {
    return "secondary goal cardio share";
  }
  if (resolved.primary_goal === "endurance" || resolved.primary_goal === "conditioning") {
    return "primary endurance/conditioning goal";
  }
  if ((resolved.sport_slugs?.length ?? 0) > 0) {
    return "sport prep session composition";
  }
  return "optional cardio finisher for primary goal";
}

async function main() {
  loadDotEnvFromRepoRoot();

  const seedArg = process.argv[2];
  const scenarioKey = (process.argv[3] ?? "volleyball").toLowerCase();
  const scenario = SCENARIOS[scenarioKey];
  if (!scenario) {
    console.error(`Unknown scenario "${scenarioKey}". Options: ${Object.keys(SCENARIOS).join(", ")}`);
    process.exit(1);
  }

  const seed =
    seedArg != null && seedArg !== "" ? Number(seedArg) : (DEFAULT_SEEDS[scenarioKey] ?? 66440);
  if (Number.isNaN(seed)) {
    console.error(
      `Usage: npx tsx scripts/blockCategoryReview.ts [seed] [${Object.keys(SCENARIOS).join("|")}]`
    );
    process.exit(1);
  }

  const { manualPreferences, sportGoalContext, label } = scenario;
  const injurySlugs = injurySlugsFromManualPreferences(manualPreferences);
  const pool = await getExercisePoolForManualGeneration(injurySlugs);
  const poolById = new Map(pool.map((e) => [e.id, e]));

  const workout = await generateWorkoutAsync(
    manualPreferences,
    GYM,
    seed,
    undefined,
    sportGoalContext,
    { exercisePool: pool }
  );

  const resolved = manualPreferencesToGenerateWorkoutInput(
    manualPreferences,
    GYM,
    seed,
    undefined,
    sportGoalContext
  );

  console.log("=== BLOCK CATEGORY REPORT ===");
  console.log(`Scenario: ${label}`);
  console.log(`Seed: ${seed}`);
  console.log(`Primary goal: ${resolved.primary_goal}`);
  console.log(`Secondary goals: ${(resolved.secondary_goals ?? []).join(", ") || "(none)"}`);
  console.log(`Sport: ${(resolved.sport_slugs ?? []).join(", ") || "(none)"}`);
  console.log("");

  const conditioningBlocks = workout.blocks.filter((b) => b.block_type === "conditioning");
  if (conditioningBlocks.length > 0) {
    console.log(`Conditioning block: YES | reason: ${conditioningReason(resolved)}`);
    for (const block of conditioningBlocks) {
      const selected = (block.items ?? [])
        .map((i) => {
          const ex = poolById.get(i.exercise_id);
          return `${i.exercise_name} (${categoryLabel(ex, "conditioning")})`;
        })
        .join(", ");
      console.log(`  Selected: ${selected || "(empty)"}`);
    }
    const rejected = sampleRejected(pool, (ex) => rejectReasonForConditioning(ex, resolved));
    if (rejected.length) {
      console.log(`  Rejected candidates (sample): ${rejected.join("; ")}`);
    }
  } else {
    console.log("Conditioning block: NO | reason: session policy or duration omitted optional cardio");
  }
  console.log("");

  const cooldownBlock = workout.blocks.find((b) => b.block_type === "cooldown");
  if (cooldownBlock) {
    const selected = (cooldownBlock.items ?? [])
      .map((i) => {
        const ex = poolById.get(i.exercise_id);
        return `${i.exercise_name} (${categoryLabel(ex, "cooldown")})`;
      })
      .join(", ");
    console.log("Cooldown block: YES");
    console.log(`  Selected: ${selected || "(empty)"}`);
    const rejected = sampleRejected(pool, rejectReasonForCooldown);
    if (rejected.length) {
      console.log(`  Rejected (sample): ${rejected.join("; ")}`);
    }
  } else {
    console.log("Cooldown block: NO");
  }
  console.log("");

  const accessoryBlocks = workout.blocks.filter((b) => b.block_type === "accessory");
  console.log(`Accessory blocks: ${accessoryBlocks.length}`);
  accessoryBlocks.forEach((block, idx) => {
    const selected = (block.items ?? [])
      .map((i) => {
        const ex = poolById.get(i.exercise_id);
        return `${i.exercise_name} (${categoryLabel(ex, "accessory")})`;
      })
      .join(", ");
    console.log(`  Block ${String.fromCharCode(65 + idx)}: ${selected || "(empty)"}`);
  });
  if (accessoryBlocks.length === 0) {
    if (resolveBlockStructureProfile(resolved).suppressAccessoryBlocks) {
      console.log("  (none — session archetype suppresses accessory blocks)");
    } else {
      console.log("  (none — short session or single-block template)");
    }
  } else {
    const rejected = sampleRejected(pool, rejectReasonForAccessory, 3);
    if (rejected.length) {
      console.log(`  Rejected from accessory pool (sample): ${rejected.join("; ")}`);
    }
  }
  console.log("");

  console.log("All block types:", workout.blocks.map((b) => b.block_type).join(" → "));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
