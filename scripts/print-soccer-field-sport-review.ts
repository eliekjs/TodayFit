/**
 * Soccer field-sport session review: mains, conditioning, gate/fallback, repair, coverage.
 *
 * Run: npx tsx scripts/print-soccer-field-sport-review.ts
 * Optional seeds: SOCCER_REVIEW_SEEDS=1,2,3 npx tsx scripts/print-soccer-field-sport-review.ts
 */

import { EXERCISES } from "../data/exercisesMerged";
import { exerciseDefinitionToGeneratorExercise } from "../lib/dailyGeneratorAdapter";
import { BLOCKED_EXERCISE_IDS } from "../lib/workoutRules";
import { generateWorkoutSession } from "../logic/workoutGeneration/dailyGenerator";
import type { Exercise, GenerateWorkoutInput, WorkoutSession } from "../logic/workoutGeneration/types";
import { sessionIntentContractForSportSlug } from "../logic/workoutGeneration/sessionIntentContract";
import type { UserLevel } from "../logic/workoutGeneration/types";

function exercisePool(): Exercise[] {
  return EXERCISES.filter((d) => !BLOCKED_EXERCISE_IDS.has(d.id)).map(exerciseDefinitionToGeneratorExercise);
}

function parseSeeds(): number[] {
  const raw = process.env.SOCCER_REVIEW_SEEDS?.trim();
  if (raw) {
    const parts = raw.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !Number.isNaN(n));
    if (parts.length) return parts;
  }
  return [201, 202, 203, 204, 205];
}

const baseEquipment: GenerateWorkoutInput["available_equipment"] = [
  "barbell",
  "dumbbells",
  "kettlebells",
  "bench",
  "squat_rack",
  "bodyweight",
  "treadmill",
  "stair_climber",
  "assault_bike",
  "rowing_machine",
  "cable_machine",
  "ski_erg",
];

type Scenario = {
  label: string;
  seed: number;
  duration_minutes: number;
  primary_goal: "strength" | "hypertrophy";
  focus_body_parts: string[];
  user_level: UserLevel;
};

function buildInput(sc: Scenario): GenerateWorkoutInput {
  const contract = sessionIntentContractForSportSlug("soccer");
  if (!contract) throw new Error("missing soccer session intent contract");
  return {
    duration_minutes: sc.duration_minutes,
    primary_goal: sc.primary_goal,
    focus_body_parts: sc.focus_body_parts,
    energy_level: "medium",
    available_equipment: baseEquipment,
    injuries_or_constraints: [],
    seed: sc.seed,
    sport_weight: 0.55,
    sport_slugs: ["soccer"],
    session_intent_contract: contract,
    style_prefs: { user_level: sc.user_level },
    include_intent_survival_report: true,
    use_reduced_surface_for_soccer_main_scoring: true,
  };
}

function blockSummaries(session: WorkoutSession, types: Set<string>): string {
  const parts: string[] = [];
  for (const b of session.blocks) {
    if (!types.has(b.block_type)) continue;
    const names = b.items.map((i) => i.exercise_name ?? i.exercise_id).join(" · ");
    parts.push(`${b.block_type}${b.title ? ` (${b.title})` : ""}: ${names}`);
  }
  return parts.join("\n    ");
}

function formatEnforcement(snap: Record<string, unknown> | undefined, key: string): string {
  const g = snap && typeof snap === "object" ? (snap as Record<string, { poolMode?: string; usedFullPoolFallback?: boolean }>)[key] : undefined;
  if (!g) return `${key}: —`;
  return `${key}: poolMode=${g.poolMode ?? "?"} fullPoolFb=${g.usedFullPoolFallback === true ? "yes" : "no"}`;
}

