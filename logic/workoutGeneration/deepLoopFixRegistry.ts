/**
 * Fix registry: maps detected issue IDs to implementation guidance for the fix loop.
 * Used by deepUserFlowLoop.ts when --fix-top finds pending work.
 */

export type FixGuidance = {
  issueIdPattern: string | RegExp;
  category: "flow" | "output";
  title: string;
  likelyFiles: string[];
  implementationHint: string;
  verifyCommand: string;
  testPriority: "P0" | "P1";
};

export const DEEP_LOOP_FIX_REGISTRY: FixGuidance[] = [
  {
    issueIdPattern: "P01:zone2_on_power_day",
    category: "output",
    title: "Zone 2 conditioning on explosive vertical-jump day",
    likelyFiles: [
      "logic/workoutGeneration/dailyGenerator.ts",
      "data/sportSubFocus/subFocusIntentRegistry.ts",
    ],
    implementationHint:
      "Explosive sport sub-focus sessions should prefer sprint/RSA/plyo conditioning over steady-state Zone 2. Extend inputPrefersExplosiveConditioningOverSteadyState and conditioning block filters. Verified non-recurring on 32+ seeds (personaDeepLoopRepro) 2026-07-12.",
    verifyCommand: "npx vitest run logic/workoutGeneration/personaDeepLoopRepro.test.ts",
    testPriority: "P0",
  },
  {
    issueIdPattern: "P01:no_plyo_jump_pattern",
    category: "output",
    title: "Missing plyo/jump on vertical-jump day",
    likelyFiles: ["logic/workoutGeneration/dailyGenerator.ts", "logic/workoutGeneration/intentSlotAllocator.ts"],
    implementationHint: "Ensure vertical_jump sub-focus gates power block selection and intent slots include jump/plyo family exercises.",
    verifyCommand: "npx tsx scripts/deepUserFlowLoop.ts --scenario=deep_p01_maya_vertical_jump --verify",
    testPriority: "P0",
  },
  {
    issueIdPattern: "P02:single_sport_dominance",
    category: "output",
    title: "Multi-sport blend collapsed to one sport",
    likelyFiles: [
      "logic/workoutGeneration/dailyGenerator.ts",
      "logic/workoutIntelligence/scoring/exerciseScoring.ts",
    ],
    implementationHint: "Honor sport_focus_pct split in scoring and block assembly so secondary sport influences exercise selection.",
    verifyCommand: "npx tsx scripts/deepUserFlowLoop.ts --scenario=deep_p02_morgan_multi_sport --verify",
    testPriority: "P0",
  },
  {
    issueIdPattern: "P02:leg_press_in_athletic_block",
    category: "output",
    title: "Leg press in athletic power blocks",
    likelyFiles: [
      "logic/workoutIntelligence/validation/workoutValidator.ts",
      "logic/workoutGeneration/dailyGenerator.ts",
      "logic/workoutGeneration/sportProfileBanPredicates.ts",
    ],
    implementationHint:
      "Exclude leg-press family from power/main athletic blocks and repair swaps (main_strength + main_hypertrophy parallel to power). Verified non-recurring on 32+ seeds (personaDeepLoopRepro) 2026-07-12.",
    verifyCommand: "npx vitest run logic/workoutGeneration/personaDeepLoopRepro.test.ts",
    testPriority: "P0",
  },
  {
    issueIdPattern: /^flow:train_today/,
    category: "flow",
    title: "Train today blocks sport-only or mismatched intent",
    likelyFiles: ["app/(tabs)/index.tsx", "lib/trainToday.ts", "context/AppStateContext.tsx"],
    implementationHint:
      "canUseTrainToday must resolve a default goal/sport preset; runTrainToday must pass sportGoalContext for sport defaults.",
    verifyCommand: "npx tsx scripts/deepUserFlowLoop.ts --scenario=deep_p02_morgan_multi_sport --verify",
    testPriority: "P0",
  },
  {
    issueIdPattern: /^flow:intent_/,
    category: "flow",
    title: "UI flow loses user intent before generation",
    likelyFiles: [
      "logic/workoutGeneration/userFlowSimulator.ts",
      "app/(tabs)/sport-mode/index.tsx",
      "app/(tabs)/manual/preferences.tsx",
    ],
    implementationHint: "Ensure form state committed to session draft / sportGoalContext matches user chip selections at build time.",
    verifyCommand: "npx tsx scripts/deepUserFlowLoop.ts --verify",
    testPriority: "P0",
  },
  {
    issueIdPattern: "P07:hotel_equipment_violation",
    category: "output",
    title: "Hotel gym equipment violations",
    likelyFiles: ["lib/generator.ts", "logic/workoutIntelligence/constraints/resolveWorkoutConstraints.ts"],
    implementationHint: "Equipment filter must reject barbell/rack/cable exercises when hotel profile active; verify substitution path.",
    verifyCommand: "npx tsx scripts/deepUserFlowLoop.ts --scenario=deep_p07_alex_hotel_gym --verify",
    testPriority: "P0",
  },
  {
    issueIdPattern: "P10:",
    category: "output",
    title: "Injury persona safety or catalog issue",
    likelyFiles: [
      "logic/workoutIntelligence/constraints/resolveWorkoutConstraints.ts",
      "logic/workoutIntelligence/validation/workoutValidator.ts",
    ],
    implementationHint: "Injury slugs from sport form must flow to constraint resolution; no contraindicated exercises in output.",
    verifyCommand: "npx tsx scripts/deepUserFlowLoop.ts --scenario=deep_p10_drew_injury_sport --verify",
    testPriority: "P0",
  },
  {
    issueIdPattern: /^expect:/,
    category: "output",
    title: "Persona expectation contract failed",
    likelyFiles: ["logic/workoutGeneration/personaOutputAnalysis.ts", "logic/workoutGeneration/dailyGenerator.ts"],
    implementationHint: "Read expectation evidence in fix-queue; trace from personaExpectationContracts to generator scoring/filtering.",
    verifyCommand: "npx tsx scripts/deepUserFlowLoop.ts --verify",
    testPriority: "P0",
  },
];

export function fixGuidanceForIssue(issueId: string): FixGuidance | undefined {
  for (const entry of DEEP_LOOP_FIX_REGISTRY) {
    if (typeof entry.issueIdPattern === "string") {
      if (issueId === entry.issueIdPattern || issueId.startsWith(entry.issueIdPattern)) return entry;
    } else if (entry.issueIdPattern.test(issueId)) {
      return entry;
    }
  }
  return undefined;
}
