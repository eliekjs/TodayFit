/**
 * Rock climbing: intent survival, gating tiers, main/accessory coverage.
 * Run: npx tsx logic/workoutGeneration/rockClimbingIntentSurvival.test.ts
 */

import assert from "assert";
import { EXERCISES } from "../../data/exercisesMerged";
import { exerciseDefinitionToGeneratorExercise } from "../../lib/dailyGeneratorAdapter";
import { BLOCKED_EXERCISE_IDS } from "../../lib/workoutRules";
import { generateWorkoutSession } from "./dailyGenerator";
import type { Exercise, GenerateWorkoutInput } from "./types";
import { sessionIntentContractForSportSlug } from "./sessionIntentContract";
import {
  exerciseMatchesAnyRockClimbingCategory,
  getRockClimbingPatternCategoriesForExercise,
} from "./sportPatternTransfer/rockClimbingExerciseCategories";
import { ROCK_COVERAGE_PULL_FAMILY } from "./sportPatternTransfer/rockClimbingRules";

function pool(): Exercise[] {
  return EXERCISES.filter((d) => !BLOCKED_EXERCISE_IDS.has(d.id)).map(exerciseDefinitionToGeneratorExercise);
}

function summarizeForStdout(session: ReturnType<typeof generateWorkoutSession>, label: string) {
  const summary = session.debug?.intent_survival_report?.session_intent_summary as
    | { session_intent_contract?: { sportSlug?: string; sessionType?: string } }
    | undefined;
  const contract = summary?.session_intent_contract;
  const ms = session.blocks.filter((b) => b.block_type === "main_strength" || b.block_type === "main_hypertrophy");
  const acc = session.blocks.filter((b) => b.block_type === "accessory");
  const mainNames = ms.flatMap((b) => b.items.map((i) => i.exercise_name));
  const accNames = acc.flatMap((b) => b.items.map((i) => i.exercise_name));
  const gate = session.debug?.sport_pattern_transfer?.enforcement_snapshot?.main_strength;
  const sel = session.debug?.main_selector?.entries ?? [];
  const intentRep = session.debug?.intent_survival_report;
  console.log("\n---", label, "---");
  console.log("title:", session.title);
  console.log("main:", mainNames.join(" | "));
  console.log("accessory highlights:", accNames.slice(0, 6).join(" | ") || "(none)");
  console.log(
    "fallback tier (main_strength):",
    gate?.selectionTier ?? gate?.poolMode ?? "n/a",
    "fullPoolFallback:",
    gate?.usedFullPoolFallback ?? false
  );
  console.log(
    "main selector:",
    sel.map((e) => `${e.phase}:${e.selector}${e.sport_slug ? `(${e.sport_slug})` : ""}`).join("; ")
  );
  console.log(
    "repair (snow/alpine block in report):",
    intentRep?.alpine?.repair_ran != null ? String(intentRep.alpine.repair_ran) : "n/a"
  );
  const byId = new Map(pool().map((e) => [e.id, e]));
  const pullHits = session.blocks.flatMap((b) =>
    b.items.filter((it) => {
      const ex = byId.get(it.exercise_id);
      return ex && exerciseMatchesAnyRockClimbingCategory(ex, [...ROCK_COVERAGE_PULL_FAMILY]);
    })
  ).length;
  const trunkHits = session.blocks.flatMap((b) =>
    b.items.filter((it) => {
      const ex = byId.get(it.exercise_id);
      return ex && exerciseMatchesAnyRockClimbingCategory(ex, ["trunk_bracing_climbing"]);
    })
  ).length;
  const scapHits = session.blocks.flatMap((b) =>
    b.items.filter((it) => {
      const ex = byId.get(it.exercise_id);
      return ex && exerciseMatchesAnyRockClimbingCategory(ex, ["scapular_stability_pull"]);
    })
  ).length;
  console.log("coverage hits — pull family:", pullHits, "trunk:", trunkHits, "scap:", scapHits);
  if (contract) console.log("contract slug:", contract.sportSlug, contract.sessionType);
}