function printScenario(pool: Exercise[], sc: Scenario): void {
  const session = generateWorkoutSession(buildInput(sc), pool);
  const xfer = session.debug?.sport_pattern_transfer;
  const repairTitles = session.blocks
    .filter((b) => (b.title ?? "").toLowerCase().includes("soccer support"))
    .map((b) => b.title);

  console.log("\n" + "=".repeat(72));
  console.log(`Scenario: ${sc.label}`);
  console.log(`  seed=${sc.seed} duration=${sc.duration_minutes} goal=${sc.primary_goal} level=${sc.user_level}`);
  console.log(`  Title: ${session.title}`);
  console.log("  Main / hypertrophy:");
  console.log("    " + blockSummaries(session, new Set(["main_strength", "main_hypertrophy"])).replace(/\n/g, "\n    "));
  console.log("  Conditioning:");
  console.log("    " + blockSummaries(session, new Set(["conditioning"])).replace(/\n/g, "\n    "));
  console.log("  Sport pattern transfer:");
  if (xfer && xfer.sport_slug === "soccer") {
    console.log(`    coverage_ok=${xfer.coverage_ok}`);
    if (xfer.violations?.length) {
      console.log(`    violations: ${xfer.violations.map((v) => v.ruleId).join(", ")}`);
    }
    const snap = xfer.enforcement_snapshot as Record<string, unknown> | undefined;
    if (snap) {
      console.log(`    ${formatEnforcement(snap, "main_strength")}`);
      console.log(`    ${formatEnforcement(snap, "main_hypertrophy")}`);
      console.log(`    ${formatEnforcement(snap, "accessory")}`);
    }
    const mains = xfer.items?.filter((i) => i.block_type === "main_strength" || i.block_type === "main_hypertrophy") ?? [];
    if (mains.length) console.log(`    main tiers: ${mains.map((m) => m.tier).join(", ")}`);
    const sum = xfer.session_summary;
    if (sum && sum.sport_slug === "soccer") {
      const hits = { ...sum.main_category_hits, ...sum.accessory_category_hits };
      const top = Object.entries(hits)
        .filter(([, n]) => n > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([k, n]) => `${k}=${n}`)
        .join(", ");
      console.log(`    category hits: ${top || "(none)"}`);
      console.log(
        `    signatures: ${sum.signature_pattern_selections} sig / ${sum.non_signature_selections} other`
      );
    }
  } else {
    console.log("    (no soccer transfer debug — check sport slug / body focus)");
  }
  console.log(`  Repair block (soccer support): ${repairTitles.length ? repairTitles.join(", ") : "none"}`);
  const isr = session.debug?.intent_survival_report;
  if (isr?.repair_changes?.length) {
    console.log(`  Intent survival repairs: ${isr.repair_changes.length} change(s)`);
  }
}

function main(): void {
  const pool = exercisePool();
  const seeds = parseSeeds();
  const scenarios: Scenario[] = [
    { label: "Beginner · short strength · lower", seed: seeds[0] ?? 201, duration_minutes: 28, primary_goal: "strength", focus_body_parts: ["lower"], user_level: "beginner" },
    { label: "Beginner · medium strength · lower", seed: seeds[1] ?? 202, duration_minutes: 45, primary_goal: "strength", focus_body_parts: ["lower"], user_level: "beginner" },
    { label: "Intermediate · strength · posterior", seed: seeds[2] ?? 203, duration_minutes: 45, primary_goal: "strength", focus_body_parts: ["posterior"], user_level: "intermediate" },
    { label: "Intermediate · hypertrophy · lower", seed: seeds[3] ?? 204, duration_minutes: 50, primary_goal: "hypertrophy", focus_body_parts: ["lower"], user_level: "intermediate" },
    { label: "Advanced · strength · full body", seed: seeds[4] ?? 205, duration_minutes: 60, primary_goal: "strength", focus_body_parts: ["full_body"], user_level: "advanced" },
    { label: "Advanced · short · core", seed: (seeds[0] ?? 201) + 11, duration_minutes: 30, primary_goal: "strength", focus_body_parts: ["core"], user_level: "advanced" },
    { label: "Intermediate · long · lower", seed: (seeds[1] ?? 202) + 17, duration_minutes: 55, primary_goal: "strength", focus_body_parts: ["lower_body"], user_level: "intermediate" },
    { label: "Beginner · hypertrophy · quad", seed: (seeds[2] ?? 203) + 23, duration_minutes: 40, primary_goal: "hypertrophy", focus_body_parts: ["quad"], user_level: "beginner" },
  ];

  console.log("Soccer field-sport review — sample sessions (generator output)");
  for (const sc of scenarios) {
    printScenario(pool, sc);
  }
  console.log("\nDone.");
}

main();
