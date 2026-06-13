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
  athletic_sprint: {
    label: "Athletic Performance + Speed/Sprint, lower body, 45 min, no sport",
    manualPreferences: {
      primaryFocus: ["Athletic Performance"],
      subFocusByGoal: { "Athletic Performance": ["Speed / Sprint"] },
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
  rugby_cod: {
    label: "Rugby change of direction + speed/power, full body, 45 min",
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
      sport_slugs: ["rugby"],
      sport_sub_focus: { rugby: ["change_of_direction", "speed_power"] },
      sport_weight: 0.55,
    },
  },
  hypertrophy_lower: {
    label: "Lower hypertrophy glutes+legs, 45 min, no sport",
    manualPreferences: {
      primaryFocus: ["Build Muscle (Hypertrophy)"],
      subFocusByGoal: { "Build Muscle (Hypertrophy)": ["Glutes", "Legs"] },
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
  football_blend: {
    label: "Football sport + Build Strength squat/hinge blend, 45 min",
    manualPreferences: {
      primaryFocus: ["Build Strength"],
      subFocusByGoal: { "Build Strength": ["Squat", "Hinge"] },
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
      sport_slugs: ["american_football"],
      sport_sub_focus: { american_football: ["change_of_direction", "speed_power"] },
      sport_weight: 0.55,
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
  athletic_sprint: 92006,
  rugby_cod: 92007,
  hypertrophy_lower: 92008,
  football_blend: 88150,
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

const SCENARIO_SIM_NAMES: Record<string, string> = {
  hypertrophy: "Sim G — Upper hypertrophy chest+arms",
  lacrosse: "Sim I — Lacrosse COD full body",
  rugby_cod: "Control — Rugby COD+speed (no accessory)",
  hypertrophy_lower: "Control — Hypertrophy lower glutes+legs",
  athletic_sprint: "Control — Manual athletic sprint",
};

function formatPrescription(item: { sets?: number; reps?: number | string; time_seconds?: number; rest_seconds?: number }): string {
  const parts: string[] = [];
  if (item.sets != null) parts.push(`${item.sets}×`);
  if (item.reps != null) parts.push(String(item.reps));
  else if (item.time_seconds != null) parts.push(`${item.time_seconds}s`);
  if (item.rest_seconds != null) parts.push(`rest ${item.rest_seconds}s`);
  return parts.join(" ") || "—";
}

function printRootCauseNotes(
  scenarioKey: string,
  resolved: ReturnType<typeof manualPreferencesToGenerateWorkoutInput>,
  workout: Awaited<ReturnType<typeof generateWorkoutAsync>>,
  poolById: Map<string, Exercise>
): void {
  if (scenarioKey !== "hypertrophy" && scenarioKey !== "lacrosse") return;

  console.log("ROOT CAUSE NOTES:");
  const blockStructure = resolveBlockStructureProfile(resolved);

  if (scenarioKey === "hypertrophy") {
    const accessoryIds = workout.blocks
      .filter((b) => b.block_type === "accessory")
      .flatMap((b) => (b.items ?? []).map((i) => i.exercise_id));
    for (const id of accessoryIds) {
      const ex = poolById.get(id);
      if (!ex) {
        console.log(`  ${id}: not in pool`);
        continue;
      }
      const sprintDrill = isSprintMechanicsDrill(ex);
      const condEligible = isConditioningEligible(ex, { input: resolved });
      const accEligible = isAccessoryEligible(ex);
      console.log(
        `  ${ex.name} (${id}): modality=${ex.modality ?? "?"} role=${ex.exercise_role ?? "(none)"} ` +
          `isSprintMechanicsDrill=${sprintDrill} isConditioningEligible=${condEligible} isAccessoryEligible=${accEligible}`
      );
      if (sprintDrill && accEligible) {
        console.log(
          "    → Gap: sprint/COD drill passes isAccessoryEligible because isConditioningEligible=false " +
            "(no fieldDrillConditioningEligible on hypertrophy) and modality/role fall through to accessory."
        );
      }
    }
    console.log(
      `  requiresAccessoryBlocks=${blockStructure.requiresAccessoryBlocks} suppressAccessoryBlocks=${blockStructure.suppressAccessoryBlocks}`
    );
    console.log(
      "  Injection site: dailyGenerator.ts post-assembly requiresAccessoryBlocks guard (~L11350) picks from isAccessoryEligible pool."
    );
    console.log(
      "  Likely swap: workoutValidator.ts step 7 superset_pairing repair replaces incompatible accessory partner " +
        "without isAccessoryEligible / isSprintMechanicsDrill gates (chest_press_machine → wall_drill on this seed)."
    );
  }

  if (scenarioKey === "lacrosse") {
    console.log(
      `  suppressAccessoryBlocks=${blockStructure.suppressAccessoryBlocks} (change_of_direction alone does NOT set suppress; rugby adds speed_power which does)`
    );
    console.log(
      "  Policy: subFocusIntentRegistry.ts SUB_FOCUS_BLOCK_STRUCTURE.change_of_direction lacks suppressAccessoryBlocks; " +
        "speed_power/reactive_speed/speed set suppressAccessoryBlocks:true."
    );
    const accessoryIds = workout.blocks
      .filter((b) => b.block_type === "accessory")
      .flatMap((b) => (b.items ?? []).map((i) => i.exercise_id));
    for (const id of accessoryIds) {
      const ex = poolById.get(id);
      if (!ex) continue;
      const role = ex.exercise_role ?? "(none)";
      const pat = ex.movement_pattern ?? ex.primary_movement_family ?? "?";
      console.log(`  Accessory pick: ${ex.name} — modality=${ex.modality} role=${role} pattern=${pat}`);
    }
    console.log(
      "  Assembly: buildMainStrength() accessory pool (~L4207/L4752) uses isAccessoryEligible without COD isolation gate; " +
        "subFocusExerciseSelectionScore penalizes isolation (-8) but does not block."
    );
  }
  console.log("");
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

  const resolved = manualPreferencesToGenerateWorkoutInput(
    manualPreferences,
    GYM,
    seed,
    undefined,
    sportGoalContext
  );

  const workout = await generateWorkoutAsync(
    manualPreferences,
    GYM,
    seed,
    undefined,
    sportGoalContext,
    { exercisePool: pool }
  );

  const simName = SCENARIO_SIM_NAMES[scenarioKey] ?? label;
  const blockStructure = resolveBlockStructureProfile(resolved);

  console.log(`========== SIM: ${simName} ==========`);
  console.log("INPUTS:");
  console.log(`  seed: ${seed}`);
  console.log(`  gym: ${GYM.name} (${GYM.equipment.length} equipment items)`);
  console.log(`  ManualPreferences: ${JSON.stringify(manualPreferences, null, 2).split("\n").join("\n  ")}`);
  if (sportGoalContext) {
    console.log(`  SportGoalContext: ${JSON.stringify(sportGoalContext, null, 2).split("\n").join("\n  ")}`);
  } else {
    console.log("  SportGoalContext: (none)");
  }
  console.log("");
  console.log("RESOLVED GENERATOR INPUT:");
  console.log(`  primary_goal: ${resolved.primary_goal}`);
  console.log(`  secondary_goals: ${(resolved.secondary_goals ?? []).join(", ") || "(none)"}`);
  console.log(`  focus_body_parts: ${(resolved.focus_body_parts ?? []).join(", ")}`);
  console.log(`  sport_slugs: ${(resolved.sport_slugs ?? []).join(", ") || "(none)"}`);
  console.log(`  sport_sub_focus: ${JSON.stringify(resolved.sport_sub_focus ?? {})}`);
  console.log(`  goal_sub_focus: ${JSON.stringify(resolved.goal_sub_focus ?? {})}`);
  console.log(`  sport_weight: ${resolved.sport_weight ?? "(default)"}`);
  console.log(`  duration_minutes: ${resolved.duration_minutes}`);
  console.log(`  energy_level: ${resolved.energy_level}`);
  console.log(
    `  blockStructure: requiresAccessory=${blockStructure.requiresAccessoryBlocks} ` +
      `suppressAccessory=${blockStructure.suppressAccessoryBlocks} ` +
      `requiresConditioning=${blockStructure.requiresConditioningBlock} ` +
      `fieldDrillConditioningEligible=${blockStructure.fieldDrillConditioningEligible}`
  );
  console.log(`  exercise_pool_size: ${pool.length}`);
  console.log(`  generation_path: generateWorkoutAsync → manualPreferencesToGenerateWorkoutInput → generateWorkoutSession`);
  console.log("");
  console.log("GENERATED WORKOUT:");
  for (const block of workout.blocks) {
    console.log(`  [${block.block_type}] ${block.title ?? block.block_type} (${block.format ?? "—"})`);
    for (const item of block.items ?? []) {
      const ex = poolById.get(item.exercise_id);
      const mod = ex?.modality ?? "?";
      console.log(`    - ${item.exercise_name} | ${formatPrescription(item)} | modality=${mod}`);
    }
  }
  console.log("");
  console.log("BLOCK CATEGORIES:");

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
  console.log("");
  printRootCauseNotes(scenarioKey, resolved, workout, poolById);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