const scenarios: Array<{ name: string; input: GenerateWorkoutInput }> = [
  {
    name: "beginner_strength_30m_minimal_equipment",
    input: {
      duration_minutes: 30,
      primary_goal: "strength",
      focus_body_parts: [],
      energy_level: "medium",
      available_equipment: ["bodyweight", "pull_up_bar", "resistance_bands"],
      injuries_or_constraints: [],
      seed: 101,
      sport_weight: 0.65,
      sport_slugs: ["rock_climbing"],
      style_prefs: { user_level: "beginner", wants_supersets: false },
      session_intent_contract: sessionIntentContractForSportSlug("rock_climbing"),
      include_intent_survival_report: true,
    },
  },
  {
    name: "intermediate_strength_45_full_gym",
    input: {
      duration_minutes: 45,
      primary_goal: "strength",
      focus_body_parts: ["upper_pull"],
      energy_level: "medium",
      available_equipment: [
        "barbell",
        "dumbbells",
        "kettlebells",
        "bench",
        "squat_rack",
        "cable_machine",
        "pull_up_bar",
        "bodyweight",
      ],
      injuries_or_constraints: [],
      seed: 202,
      sport_weight: 0.6,
      sport_slugs: ["rock_climbing"],
      style_prefs: { user_level: "intermediate", wants_supersets: true },
      session_intent_contract: sessionIntentContractForSportSlug("rock_climbing"),
      include_intent_survival_report: true,
    },
  },
  {
    name: "advanced_strength_60",
    input: {
      duration_minutes: 60,
      primary_goal: "strength",
      focus_body_parts: ["full_body"],
      energy_level: "high",
      available_equipment: [
        "barbell",
        "dumbbells",
        "kettlebells",
        "bench",
        "squat_rack",
        "cable_machine",
        "pull_up_bar",
        "bodyweight",
      ],
      injuries_or_constraints: [],
      seed: 303,
      sport_weight: 0.7,
      sport_slugs: ["rock_climbing"],
      style_prefs: { user_level: "advanced", wants_supersets: true },
      session_intent_contract: sessionIntentContractForSportSlug("rock_climbing"),
      include_intent_survival_report: true,
    },
  },
  {
    name: "hypertrophy_intermediate_45",
    input: {
      duration_minutes: 45,
      primary_goal: "hypertrophy",
      focus_body_parts: [],
      energy_level: "medium",
      available_equipment: [
        "dumbbells",
        "cable_machine",
        "pull_up_bar",
        "bench",
        "bodyweight",
      ],
      injuries_or_constraints: [],
      seed: 404,
      sport_weight: 0.55,
      sport_slugs: ["rock_climbing"],
      goal_sub_focus: { muscle: ["back", "balanced"] },
      style_prefs: { user_level: "intermediate", wants_supersets: true },
      session_intent_contract: sessionIntentContractForSportSlug("rock_climbing"),
      include_intent_survival_report: true,
    },
  },
  {
    name: "hypertrophy_core_emphasis_subfocus",
    input: {
      duration_minutes: 60,
      primary_goal: "hypertrophy",
      focus_body_parts: ["upper_pull"],
      energy_level: "medium",
      available_equipment: ["dumbbells", "cable_machine", "pull_up_bar", "bodyweight", "bench"],
      injuries_or_constraints: [],
      seed: 505,
      sport_weight: 0.58,
      sport_slugs: ["rock_climbing"],
      sport_sub_focus: { rock_climbing: ["core_tension", "pull_strength"] },
      style_prefs: { user_level: "advanced", wants_supersets: true },
      session_intent_contract: sessionIntentContractForSportSlug("rock_climbing"),
      include_intent_survival_report: true,
    },
  },
  {
    name: "legacy_slug_rock_bouldering",
    input: {
      duration_minutes: 45,
      primary_goal: "strength",
      focus_body_parts: ["upper_pull"],
      energy_level: "medium",
      available_equipment: ["dumbbells", "pull_up_bar", "cable_machine", "bodyweight"],
      injuries_or_constraints: [],
      seed: 606,
      sport_weight: 0.6,
      sport_slugs: ["rock_bouldering"],
      session_intent_contract: sessionIntentContractForSportSlug("rock_bouldering"),
      include_intent_survival_report: true,
    },
  },
  {
    name: "short_duration_20",
    input: {
      duration_minutes: 20,
      primary_goal: "strength",
      focus_body_parts: [],
      energy_level: "low",
      available_equipment: ["dumbbells", "bodyweight", "pull_up_bar"],
      injuries_or_constraints: [],
      seed: 707,
      sport_weight: 0.5,
      sport_slugs: ["rock_climbing"],
      style_prefs: { user_level: "intermediate", wants_supersets: false },
      session_intent_contract: sessionIntentContractForSportSlug("rock_climbing"),
      include_intent_survival_report: true,
    },
  },
  {
    name: "posterior_chain_emphasis_no_narrow_body_filter",
    input: {
      duration_minutes: 45,
      primary_goal: "strength",
      focus_body_parts: [],
      goal_sub_focus: { strength: ["deadlift_hinge", "pull"] },
      energy_level: "medium",
      available_equipment: ["barbell", "dumbbells", "kettlebells", "pull_up_bar", "bodyweight"],
      injuries_or_constraints: [],
      seed: 808,
      sport_weight: 0.55,
      sport_slugs: ["rock_climbing"],
      session_intent_contract: sessionIntentContractForSportSlug("rock_climbing"),
      include_intent_survival_report: true,
    },
  },
];

function main() {
  const exercisePool = pool();
  assert(exercisePool.length > 500, "expect merged catalog");

  for (const sc of scenarios) {
    const session = generateWorkoutSession(sc.input, exercisePool);
    assert(session.blocks.length >= 2, sc.name);
    const mains = session.blocks.filter((b) => b.block_type === "main_strength" || b.block_type === "main_hypertrophy");
    assert(mains.length >= 1, `${sc.name}: expected main block`);
    summarizeForStdout(session, sc.name);

    const byId = new Map(exercisePool.map((e) => [e.id, e]));
    const mainItems = mains.flatMap((b) => b.items);
    let anyPullTransfer = false;
    for (const it of mainItems) {
      const ex = byId.get(it.exercise_id);
      if (ex && exerciseMatchesAnyRockClimbingCategory(ex, [...ROCK_COVERAGE_PULL_FAMILY])) {
        anyPullTransfer = true;
        break;
      }
    }
    assert(anyPullTransfer, `${sc.name}: main work should include climbing pull transfer category`);
  }

  const dbg = generateWorkoutSession(scenarios[1]!.input, exercisePool).debug?.sport_pattern_transfer;
  assert(dbg?.sport_slug === "rock_climbing");
  assert(dbg?.session_summary?.sport_slug === "rock_climbing");

  const ex = exercisePool.find((e) => e.id === "pullup" || e.name.toLowerCase().includes("pull-up"));
  if (ex) {
    const cats = getRockClimbingPatternCategoriesForExercise(ex);
    assert(cats.has("vertical_pull_transfer"), "pull-up maps to vertical pull transfer");
  }

  console.log("\nrockClimbingIntentSurvival: ok");
}

main();
